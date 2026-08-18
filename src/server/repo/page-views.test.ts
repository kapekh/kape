import { describe, expect, it } from "vitest";

import { viewPath } from "./site";

describe("the page a view is filed under", () => {
	it("drops the language prefix, so one page is one page", () => {
		expect(viewPath("/en/news")).toBe("/news");
		expect(viewPath("/km/news")).toBe("/news");
		expect(viewPath("/en")).toBe("/");
	});

	it("drops the query, so page 2 of a list is still the list", () => {
		expect(viewPath("/en/news?page=2")).toBe("/news");
		expect(viewPath("/en/news#top")).toBe("/news");
	});

	it("keeps a path that carries no language", () => {
		expect(viewPath("/who-we-are/about")).toBe("/who-we-are/about");
	});

	// a two-letter first segment is only a language when it is the whole segment
	it("does not mistake a page for a language", () => {
		expect(viewPath("/entrepreneurship")).toBe("/entrepreneurship");
	});

	it("counts nothing for the admin, the api or a bare file", () => {
		for (const p of [
			"/admin/pages/16",
			"/en/admin",
			"/api/trpc/site.view",
			"/uploads/a.pdf",
			"/login",
			"/internalsources/documents",
		])
			expect(viewPath(p)).toBeNull();
	});

	it("refuses anything that is not a path", () => {
		expect(viewPath("https://example.org/news")).toBeNull();
		expect(viewPath("")).toBeNull();
		expect(viewPath(`/${"x".repeat(600)}`)).toBeNull();
	});
});
