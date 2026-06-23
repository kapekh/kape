import {
	Background,
	Controls,
	type Edge,
	Handle,
	MiniMap,
	type Node,
	type NodeProps,
	Position,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect } from "react";

export type OrgRow = {
	id: number;
	parentId: number | null;
	name: string;
	title: string | null;
	personId: number | null;
	sort: number;
	posX: number | null;
	posY: number | null;
};

type NodeData = {
	row: OrgRow;
	onEdit: (id: number) => void;
	onAddChild: (parentId: number) => void;
	onDelete: (id: number) => void;
};

const NODE_W = 210;
const GAP_X = 40;
const GAP_Y = 130;

/** Tidy top-down tree layout for nodes that don't have a saved position. */
function autoLayout(rows: OrgRow[]): Map<number, { x: number; y: number }> {
	const byId = new Map(rows.map((r) => [r.id, r]));
	const kidsOf = new Map<number, OrgRow[]>();
	const roots: OrgRow[] = [];
	for (const r of [...rows].sort((a, b) => a.sort - b.sort)) {
		if (r.parentId != null && byId.has(r.parentId)) {
			const list = kidsOf.get(r.parentId) ?? [];
			list.push(r);
			kidsOf.set(r.parentId, list);
		} else {
			roots.push(r);
		}
	}
	const pos = new Map<number, { x: number; y: number }>();
	let cursor = 0;
	const place = (node: OrgRow, depth: number) => {
		const kids = kidsOf.get(node.id) ?? [];
		if (kids.length === 0) {
			pos.set(node.id, { x: cursor, y: depth * GAP_Y });
			cursor += NODE_W + GAP_X;
			return;
		}
		for (const k of kids) place(k, depth + 1);
		const first = pos.get(kids[0].id)?.x ?? 0;
		const last = pos.get(kids[kids.length - 1].id)?.x ?? 0;
		pos.set(node.id, { x: (first + last) / 2, y: depth * GAP_Y });
	};
	for (const r of roots) place(r, 0);
	return pos;
}

function rowsToFlow(rows: OrgRow[], handlers: Omit<NodeData, "row">): { nodes: Node<NodeData>[]; edges: Edge[] } {
	const auto = autoLayout(rows);
	const nodes: Node<NodeData>[] = rows.map((r) => ({
		id: String(r.id),
		type: "org",
		position: r.posX != null && r.posY != null ? { x: r.posX, y: r.posY } : (auto.get(r.id) ?? { x: 0, y: 0 }),
		data: { row: r, ...handlers },
	}));
	const edges: Edge[] = rows
		.filter((r) => r.parentId != null)
		.map((r) => ({ id: `e${r.parentId}-${r.id}`, source: String(r.parentId), target: String(r.id), type: "smoothstep", style: { stroke: "var(--border)", strokeWidth: 2 } }));
	return { nodes, edges };
}

/** A single org node card on the canvas. Buttons are `nodrag` so they don't start a drag. */
function OrgFlowNode({ data }: NodeProps<Node<NodeData>>) {
	const { row, onEdit, onAddChild, onDelete } = data;
	return (
		<div className="w-[210px] rounded-2xl border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-soft)] text-center">
			<Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-[var(--accent)] !border-0" />
			<div className="flex items-center justify-center gap-1.5">
				{row.personId != null && <span className="h-2 w-2 rounded-full bg-[var(--palm)]" title="Linked to a team member" />}
				<span className="truncate text-sm font-semibold text-primary">{row.name}</span>
			</div>
			{row.title && <div className="mt-0.5 truncate text-xs text-muted-foreground">{row.title}</div>}
			<div className="nodrag mt-2 flex items-center justify-center gap-1 border-t border-border pt-1.5">
				<button type="button" title="Add report" onClick={() => onAddChild(row.id)} className="rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10">＋</button>
				<button type="button" title="Edit" onClick={() => onEdit(row.id)} className="rounded px-1.5 py-0.5 text-xs text-foreground/70 hover:bg-muted">✎</button>
				<button type="button" title="Delete" onClick={() => onDelete(row.id)} className="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10">✕</button>
			</div>
			<Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-[var(--accent)] !border-0" />
		</div>
	);
}

const nodeTypes = { org: OrgFlowNode };

export function OrgCanvas({
	rows,
	onEdit,
	onAddChild,
	onDelete,
	onReparent,
	onMovePosition,
}: {
	rows: OrgRow[];
	onEdit: (id: number) => void;
	onAddChild: (parentId: number) => void;
	onDelete: (id: number) => void;
	onReparent: (childId: number, parentId: number) => void;
	onMovePosition: (id: number, x: number, y: number) => void;
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

	// Rebuild the graph whenever the underlying rows change (after a save/refresh).
	useEffect(() => {
		const flow = rowsToFlow(rows, { onEdit, onAddChild, onDelete });
		setNodes(flow.nodes);
		setEdges(flow.edges);
	}, [rows, onEdit, onAddChild, onDelete, setNodes, setEdges]);

	return (
		<div className="h-[640px] w-full overflow-hidden rounded-2xl border border-border bg-muted/20">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				// Dragging a connection from a parent's bottom handle to a child's top handle re-parents.
				onConnect={(c) => { if (c.source && c.target) onReparent(Number(c.target), Number(c.source)); }}
				onNodeDragStop={(_e, node) => onMovePosition(Number(node.id), node.position.x, node.position.y)}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				minZoom={0.2}
				proOptions={{ hideAttribution: true }}
			>
				<Background gap={18} color="var(--border)" />
				<Controls showInteractive={false} />
				<MiniMap pannable zoomable className="!bg-card" nodeColor="var(--accent)" />
			</ReactFlow>
		</div>
	);
}
