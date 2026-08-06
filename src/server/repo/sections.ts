/**
 * Server-side resolution of page-builder sections. Dynamic sections carry a
 * `query`; we run it here (in the route loader) and inline the result as
 * `props.data`, so the client renderer is pure and SSR/SEO stay intact.
 */
import { NON_PUBLIC_CONTENT_TYPES } from "#/lib/collections";
import type { QuerySource, SectionNode, SectionQuery } from "#/lib/sections";
import type { DB } from "../db";
import { renderBody } from "../richtext";
import {
	listAlbums,
	listJobs,
	listPosts,
	listPublications,
	listVideos,
} from "./content";
import { getOrgTree } from "./org";
import { listPeople } from "./people";
import { listProjectCards, listProjectLocations } from "./projects";
import { listOffices, listPartners } from "./site";
import { staffDirectory, staffDocuments, staffEvents } from "./staff";

/**
 * `allowSource` is for callers that resolve sections the client just handed them
 * rather than sections the site has stored — the page-builder preview. Without it
 * that procedure is a read path into every domain table, module or no module.
 * Stored pages resolve unfiltered, so a section placed while a module was on keeps
 * rendering after it goes off.
 */
export type ResolveOptions = { allowSource?: (s: QuerySource) => boolean };

async function resolveQuery(
	db: DB,
	q: SectionQuery,
	lang: string,
	opts?: ResolveOptions,
): Promise<unknown> {
	if (opts?.allowSource && !opts.allowSource(q.source)) return null;
	switch (q.source) {
		case "posts": {
			const ct = q.contentType ?? "news";
			if (NON_PUBLIC_CONTENT_TYPES.has(ct)) return [];
			if (ct === "job") return listJobs(db, lang);
			return listPosts(db, ct, lang, q.limit ?? 12);
		}
		case "videos":
			return listVideos(db, lang);
		case "albums":
			return listAlbums(db, lang);
		case "publications":
			return listPublications(db, lang, q.category, q.limit ?? 24);
		case "people": {
			const all = await listPeople(db, lang);
			// Optional section filter (board | smt | pm | team) so a page can show
			// leadership tiers as separate groups.
			return q.category ? all.filter((p) => p.section === q.category) : all;
		}
		case "locations":
			return listProjectLocations(db, lang);
		case "orgchart":
			return getOrgTree(db, lang);
		case "offices":
			return listOffices(db);
		case "partners":
			return listPartners(db);
		case "projects":
			return listProjectCards(db, lang, q.category, q.limit);
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
	job: "/careers",
};

/**
 * Resolve sections for rendering: pre-render any rich-text body server-side and,
 * for dynamic sections, run the query and inline the result as `props.data`.
 */
export async function resolveSections(
	db: DB,
	sections: SectionNode[],
	lang: string,
	opts?: ResolveOptions,
): Promise<SectionNode[]> {
	if (!Array.isArray(sections)) return [];
	return Promise.all(
		sections.map(async (s) => {
			let props: Record<string, unknown> = { ...(s?.props ?? {}) };
			// Per-language text overlay: authored translations for this section's text
			// props (eyebrow/title/lead/body/…) live under props.i18n[lang]. Overlay them
			// so /km etc. render translated headings/body; structural props (images,
			// links, query) stay language-agnostic. Falls back to the default text.
			const i18n = props.i18n as
				| Record<string, Record<string, unknown>>
				| undefined;
			delete props.i18n;
			if (i18n && lang && i18n[lang]) {
				props = { ...props, ...i18n[lang] };
			}
			if (typeof props.body === "string" && props.body) {
				props.bodyHtml = renderBody(props.body);
			}
			if (s?.query) {
				props.data = await resolveQuery(db, s.query, lang, opts);
				if (s.query.source === "posts") {
					props.linkBase = POST_LINK_BASE[s.query.contentType ?? "news"] ?? "";
				}
				if (s.query.source === "projects") props.linkBase = "/projects";
			}
			return { ...s, props };
		}),
	);
}
