import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { FormSection, fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { SearchableSelect } from "#/components/admin/SearchableSelect";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/org-chart")({ component: OrgChartAdmin });

type OrgRow = Awaited<ReturnType<typeof trpcClient.adminOrg.list.query>>[number];
type OrgNode = OrgRow & { children: OrgNode[] };
type PersonOpt = { value: string; label: string };

function buildTree(rows: OrgRow[]): OrgNode[] {
	const byId = new Map<number, OrgNode>();
	for (const r of rows) byId.set(r.id, { ...r, children: [] });
	const roots: OrgNode[] = [];
	for (const r of rows) {
		const node = byId.get(r.id) as OrgNode;
		if (r.parentId != null && byId.has(r.parentId)) byId.get(r.parentId)?.children.push(node);
		else roots.push(node);
	}
	return roots;
}

/** Collect a node's id + all descendant ids (so they can't be picked as its own parent). */
function withDescendants(rows: OrgRow[], id: number): Set<number> {
	const out = new Set<number>([id]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const r of rows) if (r.parentId != null && out.has(r.parentId) && !out.has(r.id)) { out.add(r.id); grew = true; }
	}
	return out;
}

type FormValue = { parentId: number | null; name: string; title: string | null; personId: number | null };

function NodeForm({ rows, people, initial, fixedParent, onSave, onCancel }: { rows: OrgRow[]; people: PersonOpt[]; initial?: OrgRow; fixedParent?: number | null; onSave: (v: FormValue) => void; onCancel: () => void }) {
	const [name, setName] = useState(initial?.name ?? "");
	const [title, setTitle] = useState(initial?.title ?? "");
	const [personId, setPersonId] = useState(initial?.personId != null ? String(initial.personId) : "");
	const [parentId, setParentId] = useState(initial?.parentId != null ? String(initial.parentId) : fixedParent != null ? String(fixedParent) : "");

	// Parent options exclude the node itself and its descendants (no cycles).
	const blocked = initial ? withDescendants(rows, initial.id) : new Set<number>();
	const parentOpts = rows.filter((r) => !blocked.has(r.id)).map((r) => ({ value: String(r.id), label: r.name + (r.title ? ` — ${r.title}` : "") }));

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		onSave({ parentId: parentId ? Number(parentId) : null, name: name.trim(), title: title.trim() || null, personId: personId ? Number(personId) : null });
	}

	return (
		<form onSubmit={submit} className="my-2 rounded-xl border border-(--accent)/40 bg-(--accent)/5 p-3 space-y-3">
			<div className="grid gap-3 sm:grid-cols-2">
				<div>
					<label className={fieldLabel}>Name</label>
					<input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Executive Director" required />
				</div>
				<div>
					<label className={fieldLabel}>Title / role</label>
					<input className={fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Director of Programs" />
				</div>
				<div>
					<label className={fieldLabel}>Link to team member (optional — for photo + profile link)</label>
					<SearchableSelect value={personId} onChange={setPersonId} options={people} emptyOption="— none —" placeholder="Pick a person…" />
				</div>
				<div>
					<label className={fieldLabel}>Reports to (parent)</label>
					<SearchableSelect value={parentId} onChange={setParentId} options={parentOpts} emptyOption="— top of chart —" placeholder="Top of chart" />
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button type="submit" className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:opacity-90">Save</button>
				<button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
			</div>
		</form>
	);
}

