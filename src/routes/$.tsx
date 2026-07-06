import { createFileRoute, redirect } from "@tanstack/react-router";

import students from "@/assets/students.jpg.asset.json";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { ProjectView } from "@/components/ProjectView";
import { RichBody } from "@/components/RichBody";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { JsonLd } from "@/components/JsonLd";
import { SubPage } from "@/components/SubPage";
import { NavLink } from "@/components/NavLink";
import { useLang } from "@/lib/i18n";
import { DEFAULT_LANG, LANGS, isFunctional, localizedHref, stripLang } from "@/lib/i18n-config";
import { articleLd } from "@/lib/structured-data";

/**
 * The public catch-all + i18n router. Every content URL is language-prefixed
 * (/en/…, /km/…); an unprefixed path 301s to the default-language prefix. The
 * remaining path is resolved by `routes.resolve` into a page, a collection record,
 * a redirect, or not-found. Adding a page or record needs no new route file.
 */
export const Route = createFileRoute("/$")({
	loader: async ({ context, params }) => {
		const raw = params._splat ?? "";
		const { lang, path, prefixed } = stripLang(`/${raw}`);
		if (!prefixed) {
			// No language prefix → canonical default-language URL.
			throw redirect({ to: "/$", params: { _splat: path === "/" ? DEFAULT_LANG : `${DEFAULT_LANG}${path}` }, statusCode: 301 });
		}
		// Functional routes (contact, donate, …) are never language-prefixed — they
		// live at fixed paths. A localized URL like /en/contact would otherwise fall
		// through to content resolution and 404, so redirect it to the canonical path.
		if (isFunctional(path)) {
			throw redirect({ href: path, statusCode: 301 });
		}
		const slug = path === "/" ? "home" : path.replace(/^\//, "");
		const resolved = await context.queryClient.ensureQueryData(
			context.trpc.routes.resolve.queryOptions({ path: slug, lang }),
		);
		if (resolved.kind === "redirect") {
			throw redirect({ to: "/$", params: { _splat: `${lang}/${resolved.to}` }, statusCode: 301 });
		}
		return resolved;
	},
	head: ({ loaderData, params }) => {
		const r = loaderData;
		let title = "KAPE";
		let description = "KAPE — access, quality and equity in education across Cambodia.";
		let image: string | null = null;
		if (r?.kind === "page" && r.page.slug === "home") {
			title = "KAPE — Kampuchea Action to Promote Education";
			description = "For more than three decades, KAPE has championed equitable, transformative education for Cambodian children — across 385+ schools, 15 provinces, and over 160,000 lives.";
			image = students.url;
		} else if (r?.kind === "page") {
			title = `${r.page.title} — KAPE`;
			description = r.page.excerpt || description;
			image = r.page.coverUrl;
		} else if (r?.kind === "article") {
			title = `${r.post.title} — KAPE`;
			description = r.post.excerpt || description;
		} else if (r?.kind === "album") {
			title = `${r.album.title} — KAPE`;
		} else if (r?.kind === "project") {
			title = `${r.project.name} — KAPE`;
		} else if (r?.kind === "person") {
			title = `${r.person.name} — KAPE`;
			description = r.person.position || description;
			image = r.person.photoUrl;
		}
		const meta: Array<Record<string, string>> = [
			{ title },
			{ name: "description", content: description },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
		];

		// Canonical + hreflang alternates (only when a site URL is configured —
		// these need an absolute origin, so we don't guess the domain).
		const links: Array<Record<string, string>> = [];
		const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");
		if (siteUrl) {
			const { path } = stripLang(`/${params._splat ?? ""}`);
			const tail = path === "/" ? "" : path;
			const canonical = `${siteUrl}/${stripLang(`/${params._splat ?? ""}`).lang}${tail}`;
			meta.push({ property: "og:url", content: canonical });
			if (image) meta.push({ property: "og:image", content: image.startsWith("http") ? image : `${siteUrl}${image}` });
			links.push({ rel: "canonical", href: canonical });
			for (const l of LANGS) links.push({ rel: "alternate", hrefLang: l, href: `${siteUrl}/${l}${tail}` });
			links.push({ rel: "alternate", hrefLang: "x-default", href: `${siteUrl}/${DEFAULT_LANG}${tail}` });
		} else if (image) {
			meta.push({ property: "og:image", content: image });
		}
		return { meta, links };
	},
	component: ResolvedRoute,
});

function ResolvedRoute() {
	const r = Route.useLoaderData();
	const { lang } = useLang();

	if (r.kind === "page") {
		const page = r.page;
		if (page.sections && page.sections.length > 0) {
			return (
				<main className="min-h-screen overflow-x-hidden text-foreground">
					{page.slug === "home" && <AnnouncementPopup />}
					<SectionRenderer sections={page.sections} />
				</main>
			);
		}
		// A parent/hub page with no content of its own renders its children as an
		// index instead of a blank card (e.g. "Who We Are" → its sub-pages).
		const hasBody = page.bodyHtml.replace(/<[^>]*>/g, "").trim().length > 0;
		if (!hasBody && page.children && page.children.length > 0) {
			return (
				<SubPage wide section="KAPE" title={page.title} lead={page.excerpt || undefined} heroImage={page.coverUrl || undefined}>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{page.children.map((c) => (
							<NavLink
								key={c.slug}
								href={localizedHref(`/${c.slug}`, lang)}
								className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
							>
								{c.coverUrl && (
									<div className="aspect-[16/10] overflow-hidden">
										<img src={c.coverUrl} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
									</div>
								)}
								<div className="flex flex-1 flex-col p-6">
									<h3 className="t-card-title text-primary group-hover:text-[var(--accent)] transition">{c.title}</h3>
									{c.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{c.excerpt}</p>}
									<span className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">Explore →</span>
								</div>
							</NavLink>
						))}
					</div>
				</SubPage>
			);
		}
		return (
			<SubPage section="KAPE" title={page.title} lead={page.excerpt || undefined} heroImage={page.coverUrl || undefined}>
				{hasBody ? (
					<div
						className="prose-kape"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-rendered
						dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
					/>
				) : (
					<div className="text-center py-6">
						<p className="text-muted-foreground">This section is being updated. Please check back soon.</p>
						<NavLink
							href={localizedHref("/", lang)}
							className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
						>
							← Back to home
						</NavLink>
					</div>
				)}
			</SubPage>
		);
	}

	if (r.kind === "article") {
		const post = r.post;
		return (
			<SubPage section={r.label} title={post.title} lead={post.excerpt || undefined} heroImage={post.coverUrl || undefined}>
				<JsonLd data={articleLd({ title: post.title, description: post.excerpt, image: post.coverUrl, datePublished: post.publishedAt, author: post.author })} />
				{post.publishedAt && (
					<div className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider mb-6">
						{post.publishedAt} · {post.author ?? "KAPE Cambodia"}
					</div>
				)}
				<RichBody className="prose-kape" html={post.bodyHtml} />
				{post.gallery.length > 0 && (
					<div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3">
						{post.gallery.map((p) => (
							<figure key={p.url} className="group relative overflow-hidden rounded-2xl border border-border">
								<img src={p.url} alt={p.caption} className="aspect-square w-full object-cover group-hover:scale-105 transition duration-700" />
								{p.caption && (
									<figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition">
										{p.caption}
									</figcaption>
								)}
							</figure>
						))}
					</div>
				)}
			</SubPage>
		);
	}

	if (r.kind === "album") {
		const album = r.album;
		// Cap columns to the photo count so a 1–2 photo album doesn't strand empty
		// grid cells (a fixed 3-col grid left a conspicuous blank column).
		const albumCols =
			album.photos.length <= 1
				? "grid-cols-1 max-w-md mx-auto"
				: album.photos.length === 2
					? "grid-cols-2 max-w-2xl mx-auto"
					: "grid-cols-2 md:grid-cols-3";
		return (
			<SubPage section={r.label} title={album.title} lead="Click any photo to view it larger.">
				<div className={`grid ${albumCols} gap-3`}>
					{album.photos.map((p) => (
						<figure key={p.url} className="group relative overflow-hidden rounded-2xl border border-border">
							<img src={p.url} alt={p.caption} className="aspect-square w-full object-cover group-hover:scale-105 transition duration-700" />
							{p.caption && (
								<figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition">
									{p.caption}
								</figcaption>
							)}
						</figure>
					))}
				</div>
			</SubPage>
		);
	}

	if (r.kind === "person") {
		const p = r.person;
		return (
			<SubPage section={r.label} title={p.name} lead={p.position || undefined} heroImage={p.photoUrl || undefined}>
				{p.photoUrl && (
					<img src={p.photoUrl} alt={p.name} className="mb-8 h-40 w-40 rounded-full object-cover shadow-[var(--shadow-soft)] ring-4 ring-card" />
				)}
				{p.bodyHtml ? (
					<RichBody className="prose-kape" html={p.bodyHtml} />
				) : (
					<p className="text-muted-foreground">{p.position}</p>
				)}
			</SubPage>
		);
	}

	if (r.kind === "project") {
		return <ProjectView project={r.project} section={r.label} />;
	}

	return (
		<SubPage section="Not found" title="Page not found">
			<p className="text-muted-foreground">This page doesn't exist or was moved.</p>
			<NavLink
				href={localizedHref("/", lang)}
				className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
			>
				← Back to home
			</NavLink>
		</SubPage>
	);
}
