import { useCallback, useEffect, useState } from "react";

import { ActionMenu } from "#/components/admin/ActionMenu";
import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { confirm, toast } from "@/components/Dialogs";

type Term = Awaited<
	ReturnType<typeof trpcClient.adminTerms.list.query>
>[number];
const cellInput =
	"w-full bg-transparent px-3 py-2 text-sm focus:outline-none focus:bg-[var(--accent)]/5 rounded";

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
	const [rows, setRows] = useState<Term[]>([]);
	const [loading, setLoading] = useState(true);
	const [add, setAdd] = useState({ key: "", label: "" });

	const refresh = useCallback(async () => {
		const all = await trpcClient.adminTerms.list.query();
		setRows(all.filter((t) => t.taxonomy === taxonomy));
		setLoading(false);
	}, [taxonomy]);
	useEffect(() => {
		refresh();
	}, [refresh]);

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
			await refresh();
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

	const btn = "text-xs rounded border border-border px-2.5 py-1 hover:bg-muted";

	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-display text-2xl font-semibold text-primary">
					{title}
				</h1>
				{description && (
					<p className="mt-1 text-sm text-muted-foreground">{description}</p>
				)}
			</div>

			<FormSection
				title="Add item"
				description="Key is the stored value; label is what's shown."
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
					<div className="flex-1 min-w-[200px]">
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
					<button
						type="button"
						onClick={create}
						disabled={busy === "add"}
						className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
					>
						{busy === "add" ? "Adding…" : "Add"}
					</button>
				</div>
			</FormSection>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-3 py-2.5 w-1/3">Key</th>
							<th className="px-3 py-2.5">Label</th>
							<th className="px-3 py-2.5 w-32 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr>
								<td colSpan={3} className="px-3 py-4 text-muted-foreground">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={3} className="px-3 py-4 text-muted-foreground">
									No items yet — add one above.
								</td>
							</tr>
						) : (
							rows.map((r) => (
								<tr key={r.id} className="hover:bg-muted/20">
									<td className="px-1">
										<input
											className={`${cellInput} font-mono`}
											aria-label={`Key for ${r.label || r.key}`}
											value={r.key}
											onChange={(e) => patch(r.id, "key", e.target.value)}
										/>
									</td>
									<td className="px-1">
										<input
											className={cellInput}
											aria-label={`Label for ${r.key}`}
											value={r.label}
											onChange={(e) => patch(r.id, "label", e.target.value)}
										/>
									</td>
									<td className="px-3 py-2 text-right whitespace-nowrap">
										<button
											type="button"
											onClick={() => save(r)}
											disabled={busy === r.id}
											aria-label={`Save ${r.label || r.key}`}
											className={`${btn} disabled:opacity-40`}
										>
											{busy === r.id ? "Saving…" : "Save"}
										</button>
										<span className="ml-2 inline-flex align-middle">
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
