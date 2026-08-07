import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import {
	checkThemeValue,
	colourToHex,
	THEME_FIELDS,
	themeContrast,
	type ThemeKind,
} from "#/lib/site-theme";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/settings")({
	component: SettingsAdmin,
});

type Row = { key: string; value: string };
type Field = { key: string; label: string; hint: string; kind?: ThemeKind };

const ci =
	"w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

/**
 * The keys the site's own identity hangs on. They drive every page title, the
 * search-result snippet, the social card and the Organization structured data,
 * and an operator will never find them by guessing at a key/value grid.
 */
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
const NAMED = [...IDENTITY, ...LOCATION, ...BRAND];

/**
 * What the operator has typed but not yet saved, keyed on the setting. A
 * pending value is kept apart from the server's copy rather than overwriting
 * it: reloading the list then refreshes what is stored without discarding what
 * is being written, and a field edited to empty stays an edit rather than
 * reading as "unchanged".
 */
type Draft = Record<string, string>;

function Fields({
	fields,
	saved,
	draft,
	setDraft,
	onSave,
	saveLabel,
	status,
	loading,
}: {
	fields: Field[];
	saved: Record<string, string>;
	draft: Draft;
	setDraft: (f: (d: Draft) => Draft) => void;
	onSave: () => void;
	saveLabel: string;
	status: string;
	/** Until the stored values arrive the fields are empty, and typing into an
	 *  empty field that is about to fill itself is how edits went missing. */
	loading: boolean;
}) {
	const pending = fields.filter((f) => f.key in draft).length;
	return (
		<div className="space-y-4">
			{fields.map((f) => {
				const value = f.key in draft ? draft[f.key] : (saved[f.key] ?? "");
				const problem = f.kind ? checkThemeValue(f.kind, value) : null;
				return (
					<div key={f.key}>
						<label className={fieldLabel} htmlFor={`set-${f.key}`}>
							{f.label}
						</label>
						<input
							id={`set-${f.key}`}
							className={`${fieldInput} ${problem ? "border-destructive" : ""} ${loading ? "opacity-50" : ""}`}
							aria-invalid={problem ? true : undefined}
							readOnly={loading}
							value={value}
							onChange={(e) => {
								const typed = e.target.value;
								setDraft((d) => ({ ...d, [f.key]: typed }));
							}}
						/>
						{problem ? (
							<p className="mt-1 text-xs font-medium text-destructive">
								{problem} Saved as it is, this field is ignored and the rest of
								the theme still applies.
							</p>
						) : (
							<p className="mt-1 text-xs text-muted-foreground">
								{f.hint} <span className="font-mono">{f.key}</span>
							</p>
						)}
					</div>
				);
			})}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onSave}
					disabled={loading || !pending}
					className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
				>
					{pending ? `${saveLabel} (${pending})` : saveLabel}
				</button>
				<span className="text-xs text-muted-foreground">
					{loading ? "Reading the stored values…" : status}
				</span>
			</div>
		</div>
	);
}

/** What the site will write on each brand colour, and where that will not read. */
function Contrast({ values }: { values: Record<string, string> }) {
	const measured = themeContrast(values);
	const primary = (values.theme_primary ?? "").trim();
	const unconvertible =
		primary && !checkThemeValue("colour", primary) && !colourToHex(primary);
	if (!measured.length && !unconvertible) return null;
	return (
		<div className="mt-5 space-y-2 border-t border-border pt-4">
			<p className={fieldLabel}>Legibility</p>
			{measured.map((c) => (
				<p
					key={`${c.key}-${c.mode}-${c.what}`}
					className={`text-xs ${c.ratio < 4.5 ? "text-destructive" : "text-muted-foreground"}`}
				>
					{c.label}, {c.mode} mode, {c.what}: {c.ratio.toFixed(1)}:1
					{c.ratio < 3
						? " - hard to read at any size."
						: c.ratio < 4.5
							? " - below the 4.5:1 the guidelines ask for; fine for headings, tight for body text."
							: ""}
				</p>
			))}
			{unconvertible && (
				<p className="text-xs text-destructive">
					The browser's own title bar and the installed-app icon need a hex,
					oklch(), rgb() or hsl() colour. This one is used on the page, but
					those two fall back to the product's default.
				</p>
			)}
		</div>
	);
}

