import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/settings")({
	component: SettingsAdmin,
});

type Row = { key: string; value: string };
const ci =
	"w-full bg-transparent px-2 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

/**
 * The keys the site's own identity hangs on. They drive every page title, the
 * search-result snippet, the social card and the Organization structured data,
 * and an operator will never find them by guessing at a key/value grid.
 */
const IDENTITY: { key: string; label: string; hint: string }[] = [
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
const LOCATION: { key: string; label: string; hint: string }[] = [
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

function SettingsAdmin() {
	const [rows, setRows] = useState<Row[]>([]);
	const [named, setNamed] = useState<Record<string, string>>({});
	const [savedNamed, setSavedNamed] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({ key: "", value: "" });

	async function refresh() {
		const all = await trpcClient.adminSettings.list.query();
		const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
		const known: Record<string, string> = {};
		for (const f of [...IDENTITY, ...LOCATION]) known[f.key] = map[f.key] ?? "";
		setNamed(known);
		setSavedNamed(known);
		setRows(
			all
				.filter((r) => !(r.key in known))
				.map((r) => ({ key: r.key, value: r.value }))
				.sort((a, b) => a.key.localeCompare(b.key)),
		);
		setLoading(false);
	}

	async function saveNamed() {
		for (const [key, value] of Object.entries(named))
			if (value !== savedNamed[key])
				await trpcClient.adminSettings.set.mutate({ key, value });
		setSavedNamed(named);
	}
	useEffect(() => {
		refresh();
	}, []);

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
		setRows((rs) => rs.filter((r) => r.key !== key));
	}

	return (
		<div className="max-w-3xl space-y-5">
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">
					Site Settings
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Global values used by the header, footer and contact page.
				</p>
			</div>

			<FormSection
				title="Site identity"
				description="Page titles, search results, social cards and the structured data search engines read all come from these."
			>
				<div className="space-y-4">
					{[...IDENTITY, ...LOCATION].map((f) => (
						<div key={f.key}>
							<label className={fieldLabel} htmlFor={`set-${f.key}`}>
								{f.label}
							</label>
							<input
								id={`set-${f.key}`}
								className={fieldInput}
								value={named[f.key] ?? ""}
								onChange={(e) =>
									setNamed({ ...named, [f.key]: e.target.value })
								}
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								{f.hint} <span className="font-mono">{f.key}</span>
							</p>
						</div>
					))}
					<button
						type="button"
						onClick={saveNamed}
						className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition"
					>
						Save identity
					</button>
				</div>
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
						{loading ? (
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
													rs.map((x, j) =>
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
