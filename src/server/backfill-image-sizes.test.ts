import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { derivativePath, IMAGE_WIDTHS } from "#/lib/image-widths";

// a Bun subprocess: the script opens the named file with bun:sqlite, which has
// no Node equivalent. It runs in a directory of its own, since it reads and
// writes `public/uploads` relative to the working one and the checkout is not
// a scratch space.
const dir = mkdtempSync(join(tmpdir(), "image-sizes-"));
const DB = join(dir, "site.db");
const SCRIPT = resolve("scripts/backfill-image-sizes.ts");
const uploads = join(dir, "public", "uploads");

const KEY = "uploads/00000000-0000-4000-8000-0000backfill.png";
const TURNED = "uploads/00000000-0000-4000-8000-00000turned.png";
// header reads, pixels do not: what a half-finished upload leaves behind
const TORN = "uploads/00000000-0000-4000-8000-00000000torn.png";
// no header at all: the silent case, where no widths reads the same as none needed
const GARBLED = "uploads/00000000-0000-4000-8000-00000garbled.png";
const BESIDE = "uploads/00000000-0000-4000-8000-000000beside.png";
const UNMEASURED = "uploads/00000000-0000-4000-8000-0000unmeasured.png";

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const at = (key: string) => join(dir, "public", key);
const present = (key: string) =>
	IMAGE_WIDTHS.filter((w) => existsSync(at(derivativePath(key, w))));

function bun(source: string) {
	return execFileSync("bun", ["-e", source], { encoding: "utf8" }).trim();
}

type Row = { key: string; width: number | null; height: number | null };
const measured = (key: string): Row => ({ key, width: 1000, height: 400 });

/** An empty database on every migration, carrying one image row per key. */
function install(path: string, rows: Row[]) {
	bun(`
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
const db = new Database(${JSON.stringify(path)}, { create: true });
db.exec("PRAGMA foreign_keys = OFF;");
for (const f of readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort())
	for (const s of readFileSync("drizzle/" + f, "utf8").split("--> statement-breakpoint"))
		if (s.trim()) db.exec(s.trim());
db.query("insert into tenants (id, slug, name) values (1,'site','Site')").run();
const add = db.query("insert into media (tenant_id, r2_key, url, content_type, width, height) values (1,?,?,'image/png',?,?)");
for (const r of ${JSON.stringify(rows)}) add.run(r.key, "/" + r.key, r.width, r.height);
`);
}

/** stdout plus stderr and the exit status, since a failed file is meant to be both. */
function backfill(path: string, ...args: string[]) {
	try {
		return {
			status: 0,
			out: execFileSync("bun", [SCRIPT, "--db", path, ...args], {
				cwd: dir,
				encoding: "utf8",
				stdio: "pipe",
			}),
		};
	} catch (err) {
		const e = err as { status: number; stdout: string; stderr: string };
		return { status: e.status, out: e.stdout + e.stderr };
	}
}

function run(...args: string[]) {
	const { status, out } = backfill(DB, ...args);
	if (status !== 0) throw new Error(out);
	return out;
}

function sizeOf(path: string, key: string) {
	return JSON.parse(
		bun(`
import { Database } from "bun:sqlite";
const db = new Database(${JSON.stringify(path)});
console.log(JSON.stringify(db.query("select width, height from media where r2_key = ?").get(${JSON.stringify(key)})));
`),
	) as { width: number | null; height: number | null };
}

const png = (orientation?: number) => {
	const image = sharp({
		create: { width: 1000, height: 400, channels: 3, background: "#336699" },
	});
	return (orientation ? image.withMetadata({ orientation }) : image)
		.png()
		.toBuffer();
};

let original: Buffer;

beforeAll(async () => {
	await mkdir(uploads, { recursive: true });
	await writeFile(at(KEY), await png());
	original = readFileSync(at(KEY));
	install(DB, [measured(KEY)]);
});

