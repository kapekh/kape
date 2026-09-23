import sharp from "sharp";

import { derivativeWidths } from "#/lib/image-widths";

const QUALITY = 78;

export type ImageSize = { width: number; height: number };
export type Derivative = { width: number; bytes: Uint8Array };

/**
 * The only measure of how big an image is: the size a browser draws it at, which
 * is what both `media.width` and the derivative set are taken from. Null when the
 * bytes carry no image header.
 */
export async function drawnSize(bytes: Uint8Array): Promise<ImageSize | null> {
	const meta = await sharp(bytes)
		.metadata()
		.catch(() => null);
	if (!meta?.width || !meta.height) return null;
	// exif orientation 5-8 quarter-turns the frame, and webpAt auto-orients
	return (meta.orientation ?? 1) >= 5
		? { width: meta.height, height: meta.width }
		: { width: meta.width, height: meta.height };
}

/** One webp derivative, auto-oriented and never enlarged past the source. */
export async function webpAt(
	bytes: Uint8Array,
	width: number,
): Promise<Uint8Array> {
	const out = await sharp(bytes)
		.rotate()
		.resize({ width, withoutEnlargement: true })
		.webp({ quality: QUALITY })
		.toBuffer();
	return new Uint8Array(out);
}

/**
 * Every webp file that belongs beside an upload, narrowest first. Empty for a
 * source narrower than the narrowest width, or for bytes with no image header.
 * Throws when sharp can measure the source but not decode it, so the caller
 * knows it is about to store an original that nothing covers.
 */
export async function imageDerivatives(
	bytes: Uint8Array,
): Promise<Derivative[]> {
	const size = await drawnSize(bytes);
	const out: Derivative[] = [];
	for (const width of derivativeWidths(size?.width))
		out.push({ width, bytes: await webpAt(bytes, width) });
	return out;
}
