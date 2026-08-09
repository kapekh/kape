import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
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
type Filter = "all" | "image" | "file";
type Stats = { total: number; images: number; files: number; bytes: number };

const PAGE = 30;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const isImage = (m: MediaRow) => !!m.contentType?.startsWith("image/");
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

	// Esc closes the lightbox.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
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

	async function bulkDelete() {
		const ids = [...selected];
		if (!ids.length) return;
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
	}

	function toggle(id: number) {
		setSelected((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}

	const previewSize = preview ? fmtBytes(preview.size) : null;

	const tab = (active: boolean) =>
		`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

	return (
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
			{/* Header */}
			<div className="mb-5 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-2xl font-semibold text-primary">
						Media library
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{stats ? (
							<>
								{plural(stats.total, "item")} · {plural(stats.images, "image")}
								{stats.files ? ` · ${plural(stats.files, "file")}` : ""}
								{stats.bytes ? ` · ${fmtBytes(stats.bytes)}` : ""}
							</>
						) : (
							"Loading…"
						)}
					</p>
				</div>
				<label className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 cursor-pointer shadow-[var(--shadow-lift)]">
					{upload ? `Uploading ${upload.done}/${upload.total}…` : "↑ Upload"}
					<input
						ref={fileRef}
						type="file"
						multiple
						className="hidden"
						onChange={(e) => e.target.files && uploadFiles(e.target.files)}
						disabled={!!upload}
					/>
				</label>
			</div>

			{/* Toolbar */}
			<div className="mb-5 flex flex-wrap items-center gap-3">
				<div className="relative flex-1 min-w-[200px] max-w-sm">
					<svg
						aria-hidden="true"
						className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<circle cx="11" cy="11" r="7" />
						<path d="M21 21l-4-4" strokeLinecap="round" />
					</svg>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by name or URL…"
						className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
					/>
				</div>
				<div className="flex gap-1 rounded-xl border border-border p-1">
					<button
						type="button"
						onClick={() => setFilter("all")}
						className={tab(filter === "all")}
					>
						All
					</button>
					<button
						type="button"
						onClick={() => setFilter("image")}
						className={tab(filter === "image")}
					>
						Images
					</button>
					<button
						type="button"
						onClick={() => setFilter("file")}
						className={tab(filter === "file")}
					>
						Files
					</button>
				</div>
				{selected.size > 0 && (
					<div className="ml-auto flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-2 py-1">
						<span className="px-2 text-sm font-medium text-foreground">
							{selected.size} selected
						</span>
						<button
							type="button"
							onClick={() => setSelected(new Set())}
							className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
						>
							Clear
						</button>
						<button
							type="button"
							onClick={bulkDelete}
							className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90"
						>
							Delete
						</button>
					</div>
				)}
			</div>

			{/* Grid */}
			{loading ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{Array.from({ length: 10 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length loading skeleton, no data behind it
							key={i}
							className="aspect-square animate-pulse rounded-xl bg-muted"
						/>
					))}
				</div>
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
					<div className="text-4xl">🖼️</div>
					<p className="mt-3 font-medium text-foreground">
						{debounced || filter !== "all"
							? "Nothing matches your filter"
							: "No media yet"}
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{debounced || filter !== "all"
							? "Try a different search or filter."
							: "Drag files here or use the Upload button."}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{items.map((m) => {
						const sel = selected.has(m.id);
						return (
							<div
								key={m.id}
								className={`group relative overflow-hidden rounded-xl border bg-card transition ${sel ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-border hover:shadow-[var(--shadow-soft)]"}`}
							>
								<button
									type="button"
									onClick={() => setPreview(m)}
									className="block aspect-square w-full overflow-hidden bg-muted"
								>
									{isImage(m) ? (
										<img
											src={m.url ?? ""}
											alt={nameOf(m)}
											loading="lazy"
											className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									) : (
										<span className="grid h-full w-full place-items-center text-4xl">
											📄
										</span>
									)}
								</button>
								<button
									type="button"
									onClick={() => toggle(m.id)}
									aria-label="Select"
									className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md border transition ${sel ? "border-[var(--accent)] bg-[var(--accent)] text-accent-foreground" : "border-white/70 bg-black/30 text-transparent opacity-0 group-hover:opacity-100"}`}
								>
									<svg
										aria-hidden="true"
										viewBox="0 0 24 24"
										className="h-4 w-4"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
									>
										<path
											d="M5 13l4 4L19 7"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
								<span className="absolute right-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white opacity-0 transition group-hover:opacity-100">
									{extOf(m)}
								</span>
								<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/75 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
									<span
										className="pointer-events-auto truncate text-xs font-medium text-white"
										title={nameOf(m)}
									>
										{nameOf(m)}
									</span>
									<span className="pointer-events-auto flex flex-none gap-1">
										<button
											type="button"
											onClick={() => copy(m)}
											title="Copy URL"
											aria-label="Copy URL"
											className="grid h-7 w-7 place-items-center rounded-md bg-white/15 text-white hover:bg-white/30"
										>
											{copiedId === m.id ? (
												"✓"
											) : (
												<svg
													aria-hidden="true"
													viewBox="0 0 24 24"
													className="h-4 w-4"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<rect x="9" y="9" width="11" height="11" rx="2" />
													<path d="M5 15V5a2 2 0 0 1 2-2h10" />
												</svg>
											)}
										</button>
										<button
											type="button"
											onClick={() => del(m.id)}
											title="Delete"
											aria-label="Delete"
											className="grid h-7 w-7 place-items-center rounded-md bg-white/15 text-white hover:bg-destructive"
										>
											<svg
												aria-hidden="true"
												viewBox="0 0 24 24"
												className="h-4 w-4"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											>
												<path
													d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
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
				<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
					<span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />{" "}
					Loading more…
				</div>
			)}
			{!loading && !hasMore && items.length > 0 && (
				<p className="py-6 text-center text-xs text-muted-foreground">
					That's everything — {items.length} shown.
				</p>
			)}

			{/* Drag overlay */}
			{dragging && (
				<div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-primary/20 backdrop-blur-sm">
					<div className="rounded-3xl border-2 border-dashed border-primary bg-card px-10 py-8 text-center shadow-2xl">
						<div className="text-4xl">⬇</div>
						<p className="mt-2 font-display text-lg font-semibold text-primary">
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
						className="absolute inset-0 bg-black/70 backdrop-blur-sm"
						onClick={() => setPreview(null)}
					/>
					<div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:grid-cols-[1fr_360px]">
						<div className="grid min-h-[260px] place-items-center bg-muted">
							{isImage(preview) ? (
								<img
									src={preview.url ?? ""}
									alt={nameOf(preview)}
									className="max-h-[70vh] w-full object-contain"
								/>
							) : (
								<span className="text-6xl">📄</span>
							)}
						</div>
						<div className="flex flex-col p-5">
							<div className="mb-3 flex items-start justify-between gap-2">
								<h2 className="font-display text-lg font-semibold text-primary break-words">
									{nameOf(preview)}
								</h2>
								<button
									type="button"
									onClick={() => setPreview(null)}
									className="grid h-8 w-8 flex-none place-items-center rounded-full border border-border text-foreground/60 hover:bg-muted"
								>
									✕
								</button>
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
							<div className="mt-3">
								<div className="text-xs font-medium text-muted-foreground mb-1">
									URL
								</div>
								<input
									readOnly
									value={preview.url ?? ""}
									onFocus={(e) => e.currentTarget.select()}
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground/70"
								/>
							</div>

							{/* Where this media is used */}
							<div className="mt-4">
								<div className="mb-1.5 flex items-center gap-2">
									<span className="text-xs font-medium text-muted-foreground">
										Used in
									</span>
									{usage && (
										<span
											className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${usage.length ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-muted text-muted-foreground"}`}
										>
											{usage.length
												? `${usage.length} place${usage.length > 1 ? "s" : ""}`
												: "Unused"}
										</span>
									)}
								</div>
								{usage === null ? (
									<p className="text-xs text-muted-foreground">Checking…</p>
								) : usage.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										Not referenced anywhere — safe to delete.
									</p>
								) : (
									<ul className="max-h-40 space-y-1 overflow-y-auto pr-1 thin-scroll">
										{usage.map((u, i) => (
											<li
												// biome-ignore lint/suspicious/noArrayIndexKey: read-only usage list, no reorder or delete while mounted
												key={i}
												className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-xs"
											>
												<span className="min-w-0">
													<span className="text-[10px] uppercase tracking-wide text-[var(--accent)] font-semibold">
														{u.kind}
													</span>
													<span
														className="block truncate text-foreground"
														title={u.label}
													>
														{u.label}
													</span>
												</span>
												{u.href && (
													<a
														href={u.href}
														className="flex-none rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
													>
														Open
													</a>
												)}
											</li>
										))}
									</ul>
								)}
							</div>

							<div className="mt-auto flex items-center gap-2 pt-5">
								<button
									type="button"
									onClick={() => copy(preview)}
									className="flex-1 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
								>
									{copiedId === preview.id ? "Copied ✓" : "Copy URL"}
								</button>
								<a
									href={preview.url ?? "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
								>
									Open ↗
								</a>
								<button
									type="button"
									onClick={() => del(preview.id, usage)}
									className="whitespace-nowrap rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
								>
									Delete
								</button>
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
		<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right font-medium text-foreground break-all">
				{value}
			</dd>
		</div>
	);
}
