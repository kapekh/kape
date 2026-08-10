import { useBlocker } from "@tanstack/react-router";
import { useRef } from "react";

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
 * Pass `ready: false` while the form's own data is still loading. Most admin
 * forms mount with empty state and fill it from a query, so a baseline fixed at
 * mount describes a form the data has not arrived at yet and every field the
 * query fills reads as an unsaved change — /admin/footer offered "leave and
 * lose the edits?" on a page nobody had touched. While `ready` is false the
 * baseline follows the snapshot; the first render where it is true fixes it.
 *
 * `ready` defaults to true, so a form whose state is complete at mount needs no
 * argument. It is a parameter rather than a guess because nothing observable
 * from in here separates a query landing from code editing a field, and a hook
 * that guessed would sooner or later discard somebody's work quietly.
 *
 * Using the save payload as the snapshot means a missed field can only ever
 * make Save *enabled* when it needn't be — never disabled while a real change
 * is pending — so unsaved work can't be silently lost.
 */
export function useDirty(
	snapshot: string,
	savedSignal?: unknown,
	ready = true,
): boolean {
	const baseline = useRef(snapshot);
	const settled = useRef(false);
	const lastSignal = useRef(savedSignal);

	// Resolved during render, not in an effect: an effect fixes the baseline one
	// frame late, and that frame is a form reporting itself dirty before anyone
	// has touched it. Re-running this render is idempotent — same inputs, same
	// baseline — so a double render under StrictMode lands in the same place.
	if (!ready) {
		baseline.current = snapshot;
		settled.current = false;
	} else if (!settled.current) {
		// the frame the data finished loading: this snapshot is what "unchanged"
		// means from here on
		baseline.current = snapshot;
		settled.current = true;
	}
	if (savedSignal !== lastSignal.current) {
		lastSignal.current = savedSignal;
		baseline.current = snapshot;
	}

	if (!ready) return false;
	return snapshot !== baseline.current;
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
	ready = true,
): boolean {
	const dirty = useDirty(snapshot, savedSignal, ready);
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
