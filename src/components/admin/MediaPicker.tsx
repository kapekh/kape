import { ExternalLink, FileText, ImagePlus } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { type MediaItem, MediaLibraryDialog } from "./MediaLibraryDialog";

export type MediaLite = MediaItem;

const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i;

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
	const chosenId = useId();

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
	// The field's own <label> names the trigger, so the filename rides along as
	// its description instead: overriding the name would drop the field caption.
	const chosenName = previewUrl
		? (previewUrl.split("/").pop()?.split("?")[0] ?? previewUrl)
		: "";

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
				aria-describedby={chosenName ? chosenId : undefined}
				className={`group relative ${aspectCls} grid w-full place-items-center overflow-hidden rounded-xl border border-dashed border-admin-border bg-admin-panel transition-colors duration-150 ease-out hover:border-admin-accent hover:bg-admin-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50`}
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
							<span className="absolute inset-0 grid place-items-center bg-black/0 text-sm font-medium text-transparent transition-colors duration-150 ease-out group-hover:bg-black/40 group-hover:text-white">
								Change image
							</span>
						</>
					) : (
						<FileText
							aria-hidden="true"
							className="size-12 text-admin-ink-subtle"
						/>
					)
				) : (
					<span className="flex items-center gap-2 px-3 text-center text-sm text-admin-ink-muted">
						<ImagePlus aria-hidden="true" className="size-4" />
						{placeholder}
					</span>
				)}
			</button>

			{previewUrl && (
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<p
						id={chosenId}
						className="w-full truncate text-[13px] text-admin-ink-muted"
						title={chosenName}
					>
						{chosenName}
					</p>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={() => setOpen(true)}
					>
						Change
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={clear}
						className="text-admin-danger hover:bg-admin-danger-soft hover:text-admin-danger"
					>
						Remove
					</Button>
					{!isImg && (
						<Button asChild size="sm" variant="ghost">
							<a href={previewUrl} target="_blank" rel="noopener noreferrer">
								<ExternalLink aria-hidden="true" />
								Open file
							</a>
						</Button>
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
