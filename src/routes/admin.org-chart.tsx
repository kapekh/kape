import { createFileRoute } from "@tanstack/react-router";
import { Network, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { fieldLabel } from "#/components/admin/form-ui";
import { OrgCanvas, type OrgRow } from "#/components/admin/OrgCanvas";
import { SearchableSelect } from "#/components/admin/SearchableSelect";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { Input } from "#/components/ui/input";
import { PageHeader } from "#/components/ui/page-header";
import { Skeleton } from "#/components/ui/skeleton";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { saveErrorMessage } from "#/lib/save-error";
import { useModalPanel } from "#/lib/use-modal-panel";
import { confirm, toast } from "@/components/Dialogs";

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
	saving,
}: {
	rows: OrgRow[];
	people: PersonOpt[];
	initial?: OrgRow;
	fixedParent?: number | null;
	onSave: (v: FormValue) => void;
	onCancel: () => void;
	saving?: boolean;
}) {
	const uid = useId();
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
				<div>
					<label className={fieldLabel} htmlFor={`${uid}-name`}>
						Name
					</label>
					<Input
						id={`${uid}-name`}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Executive Director"
						// only mounts inside the Add/Edit modal, opened by an explicit click:
						// focus belongs in the modal, not on the trigger behind it
						autoFocus
						required
					/>
				</div>
				<div>
					<label className={fieldLabel} htmlFor={`${uid}-title`}>
						Title / role
					</label>
					<Input
						id={`${uid}-title`}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Director of Programs"
					/>
				</div>
				<div>
					<label className={fieldLabel} htmlFor={`${uid}-person`}>
						Link to team member (optional — photo + profile)
					</label>
					<SearchableSelect
						id={`${uid}-person`}
						value={personId}
						onChange={setPersonId}
						options={people}
						emptyOption="— none —"
						placeholder="Pick a person…"
					/>
				</div>
				<div>
					<label className={fieldLabel} htmlFor={`${uid}-parent`}>
						Reports to (parent)
					</label>
					<SearchableSelect
						id={`${uid}-parent`}
						value={parentId}
						onChange={setParentId}
						options={parentOpts}
						emptyOption="— top of chart —"
						placeholder="Top of chart"
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button type="submit" disabled={saving}>
					{saving ? "Saving…" : "Save"}
				</Button>
				<Button variant="secondary" onClick={onCancel}>
					Cancel
				</Button>
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

	const [busy, setBusy] = useState(false);

	async function save(v: FormValue, id?: number) {
		setBusy(true);
		try {
			if (id != null) await trpcClient.adminOrg.update.mutate({ id, ...v });
			else await trpcClient.adminOrg.create.mutate(v);
			setEditing(null);
			setAdding(undefined);
			await refresh();
			toast(id != null ? "Position saved." : "Position added.", "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusy(false);
		}
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
			try {
				await trpcClient.adminOrg.delete.mutate({ id });
				await refresh();
				toast(`Deleted ${node?.name ?? "the position"}.`, "success");
			} catch (e) {
				toast(saveErrorMessage(e), "error");
			}
		},
		[rows, refresh],
	);
	const onReparent = useCallback(
		async (childId: number, parentId: number) => {
			try {
				await trpcClient.adminOrg.reparent.mutate({ id: childId, parentId });
				await refresh();
			} catch (e) {
				// a refused reparent leaves the canvas showing the new line until the
				// refresh below puts the node back where the server still has it
				toast(saveErrorMessage(e), "error");
				await refresh();
			}
		},
		[refresh],
	);
	const onMovePosition = useCallback(
		async (id: number, x: number, y: number) => {
			try {
				await trpcClient.adminOrg.setPosition.mutate({ id, x, y });
			} catch (e) {
				toast(saveErrorMessage(e), "error");
				await refresh();
				return;
			}
			// keep local rows in sync so a later refresh/relayout respects the saved spot
			setRows((rs) =>
				rs.map((r) =>
					r.id === id ? { ...r, posX: Math.round(x), posY: Math.round(y) } : r,
				),
			);
		},
		[refresh],
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
	const closeModal = useCallback(() => {
		setEditing(null);
		setAdding(undefined);
	}, []);
	const modalHeadingId = useId();
	const panelRef = useModalPanel(closeModal, showModal);

	return (
		<div className="max-w-[1600px]">
			<PageHeader
				title="Organisation chart"
				description="Drag boxes to arrange them, drag from a box's bottom dot to another box's top dot to set who reports to whom, and use the buttons on each box. Scroll to zoom, drag the background to pan."
				breadcrumb={[
					{ label: "Admin", to: "/admin" },
					{ label: "Organisation chart" },
				]}
				actions={
					<Button
						data-tour="org-add"
						onClick={() => {
							setAdding(null);
							setEditing(null);
						}}
					>
						<Plus aria-hidden="true" className="size-4" />
						Add person
					</Button>
				}
			/>

			{loading || !mounted ? (
				<div className="h-[640px] rounded-xl border border-admin-border bg-admin-panel p-4">
					<output className="sr-only">Loading the chart…</output>
					<Skeleton className="mx-auto h-20 w-56" />
					<div className="mt-8 flex justify-center gap-6">
						<Skeleton className="h-20 w-56" />
						<Skeleton className="h-20 w-56" />
					</div>
				</div>
			) : rows.length === 0 ? (
				<div
					data-tour="org-canvas"
					className="grid h-[640px] place-items-center rounded-xl border border-dashed border-admin-border bg-admin-panel"
				>
					<EmptyState
						icon={<Network />}
						title="No one in the chart yet"
						description="Add the person at the top, then hang everyone else off them."
						action={
							<Button onClick={() => setAdding(null)}>
								<Plus aria-hidden="true" className="size-4" />
								Add the first person
							</Button>
						}
					/>
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
				<div className="fixed inset-0 z-[60] grid place-items-center bg-admin-ink/40 p-4 backdrop-blur-sm">
					<button
						type="button"
						aria-label="Close person editor"
						className="absolute inset-0 cursor-default"
						onClick={closeModal}
					/>
					<div
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						tabIndex={-1}
						aria-labelledby={modalHeadingId}
						className="relative w-full max-w-2xl rounded-xl border border-admin-border bg-admin-panel-raised p-6 shadow-[var(--shadow-lift)] focus:outline-none"
					>
						<h3
							id={modalHeadingId}
							className="mb-4 text-base font-semibold text-admin-ink"
						>
							{editing != null ? "Edit person" : "Add person"}
						</h3>
						<NodeForm
							rows={rows}
							people={people}
							initial={editingNode}
							fixedParent={adding ?? null}
							onSave={(v) => save(v, editing ?? undefined)}
							saving={busy}
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
