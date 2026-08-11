// dynamic queries run in the route loader and inline as props.data, so the client renderer stays pure
import { NON_PUBLIC_CONTENT_TYPES } from "#/lib/collections";
import type { QuerySource, SectionNode, SectionQuery } from "#/lib/sections";
import type { DB } from "../db";
import { renderBody } from "../richtext";
import {
	type AlbumItem,
	type JobItem,
	listAlbums,
	listJobs,
	listPosts,
	listPublications,
	listVideos,
	type PostListItem,
	type PublicationItem,
	type VideoItem,
} from "./content";
import { getOrgTree, type OrgNode } from "./org";
import { listPeople, type PersonItem } from "./people";
import {
	listProjectCards,
	listProjectLocations,
	type ProjectCard,
	type ProjectPin,
} from "./projects";
import { listOffices, listPartners } from "./site";
import { staffDirectory, staffDocuments, staffEvents } from "./staff";

// allowSource is for sections the client just handed us; without it the preview procedure is a read path into every domain table
export type ResolveOptions = { allowSource?: (s: QuerySource) => boolean };

// resolved rows reach the renderer as untyped JSON, so a source whose repo function changes shape fails here
export type SourceRow = {
	posts: PostListItem | JobItem;
	videos: VideoItem;
	albums: AlbumItem;
	publications: PublicationItem;
	people: PersonItem;
	locations: ProjectPin;
	projects: ProjectCard;
	orgchart: OrgNode;
	offices: Awaited<ReturnType<typeof listOffices>>[number];
	partners: Awaited<ReturnType<typeof listPartners>>[number];
	staff: Awaited<ReturnType<typeof staffDirectory>>[number];
	events: Awaited<ReturnType<typeof staffEvents>>[number];
	documents: Awaited<ReturnType<typeof staffDocuments>>[number];
};

async function resolveQuery(
	db: DB,
	q: SectionQuery,
	lang: string,
	opts?: ResolveOptions,
): Promise<SourceRow[QuerySource][] | null> {
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
			// per-language text overlay; structural props stay language-agnostic
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
