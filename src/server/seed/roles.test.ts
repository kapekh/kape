import { describe, expect, it } from "vitest";

import { ADMIN_AREAS, ALL_AREAS } from "#/lib/permissions";
import { SEED_ROLES } from "./roles";

const byKey = (k: string) => SEED_ROLES.find((r) => r.key === k);

describe("seeded roles", () => {
	it("gives the user form's role picker something to show", () => {
		// The picker reads this table. With no rows a new account cannot be given
		// a role at all, which is what shipped before.
		expect(SEED_ROLES.length).toBeGreaterThan(0);
		expect(SEED_ROLES.map((r) => r.key)).toContain("admin");
	});

	it("marks only the code built-ins as system roles", () => {
		const system = SEED_ROLES.filter((r) => r.isSystem).map((r) => r.key);
		expect(system).toEqual(["admin", "staff"]);
	});

	it("grants only areas that exist", () => {
		for (const r of SEED_ROLES) {
			for (const p of r.permissions) expect(ALL_AREAS).toContain(p);
		}
	});

	it("keeps staff out of the admin, and in the portal", () => {
		const staff = byKey("staff")?.permissions ?? [];
		expect(staff).toEqual(["portal"]);
		expect(staff.filter((p) => ADMIN_AREAS.includes(p))).toEqual([]);
	});

	it("never hands the users area to a non-system role", () => {
		// "Users & roles" can create accounts and reset passwords, so a seeded
		// content role holding it would be an administrator wearing another name.
		for (const r of SEED_ROLES.filter((r) => !r.isSystem)) {
			expect(r.permissions).not.toContain("users");
		}
	});

	it("makes the content manager a superset of the editor", () => {
		const editor = byKey("editor")?.permissions ?? [];
		const manager = byKey("content_manager")?.permissions ?? [];
		expect(editor.length).toBeGreaterThan(0);
		for (const p of editor) expect(manager).toContain(p);
		expect(manager.length).toBeGreaterThan(editor.length);
	});
});
