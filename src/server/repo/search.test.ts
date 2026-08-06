import { describe, expect, it } from "vitest";

import { NON_PUBLIC_CONTENT_TYPES } from "#/lib/collections";
import {
	fieldText,
	PUBLIC_POST_TYPES,
	scoreField,
	snippetAround,
} from "./search";

const doc = (text: string) =>
	JSON.stringify({
		type: "doc",
		content: [{ type: "paragraph", content: [{ type: "text", text }] }],
	});

describe("ranking", () => {
	it("puts a title match above an excerpt match above a body match", () => {
		const inTitle = scoreField("title", "New Generation Schools", "generation");
		const inExcerpt = scoreField(
			"excerpt",
			"a new generation of…",
			"generation",
		);
		const inBody = scoreField("body", "a new generation of…", "generation");
		expect(inTitle).toBeGreaterThan(inExcerpt);
		expect(inExcerpt).toBeGreaterThan(inBody);
	});

	it("rewards an exact title over a leading one over a buried one", () => {
		const exact = scoreField("title", "Scholarship", "scholarship");
		const leading = scoreField("title", "Scholarship Program", "scholarship");
		const buried = scoreField(
			"title",
			"The National Scholarship Program",
			"scholarship",
		);
		expect(exact).toBeGreaterThan(leading);
		expect(leading).toBeGreaterThan(buried);
	});

	it("scores Khmer the same as English", () => {
		expect(scoreField("title", "អាហារូបករណ៍", "អាហារូបករណ៍")).toBeGreaterThan(0);
	});
});

describe("filtering", () => {
	it("drops a hit that only matched the body's JSON scaffolding", () => {
		const body = doc("Teachers in Kampong Cham");
		expect(body).toContain("paragraph");
		expect(scoreField("body", fieldText("body", body), "paragraph")).toBe(0);
		expect(
			scoreField("body", fieldText("body", body), "kampong"),
		).toBeGreaterThan(0);
	});

	it("reads Khmer body text out of the stored ProseMirror JSON", () => {
		const body = doc("សាលារៀនជំនាន់ថ្មី");
		expect(fieldText("body", body)).toBe("សាលារៀនជំនាន់ថ្មី");
		expect(
			scoreField("body", fieldText("body", body), "ជំនាន់ថ្មី"),
		).toBeGreaterThan(0);
	});

	it("never searches a content type the public cannot reach", () => {
		for (const type of PUBLIC_POST_TYPES)
			expect(NON_PUBLIC_CONTENT_TYPES.has(type)).toBe(false);
		expect(PUBLIC_POST_TYPES).not.toContain("document");
		expect(PUBLIC_POST_TYPES).not.toContain("internal_news");
		expect(PUBLIC_POST_TYPES).toContain("news");
	});
});

describe("snippet", () => {
	it("centres on the match instead of always starting at the top", () => {
		const text = `${"filler ".repeat(60)}needle tail`;
		expect(snippetAround(text, "needle")).toContain("needle");
		expect(snippetAround(text, "needle").startsWith("…")).toBe(true);
	});
});
