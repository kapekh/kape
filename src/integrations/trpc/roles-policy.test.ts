import { afterAll, describe, expect, it } from "vitest";

import { failed, planRunner, rowsOf, type Step } from "./test-run";

const { run, dispose } = planRunner();
afterAll(dispose);

const NEW_USER = {
	email: "new@test.example",
	name: "New",
	password: "pw-long-enough",
};

// the administrator seeds a broad role and a second administrator, then the
// plan signs in as someone who holds only the users area
const setup: Step[] = [
	{
		sql: `insert into roles (tenant_id, key, name, permissions, is_system) values (1, 'staff', 'Staff', '["portal"]', 1) returning id`,
	},
	{
		call: "adminRoles.create",
		input: { name: "Manager", permissions: ["pages", "posts", "settings"] },
	},
	{
		call: "adminUsers.create",
		input: { ...NEW_USER, email: "second-admin@test.example", role: "admin" },
	},
	{
		call: "adminUsers.create",
		input: { ...NEW_USER, email: "manager@test.example", role: "manager" },
	},
	{ as: { role: "user_manager", permissions: ["users"] } },
];

const userId = (email: string) =>
	`select id from users where email = '${email}'`;

describe("a users-area holder who is not an administrator", () => {
	it("cannot demote, delete or reset an administrator, even when there are two", () => {
		const out = run([
			...setup,
			{ sql: userId("second-admin@test.example") },
			{
				call: "adminUsers.update",
				input: {
					id: 2,
					email: "second-admin@test.example",
					name: null,
					role: "user_manager",
				},
			},
			{
				call: "adminUsers.resetPassword",
				input: { id: 2, password: "pw-long-enough-2" },
			},
			{ call: "adminUsers.delete", input: { id: 2 } },
			{ sql: "select role from users where id = 2" },
		]);
		expect(rowsOf(out[5])).toEqual([{ id: 2 }]);
		for (const r of out.slice(6, 9)) expect(failed(r)?.code).toBe("FORBIDDEN");
		expect(rowsOf(out[9])).toEqual([{ role: "admin" }]);
	});

	it("cannot hand out a role that reaches further than they do", () => {
		const out = run([
			...setup,
			{ call: "adminUsers.create", input: { ...NEW_USER, role: "manager" } },
			{ call: "adminUsers.create", input: { ...NEW_USER, role: "admin" } },
			// the built-in staff role holds the portal, which this caller does not
			{ call: "adminUsers.create", input: { ...NEW_USER, role: "staff" } },
			{
				call: "adminUsers.create",
				input: { ...NEW_USER, role: "user_manager" },
			},
			{ sql: "select role from users where email = 'new@test.example'" },
		]);
		for (const r of out.slice(5, 8)) expect(failed(r)?.code).toBe("FORBIDDEN");
		expect(failed(out[8])).toBeNull();
		expect(rowsOf(out[9])).toEqual([{ role: "user_manager" }]);
	});

	it("cannot touch an account holding a role that reaches further", () => {
		const out = run([
			...setup,
			{ sql: userId("manager@test.example") },
			{
				call: "adminUsers.resetPassword",
				input: { id: 3, password: "pw-long-enough-2" },
			},
			{ call: "adminUsers.delete", input: { id: 3 } },
			{ sql: userId("manager@test.example") },
		]);
		expect(rowsOf(out[5])).toEqual([{ id: 3 }]);
		expect(failed(out[6])?.code).toBe("FORBIDDEN");
		expect(failed(out[7])?.code).toBe("FORBIDDEN");
		expect(rowsOf(out[8])).toEqual([{ id: 3 }]);
	});

	it("cannot re-scope or delete a role that reaches further, nor grow their own", () => {
		const out = run([
			...setup,
			{ sql: "select id from roles where key = 'manager'" },
			{
				call: "adminRoles.update",
				input: { id: 2, name: "Manager", permissions: ["users"] },
			},
			{ call: "adminRoles.delete", input: { id: 2 } },
			{ sql: "select id from roles where key = 'user_manager'" },
			{
				call: "adminRoles.update",
				input: { id: 3, name: "User manager", permissions: ["users", "pages"] },
			},
			{
				sql: "select key, permissions from roles where id in (2, 3) order by id",
			},
		]);
		expect(rowsOf(out[5])).toEqual([{ id: 2 }]);
		expect(failed(out[6])?.code).toBe("FORBIDDEN");
		expect(failed(out[7])?.code).toBe("FORBIDDEN");
		expect(rowsOf(out[8])).toEqual([{ id: 3 }]);
		expect(failed(out[9])?.code).toBe("FORBIDDEN");
		expect(rowsOf(out[10])).toEqual([
			{ key: "manager", permissions: '["pages","posts","settings"]' },
			{ key: "user_manager", permissions: '["users"]' },
		]);
	});

	it("can still run the accounts within their reach", () => {
		const out = run([
			...setup,
			{ call: "adminRoles.create", input: { name: "Helper", permissions: [] } },
			{ call: "adminUsers.create", input: { ...NEW_USER, role: "helper" } },
			{ sql: userId("new@test.example") },
			{
				call: "adminUsers.resetPassword",
				input: { id: 1002, password: "pw-long-enough-2" },
			},
			{ call: "adminUsers.delete", input: { id: 1002 } },
			{ sql: userId("new@test.example") },
		]);
		expect(failed(out[5])).toBeNull();
		expect(failed(out[6])).toBeNull();
		expect(rowsOf(out[7])).toEqual([{ id: 1002 }]);
		expect(failed(out[8])).toBeNull();
		expect(failed(out[9])).toBeNull();
		expect(rowsOf(out[10])).toEqual([]);
	});
});

describe("the staff portal", () => {
	it("opens to the portal area and to nobody else", () => {
		const out = run([
			{ as: { role: "portal_only", permissions: ["portal"] } },
			{ call: "staff.directory" },
			{ call: "admin.overview" },
			{ as: { role: "editor_only", permissions: ["pages"] } },
			{ call: "staff.directory" },
		]);
		expect(failed(out[1])).toBeNull();
		expect(failed(out[2])?.code).toBe("FORBIDDEN");
		expect(failed(out[4])?.code).toBe("FORBIDDEN");
	});
});
