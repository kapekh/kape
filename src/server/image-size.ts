import { sniffType } from "./magic-bytes";

export type ImageSize = { width: number; height: number };

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) =>
	b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32le = (b: Uint8Array, i: number) =>
	(b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u32be = (b: Uint8Array, i: number) =>
	((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

const ok = (w: number, h: number): ImageSize | null =>
	w > 0 && h > 0 ? { width: w, height: h } : null;

function pngSize(b: Uint8Array): ImageSize | null {
	if (b.length < 24) return null;
	return ok(u32be(b, 16), u32be(b, 20));
}

// SOFn carries the frame size. C4/C8/CC share the range but are DHT/JPG/DAC.
const SOF = new Set([
	0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegSize(b: Uint8Array): ImageSize | null {
	let i = 2;
	while (i + 9 < b.length) {
		if (b[i] !== 0xff) {
			i++; // resync past fill bytes or a corrupt segment
			continue;
		}
		const marker = b[i + 1];
		if (
			marker === 0xd8 ||
			marker === 0x01 ||
			(marker >= 0xd0 && marker <= 0xd7)
		) {
			i += 2;
			continue;
		}
		if (marker === 0xda || marker === 0xd9) return null; // entropy data, no size seen
		const len = u16be(b, i + 2);
		if (len < 2) return null;
		if (SOF.has(marker)) return ok(u16be(b, i + 7), u16be(b, i + 5));
		i += 2 + len;
	}
	return null;
}

function gifSize(b: Uint8Array): ImageSize | null {
	if (b.length < 10) return null;
	return ok(u16le(b, 6), u16le(b, 8));
}

function webpSize(b: Uint8Array): ImageSize | null {
	if (b.length < 16) return null;
	const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
	if (chunk === "VP8 " && b.length >= 30)
		return ok(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
	if (chunk === "VP8L" && b.length >= 25) {
		const bits = u32le(b, 21);
		return ok((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
	}
	if (chunk === "VP8X" && b.length >= 30)
		return ok(u24le(b, 24) + 1, u24le(b, 27) + 1);
	return null;
}

// ISO-BMFF nests the size in an `ispe` property box; scanning for the fourcc
// beats walking the box tree for a value that appears once.
function avifSize(b: Uint8Array): ImageSize | null {
	const limit = Math.min(b.length - 16, 65536);
	for (let i = 0; i < limit; i++) {
		if (
			b[i] === 0x69 &&
			b[i + 1] === 0x73 &&
			b[i + 2] === 0x70 &&
			b[i + 3] === 0x65
		)
			return ok(u32be(b, i + 8), u32be(b, i + 12));
	}
	return null;
}

/**
 * Intrinsic pixel size read from an image's own header, or null when the bytes
 * are not an image we can measure. Nothing else records it, so an operator
 * otherwise cannot tell a 265px photo from a 1920px one until it is on a page.
 */
export function imageSize(bytes: Uint8Array): ImageSize | null {
	switch (sniffType(bytes)) {
		case "png":
			return pngSize(bytes);
		case "jpeg":
			return jpegSize(bytes);
		case "gif":
			return gifSize(bytes);
		case "webp":
			return webpSize(bytes);
		case "avif":
			return avifSize(bytes);
		default:
			return null;
	}
}
