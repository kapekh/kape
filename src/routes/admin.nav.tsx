import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import type { LangOpt } from "#/components/admin/PostForm";
import { SearchableSelect } from "#/components/admin/SearchableSelect";
import { useDirty } from "#/components/admin/useDirty";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { confirm } from "@/components/Dialogs";

/** The non-menu header bits (donate button + top-bar links), backed by site_settings. */
function HeaderSettings() {
	const FIELDS = [
		{ key: "header_donate_label", label: "Donate button label" },
		{ key: "header_donate_link", label: "Donate button link", mono: true },
		{ key: "header_search_link", label: "Top-bar “Search” link", mono: true },
		{ key: "header_sitemap_link", label: "Top-bar “Sitemap” link", mono: true },
	];
	const [vals, setVals] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		trpcClient.adminSettings.list.query().then((rows) => {
			const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
			const next: Record<string, string> = {};
			for (const f of FIELDS)
				next[f.key] = map[f.key] ?? HEADER_DEFAULTS[f.key] ?? "";
			setVals(next);
			setLoading(false);
		});
	}, []);

	async function save() {
		setSaving(true);
		await Promise.all(
			Object.entries(vals).map(([key, value]) =>
				trpcClient.adminSettings.set.mutate({ key, value }),
			),
		);
		setSaving(false);
		setSavedAt(new Date().toLocaleTimeString());
	}

	const dirty = useDirty(JSON.stringify(vals), savedAt);

	return (
		<FormSection
			title="Header settings"
			description="The donate button and the top-bar utility links. A site path (/…) or full URL; “#donate” jumps to an on-page anchor."
		>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : (
				<>
					<div className="grid sm:grid-cols-2 gap-4">
						{FIELDS.map((f) => (
							<div key={f.key}>
								<label className={fieldLabel}>{f.label}</label>
								<input
									className={`${fieldInput} ${f.mono ? "font-mono text-xs" : ""}`}
									value={vals[f.key] ?? ""}
									onChange={(e) =>
										setVals((o) => ({ ...o, [f.key]: e.target.value }))
									}
								/>
							</div>
						))}
					</div>
					<div className="mt-4 flex items-center gap-3">
						<button
							type="button"
							onClick={save}
							disabled={saving || !dirty}
							className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
						>
							{saving ? "Saving…" : "Save header settings"}
						</button>
						{savedAt && (
							<span className="text-xs text-(--palm)">Saved {savedAt}</span>
						)}
					</div>
				</>
			)}
		</FormSection>
	);
}

type RefOpt = { slug: string; title: string; contentType?: string };

export const Route = createFileRoute("/admin/nav")({
	component: NavBuilder,
});

type NavRow = Awaited<
	ReturnType<typeof trpcClient.adminNav.list.query>
>[number];
type NavNode = NavRow & { children: NavNode[] };

type NavTargetKind = "none" | "page" | "post_list" | "view" | "url" | "post";
type FormValue = {
	targetKind: NavTargetKind;
	targetRef: string;
	visible: boolean;
	imageMediaId: number | null;
	labels: Record<string, string>;
	descriptions: Record<string, string>;
};

const TARGET_KINDS: NavTargetKind[] = ["page", "post", "url"];

function buildTree(items: NavRow[]): NavNode[] {
	const byId = new Map<number, NavNode>();
	for (const i of items) byId.set(i.id, { ...i, children: [] });
	const roots: NavNode[] = [];
	for (const i of items) {
		const node = byId.get(i.id)!;
		if (i.parentId != null && byId.has(i.parentId))
			byId.get(i.parentId)!.children.push(node);
		else roots.push(node);
	}
	const sortRec = (ns: NavNode[]) => {
		ns.sort((a, b) => a.sort - b.sort);
		for (const n of ns) sortRec(n.children);
	};
	sortRec(roots);
	return roots;
}

const inp =
	"rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm";

/** Build picker options from pages/posts, keeping the current ref if it isn't one of them. */
function refOptions(items: RefOpt[], current: string) {
	const opts = items.map((i) => ({
		value: i.slug,
		label: i.contentType ? `${i.title} · ${i.contentType}` : i.title || i.slug,
	}));
	if (current && !opts.some((o) => o.value === current))
		opts.unshift({ value: current, label: `${current} (custom route)` });
	return opts;
}

