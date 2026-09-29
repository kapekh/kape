// resolveRoute serves /news only from a page row, so a collection with no landing has a breadcrumb and a sitemap entry pointing at a 404
import { COLLECTIONS, NON_PUBLIC_CONTENT_TYPES } from "#/lib/collections";
import type { QuerySource, SectionNode } from "#/lib/sections";

type Listing = {
	type: string;
	layout: string;
	source: QuerySource;
	perPage?: number;
};

/** Which listing section renders each collection. Checked against SECTION_DEFS in install.test.ts. */
const LISTING: Record<string, Listing> = {
	news: { type: "postList", layout: "grid-3", source: "posts", perPage: 15 },
	stories: { type: "postList", layout: "grid-3", source: "posts" },
	videos: { type: "videoGrid", layout: "grid-3", source: "videos" },
	galleries: { type: "albumGrid", layout: "grid-3", source: "albums" },
	team: { type: "people", layout: "grid", source: "people" },
	publications: {
		type: "publicationList",
		layout: "list",
		source: "publications",
	},
	careers: { type: "postList", layout: "list", source: "posts", perPage: 15 },
	projects: { type: "projectList", layout: "grid-3", source: "projects" },
};

export type Landing = { slug: string; title: string; section: SectionNode };

/** A landing per public collection, in COLLECTIONS order. */
export const LANDINGS: Landing[] = Object.entries(COLLECTIONS)
	.filter(
		([prefix, col]) =>
			LISTING[prefix] &&
			!(col.contentType && NON_PUBLIC_CONTENT_TYPES.has(col.contentType)),
	)
	.map(([prefix, col]) => {
		const l = LISTING[prefix];
		return {
			slug: col.prefix,
			title: col.label,
			section: {
				id: "list",
				type: l.type,
				layout: l.layout,
				query: {
					source: l.source,
					...(l.source === "posts" ? { contentType: col.contentType } : {}),
				},
				props: {
					title: col.label,
					...(l.perPage ? { perPage: String(l.perPage) } : {}),
				},
			},
		};
	});
