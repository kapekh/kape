/** Longest name kept. Past this a person is reading a paragraph, not a label. */
export const MEDIA_NAME_MAX = 120;

// \p{C} is control/format/surrogate/private-use; the rest break a path, a
// Content-Disposition filename, or a tag boundary
const UNSAFE = /[\p{C}<>:"|?*]/gu;
const EDGES = /^[.\s]+|[.\s]+$/g;

/** Longest run still read as an extension, so a dotted sentence is not one. */
const EXT_MAX = 11;

/** Something a person could read back: punctuation alone is not a name. */
const READABLE = /[\p{L}\p{N}]/u;

// by grapheme, not by char: slicing UTF-16 splits an emoji in half, and slicing
// code points detaches a Khmer vowel sign from the consonant it belongs to
const graphemes = (s: string) =>
	Array.from(new Intl.Segmenter().segment(s), (g) => g.segment);

function truncate(name: string): string {
	const glyphs = graphemes(name);
	if (glyphs.length <= MEDIA_NAME_MAX) return name;
	const dot = name.lastIndexOf(".");
	const ext = dot > 0 && name.length - dot <= EXT_MAX ? name.slice(dot) : "";
	const stem = glyphs
		.slice(0, MEDIA_NAME_MAX - graphemes(ext).length)
		.join("")
		.trimEnd();
	return stem + ext;
}

/**
 * The name a person would recognise, from the name a browser sent us.
 * Null when nothing recognisable survives — the caller stores no name at all
 * rather than a row of punctuation.
 */
export function sanitizeUploadName(raw: string): string | null {
	const base = raw.split(/[/\\]/).pop() ?? "";
	const cleaned = base
		.replace(UNSAFE, " ")
		.replace(/\s+/g, " ")
		.replace(EDGES, "");
	return READABLE.test(cleaned) ? truncate(cleaned) : null;
}

export type MediaNamed = {
	id: number;
	originalName?: string | null;
	usedBy?: string | null;
};

/** What the library and every picker put under a file. */
export function mediaDisplayName(m: MediaNamed): string {
	return m.originalName?.trim() || m.usedBy?.trim() || `Untitled #${m.id}`;
}

/** The stored object's own name — the uuid, kept secondary. */
export function mediaStorageName(m: {
	r2Key?: string | null;
	url?: string | null;
}): string | null {
	return (m.r2Key || m.url || "").split("/").pop()?.split("?")[0] || null;
}
