/**
 * Flat content collections. Every content type owns ONE top-level URL prefix; a
 * record lives at `/<prefix>/<slug>` and the landing at `/<prefix>` (a normal page
 * with a listing section). The path resolver (`resolveRoute`) and the public links
 * both read this single map. Old nested paths 301-redirect here (LEGACY_REDIRECTS),
 * but only while no page has been authored at the old path — the page tree wins.
 */

export type CollectionKind = "post" | "album" | "project" | "people";

export type CollectionDef = {
	prefix: string; // top-level URL segment, e.g. "news"
	kind: CollectionKind; // how the detail is loaded + rendered
	contentType?: string; // posts content_type this prefix maps to (kind=post)
	label: string; // breadcrumb / section label on the detail page
};

export const COLLECTIONS: Record<string, CollectionDef> = {
	news: {
		prefix: "news",
		kind: "post",
		contentType: "news",
		label: "News & Events",
	},
	stories: {
		prefix: "stories",
		kind: "post",
		contentType: "story",
		label: "Impact Stories",
	},
	videos: {
		prefix: "videos",
		kind: "post",
		contentType: "video",
		label: "Videos",
	},
	galleries: {
		prefix: "galleries",
		kind: "album",
		contentType: "album",
		label: "Photo Galleries",
	},
	team: { prefix: "team", kind: "people", label: "Our Team" },
	publications: {
		prefix: "publications",
		kind: "post",
		contentType: "publication",
		label: "Publications",
	},
	careers: {
		prefix: "careers",
		kind: "post",
		contentType: "job",
		label: "Careers",
	},
	events: {
		prefix: "events",
		kind: "post",
		contentType: "event",
		label: "Events",
	},
	projects: { prefix: "projects", kind: "project", label: "Projects" },
};

export const collectionFor = (prefix: string): CollectionDef | undefined =>
	COLLECTIONS[prefix];

/**
 * Content types that are internal-only and never served on the public site:
 * no detail page (route resolver skips them), no page-section listing, and
 * excluded from the sitemap. Single source of truth for all three so the lists
 * can't drift (they previously did — `event` was blocked in the sitemap and in
 * section queries but still resolvable as a detail page).
 */
export const NON_PUBLIC_CONTENT_TYPES = new Set([
	"internal_news",
	"document",
	"announcement",
	"event",
]);

/** Detail permalink for a collection record. */
export const collectionHref = (prefix: string, slug: string) =>
	`/${prefix}/${slug}`;

/**
 * Old nested paths → new flat paths (301). Keys are matched as either an exact
 * path or a path prefix (`old` + "/" + tail → `new` + "/" + tail). Order longest
 * first so the most specific old prefix wins.
 */
export const LEGACY_REDIRECTS: { from: string; to: string }[] = [
	{ from: "who-we-are/news", to: "news" },
	{ from: "what-we-do/impact-stories", to: "stories" },
	{ from: "who-we-are/leadership", to: "team" },
	{ from: "media/photo-gallery", to: "galleries" },
	{ from: "media/video-gallery", to: "videos" },
	{ from: "current-projects", to: "projects" },
	{ from: "past-projects", to: "projects" },
];

/** Map an old path to its new path, or null if no legacy rule applies. */
export function legacyRedirect(path: string): string | null {
	for (const r of LEGACY_REDIRECTS) {
		if (path === r.from) return r.to;
		if (path.startsWith(`${r.from}/`))
			return `${r.to}/${path.slice(r.from.length + 1)}`;
	}
	return null;
}
