import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
	it("keeps a same-site path", () => {
		expect(safeRedirect("/admin/media")).toBe("/admin/media");
		expect(safeRedirect("/admin/posts?type=news")).toBe(
			"/admin/posts?type=news",
		);
		expect(safeRedirect("/admin/ui-strings")).toBe("/admin/ui-strings");
	});

	it("refuses another origin", () => {
		expect(safeRedirect("https://evil.tld/")).toBeUndefined();
		expect(safeRedirect("//evil.tld/")).toBeUndefined();
		expect(safeRedirect("/\\evil.tld")).toBeUndefined();
	});

	it("refuses anything that is not a path", () => {
		expect(safeRedirect("admin/media")).toBeUndefined();
		expect(safeRedirect("javascript:alert(1)")).toBeUndefined();
		expect(safeRedirect(undefined)).toBeUndefined();
		expect(safeRedirect(["/admin"])).toBeUndefined();
	});

	it("refuses control characters", () => {
		expect(safeRedirect("/admin\nSet-Cookie: x=1")).toBeUndefined();
		expect(safeRedirect("/admin\r\n")).toBeUndefined();
		expect(safeRedirect(`/admin${String.fromCharCode(0)}`)).toBeUndefined();
		expect(safeRedirect(`/admin${String.fromCharCode(127)}`)).toBeUndefined();
	});
});
