// the allow-list is extension-only and file.type is client-supplied; this checks the signature and not the file, so a crafted polyglot still passes; pure so it runs under vitest

export type SniffedType =
	| "png"
	| "jpeg"
	| "gif"
	| "webp"
	| "avif"
	| "pdf"
	| "mp4"
	| "webm"
	| "zip"
	| "ole";

function has(bytes: Uint8Array, offset: number, sig: number[]): boolean {
	if (bytes.length < offset + sig.length) return false;
	for (let i = 0; i < sig.length; i++)
		if (bytes[offset + i] !== sig[i]) return false;
	return true;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
	let s = "";
	for (let i = 0; i < length; i++)
		s += String.fromCharCode(bytes[offset + i] ?? 0);
	return s;
}

// ftyp box (offset 4) is shared by the whole ISO-BMFF family; the 4-byte major
// brand at offset 8 is what separates an AVIF still from an MP4 video.
const AVIF_BRANDS = new Set(["avif", "avis", "mif1", "miaf"]);

/** Best-effort magic-byte identification, or null when nothing matches. */
export function sniffType(bytes: Uint8Array): SniffedType | null {
	if (has(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
		return "png";
	if (has(bytes, 0, [0xff, 0xd8, 0xff])) return "jpeg";
	if (has(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return "gif";
	if (
		has(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
		has(bytes, 8, [0x57, 0x45, 0x42, 0x50])
	)
		return "webp";
	if (has(bytes, 0, [0x25, 0x50, 0x44, 0x46])) return "pdf";
	if (has(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
	if (has(bytes, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
		return "ole";
	if (
		has(bytes, 0, [0x50, 0x4b, 0x03, 0x04]) ||
		has(bytes, 0, [0x50, 0x4b, 0x05, 0x06])
	)
		return "zip";
	if (has(bytes, 4, [0x66, 0x74, 0x79, 0x70]))
		return AVIF_BRANDS.has(ascii(bytes, 8, 4)) ? "avif" : "mp4";
	return null;
}

const EXT_TO_TYPES: Record<string, SniffedType[]> = {
	png: ["png"],
	jpg: ["jpeg"],
	jpeg: ["jpeg"],
	webp: ["webp"],
	gif: ["gif"],
	avif: ["avif"],
	pdf: ["pdf"],
	mp4: ["mp4"],
	webm: ["webm"],
	doc: ["ole"],
	xls: ["ole"],
	ppt: ["ole"],
	// OOXML documents are ZIP containers; the magic can't tell docx from xlsx.
	docx: ["zip"],
	xlsx: ["zip"],
	pptx: ["zip"],
};

/** True when the file's leading bytes are consistent with the declared extension. */
export function bytesMatchExtension(ext: string, bytes: Uint8Array): boolean {
	const allowed = EXT_TO_TYPES[ext.toLowerCase()];
	if (!allowed) return false;
	const sniffed = sniffType(bytes);
	return sniffed !== null && allowed.includes(sniffed);
}
