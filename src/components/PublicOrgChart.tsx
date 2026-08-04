import {
	Background,
	type Edge,
	Handle,
	type Node,
	type NodeProps,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesInitialized,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { localizedHref } from "@/lib/i18n-config";
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

function autoLayout(
	roots: PublicOrgNode[],
): Map<number, { x: number; y: number }> {
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

const NODE_H = 150; // approx node height (avatar + name + title) for layout math

function toFlow(roots: PublicOrgNode[], lang: string) {
	const auto = autoLayout(roots);
	const nodes: Node<NodeData>[] = [];
	const edges: Edge[] = [];
	const walk = (n: PublicOrgNode, parentId: number | null) => {
		nodes.push({
			id: String(n.id),
			type: "orgPublic",
			position:
				n.posX != null && n.posY != null
					? { x: n.posX, y: n.posY }
					: (auto.get(n.id) ?? { x: 0, y: 0 }),
			data: { node: n, lang },
			draggable: false,
		});
		if (parentId != null)
			edges.push({
				id: `e${parentId}-${n.id}`,
				source: String(parentId),
				target: String(n.id),
				type: "smoothstep",
				style: { stroke: "var(--border)", strokeWidth: 2 },
			});
		for (const c of n.children) walk(c, n.id);
	};
	for (const r of roots) walk(r, null);
	// Anchor metadata: the first root's position + the tree's full extent.
	const xs = nodes.map((n) => n.position.x);
	const ys = nodes.map((n) => n.position.y);
	const rootNode = nodes.find((n) => n.id === String(roots[0]?.id));
	const rootX = rootNode ? rootNode.position.x : 0;
	return {
		nodes,
		edges,
		rootX,
		minX: Math.min(rootX, ...xs),
		maxX: Math.max(rootX, ...xs),
		minY: Math.min(0, ...ys),
		maxY: Math.max(0, ...ys),
	};
}

const initials = (name: string) =>
	String(name || "")
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0])
		.join("");

function OrgPublicNode({ data }: NodeProps<Node<NodeData>>) {
	const { node, lang } = data;
	const card = (
		<div className="w-[210px] text-center">
			{node.photoUrl ? (
				<img
					src={node.photoUrl}
					alt={node.name}
					className="mx-auto h-24 w-24 rounded-full object-cover shadow-[var(--shadow-lift)] ring-4 ring-card transition group-hover:scale-105"
				/>
			) : (
				<div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-2xl font-bold text-primary-foreground shadow-[var(--shadow-lift)] ring-4 ring-card transition group-hover:scale-105">
					{initials(node.name)}
				</div>
			)}
			<div className="mt-3 text-sm font-semibold text-primary">{node.name}</div>
			{node.title && (
				<div className="text-xs text-muted-foreground">{node.title}</div>
			)}
		</div>
	);
	return (
		<>
			<Handle
				type="target"
				position={Position.Top}
				className="!opacity-0"
				isConnectable={false}
			/>
			{node.personSlug ? (
				<NavLink
					href={localizedHref(`/team/${node.personSlug}`, lang)}
					className="group block"
				>
					{card}
				</NavLink>
			) : (
				<div className="group">{card}</div>
			)}
			<Handle
				type="source"
				position={Position.Bottom}
				className="!opacity-0"
				isConnectable={false}
			/>
		</>
	);
}

const nodeTypes = { orgPublic: OrgPublicNode };

// Render *asterisk-wrapped* segments of a title as accent-coloured text.
const renderTitle = (t: string) =>
	String(t)
		.split(/(\*[^*]+\*)/g)
		.map((seg, i) =>
			seg.startsWith("*") && seg.endsWith("*") ? (
				<em key={i} className="not-italic text-[var(--secondary)]">
					{seg.slice(1, -1)}
				</em>
			) : (
				seg
			),
		);

