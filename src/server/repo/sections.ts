/**
 * Server-side resolution of page-builder sections. Dynamic sections carry a
 * `query`; we run it here (in the route loader) and inline the result as
 * `props.data`, so the client renderer is pure and SSR/SEO stay intact.
 */
import type { SectionNode, SectionQuery } from "#/lib/sections";
import type { DB } from "../db";
import { renderBody } from "../richtext";
import { listAlbums, listJobs, listPeople, listPosts, listPublications, listVideos } from "./content";
import { listProjectLocations, listProjectOptions } from "./projects";
import { listOffices, listPartners } from "./site";
import { staffDirectory, staffDocuments, staffEvents } from "./staff";

async function resolveQuery(db: DB, q: SectionQuery, lang: string): Promise<unknown> {
	switch (q.source) {
		case "posts": {
			const ct = q.contentType ?? "news";
			if (ct === "job") return listJobs(db, lang);
			return listPosts(db, ct, lang, q.limit ?? 12);
		}
		case "videos":
			return listVideos(db, lang);
		case "albums":
			return listAlbums(db, lang);
		case "publications":
			return q.category ? listPublications(db, lang, q.category) : listPosts(db, "publication", lang, q.limit ?? 24);
		case "people":
			return listPeople(db, lang);
		case "locations":
			return listProjectLocations(db, lang);
		case "offices":
			return listOffices(db);
		case "partners":
			return listPartners(db);
		case "projects":
			return listProjectOptions(db, lang);
		case "staff":
			return staffDirectory(db);
		case "events":
			return staffEvents(db, lang);
		case "documents":
			return staffDocuments(db, lang);
		default:
			return null;
	}
}

/** Where a post content-type's detail pages live (for per-item links). */
const POST_LINK_BASE: Record<string, string> = {
	news: "/news",
	story: "/stories",
	person: "/team",
	album: "/galleries",
};

/**
 * Resolve sections for rendering: pre-render any rich-text body server-side and,
 * for dynamic sections, run the query and inline the result as `props.data`.
 */
export async function resolveSections(db: DB, sections: SectionNode[], lang: string): Promise<SectionNode[]> {
	if (!Array.isArray(sections)) return [];
	return Promise.all(
		sections.map(async (s) => {
			let props: Record<string, unknown> = { ...(s?.props ?? {}) };
			if (typeof props.body === "string" && props.body) {
				props.bodyHtml = renderBody(props.body);
			}
			if (s?.query) {
				props.data = await resolveQuery(db, s.query, lang);
				if (s.query.source === "posts") {
					props.linkBase = POST_LINK_BASE[s.query.contentType ?? "news"] ?? "";
				}
			}
			return { ...s, props };
		}),
	);
}
