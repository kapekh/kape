import { describe, expect, it } from "vitest";

import type { SectionNode } from "./sections";
import {
	missingCategoryTerms,
	type PageSections,
	publicationCategoryFilters,
} from "./term-drift";

const list = (category?: string): SectionNode => ({
	id: "list",
	type: "publicationList",
	layout: "list",
	query: { source: "publications", ...(category ? { category } : {}) },
});

const page = (slug: string, ...sections: SectionNode[]): PageSections => ({
	slug,
	sections,
});

describe("publicationCategoryFilters", () => {
	it("reads the category off every publication list", () => {
		expect(
			publicationCategoryFilters([
				page("media/ai-digital", list("ai-digital")),
				page("media/life-skills", list("life-skills")),
			]),
		).toEqual([
			{ path: "/media/ai-digital", key: "ai-digital" },
			{ path: "/media/life-skills", key: "life-skills" },
		]);
	});

	it("skips a list that filters by nothing, and a page with no sections", () => {
		expect(
			publicationCategoryFilters([
				page("publications", list()),
				{ slug: "home", sections: null },
			]),
		).toEqual([]);
	});

	it("ignores a section that filters another source by the same word", () => {
		const leadership: SectionNode = {
			id: "team",
			type: "people",
			query: { source: "people", category: "smt" },
		};
		expect(publicationCategoryFilters([page("team", leadership)])).toEqual([]);
	});

	it("names one page per key, so two pages on one category read once", () => {
		expect(
			publicationCategoryFilters([
				page("media/annual-report", list("annual-report")),
				page("media/archive", list("annual-report")),
			]),
		).toEqual([{ path: "/media/annual-report", key: "annual-report" }]);
	});
});

describe("missingCategoryTerms", () => {
	const filters = [
		{ path: "/media/ai-digital", key: "ai-digital" },
		{ path: "/media/annual-report", key: "annual-report" },
	];

	it("names the filter no term has", () => {
		expect(missingCategoryTerms(filters, ["annual-report"])).toEqual([
			{ path: "/media/ai-digital", key: "ai-digital" },
		]);
	});

	// the script's second run, and the notice's quiet state
	it("finds nothing once every key has its term", () => {
		expect(
			missingCategoryTerms(filters, ["annual-report", "ai-digital", "spare"]),
		).toEqual([]);
	});

	it("reports every filter when the taxonomy is empty", () => {
		expect(missingCategoryTerms(filters, [])).toEqual(filters);
	});
});
