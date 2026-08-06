import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The two rows a two-click mistake in /admin used to take out. `/` is served by
 * looking up one slug with no fallback, and `install_completed_at` is the
 * installer's own bookkeeping sitting in a raw key/value grid that puts a Delete
 * button on every row. Both guards live in the repo layer, so the admin UI, the
 * tRPC procedures and any future caller get them; this drives the repo directly.
 */
const dir = mkdtempSync(join(tmpdir(), "admin-guards-"));
const dbPath = join(dir, "guards.db");
const root = process.cwd();

afterAll(() => rmSync(dir, { recursive: true, force: true }));

execFileSync("bun", ["src/server/install.ts"], {
	env: {
		...process.env,
		DATABASE_PATH: dbPath,
		SITE_NAME: "Test Org",
		ADMIN_EMAIL: "owner@test.example",
		ADMIN_PASSWORD: "test-install-password",
		SSG_CACHE: "off",
	},
	encoding: "utf8",
});

/** Run one repo call against the installed database; returns "" or the refusal. */
const attempt = (body: string): string =>
	execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 const q = (s) => db.$client.query(s).all();
			 const homeId = q("select id from pages where slug = 'home'").get?.() ?? q("select id from pages where slug = 'home'")[0];
			 try { ${body}; console.log(""); }
			 catch (e) { console.log(e.message); }
			 process.exit(0);`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	).trim();

const pageInput = (over: Record<string, unknown>) =>
	JSON.stringify({
		slug: "home",
		segment: "home",
		parentId: null,
		status: "published",
		coverMediaId: null,
		sections: [{ id: "a", type: "richtext", layout: "default", props: {} }],
		translations: [{ lang: "en", title: "Home", excerpt: "", body: "" }],
		...over,
	});

describe("the installer's bookkeeping row", () => {
	it("is not offered to the settings screen", () => {
		const keys = execFileSync(
			"bun",
			[
				"-e",
				`import { db } from "${root}/src/server/db.ts";
				 import { adminListSettings } from "${root}/src/server/repo/admin.ts";
				 console.log((await adminListSettings(db)).map((r) => r.key).join(","));
				 process.exit(0);`,
			],
			{
				env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
				encoding: "utf8",
			},
		).trim();
		expect(keys).not.toContain("install_completed_at");
		expect(keys).toContain("site_name_en");
	});

	it("cannot be deleted", () => {
		expect(
			attempt(`await admin.deleteSetting(db, "install_completed_at")`),
		).toContain("written by the installer");
	});

	it("cannot be overwritten", () => {
		expect(
			attempt(
				`await admin.upsertSetting(db, "install_completed_at", "nonsense")`,
			),
		).toContain("written by the installer");
	});

	it("does not get in the way of ordinary settings", () => {
		expect(
			attempt(`await admin.upsertSetting(db, "site_name_en", "Renamed")`),
		).toBe("");
	});
});

describe("the front page", () => {
	it("cannot be deleted", () => {
		expect(
			attempt(`await admin.deletePage(db, homeId.id ?? homeId)`),
		).toContain("front page");
	});

	it("cannot be renamed out from under /", () => {
		expect(
			attempt(
				`await admin.updatePage(db, homeId.id ?? homeId, ${pageInput({ segment: "welcome" })})`,
			),
		).toContain("front page");
	});

	it("cannot be moved under another page", () => {
		expect(
			attempt(
				`const news = q("select id from pages where slug = 'news'")[0].id;
				 await admin.movePage(db, homeId.id ?? homeId, news, 0)`,
			),
		).toContain("front page");
	});

	it("is still fully editable in place", () => {
		expect(
			attempt(
				`await admin.updatePage(db, homeId.id ?? homeId, ${pageInput({
					status: "draft",
					sections: [
						{
							id: "a",
							type: "richtext",
							layout: "default",
							props: { title: "Edited" },
						},
					],
				})})`,
			),
		).toBe("");
	});

	it("survived every refusal", () => {
		const rows = JSON.parse(
			execFileSync(
				"bun",
				[
					"-e",
					`import {Database} from "bun:sqlite";
					 console.log(JSON.stringify(new Database(process.argv[1], {readonly: true})
					   .query("select slug, parent_id from pages where slug = 'home'").all()));`,
					dbPath,
				],
				{ encoding: "utf8" },
			),
		) as { slug: string; parent_id: number | null }[];
		expect(rows).toEqual([{ slug: "home", parent_id: null }]);
	});
});
