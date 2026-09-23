/**
 * Writes the webp derivatives an image was uploaded before we made any, so a
 * phone stops downloading a 4384px original for a 340px card. Corrects any
 * `media.width`/`height` that disagrees with the size a browser draws the file
 * at, since that is what decides which derivatives a card may offer.
 *
 *   bun scripts/backfill-image-sizes.ts --db ./cms.db
 *   bun scripts/backfill-image-sizes.ts --db ./cms.db --apply
 *
 * Reads the media rows of the named database, never the app's own, and the
 * bytes behind them from R2 or `public/uploads` (relative to the working
 * directory, as the app writes them). Dry run without `--apply`. Only ever adds
 * files: an original is never rewritten or removed, and a derivative that is
 * already there is left alone. Both runs encode, so the size printed before any
 * write is measured rather than guessed. A file that cannot be read or decoded
 * is named, counted, and stepped over; the run exits non-zero if any did.
 */
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import {
	derivativePath,
	derivativeWidths,
	isDerivable,
} from "#/lib/image-widths";
import { drawnSize, type ImageSize, webpAt } from "#/server/images";
import { media } from "#/server/schema";
import { r2 } from "#/server/storage";

const USAGE = "usage: bun scripts/backfill-image-sizes.ts --db <path> [--apply]";

function parseArgs(argv: string[]) {
	const at = argv.indexOf("--db");
	const path = at === -1 ? "" : argv[at + 1];
	if (!path || path.startsWith("--")) {
		console.error(`--db <path> is required.\n${USAGE}`);
		process.exit(2);
	}
	return { path, apply: argv.includes("--apply") };
}

const { path, apply } = parseArgs(process.argv.slice(2));
if (!existsSync(path)) {
	console.error(`No database at ${path}.`);
	process.exit(1);
}
// create: false, and readonly unless a correction is actually going to be written
const db = drizzle(
	new Database(
		path,
		apply ? { readwrite: true, create: false } : { readonly: true },
	),
);

const local = (key: string) => `public/${key}`;

async function readSource(key: string): Promise<Uint8Array | null> {
	if (r2) {
		const buf = await r2
			.file(key)
			.arrayBuffer()
			.catch(() => null);
		return buf ? new Uint8Array(buf) : null;
	}
	const file = Bun.file(local(key));
	return (await file.exists()) ? new Uint8Array(await file.arrayBuffer()) : null;
}

const derivativeExists = (key: string): Promise<boolean> =>
	r2 ? r2.file(key).exists() : Bun.file(local(key)).exists();

async function writeDerivative(key: string, bytes: Uint8Array): Promise<void> {
	if (r2) await r2.write(key, bytes, { type: "image/webp" });
	else await Bun.write(local(key), bytes);
}

type Row = { id: number; r2Key: string; width: number | null; height: number | null };

// by key, not by row: two media rows can point at one uploaded file
const byKey = new Map<string, Row[]>();
for (const row of await db
	.select({
		id: media.id,
		r2Key: media.r2Key,
		width: media.width,
		height: media.height,
	})
	.from(media)
	.where(like(media.contentType, "image/%"))) {
	if (!isDerivable(row.r2Key)) continue;
	const at = byKey.get(row.r2Key);
	if (at) at.push(row);
	else byKey.set(row.r2Key, [row]);
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// both passes meet the same broken file; the operator only needs telling once
const named = new Set<string>();
function nameFailure(at: string, err?: unknown) {
	if (named.has(at)) return;
	named.add(at);
	const why = err instanceof Error ? err.message : String(err ?? "");
	console.error(`[fail] ${at}${why ? `: ${why}` : ""}`);
}

type Correction = {
	id: number;
	was: string;
	now: string;
	width: number;
	height: number;
};

/** Rows whose recorded size is not the size a browser draws the file at. */
function misrecorded(rows: Row[], size: ImageSize): Correction[] {
	return rows
		.filter((r) => r.width !== size.width || r.height !== size.height)
		.map((r) => ({
			id: r.id,
			was: `${r.width ?? "?"}×${r.height ?? "?"}`,
			now: `${size.width}×${size.height}`,
			width: size.width,
			height: size.height,
		}));
}

async function missingWidths(key: string, width: number): Promise<number[]> {
	const missing: number[] = [];
	for (const w of derivativeWidths(width))
		if (!(await derivativeExists(derivativePath(key, w)))) missing.push(w);
	return missing;
}

/** Encodes every derivative that is missing, writing only when asked to. */
async function pass(write: boolean) {
	let files = 0;
	let bytes = 0;
	let settled = 0;
	let unreadable = 0;
	let failed = 0;
	const corrections: Correction[] = [];
	for (const [key, rows] of byKey) {
		const at = `#${rows.map((r) => r.id).join(",")} ${key}`;
		const source = await readSource(key);
		if (!source) {
			// seeded rows have never had a file behind them (see storage.ts)
			if (!write && !key.startsWith("seed/"))
				console.warn(`[skip] ${at}: no bytes`);
			unreadable++;
			continue;
		}
		const size = await drawnSize(source);
		if (!size) {
			nameFailure(at, "nothing sharp can measure");
			failed++;
			continue;
		}
		const missing = await missingWidths(key, size.width);
		if (missing.length === 0) {
			settled++;
			corrections.push(...misrecorded(rows, size));
			continue;
		}
		try {
			for (const w of missing) {
				const out = await webpAt(source, w);
				files++;
				bytes += out.length;
				if (write) await writeDerivative(derivativePath(key, w), out);
			}
			// after the encode: a recorded width promises candidates that must exist
			corrections.push(...misrecorded(rows, size));
		} catch (err) {
			// one unreadable file must not cost the other 400 theirs
			nameFailure(at, err);
			failed++;
		}
	}
	if (write)
		for (const c of corrections)
			await db
				.update(media)
				.set({ width: c.width, height: c.height })
				.where(eq(media.id, c.id));
	return { files, bytes, settled, unreadable, failed, corrections };
}

const planned = await pass(false);
console.log(
	`${byKey.size} image files: ${planned.settled} with nothing to add` +
		(planned.unreadable ? `, ${planned.unreadable} with no bytes` : "") +
		(planned.failed ? `, ${planned.failed} that could not be read` : ""),
);
for (const c of planned.corrections.slice(0, 10))
	console.log(`  #${c.id} recorded ${c.was}, drawn ${c.now}`);
if (planned.corrections.length > 10)
	console.log(`  … and ${planned.corrections.length - 10} more`);
if (planned.corrections.length)
	console.log(`${planned.corrections.length} rows to re-measure.`);
if (planned.files) console.log(`${planned.files} files to add, ${mb(planned.bytes)} on disk.`);

if (!planned.files && !planned.corrections.length) {
	console.log("Every derivative is already there — nothing to do.");
	process.exit(planned.failed ? 1 : 0);
}

if (!apply) {
	console.log("\nDry run. Re-run with --apply to write them.");
	process.exit(planned.failed ? 1 : 0);
}

const written = await pass(true);
console.log(
	`\nWrote ${written.files} files, ${mb(written.bytes)}; re-measured ${written.corrections.length} rows.`,
);
if (written.failed) {
	console.error(`${written.failed} file(s) failed — named above.`);
	process.exit(1);
}
console.log("Re-run to confirm nothing is left.");
