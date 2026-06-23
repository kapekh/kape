import { useState } from "react";

import { MediaLibraryDialog } from "./MediaLibraryDialog";

/**
 * Compact image picker for table rows. Shows a small thumbnail; click to open
 * the media library and pick. `url` seeds the initial preview (from the list
 * query); `onChange` returns the chosen media id + url (or null when cleared).
 */
export function MediaThumb({
	value,
	url,
	onChange,
	shape = "square",
}: {
	value: number | null;
	url: string | null;
	onChange: (id: number | null, url: string | null) => void;
	shape?: "square" | "circle";
}) {
	const [open, setOpen] = useState(false);
	const [preview, setPreview] = useState(url);
	const radius = shape === "circle" ? "rounded-full" : "rounded-lg";
	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden ${radius} border border-dashed border-border bg-muted/40 transition hover:border-[var(--accent)]`}
				title="Choose image"
			>
				{preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="text-lg text-muted-foreground">＋</span>}
			</button>
			{preview && (
				<button type="button" onClick={() => { onChange(null, null); setPreview(null); }} className="text-xs text-destructive hover:underline" title="Remove">×</button>
			)}
			<MediaLibraryDialog
				open={open}
				onClose={() => setOpen(false)}
				kind="image"
				selectedId={value}
				onSelect={(m) => { onChange(m.id, m.url); setPreview(m.url); setOpen(false); }}
			/>
		</div>
	);
}
