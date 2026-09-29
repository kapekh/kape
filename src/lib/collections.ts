// one top-level prefix per content type; the page tree wins over a legacy redirect

import { isFormClosed } from "#/lib/forms";

type CollectionKind = "post" | "album" | "project" | "people";

export type CollectionDef = {
	prefix: string; // top-level URL segment, e.g. "news"
	kind: CollectionKind; // how the detail is loaded + rendered
	contentType?: string; // posts content_type this prefix maps to (kind=post)
	label: string; // breadcrumb / section label on the detail page
	// extra content types whose detail pages resolve under this prefix without
	// getting a landing, a listing section or a sitemap entry of their own
	alsoResolves?: string[];
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
		alsoResolves: ["announcement"],
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

// a job and a public announcement are the same notice under two labels: the
// careers page lists both and the home-page popup shows both
export const NOTICE_CONTENT_TYPES = ["job", "announcement"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// only the date the picker itself writes may hide a published notice; anything
// else reads as no deadline and stays up, where its author can see it and fix it
export const noticeExpired = (deadline: string): boolean =>
	ISO_DATE.test(deadline) && isFormClosed(deadline);

/** The deadline a post's meta carries, or "" when it has none. */
export const noticeDeadline = (meta: unknown): string => {
	const d = (meta as Record<string, unknown> | null)?.deadline;
	return typeof d === "string" ? d : "";
};

type Notice = { deadline: string; publishedAt: string };

/** Drop expired notices; the rest run nearest deadline first, then the undated, newest first. */
export function openNotices<T extends Notice>(items: T[]): T[] {
	const open = items.filter((n) => !noticeExpired(n.deadline));
	const dated = open
		.filter((n) => n.deadline)
		.sort((a, b) => a.deadline.localeCompare(b.deadline));
	const evergreen = open
		.filter((n) => !n.deadline)
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
	return [...dated, ...evergreen];
}

/** Open notices in `openNotices` order, then the closed ones, most recently closed first. */
export function allNotices<T extends Notice>(items: T[]): T[] {
	const closed = items
		.filter((n) => noticeExpired(n.deadline))
		.sort((a, b) => b.deadline.localeCompare(a.deadline));
	return [...openNotices(items), ...closed];
}

// one source of truth for three lists: event was blocked in the sitemap but still resolvable as a detail page
export const NON_PUBLIC_CONTENT_TYPES = new Set([
	"internal_news",
	"document",
	"announcement",
	"event",
]);

/** Detail permalink for a collection record. */
export const collectionHref = (prefix: string, slug: string) =>
	`/${prefix}/${slug}`;

/** Does `/<prefix>/<slug>` serve a detail page for this content type? */
export const resolvesUnder = (col: CollectionDef, contentType: string) =>
	col.contentType === contentType
		? !NON_PUBLIC_CONTENT_TYPES.has(contentType)
		: Boolean(col.alsoResolves?.includes(contentType));

// longest first, so the most specific old prefix wins
const LEGACY_REDIRECTS: { from: string; to: string }[] = [
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
