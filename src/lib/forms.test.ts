import { describe, expect, it } from "vitest";

import {
	type FormField,
	formatMultiValue,
	groupIntoSections,
	isContentField,
	isIsoDate,
	toStringList,
	validateSubmission,
} from "./forms";

const field = (
	f: Partial<FormField> & { type: FormField["type"] },
): FormField =>
	({ key: f.key ?? "k", label: f.label ?? "Field", ...f }) as FormField;

describe("isIsoDate", () => {
	it("accepts a real calendar date", () => {
		expect(isIsoDate("1994-02-28")).toBe(true);
		expect(isIsoDate("2024-02-29")).toBe(true); // leap year
	});

	it("rejects malformed and impossible dates", () => {
		for (const bad of [
			"29/02/2024",
			"2024-2-9",
			"2024-13-01",
			"2024-02-30",
			"2023-02-29",
			"not a date",
			"",
		])
			expect(isIsoDate(bad)).toBe(false);
	});
});

describe("validateSubmission — date", () => {
	const fields = [field({ key: "dob", label: "Date of birth", type: "date" })];

	it("accepts a well-formed date", () => {
		expect(validateSubmission(fields, { dob: "1994-02-28" })).toBeNull();
	});

	it("rejects a malformed date", () => {
		expect(validateSubmission(fields, { dob: "31/12/1994" })).toMatch(
			/must be a date/,
		);
		expect(validateSubmission(fields, { dob: "1994-02-31" })).toMatch(
			/must be a date/,
		);
	});

	it("lets an optional date go unanswered", () => {
		expect(validateSubmission(fields, {})).toBeNull();
	});

	it("still enforces required", () => {
		const req = [
			field({ key: "dob", label: "DOB", type: "date", required: true }),
		];
		expect(validateSubmission(req, { dob: "" })).toMatch(/is required/);
	});
});

describe("validateSubmission — checkbox group", () => {
	const options = ["Mentor a student", "Attend the reunion", "Volunteer"];
	const fields = [
		field({
			key: "involvement",
			label: "Involvement",
			type: "checkboxes",
			options,
		}),
	];

	it("accepts one, several, or none of the declared options", () => {
		expect(validateSubmission(fields, { involvement: options[0] })).toBeNull();
		expect(
			validateSubmission(fields, { involvement: [options[0], options[2]] }),
		).toBeNull();
		expect(validateSubmission(fields, {})).toBeNull();
	});

	it("rejects a value outside the declared option set", () => {
		expect(validateSubmission(fields, { involvement: "Run the org" })).toMatch(
			/invalid choice/,
		);
		expect(
			validateSubmission(fields, { involvement: [options[0], "Run the org"] }),
		).toMatch(/invalid choice/);
	});

	it("rejects everything when no options are declared", () => {
		const bare = [field({ key: "g", label: "G", type: "checkboxes" })];
		expect(validateSubmission(bare, { g: "anything" })).toMatch(
			/invalid choice/,
		);
	});

	it("enforces required on an empty group", () => {
		const req = [
			field({
				key: "involvement",
				label: "Involvement",
				type: "checkboxes",
				options,
				required: true,
			}),
		];
		expect(validateSubmission(req, {})).toMatch(/is required/);
		expect(validateSubmission(req, { involvement: [] })).toMatch(/is required/);
	});
});

describe("validateSubmission — repeated keys on single-value fields", () => {
	it("rejects an array where one value is expected", () => {
		// Without this, an array slips past the `typeof v === "string"` guards and
		// an invalid email would be stored as "a,b".
		const fields = [field({ key: "email", label: "Email", type: "email" })];
		expect(
			validateSubmission(fields, { email: ["real@example.org", "nope"] }),
		).toMatch(/invalid value/);
	});
});

describe("toStringList / formatMultiValue", () => {
	it("normalises one, many, or nothing", () => {
		expect(toStringList("A")).toEqual(["A"]);
		expect(toStringList([" A ", "B", "", 7, null])).toEqual(["A", "B"]);
		expect(toStringList(undefined)).toEqual([]);
	});

	it("joins picks into one readable cell, never an object", () => {
		const cell = formatMultiValue(toStringList(["Mentor", "Volunteer"]));
		expect(cell).toBe("Mentor, Volunteer");
		expect(cell).not.toContain("[object");
	});
});

describe("groupIntoSections", () => {
	it("numbers sections and hangs the fields that follow under them", () => {
		const groups = groupIntoSections([
			field({ key: "s1", label: "Personal information", type: "section" }),
			field({ key: "name", type: "text" }),
			field({ key: "dob", type: "date" }),
			field({ key: "s2", label: "Involvement", type: "section" }),
			field({ key: "involvement", type: "checkboxes" }),
		]);
		expect(groups.map((g) => [g.number, g.heading?.label])).toEqual([
			[1, "Personal information"],
			[2, "Involvement"],
		]);
		expect(groups[0].fields.map((f) => f.key)).toEqual(["name", "dob"]);
		expect(groups[1].fields.map((f) => f.key)).toEqual(["involvement"]);
	});

	it("keeps fields before the first section in an unheaded group", () => {
		const groups = groupIntoSections([
			field({ key: "intro", type: "text" }),
			field({ key: "s1", label: "One", type: "section" }),
			field({ key: "a", type: "text" }),
		]);
		expect(groups[0].heading).toBeNull();
		expect(groups[0].fields.map((f) => f.key)).toEqual(["intro"]);
		expect(groups[1].number).toBe(1);
	});

	it("leaves an unsectioned form as a single group", () => {
		const groups = groupIntoSections([
			field({ key: "a", type: "text" }),
			field({ key: "b", type: "email" }),
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0].heading).toBeNull();
	});

	it("returns nothing for an empty form", () => {
		expect(groupIntoSections([])).toEqual([]);
	});
});

describe("isContentField", () => {
	it("excludes section headings from submission columns", () => {
		expect(isContentField(field({ type: "section" }))).toBe(true);
		expect(isContentField(field({ type: "content" }))).toBe(true);
		expect(isContentField(field({ type: "checkboxes" }))).toBe(false);
		expect(isContentField(field({ type: "date" }))).toBe(false);
	});
});
