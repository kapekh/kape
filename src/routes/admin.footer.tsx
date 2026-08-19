import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminHeader } from "#/components/admin/AdminHeader";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { MediaPicker } from "#/components/admin/MediaPicker";
import { useDirtyGuard } from "#/components/admin/useDirty";
import { Button } from "#/components/ui/button";
import { PageHeader } from "#/components/ui/page-header";
import { SkeletonRows } from "#/components/ui/skeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { FOOTER_DEFAULTS } from "#/lib/footer-defaults";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/footer")({
	component: FooterAdmin,
});

// Every site_settings key this page owns (others are left untouched). Social
// links live in `footer_socials` (a JSON list), handled separately below.
const KEYS = [
	"site_name_en",
	"site_name_km",
	"site_name_short",
	"site_description",
	"footer_blurb",
	"footer_blurb_km",
	"contact_phone",
	"contact_email",
	"address",
	"footer_links_title",
	"footer_links_title_km",
	"newsletter_title",
	"newsletter_title_km",
	"newsletter_text",
	"newsletter_text_km",
	"copyright",
	"copyright_km",
] as const;

// `key` is the row's identity while it is edited; it is never saved, since
// serializeLinks writes the label and href only
type Link = { key: string; label: string; href: string };
const parseLinks = (raw: string): Link[] =>
	raw
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean)
		.map((pair) => {
			const [label, href] = pair.split("|").map((s) => s.trim());
			return { key: crypto.randomUUID(), label: label ?? "", href: href ?? "" };
		})
		.filter((l) => l.label || l.href);

const serializeLinks = (ls: Link[]) =>
	ls
		.filter((l) => l.label.trim())
		.map((l) => `${l.label.trim()}|${l.href.trim()}`)
		.join(", ");

/** What a social row's controls call it. Falls back to its position when unnamed. */
const socialName = (s: Social, i: number) =>
	s.name.trim() || s.url.trim() || `social link ${i + 1}`;

/** Editable "Label → path" rows, shared by the links column and the buttons. */
function LinkRows({
	rows,
	setRows,
	addLabel,
}: {
	rows: Link[];
	setRows: React.Dispatch<React.SetStateAction<Link[]>>;
	addLabel: string;
}) {
	const patch = (i: number, p: Partial<Link>) =>
		setRows((ls) => ls.map((x, j) => (j === i ? { ...x, ...p } : x)));
	return (
		<div className="mt-4 space-y-2">
			{rows.map((l, i) => (
				<div key={l.key} className="flex items-center gap-2">
					<input
						className={`${fieldInput} flex-1`}
						placeholder="Label"
						aria-label={`Link ${i + 1} label`}
						value={l.label}
						onChange={(e) => patch(i, { label: e.target.value })}
					/>
					<input
						className={`${fieldInput} flex-1 font-mono text-xs`}
						placeholder="/path or https://…"
						aria-label={`Link ${i + 1} path`}
						value={l.href}
						onChange={(e) => patch(i, { href: e.target.value })}
					/>
					{/* names the row it removes: 19 buttons called "Remove" say nothing about which link goes */}
					<button
						type="button"
						onClick={() => setRows((ls) => ls.filter((_, j) => j !== i))}
						aria-label={`Remove ${l.label.trim() || `link ${i + 1}`}`}
						className="grid size-8 shrink-0 place-items-center rounded-lg border border-admin-border text-admin-ink-muted transition-colors duration-150 ease-out hover:border-admin-danger/40 hover:text-admin-danger-ink focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
					>
						<X aria-hidden="true" className="size-4" />
					</button>
				</div>
			))}
			<Button
				variant="secondary"
				size="sm"
				onClick={() =>
					setRows((ls) => [
						...ls,
						{ key: crypto.randomUUID(), label: "", href: "" },
					])
				}
			>
				<Plus aria-hidden="true" className="size-4" />
				{addLabel}
			</Button>
		</div>
	);
}

type Social = { key: string; name: string; url: string; logoUrl: string };
const parseSocials = (raw?: string): Social[] => {
	if (!raw) return [];
	try {
		const arr = JSON.parse(raw);
		return Array.isArray(arr)
			? arr.map((s) => ({
					key: crypto.randomUUID(),
					name: String(s?.name ?? ""),
					url: String(s?.url ?? ""),
					logoUrl: String(s?.logoUrl ?? ""),
				}))
			: [];
	} catch {
		return [];
	}
};
// Fallback for stores predating `footer_socials`: rebuild the list from the
// legacy single-key fields so nothing is lost on first edit.
const legacySocials = (m: Record<string, string>): Social[] => {
	const tg = m.telegram
		? /^https?:/i.test(m.telegram)
			? m.telegram
			: `https://${m.telegram}`
		: "";
	return [
		{ name: "Facebook", url: m.social_facebook ?? "", logoUrl: "" },
		{ name: "YouTube", url: m.youtube_url ?? "", logoUrl: "" },
		{ name: "Telegram", url: tg, logoUrl: "" },
	]
		.filter((s) => s.url)
		.map((s) => ({ ...s, key: crypto.randomUUID() }));
};

