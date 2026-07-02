import { useEffect, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { toast } from "@/components/Dialogs";

export type MediaItem = { id: number; url: string | null; contentType: string | null };

export function isImageMedia(m: { contentType: string | null; url: string | null }): boolean {
	return m.contentType ? m.contentType.startsWith("image/") : /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(m.url ?? "");
}

const PAGE = 24;

/**
 * Reusable media-library modal: a searchable thumbnail grid + upload. Loads media
 * a page at a time (server-side filter + search) with infinite scroll inside the
 * modal, so it scales to thousands of assets. `onSelect` fires with the chosen
 * item (also after a successful upload); the parent decides what to do and close.
 */
export function MediaLibraryDialog({
	open,
	onClose,
	onSelect,
	kind = "all",
	accept,
	selectedId,
	selectedUrl,
}: {
	open: boolean;
	onClose: () => void;
	onSelect: (m: MediaItem) => void;
	kind?: "image" | "all";
	accept?: string;
	selectedId?: number | null;
	selectedUrl?: string | null;
}) {
	const [items, setItems] = useState<MediaItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [busy, setBusy] = useState(false); // upload
	const [q, setQ] = useState("");
	const [debounced, setDebounced] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	const offsetRef = useRef(0);
	const reqRef = useRef(0);
	const busyRef = useRef(false);
	const hasMoreRef = useRef(true);
	const scrollRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const type = kind === "image" ? "image" : "all";

	async function reset() {
		const req = ++reqRef.current;
		setLoading(true);
		offsetRef.current = 0;
		const rows = await trpcClient.adminMedia.page.query({ limit: PAGE, offset: 0, query: debounced, type });
		if (req !== reqRef.current) return;
		offsetRef.current = rows.length;
		hasMoreRef.current = rows.length === PAGE;
		setItems(rows.map((x) => ({ id: x.id, url: x.url, contentType: x.contentType })));
		setLoading(false);
		busyRef.current = false;
	}

	async function loadMore() {
		if (busyRef.current || !hasMoreRef.current || loading) return;
		busyRef.current = true;
		setLoadingMore(true);
		const req = reqRef.current;
		const rows = await trpcClient.adminMedia.page.query({ limit: PAGE, offset: offsetRef.current, query: debounced, type });
		if (req === reqRef.current) {
			offsetRef.current += rows.length;
			hasMoreRef.current = rows.length === PAGE;
			setItems((prev) => [...prev, ...rows.map((x) => ({ id: x.id, url: x.url, contentType: x.contentType }))]);
		}
		setLoadingMore(false);
		busyRef.current = false;
	}
	const loadMoreRef = useRef(loadMore);
	loadMoreRef.current = loadMore;

	// Debounce search.
	useEffect(() => {
		const t = setTimeout(() => setDebounced(q.trim()), 300);
		return () => clearTimeout(t);
	}, [q]);

	// (Re)load page 1 when the dialog opens or the filter/search changes.
	useEffect(() => {
		if (open) reset();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, debounced, type]);

	// Infinite-scroll sentinel — observed within the modal's own scroll container.
	// Re-runs when `loading` flips so it attaches once the sentinel is mounted
	// (the sentinel only renders after the first page loads, past the skeletons).
	useEffect(() => {
		if (!open || loading) return;
		const el = sentinelRef.current;
		const root = scrollRef.current;
		if (!el || !root) return;
		const obs = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMoreRef.current(), { root, rootMargin: "300px" });
		obs.observe(el);
		return () => obs.disconnect();
	}, [open, loading]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	async function upload(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (!f) return;
		setBusy(true);
		const fd = new FormData();
		fd.append("file", f);
		const res = await fetch("/api/media/upload", { method: "POST", body: fd });
		setBusy(false);
		if (fileRef.current) fileRef.current.value = "";
		if (!res.ok) {
			toast("Upload failed", "error");
			return;
		}
		const d = (await res.json()) as { id: number; url: string };
		const item: MediaItem = { id: d.id, url: d.url, contentType: f.type };
		setItems((x) => [item, ...x]);
		offsetRef.current += 1; // keep pagination aligned after the prepend
		onSelect(item);
	}

	return (
		<div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]">
				<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
					<h3 className="font-display font-semibold text-primary">Media library</h3>
					<div className="flex items-center gap-2">
						<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]" />
						<label className="cursor-pointer rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
							{busy ? "Uploading…" : "↑ Upload"}
							<input ref={fileRef} type="file" accept={accept} className="hidden" onChange={upload} disabled={busy} />
						</label>
						<button type="button" onClick={onClose} aria-label="Close" className="px-1 text-xl leading-none text-muted-foreground hover:text-foreground">×</button>
					</div>
				</div>
				<div ref={scrollRef} className="thin-scroll overflow-y-auto p-4">
					{loading ? (
						<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />)}
						</div>
					) : items.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">{debounced ? "No matches." : "No media yet — upload a file to get started."}</p>
					) : (
						<>
							<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
								{items.map((m) => {
									const selected = selectedId != null ? m.id === selectedId : selectedUrl != null && m.url === selectedUrl;
									return (
										<button
											key={m.id}
											type="button"
											onClick={() => onSelect(m)}
											className={`group relative aspect-square overflow-hidden rounded-lg border text-left transition ${selected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-border hover:border-[var(--accent)]"}`}
										>
											{isImageMedia(m) && m.url ? (
												<img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
											) : (
												<span className="grid h-full w-full place-items-center bg-muted text-3xl">📄</span>
											)}
											<span className="absolute inset-x-0 bottom-0 truncate bg-foreground/70 px-1.5 py-0.5 text-[10px] text-background">#{m.id} · {(m.contentType ?? "file").replace("application/", "")}</span>
										</button>
									);
								})}
							</div>
							<div ref={sentinelRef} className="h-px" />
							{loadingMore && <p className="py-4 text-center text-xs text-muted-foreground">Loading more…</p>}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
