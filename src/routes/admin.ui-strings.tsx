import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fieldLabel } from "#/components/admin/form-ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { PageHeader } from "#/components/ui/page-header";
import { SkeletonRows } from "#/components/ui/skeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/ui-strings")({
	component: UiStringsAdmin,
});

type List = Awaited<
	ReturnType<typeof trpcClient.adminSettings.uiStrings.query>
>;
type Row = List["rows"][number];
type Lang = List["languages"][number];

/** Field identity: one key/language pair. */
const cell = (key: string, lang: string) => `${key}\0${lang}`;

const group = (key: string) => {
	const dot = key.indexOf(".");
	return dot > 0 ? key.slice(0, dot) : "other";
};

// the installer writes every shipped default, so a stored row is not by itself a change
const changed = (row: Row, lang: string) =>
	row.values[lang] !== undefined && row.values[lang] !== row.defaults[lang];

const overridden = (row: Row) =>
	Object.keys(row.values).some((lang) => changed(row, lang));

function matches(row: Row, needle: string): boolean {
	if (!needle) return true;
	if (row.key.toLowerCase().includes(needle)) return true;
	for (const text of [
		...Object.values(row.values),
		...Object.values(row.defaults),
	])
		if (text.toLowerCase().includes(needle)) return true;
	return false;
}

const resultText = (err: unknown) =>
	err instanceof Error ? err.message : "The server refused the change.";