function FooterAdmin() {
	const [vals, setVals] = useState<Record<string, string>>({});
	const [links, setLinks] = useState<Link[]>([]);
	const [buttons, setButtons] = useState<Link[]>([]);
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
			setButtons(
				parseLinks(map.footer_buttons ?? FOOTER_DEFAULTS.footer_buttons),
			);
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
			footer_links: serializeLinks(links),
			footer_buttons: serializeLinks(buttons),
			footer_socials: JSON.stringify(
				socials
					.filter((s) => s.url.trim() || s.name.trim())
					.map((s) => ({
						name: s.name.trim(),
						url: s.url.trim(),
						logoUrl: s.logoUrl.trim(),
					})),
			),
		};
		// without the try, one rejected settings.set leaves the button on "Saving…" for good
		try {
			await Promise.all(
				Object.entries(payload).map(([key, value]) =>
					trpcClient.adminSettings.set.mutate({ key, value }),
				),
			);
			setSavedAt(new Date().toLocaleTimeString());
			toast("Footer saved.", "success");
		} catch (err) {
			toast(saveErrorMessage(err), "error");
		} finally {
			setSaving(false);
		}
	}

	const dirty = useDirtyGuard(
		JSON.stringify({ vals, links, buttons, socials }),
		savedAt,
		!loading,
	);

	if (loading)
		return (
			<div className="max-w-3xl">
				<PageHeader
					title="Footer"
					description="Everything in the public site footer."
					breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Footer" }]}
				/>
				<SkeletonRows rows={8} />
			</div>
		);

	const Field = ({
		k,
		label,
		km,
		area,
	}: {
		k: string;
		label: string;
		km?: boolean;
		area?: boolean;
	}) => (
		<div>
			<label className={fieldLabel} htmlFor={`footer-${k}`}>
				{label}
			</label>
			{area ? (
				<textarea
					id={`footer-${k}`}
					className={`${fieldInput} resize-y ${km ? "font-khmer" : ""}`}
					rows={3}
					value={vals[k] ?? ""}
					onChange={(e) => set(k, e.target.value)}
				/>
			) : (
				<input
					id={`footer-${k}`}
					className={`${fieldInput} ${km ? "font-khmer" : ""}`}
					value={vals[k] ?? ""}
					onChange={(e) => set(k, e.target.value)}
				/>
			)}
		</div>
	);

	return (
		<form
			id="footer-form"
			onSubmit={save}
			className="max-w-3xl space-y-5 pb-10"
		>
			{/* sticky cannot be used here, the content <main> clips overflow and disables it; the button submits across the portal via the form attribute */}
			{/* the slot the shell gives a route is ~59px at 390, where this button
			    lands on top of Tour and View site; below lg it moves into the form */}
			<AdminHeader>
				<div className="ml-auto hidden items-center gap-3 lg:flex">
					{savedAt && (
						<span className="whitespace-nowrap text-[13px] text-admin-live-ink">
							Saved {savedAt}
						</span>
					)}
					<Button
						type="submit"
						form="footer-form"
						disabled={saving || !dirty}
						disabledReason={dirty ? undefined : "No changes to save."}
					>
						{saving ? "Saving…" : "Save footer"}
					</Button>
				</div>
			</AdminHeader>
			<PageHeader
				title="Footer"
				description="Everything in the public site footer."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Footer" }]}
			/>

			<FormSection
				title="Brand"
				description="Organisation name and the short blurb beside the logo."
			>
				<div className="space-y-4">
					<Field k="site_name_en" label="Organisation name (English)" />
					<Field k="site_name_km" label="Organisation name (Khmer)" km />
					<Field
						k="site_name_short"
						label="Short name (used after every page title)"
					/>
					<Field
						k="site_description"
						label="One-line description (search results and social cards)"
						area
					/>
					<Field k="footer_blurb" label="Blurb" area />
					<Field k="footer_blurb_km" label="Blurb (Khmer)" km area />
				</div>
			</FormSection>

			<FormSection title="Contact" description="Shown under the blurb.">
				<div className="grid sm:grid-cols-2 gap-4">
					<Field k="contact_phone" label="Phone" />
					<Field k="contact_email" label="Email" />
					<div className="sm:col-span-2">
						<Field k="address" label="Address" />
					</div>
				</div>
			</FormSection>

			<FormSection
				title="Links column"
				description="The list of quick links. Use a site path (e.g. /stories) or full URL."
			>
				<div className="grid sm:grid-cols-2 gap-4">
					<Field k="footer_links_title" label="Column title" />
					<Field k="footer_links_title_km" label="Column title (Khmer)" km />
				</div>
				<LinkRows rows={links} setRows={setLinks} addLabel="+ Add link" />
			</FormSection>

			<FormSection
				title="Calendar buttons"
				description="The pill buttons under the contact block. The first one is highlighted. Point them at the calendar pages, e.g. /calendar/public-holidays-cambodia."
			>
				<LinkRows rows={buttons} setRows={setButtons} addLabel="+ Add button" />
			</FormSection>

			<FormSection
				title="Newsletter"
				description="The subscribe column heading and intro."
			>
				<div className="space-y-4">
					<div className="grid sm:grid-cols-2 gap-4">
						<Field k="newsletter_title" label="Title" />
						<Field k="newsletter_title_km" label="Title (Khmer)" km />
					</div>
					<Field k="newsletter_text" label="Intro text" area />
					<Field k="newsletter_text_km" label="Intro text (Khmer)" km area />
				</div>
			</FormSection>

			<FormSection
				title="Social & legal"
				description="Each social platform with its full URL and an optional logo. No logo? A letter badge is shown. Square logos look best — each is shown on a small white circle."
			>
				<fieldset>
					<legend className={fieldLabel}>Social links</legend>
					<div className="mt-1 space-y-3">
						{socials.map((sc, i) => (
							<div
								key={sc.key}
								className="rounded-xl border border-admin-border bg-admin-bg p-3"
							>
								<div className="flex items-start gap-3">
									<div className="w-24 shrink-0">
										<MediaPicker
											mode="url"
											kind="image"
											accept="image/*"
											aspect="square"
											value={sc.logoUrl}
											onChange={(v) => setSocial(i, { logoUrl: v })}
											label={`${socialName(sc, i)} logo`}
										/>
									</div>
									<div className="flex-1 space-y-2">
										<input
											className={fieldInput}
											placeholder="Name (e.g. Facebook)"
											aria-label={`Social link ${i + 1} name`}
											value={sc.name}
											onChange={(e) => setSocial(i, { name: e.target.value })}
										/>
										<input
											className={`${fieldInput} font-mono text-xs`}
											placeholder="https://…"
											aria-label={`Social link ${i + 1} URL`}
											value={sc.url}
											onChange={(e) => setSocial(i, { url: e.target.value })}
										/>
									</div>
									<div className="flex shrink-0 flex-col gap-1">
										<button
											type="button"
											disabled={i === 0}
											onClick={() => moveSocial(i, -1)}
											aria-label={`Move ${socialName(sc, i)} up`}
											className="grid size-8 place-items-center rounded-lg border border-admin-border text-admin-ink-muted transition-colors duration-150 ease-out hover:text-admin-ink disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
										>
											<ArrowUp aria-hidden="true" className="size-4" />
										</button>
										<button
											type="button"
											disabled={i === socials.length - 1}
											onClick={() => moveSocial(i, 1)}
											aria-label={`Move ${socialName(sc, i)} down`}
											className="grid size-8 place-items-center rounded-lg border border-admin-border text-admin-ink-muted transition-colors duration-150 ease-out hover:text-admin-ink disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
										>
											<ArrowDown aria-hidden="true" className="size-4" />
										</button>
										<button
											type="button"
											onClick={() =>
												setSocials((ls) => ls.filter((_, j) => j !== i))
											}
											aria-label={`Remove ${socialName(sc, i)}`}
											className="grid size-8 place-items-center rounded-lg border border-admin-border text-admin-ink-muted transition-colors duration-150 ease-out hover:border-admin-danger/40 hover:text-admin-danger-ink focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
										>
											<X aria-hidden="true" className="size-4" />
										</button>
									</div>
								</div>
							</div>
						))}
						<Button
							variant="secondary"
							size="sm"
							onClick={() =>
								setSocials((ls) => [
									...ls,
									{ key: crypto.randomUUID(), name: "", url: "", logoUrl: "" },
								])
							}
						>
							<Plus aria-hidden="true" className="size-4" />
							Add social link
						</Button>
					</div>
				</fieldset>
				<div className="mt-4 grid sm:grid-cols-2 gap-4">
					<Field k="copyright" label="Copyright line" />
					<Field k="copyright_km" label="Copyright line (Khmer)" km />
				</div>
			</FormSection>

			<div className="flex items-center gap-3 lg:hidden">
				<Button
					type="submit"
					form="footer-form"
					disabled={saving || !dirty}
					disabledReason={dirty ? undefined : "No changes to save."}
				>
					{saving ? "Saving…" : "Save footer"}
				</Button>
				{savedAt && (
					<span className="text-[13px] text-admin-live-ink">
						Saved {savedAt}
					</span>
				)}
			</div>
		</form>
	);
}
