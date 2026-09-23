import { describe, expect, it } from "vitest";

import {
	missingCategoryTerms,
	publicationCategoryFilters,
} from "#/lib/term-drift";
import { staticPages } from "../migrate-tree";
import { LANDINGS } from "./landings";
import { TERM_SEED } from "./terms";

const seededPages = [
	...staticPages(),
	...LANDINGS.map((l) => ({ slug: l.slug, sections: [l.section] })),
];

describe("the seeded publication categories", () => {
	it("covers every category a seeded page filters publications by", () => {
		const keys = TERM_SEED.publication_category.map(([key]) => key);
		const missing = missingCategoryTerms(
			publicationCategoryFilters(seededPages),
			keys,
		);
		expect(missing).toEqual([]);
	});

	it("carries the three thematic categories the Media pages are filed under", () => {
		const keys = TERM_SEED.publication_category.map(([key]) => key);
		expect(keys).toEqual(
			expect.arrayContaining(["ai-digital", "life-skills", "escup-sources"]),
		);
	});

	it("gives every term a key and a label, and no key twice", () => {
		for (const [taxonomy, items] of Object.entries(TERM_SEED)) {
			for (const [key, label] of items) {
				expect(key, taxonomy).not.toBe("");
				expect(label, key).not.toBe("");
			}
			const keys = items.map(([key]) => key);
			expect(new Set(keys).size, taxonomy).toBe(keys.length);
		}
	});
});
