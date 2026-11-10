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

/** The bucket a KOOMPI Cloud app keeps its uploads in. */
type KStorage = {
	write(key: string, bytes: Uint8Array, type: string): Promise<void>;
	delete(key: string): Promise<void>;
	/** Where the CDN serves `key` from. */
	url(key: string): string;
};

// KOOMPI Cloud storage: a presigned PUT per object, through a bucket API key.
// retainName keeps our own name under the bucket's prefix, so the key we pick
// (uploads/<uuid>.<ext>, and its -<width>.webp siblings) is the key it stores,
// and /uploads/... urls already in the content keep resolving.
function createKStorage(): KStorage | null {
	const api = env.KSTORAGE_URL?.replace(/\/$/, "");
	const apiKey = env.KSTORAGE_API_KEY;
	const publicBase = env.KSTORAGE_PUBLIC_URL?.replace(/\/$/, "");
	if (!api || !apiKey || !publicBase) return null;
	const headers = { "x-api-key": apiKey, "content-type": "application/json" };

	async function call(path: string, init: RequestInit): Promise<unknown> {
		const res = await fetch(`${api}${path}`, init);
		const body = (await res.json().catch(() => null)) as {
			success?: boolean;
			message?: string;
			data?: unknown;
		} | null;
		if (!res.ok || !body?.success)
			throw new Error(
				`[storage] ${path} answered ${res.status}: ${body?.message ?? "no message"}`,
			);
		return body.data;
	}

	return {
		async write(key, bytes, type) {
			const slash = key.lastIndexOf("/");
			const token = (await call("/api/storage/upload-token", {
				method: "POST",
				headers,
				body: JSON.stringify({
					filename: key.slice(slash + 1),
					path: slash > 0 ? key.slice(0, slash + 1) : undefined,
					contentType: type,
					size: bytes.byteLength,
					visibility: "public",
					retainName: true,
					conflictResolution: "overwrite",
				}),
			})) as { uploadUrl: string; objectId: string };
			const put = await fetch(token.uploadUrl, {
				method: "PUT",
				headers: { "content-type": type },
				body: new Blob([bytes as Uint8Array<ArrayBuffer>], { type }),
			});
			if (!put.ok) throw new Error(`[storage] upload of ${key}: ${put.status}`);
			await call("/api/storage/complete", {
				method: "POST",
				headers,
				body: JSON.stringify({ objectId: token.objectId }),
			});
		},
		async delete(key) {
			// the bucket's prefix is the public base's path, less the CDN host
			const full = `${new URL(publicBase).pathname.replace(/^\//, "")}/${key}`;
			const res = await fetch(
				`${api}/api/storage/objects?key=${encodeURIComponent(full)}`,
				{ method: "DELETE", headers },
			);
			if (!res.ok && res.status !== 404)
				throw new Error(`[storage] delete of ${key}: ${res.status}`);
		},
		url: (key) => `${publicBase}/${key}`,
	};
}

export const kstorage = createKStorage();

/** Public URL for an object key, when a public base URL is configured. */
function publicUrl(key: string): string | null {
	if (!env.R2_PUBLIC_URL) return null;
	return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export type StoredObject = { key: string; url: string };

// R2, then a KOOMPI Cloud bucket, then public/uploads, so media works in development without cloud credentials
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

		if (kstorage) {
			const original =
				bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
			await kstorage.write(key, original, contentType);
			for (const d of derivatives)
				await kstorage.write(
					derivativePath(key, d.width),
					d.bytes,
					"image/webp",
				);
			// relative, as a local upload's is: routes/uploads.$.tsx sends it on to
			// the CDN, and the content does not name a host it may one day leave
			return { key, url: `/${key}` };
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
	if (kstorage) {
		for (const k of [key, ...derived])
			await kstorage.delete(k).catch((err: unknown) => {
				console.error(`[storage] ${k} left in the bucket:`, err);
			});
		return;
	}
	for (const k of [key, ...derived]) await rm(`public/${k}`, { force: true });
}