describe("backfill-image-sizes", () => {
	it("refuses to run without a database to run against", () => {
		expect(() =>
			execFileSync("bun", [SCRIPT], {
				cwd: dir,
				encoding: "utf8",
				stdio: "pipe",
			}),
		).toThrow(/--db/);
	});

	it("names a path that has no database, and creates nothing there", () => {
		const absent = join(dir, "typo.db");
		expect(() =>
			execFileSync("bun", [SCRIPT, "--db", absent], {
				cwd: dir,
				encoding: "utf8",
				stdio: "pipe",
			}),
		).toThrow(/No database at/);
		expect(existsSync(absent)).toBe(false);
	});

	it("counts the files and the disk it will take, and writes nothing", () => {
		const out = run();
		expect(out).toMatch(/3 files to add, 0\.\d MB on disk/);
		expect(out).toMatch(/--apply/);
		expect(present(KEY)).toEqual([]);
	});

	it("writes a webp per width the source is wider than, leaving the original alone", () => {
		expect(run("--apply")).toMatch(/Wrote 3 files/);
		expect(present(KEY)).toEqual([320, 640, 960]);
		expect(readFileSync(at(KEY)).equals(original)).toBe(true);
	});

	it("has nothing to do on the second run, and rewrites nothing", () => {
		const before = present(KEY).map((w) =>
			readFileSync(at(derivativePath(KEY, w))),
		);
		expect(run("--apply")).toContain("nothing to do");
		const after = present(KEY).map((w) =>
			readFileSync(at(derivativePath(KEY, w))),
		);
		expect(after.map((b) => b.length)).toEqual(before.map((b) => b.length));
		expect(after.every((b, i) => b.equals(before[i]))).toBe(true);
	});

	it("re-measures a row recorded before the file's orientation was read", async () => {
		const db = join(dir, "turned.db");
		install(db, [measured(TURNED)]);
		await writeFile(at(TURNED), await png(6));

		const { status, out } = backfill(db, "--apply");
		expect(status).toBe(0);
		expect(out).toContain("recorded 1000×400, drawn 400×1000");
		expect(out).toContain("re-measured 1 rows");
		expect(sizeOf(db, TURNED)).toEqual({ width: 400, height: 1000 });
		// the row now agrees with the one file a 400px-wide source gets
		expect(present(TURNED)).toEqual([320]);
	});

	it("names the files it cannot read, writes the rest, and exits non-zero", async () => {
		const db = join(dir, "torn.db");
		install(db, [measured(TORN), measured(GARBLED), measured(BESIDE)]);
		const whole = await png();
		await writeFile(
			at(TORN),
			whole.subarray(0, Math.floor(whole.length * 0.6)),
		);
		await writeFile(at(GARBLED), "not a png at all");
		await writeFile(at(BESIDE), whole);

		const { status, out } = backfill(db, "--apply");
		expect(status).toBe(1);
		expect(out).toContain(TORN);
		expect(out).toContain(GARBLED);
		expect(out).toMatch(/2 that could not be read/);
		expect(out).toMatch(/2 file\(s\) failed/);
		// neither is counted as a file with nothing to add
		expect(out).toMatch(/3 image files: 0 with nothing to add/);
		expect(present(TORN)).toEqual([]);
		expect(present(GARBLED)).toEqual([]);
		// the good row beside them still got everything it was owed
		expect(present(BESIDE)).toEqual([320, 640, 960]);
	});

	// a width is a promise of candidates; recording one for a file that has no
	// derivatives buys a 404 and a retry on every card that draws it
	it("leaves the size of a file it cannot decode exactly as it was", async () => {
		const db = join(dir, "unmeasured.db");
		install(db, [{ key: UNMEASURED, width: null, height: null }]);
		const whole = await png();
		await writeFile(
			at(UNMEASURED),
			whole.subarray(0, Math.floor(whole.length * 0.6)),
		);

		const { status, out } = backfill(db, "--apply");
		expect(status).toBe(1);
		expect(out).toContain(UNMEASURED);
		expect(sizeOf(db, UNMEASURED)).toEqual({ width: null, height: null });
		expect(present(UNMEASURED)).toEqual([]);
	});
});
