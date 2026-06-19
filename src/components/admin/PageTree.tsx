import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ActionMenu } from "./ActionMenu";

export type PageTreeRow = {
	id: number;
	slug: string;
	segment: string;
	parentId: number | null;
	sortOrder: number;
	status: string;
	title: string;
};

type Zone = "before" | "inside" | "after";
type Drop = { id: number; zone: Zone } | null;

/**
 * Notion-style page tree with native drag-and-drop. Drop ONTO a row's middle to
 * reparent (become its child); drop on the top/bottom edge to reorder as a sibling.
 */
export function PageTree({
	rows,
	onMove,
	onDelete,
}: {
	rows: PageTreeRow[];
	onMove: (id: number, parentId: number | null, index: number) => void;
	onDelete: (id: number) => void;
}) {
	const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
	const [dragId, setDragId] = useState<number | null>(null);
	const [drop, setDrop] = useState<Drop>(null);

	const childrenOf = useMemo(() => {
		const m = new Map<number | null, PageTreeRow[]>();
		for (const r of rows) {
			const k = r.parentId;
			(m.get(k) ?? m.set(k, []).get(k)!).push(r);
		}
		for (const list of m.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
		return m;
	}, [rows]);

	// Descendants of the dragged node — invalid drop targets (would orphan the subtree).
	const blocked = useMemo(() => {
		const set = new Set<number>();
		if (dragId == null) return set;
		set.add(dragId);
		const stack = [dragId];
		while (stack.length) for (const c of childrenOf.get(stack.pop()!) ?? []) { set.add(c.id); stack.push(c.id); }
		return set;
	}, [dragId, childrenOf]);

	function toggle(id: number) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	function handleDrop(target: PageTreeRow, zone: Zone) {
		if (dragId == null || blocked.has(target.id)) return;
		let parentId: number | null;
		let index: number;
		if (zone === "inside") {
			parentId = target.id;
			index = (childrenOf.get(target.id) ?? []).length;
		} else {
			parentId = target.parentId;
			const sibs = (childrenOf.get(target.parentId) ?? []).filter((s) => s.id !== dragId);
			const at = sibs.findIndex((s) => s.id === target.id);
			index = zone === "before" ? at : at + 1;
		}
		onMove(dragId, parentId, index);
		setDragId(null);
		setDrop(null);
	}

	function renderNodes(parentId: number | null, depth: number) {
		const list = childrenOf.get(parentId) ?? [];
		return list.map((r) => {
			const kids = childrenOf.get(r.id) ?? [];
			const isCollapsed = collapsed.has(r.id);
			const isBlocked = blocked.has(r.id);
			const ind = drop?.id === r.id ? drop.zone : null;
			return (
				<div key={r.id}>
					<div
						draggable
						onDragStart={() => setDragId(r.id)}
						onDragEnd={() => { setDragId(null); setDrop(null); }}
						onDragOver={(e) => {
							if (dragId == null || isBlocked) return;
							e.preventDefault();
							const rect = e.currentTarget.getBoundingClientRect();
							const y = (e.clientY - rect.top) / rect.height;
							const zone: Zone = y < 0.28 ? "before" : y > 0.72 ? "after" : "inside";
							setDrop({ id: r.id, zone });
						}}
						onDrop={(e) => { e.preventDefault(); if (ind) handleDrop(r, ind); }}
						className={`group/row relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${isBlocked ? "opacity-40" : ""} ${ind === "inside" ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/50" : ""}`}
						style={{ paddingLeft: depth * 18 + 8 }}
					>
						{ind === "before" && <span className="pointer-events-none absolute inset-x-2 -top-px h-0.5 rounded bg-[var(--accent)]" style={{ left: depth * 18 + 8 }} />}
						{ind === "after" && <span className="pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded bg-[var(--accent)]" style={{ left: depth * 18 + 8 }} />}

						<span className="cursor-grab text-muted-foreground/40 group-hover/row:text-muted-foreground" title="Drag to move">⋮⋮</span>
						{kids.length > 0 ? (
							<button type="button" onClick={() => toggle(r.id)} className="grid h-4 w-4 place-items-center text-muted-foreground hover:text-foreground" aria-label={isCollapsed ? "Expand" : "Collapse"}>
								<span className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▸</span>
							</button>
						) : (
							<span className="inline-block h-4 w-4" />
						)}

						<Link to="/admin/pages/$id" params={{ id: String(r.id) }} className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-[var(--accent)]">
							{r.title}
							<span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground/70">/{r.slug}</span>
						</Link>

						{kids.length > 0 && <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{kids.length}</span>}
						{r.status !== "published" && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{r.status}</span>}

						<span className="opacity-0 transition-opacity group-hover/row:opacity-100">
							<ActionMenu items={[{ label: "Delete", danger: true, onClick: () => onDelete(r.id) }]} />
						</span>
					</div>
					{kids.length > 0 && !isCollapsed && renderNodes(r.id, depth + 1)}
				</div>
			);
		});
	}

	return <div className="select-none">{renderNodes(null, 0)}</div>;
}
