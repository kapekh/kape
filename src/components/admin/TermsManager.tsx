import { Tags } from "lucide-react";
import { useCallback, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import {
	EmptyState,
	ListStatus,
	TableScroll,
	useListQuery,
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
const cellInput =
	"w-full rounded-lg bg-transparent px-3 py-2 text-sm text-admin-ink transition-colors duration-150 ease-out placeholder:text-admin-ink-subtle hover:bg-admin-neutral-soft focus:bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-focus/40";

/** Reusable CRUD for one taxonomy of managed reference terms. */
export function TermsManager({
	taxonomy,
	title,
	description,
}: {
	taxonomy: string;
	title: string;
	description?: string;
}) {
	const load = useCallback(
		async () =>
			(await trpcClient.adminTerms.list.query()).filter(
				(t) => t.taxonomy === taxonomy,
			),
		[taxonomy],
	);
	const { rows, setRows, state, error, reload } = useListQuery<Term>(load);
	const [add, setAdd] = useState({ key: "", label: "" });

	function patch(id: number, field: "key" | "label", value: string) {
		setRows((rs) =>
			rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
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
				label: r.label,
				sort: r.sort,
			});
			toast(`Saved ${r.label || r.key}.`, "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(null);
		}
	}
	async function create() {
		if (!add.key.trim() || !add.label.trim()) return;
		setBusy("add");
		try {
			await trpcClient.adminTerms.create.mutate({
				taxonomy,
				key: add.key.trim(),
				label: add.label.trim(),
				sort: rows.length,
			});
			setAdd({ key: "", label: "" });
			await reload();
			toast(`Added ${add.label.trim()}.`, "success");
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
				<FormSection
					title="Add item"
					description="The key is what gets stored. The label is what people read."
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
						<div className="min-w-[200px] flex-1">
							<label className="block">
								<span className={fieldLabel}>Label</span>
								<input
									className={fieldInput}
									placeholder="Annual Report"
									value={add.label}
									onChange={(e) => setAdd({ ...add, label: e.target.value })}
									onKeyDown={(e) => e.key === "Enter" && create()}
								/>
							</label>
						</div>
						<Button type="button" onClick={create} disabled={busy === "add"}>
							{busy === "add" ? "Adding…" : "Add"}
						</Button>
					</div>
				</FormSection>

				{state !== "ready" ? (
					<ListStatus state={state} error={error} onRetry={reload} />
				) : rows.length === 0 ? (
					<EmptyState
						icon={<Tags />}
						title="Nothing in this list yet"
						description="Add the first item above. It becomes a choice everywhere this list is used."
					/>
				) : (
					<TableScroll label={title}>
						<Table>
							<THead>
								<TR>
									<TH width="33%">Key</TH>
									<TH>Label</TH>
									<TH align="right" width={140}>
										Actions
									</TH>
								</TR>
							</THead>
							<TBody>
								{rows.map((r) => (
									<TR key={r.id}>
										<TD label="Key" className="px-1">
											<input
												className={`${cellInput} font-mono`}
												aria-label={`Key for ${r.label || r.key}`}
												value={r.key}
												onChange={(e) => patch(r.id, "key", e.target.value)}
											/>
										</TD>
										<TD label="Label" className="px-1">
											<input
												className={cellInput}
												aria-label={`Label for ${r.key}`}
												value={r.label}
												onChange={(e) => patch(r.id, "label", e.target.value)}
											/>
										</TD>
										<TD align="right" className="max-md:justify-end">
											<span className="inline-flex items-center gap-2">
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onClick={() => save(r)}
													disabled={busy === r.id}
													aria-label={`Save ${r.label || r.key}`}
												>
													{busy === r.id ? "Saving…" : "Save"}
												</Button>
												<ActionMenu
													label={`Actions for ${r.label || r.key}`}
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
				)}
			</div>
		</div>
	);
}
