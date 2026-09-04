import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useRefreshAfterSave } from "#/lib/after-save";
import { rememberVersion, useInlineEdit, versionFor } from "#/lib/inline-edit";
import { moveItem } from "#/lib/reorder";
import { saveErrorMessage } from "#/lib/save-error";
import { sectionDef } from "#/lib/sections";

import type { EditIdentity } from "./SectionRenderer";

// buttons, not a drag: a section is a full-viewport band
export function SectionMove({
	identity,
	ids,
	index,
	type,
}: {
	identity: EditIdentity;
	/** Every section on the page, in the order it is stored. */
	ids: string[];
	index: number;
	type: string;
}) {
	const { setStatus, bumpRevision } = useInlineEdit();
	const refresh = useRefreshAfterSave();
	const [busy, setBusy] = useState(false);
	if (identity.entity !== "page" || ids.length < 2) return null;
	const name = sectionDef(type)?.label ?? type;
	const label = `${name} section order`;

	const move = async (to: number) => {
		setBusy(true);
		setStatus({ kind: "saving", label });
		try {
			const result = await trpcClient.adminPages.reorderSections.mutate({
				id: identity.entityId,
				ids: moveItem(ids, index, to),
				expectedUpdatedAt: versionFor(identity.entity, identity.entityId),
			});
			rememberVersion(identity.entity, identity.entityId, result.updatedAt);
			// the refresh reports for itself, so only a refused move lands below
			if (await refresh(label)) bumpRevision();
		} catch (err) {
			setStatus({ kind: "error", label, message: saveErrorMessage(err) });
		} finally {
			setBusy(false);
		}
	};

	const step =
		"grid size-7 place-items-center rounded-full text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

	return (
		<div className="absolute right-4 top-4 z-40 print:hidden">
			<div className="flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
				<button
					type="button"
					disabled={busy || index === 0}
					onClick={() => void move(index - 1)}
					aria-label={`Move the ${name} section up`}
					title={`Move the ${name} section up`}
					className={step}
				>
					<ChevronUp className="size-4" aria-hidden />
				</button>
				<button
					type="button"
					disabled={busy || index === ids.length - 1}
					onClick={() => void move(index + 1)}
					aria-label={`Move the ${name} section down`}
					title={`Move the ${name} section down`}
					className={step}
				>
					<ChevronDown className="size-4" aria-hidden />
				</button>
			</div>
		</div>
	);
}
