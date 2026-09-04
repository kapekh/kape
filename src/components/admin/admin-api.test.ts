import { describe, expect, it } from "vitest";

import * as ActionMenuModule from "./ActionMenu";
import * as formUi from "./form-ui";
import * as listUi from "./list-ui";

// pins names, arity and kind: a type checker cannot see a rename in a file nobody imported
function surface(mod: Record<string, unknown>) {
	return Object.keys(mod)
		.sort()
		.map((name) => {
			const v = mod[name];
			if (typeof v === "function") return `${name}: function/${v.length}`;
			return `${name}: ${typeof v}`;
		});
}

describe("form-ui", () => {
	it("exports what its 23 consumers import, and nothing has changed shape", () => {
		expect(surface(formUi)).toEqual([
			"EditorGrid: function/1",
			"EditorHeader: function/1",
			"Field: function/1",
			"FormSection: function/1",
			"cancelButtonClass: string",
			"dragGrip: string",
			"dragItem: string",
			"fieldInput: string",
			"fieldLabel: string",
		]);
	});

	it("dropped only the two exports with no call site", () => {
		// TextField and FormActions had zero call sites; FormActions also held the
		// second of the two primary button sizes inside this one file
		expect("TextField" in formUi).toBe(false);
		expect("FormActions" in formUi).toBe(false);
	});

	it("keeps the class strings usable on a bare element", () => {
		// they are spread onto hand-rolled <input>, <select> and <textarea> in 23
		// files, so they have to stand alone
		expect(formUi.fieldInput).toContain("w-full");
		expect(formUi.fieldLabel).toContain("block");
		expect(formUi.cancelButtonClass).toContain("inline-flex");
		// a fixed height would override the `h-8` the compact rows append
		expect(formUi.fieldInput).not.toMatch(/\bh-\d/);
	});
});

describe("list-ui", () => {
	it("exports what its 10 consumers import, and nothing has changed shape", () => {
		expect(surface(listUi)).toEqual([
			"EmptyState: function/1",
			"ListSearch: function/1",
			"ListStatus: function/1",
			"ReorderCell: function/1",
			"ReorderHead: function/0",
			"ReorderOff: function/1",
			"SortableStatus: function/1",
			"TableScroll: function/1",
			"dragRow: string",
			"matchesQuery: function/1",
			"removeWithRollback: function/4",
			"useListQuery: function/1",
			"useListReorder: function/1",
		]);
	});

	it("still filters on words rather than the whole string", () => {
		expect(listUi.matchesQuery("hun sen", "Sen Hun", null)).toBe(true);
		expect(listUi.matchesQuery("hun sen", "Hun")).toBe(false);
		expect(listUi.matchesQuery("", "anything")).toBe(true);
	});
});

describe("ActionMenu", () => {
	it("exports what its 17 consumers import", () => {
		expect(surface(ActionMenuModule)).toEqual(["ActionMenu: function/1"]);
	});
});
