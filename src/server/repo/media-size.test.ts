import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database and a real image on disk: the upload route
// measures bytes and writes columns, and a stub would only test the stub
const dir = mkdtempSync(join(tmpdir(), "media-size-"));
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
		 import { drawnSize } from "${root}/src/server/images.ts";
		 import * as admin from "${root}/src/server/repo/admin.ts";
		 const bytes = new Uint8Array(await Bun.file("${root}/public/logo.png").arrayBuffer());
		 const dims = await drawnSize(bytes);
		 const id = await admin.createMediaRecord(db, {
			r2Key: "uploads/logo.png",
			url: "/uploads/logo.png",
			contentType: "image/png",
			size: bytes.byteLength,
			width: dims?.width,
			height: dims?.height,
		 });
		 const noDims = await admin.createMediaRecord(db, {
			r2Key: "uploads/report.pdf",
			url: "/uploads/report.pdf",
			contentType: "application/pdf",
			size: 4,
		 });
		 console.log(JSON.stringify({
			measured: dims,
			byId: await admin.adminMediaById(db, id),
			pdf: await admin.adminMediaById(db, noDims),
			listed: (await admin.adminListMediaPage(db, { limit: 100, offset: 0, type: "image" }))
				.map((r) => ({ key: r.r2Key, width: r.width, height: r.height })),
		 }));`,
	],
	{ env: { ...process.env, DATABASE_PATH: dbPath }, encoding: "utf8" },
);

const result = JSON.parse(out.trim().split("\n").at(-1) as string);

describe("intrinsic image size, end to end", () => {
	it("measures the real file as a browser draws it", () => {
		expect(result.measured).toEqual({ width: 512, height: 512 });
	});

	it("persists the size and reads it back for a picker", () => {
		expect(result.byId).toMatchObject({ width: 512, height: 512 });
	});

	it("carries the size into the media library listing", () => {
		expect(result.listed).toContainEqual({
			key: "uploads/logo.png",
			width: 512,
			height: 512,
		});
	});

	it("leaves the size null for a file that has none", () => {
		expect(result.pdf).toMatchObject({ width: null, height: null });
	});
});
