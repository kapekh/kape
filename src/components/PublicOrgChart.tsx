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

import { localizedHref } from "@/lib/i18n-config";
import { useLang } from "@/lib/i18n";
import { NavLink } from "./NavLink";

export type PublicOrgNode = {
	id: number;
	name: string;
	title: string;
	photoUrl: string | null;
	personSlug: string | null;
	posX: number | null;
	posY: number | null;
	children: PublicOrgNode[];
};

type NodeData = { node: PublicOrgNode; lang: string };

const NODE_W = 210;
const GAP_X = 40;
const GAP_Y = 140;

function autoLayout(roots: PublicOrgNode[]): Map<number, { x: number; y: number }> {
	const pos = new Map<number, { x: number; y: number }>();
	let cursor = 0;
	const place = (n: PublicOrgNode, depth: number) => {
		if (n.children.length === 0) {
			pos.set(n.id, { x: cursor, y: depth * GAP_Y });
			cursor += NODE_W + GAP_X;
			return;
		}
		for (const c of n.children) place(c, depth + 1);
		const first = pos.get(n.children[0].id)?.x ?? 0;
		const last = pos.get(n.children[n.children.length - 1].id)?.x ?? 0;
		pos.set(n.id, { x: (first + last) / 2, y: depth * GAP_Y });
	};
	for (const r of roots) place(r, 0);
	return pos;
}

function toFlow(roots: PublicOrgNode[], lang: string): { nodes: Node<NodeData>[]; edges: Edge[] } {
	const auto = autoLayout(roots);
	const nodes: Node<NodeData>[] = [];
	const edges: Edge[] = [];
	const walk = (n: PublicOrgNode, parentId: number | null) => {
		nodes.push({
			id: String(n.id),
			type: "orgPublic",
			position: n.posX != null && n.posY != null ? { x: n.posX, y: n.posY } : (auto.get(n.id) ?? { x: 0, y: 0 }),
			data: { node: n, lang },
			draggable: false,
		});
		if (parentId != null) edges.push({ id: `e${parentId}-${n.id}`, source: String(parentId), target: String(n.id), type: "smoothstep", style: { stroke: "var(--border)", strokeWidth: 2 } });
		for (const c of n.children) walk(c, n.id);
	};
	for (const r of roots) walk(r, null);
	return { nodes, edges };
}

const initials = (name: string) => String(name || "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("");

function OrgPublicNode({ data }: NodeProps<Node<NodeData>>) {
	const { node, lang } = data;
	const card = (
		<div className="w-[210px] rounded-2xl border border-border bg-card px-3 py-3 text-center shadow-[var(--shadow-soft)] transition group-hover:border-[var(--accent)]">
			{node.photoUrl ? (
				<img src={node.photoUrl} alt={node.name} className="mx-auto h-14 w-14 rounded-full object-cover ring-2 ring-card" />
			) : (
				<div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-base font-bold text-primary-foreground">{initials(node.name)}</div>
			)}
			<div className="mt-2 text-sm font-semibold text-primary">{node.name}</div>
			{node.title && <div className="text-xs text-muted-foreground">{node.title}</div>}
		</div>
	);
	return (
		<>
			<Handle type="target" position={Position.Top} className="!opacity-0" isConnectable={false} />
			{node.personSlug ? (
				<NavLink href={localizedHref(`/team/${node.personSlug}`, lang)} className="group block">{card}</NavLink>
			) : (
				<div className="group">{card}</div>
			)}
			<Handle type="source" position={Position.Bottom} className="!opacity-0" isConnectable={false} />
		</>
	);
}

const nodeTypes = { orgPublic: OrgPublicNode };

/** Read-only n8n-style canvas of the org chart for the public site. Client-only. */
export function PublicOrgChart({ roots }: { roots: PublicOrgNode[] }) {
	const { lang } = useLang();
	const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
	const [edges, setEdges] = useEdgesState<Edge>([]);

	useEffect(() => {
		const flow = toFlow(roots, lang);
		setNodes(flow.nodes);
		setEdges(flow.edges);
	}, [roots, lang, setNodes, setEdges]);

	return (
		<div className="h-[70vh] min-h-[520px] w-full overflow-hidden border-y border-border bg-muted/20">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				nodeTypes={nodeTypes}
				nodesDraggable={false}
				nodesConnectable={false}
				edgesFocusable={false}
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
