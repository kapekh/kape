import { useRouter } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { lazy, type ReactNode, Suspense, useState } from "react";

import { useInlineEdit } from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import { IMAGE_ACCEPT } from "#/lib/upload-types";
import { cn } from "#/lib/utils";
import type { MediaItem } from "./admin/MediaLibraryDialog";

// admin-only, so it stays out of the public bundle until the switch is on
const MediaLibraryDialog = lazy(() =>
	import("./admin/MediaLibraryDialog").then((m) => ({
		default: m.MediaLibraryDialog,
	})),
);

const BADGE =
	"grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card";

/**
 * The camera button over an image, and the media library behind it. `save`
 * writes the pick wherever that image is stored; the reload and what the bar
 * says happen here, the same way for every image on the page.
 */
export function InlineImageEdit({
	label,
	hasImage,
	className,
	badgeClassName,
	children,
	save,
}: {
	label: string;
	hasImage: boolean;
	/** Where the button sits, against whichever box holds the image. */
	className?: string;
	badgeClassName?: string;
	/** Drawn behind the badge, e.g. the tint a portrait grows on hover. */
	children?: ReactNode;
	save: (media: MediaItem) => Promise<void>;
}) {
	const { may, setStatus } = useInlineEdit();
	const router = useRouter({ warn: false });
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const action = `${hasImage ? "Replace" : "Add"} ${label}`;

	const choose = async (media: MediaItem) => {
		setOpen(false);
		setSaving(true);
		setStatus({ kind: "saving", label });
		try {
			await save(media);
			router?.options.context.queryClient.removeQueries();
			await router?.invalidate();
			setStatus({ kind: "saved", label });
		} catch (err) {
			setStatus({ kind: "error", label, message: saveErrorMessage(err) });
		} finally {
			setSaving(false);
		}
	};

	// the picker reads and writes the media library, which is its own permission
	if (!may("media")) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				disabled={saving}
				title={action}
				className={cn(
					"z-30 transition disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 print:hidden",
					className,
				)}
			>
				{children}
				<span className={cn(BADGE, badgeClassName)}>
					<Camera className="size-4" aria-hidden />
				</span>
				<span className="sr-only">{action}</span>
			</button>
			{open && (
				<Suspense fallback={null}>
					<MediaLibraryDialog
						open
						kind="image"
						accept={IMAGE_ACCEPT}
						onClose={() => setOpen(false)}
						onSelect={(m) => void choose(m)}
					/>
				</Suspense>
			)}
		</>
	);
}
