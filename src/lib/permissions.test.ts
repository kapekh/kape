import { describe, expect, it } from "vitest";

import { ALL_AREAS, ungrantableAreas } from "#/lib/permissions";

describe("ungrantableAreas", () => {
	it("lets an administrator grant anything", () => {
		expect(
			ungrantableAreas({ permissions: [], isSuperAdmin: true }, ALL_AREAS),
		).toEqual([]);
	});

	it("stops a user manager from ticking every box on a role", () => {
		const caller = { permissions: ["users"], isSuperAdmin: false };
		expect(ungrantableAreas(caller, ALL_AREAS)).toEqual(
			ALL_AREAS.filter((a) => a !== "users"),
		);
	});

	it("allows granting only what the caller already holds", () => {
		const caller = { permissions: ["users", "posts"], isSuperAdmin: false };
		expect(ungrantableAreas(caller, ["posts"])).toEqual([]);
		expect(ungrantableAreas(caller, ["posts", "settings"])).toEqual([
			"settings",
		]);
	});
});
