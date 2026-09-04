import { describe, expect, it } from "vitest";

import { applyOrder, moveItem, sameOrder } from "./reorder";

describe("moveItem", () => {
	it("lifts an entry out and drops it where it was aimed", () => {
		expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
		expect(moveItem([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
	});

	it("clamps a target past either end", () => {
		expect(moveItem([1, 2, 3], 0, 99)).toEqual([2, 3, 1]);
		expect(moveItem([1, 2, 3], 2, -4)).toEqual([3, 1, 2]);
	});

	it("hands back the same array when nothing moves", () => {
		const list = [1, 2, 3];
		expect(moveItem(list, 1, 1)).toBe(list);
		expect(moveItem(list, 2, 5)).toBe(list);
		expect(moveItem(list, -1, 0)).toBe(list);
		expect(moveItem(list, 3, 0)).toBe(list);
		expect(moveItem([], 0, 0)).toEqual([]);
	});

	it("leaves the list it was given alone", () => {
		const list = [1, 2, 3];
		moveItem(list, 0, 2);
		expect(list).toEqual([1, 2, 3]);
	});
});

describe("sameOrder", () => {
	it("is true only for the same ids in the same places", () => {
		expect(sameOrder([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(sameOrder([], [])).toBe(true);
		expect(sameOrder([1, 2, 3], [1, 3, 2])).toBe(false);
		expect(sameOrder([1, 2], [1, 2, 3])).toBe(false);
		expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true);
	});
});

describe("applyOrder", () => {
	it("gives the reordered subset its own slots back and leaves the rest", () => {
		expect(applyOrder([1, 2, 3, 4, 5], [4, 2])).toEqual([1, 4, 3, 2, 5]);
	});

	it("keeps every id outside the subset exactly where it was", () => {
		const all = ["a", "b", "c", "d", "e"];
		const next = applyOrder(all, ["e", "b"]);
		expect(next).toEqual(["a", "e", "c", "d", "b"]);
		for (const id of ["a", "c", "d"])
			expect(next.indexOf(id)).toBe(all.indexOf(id));
	});

	it("ignores ids the page does not hold, so a stale page cannot corrupt an order", () => {
		expect(applyOrder([1, 2, 3], [9])).toEqual([1, 2, 3]);
		expect(applyOrder([1, 2, 3], [3, 9, 1])).toEqual([3, 2, 1]);
	});

	it("takes a repeated id once, in the place it was first given", () => {
		expect(applyOrder([1, 2, 3], [3, 1, 3])).toEqual([3, 2, 1]);
	});

	it("copies the order it was given when there is nothing to apply", () => {
		const all = [1, 2, 3];
		const next = applyOrder(all, []);
		expect(next).toEqual(all);
		expect(next).not.toBe(all);
		expect(applyOrder([], [1])).toEqual([]);
	});
});
