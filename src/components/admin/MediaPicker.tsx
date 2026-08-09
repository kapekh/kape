import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { type MediaItem, MediaLibraryDialog } from "./MediaLibraryDialog";

export type MediaLite = MediaItem;

const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i;

/**
 * File field backed by the media library. Shows a preview; click to open the
 * library (grid + upload) and pick. Self-contained — just give it value/onChange.
 *
 * mode="url" → emits the file URL (e.g. post meta.fileUrl)
 * mode="id"  → emits the media id as a string (e.g. school.coverMediaId)
 */
export function MediaPicker({
	id,
	value,
	onChange,
	mode = "url",
	kind = "all",
	accept,
	aspect = "video",
	label,
}: {
	/** Lands on the trigger, so a caption's `htmlFor` names this field. */
	id?: string;
	value: string;
	onChange: (next: string) => void;
	mode?: "url" | "id";
	kind?: "image" | "all";
	accept?: string;
	aspect?: "video" | "square";
	label?: string;
}) {
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [type, setType] = useState<string | null>(null);

	// Resolve an existing id-mode value to a preview URL (one-time per value).
	useEffect(() => {
		if (mode !== "id") {
			setUrl(value);
			return;
		}
		if (!value) {
			setUrl("");
			setType(null);
			return;
		}
		let alive = true;
		trpcClient.adminMedia.byId
			.query({ id: Number(value) })
			.then((f) => {
				if (!alive) return;
				setUrl(f?.url ?? "");
				setType(f?.contentType ?? null);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [mode, value]);

	const previewUrl = mode === "id" ? url : value;
	const isImg = type ? type.startsWith("image/") : IMG_EXT.test(previewUrl);
	const aspectCls = aspect === "square" ? "aspect-square" : "aspect-video";
	const placeholder =
		label ?? (kind === "image" ? "Choose image" : "Choose file");

	function pick(m: MediaItem) {
		onChange(mode === "id" ? String(m.id) : (m.url ?? ""));
		setUrl(m.url ?? "");
		setType(m.contentType);
		setOpen(false);
	}
	function clear() {
		onChange("");
		setUrl("");
		setType(null);
	}

	return (
		<div className="w-full max-w-sm">
			<button
				id={id}
				type="button"
				onClick={() => setOpen(true)}
				className={`group relative ${aspectCls} w-full grid place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 transition hover:border-[var(--accent)] hover:bg-muted`}
			>
				{previewUrl ? (
					isImg ? (
						<>
							<img
								src={previewUrl}
								alt=""
								className="h-full w-full object-cover"
							/>
							{/* Hover affordance over the larger preview. */}
							<span className="absolute inset-0 grid place-items-center bg-black/0 text-sm font-medium text-transparent transition group-hover:bg-black/40 group-hover:text-white">
								Change image
							</span>
						</>
					) : (
						<span className="text-5xl">📄</span>
					)
				) : (
					<span className="px-3 text-center text-sm text-muted-foreground">
						+ {placeholder}
					</span>
				)}
			</button>

			{previewUrl && (
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
					>
						Change
					</button>
					<button
						type="button"
						onClick={clear}
						className="rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
					>
						Remove
					</button>
					{!isImg && (
						<a
							href={previewUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="px-3 text-xs text-[var(--accent)] hover:underline"
						>
							Open file ↗
						</a>
					)}
				</div>
			)}

			<MediaLibraryDialog
				open={open}
				onClose={() => setOpen(false)}
				onSelect={pick}
				kind={kind}
				accept={accept}
				selectedId={mode === "id" && value ? Number(value) : null}
				selectedUrl={mode === "url" ? value : undefined}
			/>
		</div>
	);
}
