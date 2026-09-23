import { Tags } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { defaultLanguage } from "#/components/admin/LangTabs";
import {
	dragItem,
	EmptyState,
	ListStatus,
	ReorderCell,
	ReorderHead,
	SortableStatus,
	TableScroll,
	useListQuery,
	useListReorder,
} from "#/components/admin/list-ui";
import { Button } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Table, TBody, TD, TH, THead, TR } from "#/components/ui/table.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { confirm, toast } from "@/components/Dialogs";

type Term = Awaited<
	ReturnType<typeof trpcClient.adminTerms.list.query>
>[number];
type Lang = Awaited<ReturnType<typeof trpcClient.i18n.languages.query>>[number];
const cellInput =
	"w-full rounded-lg bg-transparent px-3 py-2 text-sm text-admin-ink transition-colors duration-150 ease-out placeholder:text-admin-ink-subtle hover:bg-admin-neutral-soft focus:bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-focus/40";

/** Reusable CRUD for one taxonomy of managed reference terms. */
export function TermsManager({
	taxonomy,
	title,
	description,
	notice,
}: {
	taxonomy: string;
	title: string;
	description?: string;
	/** What this one list has to say about itself, above the form. */
	notice?: ReactNode;
}) {
	const [langs, setLangs] = useState<Lang[]>([]);
	const load = useCallback(async () => {
		const [all, languages] = await Promise.all([
			trpcClient.adminTerms.list.query(),
			trpcClient.i18n.languages.query(),
		]);
		setLangs(languages);
		return all.filter((t) => t.taxonomy === taxonomy);
	}, [taxonomy]);
	const { rows, setRows, state, error, reload } = useListQuery<Term>(load);
	const [add, setAdd] = useState<{
		key: string;
		labels: Record<string, string>;
	}>({ key: "", labels: {} });
	const defaultLang = defaultLanguage(langs)?.code ?? "";
	const named = (r: Term) => r.labels[defaultLang] || r.key;
	const reorder = useListReorder({
		rows,
		id: (r: Term) => r.id,
		describe: named,
		save: async (ids) => {
			await trpcClient.adminTerms.reorder.mutate({ taxonomy, ids });
			// the row's own Save replays `sort`, and a stale one would undo the drag
			setRows((rs) =>
				rs.map((r) => {
					const at = ids.indexOf(r.id);
					return at < 0 ? r : { ...r, sort: at };
				}),
			);
		},
	});

	function patchKey(id: number, value: string) {
		setRows((rs) => rs.map((r) => (r.id === id ? { ...r, key: value } : r)));
	}
	function patchLabel(id: number, lang: string, value: string) {
		setRows((rs) =>
			rs.map((r) =>
				r.id === id ? { ...r, labels: { ...r.labels, [lang]: value } } : r,
			),
		);
	}
	// Keyed by row id so only the row being written disables; "add" is its own key
	// because the Add button is not attached to any row.
	const [busy, setBusy] = useState<number | "add" | null>(null);

	async function save(r: Term) {
		setBusy(r.id);
		try {
			await trpcClient.adminTerms.update.mutate({
				id: r.id,
				taxonomy,
				key: r.key,
				labels: r.labels,
				sort: r.sort,
			});
			toast(`Saved ${named(r)}.`, "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(null);
		}
	}
	async function create() {
		const labels = Object.fromEntries(
			Object.entries(add.labels)
				.map(([lang, v]) => [lang, v.trim()] as const)
				.filter(([, v]) => v !== ""),
		);
		if (!add.key.trim() || !labels[defaultLang]) return;
		setBusy("add");
		try {
			await trpcClient.adminTerms.create.mutate({
				taxonomy,
				key: add.key.trim(),
				labels,
				sort: rows.length,
			});
			setAdd({ key: "", labels: {} });
			await reload();
			toast(`Added ${labels[defaultLang]}.`, "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(null);
		}
	}
	async function del(id: number) {
		if (!(await confirm("Delete this item?"))) return;
		setBusy(id);
		try {
			await trpcClient.adminTerms.delete.mutate({ id });
			// removed from the table only once the server has taken it: dropping it
			// first makes a refused delete look like it worked until the next reload
			setRows((rs) => rs.filter((r) => r.id !== id));
			toast("Item deleted.", "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(null);
		}
	}

	return (
		<div>
			<PageHeader
				title={title}
				description={description}
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: title }]}
			/>

			<div className="space-y-6">
				{notice}
				<div data-tour="terms-add">
					<FormSection
						title="Add item"
						description="The key is what gets stored. The label is what people read, in each language."
					>
						<div className="flex flex-wrap items-end gap-3">
							<label className="block">
								<span className={fieldLabel}>Key</span>
								<input
									className={`${fieldInput} w-48 font-mono`}
									placeholder="annual-report"
									value={add.key}
									onChange={(e) => setAdd({ ...add, key: e.target.value })}
									onKeyDown={(e) => e.key === "Enter" && create()}
								/>
							</label>
							{langs.map((l) => (
								<div key={l.code} className="min-w-[200px] flex-1">
									<label className="block">
										<span className={fieldLabel}>Label ({l.name})</span>
										<input
											className={`${fieldInput} ${l.code === "km" ? "font-khmer" : ""}`}
											placeholder="Annual Report"
											value={add.labels[l.code] ?? ""}
											onChange={(e) =>
												setAdd((p) => ({
													...p,
													labels: { ...p.labels, [l.code]: e.target.value },
												}))
											}
											onKeyDown={(e) => e.key === "Enter" && create()}
										/>
									</label>
								</div>
							))}
							<Button type="button" onClick={create} disabled={busy === "add"}>
								{busy === "add" ? "Adding…" : "Add"}
							</Button>
						</div>
					</FormSection>
				</div>

				{state !== "ready" ? (
					<ListStatus state={state} error={error} onRetry={reload} />
				) : rows.length === 0 ? (
					<EmptyState
						icon={<Tags />}
						title="Nothing in this list yet"
						description="Add the first item above. It becomes a choice everywhere this list is used."
					/>
				) : (
					<>
						<SortableStatus status={reorder.status} />
						<TableScroll label={title}>
							<Table>
								<THead>
									<TR>
										<ReorderHead />
										<TH width="33%">Key</TH>
										{langs.map((l) => (
											<TH key={l.code}>Label ({l.name})</TH>
										))}
										<TH align="right" width={140}>
											Actions
										</TH>
									</TR>
								</THead>
								<TBody>
									{reorder.rows.map((r) => (
										<TR
											key={r.id}
											{...reorder.itemProps(r)}
											className={dragItem}
										>
											<ReorderCell grip={reorder.grip(r)} />
											<TD label="Key" className="px-1">
												<input
													className={`${cellInput} font-mono`}
													aria-label={`Key for ${named(r)}`}
													value={r.key}
													onChange={(e) => patchKey(r.id, e.target.value)}
												/>
											</TD>
											{langs.map((l) => (
												<TD
													key={l.code}
													label={`Label (${l.name})`}
													className="px-1"
												>
													<input
														className={`${cellInput} ${l.code === "km" ? "font-khmer" : ""}`}
														aria-label={`Label for ${r.key} in ${l.name}`}
														value={r.labels[l.code] ?? ""}
														onChange={(e) =>
															patchLabel(r.id, l.code, e.target.value)
														}
													/>
												</TD>
											))}
											<TD align="right" className="max-md:justify-end">
												<span className="inline-flex items-center gap-2">
													<Button
														type="button"
														variant="secondary"
														size="sm"
														onClick={() => save(r)}
														disabled={busy === r.id}
														aria-label={`Save ${named(r)}`}
													>
														{busy === r.id ? "Saving…" : "Save"}
													</Button>
													<ActionMenu
														label={`Actions for ${named(r)}`}
														items={[
															{
																label: "Delete",
																danger: true,
																disabled: busy === r.id,
																onClick: () => del(r.id),
															},
														]}
													/>
												</span>
											</TD>
										</TR>
									))}
								</TBody>
							</Table>
						</TableScroll>
					</>
				)}
			</div>
		</div>
	);
}
