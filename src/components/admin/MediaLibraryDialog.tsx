import { FileText, Play, Upload, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { buttonVariants } from "#/components/ui/button.tsx";
import { inputClass } from "#/components/ui/input.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useModalPanel } from "#/lib/use-modal-panel";
import { toast } from "@/components/Dialogs";

export type MediaItem = {
	id: number;
	url: string | null;
	contentType: string | null;
};

export function isImageMedia(m: {
	contentType: string | null;
	url: string | null;
}): boolean {
	return m.contentType
		? m.contentType.startsWith("image/")
		: /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(m.url ?? "");
}

const isVideoMedia = (m: MediaItem) => !!m.contentType?.startsWith("video/");

/** The stored file is a UUID, but the URL still ends in the operator's name. */
const nameOfMedia = (m: MediaItem) =>
	(m.url ?? "").split("/").pop()?.split("?")[0] || `media-${m.id}`;

const PAGE = 24;

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
	const headingId = useId();
	const searchId = useId();
	const panelRef = useModalPanel(onClose, open);

	const offsetRef = useRef(0);
	const reqRef = useRef(0);
	const busyRef = useRef(false);
	const hasMoreRef = useRef(true);
	const scrollRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const type = kind === "image" ? "image" : "all";

	const reset = useCallback(async () => {
		const req = ++reqRef.current;
		setLoading(true);
		offsetRef.current = 0;
		const rows = await trpcClient.adminMedia.page.query({
			limit: PAGE,
			offset: 0,
			query: debounced,
			type,
		});
		if (req !== reqRef.current) return;
		offsetRef.current = rows.length;
		hasMoreRef.current = rows.length === PAGE;
		setItems(
			rows.map((x) => ({ id: x.id, url: x.url, contentType: x.contentType })),
		);
		setLoading(false);
		busyRef.current = false;
	}, [debounced, type]);

	async function loadMore() {
		if (busyRef.current || !hasMoreRef.current || loading) return;
		busyRef.current = true;
		setLoadingMore(true);
		const req = reqRef.current;
		const rows = await trpcClient.adminMedia.page.query({
			limit: PAGE,
			offset: offsetRef.current,
			query: debounced,
			type,
		});
		if (req === reqRef.current) {
			offsetRef.current += rows.length;
			hasMoreRef.current = rows.length === PAGE;
			setItems((prev) => [
				...prev,
				...rows.map((x) => ({
					id: x.id,
					url: x.url,
					contentType: x.contentType,
				})),
			]);
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
	}, [open, reset]);

	// re-runs on loading, so the sentinel is only attached once it is past the skeletons
	useEffect(() => {
		if (!open || loading) return;
		const el = sentinelRef.current;
		const root = scrollRef.current;
		if (!el || !root) return;
		const obs = new IntersectionObserver(
			(entries) => entries[0]?.isIntersecting && loadMoreRef.current(),
			{ root, rootMargin: "300px" },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [open, loading]);

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
			const body = (await res.json().catch(() => null)) as {
				error?: string;
			} | null;
			toast(
				`${f.name}: ${body?.error ?? `upload failed (HTTP ${res.status})`}`,
				"error",
			);
			return;
		}
		const d = (await res.json()) as { id: number; url: string };
		const item: MediaItem = { id: d.id, url: d.url, contentType: f.type };
		setItems((x) => [item, ...x]);
		offsetRef.current += 1; // keep pagination aligned after the prepend
		onSelect(item);
	}

	return (
		<div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
			<button
				type="button"
				aria-label="Close media library"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				tabIndex={-1}
				aria-labelledby={headingId}
				className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-admin-border bg-admin-panel-raised shadow-[var(--shadow-lift)] focus:outline-none"
			>
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
					<h3 id={headingId} className="text-base font-semibold text-admin-ink">
						Media library
					</h3>
					<div className="flex items-center gap-2">
						<label htmlFor={searchId} className="sr-only">
							Search media
						</label>
						<input
							id={searchId}
							type="search"
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search…"
							className={`${inputClass} h-8 w-40`}
						/>
						<label
							className={`${buttonVariants({ variant: "primary", size: "sm" })} cursor-pointer focus-within:ring-2 focus-within:ring-admin-focus/50`}
						>
							<Upload aria-hidden="true" />
							{busy ? "Uploading…" : "Upload"}
							<input
								ref={fileRef}
								type="file"
								accept={accept}
								className="sr-only"
								onChange={upload}
								disabled={busy}
							/>
						</label>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="grid size-9 shrink-0 place-items-center rounded-lg text-admin-ink-muted transition-colors duration-150 ease-out hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50"
						>
							<X aria-hidden="true" className="size-4" />
						</button>
					</div>
				</div>
				<div ref={scrollRef} className="overflow-y-auto p-4">
					{loading ? (
						<div
							aria-busy="true"
							className="grid grid-cols-3 gap-3 sm:grid-cols-4"
						>
							<span className="sr-only">Loading…</span>
							{Array.from({ length: 8 }, (_, i) => (
								<Skeleton
									// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length loading skeleton, no data behind it
									key={i}
									className="aspect-square w-full"
								/>
							))}
						</div>
					) : items.length === 0 ? (
						<p className="py-12 text-center text-[13px] text-admin-ink-muted">
							{debounced
								? "Nothing matches your search. Try a different word."
								: "No media yet. Upload a file to get started."}
						</p>
					) : (
						<>
							<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
								{items.map((m) => {
									const selected =
										selectedId != null
											? m.id === selectedId
											: selectedUrl != null && m.url === selectedUrl;
									const name = nameOfMedia(m);
									return (
										<button
											key={m.id}
											type="button"
											onClick={() => onSelect(m)}
											aria-label={`${name} · ${m.contentType ?? "file"}`}
											aria-pressed={selected}
											className={`group relative aspect-square overflow-hidden rounded-lg border text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 ${selected ? "border-admin-accent ring-2 ring-admin-accent" : "border-admin-border hover:border-admin-accent"}`}
										>
											{isImageMedia(m) && m.url ? (
												<img
													src={m.url}
													alt=""
													loading="lazy"
													className="h-full w-full object-cover"
												/>
											) : isVideoMedia(m) && m.url ? (
												// the decoded first frame is the thumbnail, so a clip
												// reads as a clip without storing a poster for it
												<span className="relative block h-full w-full">
													<video
														src={m.url}
														muted
														playsInline
														preload="metadata"
														className="h-full w-full bg-black object-cover"
													/>
													<span className="absolute inset-0 grid place-items-center">
														<span className="grid size-8 place-items-center rounded-full bg-black/60 text-white">
															<Play aria-hidden="true" className="size-4" />
														</span>
													</span>
												</span>
											) : (
												<span className="grid h-full w-full place-items-center bg-admin-neutral-soft text-admin-ink-subtle">
													<FileText aria-hidden="true" className="size-8" />
												</span>
											)}
											<span className="absolute inset-x-0 bottom-0 truncate bg-admin-ink/75 px-2 py-1 text-xs text-admin-panel">
												{name}
											</span>
										</button>
									);
								})}
							</div>
							<div ref={sentinelRef} className="h-px" />
							{loadingMore && (
								<p className="py-4 text-center text-[13px] text-admin-ink-muted">
									Loading more…
								</p>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
