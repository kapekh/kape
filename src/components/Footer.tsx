import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

/** Global site footer — contact/socials/copyright come from `site_settings`.
 * Visit counts are fetched client-side (not SSR'd) so prerendered HTML never
 * freezes a stale count. */
export function Footer({ settings }: { settings: Record<string, string> }) {
	const [email, setEmail] = useState("");
	const [subscribed, setSubscribed] = useState(false);
	const [visits, setVisits] = useState<{ today: number; total: number } | null>(null);
	useEffect(() => {
		trpcClient.site.visits.query().then(setVisits).catch(() => {});
	}, []);
	const socials: [string, string][] = [
		["f", settings.social_facebook],
		["yt", settings.youtube_url],
		["t", settings.telegram ? `https://${settings.telegram}` : ""],
	].filter(([, url]) => Boolean(url)) as [string, string][];

	async function subscribe(e: React.FormEvent) {
		e.preventDefault();
		const res = await fetch("/api/forms/subscribe", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email }),
		});
		if (res.ok) {
			setSubscribed(true);
			setEmail("");
		}
	}

	return (
		<footer className="bg-primary text-primary-foreground pt-20 pb-8" style={{ viewTransitionName: "site-footer" }}>
			<div className="mx-auto max-w-7xl px-6 grid md:grid-cols-4 gap-10">
				<div className="md:col-span-2">
					<div className="flex items-center gap-3">
						<img src="/logo.png" alt="KAPE" className="h-12 w-12 shrink-0 rounded-full object-cover bg-white ring-1 ring-white/20" />
						<div>
							<div className="font-khmer text-sm">អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា</div>
							<div className="font-display font-semibold">Kampuchea Action to Promote Education</div>
						</div>
					</div>
					<p className="mt-6 text-sm opacity-80 max-w-md leading-relaxed">
						KAPE works at every level of formal education across 15 provinces in Cambodia — from preschools to Master's programs in Mentoring.
					</p>
					<div className="mt-6 text-sm opacity-80 space-y-1">
						{settings.contact_phone && <div>📞 {settings.contact_phone}</div>}
						{settings.contact_email && <div>✉ {settings.contact_email}</div>}
						{settings.address && <div>📍 {settings.address}</div>}
					</div>
				</div>
				<div>
					<div className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] font-semibold mb-4">Explore</div>
					<ul className="space-y-2 text-sm opacity-85">
						{[
							{ label: "Annual Report", href: "/media/annual-report" },
							{ label: "Impact Stories", href: "/stories" },
							{ label: "Research", href: "/media/paper-research" },
							{ label: "Program Brochure", href: "/media/program-brochure" },
							{ label: "Photo Gallery", href: "/galleries" },
							{ label: "Video Gallery", href: "/videos" },
							{ label: "Policies", href: "/media/policies" },
						].map((l) => (
							<li key={l.label}>
								<a href={l.href} className="hover:text-[var(--secondary)] transition">{l.label}</a>
							</li>
						))}
					</ul>
				</div>
				<div>
					<div className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] font-semibold mb-4">Newsletter</div>
					<p className="text-sm opacity-80 mb-3">Subscribe to receive our e-newsletter.</p>
					{subscribed ? (
						<p className="text-sm text-[var(--secondary)] font-semibold">Thanks for subscribing!</p>
					) : (
						<form className="flex gap-2" onSubmit={subscribe}>
							<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.org" className="flex-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-2.5 text-sm placeholder:text-primary-foreground/50 focus:outline-none focus:border-[var(--secondary)]" />
							<button type="submit" className="rounded-full bg-[var(--secondary)] text-primary px-4 text-sm font-semibold hover:bg-[var(--gold)] transition">→</button>
						</form>
					)}
					<div className="mt-6 flex gap-3">
						{socials.map(([label, url]) => (
							<a key={label} href={url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full border border-primary-foreground/20 grid place-items-center text-xs font-bold hover:bg-[var(--secondary)] hover:text-primary hover:border-[var(--secondary)] transition">{label}</a>
						))}
					</div>
				</div>
			</div>
			<div className="mx-auto max-w-7xl px-6 mt-16 pt-6 border-t border-primary-foreground/15 flex flex-wrap justify-between gap-4 text-xs opacity-70">
				<div>{settings.copyright || "© Kampuchea Action to Promote Education"}</div>
				{visits && <div>Today: {visits.today.toLocaleString()} · Total visits: {visits.total.toLocaleString()}</div>}
			</div>
		</footer>
	);
}
