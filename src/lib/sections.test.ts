import { describe, expect, it } from "vitest";

import { SECTION_DEFS } from "./sections";

/** The prose that may sit under a title, one field name per section family. */
const UNDER_TITLE = ["subtitle", "lead", "body"];

describe("a section that offers a title", () => {
	it("offers a line under it too, so the eyebrow is never used as one", () => {
		const bare = SECTION_DEFS.filter(
			(d) =>
				d.fields.some((f) => f.key === "title") &&
				!d.fields.some((f) => UNDER_TITLE.includes(f.key)),
		).map((d) => d.type);

		expect(bare).toEqual([]);
	});
});
