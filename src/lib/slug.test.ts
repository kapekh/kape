import { describe, expect, it } from "vitest";

import { PAGE_TITLE_MAX, segmentProblem, toSegment } from "./slug";

/**
 * The two the audit actually saved: `ui1 slug with spaces`, which reaches the
 * sitemap as a raw space in `<loc>` and gets the entry dropped, and
 * `../ui1-escape`, which the editor prints as a URL that 404s.
 */
describe("segmentProblem", () => {
	it("refuses spaces, and suggests the segment that would have worked", () => {
		expect(segmentProblem("ui1 slug with spaces")).toBe(
			'The URL segment cannot contain spaces. Try "ui1-slug-with-spaces".',
		);
	});

	it("refuses a dot, so `..` cannot walk out of the path", () => {
		expect(segmentProblem("..escape")).toBe(
			'The URL segment cannot contain a dot. Try "escape".',
		);
		expect(segmentProblem("..")).toBe("The URL segment cannot contain a dot.");
	});

	it("refuses a slash, which would invent a path level", () => {
		expect(segmentProblem("../ui1-escape")).toBe(
			'The URL segment cannot contain a slash. Try "ui1-escape".',
		);
		expect(segmentProblem("news/latest")).toBe(
			'The URL segment cannot contain a slash. Try "news-latest".',
		);
	});

	it("refuses uppercase, because the lookup key is the lowercase path", () => {
		expect(segmentProblem("About")).toBe(
			'The URL segment must be lowercase. Try "about".',
		);
	});

	it("refuses a dash at either end", () => {
		expect(segmentProblem("-about")).toBe(
			'The URL segment cannot start or end with a dash. Try "about".',
		);
		expect(segmentProblem("about-")).toBe(
			'The URL segment cannot start or end with a dash. Try "about".',
		);
	});

	it("says which field is empty rather than which rule broke", () => {
		expect(segmentProblem("")).toBe("The URL segment is required.");
	});

	it("passes a valid segment", () => {
		expect(segmentProblem("who-we-are")).toBeNull();
		expect(segmentProblem("ui1-audit-page")).toBeNull();
		expect(segmentProblem("2026")).toBeNull();
	});

	it("passes a Khmer segment, since the rule is about URL syntax, not alphabet", () => {
		expect(segmentProblem("អំពីយើង")).toBeNull();
	});
});

describe("toSegment", () => {
	it("collapses a run of illegal characters into one dash", () => {
		expect(toSegment("Who   We / Are!!")).toBe("who-we-are");
	});

	it("has nothing to suggest for a segment that is only punctuation", () => {
		expect(toSegment("...")).toBe("");
	});
});

describe("PAGE_TITLE_MAX", () => {
	it("is short enough to keep a title tag and a dropdown label readable", () => {
		expect(PAGE_TITLE_MAX).toBeLessThan(300);
		expect(PAGE_TITLE_MAX).toBeGreaterThan(60);
	});
});