function NavItemForm({
	initial,
	languages,
	isGroup,
	pages,
	posts,
	onSave,
	onCancel,
}: {
	initial?: FormValue;
	languages: LangOpt[];
	isGroup?: boolean; // true when the item has children → a dropdown group (no link)
	pages: RefOpt[];
	posts: RefOpt[];
	onSave: (v: FormValue) => void;
	onCancel: () => void;
}) {
	const [targetKind, setTargetKind] = useState<NavTargetKind>(
		initial?.targetKind ?? "page",
	);
	const [targetRef, setTargetRef] = useState(initial?.targetRef ?? "");
	const [visible, setVisible] = useState(initial?.visible ?? true);
	// Card brief + image come from the linked page/post — kept here only as a silent
	// fallback for groups / external links / list routes, not edited in this form.
	const [imageMediaId] = useState<number | null>(initial?.imageMediaId ?? null);
	const [descriptions] = useState<Record<string, string>>(
		initial?.descriptions ?? {},
	);
	const [labels, setLabels] = useState<Record<string, string>>(() => {
		const o: Record<string, string> = {};
		for (const l of languages) o[l.code] = initial?.labels[l.code] ?? "";
		return o;
	});

	// Page/post links already provide a title, so the label there is an optional override.
	const inherits = !isGroup && targetKind !== "url";
	const labelInputs = (
		<div className="space-y-1.5">
			{languages.map((l) => (
				<input
					key={l.code}
					className={`${inp} w-full`}
					placeholder={
						inherits
							? `Label override (${l.code}) — defaults to the ${targetKind} title`
							: `Menu label (${l.code})`
					}
					value={labels[l.code] ?? ""}
					onChange={(e) =>
						setLabels((p) => ({ ...p, [l.code]: e.target.value }))
					}
				/>
			))}
		</div>
	);

	return (
		<div className="rounded-xl border border-(--accent)/40 bg-(--accent)/5 p-3 my-2 space-y-3">
			{isGroup ? (
				<>
					{labelInputs}
					<p className="text-[11px] leading-relaxed text-muted-foreground">
						This item has children, so it's a <strong>dropdown group</strong> —
						its label is the menu heading and it doesn't link anywhere.
					</p>
				</>
			) : (
				<>
					{/* 1. Choose the destination first. */}
					<div className="flex flex-wrap items-center gap-2">
						<select
							className={inp}
							value={targetKind}
							onChange={(e) => setTargetKind(e.target.value as NavTargetKind)}
						>
							{TARGET_KINDS.map((k) => (
								<option key={k} value={k}>
									{k}
								</option>
							))}
						</select>
						<div className="flex-1 min-w-55">
							{targetKind === "url" ? (
								<input
									className={`${inp} w-full`}
									placeholder="https://… or /path"
									value={targetRef}
									onChange={(e) => setTargetRef(e.target.value)}
								/>
							) : (
								<SearchableSelect
									value={targetRef}
									onChange={setTargetRef}
									options={refOptions(
										targetKind === "post" ? posts : pages,
										targetRef,
									)}
									placeholder={
										targetKind === "post" ? "Select a post…" : "Select a page…"
									}
								/>
							)}
						</div>
					</div>
					{/* 2. Then the label (an optional override for page/post). */}
					{labelInputs}
					<p className="text-[11px] leading-relaxed text-muted-foreground">
						{inherits
							? `The menu name, brief and image come from the linked ${targetKind} — leave the label blank to use its title. Add child items to make a dropdown.`
							: "Give this link a menu label. Add child items to make a dropdown."}
					</p>
				</>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<label className="flex items-center gap-1 text-sm">
					<input
						type="checkbox"
						checked={visible}
						onChange={(e) => setVisible(e.target.checked)}
					/>{" "}
					visible
				</label>
				<button
					type="button"
					onClick={() =>
						onSave({
							targetKind,
							targetRef,
							visible,
							imageMediaId,
							labels,
							descriptions,
						})
					}
					className="ml-auto rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold"
				>
					Save
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-full border border-border px-4 py-1.5 text-sm"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}

function NavBuilder() {
	const [items, setItems] = useState<NavRow[]>([]);
	const [langs, setLangs] = useState<LangOpt[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<number | null>(null);
	const [addingParent, setAddingParent] = useState<number | null | undefined>(
		undefined,
	); // undefined=closed, null=root
	const [pages, setPages] = useState<RefOpt[]>([]);
	const [posts, setPosts] = useState<RefOpt[]>([]);
	const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
	const didInit = useRef(false);

	async function refresh() {
		const [it, l, pg, po] = await Promise.all([
			trpcClient.adminNav.list.query(),
			trpcClient.i18n.languages.query(),
			trpcClient.adminPages.list.query(),
			trpcClient.adminPosts.list.query(),
		]);
		setItems(it);
		setLangs(l);
		setPages(pg.map((p) => ({ slug: p.slug, title: p.title })));
		setPosts(
			po.map((p) => ({
				slug: p.slug,
				title: p.title,
				contentType: p.contentType,
			})),
		);
		// On first load, collapse every group so the tree opens tidy (top level only).
		if (!didInit.current) {
			setCollapsed(
				new Set(
					it.filter((i) => i.parentId != null).map((i) => i.parentId as number),
				),
			);
			didInit.current = true;
		}
		setLoading(false);
	}

	const toggle = (id: number) =>
		setCollapsed((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
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
		if (!(await confirm("Delete this item and all its children?"))) return;
		await trpcClient.adminNav.delete.mutate({ id });
		await refresh();
	}
	async function move(id: number, dir: "up" | "down") {
		await trpcClient.adminNav.move.mutate({ id, dir });
		await refresh();
	}

	function renderNode(node: NavNode, depth: number) {
		const label =
			node.labels.en ?? Object.values(node.labels)[0] ?? "(no label)";
		const hasKids = node.children.length > 0;
		const open = !collapsed.has(node.id);
		const act =
			"grid h-6 w-6 shrink-0 place-items-center rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition";
		return (
			<div key={node.id}>
				<div
					className={`group/row flex items-center gap-1.5 rounded-lg py-1 pr-1 hover:bg-muted/50 transition ${node.visible ? "" : "opacity-50"}`}
					style={{ paddingLeft: depth * 18 + 4 }}
				>
					{hasKids ? (
						<button
							type="button"
							onClick={() => toggle(node.id)}
							aria-label={open ? "Collapse" : "Expand"}
							className="grid h-5 w-5 shrink-0 place-items-center text-muted-foreground hover:text-foreground"
						>
							<svg
								className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
							>
								<path
									d="M4.5 3L7.5 6L4.5 9"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
					) : (
						<span className="h-5 w-5 shrink-0" />
					)}
					<button
						type="button"
						onClick={() =>
							hasKids
								? toggle(node.id)
								: setEditing(editing === node.id ? null : node.id)
						}
						className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
					>
						<span className="truncate text-sm font-medium text-foreground">
							{label}
						</span>
						{hasKids ? (
							<span className="shrink-0 rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
								{node.children.length}
							</span>
						) : (
							<span className="truncate text-xs text-muted-foreground">
								{node.targetRef
									? `${node.targetKind}: ${node.targetRef}`
									: node.targetKind}
							</span>
						)}
					</button>
					<div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover/row:opacity-100 focus-within:opacity-100">
						<button
							type="button"
							title="Move up"
							className={act}
							onClick={() => move(node.id, "up")}
						>
							↑
						</button>
						<button
							type="button"
							title="Move down"
							className={act}
							onClick={() => move(node.id, "down")}
						>
							↓
						</button>
						<button
							type="button"
							title="Add child"
							className={act}
							onClick={() => {
								setCollapsed((s) => {
									const n = new Set(s);
									n.delete(node.id);
									return n;
								});
								setAddingParent(node.id);
							}}
						>
							＋
						</button>
						<button
							type="button"
							title="Edit"
							className={act}
							onClick={() => setEditing(editing === node.id ? null : node.id)}
						>
							✎
						</button>
						<button
							type="button"
							title="Delete"
							className={`${act} hover:text-destructive`}
							onClick={() => del(node.id)}
						>
							✕
						</button>
					</div>
				</div>
				{editing === node.id && (
					<NavItemForm
						languages={langs}
						pages={pages}
						posts={posts}
						isGroup={node.children.length > 0}
						initial={{
							targetKind: node.targetKind as NavTargetKind,
							targetRef: node.targetRef,
							visible: node.visible,
							imageMediaId: node.imageMediaId,
							labels: node.labels,
							descriptions: node.descriptions,
						}}
						onSave={(v) => update(node.id, v)}
						onCancel={() => setEditing(null)}
					/>
				)}
				{addingParent === node.id && (
					<NavItemForm
						languages={langs}
						pages={pages}
						posts={posts}
						onSave={(v) => create(node.id, v)}
						onCancel={() => setAddingParent(undefined)}
					/>
				)}
				{hasKids && open && node.children.map((c) => renderNode(c, depth + 1))}
			</div>
		);
	}

	if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
	const tree = buildTree(items);

	return (
		<div className="w-full">
			<div className="mb-6">
				<h1 className="font-display text-2xl font-semibold text-primary">
					Header
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					The site header — its menu, the donate button and the top-bar links.
				</p>
			</div>

			<div className="mb-8 max-w-4xl">
				<HeaderSettings />
			</div>

			<div className="flex items-center justify-between mb-2">
				<h2 className="font-display text-lg font-semibold text-primary">
					Menu
				</h2>
				<button
					type="button"
					onClick={() => setAddingParent(null)}
					className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
				>
					+ Top-level item
				</button>
			</div>
			<p className="text-sm text-muted-foreground mb-4">
				Build the mega-menu. An item links to a <code>page</code>,{" "}
				<code>post</code> or <code>url</code>; give it child items to make a
				dropdown; reorder with ↑↓; add nested items with “+ child”.
			</p>
			{addingParent === null && (
				<NavItemForm
					languages={langs}
					pages={pages}
					posts={posts}
					onSave={(v) => create(null, v)}
					onCancel={() => setAddingParent(undefined)}
				/>
			)}
			<div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
				<button
					type="button"
					className="hover:text-accent transition"
					onClick={() => setCollapsed(new Set())}
				>
					Expand all
				</button>
				<span className="text-border">·</span>
				<button
					type="button"
					className="hover:text-accent transition"
					onClick={() =>
						setCollapsed(
							new Set(
								items
									.filter((i) => i.parentId != null)
									.map((i) => i.parentId as number),
							),
						)
					}
				>
					Collapse all
				</button>
			</div>
			<div className="rounded-xl border border-border bg-card p-2">
				{tree.length === 0 ? (
					<p className="p-2 text-sm text-muted-foreground">No nav items.</p>
				) : (
					tree.map((n) => renderNode(n, 0))
				)}
			</div>
		</div>
	);
}
