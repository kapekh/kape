import { rm } from "node:fs/promises";

import { env } from "#/env";
import { derivativePath, IMAGE_WIDTHS, isDerivable } from "#/lib/image-widths";
import { imageDerivatives } from "./images";

// Bun's built-in S3 client type. Referenced as the `Bun.S3Client` global at
// runtime (see db.ts for why we avoid importing from "bun").
type S3Client = Bun.S3Client;

// R2 speaks the S3 API, so Bun's S3Client points at the R2 endpoint with region "auto"
function createR2(): S3Client | null {
	if (
		!env.R2_ACCOUNT_ID ||
		!env.R2_ACCESS_KEY_ID ||
		!env.R2_SECRET_ACCESS_KEY ||
		!env.R2_BUCKET
	) {
		return null;
	}

	return new Bun.S3Client({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		bucket: env.R2_BUCKET,
		region: "auto",
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	});
}

export const r2 = createR2();

/** Public URL for an object key, when a public base URL is configured. */
function publicUrl(key: string): string | null {
	if (!env.R2_PUBLIC_URL) return null;
	return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export type StoredObject = { key: string; url: string };

// falls back to public/uploads so media works in development without cloud credentials
export async function saveUpload(
	bytes: ArrayBuffer | Uint8Array,
	contentType: string,
	ext: string,
): Promise<StoredObject> {
	const id = crypto.randomUUID();
	// lowercased to match LOCAL_KEY below, which decides what deleteUpload unlinks
	const safeExt =
		ext
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "")
			.slice(0, 8) || "bin";
	const key = r2 ? `media/${id}.${safeExt}` : `uploads/${id}.${safeExt}`;

	// derived before anything is written: a source sharp cannot read fails the
	// upload with nothing stored, rather than leaving an original no card can size down
	const derivatives =
		contentType.startsWith("image/") && isDerivable(key)
			? await imageDerivatives(
					bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
				)
			: [];

	try {
		if (r2) {
			await r2.write(key, bytes as Uint8Array, { type: contentType });
			for (const d of derivatives)
				await r2.write(derivativePath(key, d.width), d.bytes, {
					type: "image/webp",
				});
			return { key, url: publicUrl(key) ?? `/${key}` };
		}

		// Local fallback — served statically from /public.
		await Bun.write(`public/${key}`, bytes);
		for (const d of derivatives)
			await Bun.write(`public/${derivativePath(key, d.width)}`, d.bytes);
		return { key, url: `/${key}` };
	} catch (err) {
		// a write that stopped half way leaves files no media row will ever name
		await deleteUpload(key).catch((cleanup: unknown) => {
			console.error(`[storage] ${key} half-written and left behind:`, cleanup);
		});
		throw err;
	}
}

// what saveUpload writes locally: uploads/<uuid>.<ext>. Seeded rows carry
// `seed/…` keys with no file behind them, so only our own uploads are unlinked.
const LOCAL_KEY = /^uploads\/[A-Za-z0-9-]+\.[a-z0-9]{1,8}$/;

// idempotent; without it a deleted media row leaves its bytes on disk, still served at the original URL
export async function deleteUpload(key: string): Promise<void> {
	const derived = isDerivable(key)
		? IMAGE_WIDTHS.map((w) => derivativePath(key, w))
		: [];
	if (r2) {
		for (const k of [key, ...derived]) await r2.delete(k).catch(() => {});
		return;
	}
	if (!LOCAL_KEY.test(key)) return;
	for (const k of [key, ...derived]) await rm(`public/${k}`, { force: true });
}
