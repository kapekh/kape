import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownToLine,
	Check,
	Copy,
	FileText,
	Images,
	Play,
	SearchX,
	Trash2,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyState, ListSearch } from "#/components/admin/list-ui";
import { MediaDetail } from "#/components/admin/MediaDetail";
import { startTourOnce } from "#/components/admin/Tour";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import { PageHeader } from "#/components/ui/page-header.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { mediaDisplayName, mediaStorageName } from "#/lib/media-name";
import { formatBytes, formatSize, isLowResolution } from "#/lib/media-size";
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

const REMOVE_FIRST = "Remove it there first, then delete the file.";

const named = (u: MediaUsage) => `${u.kind}: ${u.label}`;

/** Bulleted, for a dialog, which keeps the line breaks. */
function placeList(usage: MediaUsage[]): string {
	const lines = usage
		.slice(0, 6)
		.map((u) => `  • ${named(u)}`)
		.join("\n");
	const more = usage.length > 6 ? `\n  …and ${usage.length - 6} more` : "";
	return `${plural(usage.length, "place")}:\n\n${lines}${more}`;
}

type Chosen = { id: number; usage: MediaUsage[] };

/** What a bulk delete is about to do, and what it will leave alone. */
function bulkPrompt(chosen: Chosen[], deletable: number): string {
	const blocked = chosen.length - deletable;
	const inUse = chosen.filter(
		(c) => c.usage.length && !c.usage.some((u) => u.blocking),
	).length;
	return [
		blocked
			? `${plural(blocked, "file")} of the ${chosen.length} selected ${blocked === 1 ? "is" : "are"} inside someone's content and will be kept.`
			: "",
		inUse
			? `⚠ ${inUse} of the ${deletable} to delete ${inUse > 1 ? "are" : "is"} still used by other records and will leave broken images.`
			: "",
		`Delete ${plural(deletable, "file")}? This can't be undone.`,
	]
		.filter(Boolean)
		.join("\n\n");
}

/** One line, for a toast, which does not. */
function placesInline(usage: MediaUsage[]): string {
	const shown = usage.slice(0, 3).map(named);
	const more = usage.length - shown.length;
	return `${plural(usage.length, "place")} (${shown.join(", ")}${more > 0 ? `, and ${more} more` : ""})`;
}

