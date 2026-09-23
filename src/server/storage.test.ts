import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";

import { derivativePath, IMAGE_WIDTHS } from "#/lib/image-widths";

// both functions resolve `public/` against the working directory and write with
// Bun.write, so they run in a Bun subprocess with a directory of their own:
// vitest has no Bun global, and the checkout is not a scratch space
const sandbox = mkdtempSync(join(tmpdir(), "storage-"));
const STORAGE = resolve("src/server/storage.ts");

const KEY = "uploads/00000000-0000-4000-8000-00000000test.png";
const OUTSIDE = "traversal-target.tmp";

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

/** A `public/` of its own per run, so what a run left behind is all that is there. */
function inSandbox<T>(body: string): { value: T; dir: string } {
	const dir = mkdtempSync(join(sandbox, "run-"));
	const out = execFileSync(
		"bun",
		[
			"-e",
			`const { saveUpload, deleteUpload } = await import(${JSON.stringify(STORAGE)});\n${body}`,
		],
		{ cwd: dir, encoding: "utf8", stdio: "pipe" },
	);
	// the auth module warns about its default secret on import
	return {
		value: JSON.parse(out.trim().split("\n").pop() ?? "null") as T,
		dir,
	};
}

const read = (bytes: string) =>
	`new Uint8Array(await Bun.file(${JSON.stringify(bytes)}).arrayBuffer())`;

async function fixture(name: string, bytes: Uint8Array | string) {
	const path = join(sandbox, name);
	await writeFile(path, bytes);
	return path;
}

async function png(width: number, height: number): Promise<Uint8Array> {
	const buf = await sharp({
		create: { width, height, channels: 3, background: "#336699" },
	})
		.png()
		.toBuffer();
	return new Uint8Array(buf);
}

function store(path: string, contentType: string, ext: string) {
	const { value, dir } = inSandbox<string>(
		`const { key } = await saveUpload(${read(path)}, ${JSON.stringify(contentType)}, ${JSON.stringify(ext)});
console.log(JSON.stringify(key));`,
	);
	const stored = (key: string) => join(dir, "public", key);
	return {
		key: value,
		stored,
		present: () =>
			IMAGE_WIDTHS.filter((w) => existsSync(stored(derivativePath(value, w)))),
	};
}

describe("saveUpload", () => {
	it("writes a webp beside the original for every width it is wider than", async () => {
		const up = store(
			await fixture("wide.png", await png(1000, 400)),
			"image/png",
			"png",
		);
		expect(existsSync(up.stored(up.key))).toBe(true);
		expect(up.present()).toEqual([320, 640, 960]);
		for (const w of up.present()) {
			const meta = await sharp(
				readFileSync(up.stored(derivativePath(up.key, w))),
			).metadata();
			expect(meta.format).toBe("webp");
			expect(meta.width).toBe(w);
		}
	});

	it("leaves the original byte-for-byte what was uploaded", async () => {
		const path = await fixture("small.png", await png(700, 500));
		const up = store(path, "image/png", "png");
		expect(readFileSync(up.stored(up.key)).equals(readFileSync(path))).toBe(
			true,
		);
	});

	it("derives nothing from a file that is not an image", async () => {
		const up = store(
			await fixture("paper.pdf", "%PDF-1.4\n"),
			"application/pdf",
			"pdf",
		);
		expect(existsSync(up.stored(up.key))).toBe(true);
		expect(up.present()).toEqual([]);
	});

	// half a write leaves files no media row will ever name, and the route tells
	// the editor nothing was stored
	it("takes its own partial write back out when a write fails", async () => {
		const path = await fixture("torn.png", await png(1000, 400));
		const { value } = inSandbox<{ failed: boolean; left: string[] }>(
			`const real = Bun.write;
let writes = 0;
Bun.write = (...args) => {
	if (++writes === 2) throw new Error("no space left on device");
	return real(...args);
};
let failed = false;
try { await saveUpload(${read(path)}, "image/png", "png"); } catch { failed = true; }
console.log(JSON.stringify({ failed, left: [...new Bun.Glob("**/*").scanSync("public")] }));`,
		);
		expect(value).toEqual({ failed: true, left: [] });
	});
});

describe("deleteUpload", () => {
	it("takes the derivatives with it, which are served from the same URLs", async () => {
		const path = await fixture("doomed.png", await png(1000, 401));
		const { value } = inSandbox<string[]>(
			`const { key } = await saveUpload(${read(path)}, "image/png", "png");
await deleteUpload(key);
console.log(JSON.stringify([...new Bun.Glob("**/*").scanSync("public")]));`,
		);
		expect(value).toEqual([]);
	});

	// a second call throwing would take the subprocess down with it
	it("removes the file behind an upload key, and is quiet the second time", () => {
		const { value } = inSandbox<string[]>(
			`await Bun.write("public/${KEY}", "x");
await deleteUpload("${KEY}");
await deleteUpload("${KEY}");
console.log(JSON.stringify([...new Bun.Glob("**/*").scanSync("public")]));`,
		);
		expect(value).toEqual([]);
	});

	// the traversal attempt aims at a file that is really there, so the assertion
	// proves the refusal rather than that nothing was at the path
	it("ignores keys that are not our own uploads", () => {
		const { value, dir } = inSandbox<boolean>(
			`await Bun.write("public/${KEY}", "x");
await Bun.write("${OUTSIDE}", "x");
await deleteUpload("seed/nav-who.jpg");
await deleteUpload("uploads/../../${OUTSIDE}");
console.log(JSON.stringify(await Bun.file("public/${KEY}").exists()));`,
		);
		expect(value).toBe(true);
		expect(existsSync(join(dir, OUTSIDE))).toBe(true);
	});
});
