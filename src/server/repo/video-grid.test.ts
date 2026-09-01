import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: both the order and the cut are SQL-adjacent,
// and the home page's video row is exactly what regressed
const dir = mkdtempSync(join(tmpdir(), "video-grid-"));
const dbPath = join(dir, "videos.db");
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

const out = execFileSync(
	"bun",
	[
		"-e",
		`import { db } from "${root}/src/server/db.ts";
		 import { posts } from "${root}/src/server/schema.ts";
		 import { listVideos } from "${root}/src/server/repo/content.ts";
		 import { resolveSections } from "${root}/src/server/repo/sections.ts";

		 // deliberately inserted out of order, and one with no publish date at all
		 const rows = [
			["oldest", "2020-01-01"],
			["newest", "2024-06-30"],
			["middle", "2022-03-15"],
			["undated", null],
			["second", "2024-01-02"],
			["third", "2023-11-09"],
			["fourth", "2023-05-05"],
			["fifth", "2021-08-08"],
		 ];
		 for (const [slug, publishedAt] of rows)
			await db.insert(posts).values({
				tenantId: 1,
				contentType: "video",
				slug,
				status: "published",
				publishedAt,
				meta: { youtube_url: "https://youtu.be/" + slug },
			});

		 const section = (query) => ({
			id: "videos",
			type: "videoGrid",
			layout: "grid-3",
			query,
			props: { title: "From the classroom" },
		 });
		 const slugs = async (query) => {
			const [s] = await resolveSections(db, [section(query)], "en");
			return s.props.data.map((v) => v.slug);
		 };

		 console.log(JSON.stringify({
			order: (await listVideos(db, "en")).map((v) => v.slug),
			limited: await slugs({ source: "videos", limit: 6 }),
			all: await slugs({ source: "videos" }),
		 }));`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const result = JSON.parse(out.trim().split("\n").at(-1) as string) as {
	order: string[];
	limited: string[];
	all: string[];
};

describe("video grid", () => {
	it("puts the most recently published video first, undated ones last", () => {
		expect(result.order).toEqual([
			"newest",
			"second",
			"third",
			"fourth",
			"middle",
			"fifth",
			"oldest",
			"undated",
		]);
	});

	it("honours the section editor's Limit, which the videos source used to drop", () => {
		expect(result.limited).toEqual([
			"newest",
			"second",
			"third",
			"fourth",
			"middle",
			"fifth",
		]);
	});

	it("still shows every video where no limit is set, as the /videos page needs", () => {
		expect(result.all).toHaveLength(8);
	});
});