function UiStringsAdmin() {
	// null until the strings have actually been read: an empty list looks exactly
	// like "this site has no chrome at all", and the page would offer to save that.
	const [list, setList] = useState<List | null>(null);
	const [readError, setReadError] = useState<string | null>(null);
	// What is typed but not yet stored, kept apart from the server's copy so a
	// reload refreshes what is stored without discarding what is being written.
	const [draft, setDraft] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState<Record<string, boolean>>({});
	const [rowStatus, setRowStatus] = useState<
		Record<string, { failed: boolean; text: string }>
	>({});
	const [announce, setAnnounce] = useState("");
	const [needle, setNeedle] = useState("");
	const [onlyOverridden, setOnlyOverridden] = useState(false);

	const refresh = useCallback(() => {
		setReadError(null);
		return trpcClient.adminSettings.uiStrings
			.query()
			.then(setList)
			.catch((err) => setReadError(resultText(err)));
	}, []);
	useEffect(() => {
		refresh();
	}, [refresh]);

	const langs: Lang[] = list?.languages ?? [];
	const rows = useMemo(() => list?.rows ?? [], [list]);

	const shown = useMemo(() => {
		const q = needle.trim().toLowerCase();
		return rows.filter(
			(r) => (!onlyOverridden || overridden(r)) && matches(r, q),
		);
	}, [rows, needle, onlyOverridden]);

	const groups = useMemo(() => {
		const out = new Map<string, Row[]>();
		for (const row of shown) {
			const g = group(row.key);
			const bucket = out.get(g);
			if (bucket) bucket.push(row);
			else out.set(g, [row]);
		}
		return [...out.entries()].sort(([a], [b]) => a.localeCompare(b));
	}, [shown]);

	const fieldValue = (row: Row, lang: string) => {
		const id = cell(row.key, lang);
		return id in draft ? draft[id] : (row.values[lang] ?? "");
	};
	const editsIn = (row: Row) =>
		langs.filter((l) => {
			const id = cell(row.key, l.code);
			return id in draft && draft[id].trim() !== (row.values[l.code] ?? "");
		});

	/** Fold one saved (or reset) value back into the list the server gave us. */
	function applyStored(key: string, lang: string, value: string | null) {
		setList((cur) =>
			cur
				? {
						...cur,
						rows: cur.rows.map((r) => {
							if (r.key !== key) return r;
							const values = { ...r.values };
							if (value === null) delete values[lang];
							else values[lang] = value;
							return { ...r, values };
						}),
					}
				: cur,
		);
	}
	const dropDraft = (ids: string[]) =>
		setDraft((d) => {
			const rest = { ...d };
			for (const id of ids) delete rest[id];
			return rest;
		});

	async function saveRow(row: Row) {
		const edits = editsIn(row);
		if (!edits.length) return;
		setBusy((b) => ({ ...b, [row.key]: true }));
		setRowStatus((s) => ({ ...s, [row.key]: { failed: false, text: "" } }));
		const done: string[] = [];
		let failure = "";
		for (const l of edits) {
			const id = cell(row.key, l.code);
			const typed = draft[id].trim();
			try {
				await trpcClient.adminSettings.setUiString.mutate({
					key: row.key,
					lang: l.code,
					value: typed,
				});
				applyStored(row.key, l.code, typed || null);
				done.push(id);
			} catch (err) {
				failure = `${l.name}: ${resultText(err)}`;
				break;
			}
		}
		// Only what the server took is cleared. A value it refused stays in the
		// field, still marked unsaved, rather than vanishing into a green tick.
		dropDraft(done);
		const saved = `${done.length} of ${edits.length} saved for ${row.key}.`;
		const text = failure
			? `${saved} ${failure} What it refused is still in the field.`
			: `Saved ${row.key}.`;
		setRowStatus((s) => ({ ...s, [row.key]: { failed: !!failure, text } }));
		setAnnounce(text);
		setBusy((b) => ({ ...b, [row.key]: false }));
	}

	async function resetCell(row: Row, lang: Lang) {
		setBusy((b) => ({ ...b, [row.key]: true }));
		try {
			await trpcClient.adminSettings.resetUiString.mutate({
				key: row.key,
				lang: lang.code,
			});
			applyStored(row.key, lang.code, null);
			dropDraft([cell(row.key, lang.code)]);
			const text = `${row.key} in ${lang.name} is back to its default.`;
			setRowStatus((s) => ({ ...s, [row.key]: { failed: false, text } }));
			setAnnounce(text);
		} catch (err) {
			const text = `${row.key} in ${lang.name} was not reset: ${resultText(err)}`;
			setRowStatus((s) => ({ ...s, [row.key]: { failed: true, text } }));
			setAnnounce(text);
		}
		setBusy((b) => ({ ...b, [row.key]: false }));
	}

	const overriddenCount = rows.filter(overridden).length;

	return (
		<div className="space-y-5">
			<PageHeader
				title="UI strings"
				description="The words the site itself puts on screen — menu labels, buttons, form messages. A box left empty shows the shipped default, which is the grey text inside it; clearing a box you have changed and saving puts that default back."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "UI strings" }]}
			/>

			<output aria-live="polite" className="sr-only">
				{announce}
			</output>

			<Card>
				<div className="flex flex-wrap items-end gap-4">
					<div className="min-w-[260px] flex-1">
						<label className={fieldLabel} htmlFor="ui-search">
							Search a key or the words themselves
						</label>
						<Input
							id="ui-search"
							type="search"
							placeholder="nav.home, Donate, បរិច្ចាគ…"
							value={needle}
							onChange={(e) => setNeedle(e.target.value)}
						/>
					</div>
					<label className="flex items-center gap-2 pb-2 text-sm text-admin-ink">
						<input
							type="checkbox"
							className="size-4 accent-admin-accent"
							checked={onlyOverridden}
							onChange={(e) => setOnlyOverridden(e.target.checked)}
						/>
						Only strings this site has changed
					</label>
				</div>
				<p className="mt-3 text-[13px] text-admin-ink-muted">
					{list
						? `${shown.length} of ${rows.length} keys shown. ${overriddenCount} changed from the default.`
						: "Reading the stored strings…"}
				</p>
			</Card>

			{readError && (
				<Card tone="danger">
					<p className="text-sm text-admin-danger">
						The UI strings could not be read: {readError}
					</p>
					<Button
						variant="secondary"
						size="sm"
						className="mt-3"
						onClick={refresh}
					>
						Try again
					</Button>
				</Card>
			)}

			{!list && !readError && <SkeletonRows rows={6} />}

			{list && !shown.length && (
				<Card>
					<p className="text-sm text-admin-ink-muted">
						No key matches “{needle}”
						{onlyOverridden ? " among the strings this site has changed" : ""}.
					</p>
				</Card>
			)}

			{groups.map(([name, items]) => (
				<section
					key={name}
					data-tour="ui-group"
					aria-labelledby={`ui-group-${name}`}
					className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel"
				>
					<h2
						id={`ui-group-${name}`}
						className="border-b border-admin-border bg-admin-bg px-4 py-3 text-base font-semibold text-admin-ink"
					>
						{name}
					</h2>
					<table className="w-full text-sm">
						<thead className="text-left text-xs font-medium uppercase tracking-wide text-admin-ink-muted">
							<tr>
								<th scope="col" className="px-4 py-2 w-1/5">
									Key
								</th>
								{langs.map((l) => (
									<th scope="col" key={l.code} className="px-2 py-2">
										{l.name}
									</th>
								))}
								<th scope="col" className="px-4 py-2 text-right">
									Save
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-admin-border">
							{items.map((row) => {
								const status = rowStatus[row.key];
								const pending = !!busy[row.key];
								const dirty = editsIn(row).length;
								return (
									<tr
										key={row.key}
										className="align-top transition-colors duration-150 ease-out hover:bg-admin-accent-soft/30"
									>
										<th
											scope="row"
											className="px-4 py-3 text-left font-mono text-[13px] font-normal text-admin-ink-muted"
										>
											{row.key}
											{status && (
												<span
													className={`mt-1 block font-sans ${status.failed ? "text-admin-danger" : "text-admin-live"}`}
												>
													{status.text}
												</span>
											)}
										</th>
										{langs.map((l) => (
											<td key={l.code} className="px-2 py-2">
												<Input
													id={`ui-${row.key}-${l.code}`}
													aria-label={`${l.name} for ${row.key}`}
													lang={l.code}
													className={l.code === "km" ? "font-khmer" : undefined}
													placeholder={row.defaults[l.code]}
													value={fieldValue(row, l.code)}
													onChange={(e) =>
														setDraft((d) => ({
															...d,
															[cell(row.key, l.code)]: e.target.value,
														}))
													}
													onKeyDown={(e) => e.key === "Enter" && saveRow(row)}
												/>
												{/* three states, said rather than implied: this site
												    changed it, or it is the shipped default */}
												<div className="mt-2 flex items-center gap-2">
													{changed(row, l.code) ? (
														<>
															<Badge tone="accent">Changed here</Badge>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => resetCell(row, l)}
																disabled={pending}
																aria-label={`Reset ${l.name} for ${row.key} to the shipped default`}
															>
																Reset to default
															</Button>
														</>
													) : (
														<span className="text-[13px] text-admin-ink-muted">
															{fieldValue(row, l.code).trim()
																? "Shipped default"
																: "Empty — shows the default"}
														</span>
													)}
												</div>
											</td>
										))}
										<td className="px-4 py-2 text-right whitespace-nowrap">
											<Button
												variant="secondary"
												size="sm"
												onClick={() => saveRow(row)}
												disabled={pending || !dirty}
												disabledReason={
													dirty ? undefined : "No changes to save."
												}
											>
												{pending
													? "Saving…"
													: dirty
														? `Save (${dirty})`
														: "Save"}
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</section>
			))}
		</div>
	);
}
