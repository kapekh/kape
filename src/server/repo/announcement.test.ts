import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// a notice has two surfaces; past its deadline the popup drops it and the careers
// list keeps it, marked closed
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

type Detail = { slug: string; deadline: string | null; closed: boolean };

const surfaces = (): {
	popup: string[];
	careers: string[];
	closed: string[];
	details: Detail[];
} =>
	JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
				 import { listActiveAnnouncements } from "${root}/src/server/repo/site.ts";
				 import { getPostBySlug, listJobs } from "${root}/src/server/repo/content.ts";
				 const c = raw;
				 for (const n of ${JSON.stringify(NOTICES)}) {
					 c.run("insert into posts (tenant_id, content_type, slug, status, published_at, meta) values (1, ?, ?, 'published', '2026-01-01', ?)",
						 [n.type, n.slug, JSON.stringify({ deadline: n.deadline })]);
					 const id = c.query("select id from posts where slug = ?").get(n.slug).id;
					 c.run("insert into translations (tenant_id, entity_type, entity_id, lang, field, value) values (1, 'post', ?, 'en', 'title', ?)",
						 [id, n.slug]);
				 }
				 const popup = await listActiveAnnouncements(db, "en");
				 const careers = await listJobs(db, "en");
				 const details = [];
				 for (const slug of ["future", "expired", "news-item"]) {
					 const p = await getPostBySlug(db, slug, "en");
					 details.push({ slug, deadline: p?.deadline ?? null, closed: Boolean(p?.closed) });
				 }
				 console.log(JSON.stringify({
					 popup: popup.map((r) => r.title),
					 careers: careers.map((r) => r.title),
					 closed: careers.filter((r) => r.closed).map((r) => r.title),
					 details,
				 }));
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

const { popup, careers, closed, details } = surfaces();

// the cache has no way to hear a deadline pass, so a page whose wording depends on
// one must not be stored at all
const cachedKeys = (): string[] =>
	JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
				 import { resolveRouteCached } from "${root}/src/server/repo/route.ts";
				 await resolveRouteCached(db, "news", "en");
				 await resolveRouteCached(db, "careers", "en");
				 console.log(JSON.stringify(raw.query("select key from render_cache").all().map((r) => r.key)));
				 process.exit(0);`,
			],
			{ env: { ...process.env, DATABASE_PATH: dbPath }, encoding: "utf8" },
		)
			.trim()
			.split("\n")
			.pop() as string,
	);

describe("a page whose wording turns over at a deadline", () => {
	const keys = cachedKeys();

	it("is not cached, while a listing with no deadline is", () => {
		expect(keys.some((k) => k.endsWith("::news"))).toBe(true);
		expect(keys.some((k) => k.endsWith("::careers"))).toBe(false);
	});
});

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

	it("stops popping a notice up past its deadline, and keeps listing it", () => {
		expect(popup).not.toContain("job-closed");
		expect(popup).not.toContain("expired");
		expect(careers).toContain("job-closed");
		expect(careers).toContain("expired");
	});

	it("says which listed notices are closed, and puts them last", () => {
		expect(closed.sort()).toEqual(["expired", "job-closed"]);
		expect(careers.slice(-2).sort()).toEqual(["expired", "job-closed"]);
	});

	it("orders both by nearest deadline, whatever the type", () => {
		const dated = (l: string[]) =>
			l.filter((t) => ["job-open", "future", "evergreen"].includes(t));
		expect(dated(popup)).toEqual(["job-open", "future", "evergreen"]);
		expect(dated(careers)).toEqual(["job-open", "future", "evergreen"]);
	});

	it("carries the closed state onto the page the row links to", () => {
		const by = (slug: string) => details.find((d) => d.slug === slug);
		expect(by("expired")?.closed).toBe(true);
		expect(by("expired")?.deadline).toBe(`${year - 5}-01-01`);
		expect(by("future")?.closed).toBe(false);
		expect(by("future")?.deadline).toBe(`${year + 5}-12-15`);
		expect(by("news-item")?.deadline).toBeNull();
	});

	it("keeps other content types out", () => {
		expect(popup).not.toContain("news-item");
		expect(careers).not.toContain("news-item");
	});
});
