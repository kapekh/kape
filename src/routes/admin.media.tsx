import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownToLine,
	Check,
	Copy,
	ExternalLink,
	FileText,
	Images,
	Play,
	SearchX,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { EmptyState, ListSearch } from "#/components/admin/list-ui";
import { startTourOnce } from "#/components/admin/Tour";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import { inputClass } from "#/components/ui/input.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useModalPanel } from "#/lib/use-modal-panel";
import { confirm, toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/media")({
	component: MediaLibrary,
});

type MediaRow = Awaited<
	ReturnType<typeof trpcClient.adminMedia.page.query>
>[number];
type MediaUsage = Awaited<
	ReturnType<typeof trpcClient.adminMedia.usage.query>
>[number];
type Filter = "all" | "image" | "video" | "file";
type Stats = {
	total: number;
	images: number;
	videos: number;
	files: number;
	bytes: number;
};

const PAGE = 30;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const isImage = (m: MediaRow) => !!m.contentType?.startsWith("image/");
const isVideo = (m: MediaRow) => !!m.contentType?.startsWith("video/");
const nameOf = (m: MediaRow) =>
	(m.url || m.r2Key || "").split("/").pop()?.split("?")[0] || `media-${m.id}`;
const extOf = (m: MediaRow) =>
	(
		m.contentType?.split("/")[1] ||
		nameOf(m).split(".").pop() ||
		"file"
	).toUpperCase();

async function reason(res: Response) {
	const body = (await res.json().catch(() => null)) as {
		error?: string;
	} | null;
	return body?.error ?? `upload failed (HTTP ${res.status})`;
}

// the DB refuses to drop media a record still points at, whatever the confirm
// dialog offered.
function deleteReason(e: unknown) {
	const msg = e instanceof Error ? e.message : String(e);
	return /FOREIGN KEY/i.test(msg)
		? "it is still attached to a record. Remove it there first."
		: msg;
}

function fmtBytes(n: number | null | undefined) {
	if (!n) return null;
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(s: string | null | undefined) {
	if (!s) return "";
	const d = new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
	return Number.isNaN(d.getTime())
		? ""
		: d.toLocaleDateString(undefined, {
				day: "numeric",
				month: "short",
				year: "numeric",
			});
}

const GRID =
	"grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

const FILTERS: { value: Filter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "image", label: "Images" },
	{ value: "video", label: "Videos" },
	{ value: "file", label: "Files" },
];

