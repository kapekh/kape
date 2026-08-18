import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { startTourOnce } from "#/components/admin/Tour";
import { Button } from "#/components/ui/button.tsx";
import { EmptyState } from "#/components/ui/empty-state.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { SkeletonRows } from "#/components/ui/skeleton.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import {
	type ColourReach,
	checkThemeValue,
	colourReach,
	colourToHex,
	THEME_FIELDS,
	type ThemeKind,
	themeContrast,
	toggleOn,
} from "#/lib/site-theme";
import { confirm, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/settings")({
	component: SettingsAdmin,
});

type Row = { key: string; value: string };
type Field = { key: string; label: string; hint: string; kind?: ThemeKind };

const IDENTITY: Field[] = [
	{
		key: "site_name_en",
		label: "Organisation name",
		hint: "The full name, as it should read in the header and the footer.",
	},
	{
		key: "site_name_short",
		label: "Short name",
		hint: "Follows every page title. Left empty, a long name is shortened for display, but search engines are only ever told the full one.",
	},
	{
		key: "site_description",
		label: "One-line description",
		hint: "The sentence search engines and social cards show under the title.",
	},
	{
		key: "logo_url",
		label: "Logo",
		hint: "Path to your own logo, e.g. /uploads/logo.png. Empty shows the product's plain mark.",
	},
	{
		key: "favicon_url",
		label: "Favicon",
		hint: "The mark in the browser tab, e.g. /uploads/favicon.ico. A square .ico or .png, 48px or larger. Empty shows the product's plain mark.",
	},
	{
		key: "og_image",
		label: "Social share image",
		hint: "Shown when a link to this site is posted. Defaults to the logo.",
	},
	{
		key: "og_site_name",
		label: "Name on social cards",
		hint: "Only when a social card should say something other than the short name.",
	},
];

/** Optional, and only read by the Organization structured data. */
const LOCATION: Field[] = [
	{
		key: "address_region",
		label: "Region",
		hint: "Province, state or region.",
	},
	{
		key: "address_country",
		label: "Country code",
		hint: "Two letters, e.g. KH.",
	},
	{
		key: "area_served",
		label: "Country served",
		hint: "The country the organisation works in. Search engines read it as a country, so name one.",
	},
];

const BRAND: Field[] = THEME_FIELDS.map(({ key, label, hint, kind }) => ({
	key,
	label,
	hint,
	kind,
}));
const IDENTITY_FIELDS = [...IDENTITY, ...LOCATION];
const NAMED = [...IDENTITY, ...LOCATION, ...BRAND];

const SECTIONS = [
	{ id: "identity", label: "Site identity", fields: IDENTITY_FIELDS },
	{ id: "brand", label: "Brand", fields: BRAND },
	{ id: "add-setting", label: "Add setting", fields: [] as Field[] },
	{ id: "all-settings", label: "All settings", fields: [] as Field[] },
];

// pending values are kept apart from the server's copy, so a reload refreshes what is stored without discarding what is being typed
type Draft = Record<string, string>;

// a hex is the code on a brand guide, so it is the one the field speaks; anything
// with no single sRGB value (transparent, currentColor, a composite) stays as typed
const asHex = (f: Field, raw: string) =>
	f.kind === "colour" ? (colourToHex(raw)?.toUpperCase() ?? raw) : raw;

