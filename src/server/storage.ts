import { rm } from "node:fs/promises";

import { env } from "#/env";

// Bun's built-in S3 client type. Referenced as the `Bun.S3Client` global at
// runtime (see db.ts for why we avoid importing from "bun").
type S3Client = Bun.S3Client;

/**
 * Object storage backed by Cloudflare R2 via Bun's built-in S3 client.
 *
 * R2 speaks the S3 API, so we point Bun's S3Client at the R2 endpoint
 * (`https://<account_id>.r2.cloudflarestorage.com`) with region "auto".
 *
 * Credentials are optional in dev; `requireStorage()` throws a clear error
 * if you try to use storage without them configured. Server-only.
 */
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

/** Returns the R2 client or throws if storage isn't configured. */
export function requireStorage(): S3Client {
	if (!r2) {
		throw new Error(
			"R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
		);
	}
	return r2;
}

/** Public URL for an object key, when a public base URL is configured. */
export function publicUrl(key: string): string | null {
	if (!env.R2_PUBLIC_URL) return null;
	return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export type StoredObject = { key: string; url: string };

/**
 * Persist an uploaded file. Uses R2 when configured, otherwise falls back to
 * the local `public/uploads/` directory so media works in development without
 * cloud credentials. Returns the storage key and a servable URL.
 */
export async function saveUpload(
	bytes: ArrayBuffer | Uint8Array,
	contentType: string,
	ext: string,
): Promise<StoredObject> {
	const id = crypto.randomUUID();
	const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";

	if (r2) {
		const key = `media/${id}.${safeExt}`;
		await r2.write(key, bytes as Uint8Array, { type: contentType });
		return { key, url: publicUrl(key) ?? `/${key}` };
	}

	// Local fallback — served statically from /public.
	const key = `uploads/${id}.${safeExt}`;
	await Bun.write(`public/${key}`, bytes);
	return { key, url: `/${key}` };
}

// what saveUpload writes locally: uploads/<uuid>.<ext>. Seeded rows carry
// `seed/…` keys with no file behind them, so only our own uploads are unlinked.
const LOCAL_KEY = /^uploads\/[A-Za-z0-9-]+\.[a-z0-9]{1,8}$/;

/**
 * Remove a stored object. Idempotent: an already-missing object is not an
 * error. Without this a deleted media row leaves its bytes on disk, still
 * served at the original URL.
 */
export async function deleteUpload(key: string): Promise<void> {
	if (r2) {
		await r2.delete(key).catch(() => {});
		return;
	}
	if (!LOCAL_KEY.test(key)) return;
	await rm(`public/${key}`, { force: true });
}