function MediaLibrary() {
	const [items, setItems] = useState<MediaRow[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true); // initial / filter reset
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	const [query, setQuery] = useState("");
	const [debounced, setDebounced] = useState("");
	const [filter, setFilter] = useState<Filter>("all");

	const [upload, setUpload] = useState<{ done: number; total: number } | null>(
		null,
	);
	const [dragging, setDragging] = useState(false);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [copiedId, setCopiedId] = useState<number | null>(null);
	const [preview, setPreview] = useState<MediaRow | null>(null);
	const previewHeadingId = useId();
	const closePreview = useCallback(() => setPreview(null), []);
	const previewRef = useModalPanel(closePreview, !!preview);
	const [usage, setUsage] = useState<MediaUsage[] | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	// Resolve "where is this used" whenever the detail lightbox opens.
	useEffect(() => {
		if (!preview) return;
		setUsage(null);
		let alive = true;
		trpcClient.adminMedia.usage
			.query({ id: preview.id })
			.then((u) => {
				if (alive) setUsage(u);
			})
			.catch(() => {
				if (alive) setUsage([]);
			});
		return () => {
			alive = false;
		};
	}, [preview]);

	// Pagination internals (refs avoid stale closures in the observer).
	const offsetRef = useRef(0);
	const reqRef = useRef(0); // discards out-of-order responses on filter change
	const busyRef = useRef(false);
	const hasMoreRef = useRef(true);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const fetchStats = useCallback(
		() =>
			trpcClient.adminMedia.stats
				.query()
				.then(setStats)
				.catch(() => {}),
		[],
	);

	// Load page 1 for the current filter/search (replaces the list).
	const reset = useCallback(async () => {
		const req = ++reqRef.current;
		setLoading(true);
		offsetRef.current = 0;
		const rows = await trpcClient.adminMedia.page.query({
			limit: PAGE,
			offset: 0,
			query: debounced,
			type: filter,
		});
		if (req !== reqRef.current) return; // a newer reset superseded us
		offsetRef.current = rows.length;
		hasMoreRef.current = rows.length === PAGE;
		setItems(rows);
		setHasMore(hasMoreRef.current);
		setLoading(false);
		busyRef.current = false;
	}, [debounced, filter]);

	// Append the next page (infinite scroll).
	async function loadMore() {
		if (busyRef.current || !hasMoreRef.current || loading) return;
		busyRef.current = true;
		setLoadingMore(true);
		const req = reqRef.current;
		const rows = await trpcClient.adminMedia.page.query({
			limit: PAGE,
			offset: offsetRef.current,
			query: debounced,
			type: filter,
		});
		if (req === reqRef.current) {
			offsetRef.current += rows.length;
			hasMoreRef.current = rows.length === PAGE;
			setItems((prev) => [...prev, ...rows]);
			setHasMore(hasMoreRef.current);
		}
		setLoadingMore(false);
		busyRef.current = false;
	}

	// Keep the observer pointed at the freshest loadMore (latest filter/query).
	const loadMoreRef = useRef(loadMore);
	loadMoreRef.current = loadMore;

	// Debounce the search box.
	useEffect(() => {
		const t = setTimeout(() => setDebounced(query.trim()), 300);
		return () => clearTimeout(t);
	}, [query]);

	// Reset list whenever the filter or (debounced) search changes; also initial load.
	useEffect(() => {
		reset();
	}, [reset]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		startTourOnce("media");
	}, []);

	// Infinite-scroll sentinel.
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			(entries) => entries[0]?.isIntersecting && loadMoreRef.current(),
			{ rootMargin: "600px" },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	async function uploadFiles(files: FileList | File[]) {
		const list = [...files];
		if (!list.length) return;
		setUpload({ done: 0, total: list.length });
		const failed: string[] = [];
		for (let i = 0; i < list.length; i++) {
			const fd = new FormData();
			fd.append("file", list[i]);
			const res = await fetch("/api/media/upload", {
				method: "POST",
				body: fd,
			});
			if (!res.ok) failed.push(`${list[i].name}: ${await reason(res)}`);
			setUpload({ done: i + 1, total: list.length });
		}
		setUpload(null);
		if (fileRef.current) fileRef.current.value = "";
		await Promise.all([reset(), fetchStats()]); // new uploads sort to the top
		if (failed.length) toast(failed.join("\n"), "error");
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
	}

	async function copy(m: MediaRow) {
		try {
			await navigator.clipboard.writeText(m.url ?? "");
			setCopiedId(m.id);
			setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1400);
		} catch {}
	}

	function dropLocal(ids: number[]) {
		const set = new Set(ids);
		setItems((xs) => xs.filter((x) => !set.has(x.id)));
		offsetRef.current = Math.max(0, offsetRef.current - ids.length);
		setSelected((s) => {
			const n = new Set(s);
			for (const id of ids) n.delete(id);
			return n;
		});
		fetchStats();
	}

	async function del(id: number, knownUsage?: MediaUsage[] | null) {
		// Always know whether the asset is referenced before destroying it.
		const u =
			knownUsage ??
			(await trpcClient.adminMedia.usage
				.query({ id })
				.catch(() => [] as MediaUsage[]));
		let msg = "Delete this media item? This can't be undone.";
		if (u.length) {
			const lines = u
				.slice(0, 6)
				.map((x) => `  • ${x.kind}: ${x.label}`)
				.join("\n");
			const more = u.length > 6 ? `\n  …and ${u.length - 6} more` : "";
			msg = `⚠ This image is still used in ${u.length} place${u.length > 1 ? "s" : ""}:\n\n${lines}${more}\n\nDeleting it will leave ${u.length > 1 ? "those records" : "that record"} with a broken/missing image. Delete anyway?`;
		}
		if (!(await confirm(msg))) return;
		try {
			await trpcClient.adminMedia.delete.mutate({ id });
		} catch (e) {
			toast(`Could not delete: ${deleteReason(e)}`, "error");
			return;
		}
		dropLocal([id]);
		setPreview((p) => (p?.id === id ? null : p));
	}

	// Deleting N items is N round trips; a second click would re-issue every one
	// of them against ids the first pass is already removing.
	const [bulkBusy, setBulkBusy] = useState(false);

	async function bulkDelete() {
		const ids = [...selected];
		if (!ids.length || bulkBusy) return;
		const usages = await Promise.all(
			ids.map((id) =>
				trpcClient.adminMedia.usage
					.query({ id })
					.catch(() => [] as MediaUsage[]),
			),
		);
		const inUse = usages.filter((u) => u.length > 0).length;
		const msg = inUse
			? `⚠ ${inUse} of these ${ids.length} item${ids.length > 1 ? "s" : ""} ${inUse > 1 ? "are" : "is"} still used by other records and will leave broken images.\n\nDelete all ${ids.length} anyway? This can't be undone.`
			: `Delete ${plural(ids.length, "selected item")}? This can't be undone.`;
		if (!(await confirm(msg))) return;
		setBulkBusy(true);
		try {
			const results = await Promise.allSettled(
				ids.map((id) => trpcClient.adminMedia.delete.mutate({ id })),
			);
			const gone = ids.filter((_, i) => results[i].status === "fulfilled");
			dropLocal(gone);
			const stuck = results.length - gone.length;
			if (stuck)
				toast(
					`${plural(stuck, "item")} could not be deleted: still attached to a record.`,
					"error",
				);
			else toast(`${plural(gone.length, "item")} deleted.`, "success");
		} finally {
			setBulkBusy(false);
		}
	}

	function toggle(id: number) {
		setSelected((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}

	const previewSize = preview ? fmtBytes(preview.size) : null;
	const filtered = debounced !== "" || filter !== "all";

	// `files` is everything that is not an image, videos included, so the line
	// subtracts them rather than counting a video twice.
	const summary = stats
		? [
				plural(stats.total, "item"),
				plural(stats.images, "image"),
				stats.videos ? plural(stats.videos, "video") : null,
				stats.files - stats.videos
					? plural(stats.files - stats.videos, "file")
					: null,
				fmtBytes(stats.bytes),
			]
				.filter(Boolean)
				.join(" · ")
		: "Loading…";

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop target, not a control. Dragging a file here is a shortcut for the Upload button below, which stays keyboard reachable.
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={(e) => {
				if (e.currentTarget === e.target) setDragging(false);
			}}
			onDrop={onDrop}
			className="relative"
		>
			<PageHeader
				title="Media library"
				description="Every image, video and file uploaded to the site. Drop files anywhere on this page to add them."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Media" }]}
				actions={
					<label
						data-tour="media-upload"
						className={`${buttonVariants({ variant: "primary", size: "md" })} cursor-pointer focus-within:ring-2 focus-within:ring-admin-focus/50`}
					>
						<Upload aria-hidden="true" />
						{upload ? `Uploading ${upload.done}/${upload.total}…` : "Upload"}
						<input
							ref={fileRef}
							type="file"
							multiple
							className="sr-only"
							onChange={(e) => e.target.files && uploadFiles(e.target.files)}
							disabled={!!upload}
						/>
					</label>
				}
				toolbar={
					<>
						<ListSearch
							value={query}
							onChange={setQuery}
							label="Search media"
							placeholder="Search by name or URL…"
							status={summary}
						/>
						<fieldset className="flex flex-wrap items-center gap-2">
							<legend className="sr-only">Filter by type</legend>
							{FILTERS.map((f) => (
								<Button
									key={f.value}
									type="button"
									size="sm"
									variant={filter === f.value ? "primary" : "secondary"}
									aria-pressed={filter === f.value}
									onClick={() => setFilter(f.value)}
								>
									{f.label}
								</Button>
							))}
						</fieldset>
						{selected.size > 0 && (
							<div className="flex items-center gap-2 rounded-full border border-admin-danger/40 bg-admin-danger-soft px-2 py-1 sm:ml-auto">
								<span className="px-2 text-[13px] font-medium text-admin-ink">
									{selected.size} selected
								</span>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => setSelected(new Set())}
								>
									Clear
								</Button>
								<Button
									type="button"
									size="sm"
									variant="danger"
									onClick={bulkDelete}
									disabled={bulkBusy}
									disabledReason="Deleting the selected items…"
								>
									Delete
								</Button>
							</div>
						)}
					</>
				}
			/>

			{loading ? (
				<div aria-busy="true" className={GRID}>
					{/* the shapes are aria-hidden, so the word still has to be said once */}
					<span className="sr-only">Loading…</span>
					{Array.from({ length: 10 }, (_, i) => (
						<Skeleton
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length loading skeleton, no data behind it
							key={i}
							className="aspect-square w-full rounded-xl"
						/>
					))}
				</div>
			) : items.length === 0 ? (
				<EmptyState
					icon={filtered ? <SearchX /> : <Images />}
					title={filtered ? "Nothing matches your filter" : "No media yet"}
					description={
						filtered
							? "Try a different search, or widen the type filter."
							: "Drag files onto this page, or use the Upload button to add the first one."
					}
					action={
						filtered ? (
							<Button
								type="button"
								variant="secondary"
								onClick={() => {
									setQuery("");
									setFilter("all");
								}}
							>
								{filter !== "all" ? "Clear filters" : "Clear search"}
							</Button>
						) : undefined
					}
				/>
			) : (
				<div className={GRID}>
					{items.map((m, tile) => {
						const sel = selected.has(m.id);
						const name = nameOf(m);
						return (
							<div
								key={m.id}
								data-tour={tile === 0 ? "media-tile" : undefined}
								className={`group relative overflow-hidden rounded-xl border bg-admin-panel transition-colors duration-150 ease-out ${sel ? "border-admin-accent ring-2 ring-admin-accent" : "border-admin-border hover:border-admin-border-strong hover:shadow-[var(--shadow-soft)]"}`}
							>
								<button
									type="button"
									onClick={() => setPreview(m)}
									aria-label={name}
									className="block aspect-square w-full overflow-hidden bg-admin-neutral-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
								>
									{isImage(m) ? (
										<img
											src={m.url ?? ""}
											alt={name}
											loading="lazy"
											className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
										/>
									) : isVideo(m) ? (
										// the frame the browser decodes IS the thumbnail, so a video
										// looks like what it is without storing a poster for it
										<span className="relative block h-full w-full">
											<video
												src={m.url ?? ""}
												muted
												playsInline
												preload="metadata"
												className="h-full w-full bg-black object-cover"
											/>
											<span className="absolute inset-0 grid place-items-center">
												<span className="grid size-9 place-items-center rounded-full bg-black/60 text-white">
													<Play aria-hidden="true" className="size-4" />
												</span>
											</span>
										</span>
									) : (
										<span className="grid h-full w-full place-items-center text-admin-ink-subtle">
											<FileText aria-hidden="true" className="size-8" />
										</span>
									)}
								</button>
								<button
									type="button"
									onClick={() => toggle(m.id)}
									aria-label={`Select ${name}`}
									aria-pressed={sel}
									className={`absolute left-2 top-2 grid size-9 place-items-center rounded-lg border transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 ${sel ? "border-admin-accent bg-admin-accent text-accent-foreground" : "border-white/70 bg-black/40 text-transparent opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
								>
									<Check aria-hidden="true" className="size-4" />
								</button>
								<span className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium tracking-wide text-white opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
									{extOf(m)}
								</span>
								<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100">
									<span
										className="pointer-events-auto truncate text-[13px] font-medium text-white"
										title={name}
									>
										{name}
									</span>
									<span className="pointer-events-auto flex flex-none gap-2">
										<button
											type="button"
											onClick={() => copy(m)}
											title={`Copy URL for ${name}`}
											aria-label={`Copy URL for ${name}`}
											className="grid size-9 place-items-center rounded-lg bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
										>
											{copiedId === m.id ? (
												<Check aria-hidden="true" className="size-4" />
											) : (
												<Copy aria-hidden="true" className="size-4" />
											)}
										</button>
										<button
											type="button"
											onClick={() => del(m.id)}
											title={`Delete ${name}`}
											aria-label={`Delete ${name}`}
											className="grid size-9 place-items-center rounded-lg bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-admin-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
										>
											<Trash2 aria-hidden="true" className="size-4" />
										</button>
									</span>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Infinite-scroll sentinel + status */}
			<div ref={sentinelRef} className="h-px" />
			{loadingMore && (
				<div className="flex items-center justify-center gap-2 py-6 text-[13px] text-admin-ink-muted">
					<span className="size-4 rounded-full border-2 border-admin-border-strong border-t-admin-accent motion-safe:animate-spin" />{" "}
					Loading more…
				</div>
			)}
			{!loading && !hasMore && items.length > 0 && (
				<p className="py-6 text-center text-[13px] text-admin-ink-muted">
					That's everything. {items.length} shown.
				</p>
			)}

			{/* Drag overlay */}
			{dragging && (
				<div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-admin-accent/20 backdrop-blur-sm">
					<div className="rounded-xl border-2 border-dashed border-admin-accent bg-admin-panel px-8 py-8 text-center shadow-[var(--shadow-lift)]">
						<ArrowDownToLine
							aria-hidden="true"
							className="mx-auto size-8 text-admin-accent"
						/>
						<p className="mt-2 text-base font-semibold text-admin-ink">
							Drop files to upload
						</p>
					</div>
				</div>
			)}

			{/* Lightbox / detail */}
			{preview && (
				<div className="fixed inset-0 z-50 grid place-items-center p-4">
					<button
						type="button"
						aria-label="Close"
						className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
						onClick={() => setPreview(null)}
					/>
					<div
						ref={previewRef}
						role="dialog"
						aria-modal="true"
						tabIndex={-1}
						aria-labelledby={previewHeadingId}
						className="relative grid w-full max-w-4xl min-w-0 overflow-hidden rounded-xl border border-admin-border bg-admin-panel-raised shadow-[var(--shadow-lift)] focus:outline-none md:grid-cols-[1fr_360px]"
					>
						<div className="grid min-h-[260px] place-items-center bg-admin-neutral-soft">
							{isImage(preview) ? (
								<img
									src={preview.url ?? ""}
									alt={nameOf(preview)}
									className="max-h-[70vh] w-full object-contain"
								/>
							) : isVideo(preview) ? (
								// playable here: checking a clip is the whole reason to open it
								// biome-ignore lint/a11y/useMediaCaption: operator-uploaded clip, captions belong on the record that embeds it
								<video
									src={preview.url ?? ""}
									controls
									preload="metadata"
									className="max-h-[70vh] w-full bg-black object-contain"
								/>
							) : (
								<FileText
									aria-hidden="true"
									className="size-12 text-admin-ink-subtle"
								/>
							)}
						</div>
						<div className="flex min-w-0 flex-col p-6">
							<div className="mb-4 flex items-start justify-between gap-2">
								<h2
									id={previewHeadingId}
									className="text-base font-semibold break-words text-admin-ink"
								>
									{nameOf(preview)}
								</h2>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									aria-label="Close"
									onClick={closePreview}
									className="flex-none"
								>
									<X aria-hidden="true" />
								</Button>
							</div>
							<dl className="space-y-2 text-sm">
								<Meta label="Type" value={preview.contentType ?? "—"} />
								{preview.width && preview.height ? (
									<Meta
										label="Dimensions"
										value={`${preview.width} × ${preview.height}`}
									/>
								) : null}
								{previewSize ? <Meta label="Size" value={previewSize} /> : null}
								<Meta label="Added" value={fmtDate(preview.createdAt)} />
							</dl>
							<div className="mt-4">
								<div className="mb-1 text-[13px] font-medium text-admin-ink-muted">
									URL
								</div>
								<input
									readOnly
									aria-label={`URL for ${nameOf(preview)}`}
									value={preview.url ?? ""}
									onFocus={(e) => e.currentTarget.select()}
									className={`${inputClass} h-10 min-w-0 text-admin-ink-muted`}
								/>
							</div>

							{/* Where this media is used */}
							<div className="mt-4">
								<div className="mb-2 flex items-center gap-2">
									<span className="text-[13px] font-medium text-admin-ink-muted">
										Used in
									</span>
									{usage && (
										<span
											className={`rounded-full px-2 py-1 text-xs font-medium leading-none ${usage.length ? "bg-admin-accent-soft text-admin-accent" : "bg-admin-neutral-soft text-admin-ink-muted"}`}
										>
											{usage.length
												? `${usage.length} place${usage.length > 1 ? "s" : ""}`
												: "Unused"}
										</span>
									)}
								</div>
								{usage === null ? (
									<p className="text-[13px] text-admin-ink-muted">Checking…</p>
								) : usage.length === 0 ? (
									<p className="text-[13px] text-admin-ink-muted">
										Not referenced anywhere, so it is safe to delete.
									</p>
								) : (
									<ul className="thin-scroll max-h-40 space-y-2 overflow-y-auto pr-1">
										{usage.map((u, i) => (
											<li
												// biome-ignore lint/suspicious/noArrayIndexKey: read-only usage list, no reorder or delete while mounted
												key={i}
												className="flex items-center justify-between gap-2 rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-[13px]"
											>
												<span className="min-w-0">
													<span className="text-xs font-medium text-admin-ink-muted">
														{u.kind}
													</span>
													<span
														className="block truncate text-admin-ink"
														title={u.label}
													>
														{u.label}
													</span>
												</span>
												{u.href && (
													<Button asChild size="sm" variant="secondary">
														<a href={u.href}>Open</a>
													</Button>
												)}
											</li>
										))}
									</ul>
								)}
							</div>

							<div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
								<Button
									type="button"
									onClick={() => copy(preview)}
									className="sm:col-span-2"
								>
									{copiedId === preview.id ? (
										<Check aria-hidden="true" />
									) : (
										<Copy aria-hidden="true" />
									)}
									{copiedId === preview.id ? "Copied" : "Copy URL"}
								</Button>
								<Button asChild variant="secondary">
									<a
										href={preview.url ?? "#"}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLink aria-hidden="true" />
										Open
									</a>
								</Button>
								<Button
									type="button"
									variant="danger"
									onClick={() => del(preview.id, usage)}
								>
									<Trash2 aria-hidden="true" />
									Delete
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 border-b border-admin-border pb-2">
			<dt className="text-admin-ink-muted">{label}</dt>
			<dd className="text-right font-medium break-all text-admin-ink">
				{value}
			</dd>
		</div>
	);
}
