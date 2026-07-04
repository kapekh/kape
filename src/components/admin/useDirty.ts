import { useEffect, useRef, useState } from "react";

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
