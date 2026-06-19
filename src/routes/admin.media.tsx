import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/media")({
	component: MediaLibrary,
});

type MediaRow = Awaited<ReturnType<typeof trpcClient.adminMedia.list.query>>[number];

function MediaLibrary() {
	const [items, setItems] = useState<MediaRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	async function refresh() {
		setItems(await trpcClient.adminMedia.list.query());
		setLoading(false);
	}
	useEffect(() => {
		refresh();
	}, []);

	async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (!f) return;
		setBusy(true);
		const fd = new FormData();
		fd.append("file", f);
		const res = await fetch("/api/media/upload", { method: "POST", body: fd });
		setBusy(false);
		if (fileRef.current) fileRef.current.value = "";
		if (res.ok) refresh();
		else window.alert("Upload failed");
	}

	async function del(id: number) {
		if (!window.confirm("Delete this media item?")) return;
		await trpcClient.adminMedia.delete.mutate({ id });
		setItems((xs) => xs.filter((x) => x.id !== id));
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-display text-2xl font-semibold text-primary">Media</h1>
				<label className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 cursor-pointer">
					{busy ? "Uploading…" : "+ Upload"}
					<input ref={fileRef} type="file" className="hidden" onChange={onFile} disabled={busy} />
				</label>
			</div>
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : items.length === 0 ? (
				<p className="text-sm text-muted-foreground">No media yet. Upload an image or file.</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					{items.map((m) => (
						<div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden">
							<div className="aspect-video bg-muted grid place-items-center overflow-hidden">
								{m.contentType?.startsWith("image/") ? (
									<img src={m.url ?? ""} alt="" className="h-full w-full object-cover" />
								) : (
									<span className="text-3xl">📄</span>
								)}
							</div>
							<div className="p-2 text-xs">
								<input readOnly value={m.url ?? ""} onFocus={(e) => e.currentTarget.select()} className="w-full bg-transparent text-foreground/70 truncate" />
								<button type="button" onClick={() => del(m.id)} className="mt-1 text-destructive hover:underline">Delete</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
