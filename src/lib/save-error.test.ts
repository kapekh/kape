import { describe, expect, it } from "vitest";

import { saveErrorMessage } from "./save-error";

// copied off the wire, not reconstructed: a tRPC serialisation change would not fail these
const WIRE = {
	zodTooSmall: `[\n  {\n    "origin": "string",\n    "code": "too_small",\n    "minimum": 1,\n    "inclusive": true,\n    "path": [\n      "segment"\n    ],\n    "message": "Too small: expected string to have >=1 characters"\n  }\n]`,
	unauthorized: "UNAUTHORIZED",
	foreignKey: "FOREIGN KEY constraint failed",
	unique: "UNIQUE constraint failed: campaigns.tenant_id, campaigns.slug",
	repo: 'A page already exists at "team". Choose a different URL.',
};

describe("saveErrorMessage", () => {
	it("names the field a real tRPC input rejection complained about", () => {
		expect(saveErrorMessage(new Error(WIRE.zodTooSmall))).toBe(
			"Segment is required.",
		);
	});

	it("turns an expired session into a route back in", () => {
		const message = saveErrorMessage(new Error(WIRE.unauthorized));
		expect(message).toMatch(/session has expired/i);
		expect(message).not.toBe(WIRE.unauthorized);
	});

	it("leaves no tRPC code reaching the user as a bare word", () => {
		for (const code of ["FORBIDDEN", "NOT_FOUND", "SOME_FUTURE_CODE"])
			expect(saveErrorMessage(new Error(code))).not.toBe(code);
	});

	it("explains a stale reference instead of quoting SQLite", () => {
		expect(saveErrorMessage(new Error(WIRE.foreignKey))).toMatch(
			/deleted while you were editing/,
		);
	});

	// The same SQLite error points the opposite way on a delete: other records
	// still reference this one, so "pick it again and save" sends nobody anywhere.
	it("turns the foreign key round when the action was a delete", () => {
		expect(saveErrorMessage(new Error(WIRE.foreignKey), "delete")).toMatch(
			/still points at this record/,
		);
	});

	it("names the column a unique constraint objected to", () => {
		expect(saveErrorMessage(new Error(WIRE.unique))).toBe(
			"Another record already uses that slug. Choose a different one.",
		);
	});

	it("turns a dropped request into something actionable", () => {
		expect(saveErrorMessage(new Error("Failed to fetch"))).toMatch(
			/Could not reach the server/,
		);
	});

	it("passes a repository message through untouched", () => {
		expect(saveErrorMessage(new Error(WIRE.repo))).toBe(WIRE.repo);
	});

	it("splits camelCase fields and counts the issues it does not show", () => {
		const issues = ["coverMediaId", "translations", "status", "slug"].map(
			(path) => ({ code: "invalid_type", path: [path] }),
		);
		expect(saveErrorMessage(new Error(JSON.stringify(issues)))).toBe(
			"Cover media id is required. Translations is required. Status is required. And 1 more.",
		);
	});

	it("falls back only when there is no message to show", () => {
		expect(saveErrorMessage("nope")).toBe("Could not save.");
		expect(saveErrorMessage(new Error(""))).toBe("Could not save.");
	});
});
