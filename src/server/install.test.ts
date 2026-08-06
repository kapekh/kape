import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Runs the real installer against a real empty database, because the thing worth
 * protecting is what lands in the file. A future edit that drops `languages` or
 * `site_settings` has to fail here rather than on someone's first boot.
 */
const dir = mkdtempSync(join(tmpdir(), "install-test-"));
const dbPath = join(dir, "install.db");

const env = {
	...process.env,
	DATABASE_PATH: dbPath,
	SITE_NAME: "Test Org",
	ADMIN_EMAIL: "owner@test.example",
	ADMIN_PASSWORD: "test-install-password",
	SSG_CACHE: "off",
};

const stdout = execFileSync("bun", ["src/server/install.ts"], {
	env,
	encoding: "utf8",
});

const query = (sql: string) =>
	JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`import {Database} from "bun:sqlite";console.log(JSON.stringify(new Database(process.argv[1],{readonly:true}).query(process.argv[2]).all()))`,
				dbPath,
				sql,
			],
			{ encoding: "utf8" },
		),
	) as Record<string, string | number>[];

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("fresh install", () => {
	it("does not print the password the operator supplied", () => {
		expect(stdout).toContain("owner@test.example");
		expect(stdout).not.toContain("test-install-password");
	});

	it("establishes a default language", () => {
		const rows = query("SELECT code, is_default FROM languages");
		expect(rows.filter((r) => r.is_default)).toHaveLength(1);
	});

	it("gives the header, footer and meta tags a site name to render", () => {
		const rows = query(
			"SELECT value FROM site_settings WHERE key = 'site_name_en'",
		);
		expect(rows[0]?.value).toBe("Test Org");
	});

	it("answers on / with a published home page", () => {
		const rows = query(
			"SELECT status, segment, sections FROM pages WHERE slug = 'home'",
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].status).toBe("published");
		// null segment means the page is not addressable in the tree
		expect(rows[0].segment).toBe("home");
		expect(JSON.parse(String(rows[0].sections))).not.toHaveLength(0);
	});

	it("seeds the tables the admin cannot function without", () => {
		for (const table of ["tenants", "roles", "content_types", "ui_strings"]) {
			const [row] = query(`SELECT count(*) AS c FROM ${table}`);
			expect(`${table}=${row.c}`).not.toBe(`${table}=0`);
		}
	});

	it("creates exactly one administrator, from configuration", () => {
		const rows = query("SELECT email, role FROM users");
		expect(rows).toEqual([{ email: "owner@test.example", role: "admin" }]);
	});

	it("writes no site content", () => {
		for (const table of ["posts", "projects", "nav_items", "media", "people"]) {
			const [row] = query(`SELECT count(*) AS c FROM ${table}`);
			expect(`${table}=${row.c}`).toBe(`${table}=0`);
		}
	});

	it("is a no-op on a database that already has rows", () => {
		const again = execFileSync("bun", ["src/server/install.ts"], {
			env,
			encoding: "utf8",
		});
		expect(again).toContain("Already installed");
		expect(query("SELECT count(*) AS c FROM users")[0].c).toBe(1);
	});
});
