// the match runs over the translations rows, so a Khmer query finds Khmer bodies; body is ProseMirror JSON, so every LIKE candidate is re-checked against the extracted plain text

import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { COLLECTIONS, NON_PUBLIC_CONTENT_TYPES } from "#/lib/collections";
import type { DB } from "../db";
import { pages, posts, projects, translations } from "../schema";
import { getDefaultLang, resolveTranslations } from "./i18n";

const TENANT = 1;

/** Results are capped, not paged — the whole site is a few hundred records. */
export const SEARCH_LIMIT = 30;

const SNIPPET_LENGTH = 180;
const SNIPPET_LEAD = 60;

// an allow-list built from the two maps the route resolver uses, so an unreachable type cannot be searched into existence
export const PUBLIC_POST_TYPES = [
	...new Set(
		Object.values(COLLECTIONS)
			.map((c) => c.contentType)
			.filter((t): t is string => !!t && !NON_PUBLIC_CONTENT_TYPES.has(t)),
	),
];

const PREFIX_BY_TYPE = new Map(
	Object.values(COLLECTIONS)
		.filter((c) => c.contentType)
		.map((c) => [c.contentType as string, c] as const),
);

const PAGE_FIELDS = ["title", "excerpt", "body"];
const PROJECT_FIELDS = ["name", "summary", "body"];

const FIELD_WEIGHT: Record<string, number> = {
	title: 6,
	name: 6,
	excerpt: 3,
	summary: 3,
	body: 1,
};

export type SearchKind = "page" | "post" | "project";

export type SearchResult = {
	kind: SearchKind;
	id: number;
	/** Unprefixed content path; the route adds the language prefix. */
	href: string;
	label: string;
	/** `ui_strings` key for `label`, so the chip translates once the key is seeded. */
	labelKey: string;
	title: string;
	snippet: string;
	score: number;
};

export type SearchResults = {
	query: string;
	results: SearchResult[];
	/** Matches found before the cap, so the page can say what it is not showing. */
	total: number;
	limit: number;
};

/** `%` and `_` are LIKE wildcards; a reader typing them means the characters. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// the column is a reference and the pattern a bound parameter; Drizzle never inlines it
const containsQuery = (query: string) =>
	sql`${translations.value} LIKE ${`%${escapeLike(query)}%`} ESCAPE '\\'`;

function nodeText(node: unknown): string {
	if (Array.isArray(node)) return node.map(nodeText).join(" ");
	if (!node || typeof node !== "object") return "";
	const n = node as { text?: unknown; content?: unknown };
	const own = typeof n.text === "string" ? n.text : "";
	return n.content ? `${own} ${nodeText(n.content)}`.trim() : own;
}

/** Readable text of a stored field — body fields are ProseMirror JSON. */
export function fieldText(field: string, value: string): string {
	if (field !== "body") return value;
	try {
		return nodeText(JSON.parse(value));
	} catch {
		return value;
	}
}

export function scoreField(field: string, text: string, query: string): number {
	const needle = query.trim().toLowerCase();
	if (!needle) return 0;
	const haystack = text.toLowerCase();
	const at = haystack.indexOf(needle);
	if (at < 0) return 0;
	const weight = FIELD_WEIGHT[field] ?? 1;
	if (haystack.trim() === needle) return weight * 4;
	if (at === 0) return weight * 2;
	return weight;
}

export function snippetAround(text: string, query: string): string {
	const clean = text.replace(/\s+/g, " ").trim();
	const at = clean.toLowerCase().indexOf(query.trim().toLowerCase());
	const start = at < 0 ? 0 : Math.max(0, at - SNIPPET_LEAD);
	const end = Math.min(clean.length, start + SNIPPET_LENGTH);
	return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}

type MatchRow = {
	id: number;
	field: string;
	value: string;
};

type Hit = { score: number; snippet: string };

/** A snippet of the title is the title again, so the title cannot be one. */
const TITLE_FIELDS = new Set(["title", "name"]);

/** Best score per field (a record matching in two languages counts once). */
export function collect(rows: MatchRow[], query: string): Map<number, Hit> {
	const perEntity = new Map<
		number,
		{ fields: Map<string, number>; snippetScore: number; snippet: string }
	>();
	for (const row of rows) {
		const text = fieldText(row.field, row.value);
		const score = scoreField(row.field, text, query);
		if (score === 0) continue;
		const entry = perEntity.get(row.id) ?? {
			fields: new Map<string, number>(),
			snippetScore: 0,
			snippet: "",
		};
		if (score > (entry.fields.get(row.field) ?? 0))
			entry.fields.set(row.field, score);
		if (!TITLE_FIELDS.has(row.field) && score > entry.snippetScore) {
			entry.snippetScore = score;
			entry.snippet = snippetAround(text, query);
		}
		perEntity.set(row.id, entry);
	}
	const out = new Map<number, Hit>();
	for (const [id, entry] of perEntity) {
		let total = 0;
		for (const s of entry.fields.values()) total += s;
		out.set(id, { score: total, snippet: entry.snippet });
	}
	return out;
}

