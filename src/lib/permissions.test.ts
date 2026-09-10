import { describe, expect, it } from "vitest";

import {
	ADMIN_AREAS,
	ALL_AREAS,
	hasAdminArea,
	landingPath,
	ungrantableAreas,
	withinReach,
} from "#/lib/permissions";

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

describe("withinReach", () => {
	const manager = { permissions: ["users", "posts"], isSuperAdmin: false };

	it("puts an administrator out of everyone's reach but another administrator", () => {
		const admin = { permissions: ALL_AREAS, isSuperAdmin: true };
		expect(withinReach(manager, admin)).toBe(false);
		expect(withinReach(admin, admin)).toBe(true);
	});

	it("reaches a role holding no more than the caller", () => {
		expect(withinReach(manager, { permissions: [], isSuperAdmin: false })).toBe(
			true,
		);
		expect(
			withinReach(manager, { permissions: ["posts"], isSuperAdmin: false }),
		).toBe(true);
		expect(withinReach(manager, manager)).toBe(true);
	});

	it("does not reach a role holding an area the caller lacks", () => {
		expect(
			withinReach(manager, {
				permissions: ["posts", "settings"],
				isSuperAdmin: false,
			}),
		).toBe(false);
		// the staff portal is an area like any other
		expect(
			withinReach(manager, { permissions: ["portal"], isSuperAdmin: false }),
		).toBe(false);
	});
});

describe("the staff portal area", () => {
	it("is the one area that opens no admin screen", () => {
		expect(ALL_AREAS).toContain("portal");
		expect(ADMIN_AREAS).not.toContain("portal");
		expect(ADMIN_AREAS.length).toBe(ALL_AREAS.length - 1);
	});

	it("alone does not admit anyone to the admin", () => {
		expect(hasAdminArea(["portal"])).toBe(false);
		expect(hasAdminArea([])).toBe(false);
		expect(hasAdminArea(["portal", "posts"])).toBe(true);
	});
});

describe("where an account lands after signing in", () => {
	const at = (permissions: string[], isSuperAdmin = false) =>
		landingPath({ permissions, isSuperAdmin });

	it("sends someone to the portal only when that is all they hold", () => {
		expect(at(["portal"])).toBe("/internalsources");
	});

	it("sends staff who also help with content to the admin", () => {
		expect(at(["portal", "pages", "posts", "projects", "media"])).toBe(
			"/admin",
		);
	});

	it("sends an administrator to the admin", () => {
		expect(at([], true)).toBe("/admin");
	});

	it("sends an account with nothing to the admin, which explains itself", () => {
		expect(at([])).toBe("/admin");
	});
});