const isImage = (m: MediaRow) => !!m.contentType?.startsWith("image/");
const isVideo = (m: MediaRow) => !!m.contentType?.startsWith("video/");
const extOf = (m: MediaRow) =>
	(
		m.contentType?.split("/")[1] ||
		mediaStorageName(m)?.split(".").pop() ||
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
	const closePreview = useCallback(() => setPreview(null), []);
	const fileRef = useRef<HTMLInputElement>(null);

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
	// a rejected query must still clear `loading`, or the grid shows skeletons
	// until the operator reloads the page
	const reset = useCallback(async () => {
		const req = ++reqRef.current;
		setLoading(true);
		offsetRef.current = 0;
		try {
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
		} catch {
			if (req !== reqRef.current) return;
			hasMoreRef.current = false;
			setHasMore(false);
			toast("Could not load the media library. Try again.", "error");
		} finally {
			if (req === reqRef.current) setLoading(false);
			busyRef.current = false;
		}
	}, [debounced, filter]);

	// Append the next page (infinite scroll).
	async function loadMore() {
		if (busyRef.current || !hasMoreRef.current || loading) return;
		busyRef.current = true;
		setLoadingMore(true);
		const req = reqRef.current;
		try {
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
		} catch {
			// leaving busyRef set would kill scrolling for the rest of the session
		} finally {
			setLoadingMore(false);
			busyRef.current = false;
		}
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

	// re-runs on loading, so the sentinel is only observed once it is past the
	// skeletons: the observer only fires on a change, so a sentinel that is
	// already in view when the grid renders would never load page 2
	useEffect(() => {
		if (loading) return;
		const el = sentinelRef.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			(entries) => entries[0]?.isIntersecting && loadMoreRef.current(),
			{ rootMargin: "600px" },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [loading]);

	async function uploadFiles(files: FileList | File[]) {
		const list = [...files];
		if (!list.length) return;
		setUpload({ done: 0, total: list.length });
		const failed: string[] = [];
		try {
			for (let i = 0; i < list.length; i++) {
				const fd = new FormData();
				fd.append("file", list[i]);
				// a dropped connection mid-batch would otherwise leave the header
				// stuck on "Uploading n/N" and the file input disabled
				const res = await fetch("/api/media/upload", {
					method: "POST",
					body: fd,
				}).catch(() => null);
				if (!res) failed.push(`${list[i].name}: upload failed (no connection)`);
				else if (!res.ok) failed.push(`${list[i].name}: ${await reason(res)}`);
				setUpload({ done: i + 1, total: list.length });
			}
		} finally {
			setUpload(null);
			if (fileRef.current) fileRef.current.value = "";
		}
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
			(await trpcClient.adminMedia.usage.query({ id }).catch(() => null));
		if (!u) {
			toast(
				"Could not check where this image is used, so it was not deleted. Try again.",
				"error",
			);
			return;
		}
		// a url inside someone's content cannot be cleared for them, so the server
		// refuses: offering "delete anyway" here would be a choice that never holds
		const blocking = u.filter((x) => x.blocking);
		if (blocking.length) {
			toast(
				`This file is still in ${placesInline(blocking)}. ${REMOVE_FIRST}`,
				"error",
			);
			return;
		}
		let msg = "Delete this media item? This can't be undone.";
		if (u.length)
			msg = `⚠ This image is still used in ${placeList(u)}.\n\nDeleting it will leave ${u.length > 1 ? "those records" : "that record"} with a broken/missing image. Delete anyway?`;
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
				trpcClient.adminMedia.usage.query({ id }).catch(() => null),
			),
		);
		if (usages.some((u) => u === null)) {
			toast(
				"Could not check where these images are used, so nothing was deleted. Try again.",
				"error",
			);
			return;
		}
		// the blocked ones are left selected, so the operator can see which they are
		const chosen = ids.map((id, i) => ({ id, usage: usages[i] ?? [] }));
		const deletable = chosen.filter((c) => !c.usage.some((u) => u.blocking));
		const blocked = chosen.length - deletable.length;
		if (!deletable.length) {
			toast(
				`${plural(blocked, "file")} ${blocked === 1 ? "is" : "are"} inside someone's content. ${REMOVE_FIRST}`,
				"error",
			);
			return;
		}
		if (!(await confirm(bulkPrompt(chosen, deletable.length)))) return;
		setBulkBusy(true);
		try {
			const results = await Promise.allSettled(
				deletable.map((c) => trpcClient.adminMedia.delete.mutate({ id: c.id })),
			);
			const gone = deletable
				.filter((_, i) => results[i].status === "fulfilled")
				.map((c) => c.id);
			dropLocal(gone);
			const stuck = results
				.filter((r) => r.status === "rejected")
				.map((r) => deleteReason(r.reason));
			if (stuck.length)
				toast(
					`${plural(stuck.length, "item")} could not be deleted: ${[...new Set(stuck)].join("; ")}`,
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
				formatBytes(stats.bytes),
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
						const name = mediaDisplayName(m);
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
								{/* the name takes the tile's full width; sharing a row with the
								    two buttons cut it to about a dozen characters */}
								<div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100">
									<span className="pointer-events-auto flex justify-end gap-2">
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
									<span className="pointer-events-auto min-w-0">
										{/* two lines, not one: a phone's tile is half a name wide and a
										    title tooltip is not reachable by thumb */}
										<span
											className="line-clamp-2 text-[13px] font-medium break-words text-white"
											title={name}
										>
											{name}
										</span>
										{formatSize(m) ? (
											<span
												className={`block truncate text-xs tabular-nums ${isLowResolution(m) ? "text-admin-warning" : "text-white/70"}`}
											>
												{formatSize(m)}
												{isLowResolution(m) && " · small"}
											</span>
										) : null}
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
							className="mx-auto size-8 text-admin-accent-ink"
						/>
						<p className="mt-2 text-base font-semibold text-admin-ink">
							Drop files to upload
						</p>
					</div>
				</div>
			)}

			{preview && (
				<MediaDetail
					item={preview}
					copied={copiedId === preview.id}
					onCopy={() => copy(preview)}
					onClose={closePreview}
					onDelete={(known) => del(preview.id, known)}
				/>
			)}
		</div>
	);
}
