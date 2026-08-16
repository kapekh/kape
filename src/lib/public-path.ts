import { COLLECTIONS, resolvesUnder } from "#/lib/collections";

export type PublicRecord =
	| { kind: "page"; slug: string; status: string }
	| { kind: "post"; slug: string; status: string; contentType: string | null }
	| { kind: "project"; slug: string; parentSlug?: string | null }
	| { kind: "person"; slug: string | null; isPublic: boolean };

export type PublicRecordKind = PublicRecord["kind"];

function prefixForContentType(contentType: string): string | null {
	for (const col of Object.values(COLLECTIONS))
		if (resolvesUnder(col, contentType)) return col.prefix;
	return null;
}

/**
 * Inverse of `resolveRoute`: where a record is served on the public site, or null
 * when nothing serves it (draft, internal content type, person kept off the team page).
 * No language prefix, so `/` sends it to the default language.
 */
export function publicPathOf(r: PublicRecord): string | null {
	if (r.kind === "page") {
		if (r.status !== "published") return null;
		return r.slug === "home" ? "/" : `/${r.slug}`;
	}
	if (r.kind === "post") {
		if (r.status !== "published" || !r.contentType) return null;
		const prefix = prefixForContentType(r.contentType);
		return prefix ? `/${prefix}/${r.slug}` : null;
	}
	if (r.kind === "project") {
		const rest = [r.parentSlug, r.slug].filter(Boolean).join("/");
		return `/${COLLECTIONS.projects.prefix}/${rest}`;
	}
	if (!r.slug || !r.isPublic) return null;
	return `/${COLLECTIONS.team.prefix}/${r.slug}`;
}
