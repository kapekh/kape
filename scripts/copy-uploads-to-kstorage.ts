// One-off: copy a public/uploads tree (as taken off the old host) into the
// KOOMPI Cloud bucket, under the same names, so every /uploads/... url in the
// content resolves through routes/uploads.$.tsx.
//
//   KSTORAGE_URL=… KSTORAGE_API_KEY=… KSTORAGE_PUBLIC_URL=… \
//     bun scripts/copy-uploads-to-kstorage.ts <dir containing uploads/>
//
// Skips a file the CDN already serves at the same size, so a rerun after a
// failure only sends what is missing.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kstorage } from "#/server/storage";

const root = process.argv[2];
if (!root || !kstorage) {
	console.error(
		"usage: KSTORAGE_* set; bun scripts/copy-uploads-to-kstorage.ts <dir with uploads/>",
	);
	process.exit(2);
}
const store = kstorage;

const TYPES: Record<string, string> = {
	webp: "image/webp",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	svg: "image/svg+xml",
	avif: "image/avif",
	pdf: "application/pdf",
	mp4: "video/mp4",
	webm: "video/webm",
};

const names = readdirSync(join(root, "uploads")).filter((n) =>
	statSync(join(root, "uploads", n)).isFile(),
);
let sent = 0;
let skipped = 0;
const failed: string[] = [];

async function copy(name: string) {
	const key = `uploads/${name}`;
	const path = join(root, key);
	const size = statSync(path).size;
	const head = await fetch(store.url(key), { method: "HEAD" }).catch(() => null);
	if (head?.ok && Number(head.headers.get("content-length")) === size) {
		skipped++;
		return;
	}
	const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	const type = TYPES[ext] ?? "application/octet-stream";
	for (let attempt = 1; ; attempt++) {
		try {
			await store.write(key, new Uint8Array(await Bun.file(path).arrayBuffer()), type);
			sent++;
			return;
		} catch (err) {
			if (attempt >= 3) {
				failed.push(`${name}: ${err instanceof Error ? err.message : err}`);
				return;
			}
			await Bun.sleep(2000 * attempt);
		}
	}
}

const queue = [...names];
await Promise.all(
	Array.from({ length: 8 }, async () => {
		for (let n = queue.shift(); n; n = queue.shift()) {
			await copy(n);
			const done = sent + skipped + failed.length;
			if (done % 250 === 0) console.log(`${done}/${names.length}`);
		}
	}),
);

console.log(
	`${names.length} files: ${sent} sent, ${skipped} already there, ${failed.length} failed`,
);
for (const f of failed) console.log(`  ${f}`);
process.exit(failed.length ? 1 : 0);
