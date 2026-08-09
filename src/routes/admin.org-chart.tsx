import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { OrgCanvas, type OrgRow } from "#/components/admin/OrgCanvas";
import { SearchableSelect } from "#/components/admin/SearchableSelect";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { confirm } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/org-chart")({
	component: OrgChartAdmin,
});

type PersonOpt = { value: string; label: string };

/** A node's id + all descendant ids (so a node can't be reparented under itself). */
function withDescendants(rows: OrgRow[], id: number): Set<number> {
	const out = new Set<number>([id]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const r of rows)
			if (r.parentId != null && out.has(r.parentId) && !out.has(r.id)) {
				out.add(r.id);
				grew = true;
			}
	}
	return out;
}

type FormValue = {
	parentId: number | null;
	name: string;
	title: string | null;
	personId: number | null;
};

function NodeForm({
	rows,
	people,
	initial,
	fixedParent,
	onSave,
	onCancel,
}: {
	rows: OrgRow[];
	people: PersonOpt[];
	initial?: OrgRow;
	fixedParent?: number | null;
	onSave: (v: FormValue) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [title, setTitle] = useState(initial?.title ?? "");
	const [personId, setPersonId] = useState(
		initial?.personId != null ? String(initial.personId) : "",
	);
	const [parentId, setParentId] = useState(
		initial?.parentId != null
			? String(initial.parentId)
			: fixedParent != null
				? String(fixedParent)
				: "",
	);

	const blocked = initial
		? withDescendants(rows, initial.id)
		: new Set<number>();
	const parentOpts = rows
		.filter((r) => !blocked.has(r.id))
		.map((r) => ({
			value: String(r.id),
			label: r.name + (r.title ? ` — ${r.title}` : ""),
		}));

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		onSave({
			parentId: parentId ? Number(parentId) : null,
			name: name.trim(),
			title: title.trim() || null,
			personId: personId ? Number(personId) : null,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="block">
					<span className={fieldLabel}>Name</span>
					<input
						className={fieldInput}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Executive Director"
						// biome-ignore lint/a11y/noAutofocus: NodeForm only mounts inside the Add/Edit person modal, opened by an explicit click. Focus belongs in the modal, not left on the trigger behind it.
						autoFocus
						required
					/>
				</label>
				<label className="block">
					<span className={fieldLabel}>Title / role</span>
					<input
						className={fieldInput}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Director of Programs"
					/>
				</label>
				<div>
					<label className={fieldLabel}>
						Link to team member (optional — photo + profile)
					</label>
					<SearchableSelect
						value={personId}
						onChange={setPersonId}
						options={people}
						emptyOption="— none —"
						placeholder="Pick a person…"
					/>
				</div>
				<div>
					<label className={fieldLabel}>Reports to (parent)</label>
					<SearchableSelect
						value={parentId}
						onChange={setParentId}
						options={parentOpts}
						emptyOption="— top of chart —"
						placeholder="Top of chart"
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="submit"
					className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90"
				>
					Save
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}

function OrgChartAdmin() {
	const [rows, setRows] = useState<OrgRow[]>([]);
	const [people, setPeople] = useState<PersonOpt[]>([]);
	const [loading, setLoading] = useState(true);
	const [mounted, setMounted] = useState(false); // React Flow is client-only
	const [editing, setEditing] = useState<number | null>(null);
	const [adding, setAdding] = useState<number | null | undefined>(undefined); // parentId for new node; undefined = closed

	const refresh = useCallback(async () => {
		const [n, ppl] = await Promise.all([
			trpcClient.adminOrg.list.query(),
			trpcClient.adminPeople.list.query(),
		]);
		setRows(n as OrgRow[]);
		setPeople(ppl.map((p) => ({ value: String(p.id), label: p.nameEn })));
		setLoading(false);
	}, []);

	useEffect(() => {
		setMounted(true);
		refresh().catch(() => setLoading(false));
	}, [refresh]);

	async function save(v: FormValue, id?: number) {
		if (id != null) await trpcClient.adminOrg.update.mutate({ id, ...v });
		else await trpcClient.adminOrg.create.mutate(v);
		setEditing(null);
		setAdding(undefined);
		await refresh();
	}
	const onDelete = useCallback(
		async (id: number) => {
			const node = rows.find((r) => r.id === id);
			const reports = node ? withDescendants(rows, id).size - 1 : 0;
			const extra = reports ? ` and its ${reports} report(s)` : "";
			if (
				!(await confirm(
					`Delete “${node?.name ?? "node"}”${extra}? This cannot be undone.`,
				))
			)
				return;
			await trpcClient.adminOrg.delete.mutate({ id });
			await refresh();
		},
		[rows, refresh],
	);
	const onReparent = useCallback(
		async (childId: number, parentId: number) => {
			await trpcClient.adminOrg.reparent.mutate({ id: childId, parentId });
			await refresh();
		},
		[refresh],
	);
	const onMovePosition = useCallback(
		async (id: number, x: number, y: number) => {
			await trpcClient.adminOrg.setPosition.mutate({ id, x, y });
			// keep local rows in sync so a later refresh/relayout respects the saved spot
			setRows((rs) =>
				rs.map((r) =>
					r.id === id ? { ...r, posX: Math.round(x), posY: Math.round(y) } : r,
				),
			);
		},
		[],
	);
	const onEdit = useCallback((id: number) => {
		setEditing(id);
		setAdding(undefined);
	}, []);
	const onAddChild = useCallback((parentId: number) => {
		setAdding(parentId);
		setEditing(null);
	}, []);

	const editingNode =
		editing != null ? rows.find((r) => r.id === editing) : undefined;
	const showModal = editing != null || adding !== undefined;

	return (
		<div className="max-w-[1600px]">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Organizational Chart
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Drag boxes to arrange them, drag from a box's bottom dot to another
						box's top dot to set who reports to whom, and use the ＋ / ✎ / ✕
						buttons on each box. Scroll to zoom, drag the background to pan.
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setAdding(null);
						setEditing(null);
					}}
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
				>
					+ Add person
				</button>
			</div>

			{loading || !mounted ? (
				<div className="grid h-[640px] place-items-center rounded-2xl border border-border bg-muted/20 text-sm text-muted-foreground">
					Loading…
				</div>
			) : rows.length === 0 ? (
				<div className="grid h-[640px] place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-center text-sm text-muted-foreground">
					<div>
						No one in the chart yet.
						<br />
						<button
							type="button"
							onClick={() => setAdding(null)}
							className="mt-3 rounded-full bg-primary text-primary-foreground px-4 py-2 font-semibold hover:opacity-90"
						>
							+ Add the first person
						</button>
					</div>
				</div>
			) : (
				<OrgCanvas
					rows={rows}
					onEdit={onEdit}
					onAddChild={onAddChild}
					onDelete={onDelete}
					onReparent={onReparent}
					onMovePosition={onMovePosition}
				/>
			)}

			{showModal && (
				<div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
					<button
						type="button"
						aria-label="Close person editor"
						className="absolute inset-0 cursor-default"
						onClick={() => {
							setEditing(null);
							setAdding(undefined);
						}}
					/>
					<div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-lift)]">
						<h3 className="mb-4 font-display text-lg font-semibold text-primary">
							{editing != null ? "Edit person" : "Add person"}
						</h3>
						<NodeForm
							rows={rows}
							people={people}
							initial={editingNode}
							fixedParent={adding ?? null}
							onSave={(v) => save(v, editing ?? undefined)}
							onCancel={() => {
								setEditing(null);
								setAdding(undefined);
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
