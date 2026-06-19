import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Sign in — KAPE Admin" }] }),
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [err, setErr] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setErr("");
		setBusy(true);
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password }),
		});
		setBusy(false);
		if (res.ok) {
			const { user } = (await res.json()) as { user: { role: string } };
			navigate({ to: user.role === "admin" ? "/admin" : "/internalsources" });
		} else {
			setErr("Invalid email or password.");
		}
	}

	const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 transition";
	const label = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

	return (
		<main className="min-h-screen grid place-items-center p-6">
			<div className="w-full max-w-sm">
				<div className="flex flex-col items-center text-center mb-6">
					<span className="h-12 w-12 rounded-2xl bg-[var(--gold)] text-primary grid place-items-center font-display font-bold text-2xl shadow-[var(--shadow-soft)]">K</span>
					<div className="mt-3 font-display font-semibold text-xl text-primary">KAPE Admin</div>
					<p className="text-sm text-muted-foreground mt-0.5">Sign in to manage the website.</p>
				</div>
				<form onSubmit={submit} className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
					{err && <div className="mb-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
					<div className="space-y-4">
						<div>
							<label htmlFor="email" className={label}>Email</label>
							<input id="email" className={input} type="email" autoComplete="username" placeholder="you@kapekh.org" value={email} onChange={(e) => setEmail(e.target.value)} required />
						</div>
						<div>
							<label htmlFor="password" className={label}>Password</label>
							<input id="password" className={input} type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
						</div>
					</div>
					<button type="submit" disabled={busy} className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
						{busy ? "Signing in…" : "Sign in"}
					</button>
				</form>
				<p className="mt-5 text-center text-xs text-muted-foreground">
					<a href="/" className="hover:text-foreground transition">← Back to kapekh.org</a>
				</p>
			</div>
		</main>
	);
}
