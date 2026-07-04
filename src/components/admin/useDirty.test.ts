// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDirty } from "./useDirty";

describe("useDirty", () => {
	it("is clean initially, dirty on change, and clean again when reverted", () => {
		const { result, rerender } = renderHook(({ snap, sig }) => useDirty(snap, sig), {
			initialProps: { snap: "A", sig: 0 },
		});
		expect(result.current).toBe(false); // baseline = "A"
		rerender({ snap: "B", sig: 0 });
		expect(result.current).toBe(true); // changed
		rerender({ snap: "A", sig: 0 });
		expect(result.current).toBe(false); // reverted to baseline → not dirty
	});

	it("resets the baseline when savedSignal changes (save completed)", () => {
		const { result, rerender } = renderHook(({ snap, sig }) => useDirty(snap, sig), {
			initialProps: { snap: "A", sig: 0 },
		});
		rerender({ snap: "B", sig: 0 });
		expect(result.current).toBe(true); // edited, unsaved
		rerender({ snap: "B", sig: 1 }); // save completed → signal changes
		expect(result.current).toBe(false); // baseline is now "B"
		rerender({ snap: "C", sig: 1 });
		expect(result.current).toBe(true); // a fresh edit after saving
	});
});
