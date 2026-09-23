import { ExternalLink, FileText, ImagePlus } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { mediaDisplayName } from "#/lib/media-name";
import { formatSize, type Sized } from "#/lib/media-size";
import { type MediaItem, MediaLibraryDialog } from "./MediaLibraryDialog";

type Chosen = Sized & {
	for: string;
	url: string;
	name?: string;
	type?: string | null;
};

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
	minWidth,
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
	/** Width the slot renders at. Below it the image is upscaled, so warn. */
	minWidth?: number;
}) {
	const [open, setOpen] = useState(false);
	// keyed by the field value it describes: a value the parent swapped in is a
	// different file, so a type or size read off the last pick no longer fits it
	const [chosen, setChosen] = useState<Chosen>({ for: "", url: "" });
	const [natural, setNatural] = useState<Sized & { for: string }>({ for: "" });
	const chosenId = useId();

	// Resolve the stored value to a preview and the name a person reads. A
	// url-mode field holds the address, so it is looked up by address.
	useEffect(() => {
		if (!value) {
			setChosen({ for: "", url: "" });
			return;
		}
		// url mode already knows what to draw; the lookup only adds the name
		if (mode !== "id")
			setChosen((c) => (c.for === value ? c : { for: value, url: value }));
		let alive = true;
		const found =
			mode === "id"
				? trpcClient.adminMedia.byId.query({ id: Number(value) })
				: trpcClient.adminMedia.byUrl.query({ url: value });
		found
			.then((f) => {
				if (!alive) return;
				setChosen({
					for: value,
					url: mode === "id" ? (f?.url ?? "") : value,
					name: f ? mediaDisplayName(f) : undefined,
					type: f?.contentType,
					width: f?.width,
					height: f?.height,
				});
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [mode, value]);

	const fresh = chosen.for === value ? chosen : null;
	const previewUrl = mode === "id" ? (fresh?.url ?? "") : value;
	const type = fresh?.type ?? null;
	const isImg = type ? type.startsWith("image/") : IMG_EXT.test(previewUrl);
	// the preview decodes the real file, so it answers for url-mode fields too,
	// where nothing but the address is stored
	const measured = natural.for === previewUrl ? natural : fresh;
	const size = formatSize(measured ?? {});
	const upscaled = !!(minWidth && measured?.width && measured.width < minWidth);
	const aspectCls = aspect === "square" ? "aspect-square" : "aspect-video";
	const placeholder =
		label ?? (kind === "image" ? "Choose image" : "Choose file");
	// The field's own <label> names the trigger, so the filename rides along as
	// its description instead: overriding the name would drop the field caption.
	const chosenName = previewUrl
		? (fresh?.name ?? previewUrl.split("/").pop()?.split("?")[0] ?? previewUrl)
		: "";

	function pick(m: MediaItem) {
		const next = mode === "id" ? String(m.id) : (m.url ?? "");
		onChange(next);
		setChosen({
			for: next,
			url: m.url ?? "",
			name: mediaDisplayName(m),
			type: m.contentType,
			width: m.width,
			height: m.height,
		});
		setOpen(false);
	}
	function clear() {
		onChange("");
		setChosen({ for: "", url: "" });
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
								onLoad={(e) =>
									setNatural({
										for: previewUrl,
										width: e.currentTarget.naturalWidth,
										height: e.currentTarget.naturalHeight,
									})
								}
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
				<div className="mt-2">
					<p
						id={chosenId}
						className="truncate text-[13px] text-admin-ink-muted"
						title={chosenName}
					>
						{chosenName}
						{size && <span className="ml-2 tabular-nums">{size} px</span>}
					</p>
					{upscaled && (
						<p className="mt-1 text-[13px] text-admin-warning-ink">
							This slot renders about {minWidth}px wide, so this image is
							stretched and will look soft. Upload a larger one if you have it.
						</p>
					)}
					<div className="mt-2 flex flex-wrap items-center gap-2">
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
							className="text-admin-danger-ink hover:bg-admin-danger-soft hover:text-admin-danger-ink"
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