export async function searchSite(
	db: DB,
	rawQuery: string,
	lang: string,
	limit = SEARCH_LIMIT,
): Promise<SearchResults> {
	const query = rawQuery.trim();
	if (!query) return { query: "", results: [], total: 0, limit };

	const defaultLang = await getDefaultLang(db);
	const langs = [...new Set([defaultLang, lang])];
	const match = containsQuery(query);

	const pageRows = await db
		.select({
			id: pages.id,
			slug: pages.slug,
			field: translations.field,
			value: translations.value,
		})
		.from(translations)
		.innerJoin(pages, eq(pages.id, translations.entityId))
		.where(
			and(
				eq(translations.tenantId, TENANT),
				eq(translations.entityType, "page"),
				inArray(translations.lang, langs),
				inArray(translations.field, PAGE_FIELDS),
				match,
				eq(pages.tenantId, TENANT),
				eq(pages.status, "published"),
			),
		);

	const postRows = await db
		.select({
			id: posts.id,
			slug: posts.slug,
			contentType: posts.contentType,
			field: translations.field,
			value: translations.value,
		})
		.from(translations)
		.innerJoin(posts, eq(posts.id, translations.entityId))
		.where(
			and(
				eq(translations.tenantId, TENANT),
				eq(translations.entityType, "post"),
				inArray(translations.lang, langs),
				inArray(translations.field, PAGE_FIELDS),
				match,
				eq(posts.tenantId, TENANT),
				eq(posts.status, "published"),
				inArray(posts.contentType, PUBLIC_POST_TYPES),
			),
		);

	const parentProject = alias(projects, "parent_project");
	const projectRows = await db
		.select({
			id: projects.id,
			slug: projects.slug,
			parentSlug: parentProject.slug,
			field: translations.field,
			value: translations.value,
		})
		.from(translations)
		.innerJoin(projects, eq(projects.id, translations.entityId))
		.leftJoin(parentProject, eq(parentProject.id, projects.parentId))
		.where(
			and(
				eq(translations.tenantId, TENANT),
				eq(translations.entityType, "project"),
				inArray(translations.lang, langs),
				inArray(translations.field, PROJECT_FIELDS),
				match,
				eq(projects.tenantId, TENANT),
			),
		);

	const pageScores = collect(pageRows, query);
	const postScores = collect(postRows, query);
	const projectScores = collect(projectRows, query);

	const pageSlug = new Map(pageRows.map((r) => [r.id, r.slug]));
	const postRow = new Map(
		postRows.map((r) => [r.id, { slug: r.slug, contentType: r.contentType }]),
	);
	const projectRow = new Map(
		projectRows.map((r) => [r.id, { slug: r.slug, parentSlug: r.parentSlug }]),
	);

	const [pageTitles, postTitles, projectTitles] = await Promise.all([
		resolveTranslations(db, "page", [...pageScores.keys()], lang),
		resolveTranslations(db, "post", [...postScores.keys()], lang),
		resolveTranslations(db, "project", [...projectScores.keys()], lang),
	]);

	const ranked: SearchResult[] = [];
	for (const [id, hit] of pageScores) {
		const slug = pageSlug.get(id);
		if (!slug) continue;
		ranked.push({
			kind: "page",
			id,
			href: `/${slug}`,
			label: "Page",
			labelKey: "search.kind.page",
			title: pageTitles.get(id)?.title || slug,
			...hit,
		});
	}
	for (const [id, hit] of postScores) {
		const row = postRow.get(id);
		const col = row && PREFIX_BY_TYPE.get(row.contentType);
		if (!row || !col) continue;
		ranked.push({
			kind: "post",
			id,
			href: `/${col.prefix}/${row.slug}`,
			label: col.label,
			labelKey: `search.kind.${col.prefix}`,
			title: postTitles.get(id)?.title || row.slug,
			...hit,
		});
	}
	for (const [id, hit] of projectScores) {
		const row = projectRow.get(id);
		if (!row) continue;
		ranked.push({
			kind: "project",
			id,
			href: row.parentSlug
				? `/projects/${row.parentSlug}/${row.slug}`
				: `/projects/${row.slug}`,
			label: COLLECTIONS.projects.label,
			labelKey: "search.kind.projects",
			title: projectTitles.get(id)?.name || row.slug,
			...hit,
		});
	}

	ranked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

	return {
		query,
		results: ranked.slice(0, limit),
		total: ranked.length,
		limit,
	};
}
