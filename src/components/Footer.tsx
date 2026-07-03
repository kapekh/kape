import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { FOOTER_DEFAULTS } from "@/lib/footer-defaults";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";

import { NavLink } from "./NavLink";

/**
 * Global site footer. Every text/link is driven by `site_settings` (editable in
 * /admin/settings), with FOOTER_DEFAULTS as fallbacks. Visit counts are fetched
 * client-side so prerendered HTML never freezes a stale count.
 */

/** Parse a "Label|/href, Label|/href" string into link objects. */
function parseLinks(raw: string) {
	return raw
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean)
		.map((pair) => {
			const [label, href] = pair.split("|").map((s) => s.trim());
			return { label, href: href || "#" };
		})
		.filter((l) => l.label);
}

export function Footer({ settings }: { settings: Record<string, string> }) {
	const { lang } = useLang();
	const [email, setEmail] = useState("");
	const [subscribed, setSubscribed] = useState(false);
	const [visits, setVisits] = useState<{ today: number; total: number } | null>(null);
	useEffect(() => {
		trpcClient.site.visits.query().then(setVisits).catch(() => {});
	}, []);

	const s = (key: string) => settings[key] ?? FOOTER_DEFAULTS[key] ?? "";
	const links = parseLinks(s("footer_links"));
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
							{s("site_name_km") && <div className="font-khmer text-sm">{s("site_name_km")}</div>}
							<div className="font-display font-semibold">{s("site_name_en")}</div>
						</div>
					</div>
					{s("footer_blurb") && <p className="mt-6 text-sm opacity-80 max-w-md leading-relaxed">{s("footer_blurb")}</p>}
					<div className="mt-6 text-sm opacity-80 space-y-1">
						{settings.contact_phone && <div>📞 {settings.contact_phone}</div>}
						{settings.contact_email && <div>✉ {settings.contact_email}</div>}
						{settings.address && <div>📍 {settings.address}</div>}
					</div>
				</div>
				<div>
					<div className="t-eyebrow text-[var(--gold)] mb-4">{s("footer_links_title")}</div>
					<ul className="space-y-2 text-sm opacity-85">
						{links.map((l) => (
							<li key={l.label}>
								<NavLink href={localizedHref(l.href, lang)} className="hover:text-[var(--secondary)] transition">{l.label}</NavLink>
							</li>
						))}
					</ul>
				</div>
				<div>
					<div className="t-eyebrow text-[var(--gold)] mb-4">{s("newsletter_title")}</div>
					{s("newsletter_text") && <p className="text-sm opacity-80 mb-3">{s("newsletter_text")}</p>}
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
