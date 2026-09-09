import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// the popup is the only surface an announcement has, so what this query drops is invisible
const dir = mkdtempSync(join(tmpdir(), "announcement-"));
const dbPath = join(dir, "announcement.db");
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

const year = new Date().getFullYear();
const NOTICES = [
	{ slug: "future", deadline: `${year + 5}-12-15` },
	{ slug: "evergreen", deadline: null },
	{ slug: "expired", deadline: `${year - 5}-01-01` },
	{ slug: "day-first", deadline: `15/12/${year + 5}` },
	{ slug: "spelled-out", deadline: "31 December" },
];

const slugs = (): string[] =>
	JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`import { db } from "${root}/src/server/db.ts";
				 import { listActiveAnnouncements } from "${root}/src/server/repo/site.ts";
				 const c = db.$client;
				 for (const n of ${JSON.stringify(NOTICES)}) {
					 c.run("insert into posts (tenant_id, content_type, slug, status, published_at, meta) values (1, 'announcement', ?, 'published', '2026-01-01', ?)",
						 [n.slug, JSON.stringify({ deadline: n.deadline })]);
					 const id = c.query("select id from posts where slug = ?").get(n.slug).id;
					 c.run("insert into translations (tenant_id, entity_type, entity_id, lang, field, value) values (1, 'post', ?, 'en', 'title', ?)",
						 [id, n.slug]);
				 }
				 const rows = await listActiveAnnouncements(db, "en");
				 console.log(JSON.stringify(rows.map((r) => r.title)));
				 process.exit(0);`,
			],
			{
				env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
				encoding: "utf8",
			},
		)
			.trim()
			.split("\n")
			.pop() as string,
	);

describe("active announcements", () => {
	const shown = slugs();

	it("shows a notice whose deadline has not arrived, and one with none", () => {
		expect(shown).toContain("future");
		expect(shown).toContain("evergreen");
	});

	it("hides a notice whose deadline has passed", () => {
		expect(shown).not.toContain("expired");
	});

	it("shows a notice whose deadline no date parser accepts", () => {
		expect(shown).toContain("day-first");
		expect(shown).toContain("spelled-out");
	});
});
