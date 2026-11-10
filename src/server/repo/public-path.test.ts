import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// the admin's "view this record" link is only as good as this mapping, so it runs
// against a real installed database rather than a stubbed row
const dir = mkdtempSync(join(tmpdir(), "public-path-"));
const dbPath = join(dir, "public-path.db");
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

const paths: Record<string, string | null> = JSON.parse(
	execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
			 import { publicPathFor } from "${root}/src/server/repo/route.ts";
			 const exec = (s) => raw.query(s).run();
			 const id = (s) => Number(raw.query(s).get().id);

			 exec("update pages set status='published' where slug='home'");
			 exec("insert into pages (tenant_id, slug, segment, status) values (1,'who-we-are/about','about','published')");
			 exec("insert into pages (tenant_id, slug, segment, status) values (1,'secret','secret','draft')");
			 exec("insert into posts (tenant_id, content_type, slug, status) values (1,'news','lab-opens','published')");
			 exec("insert into posts (tenant_id, content_type, slug, status) values (1,'story','a-teacher','published')");
			 exec("insert into posts (tenant_id, content_type, slug, status) values (1,'news','not-yet','draft')");
			 exec("insert into posts (tenant_id, content_type, slug, status) values (1,'document','staff-handbook','published')");
			 exec("insert into projects (tenant_id, code, slug) values (1,'NGS','new-generation-schools')");
			 exec("insert into people (tenant_id, is_public, slug) values (1,1,'sok-dara')");
			 exec("insert into people (tenant_id, is_public, slug) values (1,0,'internal-only')");

			 const parentId = id("select id from projects where slug='new-generation-schools'");
			 exec("insert into projects (tenant_id, code, slug, parent_id) values (1,'NGS-L','libraries'," + parentId + ")");

			 const one = async (kind, sql) => publicPathFor(db, kind, id(sql));
			 console.log(JSON.stringify({
			   home: await one("page", "select id from pages where slug='home'"),
			   nested: await one("page", "select id from pages where slug='who-we-are/about'"),
			   draftPage: await one("page", "select id from pages where slug='secret'"),
			   news: await one("post", "select id from posts where slug='lab-opens'"),
			   story: await one("post", "select id from posts where slug='a-teacher'"),
			   draftPost: await one("post", "select id from posts where slug='not-yet'"),
			   internalType: await one("post", "select id from posts where slug='staff-handbook'"),
			   project: await one("project", "select id from projects where slug='new-generation-schools'"),
			   subProject: await one("project", "select id from projects where slug='libraries'"),
			   person: await one("person", "select id from people where slug='sok-dara'"),
			   privatePerson: await one("person", "select id from people where slug='internal-only'"),
			   missing: await publicPathFor(db, "page", 99999),
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
		.pop() ?? "{}",
);

describe("publicPathFor", () => {
	it("serves the home page at the root, not at /home", () => {
		expect(paths.home).toBe("/");
	});

	it("uses a page's full slug as its path", () => {
		expect(paths.nested).toBe("/who-we-are/about");
	});

	it("files a post under its collection prefix", () => {
		expect(paths.news).toBe("/news/lab-opens");
		expect(paths.story).toBe("/stories/a-teacher");
	});

	it("nests a sub-project under its parent", () => {
		expect(paths.project).toBe("/projects/new-generation-schools");
		expect(paths.subProject).toBe("/projects/new-generation-schools/libraries");
	});

	it("links a person only while the team page lists them", () => {
		expect(paths.person).toBe("/team/sok-dara");
		expect(paths.privatePerson).toBeNull();
	});

	it("gives nothing for what the public site will not serve", () => {
		expect(paths.draftPage).toBeNull();
		expect(paths.draftPost).toBeNull();
		expect(paths.internalType).toBeNull();
		expect(paths.missing).toBeNull();
	});
});
