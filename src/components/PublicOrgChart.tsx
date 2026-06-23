import {
	Background,
	Controls,
	type Edge,
	Handle,
	MiniMap,
	type Node,
	type NodeProps,
	Panel,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesInitialized,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";

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
const GAP_X = 64;
const GAP_Y = 210;

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
	// Anchor metadata: horizontal centre of the first root + the tree's x-extent.
	const xs = nodes.map((n) => n.position.x);
	const rootNode = nodes.find((n) => n.id === String(roots[0]?.id));
	const rootX = rootNode ? rootNode.position.x : 0;
	return { nodes, edges, rootX, minX: Math.min(...xs, rootX), maxX: Math.max(...xs, rootX) };
}

const initials = (name: string) => String(name || "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("");

function OrgPublicNode({ data }: NodeProps<Node<NodeData>>) {
	const { node, lang } = data;
	const card = (
		<div className="w-[210px] text-center">
			{node.photoUrl ? (
				<img src={node.photoUrl} alt={node.name} className="mx-auto h-24 w-24 rounded-full object-cover shadow-[var(--shadow-lift)] ring-4 ring-card transition group-hover:scale-105" />
			) : (
				<div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-2xl font-bold text-primary-foreground shadow-[var(--shadow-lift)] ring-4 ring-card transition group-hover:scale-105">{initials(node.name)}</div>
			)}
			<div className="mt-3 text-sm font-semibold text-primary">{node.name}</div>
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

// Render *asterisk-wrapped* segments of a title as accent-coloured text.
const renderTitle = (t: string) =>
	String(t)
		.split(/(\*[^*]+\*)/g)
		.map((seg, i) => (seg.startsWith("*") && seg.endsWith("*") ? <em key={i} className="not-italic text-[var(--secondary)]">{seg.slice(1, -1)}</em> : seg));

function OrgFlow({ roots, eyebrow, title }: { roots: PublicOrgNode[]; eyebrow?: string; title?: string }) {
	const { lang } = useLang();
	const flow = useMemo(() => toFlow(roots, lang), [roots, lang]);
	const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(flow.nodes);
	const [edges, setEdges] = useEdgesState<Edge>(flow.edges);
	const rf = useReactFlow();
	const inited = useNodesInitialized();

	useEffect(() => {
		setNodes(flow.nodes);
		setEdges(flow.edges);
	}, [flow, setNodes, setEdges]);

	// Once nodes are measured: fit the tree, then slide the view horizontally so the
	// ROOT node (not the bounding-box centre) sits at the centre of the screen.
	useEffect(() => {
		if (!inited) return;
		rf.fitView({ padding: 0.25 });
		const raf = requestAnimationFrame(() => {
			const vp = rf.getViewport();
			const shift = ((flow.minX + flow.maxX) / 2 - flow.rootX) * vp.zoom;
			rf.setViewport({ x: vp.x + shift, y: vp.y, zoom: vp.zoom });
		});
		return () => cancelAnimationFrame(raf);
	}, [inited, flow, rf]);

	return (
		<div className="h-[calc(100dvh-7rem)] min-h-[600px] w-full overflow-hidden border-y border-border bg-muted/20">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				nodeTypes={nodeTypes}
				nodesDraggable={false}
				nodesConnectable={false}
				edgesFocusable={false}
				minZoom={0.2}
				proOptions={{ hideAttribution: true }}
			>
				{(eyebrow || title) && (
					<Panel position="top-center" className="!mt-6 text-center">
						{eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</div>}
						{title && <h2 className="mt-1 font-display text-3xl md:text-4xl font-semibold tracking-tight text-primary">{renderTitle(title)}</h2>}
					</Panel>
				)}
				<Background gap={18} color="var(--border)" />
				<Controls showInteractive={false} />
				<MiniMap pannable zoomable className="!bg-card" nodeColor="var(--accent)" />
			</ReactFlow>
		</div>
	);
}

/** Read-only n8n-style canvas of the org chart for the public site. Client-only. */
export function PublicOrgChart(props: { roots: PublicOrgNode[]; eyebrow?: string; title?: string }) {
	return (
		<ReactFlowProvider>
			<OrgFlow {...props} />
		</ReactFlowProvider>
	);
}
