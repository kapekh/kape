import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Pencil, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
	dragGrip,
	dragItem,
	FormSection,
	fieldInput,
	fieldLabel,
} from "#/components/admin/form-ui";
import type { LangOpt } from "#/components/admin/PostForm";
import { SearchableSelect } from "#/components/admin/SearchableSelect";
import { useDirtyGuard } from "#/components/admin/useDirty";
import { useModules } from "#/components/admin/useModules";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { PageHeader } from "#/components/ui/page-header";
import { SkeletonRows } from "#/components/ui/skeleton";
import {
	DragHandle,
	SortableStatus,
	useSortable,
} from "#/components/ui/sortable.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { publicPathOf } from "#/lib/public-path";
import { saveErrorMessage } from "#/lib/save-error";
import { confirm, toast } from "@/components/Dialogs";

const FIELDS = [
	{ key: "header_donate_label", label: "Donate button label" },
	{ key: "header_donate_link", label: "Donate button link", mono: true },
	{ key: "header_search_link", label: "Top-bar “Search” link", mono: true },
	{ key: "header_sitemap_link", label: "Top-bar “Sitemap” link", mono: true },
];

/** The non-menu header bits (donate button + top-bar links), backed by site_settings. */
function HeaderSettings() {
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
		try {
			await Promise.all(
				Object.entries(vals).map(([key, value]) =>
					trpcClient.adminSettings.set.mutate({ key, value }),
				),
			);
			setSavedAt(new Date().toLocaleTimeString());
			toast("Header settings saved.", "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setSaving(false);
		}
	}

	const dirty = useDirtyGuard(JSON.stringify(vals), savedAt, !loading);

	return (
		<FormSection
			title="Header settings"
			description="The donate button and the top-bar utility links. A site path (/…) or full URL; “#donate” jumps to an on-page anchor."
		>
			{loading ? (
				<SkeletonRows rows={2} />
			) : (
				<>
					<div className="grid sm:grid-cols-2 gap-4">
						{FIELDS.map((f) => (
							<div key={f.key}>
								<label className="block">
									<span className={fieldLabel}>{f.label}</span>
									<input
										className={`${fieldInput} ${f.mono ? "font-mono text-xs" : ""}`}
										value={vals[f.key] ?? ""}
										onChange={(e) =>
											setVals((o) => ({ ...o, [f.key]: e.target.value }))
										}
									/>
								</label>
							</div>
						))}
					</div>
					<div className="mt-6 flex items-center gap-3 border-t border-admin-border pt-4">
						<Button
							onClick={save}
							disabled={saving || !dirty}
							disabledReason={dirty ? undefined : "No changes to save."}
						>
							{saving ? "Saving…" : "Save header settings"}
						</Button>
						{savedAt && (
							<span className="text-[13px] text-admin-live-ink">
								Saved {savedAt}
							</span>
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

type NavTargetKind =
	| "none"
	| "page"
	| "post_list"
	| "view"
	| "url"
	| "post"
	| "project_list";
type FormValue = {
	targetKind: NavTargetKind;
	targetRef: string;
	visible: boolean;
	imageMediaId: number | null;
	labels: Record<string, string>;
	descriptions: Record<string, string>;
};

const TARGET_KINDS: NavTargetKind[] = ["page", "post", "url", "project_list"];
// a project_list group lists the projects table by status; the status is its ref
const PROJECT_STATUSES = ["current", "past"];

function buildTree(items: NavRow[]): NavNode[] {
	const byId = new Map<number, NavNode>();
	for (const i of items) byId.set(i.id, { ...i, children: [] });
	const roots: NavNode[] = [];
	for (const i of items) {
		const node = byId.get(i.id);
		if (!node) continue;
		const parent = i.parentId != null ? byId.get(i.parentId) : undefined;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}
	const sortRec = (ns: NavNode[]) => {
		ns.sort((a, b) => a.sort - b.sort);
		for (const n of ns) sortRec(n.children);
	};
	sortRec(roots);
	return roots;
}

const labelOf = (n: NavNode) =>
	n.labels.en ?? Object.values(n.labels)[0] ?? "(no label)";

type Grip = ReturnType<ReturnType<typeof useSortable<number>>["handleProps"]>;
type ItemProps = ReturnType<
	ReturnType<typeof useSortable<number>>["itemProps"]
>;

/** One sibling group. A drag stays inside it, so the ids sent to the server all
 *  share a parent and it renumbers that level alone. */
function NavLevel({
	nodes,
	depth,
	disabled,
	onReorder,
	render,
}: {
	nodes: NavNode[];
	depth: number;
	disabled: boolean;
	onReorder: (ids: number[]) => Promise<void>;
	render: (
		node: NavNode,
		depth: number,
		itemProps: ItemProps,
		grip: Grip | null,
	) => ReactNode;
}) {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const { order, itemProps, handleProps, status } = useSortable<number>({
		ids: nodes.map((n) => n.id),
		disabled,
		describe: (id) => {
			const node = byId.get(id);
			return node ? labelOf(node) : `item ${id}`;
		},
		onReorder,
		onError: (e) => toast(saveErrorMessage(e), "error"),
	});
	const placed = new Set(order);
	const many = order.length > 1;
	const shown = [
		...order.map((id) => byId.get(id)).filter((n): n is NavNode => n != null),
		...nodes.filter((n) => !placed.has(n.id)),
	];
	return (
		<>
			<SortableStatus status={status} />
			{shown.map((n) =>
				render(n, depth, itemProps(n.id), many ? handleProps(n.id) : null),
			)}
		</>
	);
}

const inp =
	"rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-sm text-admin-ink transition-colors duration-150 ease-out focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none";

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

	const listsProjects = targetKind === "project_list";
	// Page/post links already provide a title, so the label there is an optional override.
	const inherits = !isGroup && targetKind !== "url" && !listsProjects;
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
		<div className="my-2 space-y-3 rounded-xl border border-admin-accent bg-admin-accent-soft/40 p-3">
			{isGroup ? (
				<>
					{labelInputs}
					<p className="text-[13px] leading-relaxed text-admin-ink-muted">
						This item has children, so it is a dropdown group: its label is the
						menu heading and it does not link anywhere.
					</p>
				</>
			) : (
				<>
					{/* 1. Choose the destination first. */}
					<div className="flex flex-wrap items-center gap-2">
						<select
							className={inp}
							value={targetKind}
							onChange={(e) => {
								const kind = e.target.value as NavTargetKind;
								setTargetKind(kind);
								if (
									kind === "project_list" &&
									!PROJECT_STATUSES.includes(targetRef)
								)
									setTargetRef(PROJECT_STATUSES[0]);
							}}
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
							) : listsProjects ? (
								<select
									className={`${inp} w-full`}
									aria-label="Project status"
									value={targetRef}
									onChange={(e) => setTargetRef(e.target.value)}
								>
									{PROJECT_STATUSES.map((st) => (
										<option key={st} value={st}>
											{st} projects
										</option>
									))}
								</select>
							) : (
								<SearchableSelect
									value={targetRef}
									onChange={setTargetRef}
									options={refOptions(
										targetKind === "post" ? posts : pages,
										targetRef,
									)}
									placeholder={
										targetKind === "post"
											? "Select a post…"
											: "Select a page or project…"
									}
								/>
							)}
						</div>
					</div>
					{/* 2. Then the label (an optional override for page/post). */}
					{labelInputs}
					<p className="text-[13px] leading-relaxed text-admin-ink-muted">
						{inherits
							? `The menu name, brief and image come from the linked ${targetKind} — leave the label blank to use its title.`
							: listsProjects
								? "Every project with this status is listed under this label, so a project added under Projects is in the menu at once."
								: "Give this link a menu label."}
					</p>
				</>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<label className="flex items-center gap-2 text-sm text-admin-ink">
					<input
						type="checkbox"
						checked={visible}
						onChange={(e) => setVisible(e.target.checked)}
						className="size-4 accent-admin-accent"
					/>
					Show in the menu
				</label>
				<div className="ml-auto flex items-center gap-2">
					<Button variant="secondary" size="sm" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						size="sm"
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
					>
						Save item
					</Button>
				</div>
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
	const modules = useModules();

	const refresh = useCallback(async () => {
		const [it, l, pg, po, pr] = await Promise.all([
			trpcClient.adminNav.list.query(),
			trpcClient.i18n.languages.query(),
			trpcClient.adminPages.list.query(),
			trpcClient.adminPosts.list.query(),
			modules.list("projects", () => trpcClient.adminProjects.list.query()),
		]);
		setItems(it);
		setLangs(l);
		// projects share the page picker: menu refs have always been projects/<slug>
		const parentSlug = new Map(pr.map((p) => [p.id, p.slug]));
		setPages([
			...pg.map((p) => ({ slug: p.slug, title: p.title })),
			...pr.map((p) => ({
				slug: (
					publicPathOf({
						kind: "project",
						slug: p.slug,
						parentSlug: p.parentId != null ? parentSlug.get(p.parentId) : null,
					}) ?? ""
				).replace(/^\//, ""),
				title: p.name,
				contentType: "project",
			})),
		]);
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
	}, [modules.list]);

	const toggle = (id: number) =>
		setCollapsed((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	useEffect(() => {
		refresh();
	}, [refresh]);

	// one action at a time: the server renumbers, so a second click acts on stale sort positions
	const [busyId, setBusyId] = useState<number | "new" | null>(null);

	async function create(parentId: number | null, v: FormValue) {
		setBusyId("new");
		try {
			await trpcClient.adminNav.create.mutate({ parentId, ...v });
			setAddingParent(undefined);
			await refresh();
			toast("Menu item added.", "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusyId(null);
		}
	}
	async function update(id: number, v: FormValue) {
		setBusyId(id);
		try {
			await trpcClient.adminNav.update.mutate({ id, ...v });
			setEditing(null);
			await refresh();
			toast("Menu item saved.", "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusyId(null);
		}
	}
	async function del(id: number) {
		if (!(await confirm("Delete this item and all its children?"))) return;
		setBusyId(id);
		try {
			await trpcClient.adminNav.delete.mutate({ id });
			await refresh();
			toast("Menu item deleted.", "success");
		} catch (e) {
			toast(saveErrorMessage(e), "error");
		} finally {
			setBusyId(null);
		}
	}
	// one write for the whole level: the server renumbers it in one go
	async function reorder(ids: number[]) {
		await trpcClient.adminNav.reorder.mutate({ ids });
		await refresh();
	}

	function renderNode(
		node: NavNode,
		depth: number,
		itemProps: ItemProps,
		grip: Grip | null,
	) {
		const label = labelOf(node);
		const hasKids = node.children.length > 0;
		const open = !collapsed.has(node.id);
		const busy = busyId === node.id;
		const act =
			"grid size-8 shrink-0 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink disabled:opacity-40 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none";
		return (
			<div key={node.id}>
				<div
					{...itemProps}
					className={`flex items-center gap-1 rounded-lg py-1 pr-1 transition-colors duration-150 ease-out hover:bg-admin-accent-soft/40 ${dragItem} ${node.visible ? "" : "opacity-60"}`}
					style={{ paddingLeft: depth * 24 + 4 }}
				>
					{grip ? <DragHandle {...grip} className={dragGrip} /> : null}
					{hasKids ? (
						<button
							type="button"
							onClick={() => toggle(node.id)}
							aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
							aria-expanded={open}
							aria-controls={`nav-children-${node.id}`}
							className="grid size-8 shrink-0 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
						>
							<ChevronRight
								aria-hidden="true"
								className={`size-4 transition-transform duration-200 ease-out ${open ? "rotate-90" : ""}`}
							/>
						</button>
					) : (
						<span className="size-8 shrink-0" />
					)}
					<button
						type="button"
						onClick={() =>
							hasKids
								? toggle(node.id)
								: setEditing(editing === node.id ? null : node.id)
						}
						// the label and what follows it are separate elements, so the name
						// runs them together unless it is spelled out
						aria-label={
							hasKids
								? `${label}, ${node.children.length} items`
								: `${label}, ${node.targetRef ? `${node.targetKind}: ${node.targetRef}` : node.targetKind}`
						}
						className="flex min-w-0 flex-1 items-baseline gap-2 rounded-lg px-1 py-1 text-left focus-visible:ring-2 focus-visible:ring-admin-focus/40 focus-visible:outline-none"
					>
						<span className="truncate text-sm font-medium text-admin-ink">
							{label}
						</span>
						{hasKids ? (
							<span className="shrink-0 rounded-full bg-admin-accent-soft px-2 text-[13px] font-medium text-admin-ink-muted">
								{node.children.length}
							</span>
						) : (
							<span className="truncate text-[13px] text-admin-ink-muted">
								{node.targetRef
									? `${node.targetKind}: ${node.targetRef}`
									: node.targetKind}
							</span>
						)}
						{!node.visible && (
							<span className="shrink-0 text-[13px] text-admin-ink-muted">
								hidden
							</span>
						)}
					</button>
					{/* on screen at rest: a control nobody can see is a control nobody finds */}
					<div className="ml-auto flex shrink-0 items-center gap-0.5">
						<button
							type="button"
							aria-label={`Add a child item under ${label}`}
							disabled={busy}
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
							<Plus aria-hidden="true" className="size-4" />
						</button>
						<button
							type="button"
							aria-label={`Edit ${label}`}
							aria-expanded={editing === node.id}
							className={act}
							onClick={() => setEditing(editing === node.id ? null : node.id)}
						>
							<Pencil aria-hidden="true" className="size-4" />
						</button>
						<button
							type="button"
							aria-label={`Delete ${label}`}
							disabled={busy}
							className={`${act} hover:text-admin-danger-ink`}
							onClick={() => del(node.id)}
						>
							<X aria-hidden="true" className="size-4" />
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
				{hasKids && (
					<div
						id={`nav-children-${node.id}`}
						hidden={!open}
						className="border-l border-admin-border"
						style={{ marginLeft: depth * 24 + 20 }}
					>
						<NavLevel
							nodes={node.children}
							depth={depth + 1}
							disabled={busyId !== null}
							onReorder={reorder}
							render={(c, d, props, childGrip) => (
								<div key={c.id} style={{ marginLeft: -(depth * 24 + 20) }}>
									{renderNode(c, d, props, childGrip)}
								</div>
							)}
						/>
					</div>
				)}
			</div>
		);
	}

	if (loading)
		return (
			<div className="w-full">
				<PageHeader
					title="Header"
					description="The site header — its menu, the donate button and the top-bar links."
					breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Header" }]}
				/>
				<SkeletonRows rows={8} />
			</div>
		);
	const tree = buildTree(items);

	return (
		<div className="w-full">
			<PageHeader
				title="Header"
				description="The site header — its menu, the donate button and the top-bar links."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Header" }]}
			/>

			<div data-tour="nav-settings" className="mb-8 max-w-4xl">
				<HeaderSettings />
			</div>

			{/* two save scopes on one screen: settings save on their button, menu items
			    save one at a time, so the menu says so above its own frame */}
			<Card padding="none" data-tour="nav-menu" className="max-w-4xl">
				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-border px-4 py-4">
					<div className="min-w-0 max-w-xl">
						<h2 className="text-base font-semibold text-admin-ink">Menu</h2>
						<p className="mt-1 text-[13px] text-admin-ink-muted">
							An item links to a page, a post or a URL. Give an item children
							and it becomes a dropdown. Each item saves on its own — the button
							above only saves the header settings.
						</p>
					</div>
					<Button onClick={() => setAddingParent(null)}>
						<Plus aria-hidden="true" className="size-4" />
						Top-level item
					</Button>
				</div>
				<div className="px-4 py-3">
					{addingParent === null && (
						<NavItemForm
							languages={langs}
							pages={pages}
							posts={posts}
							onSave={(v) => create(null, v)}
							onCancel={() => setAddingParent(undefined)}
						/>
					)}
					<div className="mb-2 flex items-center gap-3 text-[13px]">
						<button
							type="button"
							className="tap-target text-admin-ink-muted transition-colors duration-150 ease-out hover:text-admin-accent-ink"
							onClick={() => setCollapsed(new Set())}
						>
							Expand all
						</button>
						<span className="text-admin-border">·</span>
						<button
							type="button"
							className="tap-target text-admin-ink-muted transition-colors duration-150 ease-out hover:text-admin-accent-ink"
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
					{tree.length === 0 ? (
						<p className="p-2 text-sm text-admin-ink-muted">
							No menu items yet. Add a top-level item to start the menu.
						</p>
					) : (
						<NavLevel
							nodes={tree}
							depth={0}
							disabled={busyId !== null}
							onReorder={reorder}
							render={renderNode}
						/>
					)}
				</div>
			</Card>
		</div>
	);
}
