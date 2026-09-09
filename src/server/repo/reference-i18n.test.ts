import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: only the real repo functions prove that the
// reference tables read back per language instead of sharing one column
const dir = mkdtempSync(join(tmpdir(), "reference-i18n-"));
const dbPath = join(dir, "reference.db");
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

function run<T>(body: string): T {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 import * as content from "${root}/src/server/repo/content.ts";
			 import * as org from "${root}/src/server/repo/org.ts";
			 import * as site from "${root}/src/server/repo/site.ts";
			 db.$client
				.query("insert or ignore into languages (code, name, native_name, is_default, enabled, rtl, sort) values ('km','Khmer','ខ្មែរ',0,1,0,1)")
				.run();
			 const out = {};
			 ${body}
			 console.log(JSON.stringify(out));
			 process.exit(0);`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	);
	return JSON.parse(out.trim().split("\n").at(-1) as string) as T;
}

describe("a term's label", () => {
	const r = run<{ en: string; km: string; untranslated: string }>(`
		const id = await admin.createTerm(db, {
			taxonomy: "location", key: "kampong-cham", sort: 0,
			labels: { en: "Kampong Cham", km: "កំពង់ចាម" },
		});
		await admin.createTerm(db, {
			taxonomy: "location", key: "kandal", sort: 1, labels: { en: "Kandal" },
		});
		const pick = (rows, key) => rows.find((t) => t.key === key).label;
		const en = await content.listTerms(db, "location", "en");
		const km = await content.listTerms(db, "location", "km");
		out.en = pick(en, "kampong-cham");
		out.km = pick(km, "kampong-cham");
		out.untranslated = pick(km, "kandal");
	`);

	it("reads back in the language asked for", () => {
		expect(r.en).toBe("Kampong Cham");
		expect(r.km).toBe("កំពង់ចាម");
	});

	it("falls back to the default language when that one has no label", () => {
		expect(r.untranslated).toBe("Kandal");
	});
});
