import { inArray } from "drizzle-orm";

import { isDerivable } from "#/lib/image-widths";
import type { DB } from "../db";
import { media } from "../schema";

/** Image url → intrinsic width, which says which derivatives a `<Picture>` may offer. */
export type MediaWidths = Record<string, number>;

// an editor's own props, not the resolved rows beside them: those carry their own widths
const RESOLVED_PROPS = new Set(["data", "person"]);

// a page's own images, with headroom; a section naming more than this is not an editor's work
const MAX_URLS = 400;

function walk(value: unknown, found: Set<string>): void {
	if (found.size >= MAX_URLS) return;
	if (typeof value === "string") {
		if (value.length < 2048 && isDerivable(value)) found.add(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const v of value) walk(v, found);
		return;
	}
	if (value && typeof value === "object")
		for (const [key, v] of Object.entries(value))
			if (!RESOLVED_PROPS.has(key)) walk(v, found);
}

/** Every string in a section's props that could name an uploaded image. */
export function imageUrlsIn(props: unknown): Set<string> {
	const found = new Set<string>();
	walk(props, found);
	return found;
}

/** The recorded width of each url that is an upload; anything unmeasured is left out. */
export async function mediaWidths(
	db: DB,
	urls: string[],
): Promise<MediaWidths> {
	const widths: MediaWidths = {};
	if (!urls.length) return widths;
	for (const m of await db
		.select({ url: media.url, width: media.width })
		.from(media)
		.where(inArray(media.url, urls)))
		if (m.url && m.width != null && m.width > 0) widths[m.url] = m.width;
	return widths;
}
