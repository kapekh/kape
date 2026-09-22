import { describe, expect, it } from "vitest";

import { isProjectEndDate } from "./project-dates";

describe("isProjectEndDate", () => {
	it("accepts blank, open-ended and a calendar day", () => {
		expect(isProjectEndDate("")).toBe(true);
		expect(isProjectEndDate("open")).toBe(true);
		expect(isProjectEndDate("2026-12-31")).toBe(true);
	});

	it("refuses the label, a local date format and a day the month lacks", () => {
		expect(isProjectEndDate("Open-ended")).toBe(false);
		expect(isProjectEndDate("31/12/2026")).toBe(false);
		expect(isProjectEndDate("2026-02-31")).toBe(false);
	});
});
