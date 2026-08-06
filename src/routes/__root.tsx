import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { TRPCRouter } from "#/integrations/trpc/router";
import { DialogHost } from "../components/Dialogs";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { LanguageProvider } from "../lib/i18n";
import { detectLang } from "../lib/i18n-config";
import {
	metaDescription,
	siteLogo,
	siteTitle,
	socialImage,
	socialSiteName,
} from "../lib/site-identity";
import { themeColor, themeCss, themeFontUrl } from "../lib/site-theme";
import { organizationLd } from "../lib/structured-data";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;

	trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	// Fetch i18n bootstrap (active language, language list, UI strings) and the
	// navigation tree once, server-side during SSR, so the first byte is correct.
	// Language is path-based (/en/…, /km/…) — derived from the URL, not a param.
	loader: async ({ context, location }) => {
		const boot = await context.queryClient.ensureQueryData(
			context.trpc.i18n.bootstrap.queryOptions({
				lang: detectLang(location.pathname),
			}),
		);
		const nav = await context.queryClient.ensureQueryData(
			context.trpc.nav.tree.queryOptions({ lang: boot.lang }),
		);
		const settings = await context.queryClient.ensureQueryData(
			context.trpc.site.settings.queryOptions(),
		);
		return { ...boot, nav, settings };
	},
	head: ({ loaderData }) => {
		const settings = loaderData?.settings ?? {};
		const title = siteTitle(settings);
		const description = metaDescription(settings);
		const brand = themeCss(settings);
		return {
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ title },
				{ name: "description", content: description },
				{ name: "theme-color", content: themeColor(settings) },
				// Social sharing defaults (per-route head() can override title/description/image).
				{ property: "og:type", content: "website" },
				{ property: "og:site_name", content: socialSiteName(settings) },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:image", content: socialImage(settings) },
				{ name: "twitter:card", content: "summary" },
			],
			links: [
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossOrigin: "",
				},
				{ rel: "stylesheet", href: themeFontUrl(settings) },
				{ rel: "stylesheet", href: appCss },
				{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
				{ rel: "apple-touch-icon", href: siteLogo(settings) },
				{ rel: "manifest", href: "/manifest.json" },
			],
			// Server-rendered so the configured palette is in the first painted
			// frame. Applied by a script after hydration it would flash the default
			// brand on every hard load.
			styles: brand ? [{ children: brand }] : [],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(organizationLd(settings)).replace(
						/</g,
						"\\u003c",
					),
				},
			],
		};
	},
	errorComponent: RootError,
	notFoundComponent: RootNotFound,
	shellComponent: RootDocument,
	component: RootComponent,
});

/** Minimal, dependency-free fallbacks so an error or bad URL never white-screens. */
function RootError({ error }: { error: Error }) {
	return (
		<main className="min-h-screen grid place-items-center bg-background p-6 text-center">
			<div className="max-w-md">
				<h1 className="font-display text-2xl font-semibold text-primary">
					Something went wrong
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					An unexpected error occurred. Please refresh the page, or head back
					home.
				</p>
				{import.meta.env.DEV && (
					<pre className="mt-4 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-destructive">
						{error.message}
					</pre>
				)}
				<a
					href="/"
					className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
				>
					Go home
				</a>
			</div>
		</main>
	);
}

function RootNotFound() {
	return (
		<main className="min-h-screen grid place-items-center bg-background p-6 text-center">
			<div className="max-w-md">
				<p className="font-display text-5xl font-bold text-primary">404</p>
				<h1 className="mt-2 font-display text-xl font-semibold text-foreground">
					Page not found
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					This page doesn't exist or may have moved.
				</p>
				<a
					href="/"
					className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
				>
					Go home
				</a>
			</div>
		</main>
	);
}

function RootComponent() {
	const { lang, languages, strings, nav, settings } = Route.useLoaderData();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	// Admin + login have their own chrome — hide the public header/footer there.
	const chromeless =
		pathname.startsWith("/admin") ||
		pathname.startsWith("/internalsources") ||
		pathname === "/login";
	return (
		<LanguageProvider lang={lang} languages={languages} strings={strings}>
			{!chromeless && <Header nav={nav} settings={settings} />}
			{/* Child routes render here. */}
			<Outlet />
			{!chromeless && <Footer settings={settings} />}
		</LanguageProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	// suppressHydrationWarning: the inline theme script adds class="dark" before
	// hydration; the server can't know the user's theme, so the mismatch is expected.
	return (
		<html lang={detectLang(pathname)} suppressHydrationWarning>
			<head>
				{/* Set theme before paint to avoid a flash of the wrong mode. Only a
				    stored choice is written; with none, styles.css follows the
				    operating system, which is also what happens with no JavaScript. */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted inline bootstrap
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.classList.add(t);}}catch(e){}})();`,
					}}
				/>
				<HeadContent />
			</head>
			<body>
				{children}
				<DialogHost />
				{/* The @tanstack/devtools-vite plugin strips this block from production builds. */}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
