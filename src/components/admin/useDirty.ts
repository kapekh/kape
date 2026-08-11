import { useBlocker } from "@tanstack/react-router";
import { useRef } from "react";

import { confirm } from "@/components/Dialogs";

// ready is a parameter, not a guess: nothing in here separates a query landing from a real edit
export function useDirty(
	snapshot: string,
	savedSignal?: unknown,
	ready = true,
): boolean {
	const baseline = useRef(snapshot);
	const settled = useRef(false);
	const lastSignal = useRef(savedSignal);

	// during render, not an effect: an effect baselines a frame late and the form reports itself dirty
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

// only guards forms that report a save: a create form is still dirty when its own save navigates away
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
