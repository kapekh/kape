import { useBlocker } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { confirm } from "@/components/Dialogs";

/**
 * Tracks whether an admin form has unsaved changes.
 *
 * Pass a serialised snapshot of the *exact data that would be saved* (typically
 * `JSON.stringify(onSubmitPayload)`); the hook returns `true` when it differs
 * from the baseline. Editing then undoing a change returns to the baseline, so
 * `dirty` correctly flips back to `false`.
 *
 * The baseline resets to the current snapshot whenever `savedSignal` changes
 * (i.e. a save completed — pass the route's `savedAt`), so the Save button
 * re-disables after saving and re-enables only on the next real edit.
 *
 * Using the save payload as the snapshot means a missed field can only ever
 * make Save *enabled* when it needn't be — never disabled while a real change
 * is pending — so unsaved work can't be silently lost.
 */
export function useDirty(snapshot: string, savedSignal?: unknown): boolean {
	const [baseline, setBaseline] = useState(snapshot);
	const lastSignal = useRef(savedSignal);
	useEffect(() => {
		if (savedSignal !== lastSignal.current) {
			lastSignal.current = savedSignal;
			setBaseline(snapshot);
		}
	}, [savedSignal, snapshot]);
	return snapshot !== baseline;
}

/**
 * `useDirty` plus a way out that isn't silent: a click on the sidebar, the
 * browser back button or a tab close while edits are pending asks first
 * instead of discarding them. Kept separate from `useDirty` because the
 * blocker needs router context and the plain hook must stay usable without it.
 *
 * Only guards forms that report a save (`savedSignal`). A create form has no
 * such signal, so it is still dirty at the moment its own save navigates to the
 * new record's editor — guarding it would challenge the editor for work that
 * was just written.
 */
export function useDirtyGuard(
	snapshot: string,
	savedSignal?: unknown,
): boolean {
	const dirty = useDirty(snapshot, savedSignal);
	useBlocker({
		disabled: !dirty || savedSignal === undefined,
		enableBeforeUnload: dirty,
		shouldBlockFn: async () =>
			!(await confirm({
				title: "Unsaved changes",
				message: "Leave this page and lose the edits you have not saved?",
				confirmLabel: "Discard changes",
				cancelLabel: "Keep editing",
				danger: true,
			})),
	});
	return dirty;
}
