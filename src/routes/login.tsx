import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useState } from "react";

import { useT } from "#/lib/i18n";
import { detectLang } from "#/lib/i18n-config";
import { safeRedirect } from "#/lib/safe-redirect";
import { adminTitle, siteInitial } from "#/lib/site-identity";

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
		const redirect = safeRedirect(search.redirect);
		return redirect ? { redirect } : {};
	},
	// head runs outside React and cannot reach the provider; same query key, so a cache hit
	loader: async ({ context, location }) => {
		const [settings, boot] = await Promise.all([
			context.queryClient.ensureQueryData(
				context.trpc.site.settings.queryOptions(),
			),
			context.queryClient.ensureQueryData(
				context.trpc.i18n.bootstrap.queryOptions({
					lang: detectLang(location.pathname),
				}),
			),
		]);
		return { settings, strings: boot.strings };
	},
	head: ({ loaderData }) => {
		const site = adminTitle(loaderData?.settings ?? {});
		// one slot, not a concatenation: Khmer puts the site name elsewhere
		const title = (
			loaderData?.strings?.["login.metaTitle"] ?? "Sign in — {site}"
		).replace("{site}", site);
		return { meta: [{ title }] };
	},
	component: LoginPage,
});

function LoginPage() {
	const { settings } = Route.useLoaderData();
	const { redirect } = Route.useSearch();
	const t = useT();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [err, setErr] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setErr("");
		setBusy(true);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			if (res.ok) {
				// the server picks the landing screen from the areas this account holds
				const { home } = (await res.json()) as { home: string };
				navigate({ to: redirect ?? home });
			} else if (res.status === 401) {
				setErr(t("login.invalid", "Invalid email or password."));
			} else {
				const body = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				setErr(
					body?.error || t("login.failed", "Sign-in failed. Please try again."),
				);
			}
		} catch {
			setErr(t("error.network", "Network error. Please try again."));
		} finally {
			setBusy(false);
		}
	}

	// outside .admin, so it paints with the public tokens, the rule Dialogs.tsx follows
	const input =
		"h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors duration-150 ease-out placeholder:text-muted-foreground focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40";
	const label = "mb-2 block text-[13px] font-medium text-foreground";

	return (
		<main className="grid min-h-screen place-items-center p-6">
			<div className="w-full max-w-sm">
				<div className="mb-6 flex flex-col items-center text-center">
					<span className="grid size-12 place-items-center rounded-xl bg-[var(--gold)] text-2xl font-bold text-primary shadow-[var(--shadow-soft)]">
						{siteInitial(settings)}
					</span>
					<h1 className="mt-4 text-xl font-semibold text-foreground">
						{adminTitle(settings)}
					</h1>
					<p className="mt-1 text-[13px] text-muted-foreground">
						{t("login.subtitle", "Sign in to manage the website.")}
					</p>
				</div>
				<form
					onSubmit={submit}
					className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
				>
					{err && (
						<div
							id="login-error"
							role="alert"
							className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
						>
							<AlertCircle aria-hidden="true" className="size-4 shrink-0" />
							{err}
						</div>
					)}
					<div className="space-y-4">
						<div>
							<label htmlFor="email" className={label}>
								{t("forms.email", "Email")}
							</label>
							<input
								id="email"
								className={input}
								type="email"
								autoComplete="username"
								placeholder={t("forms.emailPlaceholder", "you@email.org")}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								aria-invalid={err ? true : undefined}
								aria-describedby={err ? "login-error" : undefined}
								required
							/>
						</div>
						<div>
							<label htmlFor="password" className={label}>
								{t("forms.password", "Password")}
							</label>
							<input
								id="password"
								className={input}
								type="password"
								autoComplete="current-password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								aria-invalid={err ? true : undefined}
								aria-describedby={err ? "login-error" : undefined}
								required
							/>
						</div>
					</div>
					<button
						type="submit"
						disabled={busy}
						className="mt-6 grid h-10 w-full place-items-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors duration-150 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:saturate-50"
					>
						{busy
							? t("login.busy", "Signing in…")
							: t("login.submit", "Sign in")}
					</button>
				</form>
				<p className="mt-6 text-center text-[13px] text-muted-foreground">
					<a
						href="/"
						className="inline-flex items-center gap-2 rounded-lg transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
					>
						<ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
						{t("nav.backSite", "Back to the site")}
					</a>
				</p>
			</div>
		</main>
	);
}