function OrgChartAdmin() {
	const [rows, setRows] = useState<OrgRow[]>([]);
	const [people, setPeople] = useState<PersonOpt[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<number | null>(null);
	const [adding, setAdding] = useState<number | null | undefined>(undefined); // parentId for new node; undefined = closed

	async function refresh() {
		const [n, posts] = await Promise.all([trpcClient.adminOrg.list.query(), trpcClient.adminPosts.list.query()]);
		setRows(n);
		setPeople(posts.filter((p) => p.contentType === "person").map((p) => ({ value: String(p.id), label: p.title })));
		setLoading(false);
	}
	useEffect(() => {
		refresh().catch(() => setLoading(false));
	}, []);

	async function save(v: FormValue, id?: number) {
		if (id != null) await trpcClient.adminOrg.update.mutate({ id, ...v });
		else await trpcClient.adminOrg.create.mutate(v);
		setEditing(null);
		setAdding(undefined);
		await refresh();
	}
	async function del(node: OrgNode) {
		const extra = node.children.length ? ` and its ${node.children.length} report(s)` : "";
		if (!window.confirm(`Delete “${node.name}”${extra}? This cannot be undone.`)) return;
		await trpcClient.adminOrg.delete.mutate({ id: node.id });
		await refresh();
	}
	async function move(id: number, dir: "up" | "down") {
		await trpcClient.adminOrg.move.mutate({ id, dir });
		await refresh();
	}

	const tree = buildTree(rows);

	function Row({ node, depth }: { node: OrgNode; depth: number }) {
		return (
			<div>
				<div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50" style={{ paddingLeft: 8 + depth * 22 }}>
					<span className="text-muted-foreground/50">{node.children.length ? "▸" : "•"}</span>
					<span className="font-medium text-foreground">{node.name}</span>
					{node.title && <span className="text-xs text-muted-foreground">{node.title}</span>}
					{node.personId != null && <span className="rounded-full bg-(--palm)/10 px-2 py-0.5 text-[10px] font-medium text-(--palm)">linked</span>}
					<div className="ml-auto flex items-center gap-1">
						<button type="button" onClick={() => move(node.id, "up")} className="rounded px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Move up">↑</button>
						<button type="button" onClick={() => move(node.id, "down")} className="rounded px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Move down">↓</button>
						<button type="button" onClick={() => { setAdding(node.id); setEditing(null); }} className="rounded px-2 text-xs font-medium text-(--accent) hover:bg-(--accent)/10">+ Report</button>
						<button type="button" onClick={() => { setEditing(node.id); setAdding(undefined); }} className="rounded px-2 text-xs font-medium text-foreground/70 hover:bg-muted">Edit</button>
						<button type="button" onClick={() => del(node)} className="rounded px-2 text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button>
					</div>
				</div>
				<div style={{ paddingLeft: 8 + depth * 22 }}>
					{editing === node.id && <NodeForm rows={rows} people={people} initial={node} onSave={(v) => save(v, node.id)} onCancel={() => setEditing(null)} />}
					{adding === node.id && <NodeForm rows={rows} people={people} fixedParent={node.id} onSave={(v) => save(v)} onCancel={() => setAdding(undefined)} />}
				</div>
				{node.children.map((c) => <Row key={c.id} node={c} depth={depth + 1} />)}
			</div>
		);
	}

	return (
		<div className="max-w-4xl">
			<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">Organizational Chart</h1>
					<p className="mt-1 text-sm text-muted-foreground">Build the management hierarchy shown on the Leadership page. Add a person, set who they report to, and reorder with ↑ ↓. Link a node to a team member to pull their photo and profile.</p>
				</div>
				<button type="button" onClick={() => { setAdding(null); setEditing(null); }} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90">+ Top-level node</button>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : (
				<FormSection title="Hierarchy" description="The tree mirrors the live org chart, top to bottom.">
					{adding === null && <NodeForm rows={rows} people={people} fixedParent={null} onSave={(v) => save(v)} onCancel={() => setAdding(undefined)} />}
					{tree.length === 0 && adding !== null ? (
						<p className="py-6 text-center text-sm text-muted-foreground">No nodes yet — add a top-level node to start the chart.</p>
					) : (
						<div className="space-y-0.5">{tree.map((n) => <Row key={n.id} node={n} depth={0} />)}</div>
					)}
				</FormSection>
			)}
		</div>
	);
}
