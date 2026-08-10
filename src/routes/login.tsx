import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
	// The dictionary is loaded here as well as in the root because `head` runs
	// outside React and cannot reach the provider. Same query key as the root's,
	// so it is a cache hit rather than a second round trip.
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
				const { user } = (await res.json()) as { user: { role: string } };
				const home = user.role === "admin" ? "/admin" : "/internalsources";
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

	const input =
		"w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 transition";
	const label =
		"block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

	return (
		<main className="min-h-screen grid place-items-center p-6">
			<div className="w-full max-w-sm">
				<div className="flex flex-col items-center text-center mb-6">
					<span className="h-12 w-12 rounded-2xl bg-[var(--gold)] text-primary grid place-items-center font-display font-bold text-2xl shadow-[var(--shadow-soft)]">
						{siteInitial(settings)}
					</span>
					<div className="mt-3 font-display font-semibold text-xl text-primary">
						{adminTitle(settings)}
					</div>
					<p className="text-sm text-muted-foreground mt-0.5">
						{t("login.subtitle", "Sign in to manage the website.")}
					</p>
				</div>
				<form
					onSubmit={submit}
					className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]"
				>
					{err && (
						<div
							id="login-error"
							role="alert"
							className="mb-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2"
						>
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
						className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
					>
						{busy
							? t("login.busy", "Signing in…")
							: t("login.submit", "Sign in")}
					</button>
				</form>
				<p className="mt-5 text-center text-xs text-muted-foreground">
					<a href="/" className="hover:text-foreground transition">
						← {t("nav.backSite", "Back to the site")}
					</a>
				</p>
			</div>
		</main>
	);
}
