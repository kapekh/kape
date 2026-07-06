import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AdminHeader } from "#/components/admin/AdminHeader";
import { FormSection, fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { MediaPicker } from "#/components/admin/MediaPicker";
import { useDirty } from "#/components/admin/useDirty";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { FOOTER_DEFAULTS } from "#/lib/footer-defaults";

export const Route = createFileRoute("/admin/footer")({ component: FooterAdmin });

// Every site_settings key this page owns (others are left untouched). Social
// links live in `footer_socials` (a JSON list), handled separately below.
const KEYS = [
	"site_name_en", "site_name_km", "footer_blurb", "footer_blurb_km",
	"contact_phone", "contact_email", "address",
	"footer_links_title", "footer_links_title_km",
	"newsletter_title", "newsletter_title_km", "newsletter_text", "newsletter_text_km",
	"copyright", "copyright_km",
] as const;

type Link = { label: string; href: string };
const parseLinks = (raw: string): Link[] =>
	raw.split(",").map((p) => p.trim()).filter(Boolean).map((pair) => {
		const [label, href] = pair.split("|").map((s) => s.trim());
		return { label: label ?? "", href: href ?? "" };
	}).filter((l) => l.label || l.href);

type Social = { name: string; url: string; logoUrl: string };
const parseSocials = (raw?: string): Social[] => {
	if (!raw) return [];
	try {
		const arr = JSON.parse(raw);
		return Array.isArray(arr)
			? arr.map((s) => ({ name: String(s?.name ?? ""), url: String(s?.url ?? ""), logoUrl: String(s?.logoUrl ?? "") }))
			: [];
	} catch {
		return [];
	}
};
// Fallback for stores predating `footer_socials`: rebuild the list from the
// legacy single-key fields so nothing is lost on first edit.
const legacySocials = (m: Record<string, string>): Social[] => {
	const tg = m.telegram ? (/^https?:/i.test(m.telegram) ? m.telegram : `https://${m.telegram}`) : "";
	return [
		{ name: "Facebook", url: m.social_facebook ?? "", logoUrl: "" },
		{ name: "YouTube", url: m.youtube_url ?? "", logoUrl: "" },
		{ name: "Telegram", url: tg, logoUrl: "" },
	].filter((s) => s.url);
};

function FooterAdmin() {
	const [vals, setVals] = useState<Record<string, string>>({});
	const [links, setLinks] = useState<Link[]>([]);
	const [socials, setSocials] = useState<Social[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		trpcClient.adminSettings.list.query().then((rows) => {
			const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
			const next: Record<string, string> = {};
			for (const k of KEYS) next[k] = map[k] ?? FOOTER_DEFAULTS[k] ?? "";
			setVals(next);
			setLinks(parseLinks(map.footer_links ?? FOOTER_DEFAULTS.footer_links));
			const parsed = parseSocials(map.footer_socials);
			setSocials(parsed.length ? parsed : legacySocials(map));
			setLoading(false);
		});
	}, []);

	const set = (k: string, v: string) => setVals((o) => ({ ...o, [k]: v }));
	const setSocial = (i: number, patch: Partial<Social>) =>
		setSocials((ls) => ls.map((x, j) => (j === i ? { ...x, ...patch } : x)));
	const moveSocial = (i: number, dir: -1 | 1) =>
		setSocials((ls) => {
			const j = i + dir;
			if (j < 0 || j >= ls.length) return ls;
			const next = ls.slice();
			[next[i], next[j]] = [next[j], next[i]];
			return next;
		});

	async function save(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		const payload: Record<string, string> = {
			...vals,
			footer_links: links.filter((l) => l.label.trim()).map((l) => `${l.label.trim()}|${l.href.trim()}`).join(", "),
			footer_socials: JSON.stringify(
				socials
					.filter((s) => s.url.trim() || s.name.trim())
					.map((s) => ({ name: s.name.trim(), url: s.url.trim(), logoUrl: s.logoUrl.trim() })),
			),
		};
		await Promise.all(Object.entries(payload).map(([key, value]) => trpcClient.adminSettings.set.mutate({ key, value })));
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	const dirty = useDirty(JSON.stringify({ vals, links, socials }), savedAt);

	if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

	const Field = ({ k, label, km, area }: { k: string; label: string; km?: boolean; area?: boolean }) => (
		<div>
			<label className={fieldLabel}>{label}</label>
			{area ? (
				<textarea className={`${fieldInput} resize-y ${km ? "font-khmer" : ""}`} rows={3} value={vals[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
			) : (
				<input className={`${fieldInput} ${km ? "font-khmer" : ""}`} value={vals[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
			)}
		</div>
	);

	return (
		<form id="footer-form" onSubmit={save} className="max-w-3xl space-y-5 pb-10">
			{/* Actions live in the sticky admin top bar (via the header-slot portal, the
			    same mechanism the Page editor uses) so Save + save-status stay reachable
			    while the long form scrolls. position:sticky can't be used here because the
			    content <main> clips overflow, which disables it. The button submits the
			    form across the portal via the `form` attribute. */}
			<AdminHeader>
				<div className="ml-auto flex items-center gap-3">
					{savedAt && <span className="whitespace-nowrap text-xs text-[var(--palm)]">Saved {savedAt}</span>}
					<button type="submit" form="footer-form" disabled={saving || !dirty} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
						{saving ? "Saving…" : "Save footer"}
					</button>
				</div>
			</AdminHeader>
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">Footer</h1>
				<p className="mt-1 text-sm text-muted-foreground">Everything in the public site footer.</p>
			</div>

			<FormSection title="Brand" description="Organisation name and the short blurb beside the logo.">
				<div className="space-y-4">
					<Field k="site_name_en" label="Organisation name (English)" />
					<Field k="site_name_km" label="Organisation name (Khmer)" km />
					<Field k="footer_blurb" label="Blurb" area />
					<Field k="footer_blurb_km" label="Blurb (Khmer)" km area />
				</div>
			</FormSection>

			<FormSection title="Contact" description="Shown under the blurb.">
				<div className="grid sm:grid-cols-2 gap-4">
					<Field k="contact_phone" label="Phone" />
					<Field k="contact_email" label="Email" />
					<div className="sm:col-span-2"><Field k="address" label="Address" /></div>
				</div>
			</FormSection>

			<FormSection title="Links column" description="The list of quick links. Use a site path (e.g. /stories) or full URL.">
				<div className="grid sm:grid-cols-2 gap-4">
					<Field k="footer_links_title" label="Column title" />
					<Field k="footer_links_title_km" label="Column title (Khmer)" km />
				</div>
				<div className="mt-4 space-y-2">
					{links.map((l, i) => (
						<div key={i} className="flex items-center gap-2">
							<input className={`${fieldInput} flex-1`} placeholder="Label" value={l.label} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
							<input className={`${fieldInput} flex-1 font-mono text-xs`} placeholder="/path or https://…" value={l.href} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
							<button type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove" className="shrink-0 grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40">✕</button>
						</div>
					))}
					<button type="button" onClick={() => setLinks((ls) => [...ls, { label: "", href: "" }])} className="text-sm font-semibold text-[var(--accent)] hover:underline">+ Add link</button>
				</div>
			</FormSection>

			<FormSection title="Newsletter" description="The subscribe column heading and intro.">
				<div className="space-y-4">
					<div className="grid sm:grid-cols-2 gap-4">
						<Field k="newsletter_title" label="Title" />
						<Field k="newsletter_title_km" label="Title (Khmer)" km />
					</div>
					<Field k="newsletter_text" label="Intro text" area />
					<Field k="newsletter_text_km" label="Intro text (Khmer)" km area />
				</div>
			</FormSection>

			<FormSection title="Social & legal" description="Each social platform with its full URL and an optional logo. No logo? A letter badge is shown. Square logos look best — each is shown on a small white circle.">
				<div>
					<label className={fieldLabel}>Social links</label>
					<div className="mt-1 space-y-3">
						{socials.map((sc, i) => (
							<div key={i} className="rounded-xl border border-border bg-background/40 p-3">
								<div className="flex items-start gap-3">
									<div className="w-24 shrink-0">
										<MediaPicker
											mode="url"
											kind="image"
											accept="image/*"
											aspect="square"
											value={sc.logoUrl}
											onChange={(v) => setSocial(i, { logoUrl: v })}
											label="Logo"
										/>
									</div>
									<div className="flex-1 space-y-2">
										<input className={fieldInput} placeholder="Name (e.g. Facebook)" value={sc.name} onChange={(e) => setSocial(i, { name: e.target.value })} />
										<input className={`${fieldInput} font-mono text-xs`} placeholder="https://…" value={sc.url} onChange={(e) => setSocial(i, { url: e.target.value })} />
									</div>
									<div className="flex shrink-0 flex-col gap-1">
										<button type="button" disabled={i === 0} onClick={() => moveSocial(i, -1)} aria-label="Move up" className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
										<button type="button" disabled={i === socials.length - 1} onClick={() => moveSocial(i, 1)} aria-label="Move down" className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
										<button type="button" onClick={() => setSocials((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove" className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40">✕</button>
									</div>
								</div>
							</div>
						))}
						<button type="button" onClick={() => setSocials((ls) => [...ls, { name: "", url: "", logoUrl: "" }])} className="text-sm font-semibold text-[var(--accent)] hover:underline">+ Add social</button>
					</div>
				</div>
				<div className="mt-4 grid sm:grid-cols-2 gap-4">
					<Field k="copyright" label="Copyright line" />
					<Field k="copyright_km" label="Copyright line (Khmer)" km />
				</div>
			</FormSection>
		</form>
	);
}
