/**
 * Fills media.width/height for rows uploaded before the size was recorded.
 * Reads each object back from R2 (or public/uploads) and parses its header.
 *
 *   bun scripts/backfill-media-size.ts
 */
import { eq, isNull, like, or } from "drizzle-orm";

import { db } from "#/server/db";
import { drawnSize } from "#/server/images";
import { media } from "#/server/schema";
import { r2 } from "#/server/storage";

const rows = await db
	.select({
		id: media.id,
		r2Key: media.r2Key,
		url: media.url,
		contentType: media.contentType,
	})
	.from(media)
	.where(or(isNull(media.width), isNull(media.height)));

let done = 0;
let skipped = 0;

for (const row of rows) {
	if (row.contentType && !row.contentType.startsWith("image/")) {
		skipped++;
		continue;
	}
	const bytes = await readBytes(row.r2Key, row.url);
	if (!bytes) {
		console.warn(`[skip] #${row.id} ${row.r2Key}: no bytes`);
		skipped++;
		continue;
	}
	const size = await drawnSize(bytes);
	if (!size) {
		skipped++;
		continue;
	}
	await db
		.update(media)
		.set({ width: size.width, height: size.height })
		.where(eq(media.id, row.id));
	done++;
	console.log(`#${row.id} ${row.r2Key} → ${size.width}×${size.height}`);
}

console.log(`\nmeasured ${done}, skipped ${skipped}`);

const small = await db
	.select({ id: media.id, url: media.url, width: media.width, height: media.height })
	.from(media)
	.where(like(media.contentType, "image/%"));
const blurry = small.filter(
	(m) => m.width && m.height && Math.max(m.width, m.height) < 1200,
);
if (blurry.length) {
	console.log(`\n${blurry.length} image(s) too small for a cover or hero slot:`);
	for (const m of blurry) console.log(`  #${m.id} ${m.width}×${m.height} ${m.url}`);
}

async function readBytes(key: string, url: string | null) {
	if (r2) {
		const buf = await r2
			.file(key)
			.arrayBuffer()
			.catch(() => null);
		return buf ? new Uint8Array(buf) : null;
	}
	const path = url?.startsWith("/") ? `public${url}` : `public/${key}`;
	const file = Bun.file(path);
	if (!(await file.exists())) return null;
	return new Uint8Array(await file.arrayBuffer());
}
