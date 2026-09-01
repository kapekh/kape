import { useRouter } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useInlineEdit } from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import { IMAGE_ACCEPT } from "#/lib/upload-types";

// admin-only, so it stays out of the public bundle until the switch is on
const MediaLibraryDialog = lazy(() =>
	import("./admin/MediaLibraryDialog").then((m) => ({
		default: m.MediaLibraryDialog,
	})),
);

export function useMayEditPeople(): boolean {
	const { editing, may } = useInlineEdit();
	return editing && may("people");
}

export function PersonPhotoEdit({
	personId,
	name,
	hasPhoto,
}: {
	personId: number;
	name: string;
	hasPhoto: boolean;
}) {
	const { may, setStatus } = useInlineEdit();
	const router = useRouter({ warn: false });
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const label = `${name || "Team member"} photo`;
	const action = `${hasPhoto ? "Replace" : "Add"} ${label}`;

	const choose = async (mediaId: number) => {
		setOpen(false);
		setSaving(true);
		setStatus({ kind: "saving", label });
		try {
			await trpcClient.adminPeople.setPhoto.mutate({
				id: personId,
				photoMediaId: mediaId,
			});
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
				className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full transition group-hover:scale-105 disabled:cursor-wait"
			>
				<span className="absolute inset-0 rounded-full bg-primary/0 transition group-hover:bg-primary/45" />
				<span className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card">
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
						onSelect={(m) => void choose(m.id)}
					/>
				</Suspense>
			)}
		</>
	);
}
