import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";

import { deleteUpload } from "./storage";

const KEY = "uploads/00000000-0000-4000-8000-00000000test.png";
const PATH = `public/${KEY}`;
// A file the traversal attempt aims at, so the assertion proves the refusal
// rather than depending on whatever happens to sit in the repo root.
const OUTSIDE = "traversal-target.tmp";

afterAll(() =>
	Promise.all([rm(PATH, { force: true }), rm(OUTSIDE, { force: true })]),
);

describe("deleteUpload", () => {
	it("removes the file behind an upload key", async () => {
		await mkdir("public/uploads", { recursive: true });
		await writeFile(PATH, "x");
		await deleteUpload(KEY);
		expect(existsSync(PATH)).toBe(false);
	});

	it("is idempotent on an already-missing file", async () => {
		await expect(deleteUpload(KEY)).resolves.toBeUndefined();
	});

	it("ignores keys that are not our own uploads", async () => {
		await writeFile(OUTSIDE, "x");
		await expect(deleteUpload("seed/nav-who.jpg")).resolves.toBeUndefined();
		await expect(
			deleteUpload(`uploads/../../${OUTSIDE}`),
		).resolves.toBeUndefined();
		expect(existsSync(OUTSIDE)).toBe(true);
	});
});