function SettingsAdmin() {
	// null until the stored values have actually been read. An empty map that has
	// never loaded looks exactly like "every setting is blank", and the screen
	// would then offer a Save that writes that guess over a live site.
	const [rows, setRows] = useState<Row[] | null>(null);
	const [saved, setSaved] = useState<Record<string, string> | null>(null);
	const [draft, setDraft] = useState<Draft>({});
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState("");
	const [add, setAdd] = useState({ key: "", value: "" });
	const loading = !saved;

	/**
	 * Re-read what is stored. Only `saved` moves: a reload must never throw away
	 * something the operator is halfway through typing, which is how edits used
	 * to disappear between the page loading and the list arriving.
	 */
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

	async function saveDraft(fields: Field[]) {
		const mine = fields.filter((f) => f.key in draft);
		const done: string[] = [];
		try {
			for (const f of mine) {
				const value = draft[f.key];
				await trpcClient.adminSettings.set.mutate({ key: f.key, value });
				done.push(f.key);
				setSaved((s) => ({ ...s, [f.key]: value }));
			}
			setStatus(
				`Saved ${done.length} ${done.length === 1 ? "field" : "fields"}.`,
			);
		} catch (err) {
			setStatus(
				`Saved ${done.length} of ${mine.length}; ${mine.length - done.length} still unsaved. ${err instanceof Error ? err.message : "The server refused the change."}`,
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

	async function save(key: string, value: string) {
		await trpcClient.adminSettings.set.mutate({ key, value });
	}
	async function create() {
		if (!add.key.trim()) return;
		await trpcClient.adminSettings.set.mutate({
			key: add.key.trim(),
			value: add.value,
		});
		setAdd({ key: "", value: "" });
		refresh();
	}
	async function del(key: string) {
		if (!(await confirm(`Delete setting "${key}"?`))) return;
		await trpcClient.adminSettings.delete.mutate({ key });
		setRows((rs) => (rs ?? []).filter((r) => r.key !== key));
	}

	const brandValues = Object.fromEntries(
		BRAND.map((f) => [
			f.key,
			f.key in draft ? draft[f.key] : (saved?.[f.key] ?? ""),
		]),
	);

	const heading = (
		<div>
			<h1 className="font-display text-2xl font-semibold text-primary">
				Site Settings
			</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Global values used by the header, footer and contact page.
			</p>
		</div>
	);

	// Every section on this page reads the same one query, so a failure leaves
	// nothing to show and nothing to type into. Keeping the form up with its
	// fields readOnly is how this screen used to sit there looking busy for ever.
	if (error)
		return (
			<div className="max-w-3xl space-y-5">
				{heading}
				<FormSection
					title="Site identity"
					description="Page titles, search results, social cards and the structured data search engines read all come from these."
				>
					<div className="space-y-3">
						<p className="text-sm text-destructive">
							This site's settings could not be read, so nothing here can be
							changed yet: {error}
						</p>
						<button
							type="button"
							onClick={refresh}
							className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition"
						>
							Try again
						</button>
					</div>
				</FormSection>
			</div>
		);

	return (
		<div className="max-w-3xl space-y-5">
			{heading}

			<FormSection
				title="Site identity"
				description="Page titles, search results, social cards and the structured data search engines read all come from these."
			>
				<Fields
					fields={[...IDENTITY, ...LOCATION]}
					saved={saved ?? {}}
					draft={draft}
					setDraft={setDraft}
					onSave={() => saveDraft([...IDENTITY, ...LOCATION])}
					saveLabel="Save identity"
					status={status}
					loading={loading}
				/>
			</FormSection>

			<FormSection
				title="Brand"
				description="The palette, the paper, the corner radius and the typefaces. Every page, section and admin screen follows these, in light and dark mode. Leave a field empty for the product's own default; leave a dark-mode field empty and it is derived from its light counterpart."
			>
				<Fields
					fields={BRAND}
					saved={saved ?? {}}
					draft={draft}
					setDraft={setDraft}
					onSave={() => saveDraft(BRAND)}
					saveLabel="Save brand"
					status={status}
					loading={loading}
				/>
				<Contrast values={brandValues} />
			</FormSection>

			<FormSection
				title="Add setting"
				description="A key/value pair, e.g. contact_email → hello@example.org."
			>
				<div className="flex flex-wrap items-end gap-3">
					<div className="min-w-[180px]">
						<label className={fieldLabel}>Key</label>
						<input
							className={`${fieldInput} font-mono`}
							placeholder="contact_email"
							value={add.key}
							onChange={(e) => setAdd({ ...add, key: e.target.value })}
						/>
					</div>
					<div className="flex-1 min-w-[220px]">
						<label className={fieldLabel}>Value</label>
						<input
							className={fieldInput}
							placeholder="hello@example.org"
							value={add.value}
							onChange={(e) => setAdd({ ...add, value: e.target.value })}
							onKeyDown={(e) => e.key === "Enter" && create()}
						/>
					</div>
					<button
						type="button"
						onClick={create}
						className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition"
					>
						Add
					</button>
				</div>
			</FormSection>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-2 py-2.5 w-1/3">Key</th>
							<th className="px-2 py-2.5">Value</th>
							<th className="px-3 py-2.5 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{!rows ? (
							<tr>
								<td colSpan={3} className="px-3 py-4 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : (
							rows.map((r, i) => (
								<tr key={r.key} className="hover:bg-muted/20">
									<td className="px-2 font-mono text-xs">{r.key}</td>
									<td>
										<input
											className={ci}
											value={r.value}
											onChange={(e) =>
												setRows((rs) =>
													(rs ?? []).map((x, j) =>
														j === i ? { ...x, value: e.target.value } : x,
													),
												)
											}
										/>
									</td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<button
											type="button"
											onClick={() => save(r.key, r.value)}
											className="text-xs rounded border border-border px-2.5 py-1 hover:bg-muted"
										>
											Save
										</button>
										<span className="ml-2 inline-flex align-middle">
											<ActionMenu
												items={[
													{
														label: "Delete",
														danger: true,
														onClick: () => del(r.key),
													},
												]}
											/>
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
