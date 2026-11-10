import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// both guards live in the repo layer, so every caller gets them; this drives the repo directly
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
			`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 const q = (s) => raw.query(s).all();
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
				`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
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
		).toContain("set by the product");
	});

	it("cannot be overwritten", () => {
		expect(
			attempt(
				`await admin.upsertSetting(db, "install_completed_at", "nonsense")`,
			),
		).toContain("set by the product");
	});

	it("does not get in the way of ordinary settings", () => {
		expect(
			attempt(`await admin.upsertSetting(db, "site_name_en", "Renamed")`),
		).toBe("");
	});
});

// derived per read from campaigns, modules and the gateway credentials: a row
// an operator typed would be overwritten anyway, so it is refused up front
describe("the derived donate flag", () => {
	it("cannot be written by hand", () => {
		expect(
			attempt(`await admin.upsertSetting(db, "donate_open", "1")`),
		).toContain("set by the product");
	});

	it("cannot be deleted either", () => {
		expect(
			attempt(`await admin.deleteSetting(db, "donate_payments")`),
		).toContain("set by the product");
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

const projectInput = (over: Record<string, unknown>) =>
	JSON.stringify({
		code: "X",
		slug: "x",
		parentId: null,
		status: "current",
		sort: 0,
		startDate: "",
		endDate: "",
		targetAreas: [],
		snapshots: [],
		translations: [{ lang: "en", name: "X", summary: "", body: "" }],
		donorIds: [],
		locations: [],
		...over,
	});

// /projects/<parent>/<slug> is the deepest URL resolveRoute builds
describe("sub-projects", () => {
	it("accepts one level of nesting", () => {
		expect(
			attempt(
				`const p = await admin.createProject(db, ${projectInput({ code: "IEP", slug: "iep" })});
				 await admin.createProject(db, ${projectInput({ code: "DWD", slug: "dwd" })});
				 const dwd = q("select id from projects where slug = 'dwd'")[0].id;
				 await admin.updateProject(db, dwd, JSON.parse(JSON.stringify({ ...${projectInput({ code: "DWD", slug: "dwd" })}, parentId: p })))`,
			),
		).toBe("");
	});

	it("refuses a second level", () => {
		expect(
			attempt(
				`const dwd = q("select id from projects where slug = 'dwd'")[0].id;
				 await admin.createProject(db, JSON.parse(JSON.stringify({ ...${projectInput({ code: "SUB", slug: "sub" })}, parentId: dwd })))`,
			),
		).toContain("one level deep");
	});

	it("refuses a project that is its own parent", () => {
		expect(
			attempt(
				`const iep = q("select id from projects where slug = 'iep'")[0].id;
				 await admin.updateProject(db, iep, JSON.parse(JSON.stringify({ ...${projectInput({ code: "IEP", slug: "iep" })}, parentId: iep })))`,
			),
		).toContain("its own parent");
	});

	it("refuses to demote a project that already has sub-projects", () => {
		expect(
			attempt(
				`const iep = q("select id from projects where slug = 'iep'")[0].id;
				 await admin.createProject(db, ${projectInput({ code: "TOP", slug: "top" })});
				 const top = q("select id from projects where slug = 'top'")[0].id;
				 await admin.updateProject(db, iep, JSON.parse(JSON.stringify({ ...${projectInput({ code: "IEP", slug: "iep" })}, parentId: top })))`,
			),
		).toContain("sub-projects of its own");
	});

	// BMZ/REACH was saved as bmz/reach once, and /projects/bmz/reach looked for a parent named bmz
	it("refuses a slug the route would read as a parent and child", () => {
		expect(
			attempt(
				`await admin.createProject(db, ${projectInput({ code: "BMZ/REACH", slug: "bmz/reach" })})`,
			),
		).toContain('Try "bmz-reach"');
	});

	it("refuses a parent that does not exist", () => {
		expect(
			attempt(
				`await admin.createProject(db, JSON.parse(JSON.stringify({ ...${projectInput({ code: "ORPHAN", slug: "orphan" })}, parentId: 99999 })))`,
			),
		).toContain("no longer exists");
	});
});
