import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// the popup and the careers list are the two surfaces a notice has, and a job and
// an announcement must show on both
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
	{ slug: "future", type: "announcement", deadline: `${year + 5}-12-15` },
	{ slug: "evergreen", type: "announcement", deadline: null },
	{ slug: "expired", type: "announcement", deadline: `${year - 5}-01-01` },
	{ slug: "day-first", type: "announcement", deadline: `15/12/${year + 5}` },
	{ slug: "spelled-out", type: "announcement", deadline: "31 December" },
	{ slug: "job-open", type: "job", deadline: `${year + 5}-06-30` },
	{ slug: "job-closed", type: "job", deadline: `${year - 5}-06-30` },
	{ slug: "news-item", type: "news", deadline: null },
];

const surfaces = (): { popup: string[]; careers: string[] } =>
	JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`import { db } from "${root}/src/server/db.ts";
				 import { listActiveAnnouncements } from "${root}/src/server/repo/site.ts";
				 import { listJobs } from "${root}/src/server/repo/content.ts";
				 const c = db.$client;
				 for (const n of ${JSON.stringify(NOTICES)}) {
					 c.run("insert into posts (tenant_id, content_type, slug, status, published_at, meta) values (1, ?, ?, 'published', '2026-01-01', ?)",
						 [n.type, n.slug, JSON.stringify({ deadline: n.deadline })]);
					 const id = c.query("select id from posts where slug = ?").get(n.slug).id;
					 c.run("insert into translations (tenant_id, entity_type, entity_id, lang, field, value) values (1, 'post', ?, 'en', 'title', ?)",
						 [id, n.slug]);
				 }
				 const popup = await listActiveAnnouncements(db, "en");
				 const careers = await listJobs(db, "en");
				 console.log(JSON.stringify({ popup: popup.map((r) => r.title), careers: careers.map((r) => r.title) }));
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

const { popup, careers } = surfaces();

describe("active announcements", () => {
	const shown = popup;

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

describe("a job and an announcement on both surfaces", () => {
	it("pops an open job up on the home page", () => {
		expect(popup).toContain("job-open");
	});

	it("lists an open announcement on the careers page", () => {
		expect(careers).toContain("future");
		expect(careers).toContain("evergreen");
	});

	it("hides a job past its deadline on both", () => {
		expect(popup).not.toContain("job-closed");
		expect(careers).not.toContain("job-closed");
	});

	it("orders both by nearest deadline, whatever the type", () => {
		const dated = (l: string[]) =>
			l.filter((t) => ["job-open", "future", "evergreen"].includes(t));
		expect(dated(popup)).toEqual(["job-open", "future", "evergreen"]);
		expect(dated(careers)).toEqual(["job-open", "future", "evergreen"]);
	});

	it("keeps other content types out", () => {
		expect(popup).not.toContain("news-item");
		expect(careers).not.toContain("news-item");
	});
});
