import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { FOOTER_DEFAULTS } from "@/lib/footer-defaults";
import { useLang } from "@/lib/i18n";
import { DEFAULT_LANG, localizedHref } from "@/lib/i18n-config";

import { KhmerCalendar } from "./KhmerCalendar";
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

type Social = { name: string; url: string; logoUrl: string };
/** Parse the `footer_socials` JSON list; tolerant of malformed values. */
function parseSocials(raw?: string): Social[] {
	if (!raw) return [];
	try {
		const arr = JSON.parse(raw);
		return Array.isArray(arr)
			? arr
					.filter((s) => s?.url)
					.map((s) => ({
						name: String(s.name ?? ""),
						url: String(s.url ?? ""),
						logoUrl: String(s.logoUrl ?? ""),
					}))
			: [];
	} catch {
		return [];
	}
}
// Short badge shown when a social has no uploaded logo.
const SOCIAL_BADGE: Record<string, string> = {
	facebook: "f",
	youtube: "yt",
	telegram: "t",
	instagram: "ig",
	linkedin: "in",
	twitter: "x",
	x: "x",
	tiktok: "tk",
};
const socialBadge = (name: string) =>
	SOCIAL_BADGE[name.trim().toLowerCase()] ??
	(name.trim()[0] || "•").toUpperCase();

export function Footer({ settings }: { settings: Record<string, string> }) {
	const { lang, t } = useLang();
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);
	const [visits, setVisits] = useState<{ today: number; total: number } | null>(
		null,
	);
	useEffect(() => {
		trpcClient.site.visits
			.query()
			.then(setVisits)
			.catch(() => {});
	}, []);

	// Locale-aware setting: prefer a `<key>_<lang>` variant (e.g. footer_blurb_km)
	// on non-default locales, else fall back to the base key / default.
	const s = (key: string) =>
		(lang !== DEFAULT_LANG && settings[`${key}_${lang}`]) ||
		settings[key] ||
		FOOTER_DEFAULTS[key] ||
		"";
	const links = parseLinks(s("footer_links"));
	// Prefer the editable `footer_socials` list; fall back to the legacy single-key
	// fields so older installs keep working until the footer is saved once.
	const parsedSocials = parseSocials(settings.footer_socials);
	const socials: Social[] = (
		parsedSocials.length
			? parsedSocials
			: [
					{
						name: "Facebook",
						url: settings.social_facebook || "",
						logoUrl: "",
					},
					{ name: "YouTube", url: settings.youtube_url || "", logoUrl: "" },
					{
						name: "Telegram",
						url: settings.telegram
							? `https://${settings.telegram.replace(/^https?:\/\//, "")}`
							: "",
						logoUrl: "",
					},
				]
	).filter((sc) => sc.url);

	async function subscribe(e: React.FormEvent) {
		e.preventDefault();
		setStatus("sending");
		try {
			const res = await fetch("/api/forms/subscribe", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email }),
			});
			if (res.ok) {
				setStatus("sent");
				setEmail("");
			} else {
				setStatus("error");
			}
		} catch {
			setStatus("error");
		}
	}

	return (
		<footer
			className="bg-primary text-primary-foreground pt-20 pb-8"
			style={{ viewTransitionName: "site-footer" }}
		>
			<div className="mx-auto max-w-7xl px-6 grid md:grid-cols-12 gap-10">
				<div className="md:col-span-5">
					<div className="flex items-center gap-3">
						<img
							src="/logo.png"
							alt="KAPE"
							className="h-12 w-12 shrink-0 rounded-full object-cover bg-white ring-1 ring-white/20"
						/>
						<div>
							{s("site_name_km") && (
								<div className="font-khmer text-sm">{s("site_name_km")}</div>
							)}
							<div className="font-display font-semibold">
								{s("site_name_en")}
							</div>
						</div>
					</div>
					{s("footer_blurb") && (
						<p className="mt-6 text-sm opacity-80 max-w-md leading-relaxed">
							{s("footer_blurb")}
						</p>
					)}
					<div className="mt-6 text-sm opacity-80 space-y-1">
						{settings.contact_phone && (
							<div>
								<span aria-hidden="true">📞</span> {settings.contact_phone}
							</div>
						)}
						{settings.contact_email && (
							<div>
								<span aria-hidden="true">✉</span> {settings.contact_email}
							</div>
						)}
						{settings.address && (
							<div>
								<span aria-hidden="true">📍</span> {settings.address}
							</div>
						)}
					</div>
				</div>
				<div className="md:col-span-3">
					<h2 className="t-eyebrow text-[var(--gold)] mb-4">
						{s("footer_links_title")}
					</h2>
					<ul className="space-y-2 text-sm opacity-85">
						{links.map((l) => (
							<li key={l.label}>
								<NavLink
									href={localizedHref(l.href, lang)}
									className="hover:text-[var(--secondary)] transition"
								>
									{l.label}
								</NavLink>
							</li>
						))}
					</ul>
				</div>
				<div className="md:col-span-4">
					<h2 className="t-eyebrow text-[var(--gold)] mb-4">
						{s("newsletter_title")}
					</h2>
					{s("newsletter_text") && (
						<p className="text-sm opacity-80 mb-3">{s("newsletter_text")}</p>
					)}
					{status === "sent" ? (
						<p className="text-sm text-[var(--secondary)] font-semibold">
							{t("newsletter.thanks", "Thanks for subscribing!")}
						</p>
					) : (
						<>
							<form className="flex gap-2" onSubmit={subscribe}>
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									aria-label={t("newsletter.email", "Email address")}
									placeholder="you@email.org"
									className="flex-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-2.5 text-sm placeholder:text-primary-foreground/50 focus:outline-none focus:border-[var(--secondary)]"
								/>
								<button
									type="submit"
									disabled={status === "sending"}
									aria-label={t("newsletter.subscribe", "Subscribe")}
									className="rounded-full bg-[var(--secondary)] text-primary px-4 text-sm font-semibold hover:bg-[var(--gold)] disabled:opacity-50 transition"
								>
									→
								</button>
							</form>
							{status === "error" && (
								<p className="mt-2 text-sm text-[var(--gold)]">
									{t(
										"newsletter.error",
										"Something went wrong. Please try again.",
									)}
								</p>
							)}
						</>
					)}
					<div className="mt-6 flex flex-wrap gap-3">
						{socials.map((sc, i) => (
							<a
								key={`${sc.name}-${i}`}
								href={sc.url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={sc.name}
								title={sc.name}
								className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full transition ${
									sc.logoUrl
										? "bg-white ring-1 ring-primary-foreground/20 hover:ring-2 hover:ring-[var(--secondary)]"
										: "border border-primary-foreground/20 text-xs font-bold hover:bg-[var(--secondary)] hover:text-primary hover:border-[var(--secondary)]"
								}`}
							>
								{sc.logoUrl ? (
									// Uploaded image fills the whole circle (cover crops the overflow)
									// so there are no gaps around it.
									<img
										src={sc.logoUrl}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : (
									socialBadge(sc.name)
								)}
							</a>
						))}
					</div>
					<KhmerCalendar />
				</div>
			</div>
			<div className="mx-auto max-w-7xl px-6 mt-16 pt-6 border-t border-primary-foreground/15 flex flex-wrap justify-between gap-4 text-xs opacity-70">
				<div>{s("copyright") || "© Kampuchea Action to Promote Education"}</div>
				{visits && (
					<div>
						Today: {visits.today.toLocaleString()} · Total visits:{" "}
						{visits.total.toLocaleString()}
					</div>
				)}
			</div>
		</footer>
	);
}