// the key is what the form writes to, not anything an operator types, so it sits on the label's title
function Fields({
	fields,
	saved,
	draft,
	setDraft,
}: {
	fields: Field[];
	saved: Record<string, string>;
	draft: Draft;
	setDraft: (f: (d: Draft) => Draft) => void;
}) {
	return (
		<div className="space-y-6">
			{fields.map((f) => {
				const value =
					f.key in draft ? draft[f.key] : asHex(f, saved[f.key] ?? "");
				const problem = f.kind ? checkThemeValue(f.kind, value) : null;
				const swatch =
					f.kind === "colour" && !problem ? colourToHex(value) : null;
				const errorId = `set-${f.key}-error`;
				return (
					<div
						key={f.key}
						className="grid gap-2 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-6"
					>
						<div className="min-w-0">
							<label
								className={fieldLabel}
								htmlFor={`set-${f.key}`}
								title={f.key}
							>
								{f.label}
							</label>
							<p className="text-[13px] text-admin-ink-muted">{f.hint}</p>
						</div>
						<div className="min-w-0">
							{f.kind === "toggle" ? (
								<Switch
									id={`set-${f.key}`}
									checked={toggleOn(value)}
									onCheckedChange={(next) =>
										setDraft((d) => ({ ...d, [f.key]: next ? "on" : "off" }))
									}
								/>
							) : (
								<div className="flex items-center gap-2">
									<input
										id={`set-${f.key}`}
										className={`${fieldInput} h-10 ${problem ? "border-admin-danger" : ""}`}
										aria-invalid={problem ? true : undefined}
										aria-describedby={problem ? errorId : undefined}
										value={value}
										onChange={(e) => {
											const typed = e.target.value;
											setDraft((d) => ({ ...d, [f.key]: typed }));
										}}
									/>
									{swatch && (
										<input
											type="color"
											aria-label={`${f.label} picker`}
											className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-admin-border bg-admin-panel p-1"
											value={swatch}
											onChange={(e) =>
												setDraft((d) => ({
													...d,
													[f.key]: e.target.value.toUpperCase(),
												}))
											}
										/>
									)}
								</div>
							)}
							{problem && (
								<p
									id={errorId}
									className="mt-2 text-[13px] font-medium text-admin-danger-ink"
								>
									{problem} Until that is fixed, or the field is cleared, this
									one is not sent and not saved.
								</p>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

// only theme_primary reaches browser chrome, so only it gets that clause
const REACH: Record<ColourReach, string> = {
	invisible:
		"paints nothing at all. Every heading, button and panel drawn in it comes out invisible. Clear the field to fall back to the product's own colour.",
	inherited:
		"has no colour of its own here. A :root custom property has nothing to inherit from, so it lands as whatever text colour happens to be in force rather than as a brand colour.",
	unconvertible:
		"paints, but has no one sRGB value, so there is no legibility figure for it above.",
};
const CHROME_FALLBACK =
	"The browser's own title bar and the installed-app icon need a hex, oklch(), rgb() or hsl() colour, so both fall back to the product's default.";

/** What the site will write on each brand colour, and where that will not read. */
function Contrast({ values }: { values: Record<string, string> }) {
	const measured = themeContrast(values);
	const caveats = BRAND.flatMap((field) => {
		const value = (values[field.key] ?? "").trim();
		const reach = field.kind === "colour" ? colourReach(value) : null;
		return reach ? [{ field, value, reach }] : [];
	});
	if (!measured.length && !caveats.length) return null;
	return (
		<div className="mt-6 space-y-2 border-t border-admin-border pt-6">
			<p className={fieldLabel}>Legibility</p>
			{measured.map((c) => (
				<p
					key={`${c.key}-${c.mode}-${c.what}`}
					className={`text-[13px] ${c.ratio < 4.5 ? "text-admin-danger-ink" : "text-admin-ink-muted"}`}
				>
					{c.label}, {c.mode} mode, {c.what}: {c.ratio.toFixed(1)}:1
					{c.ratio < 3
						? " - hard to read at any size."
						: c.ratio < 4.5
							? " - below the 4.5:1 the guidelines ask for; fine for headings, tight for body text."
							: ""}
				</p>
			))}
			{caveats.map(({ field, value, reach }) => (
				<p
					key={field.key}
					className={`text-[13px] ${reach === "invisible" ? "text-admin-danger-ink" : "text-admin-ink-muted"}`}
				>
					{field.label}: <span className="font-mono">{value}</span>{" "}
					{REACH[reach]}
					{field.key === "theme_primary" ? ` ${CHROME_FALLBACK}` : ""}
				</p>
			))}
		</div>
	);
}

// tRPC sends the code as the whole message when the throw site gives no text, so an expired session arrives as the bare word and Try again would retry it for ever
const SESSION_OVER = "UNAUTHORIZED";

function readFailureSentence(error: string, firstLoad: boolean) {
	if (error === SESSION_OVER)
		return firstLoad
			? "Your session has ended, so this site's settings could not be read. Sign in again to load them."
			: "Your session has ended, so the stored values could not be re-read. Everything on screen is still here, but nothing will save until you sign in again.";
	return firstLoad
		? `This site's settings could not be read, so nothing here can be changed yet: ${error}`
		: `The stored values could not be re-read, so what is on screen may be out of date: ${error}`;
}

// a banner once the page has loaded: replacing the form loses the drafts to the reload the message invites
function ReadError({
	error,
	firstLoad,
	onRetry,
}: {
	error: string;
	firstLoad: boolean;
	onRetry: () => void;
}) {
	const signedOut = error === SESSION_OVER;
	return (
		<div
			className={`space-y-3 rounded-xl border p-6 ${firstLoad ? "border-admin-border bg-admin-panel" : "border-admin-danger/40 bg-admin-danger-soft"}`}
		>
			<p className="text-sm text-admin-danger-ink">
				{readFailureSentence(error, firstLoad)}
			</p>
			{!firstLoad && !signedOut && (
				<p className="text-[13px] text-admin-ink-muted">
					Nothing you have typed has been lost. Try again to reload the stored
					values, or carry on editing and save.
				</p>
			)}
			{signedOut ? (
				<Button asChild variant="secondary">
					<a href="/login">Sign in again</a>
				</Button>
			) : (
				<Button type="button" variant="secondary" onClick={onRetry}>
					Try again
				</Button>
			)}
		</div>
	);
}

// outside the FormSection card on purpose: the card is overflow-hidden, and sticky gives up on a clipping ancestor
function SaveBar({
	label,
	pending,
	status,
	loading,
	onSave,
}: {
	label: string;
	pending: number;
	status: string;
	loading: boolean;
	onSave: () => void;
}) {
	return (
		<div
			data-tour="save-bar"
			className="sticky bottom-0 z-10 -mx-1 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-admin-border bg-admin-panel-raised/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur"
		>
			<Button
				type="button"
				onClick={onSave}
				disabled={loading || !pending}
				disabledReason={
					loading ? "Still reading the stored values." : "No changes to save."
				}
			>
				{pending ? `${label} (${pending})` : label}
			</Button>
			<span className="text-[13px] text-admin-ink-muted">
				{loading ? "Reading the stored values…" : status}
			</span>
		</div>
	);
}

function SettingsAdmin() {
	// null until read: an empty map looks like "every setting is blank" and one Save writes that guess over a live site
	const [rows, setRows] = useState<Row[] | null>(null);
	const [saved, setSaved] = useState<Record<string, string> | null>(null);
	const [draft, setDraft] = useState<Draft>({});
	const [error, setError] = useState<string | null>(null);
	// per section, or saving Brand also reports under Save identity, pointing at fields nobody touched
	const [status, setStatus] = useState({ of: "", text: "" });
	const [add, setAdd] = useState({ key: "", value: "" });
	const [addError, setAddError] = useState<string | null>(null);
	const [active, setActive] = useState("identity");
	const loading = !saved;

	// only saved moves: a reload must never throw away something halfway typed
	const refresh = useCallback(() => {
		setError(null);
		return trpcClient.adminSettings.list
			.query()
			.then((all) => {
				const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
				const known: Record<string, string> = {};
				for (const f of NAMED) known[f.key] = map[f.key] ?? "";
				setSaved(known);
				setRows(
					all
						.filter((r) => !(r.key in known))
						.map((r) => ({ key: r.key, value: r.value }))
						.sort((a, b) => a.key.localeCompare(b.key)),
				);
			})
			.catch((err) =>
				setError(
					err instanceof Error
						? err.message
						: "The settings could not be read.",
				),
			);
	}, []);

	async function saveDraft(fields: Field[], section: string) {
		const say = (text: string) => setStatus({ of: section, text });
		const pane = draft;
		const mine = fields.filter((f) => f.key in pane);
		// a value the field already marked wrong is never sent; the round trip could only repeat it
		const send = mine.filter(
			(f) => !f.kind || !checkThemeValue(f.kind, pane[f.key]),
		);
		const held = mine.length - send.length;
		const marked = held
			? ` ${held} not sent: fix what is marked above, or clear the field.`
			: "";
		const done: string[] = [];
		try {
			for (const f of send) {
				const value = pane[f.key];
				await trpcClient.adminSettings.set.mutate({ key: f.key, value });
				done.push(f.key);
				setSaved((s) => ({ ...s, [f.key]: value }));
			}
			say(
				`Saved ${done.length} ${done.length === 1 ? "field" : "fields"}.${marked}`,
			);
		} catch (err) {
			say(
				`Saved ${done.length} of ${send.length}; ${send.length - done.length} still unsaved. ${err instanceof Error ? err.message : "The server refused the change."}${marked}`,
			);
		}
		setDraft((d) => {
			const rest = { ...d };
			for (const key of done) delete rest[key];
			return rest;
		});
	}
	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => {
		startTourOnce("settings");
	}, []);

	// Which section the nav should mark as the one being read. Presentation only:
	// every section is mounted and every save is reachable whatever this says.
	useEffect(() => {
		if (typeof IntersectionObserver === "undefined") return;
		const seen = SECTIONS.map((s) => document.getElementById(s.id)).filter(
			(el): el is HTMLElement => !!el,
		);
		if (!seen.length) return;
		const obs = new IntersectionObserver(
			(entries) => {
				const top = entries
					.filter((e) => e.isIntersecting)
					.sort(
						(a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
					)[0];
				if (top) setActive(top.target.id);
			},
			{ rootMargin: "-80px 0px -60% 0px" },
		);
		for (const el of seen) obs.observe(el);
		return () => obs.disconnect();
	}, []);

	// One row at a time, keyed by the setting: the raw table has no inline status
	// slot per row, so success and failure both go to a toast.
	const [rowBusy, setRowBusy] = useState<string | null>(null);

	async function save(key: string, value: string) {
		setRowBusy(key);
		try {
			await trpcClient.adminSettings.set.mutate({ key, value });
			toast(`Saved ${key}.`, "success");
		} catch (err) {
			toast(saveErrorMessage(err), "error");
		} finally {
			setRowBusy(null);
		}
	}
	const [adding, setAdding] = useState(false);
	async function create() {
		if (!add.key.trim()) return;
		setAddError(null);
		setAdding(true);
		try {
			await trpcClient.adminSettings.set.mutate({
				key: add.key.trim(),
				value: add.value,
			});
		} catch (err) {
			setAddError(
				err instanceof Error ? err.message : "The server refused the change.",
			);
			return;
		} finally {
			setAdding(false);
		}
		setAdd({ key: "", value: "" });
		refresh();
		toast(`Added ${add.key.trim()}.`, "success");
	}
	async function del(key: string) {
		if (!(await confirm(`Delete setting "${key}"?`))) return;
		setRowBusy(key);
		try {
			await trpcClient.adminSettings.delete.mutate({ key });
			// dropped from the table only after the server took it, so a refused
			// delete cannot leave the row looking gone until the next reload
			setRows((rs) => (rs ?? []).filter((r) => r.key !== key));
			toast(`Deleted ${key}.`, "success");
		} catch (err) {
			toast(saveErrorMessage(err), "error");
		} finally {
			setRowBusy(null);
		}
	}

	const brandValues = Object.fromEntries(
		BRAND.map((f) => [
			f.key,
			f.key in draft ? draft[f.key] : asHex(f, saved?.[f.key] ?? ""),
		]),
	);
	const pendingIn = (fields: Field[]) =>
		fields.filter((f) => f.key in draft).length;

	// no breadcrumb: the settings test mounts this bare, with no router for a crumb's <Link>
	const header = (
		<PageHeader
			title="Site settings"
			description="Global values the header, footer, page titles and social cards all read."
		/>
	);

	// one query feeds every section, so there is nothing to show and nothing to type into until it answers
	if (error && !saved)
		return (
			<div className="max-w-3xl">
				{header}
				<ReadError error={error} firstLoad onRetry={refresh} />
			</div>
		);

	return (
		<div>
			{header}
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
				<nav
					aria-label="Settings sections"
					className="lg:sticky lg:top-20 max-lg:-mx-1 max-lg:overflow-x-auto"
				>
					<ul className="flex gap-1 max-lg:whitespace-nowrap lg:flex-col">
						{SECTIONS.map((s) => {
							const pending = pendingIn(s.fields);
							return (
								<li key={s.id}>
									<a
										href={`#${s.id}`}
										aria-current={active === s.id ? "true" : undefined}
										className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 aria-[current]:bg-admin-accent-soft aria-[current]:font-medium aria-[current]:text-admin-accent-ink"
									>
										{s.label}
										{pending > 0 && (
											<span className="rounded-full bg-admin-warning-soft px-2 py-1 text-xs font-medium leading-none text-admin-warning-ink">
												{pending}
												<span className="sr-only"> unsaved</span>
											</span>
										)}
									</a>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className="min-w-0 max-w-3xl space-y-6">
					{error && (
						<ReadError error={error} firstLoad={false} onRetry={refresh} />
					)}

					<section id="identity" className="scroll-mt-24">
						<FormSection
							title="Site identity"
							description="Page titles, search results, social cards and the structured data search engines read all come from these."
						>
							{loading ? (
								<SkeletonRows rows={IDENTITY_FIELDS.length} />
							) : (
								<Fields
									fields={IDENTITY_FIELDS}
									saved={saved ?? {}}
									draft={draft}
									setDraft={setDraft}
								/>
							)}
						</FormSection>
						<SaveBar
							label="Save identity"
							pending={pendingIn(IDENTITY_FIELDS)}
							status={status.of === "identity" ? status.text : ""}
							loading={loading}
							onSave={() => saveDraft(IDENTITY_FIELDS, "identity")}
						/>
					</section>

					<section id="brand" className="scroll-mt-24">
						<FormSection
							title="Brand"
							description="The palette, the paper, the corner radius and the typefaces. Every page, section and admin screen follows these, in light and dark mode. Leave a field empty for the product's own default; leave a dark-mode field empty and it is derived from its light counterpart."
						>
							{loading ? (
								<SkeletonRows rows={8} />
							) : (
								<>
									<Fields
										fields={BRAND}
										saved={saved ?? {}}
										draft={draft}
										setDraft={setDraft}
									/>
									<Contrast values={brandValues} />
								</>
							)}
						</FormSection>
						<SaveBar
							label="Save brand"
							pending={pendingIn(BRAND)}
							status={status.of === "brand" ? status.text : ""}
							loading={loading}
							onSave={() => saveDraft(BRAND, "brand")}
						/>
					</section>

					<section id="add-setting" className="scroll-mt-24">
						<FormSection
							title="Add setting"
							description="A key/value pair for anything this screen does not already name, e.g. contact_email → hello@example.org."
						>
							<div className="flex flex-wrap items-end gap-3">
								<div className="min-w-[11rem]">
									<label className="block">
										<span className={fieldLabel}>Key</span>
										<input
											className={`${fieldInput} h-10 font-mono`}
											placeholder="contact_email"
											value={add.key}
											onChange={(e) => setAdd({ ...add, key: e.target.value })}
										/>
									</label>
								</div>
								<div className="min-w-[14rem] flex-1">
									<label className="block">
										<span className={fieldLabel}>Value</span>
										<input
											className={`${fieldInput} h-10`}
											placeholder="hello@example.org"
											value={add.value}
											onChange={(e) =>
												setAdd({ ...add, value: e.target.value })
											}
											onKeyDown={(e) => e.key === "Enter" && create()}
										/>
									</label>
								</div>
								<Button type="button" onClick={create} disabled={adding}>
									<Plus aria-hidden="true" />
									{adding ? "Adding…" : "Add"}
								</Button>
							</div>
							{addError && (
								<p className="mt-3 text-sm text-admin-danger-ink">
									{addError === SESSION_OVER
										? "Your session has ended, so this setting was not added. Sign in again, then add it."
										: `This setting was not added: ${addError}`}
								</p>
							)}
						</FormSection>
					</section>

					<section id="all-settings" className="scroll-mt-24">
						<FormSection
							title="All settings"
							description="Everything stored that the sections above do not name. Edit a value and save that row on its own."
						>
							{!rows ? (
								<div aria-busy="true">
									<span className="sr-only">Loading…</span>
									<SkeletonRows />
								</div>
							) : rows.length === 0 ? (
								<EmptyState
									icon={<KeyRound />}
									title="No other settings"
									description="Everything stored is named by a section above. Anything you add here will show up in this table."
								/>
							) : (
								<Table>
									<THead>
										<TR>
											<TH width="30%">Key</TH>
											<TH>Value</TH>
											<TH align="right" width={140}>
												Actions
											</TH>
										</TR>
									</THead>
									<TBody>
										{rows.map((r, i) => (
											<TR key={r.key}>
												<TD label="Key" className="font-mono text-[13px]">
													{r.key}
												</TD>
												<TD label="Value">
													<input
														className={`${fieldInput} h-9`}
														aria-label={`Value for ${r.key}`}
														value={r.value}
														onChange={(e) =>
															setRows((rs) =>
																(rs ?? []).map((x, j) =>
																	j === i ? { ...x, value: e.target.value } : x,
																),
															)
														}
													/>
												</TD>
												<TD align="right">
													<div className="flex items-center justify-end gap-2">
														<Button
															type="button"
															size="sm"
															variant="secondary"
															onClick={() => save(r.key, r.value)}
															disabled={rowBusy === r.key}
															aria-label={`Save ${r.key}`}
														>
															{rowBusy === r.key ? "Saving…" : "Save"}
														</Button>
														<ActionMenu
															items={[
																{
																	label: "Delete",
																	danger: true,
																	onClick: () => del(r.key),
																},
															]}
														/>
													</div>
												</TD>
											</TR>
										))}
									</TBody>
								</Table>
							)}
						</FormSection>
					</section>
				</div>
			</div>
		</div>
	);
}
