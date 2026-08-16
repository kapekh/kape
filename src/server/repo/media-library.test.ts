import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: the filter is SQL, and a stub would only test the stub
const dir = mkdtempSync(join(tmpdir(), "media-library-"));
const dbPath = join(dir, "media.db");
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
		 import * as admin from "${root}/src/server/repo/admin.ts";
		 const add = (name, contentType) =>
			admin.createMediaRecord(db, {
				r2Key: name, url: "/uploads/" + name, contentType, size: 10,
			});
		 await add("a.png", "image/png");
		 await add("b.jpg", "image/jpeg");
		 await add("clip.mp4", "video/mp4");
		 await add("notes.pdf", "application/pdf");
		 await add("mystery", null);
		 const keys = (type) =>
			admin
				.adminListMediaPage(db, { limit: 100, offset: 0, type })
				.then((rows) => rows.map((r) => r.r2Key).sort());
		 console.log(JSON.stringify({
			stats: await admin.adminMediaStats(db),
			all: await keys("all"),
			image: await keys("image"),
			video: await keys("video"),
			file: await keys("file"),
		 }));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const r = JSON.parse(out.trim().split("\n").pop() ?? "{}") as {
	stats: { total: number; images: number; videos: number; files: number };
	all: string[];
	image: string[];
	video: string[];
	file: string[];
};

describe("the media library's type filter", () => {
	it("gives Videos its own tab", () => {
		expect(r.video).toEqual(["clip.mp4"]);
		expect(r.stats.videos).toBe(1);
	});

	it("leaves Files meaning everything that is not an image", () => {
		expect(r.file).toEqual(["clip.mp4", "mystery", "notes.pdf"]);
		expect(r.stats.files).toBe(3);
	});

	it("keeps Images and All where they were", () => {
		expect(r.image).toEqual(["a.png", "b.jpg"]);
		expect(r.stats.images).toBe(2);
		expect(r.all).toHaveLength(5);
		expect(r.stats.total).toBe(5);
	});
});