function OrgFlow({
	roots,
	eyebrow,
	title,
}: {
	roots: PublicOrgNode[];
	eyebrow?: string;
	title?: string;
}) {
	const { lang } = useLang();
	const flow = useMemo(() => toFlow(roots, lang), [roots, lang]);
	const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(
		flow.nodes,
	);
	const [edges, setEdges] = useEdgesState<Edge>(flow.edges);
	const rf = useReactFlow();
	const inited = useNodesInitialized();
	const wrapRef = useRef<HTMLDivElement>(null);
	// Hide the canvas until the viewport is positioned, so the move is never seen.
	const [ready, setReady] = useState(false);
	// The canvas grows to hold the whole tree, so the *page* scrolls — not the canvas.
	const [height, setHeight] = useState(640);

	useEffect(() => {
		setNodes(flow.nodes);
		setEdges(flow.edges);
		setReady(false);
	}, [flow, setNodes, setEdges]);

	// Once nodes are measured: scale the tree to fit the available WIDTH (never upscale
	// past 1:1), grow the container to the tree's full height so everyone is visible on
	// a normal page scroll, and place the root centred under the heading — one move.
	useEffect(() => {
		if (!inited || ready || !wrapRef.current) return;
		const W = wrapRef.current.clientWidth;
		const TOP = 104; // space reserved for the heading
		// Tighter side padding on narrow screens so a wide tree has room to fit.
		const PAD = W < 480 ? 12 : 56; // side + bottom breathing room
		const treeW = flow.maxX - flow.minX + NODE_W;
		const treeH = flow.maxY - flow.minY + NODE_H;
		// Floor matches ReactFlow's own minZoom: always scale a wide tree DOWN to fit the
		// container width (never force it larger than fits, which clips edge nodes on mobile).
		const zoom = Math.max(0.2, Math.min(1, (W - 2 * PAD) / treeW));
		setHeight(Math.round(TOP + treeH * zoom + PAD));
		const rootCenterX = flow.rootX + NODE_W / 2;
		// Prefer the root centred under the heading, but clamp so the whole tree stays within
		// the container width. A lopsided tree's root isn't its horizontal midpoint, so pure
		// root-centring pushes the far branch off-screen and clips edge nodes on narrow screens.
		const minVx = -flow.minX * zoom; // tree's left edge flush to x=0
		const maxVx = W - (flow.maxX + NODE_W) * zoom; // tree's right edge flush to W
		const idealVx = W / 2 - rootCenterX * zoom;
		const vx =
			maxVx >= minVx ? Math.min(maxVx, Math.max(minVx, idealVx)) : idealVx;
		rf.setViewport({ x: vx, y: TOP - flow.minY * zoom, zoom });
		setReady(true);
	}, [inited, ready, flow, rf]);

	return (
		<div
			ref={wrapRef}
			style={{ height }}
			className={`relative min-h-[600px] w-full overflow-hidden bg-muted/20 transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
		>
			{/* Heading as a full-width, text-centred overlay — its position never depends
			    on its own width, so it can't shift sideways when the display font loads. */}
			{(eyebrow || title) && (
				<div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-6 text-center">
					{eyebrow && (
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
							{eyebrow}
						</div>
					)}
					{title && (
						<h2 className="mt-1 font-display text-3xl md:text-4xl font-semibold tracking-tight text-primary">
							{renderTitle(title)}
						</h2>
					)}
				</div>
			)}
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				nodeTypes={nodeTypes}
				nodesDraggable={false}
				nodesConnectable={false}
				edgesFocusable={false}
				elementsSelectable={false}
				// Static diagram: no in-canvas pan/zoom, so the wheel/touch scrolls the PAGE.
				zoomOnScroll={false}
				zoomOnPinch={false}
				zoomOnDoubleClick={false}
				panOnScroll={false}
				panOnDrag={false}
				preventScrolling={false}
				minZoom={0.2}
				proOptions={{ hideAttribution: true }}
			>
				<Background gap={18} color="var(--border)" />
			</ReactFlow>
		</div>
	);
}

/** Read-only n8n-style canvas of the org chart for the public site. Client-only. */
export function PublicOrgChart(props: {
	roots: PublicOrgNode[];
	eyebrow?: string;
	title?: string;
}) {
	return (
		<ReactFlowProvider>
			<OrgFlow {...props} />
		</ReactFlowProvider>
	);
}
