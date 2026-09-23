import { describe, expect, it } from "vitest";

import { areaGuardAccess } from "./admin";

const editor = {
	kind: "ok" as const,
	email: "editor@example.org",
	role: "editor",
	isSuperAdmin: false,
	permissions: ["pages", "posts", "media"],
	modules: null,
};

describe("areaGuardAccess", () => {
	it("names the area and drops the caller's own permissions from the refusal", () => {
		expect(areaGuardAccess("/admin/users", editor)).toEqual({
			kind: "forbidden",
			email: editor.email,
			portal: false,
			area: "Users & roles",
		});
	});

	it("passes an area the caller holds straight through, unchanged", () => {
		expect(areaGuardAccess("/admin/pages", editor)).toBe(editor);
	});

	it("does not care how the path segment is cased", () => {
		expect(areaGuardAccess("/admin/Users", editor)).toEqual({
			kind: "forbidden",
			email: editor.email,
			portal: false,
			area: "Users & roles",
		});
	});
});
