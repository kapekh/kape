import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { LangOpt } from "#/components/admin/PostForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/nav")({
	component: NavBuilder,
});

type NavRow = Awaited<ReturnType<typeof trpcClient.adminNav.list.query>>[number];
type NavNode = NavRow & { children: NavNode[] };

type NavTargetKind = "none" | "page" | "post_list" | "view" | "url" | "post";
type FormValue = {
	targetKind: NavTargetKind;
	targetRef: string;
	visible: boolean;
	labels: Record<string, string>;
};

const TARGET_KINDS: NavTargetKind[] = ["none", "page", "post_list", "view", "url", "post"];

function buildTree(items: NavRow[]): NavNode[] {
	const byId = new Map<number, NavNode>();
	for (const i of items) byId.set(i.id, { ...i, children: [] });
	const roots: NavNode[] = [];
	for (const i of items) {
		const node = byId.get(i.id)!;
		if (i.parentId != null && byId.has(i.parentId)) byId.get(i.parentId)!.children.push(node);
		else roots.push(node);
	}
	const sortRec = (ns: NavNode[]) => {
		ns.sort((a, b) => a.sort - b.sort);
		for (const n of ns) sortRec(n.children);
	};
	sortRec(roots);
	return roots;
}

const inp = "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm";

function NavItemForm({
	initial,
	languages,
	onSave,
	onCancel,
}: {
	initial?: FormValue;
	languages: LangOpt[];
	onSave: (v: FormValue) => void;
	onCancel: () => void;
}) {
	const [targetKind, setTargetKind] = useState<NavTargetKind>(initial?.targetKind ?? "none");
	const [targetRef, setTargetRef] = useState(initial?.targetRef ?? "");
	const [visible, setVisible] = useState(initial?.visible ?? true);
	const [labels, setLabels] = useState<Record<string, string>>(() => {
		const o: Record<string, string> = {};
		for (const l of languages) o[l.code] = initial?.labels[l.code] ?? "";
		return o;
	});

	return (
		<div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-3 my-2 space-y-2">
			<div className="flex flex-wrap gap-2">
				{languages.map((l) => (
					<input
						key={l.code}
						className={inp}
						placeholder={`Label (${l.code})`}
						value={labels[l.code] ?? ""}
						onChange={(e) => setLabels((p) => ({ ...p, [l.code]: e.target.value }))}
					/>
				))}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<select className={inp} value={targetKind} onChange={(e) => setTargetKind(e.target.value as NavTargetKind)}>
					{TARGET_KINDS.map((k) => (
						<option key={k} value={k}>{k}</option>
					))}
				</select>
				<input
					className={`${inp} flex-1 min-w-[200px]`}
					placeholder="target (page slug, URL, post type…)"
					value={targetRef}
					onChange={(e) => setTargetRef(e.target.value)}
				/>
				<label className="flex items-center gap-1 text-sm">
					<input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> visible
				</label>
				<button type="button" onClick={() => onSave({ targetKind, targetRef, visible, labels })} className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold">Save</button>
				<button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-1.5 text-sm">Cancel</button>
			</div>
		</div>
	);
}

function NavBuilder() {
	const [items, setItems] = useState<NavRow[]>([]);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<number | null>(null);
	const [addingParent, setAddingParent] = useState<number | null | undefined>(undefined); // undefined=closed, null=root

	async function refresh() {
		const [it, l] = await Promise.all([
			trpcClient.adminNav.list.query(),
			trpcClient.i18n.languages.query(),
		]);
		setItems(it);
		setLangs(l);
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function create(parentId: number | null, v: FormValue) {
		await trpcClient.adminNav.create.mutate({ parentId, ...v });
		setAddingParent(undefined);
		await refresh();
	}
	async function update(id: number, v: FormValue) {
		await trpcClient.adminNav.update.mutate({ id, ...v });
		setEditing(null);
		await refresh();
	}
	async function del(id: number) {
		if (!window.confirm("Delete this item and all its children?")) return;
		await trpcClient.adminNav.delete.mutate({ id });
		await refresh();
	}
	async function move(id: number, dir: "up" | "down") {
		await trpcClient.adminNav.move.mutate({ id, dir });
		await refresh();
	}

	function renderNode(node: NavNode, depth: number) {
		const label = node.labels.en ?? Object.values(node.labels)[0] ?? "(no label)";
		const btn = "text-xs rounded border border-border px-1.5 py-0.5 hover:bg-muted";
		return (
			<div key={node.id} style={{ marginLeft: depth * 20 }}>
				<div className={`flex flex-wrap items-center gap-2 py-1.5 border-b border-border/60 ${node.visible ? "" : "opacity-50"}`}>
					<span className="font-medium text-foreground">{label}</span>
					<span className="text-xs text-muted-foreground">{node.targetKind}{node.targetRef ? `: ${node.targetRef}` : ""}</span>
					<div className="ml-auto flex gap-1">
						<button type="button" className={btn} onClick={() => move(node.id, "up")}>↑</button>
						<button type="button" className={btn} onClick={() => move(node.id, "down")}>↓</button>
						<button type="button" className={btn} onClick={() => setAddingParent(node.id)}>+ child</button>
						<button type="button" className={btn} onClick={() => setEditing(editing === node.id ? null : node.id)}>edit</button>
						<button type="button" className={`${btn} text-destructive`} onClick={() => del(node.id)}>del</button>
					</div>
				</div>
				{editing === node.id && (
					<NavItemForm
						languages={langs}
						initial={{ targetKind: node.targetKind as NavTargetKind, targetRef: node.targetRef, visible: node.visible, labels: node.labels }}
						onSave={(v) => update(node.id, v)}
						onCancel={() => setEditing(null)}
					/>
				)}
				{addingParent === node.id && (
					<NavItemForm languages={langs} onSave={(v) => create(node.id, v)} onCancel={() => setAddingParent(undefined)} />
				)}
				{node.children.map((c) => renderNode(c, depth + 1))}
			</div>
		);
	}

	if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
	const tree = buildTree(items);

	return (
		<div className="max-w-3xl">
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-2xl font-semibold text-primary">Navigation</h1>
				<button type="button" onClick={() => setAddingParent(null)} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90">
					+ Top-level item
				</button>
			</div>
			<p className="text-sm text-muted-foreground mb-4">
				Build the site menu. <code>none</code> = label-only dropdown; <code>page</code>/<code>url</code> link out; reorder with ↑↓; add nested items with “+ child”.
			</p>
			{addingParent === null && (
				<NavItemForm languages={langs} onSave={(v) => create(null, v)} onCancel={() => setAddingParent(undefined)} />
			)}
			<div className="rounded-xl border border-border bg-card p-4">
				{tree.length === 0 ? <p className="text-sm text-muted-foreground">No nav items.</p> : tree.map((n) => renderNode(n, 0))}
			</div>
		</div>
	);
}
