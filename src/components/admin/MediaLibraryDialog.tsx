import { useEffect, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export type MediaItem = { id: number; url: string | null; contentType: string | null };

export function isImageMedia(m: { contentType: string | null; url: string | null }): boolean {
	return m.contentType ? m.contentType.startsWith("image/") : /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(m.url ?? "");
}

/**
 * Reusable media-library modal: a searchable thumbnail grid + drag-free upload.
 * Self-contained (fetches its own media). `onSelect` fires with the chosen item
 * (also after a successful upload); the parent decides what to do and close.
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
	const [loaded, setLoaded] = useState(false);
	const [busy, setBusy] = useState(false);
	const [q, setQ] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open || loaded) return;
		(async () => {
			try {
				const m = await trpcClient.adminMedia.list.query();
				setItems(m.map((x) => ({ id: x.id, url: x.url, contentType: x.contentType })));
			} catch {
				// ignore — upload still works
			}
			setLoaded(true);
		})();
	}, [open, loaded]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	const shown = items
		.filter((m) => (kind === "image" ? isImageMedia(m) : true))
		.filter((m) => !q || `${m.id} ${m.contentType ?? ""} ${m.url ?? ""}`.toLowerCase().includes(q.toLowerCase()));

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
			window.alert("Upload failed");
			return;
		}
		const d = (await res.json()) as { id: number; url: string };
		const item: MediaItem = { id: d.id, url: d.url, contentType: f.type };
		setItems((x) => [item, ...x]);
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
				<div className="thin-scroll overflow-y-auto p-4">
					{!loaded ? (
						<p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
					) : shown.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">{q ? "No matches." : "No media yet — upload a file to get started."}</p>
					) : (
						<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
							{shown.map((m) => {
								const selected = selectedId != null ? m.id === selectedId : selectedUrl != null && m.url === selectedUrl;
								return (
									<button
										key={m.id}
										type="button"
										onClick={() => onSelect(m)}
										className={`group relative aspect-square overflow-hidden rounded-lg border text-left transition ${selected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-border hover:border-[var(--accent)]"}`}
									>
										{isImageMedia(m) && m.url ? (
											<img src={m.url} alt="" className="h-full w-full object-cover" />
										) : (
											<span className="grid h-full w-full place-items-center bg-muted text-3xl">📄</span>
										)}
										<span className="absolute inset-x-0 bottom-0 truncate bg-foreground/70 px-1.5 py-0.5 text-[10px] text-background">#{m.id} · {(m.contentType ?? "file").replace("application/", "")}</span>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
