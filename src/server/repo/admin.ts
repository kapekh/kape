import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	inArray,
	isNull,
	like,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { DEFAULT_LANG } from "#/lib/i18n-config";
import {
	choiceField,
	isColourField,
	type SectionField,
	type SectionNode,
	sectionDef,
	translatableFields,
} from "#/lib/sections";
import { checkThemeValue } from "#/lib/site-theme";
import { PAGE_TITLE_MAX, segmentProblem } from "#/lib/slug";
import type { DB } from "../db";
import {
	alumniRegistrations,
	campaigns,
	contactSubmissions,
	contentTypes,
	donors,
	forms,
	heroSlides,
	languages,
	media,
	navItems,
	newsletterSubscribers,
	offices,
	type ProjectSnapshot,
	pages,
	pageViews,
	partners,
	people,
	postMedia,
	posts,
	projectDonors,
	projectLocations,
	projects,
	schools,
	siteSettings,
	slugRedirects,
	staff,
	stats,
	terms,
	translations,
	uiStrings,
	visitorDaily,
} from "../schema";
import { deleteUpload } from "../storage";
import { resolveTranslations } from "./i18n";
import { attachMediaUrl } from "./media-util";

/** Dashboard overview counts + visitor totals. */
export async function adminOverview(db: DB) {
	const n = async (q: Promise<{ c: number }[]>) => (await q)[0]?.c ?? 0;
	const w = eq(posts.tenantId, TENANT);
	const [
		postCount,
		pageCount,
		projectCount,
		schoolCount,
		partnerCount,
		donorCount,
		officeCount,
		mediaCount,
		staffCount,
		langCount,
	] = await Promise.all([
		n(db.select({ c: count() }).from(posts).where(w)),
		n(db.select({ c: count() }).from(pages).where(eq(pages.tenantId, TENANT))),
		n(
			db
				.select({ c: count() })
				.from(projects)
				.where(eq(projects.tenantId, TENANT)),
		),
		n(
			db
				.select({ c: count() })
				.from(schools)
				.where(eq(schools.tenantId, TENANT)),
		),
		n(
			db
				.select({ c: count() })
				.from(partners)
				.where(eq(partners.tenantId, TENANT)),
		),
		n(
			db.select({ c: count() }).from(donors).where(eq(donors.tenantId, TENANT)),
		),
		n(
			db
				.select({ c: count() })
				.from(offices)
				.where(eq(offices.tenantId, TENANT)),
		),
		n(db.select({ c: count() }).from(media).where(eq(media.tenantId, TENANT))),
		n(db.select({ c: count() }).from(staff).where(eq(staff.tenantId, TENANT))),
		n(db.select({ c: count() }).from(languages)),
	]);
	const today = new Date().toISOString().slice(0, 10);
	const vrows = await db
		.select()
		.from(visitorDaily)
		.where(eq(visitorDaily.tenantId, TENANT));
	const byDate = new Map(vrows.map((r) => [r.date, r.count]));
	const series: { date: string; count: number }[] = [];
	for (let i = 13; i >= 0; i--) {
		const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
		series.push({ date: d, count: byDate.get(d) ?? 0 });
	}
	const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	const [contact, newsletter, alumni] = await Promise.all([
		n(db.select({ c: count() }).from(contactSubmissions)),
		n(db.select({ c: count() }).from(newsletterSubscribers)),
		n(db.select({ c: count() }).from(alumniRegistrations)),
	]);
	return {
		posts: postCount,
		pages: pageCount,
		projects: projectCount,
		schools: schoolCount,
		partners: partnerCount,
		donors: donorCount,
		offices: officeCount,
		media: mediaCount,
		staff: staffCount,
		languages: langCount,
		visitsToday: byDate.get(today) ?? 0,
		visitsYesterday: byDate.get(yesterday) ?? 0,
		visitsTotal: vrows.reduce((s, r) => s + r.count, 0),
		visitorSeries: series,
		submissions: { contact, newsletter, alumni },
	};
}

export type Readership = {
	pages: { path: string; count: number; lastViewedAt: string | null }[];
	documents: {
		id: number;
		slug: string;
		contentType: string;
		title: string;
		reads: number;
	}[];
	totalViews: number;
	totalReads: number;
};

/**
 * What the public actually reads: pages by view, documents by how often the
 * reader opened the file. Both counters are write-on-read and unfiltered, so a
 * crawler counts as a reader.
 */
export async function readership(
	db: DB,
	lang: string,
	limit = 10,
): Promise<Readership> {
	const views = await db
		.select()
		.from(pageViews)
		.where(eq(pageViews.tenantId, TENANT))
		.orderBy(desc(pageViews.count));
	const rows = await db
		.select({
			id: posts.id,
			slug: posts.slug,
			contentType: posts.contentType,
			meta: posts.meta,
		})
		.from(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.status, "published")));
	const read = rows
		.map((r) => ({
			...r,
			reads: Number(
				(r.meta as Record<string, unknown> | null)?.downloadCount ?? 0,
			),
		}))
		.filter((r) => r.reads > 0)
		.sort((a, b) => b.reads - a.reads);
	const titles = await resolveTranslations(
		db,
		"post",
		read.slice(0, limit).map((r) => r.id),
		lang,
	);
	return {
		pages: views.slice(0, limit).map((v) => ({
			path: v.path,
			count: v.count,
			lastViewedAt: v.lastViewedAt,
		})),
		documents: read.slice(0, limit).map((r) => ({
			id: r.id,
			slug: r.slug,
			contentType: r.contentType,
			title: titles.get(r.id)?.title ?? r.slug,
			reads: r.reads,
		})),
		totalViews: views.reduce((sum, v) => sum + v.count, 0),
		totalReads: read.reduce((sum, r) => sum + r.reads, 0),
	};
}

/** Replace all translations for an entity with the given (lang, field, value) rows. */
async function setTranslations(
	db: DB,
	entityType: string,
	id: number,
	rows: { lang: string; field: string; value: string }[],
) {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, entityType),
				eq(translations.entityId, id),
			),
		);
	const ins = rows
		.filter((r) => r.value !== "")
		.map((r) => ({
			tenantId: TENANT,
			entityType,
			entityId: id,
			field: r.field,
			lang: r.lang,
			value: r.value,
		}));
	if (ins.length) await db.insert(translations).values(ins);
}

function groupTranslations(
	rows: { entityId: number; lang: string; field: string; value: string }[],
) {
	const m = new Map<number, Record<string, Record<string, string>>>();
	for (const r of rows) {
		const byLang = m.get(r.entityId) ?? {};
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
		m.set(r.entityId, byLang);
	}
	return m;
}

const TENANT = 1;
const POST_FIELDS = ["title", "excerpt", "body"] as const;

export type PostTranslation = {
	lang: string;
	title: string;
	excerpt: string;
	body: string;
};
export type PostInput = {
	contentType: string;
	slug: string;
	status: string;
	author?: string | null;
	publishedAt?: string | null;
	coverMediaId?: number | null;
	media?: number[]; // ordered gallery (post_media); undefined = leave untouched
	meta?: Record<string, unknown> | null;
	translations: PostTranslation[];
};

/** Replace a post's ordered gallery (post_media) with `ids`, preserving order. */
async function writePostMedia(
	db: DB,
	postId: number,
	ids: number[] | undefined,
): Promise<void> {
	if (ids === undefined) return; // caller didn't manage the gallery — leave it alone
	await db.delete(postMedia).where(eq(postMedia.postId, postId));
	if (ids.length) {
		await db
			.insert(postMedia)
			.values(ids.map((mediaId, i) => ({ postId, mediaId, sort: i })));
	}
}

/** All posts (any status) with the default-language title, for the admin list. */
export async function adminListPosts(db: DB) {
	const rows = await db
		.select()
		.from(posts)
		.where(eq(posts.tenantId, TENANT))
		.orderBy(desc(posts.id));

	const titles = await db
		.select({
			entityId: translations.entityId,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(eq(translations.entityType, "post"), eq(translations.field, "title")),
		);
	const titleByPost = new Map<number, Record<string, string>>();
	for (const r of titles) {
		const m = titleByPost.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		titleByPost.set(r.entityId, m);
	}

	return rows.map((r) => {
		const t = titleByPost.get(r.id) ?? {};
		return {
			id: r.id,
			slug: r.slug,
			contentType: r.contentType,
			status: r.status,
			publishedAt: r.publishedAt,
			title: t.en ?? Object.values(t)[0] ?? "(untitled)",
		};
	});
}

/** A post plus its translations grouped by language, for the edit form. */
export async function getPostForEdit(db: DB, id: number) {
	const [post] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)))
		.limit(1);
	if (!post) return null;

	const rows = await db
		.select({
			field: translations.field,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(eq(translations.entityType, "post"), eq(translations.entityId, id)),
		);

	const byLang: Record<string, Record<string, string>> = {};
	for (const r of rows) {
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}

	const mediaRows = await db
		.select({ mediaId: postMedia.mediaId })
		.from(postMedia)
		.where(eq(postMedia.postId, id))
		.orderBy(asc(postMedia.sort));

	return {
		id: post.id,
		contentType: post.contentType,
		slug: post.slug,
		status: post.status,
		author: post.author,
		publishedAt: post.publishedAt,
		coverMediaId: post.coverMediaId,
		media: mediaRows.map((m) => m.mediaId),
		meta: post.meta ?? null,
		translations: byLang,
	};
}

function translationRows(entityId: number, input: PostInput) {
	const rows: {
		tenantId: number;
		entityType: string;
		entityId: number;
		field: string;
		lang: string;
		value: string;
	}[] = [];
	for (const tr of input.translations) {
		for (const field of POST_FIELDS) {
			const value = (tr as Record<string, string>)[field] ?? "";
			if (value !== "") {
				rows.push({
					tenantId: TENANT,
					entityType: "post",
					entityId,
					field,
					lang: tr.lang,
					value,
				});
			}
		}
	}
	return rows;
}

// the unique index otherwise surfaces to the editor as a raw constraint string
async function requireFreeSlug(
	db: DB,
	entity: "post" | "page" | "project",
	slug: string,
	excludeId?: number,
): Promise<void> {
	const table = { post: posts, page: pages, project: projects }[entity];
	const [row] = await db
		.select({ id: table.id })
		.from(table)
		.where(and(eq(table.tenantId, TENANT), eq(table.slug, slug)))
		.limit(1);
	if (row && row.id !== excludeId)
		throw new Error(
			`A ${entity} already exists at "${slug}". Choose a different URL.`,
		);
}

export async function createPost(db: DB, input: PostInput): Promise<number> {
	await requireFreeSlug(db, "post", input.slug);
	const [row] = await db
		.insert(posts)
		.values({
			tenantId: TENANT,
			contentType: input.contentType,
			slug: input.slug,
			status: input.status,
			author: input.author ?? null,
			publishedAt: input.publishedAt ?? null,
			coverMediaId: input.coverMediaId ?? null,
			meta: input.meta ?? null,
		})
		.returning({ id: posts.id });
	const trs = translationRows(row.id, input);
	if (trs.length) await db.insert(translations).values(trs);
	await writePostMedia(db, row.id, input.media);
	return row.id;
}

export async function updatePost(
	db: DB,
	id: number,
	input: PostInput,
): Promise<void> {
	await requireFreeSlug(db, "post", input.slug, id);
	await db
		.update(posts)
		.set({
			contentType: input.contentType,
			slug: input.slug,
			status: input.status,
			author: input.author ?? null,
			publishedAt: input.publishedAt ?? null,
			coverMediaId: input.coverMediaId ?? null,
			meta: input.meta ?? null,
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)));

	// Replace translations wholesale.
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "post"), eq(translations.entityId, id)),
		);
	const trs = translationRows(id, input);
	if (trs.length) await db.insert(translations).values(trs);
	await writePostMedia(db, id, input.media);
}

export async function deletePost(db: DB, id: number): Promise<void> {
	await db.delete(postMedia).where(eq(postMedia.postId, id));
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "post"), eq(translations.entityId, id)),
		);
	await db
		.delete(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)));
}

/** Content-type registry (for the create form's type select). */
export function listContentTypes(db: DB) {
	return db.select().from(contentTypes).orderBy(contentTypes.sort);
}

/* ---------------- Pages ---------------- */

const PAGE_FIELDS = ["title", "excerpt", "body"] as const;
export type PageInput = {
	slug: string; // ignored on write — derived from parentId + segment
	segment: string; // editable last path part
	parentId: number | null; // tree parent (null = root)
	status: string;
	coverMediaId: number | null;
	sections: SectionNode[];
	translations: {
		lang: string;
		title: string;
		excerpt: string;
		body: string;
	}[];
	/** The `updatedAt` the editor loaded. Absent skips the check (imports, seeds). */
	expectedUpdatedAt?: string | null;
};

/** The row moved between the editor reading it and this save. */
export class StaleWriteError extends Error {
	constructor() {
		super("CONFLICT");
		this.name = "StaleWriteError";
	}
}

/** Trim the wrapper the editor may send; the rest of the segment is the author's. */
const cleanSegment = (input: PageInput) =>
	(input.segment || input.slug).trim().replace(/^\/+|\/+$/g, "");

function requireValidSegment(segment: string): void {
	const problem = segmentProblem(segment);
	if (problem) throw new Error(problem);
}

/** Full path for a page = parent's slug + "/" + segment (segment alone at root). */
async function slugFor(
	db: DB,
	parentId: number | null,
	segment: string,
): Promise<string> {
	const seg = segment.replace(/^\/+|\/+$/g, "");
	if (!parentId) return seg;
	const [p] = await db
		.select({ slug: pages.slug })
		.from(pages)
		.where(eq(pages.id, parentId))
		.limit(1);
	return p ? `${p.slug}/${seg}` : seg;
}

/** Next sort order among a parent's children. */
async function nextSortOrder(db: DB, parentId: number | null): Promise<number> {
	const rows = await db
		.select({ s: pages.sortOrder })
		.from(pages)
		.where(
			and(
				eq(pages.tenantId, TENANT),
				parentId == null
					? isNull(pages.parentId)
					: eq(pages.parentId, parentId),
			),
		);
	return rows.reduce((m, r) => Math.max(m, (r.s ?? 0) + 1), 0);
}

type PageNode = {
	id: number;
	parentId: number | null;
	segment: string | null;
	slug: string;
};

/** The whole tenant tree, which is what both slug walks read. */
function allPages(db: DB): Promise<PageNode[]> {
	return db
		.select({
			id: pages.id,
			parentId: pages.parentId,
			segment: pages.segment,
			slug: pages.slug,
		})
		.from(pages)
		.where(eq(pages.tenantId, TENANT));
}

type SlugMove = { id: number; slug: string; from: string };

/** A transaction handle; the writes below run inside one, never on their own. */
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

// pure, so the walk is planned before a transaction opens: bun:sqlite takes a synchronous callback
function subtreeMoves(
	all: PageNode[],
	rootId: number,
	newSlug: string,
): SlugMove[] {
	const childrenOf = new Map<number, PageNode[]>();
	for (const p of all) {
		if (p.parentId == null) continue;
		const kids = childrenOf.get(p.parentId);
		if (kids) kids.push(p);
		else childrenOf.set(p.parentId, [p]);
	}
	const moves: SlugMove[] = [];
	const walk = (id: number, slug: string, from: string) => {
		if (slug !== from) moves.push({ id, slug, from });
		for (const c of childrenOf.get(id) ?? [])
			walk(c.id, `${slug}/${c.segment}`, c.slug);
	};
	walk(rootId, newSlug, all.find((p) => p.id === rootId)?.slug ?? newSlug);
	return moves;
}

/** Move the pages and leave a 301 behind each one. */
function applyMoves(tx: Tx, moves: SlugMove[]): void {
	for (const m of moves) {
		tx.update(pages).set({ slug: m.slug }).where(eq(pages.id, m.id)).run();
		tx.insert(slugRedirects)
			.values({
				tenantId: TENANT,
				entityType: "page",
				fromSlug: m.from,
				toEntityId: m.id,
			})
			.onConflictDoNothing()
			.run();
	}
}

async function recomputeSubtree(
	db: DB,
	rootId: number,
	newSlug: string,
): Promise<void> {
	const moves = subtreeMoves(await allPages(db), rootId, newSlug);
	db.transaction((tx) => applyMoves(tx, moves));
}

export async function adminListPages(db: DB) {
	const rows = await db
		.select()
		.from(pages)
		.where(eq(pages.tenantId, TENANT))
		.orderBy(desc(pages.id));
	const titles = await db
		.select({
			entityId: translations.entityId,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(eq(translations.entityType, "page"), eq(translations.field, "title")),
		);
	const byPage = new Map<number, Record<string, string>>();
	for (const r of titles) {
		const m = byPage.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		byPage.set(r.entityId, m);
	}
	return rows.map((r) => {
		const t = byPage.get(r.id) ?? {};
		return {
			id: r.id,
			slug: r.slug,
			segment: r.segment ?? r.slug,
			parentId: r.parentId,
			sortOrder: r.sortOrder ?? 0,
			status: r.status,
			title: t.en ?? Object.values(t)[0] ?? "(untitled)",
		};
	});
}

export async function getPageForEdit(db: DB, id: number) {
	const [page] = await db
		.select()
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
		.limit(1);
	if (!page) return null;
	const rows = await db
		.select({
			field: translations.field,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(eq(translations.entityType, "page"), eq(translations.entityId, id)),
		);
	const byLang: Record<string, Record<string, string>> = {};
	for (const r of rows) {
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}
	return {
		id: page.id,
		slug: page.slug,
		segment: page.segment ?? page.slug,
		parentId: page.parentId,
		status: page.status,
		coverMediaId: page.heroMediaId,
		sections: (page.sections ?? []) as SectionNode[],
		translations: byLang,
		updatedAt: page.updatedAt,
	};
}

function pageTranslationRows(entityId: number, input: PageInput) {
	const rows: {
		tenantId: number;
		entityType: string;
		entityId: number;
		field: string;
		lang: string;
		value: string;
	}[] = [];
	for (const tr of input.translations) {
		for (const field of PAGE_FIELDS) {
			const value = (tr as Record<string, string>)[field] ?? "";
			if (value !== "")
				rows.push({
					tenantId: TENANT,
					entityType: "page",
					entityId,
					field,
					lang: tr.lang,
					value,
				});
		}
	}
	return rows;
}

// resolveRoute serves / by this exact slug with no fallback, so a page moving out from under it takes the front page with it
const FRONT_PAGE_SLUG = "home";

const frontPageSlug = async (db: DB, id: number) => {
	const [row] = await db
		.select({ slug: pages.slug })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
		.limit(1);
	return row?.slug === FRONT_PAGE_SLUG;
};

const refuseFrontPage = (what: string) => {
	throw new Error(
		`This is the site's front page: / is served from the page at "${FRONT_PAGE_SLUG}", and ${what} would leave / with nothing to answer with. Edit its content freely, or point / somewhere else first by giving another page the "${FRONT_PAGE_SLUG}" address.`,
	);
};

export async function createPage(db: DB, input: PageInput): Promise<number> {
	const segment = cleanSegment(input);
	requireValidSegment(segment);
	const slug = await slugFor(db, input.parentId, segment);
	await requireFreeSlug(db, "page", slug);
	const sortOrder = await nextSortOrder(db, input.parentId);
	const [row] = await db
		.insert(pages)
		.values({
			tenantId: TENANT,
			slug,
			segment,
			parentId: input.parentId,
			sortOrder,
			status: input.status,
			heroMediaId: input.coverMediaId,
			sections: input.sections,
		})
		.returning({ id: pages.id });
	const trs = pageTranslationRows(row.id, input);
	if (trs.length) await db.insert(translations).values(trs);
	return row.id;
}

export async function updatePage(
	db: DB,
	id: number,
	input: PageInput,
): Promise<string> {
	const [prev] = await db
		.select({
			slug: pages.slug,
			segment: pages.segment,
			parentId: pages.parentId,
		})
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
		.limit(1);
	const segment = cleanSegment(input);
	// A row stored before the rule existed keeps its segment until someone edits
	// it; refusing to save an untouched legacy address would strand the page.
	if (segment !== (prev?.segment ?? prev?.slug ?? ""))
		requireValidSegment(segment);
	// Guard against reparenting under self/descendant (would orphan the subtree).
	const parentId = (await isDescendant(db, input.parentId, id))
		? (prev?.parentId ?? null)
		: input.parentId;
	const newSlug = await slugFor(db, parentId, segment);
	if (prev?.slug === FRONT_PAGE_SLUG && newSlug !== FRONT_PAGE_SLUG)
		refuseFrontPage("renaming or reparenting it");
	await requireFreeSlug(db, "page", newSlug, id);
	const reorder =
		parentId !== (prev?.parentId ?? null)
			? await nextSortOrder(db, parentId)
			: undefined;
	// Compare-and-swap on the version the editor loaded: two tabs editing one page
	// otherwise both save, and the later write silently replaces the earlier one.
	const updatedAt = new Date().toISOString();
	const written = await db
		.update(pages)
		.set({
			segment,
			parentId,
			status: input.status,
			heroMediaId: input.coverMediaId,
			sections: input.sections,
			...(reorder != null ? { sortOrder: reorder } : {}),
			updatedAt,
		})
		.where(
			and(
				eq(pages.tenantId, TENANT),
				eq(pages.id, id),
				...(input.expectedUpdatedAt
					? [eq(pages.updatedAt, input.expectedUpdatedAt)]
					: []),
			),
		)
		.returning({ id: pages.id });
	if (!written.length) throw new StaleWriteError();
	// Slug change (rename or reparent) cascades to descendants via recomputeSubtree,
	// which writes the new slugs and records a 301 for every page whose URL moved.
	if (prev && prev.slug !== newSlug) await recomputeSubtree(db, id, newSlug);
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "page"), eq(translations.entityId, id)),
		);
	const trs = pageTranslationRows(id, input);
	if (trs.length) await db.insert(translations).values(trs);
	return updatedAt;
}

/* ---------------- One field at a time ---------------- */

export type FieldTarget =
	| { kind: "field"; field: string }
	| { kind: "sectionProp"; sectionId: string; field: string }
	| {
			kind: "sectionItem";
			sectionId: string;
			key: string;
			index: number;
			field: string;
	  };

const SECTION_ID = "[A-Za-z0-9_-]+";
const NAME = "[A-Za-z][A-Za-z0-9_]*";
const TARGET_FIELD = new RegExp(`^field:(${NAME})$`);
const TARGET_PROP = new RegExp(`^section:(${SECTION_ID}):props\\.(${NAME})$`);
const TARGET_ITEM = new RegExp(
	`^section:(${SECTION_ID}):props\\.(${NAME})\\[(\\d+)\\]\\.(${NAME})$`,
);

// an address arrives from a data- attribute in the browser, so it is untrusted input
export function parseFieldTarget(target: string): FieldTarget {
	const item = TARGET_ITEM.exec(target);
	if (item)
		return {
			kind: "sectionItem",
			sectionId: item[1],
			key: item[2],
			index: Number(item[3]),
			field: item[4],
		};
	const prop = TARGET_PROP.exec(target);
	if (prop) return { kind: "sectionProp", sectionId: prop[1], field: prop[2] };
	const field = TARGET_FIELD.exec(target);
	if (field) return { kind: "field", field: field[1] };
	throw new Error(
		`"${target}" is not a field address. Expected field:<name>, section:<id>:props.<field> or section:<id>:props.<items>[<n>].<field>.`,
	);
}

const ENTITY_TABLES = {
	page: pages,
	post: posts,
	person: people,
	project: projects,
} as const;

const ENTITY_FIELDS: Record<string, readonly string[]> = {
	page: PAGE_FIELDS,
	post: POST_FIELDS,
	person: ["bio"],
	project: ["name", "summary", "body"],
};

/**
 * A person's name is a column per language and the position one column for all
 * of them, so neither is a `translations` row and both are written here instead.
 */
const PERSON_NAME_COLUMN: Record<string, "nameEn" | "nameKm"> = {
	en: "nameEn",
	km: "nameKm",
};
const PERSON_COLUMN_FIELDS = ["name", "position"] as const;

// projects carries no updated_at, so a compare-and-swap is impossible there
const VERSIONED_TABLES = {
	page: pages,
	post: posts,
	person: people,
} as const;

export type UpdateFieldInput = {
	entity: string;
	entityId: number;
	lang: string;
	target: string;
	value: string;
	/** The `updatedAt` the editor loaded. Absent skips the check. */
	expectedUpdatedAt?: string | null;
};

export type UpdateFieldResult = {
	/** A `translations` row, or a key inside the page's `sections` JSON. */
	wrote: "translation" | "section";
	/** Blank clears rather than storing an empty string, as the wholesale path does. */
	cleared: boolean;
	/** The new version to send with the next save; null where the table has none. */
	updatedAt: string | null;
};

async function requireLanguage(db: DB, lang: string): Promise<void> {
	const [row] = await db
		.select({ code: languages.code })
		.from(languages)
		.where(eq(languages.code, lang))
		.limit(1);
	if (!row) throw new Error(`"${lang}" is not a language on this site.`);
}

/** Compare-and-swap on the version the editor loaded, as `updatePage` does. */
async function stampVersion(
	db: DB,
	entity: string,
	id: number,
	expected: string | null | undefined,
): Promise<string | null> {
	const table = VERSIONED_TABLES[entity as keyof typeof VERSIONED_TABLES];
	if (!table) {
		if (expected)
			throw new Error(
				`A ${entity} has no version column, so this save cannot be checked against the copy you loaded.`,
			);
		return null;
	}
	const updatedAt = new Date().toISOString();
	const written = await db
		.update(table)
		.set({ updatedAt })
		.where(
			and(
				eq(table.tenantId, TENANT),
				eq(table.id, id),
				...(expected ? [eq(table.updatedAt, expected)] : []),
			),
		)
		.returning({ id: table.id });
	if (!written.length) throw new StaleWriteError();
	return updatedAt;
}

const TEXT_KINDS = new Set(["text", "textarea", "richtext"]);
// cards are edited by a bespoke editor rather than declared itemFields
const CARD_TEXT_FIELDS = ["title", "body", "caption"];

const textItemFields = (container: SectionField): string[] =>
	container.kind === "cards"
		? CARD_TEXT_FIELDS
		: (container.itemFields ?? [])
				.filter((f) => TEXT_KINDS.has(f.kind))
				.map((f) => f.key);

/**
 * Write one key into the per-language overlay, mirroring `SectionsBuilder`'s
 * `setI18n`: a blank value drops the key so the field falls back to the default
 * language, and a map or overlay left empty goes with it.
 */
function setOverlay(
	props: Record<string, unknown>,
	lang: string,
	key: string,
	value: unknown,
): Record<string, unknown> {
	const i18n = {
		...((props.i18n as Record<string, Record<string, unknown>>) ?? {}),
	};
	const map = { ...(i18n[lang] ?? {}) };
	if (value === "" || value == null) delete map[key];
	else map[key] = value;
	if (Object.keys(map).length) i18n[lang] = map;
	else delete i18n[lang];
	const next = { ...props };
	if (Object.keys(i18n).length) next.i18n = i18n;
	else delete next.i18n;
	return next;
}

function writeSectionProp(
	node: SectionNode,
	props: Record<string, unknown>,
	target: Extract<FieldTarget, { kind: "sectionProp" }>,
	lang: string,
	value: string,
): Record<string, unknown> {
	// a custom background is a colour, checked by the same parser the theme uses
	if (isColourField(node.type ?? "", target.field)) {
		const why = checkThemeValue("colour", value);
		if (why) throw new Error(why);
		const next = { ...props };
		if (value) next[target.field] = value;
		else delete next[target.field];
		return next;
	}
	// a choice is one value for every language: shared props, never the overlay
	const choice = choiceField(node.type ?? "", target.field);
	if (choice) {
		const allowed = (choice.options ?? []).map((o) => o.value);
		if (!allowed.includes(value))
			throw new Error(
				`"${value}" is not one of the values "${target.field}" takes on a ${node.type} section. It takes ${allowed.map((v) => v || "(empty)").join(", ")}.`,
			);
		const next = { ...props };
		if (value) next[target.field] = value;
		else delete next[target.field];
		return next;
	}
	const offered = translatableFields(node.type ?? "", props).map((f) => f.key);
	if (!offered.includes(target.field))
		throw new Error(
			`"${target.field}" is not translatable text on a ${node.type} section. It offers ${offered.join(", ") || "none"}.`,
		);
	if (lang === DEFAULT_LANG) return { ...props, [target.field]: value };
	return setOverlay(props, lang, target.field, value);
}

function writeSectionItem(
	node: SectionNode,
	props: Record<string, unknown>,
	target: Extract<FieldTarget, { kind: "sectionItem" }>,
	lang: string,
	value: string,
): Record<string, unknown> {
	const container = sectionDef(node.type ?? "")?.fields.find(
		(f) => f.key === target.key,
	);
	if (!container || (container.kind !== "items" && container.kind !== "cards"))
		throw new Error(
			`"${target.key}" is not a repeater on a ${node.type} section.`,
		);
	const offered = textItemFields(container);
	if (!offered.includes(target.field))
		throw new Error(
			`"${target.field}" is not translatable text on a ${target.key} item. It offers ${offered.join(", ") || "none"}.`,
		);
	const shared = Array.isArray(props[target.key])
		? (props[target.key] as Record<string, unknown>[])
		: [];
	// the overlay replaces the whole key, so a translated repeater is a full copy of the array
	const overlay = (props.i18n as Record<string, Record<string, unknown>>)?.[
		lang
	]?.[target.key];
	const base =
		lang === DEFAULT_LANG || !Array.isArray(overlay)
			? shared
			: (overlay as Record<string, unknown>[]);
	if (target.index >= base.length)
		throw new Error(
			`Item ${target.index} is past the end of "${target.key}", which has ${base.length}.`,
		);
	const items = base.map((it, n) => {
		if (n !== target.index) return { ...it };
		const next = { ...it };
		if (value === "" && lang !== DEFAULT_LANG) delete next[target.field];
		else next[target.field] = value;
		return next;
	});
	if (lang === DEFAULT_LANG) return { ...props, [target.key]: items };
	// an overlay that has drifted back to the shared array carries nothing, so it goes
	const same = JSON.stringify(items) === JSON.stringify(shared);
	return setOverlay(props, lang, target.key, same ? "" : items);
}

/** Apply one value to one section node, leaving every other node untouched. */
export function applySectionValue(
	sections: SectionNode[],
	target: Exclude<FieldTarget, { kind: "field" }>,
	lang: string,
	value: string,
): SectionNode[] {
	const node = sections.find((s) => s?.id === target.sectionId);
	if (!node) throw new Error(`No section "${target.sectionId}" on this page.`);
	const props = { ...(node.props ?? {}) };
	const next =
		target.kind === "sectionProp"
			? writeSectionProp(node, props, target, lang, value)
			: writeSectionItem(node, props, target, lang, value);
	return sections.map((s) => (s === node ? { ...s, props: next } : s));
}

async function writeTranslationField(
	db: DB,
	input: UpdateFieldInput,
	field: string,
	value: string,
): Promise<UpdateFieldResult> {
	const offered = ENTITY_FIELDS[input.entity];
	if (!offered.includes(field))
		throw new Error(
			`"${field}" is not a translated field of a ${input.entity}. It has ${offered.join(", ")}.`,
		);
	if (
		input.entity === "page" &&
		field === "title" &&
		value.length > PAGE_TITLE_MAX
	)
		throw new Error(
			`A page title is at most ${PAGE_TITLE_MAX} characters; this one is ${value.length}.`,
		);
	const updatedAt = await stampVersion(
		db,
		input.entity,
		input.entityId,
		input.expectedUpdatedAt,
	);
	const row = and(
		eq(translations.entityType, input.entity),
		eq(translations.entityId, input.entityId),
		eq(translations.field, field),
		eq(translations.lang, input.lang),
	);
	// the wholesale path stores no row for an empty value, so clearing removes it rather than blanking it
	if (!value) {
		await db.delete(translations).where(row);
		return { wrote: "translation", cleared: true, updatedAt };
	}
	await db
		.insert(translations)
		.values({
			tenantId: TENANT,
			entityType: input.entity,
			entityId: input.entityId,
			field,
			lang: input.lang,
			value,
		})
		.onConflictDoUpdate({
			target: [
				translations.entityType,
				translations.entityId,
				translations.field,
				translations.lang,
			],
			set: { value },
		});
	return { wrote: "translation", cleared: false, updatedAt };
}

async function writePersonColumn(
	db: DB,
	input: UpdateFieldInput,
	field: string,
	value: string,
): Promise<UpdateFieldResult> {
	const updatedAt = await stampVersion(
		db,
		input.entity,
		input.entityId,
		input.expectedUpdatedAt,
	);
	if (field === "position") {
		// one column for every language: saying so beats letting a Khmer editor
		// silently rewrite what an English reader sees
		await db
			.update(people)
			.set({ position: value || null })
			.where(eq(people.id, input.entityId));
		return { wrote: "translation", cleared: !value, updatedAt };
	}
	const column = PERSON_NAME_COLUMN[input.lang];
	if (!column)
		throw new Error(
			`A person's name is stored per language in its own column, and there is none for "${input.lang}". Edit it in ${Object.keys(PERSON_NAME_COLUMN).join(" or ")}.`,
		);
	if (!value && column === "nameEn")
		throw new Error(
			"A person needs a name in the default language; every list and link uses it.",
		);
	await db
		.update(people)
		.set({ [column]: value || null })
		.where(eq(people.id, input.entityId));
	return { wrote: "translation", cleared: !value, updatedAt };
}

async function writeSectionField(
	db: DB,
	input: UpdateFieldInput,
	target: Exclude<FieldTarget, { kind: "field" }>,
	value: string,
): Promise<UpdateFieldResult> {
	if (input.entity !== "page")
		throw new Error(
			`Only a page carries sections; a ${input.entity} has none.`,
		);
	const [page] = await db
		.select({ sections: pages.sections })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, input.entityId)))
		.limit(1);
	const sections = applySectionValue(
		(page?.sections ?? []) as SectionNode[],
		target,
		input.lang,
		value,
	);
	// one statement, so the version check and the section write cannot come apart
	const updatedAt = new Date().toISOString();
	const written = await db
		.update(pages)
		.set({ sections, updatedAt })
		.where(
			and(
				eq(pages.tenantId, TENANT),
				eq(pages.id, input.entityId),
				...(input.expectedUpdatedAt
					? [eq(pages.updatedAt, input.expectedUpdatedAt)]
					: []),
			),
		)
		.returning({ id: pages.id });
	if (!written.length) throw new StaleWriteError();
	return { wrote: "section", cleared: !value, updatedAt };
}

/**
 * Write one addressed field, touching nothing else.
 *
 * `updatePage` deletes every translation row for the page and reinserts from its
 * payload, so an inline save through it destroys any language or field the
 * payload left out. This path writes the one row, or the one key.
 */
export async function updateField(
	db: DB,
	input: UpdateFieldInput,
): Promise<UpdateFieldResult> {
	const target = parseFieldTarget(input.target);
	const table = ENTITY_TABLES[input.entity as keyof typeof ENTITY_TABLES];
	if (!table)
		throw new Error(
			`"${input.entity}" has no editable fields. Expected one of ${Object.keys(ENTITY_TABLES).join(", ")}.`,
		);
	await requireLanguage(db, input.lang);
	const [row] = await db
		.select({ id: table.id })
		.from(table)
		.where(and(eq(table.tenantId, TENANT), eq(table.id, input.entityId)))
		.limit(1);
	if (!row) throw new Error(`There is no ${input.entity} ${input.entityId}.`);
	const value = input.value.trim();
	if (
		target.kind === "field" &&
		input.entity === "person" &&
		(PERSON_COLUMN_FIELDS as readonly string[]).includes(target.field)
	)
		return writePersonColumn(db, input, target.field, value);
	return target.kind === "field"
		? writeTranslationField(db, input, target.field, value)
		: writeSectionField(db, input, target, value);
}

/** True if `candidateParentId` is `id` itself or one of its descendants. */
async function isDescendant(
	db: DB,
	candidateParentId: number | null,
	id: number,
): Promise<boolean> {
	if (candidateParentId == null) return false;
	if (candidateParentId === id) return true;
	const all = await db
		.select({ id: pages.id, parentId: pages.parentId })
		.from(pages)
		.where(eq(pages.tenantId, TENANT));
	const parentOf = new Map(all.map((p) => [p.id, p.parentId]));
	let cur: number | null | undefined = candidateParentId;
	while (cur != null) {
		if (cur === id) return true;
		cur = parentOf.get(cur);
	}
	return false;
}

/** Drag-and-drop: move a page under a new parent at a given index among siblings. */
export async function movePage(
	db: DB,
	id: number,
	parentId: number | null,
	index: number,
): Promise<void> {
	if (await isDescendant(db, parentId, id)) return; // never reparent under self/descendant
	if (parentId != null && (await frontPageSlug(db, id)))
		refuseFrontPage("moving it under another page");
	const [self] = await db
		.select({ segment: pages.segment })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
		.limit(1);
	if (!self) return;
	const newSlug = await slugFor(db, parentId, self.segment ?? "");
	await db.update(pages).set({ parentId }).where(eq(pages.id, id));
	await recomputeSubtree(db, id, newSlug);
	// Renumber the destination siblings, inserting `id` at `index`.
	const siblings = await db
		.select({ id: pages.id, sortOrder: pages.sortOrder })
		.from(pages)
		.where(
			and(
				eq(pages.tenantId, TENANT),
				parentId == null
					? isNull(pages.parentId)
					: eq(pages.parentId, parentId),
			),
		)
		.orderBy(asc(pages.sortOrder));
	const ordered = siblings.filter((s) => s.id !== id).map((s) => s.id);
	ordered.splice(Math.max(0, Math.min(index, ordered.length)), 0, id);
	for (let i = 0; i < ordered.length; i++)
		await db
			.update(pages)
			.set({ sortOrder: i })
			.where(eq(pages.id, ordered[i]));
}

export async function deletePage(db: DB, id: number): Promise<void> {
	if (await frontPageSlug(db, id)) refuseFrontPage("deleting it");
	// planned first and written in one transaction: a failure partway left the tree half-reparented
	const all = await allPages(db);
	const self = all.find((p) => p.id === id);
	const newParentId = self?.parentId ?? null;
	const newParentSlug = all.find((p) => p.id === newParentId)?.slug;
	const kids = self ? all.filter((p) => p.parentId === id) : [];
	const moves = kids.flatMap((k) => {
		const segment = (k.segment ?? "").replace(/^\/+|\/+$/g, "");
		const under = newParentSlug ? `${newParentSlug}/${segment}` : segment;
		return subtreeMoves(all, k.id, under);
	});

	db.transaction((tx) => {
		for (const k of kids)
			tx.update(pages)
				.set({ parentId: newParentId })
				.where(eq(pages.id, k.id))
				.run();
		applyMoves(tx, moves);
		tx.delete(translations)
			.where(
				and(eq(translations.entityType, "page"), eq(translations.entityId, id)),
			)
			.run();
		tx.delete(pages)
			.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
			.run();
	});
}

/* ---------------- Navigation builder ---------------- */

export type NavInput = {
	parentId: number | null;
	targetKind: string;
	targetRef: string;
	visible: boolean;
	imageMediaId: number | null;
	labels: Record<string, string>;
	descriptions: Record<string, string>;
};

/** Flat list of all nav items with labels + briefs grouped by language (UI builds the tree). */
export async function adminListNav(db: DB) {
	const items = await db
		.select()
		.from(navItems)
		.where(eq(navItems.tenantId, TENANT))
		.orderBy(asc(navItems.sort));
	const trRows = await db
		.select({
			entityId: translations.entityId,
			field: translations.field,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "nav_item"),
				inArray(translations.field, ["label", "description"]),
			),
		);
	const labelsByItem = new Map<number, Record<string, string>>();
	const descByItem = new Map<number, Record<string, string>>();
	for (const r of trRows) {
		const bucket = r.field === "description" ? descByItem : labelsByItem;
		const m = bucket.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		bucket.set(r.entityId, m);
	}
	return items.map((i) => ({
		id: i.id,
		parentId: i.parentId,
		sort: i.sort,
		targetKind: i.targetKind,
		targetRef: i.targetRef,
		visible: i.visible,
		imageMediaId: i.imageMediaId,
		labels: labelsByItem.get(i.id) ?? {},
		descriptions: descByItem.get(i.id) ?? {},
	}));
}

/** Replace the translatable text (label + brief) for a nav item. */
async function setNavText(
	db: DB,
	id: number,
	labels: Record<string, string>,
	descriptions: Record<string, string>,
) {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "nav_item"),
				eq(translations.entityId, id),
			),
		);
	const rows = [
		...Object.entries(labels)
			.filter(([, v]) => v !== "")
			.map(([lang, value]) => ({
				tenantId: TENANT,
				entityType: "nav_item",
				entityId: id,
				field: "label",
				lang,
				value,
			})),
		...Object.entries(descriptions)
			.filter(([, v]) => v !== "")
			.map(([lang, value]) => ({
				tenantId: TENANT,
				entityType: "nav_item",
				entityId: id,
				field: "description",
				lang,
				value,
			})),
	];
	if (rows.length) await db.insert(translations).values(rows);
}

export async function createNavItem(db: DB, input: NavInput): Promise<number> {
	// next sort = max sort among same-parent siblings + 1
	const sibSorts = (
		await db.select().from(navItems).where(eq(navItems.tenantId, TENANT))
	)
		.filter((s) => s.parentId === input.parentId)
		.map((s) => s.sort);
	const sort = sibSorts.length ? Math.max(...sibSorts) + 1 : 0;
	const [row] = await db
		.insert(navItems)
		.values({
			tenantId: TENANT,
			parentId: input.parentId,
			sort,
			targetKind: input.targetKind,
			targetRef: input.targetRef,
			visible: input.visible,
			imageMediaId: input.imageMediaId,
		})
		.returning({ id: navItems.id });
	await setNavText(db, row.id, input.labels, input.descriptions);
	return row.id;
}

export async function updateNavItem(
	db: DB,
	id: number,
	input: Omit<NavInput, "parentId">,
): Promise<void> {
	await db
		.update(navItems)
		.set({
			targetKind: input.targetKind,
			targetRef: input.targetRef,
			visible: input.visible,
			imageMediaId: input.imageMediaId,
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(navItems.tenantId, TENANT), eq(navItems.id, id)));
	await setNavText(db, id, input.labels, input.descriptions);
}

/** Delete an item and all its descendants. */
export async function deleteNavItem(db: DB, id: number): Promise<void> {
	const all = await db
		.select()
		.from(navItems)
		.where(eq(navItems.tenantId, TENANT));
	const toDelete = new Set<number>([id]);
	let added = true;
	while (added) {
		added = false;
		for (const i of all) {
			if (
				i.parentId != null &&
				toDelete.has(i.parentId) &&
				!toDelete.has(i.id)
			) {
				toDelete.add(i.id);
				added = true;
			}
		}
	}
	const ids = [...toDelete];
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "nav_item"),
				inArray(translations.entityId, ids),
			),
		);
	await db.delete(navItems).where(inArray(navItems.id, ids));
}

/* ---------------- Media ---------------- */

export function adminListMedia(db: DB) {
	return db
		.select()
		.from(media)
		.where(eq(media.tenantId, TENANT))
		.orderBy(desc(media.id));
}

// "file" stays "not an image", so a video answers both it and its own tab
export type MediaType = "all" | "image" | "video" | "file";

/** One page of media (newest first), filtered by type + a name/URL search. */
export function adminListMediaPage(
	db: DB,
	opts: { limit: number; offset: number; query?: string; type?: MediaType },
) {
	const conds = [eq(media.tenantId, TENANT)];
	if (opts.type === "image") conds.push(like(media.contentType, "image/%"));
	else if (opts.type === "video")
		conds.push(like(media.contentType, "video/%"));
	else if (opts.type === "file") {
		const notImage = or(
			isNull(media.contentType),
			sql`${media.contentType} not like 'image/%'`,
		);
		if (notImage) conds.push(notImage);
	}
	if (opts.query?.trim()) {
		const q = `%${opts.query.trim()}%`;
		const match = or(like(media.url, q), like(media.r2Key, q));
		if (match) conds.push(match);
	}
	return db
		.select()
		.from(media)
		.where(and(...conds))
		.orderBy(desc(media.id))
		.limit(opts.limit)
		.offset(opts.offset);
}

/** Resolve specific media ids → url, type and intrinsic size (e.g. saved cover ids). */
export async function adminMediaByIds(db: DB, ids: number[]) {
	if (!ids.length) return [];
	return db
		.select({
			id: media.id,
			url: media.url,
			contentType: media.contentType,
			width: media.width,
			height: media.height,
		})
		.from(media)
		.where(and(eq(media.tenantId, TENANT), inArray(media.id, ids)));
}

export async function adminMediaById(db: DB, id: number) {
	const [r] = await adminMediaByIds(db, [id]);
	return r ?? null;
}

export type MediaUsage = { kind: string; label: string; href: string | null };

type MediaRef = {
	kind: string;
	table: SQLiteTable;
	column: SQLiteColumn;
	rowId: SQLiteColumn;
	label?: SQLiteColumn;
	tenant?: SQLiteColumn;
	join?: { table: SQLiteTable; on: SQL };
	href?: (rowId: number) => string;
	/** notNull, so it cannot be cleared - the referring row goes instead. */
	clearBy?: "row";
};

// the "Used in" panel and deleteMedia both walk this; media-refs.test.ts fails if the schema grows a reference missing here
export const MEDIA_REFS: MediaRef[] = [
	{
		kind: "Post cover",
		table: posts,
		column: posts.coverMediaId,
		rowId: posts.id,
		label: posts.slug,
		tenant: posts.tenantId,
		href: (r) => `/admin/posts/${r}`,
	},
	{
		kind: "Post gallery",
		table: postMedia,
		column: postMedia.mediaId,
		rowId: postMedia.postId,
		label: posts.slug,
		// post_media has no tenantId of its own; the join carries the scope
		tenant: posts.tenantId,
		join: { table: posts, on: eq(posts.id, postMedia.postId) },
		href: (r) => `/admin/posts/${r}`,
		clearBy: "row",
	},
	{
		kind: "Page hero",
		table: pages,
		column: pages.heroMediaId,
		rowId: pages.id,
		label: pages.slug,
		tenant: pages.tenantId,
		href: (r) => `/admin/pages/${r}`,
	},
	{
		kind: "Navigation card",
		table: navItems,
		column: navItems.imageMediaId,
		rowId: navItems.id,
		label: navItems.targetRef,
		tenant: navItems.tenantId,
		href: () => "/admin/nav",
	},
	{
		kind: "Person photo",
		table: people,
		column: people.photoMediaId,
		rowId: people.id,
		label: people.nameEn,
		tenant: people.tenantId,
		href: (r) => `/admin/people/${r}`,
	},
	{
		kind: "Campaign cover",
		table: campaigns,
		column: campaigns.coverMediaId,
		rowId: campaigns.id,
		label: campaigns.title,
		tenant: campaigns.tenantId,
		href: (r) => `/admin/campaigns/${r}`,
	},
	{
		kind: "Partner logo",
		table: partners,
		column: partners.logoMediaId,
		rowId: partners.id,
		label: partners.name,
		tenant: partners.tenantId,
		href: (r) => `/admin/partners/${r}`,
	},
	{
		kind: "Donor logo",
		table: donors,
		column: donors.logoMediaId,
		rowId: donors.id,
		label: donors.name,
		tenant: donors.tenantId,
		href: (r) => `/admin/donors/${r}`,
	},
	{
		kind: "Project logo",
		table: projects,
		column: projects.logoMediaId,
		rowId: projects.id,
		label: projects.code,
		tenant: projects.tenantId,
		href: (r) => `/admin/projects/${r}`,
	},
	{
		kind: "Project map photo",
		table: projectLocations,
		column: projectLocations.photoMediaId,
		rowId: projectLocations.projectId,
		label: projectLocations.schoolName,
		tenant: projectLocations.tenantId,
		href: (r) => `/admin/projects/${r}`,
	},
	{
		kind: "Office photo",
		table: offices,
		column: offices.imageMediaId,
		rowId: offices.id,
		label: offices.name,
		tenant: offices.tenantId,
		href: (r) => `/admin/offices/${r}`,
	},
	{
		kind: "School photo",
		table: schools,
		column: schools.coverMediaId,
		rowId: schools.id,
		label: schools.name,
		tenant: schools.tenantId,
		href: (r) => `/admin/schools/${r}`,
	},
	{
		kind: "Staff photo",
		table: staff,
		column: staff.photoMediaId,
		rowId: staff.id,
		label: staff.nameEn,
		tenant: staff.tenantId,
	},
	{
		kind: "Homepage hero",
		table: heroSlides,
		column: heroSlides.mediaId,
		rowId: heroSlides.id,
		tenant: heroSlides.tenantId,
	},
];

async function refUsage(
	db: DB,
	ref: MediaRef,
	id: number,
): Promise<MediaUsage[]> {
	const where = ref.tenant
		? and(eq(ref.tenant, TENANT), eq(ref.column, id))
		: eq(ref.column, id);
	let q = db
		.select({ rowId: ref.rowId, label: ref.label ?? sql<string | null>`null` })
		.from(ref.table)
		.$dynamic();
	if (ref.join) q = q.innerJoin(ref.join.table, ref.join.on);

	const seen = new Set<number>();
	const out: MediaUsage[] = [];
	for (const r of await q.where(where)) {
		const rowId = Number(r.rowId);
		if (seen.has(rowId)) continue;
		seen.add(rowId);
		out.push({
			kind: ref.kind,
			label: String(r.label ?? "") || `#${rowId}`,
			href: ref.href?.(rowId) ?? null,
		});
	}
	return out;
}

// not foreign keys: the URL is a substring of someone's content, so a delete cannot clear it
type MediaTextRef = {
	kind: string;
	table: SQLiteTable;
	/** searched for the url */
	column: SQLiteColumn;
	rowId: SQLiteColumn;
	label: SQLiteColumn;
	tenant: SQLiteColumn;
	href: (rowId: number) => string;
};

const MEDIA_TEXT_REFS: MediaTextRef[] = [
	{
		kind: "Page content",
		table: pages,
		column: pages.sections,
		rowId: pages.id,
		label: pages.slug,
		tenant: pages.tenantId,
		href: (r) => `/admin/pages/${r}`,
	},
	{
		kind: "Form content",
		table: forms,
		column: forms.fields,
		rowId: forms.id,
		label: forms.title,
		tenant: forms.tenantId,
		href: (r) => `/admin/forms/${r}`,
	},
];

/** Where a `translations` row's entity lives, for labelling a body-text hit. */
const TRANSLATED_ENTITIES: Record<
	string,
	{
		kind: string;
		table: SQLiteTable;
		id: SQLiteColumn;
		label: SQLiteColumn;
		tenant: SQLiteColumn;
		href: (rowId: number) => string;
	}
> = {
	post: {
		kind: "Post text",
		table: posts,
		id: posts.id,
		label: posts.slug,
		tenant: posts.tenantId,
		href: (r) => `/admin/posts/${r}`,
	},
	page: {
		kind: "Page text",
		table: pages,
		id: pages.id,
		label: pages.slug,
		tenant: pages.tenantId,
		href: (r) => `/admin/pages/${r}`,
	},
	project: {
		kind: "Project text",
		table: projects,
		id: projects.id,
		label: projects.code,
		tenant: projects.tenantId,
		href: (r) => `/admin/projects/${r}`,
	},
	person: {
		kind: "Person text",
		table: people,
		id: people.id,
		label: people.nameEn,
		tenant: people.tenantId,
		href: (r) => `/admin/people/${r}`,
	},
};

// % and _ inside the url are escaped, so a stored name cannot widen the match; it is still a substring test
const contains = (column: SQLiteColumn, url: string) =>
	sql`${column} LIKE ${`%${url.replace(/[\\%_]/g, "\\$&")}%`} ESCAPE '\\'`;

// synchronous because deleteMedia runs it inside its transaction: checking outside leaves a window to embed the image
type Queryable = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

function mediaTextUsage(db: Queryable, url: string): MediaUsage[] {
	const out: MediaUsage[] = [];

	for (const ref of MEDIA_TEXT_REFS) {
		for (const r of db
			.select({ rowId: ref.rowId, label: ref.label })
			.from(ref.table)
			.where(and(eq(ref.tenant, TENANT), contains(ref.column, url)))
			.all()) {
			const rowId = Number(r.rowId);
			out.push({
				kind: ref.kind,
				label: String(r.label ?? "") || `#${rowId}`,
				href: ref.href(rowId),
			});
		}
	}

	// One scan of the whole column rather than a list of translated fields, so a
	// body field added later is covered without being registered anywhere.
	const hits = db
		.select({ type: translations.entityType, entityId: translations.entityId })
		.from(translations)
		.where(
			and(eq(translations.tenantId, TENANT), contains(translations.value, url)),
		)
		.all();

	const seen = new Set<string>();
	for (const hit of hits) {
		const key = `${hit.type}:${hit.entityId}`;
		if (seen.has(key)) continue; // same body in two languages is one place
		seen.add(key);
		const target = TRANSLATED_ENTITIES[hit.type];
		if (!target) {
			out.push({
				kind: "Text",
				label: `${hit.type} #${hit.entityId}`,
				href: null,
			});
			continue;
		}
		const [row] = db
			.select({ label: target.label })
			.from(target.table)
			.where(and(eq(target.tenant, TENANT), eq(target.id, hit.entityId)))
			.limit(1)
			.all();
		if (!row) continue; // translation orphaned by a deleted entity
		out.push({
			kind: target.kind,
			label: String(row.label ?? "") || `#${hit.entityId}`,
			href: target.href(hit.entityId),
		});
	}

	return out;
}

/** Everywhere a media item is referenced — for the "Used in" panel. */
export async function adminMediaUsage(
	db: DB,
	id: number,
): Promise<MediaUsage[]> {
	const out: MediaUsage[] = [];
	for (const ref of MEDIA_REFS) out.push(...(await refUsage(db, ref, id)));
	const row = await adminMediaById(db, id);
	if (row?.url) out.push(...mediaTextUsage(db, row.url));
	return out;
}

// an <img src> inside someone's HTML cannot be cleared without rewriting what they wrote
export class MediaInUseError extends Error {
	constructor(readonly usage: MediaUsage[]) {
		const shown = usage.slice(0, 3).map((u) => `${u.kind}: ${u.label}`);
		const more = usage.length - shown.length;
		super(
			`This file is still in the content of ${usage.length} ${usage.length === 1 ? "place" : "places"} (${shown.join(", ")}${more > 0 ? `, and ${more} more` : ""}). Remove the image there first, then delete the file.`,
		);
		this.name = "MediaInUseError";
	}
}

/** Aggregate counts for the library header (independent of the current page). */
export async function adminMediaStats(db: DB) {
	const [r] = await db
		.select({
			total: sql<number>`count(*)`,
			images: sql<number>`sum(case when ${media.contentType} like 'image/%' then 1 else 0 end)`,
			videos: sql<number>`sum(case when ${media.contentType} like 'video/%' then 1 else 0 end)`,
			bytes: sql<number>`coalesce(sum(${media.size}), 0)`,
		})
		.from(media)
		.where(eq(media.tenantId, TENANT));
	const total = Number(r?.total ?? 0);
	const images = Number(r?.images ?? 0);
	return {
		total,
		images,
		videos: Number(r?.videos ?? 0),
		files: total - images,
		bytes: Number(r?.bytes ?? 0),
	};
}

export async function createMediaRecord(
	db: DB,
	v: {
		r2Key: string;
		url: string;
		contentType?: string;
		size?: number;
		width?: number;
		height?: number;
	},
): Promise<number> {
	const [row] = await db
		.insert(media)
		.values({
			tenantId: TENANT,
			r2Key: v.r2Key,
			url: v.url,
			contentType: v.contentType ?? null,
			size: v.size ?? null,
			width: v.width ?? null,
			height: v.height ?? null,
		})
		.returning({ id: media.id });
	return row.id;
}

export async function deleteMedia(db: DB, id: number): Promise<void> {
	const r2Key = db.transaction((tx) => {
		// prove the row is ours before clearing anything: the clears below cannot
		// be tenant-scoped, so a foreign id would blank another tenant's records
		const [own] = tx
			.select({ r2Key: media.r2Key, url: media.url })
			.from(media)
			.where(and(eq(media.tenantId, TENANT), eq(media.id, id)))
			.limit(1)
			.all();
		if (!own) return null;

		const embedded = own.url ? mediaTextUsage(tx, own.url) : [];
		if (embedded.length) throw new MediaInUseError(embedded);

		for (const ref of MEDIA_REFS) {
			if (ref.clearBy === "row") {
				tx.delete(ref.table).where(eq(ref.column, id)).run();
				continue;
			}
			const key = Object.entries(getTableColumns(ref.table)).find(
				([, c]) => c === ref.column,
			)?.[0];
			if (!key) throw new Error(`Unmapped media reference: ${ref.kind}`);
			tx.update(ref.table)
				.set({ [key]: null })
				.where(eq(ref.column, id))
				.run();
		}
		tx.delete(media)
			.where(and(eq(media.tenantId, TENANT), eq(media.id, id)))
			.run();
		return own.r2Key;
	});
	// after commit: unlinking first would orphan the row if the delete rolled back
	if (r2Key) await deleteUpload(r2Key);
}

/* ---------------- Staff directory ---------------- */

export type StaffInput = {
	staffNo: string;
	nameKm: string;
	nameEn: string;
	sex: string;
	phone: string;
	email: string;
	program: string;
	sort: number;
	photoMediaId?: number | null;
};

export async function adminListStaff(db: DB) {
	const rows = await db
		.select()
		.from(staff)
		.where(eq(staff.tenantId, TENANT))
		.orderBy(asc(staff.sort));
	return attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
}
export async function getStaff(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(staff)
		.where(and(eq(staff.tenantId, TENANT), eq(staff.id, id)))
		.limit(1);
	return r ?? null;
}

export async function createStaff(db: DB, input: StaffInput): Promise<number> {
	const [row] = await db
		.insert(staff)
		.values({ tenantId: TENANT, ...input })
		.returning({ id: staff.id });
	return row.id;
}

export async function updateStaff(
	db: DB,
	id: number,
	input: StaffInput,
): Promise<void> {
	await db
		.update(staff)
		.set(input)
		.where(and(eq(staff.tenantId, TENANT), eq(staff.id, id)));
}

export async function deleteStaff(db: DB, id: number): Promise<void> {
	await db
		.delete(staff)
		.where(and(eq(staff.tenantId, TENANT), eq(staff.id, id)));
}

/* ---------------- Site settings ---------------- */

// installer bookkeeping, not site configuration: the settings grid puts a Delete button on every row
const INTERNAL_SETTINGS = new Set(["install_completed_at"]);

const refuseInternal = (key: string) => {
	if (INTERNAL_SETTINGS.has(key))
		throw new Error(
			`"${key}" is written by the installer, not site configuration, and cannot be changed here.`,
		);
};

export async function adminListSettings(db: DB) {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.tenantId, TENANT));
	return rows.filter((r) => !INTERNAL_SETTINGS.has(r.key));
}
export async function upsertSetting(
	db: DB,
	key: string,
	value: string,
): Promise<void> {
	refuseInternal(key);
	await db
		.insert(siteSettings)
		.values({ tenantId: TENANT, key, value })
		.onConflictDoUpdate({
			target: [siteSettings.tenantId, siteSettings.key],
			set: { value },
		});
}
export async function deleteSetting(db: DB, key: string): Promise<void> {
	refuseInternal(key);
	await db
		.delete(siteSettings)
		.where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, key)));
}

/* ---------------- Partners ---------------- */

export type PartnerInput = {
	name: string;
	category: string;
	url: string;
	sort: number;
	logoMediaId?: number | null;
};
export async function adminListPartners(db: DB) {
	const rows = await db
		.select()
		.from(partners)
		.where(eq(partners.tenantId, TENANT))
		.orderBy(asc(partners.sort));
	return attachMediaUrl(db, rows, "logoMediaId", "logoUrl");
}
export async function getPartner(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(partners)
		.where(and(eq(partners.tenantId, TENANT), eq(partners.id, id)))
		.limit(1);
	return r ?? null;
}
export async function createPartner(db: DB, v: PartnerInput): Promise<number> {
	const [r] = await db
		.insert(partners)
		.values({ tenantId: TENANT, ...v })
		.returning({ id: partners.id });
	return r.id;
}
export async function updatePartner(
	db: DB,
	id: number,
	v: PartnerInput,
): Promise<void> {
	await db
		.update(partners)
		.set(v)
		.where(and(eq(partners.tenantId, TENANT), eq(partners.id, id)));
}
export async function deletePartner(db: DB, id: number): Promise<void> {
	await db
		.delete(partners)
		.where(and(eq(partners.tenantId, TENANT), eq(partners.id, id)));
}

/* ---------------- Offices ---------------- */

export type OfficeInput = {
	name: string;
	province: string;
	address: string;
	phone: string;
	email: string;
	lat: string;
	lng: string;
	isHq: boolean;
	sort: number;
	imageMediaId?: number | null;
};
export async function adminListOffices(db: DB) {
	const rows = await db
		.select()
		.from(offices)
		.where(eq(offices.tenantId, TENANT))
		.orderBy(asc(offices.sort));
	return attachMediaUrl(db, rows, "imageMediaId", "imageUrl");
}
export async function getOffice(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(offices)
		.where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)))
		.limit(1);
	return r ?? null;
}
export async function createOffice(db: DB, v: OfficeInput): Promise<number> {
	const [r] = await db
		.insert(offices)
		.values({ tenantId: TENANT, ...v })
		.returning({ id: offices.id });
	return r.id;
}
export async function updateOffice(
	db: DB,
	id: number,
	v: OfficeInput,
): Promise<void> {
	await db
		.update(offices)
		.set(v)
		.where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)));
}
export async function deleteOffice(db: DB, id: number): Promise<void> {
	await db
		.delete(offices)
		.where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)));
}

/* ---------------- Stats (with translated label) ---------------- */

export type StatInput = {
	value: number;
	sort: number;
	labels: Record<string, string>;
};

export async function adminListStats(db: DB) {
	const rows = await db
		.select()
		.from(stats)
		.where(eq(stats.tenantId, TENANT))
		.orderBy(asc(stats.sort));
	const tr = await db
		.select({
			entityId: translations.entityId,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(eq(translations.entityType, "stat"), eq(translations.field, "label")),
		);
	const byStat = new Map<number, Record<string, string>>();
	for (const r of tr) {
		const m = byStat.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		byStat.set(r.entityId, m);
	}
	return rows.map((r) => ({
		id: r.id,
		value: r.value,
		sort: r.sort,
		labels: byStat.get(r.id) ?? {},
	}));
}

async function setStatLabels(
	db: DB,
	id: number,
	labels: Record<string, string>,
) {
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "stat"), eq(translations.entityId, id)),
		);
	const rows = Object.entries(labels)
		.filter(([, v]) => v !== "")
		.map(([lang, value]) => ({
			tenantId: TENANT,
			entityType: "stat",
			entityId: id,
			field: "label",
			lang,
			value,
		}));
	if (rows.length) await db.insert(translations).values(rows);
}
export async function createStat(db: DB, input: StatInput): Promise<number> {
	const [r] = await db
		.insert(stats)
		.values({ tenantId: TENANT, value: input.value, sort: input.sort })
		.returning({ id: stats.id });
	await setStatLabels(db, r.id, input.labels);
	return r.id;
}
export async function updateStat(
	db: DB,
	id: number,
	input: StatInput,
): Promise<void> {
	await db
		.update(stats)
		.set({ value: input.value, sort: input.sort })
		.where(and(eq(stats.tenantId, TENANT), eq(stats.id, id)));
	await setStatLabels(db, id, input.labels);
}
export async function deleteStat(db: DB, id: number): Promise<void> {
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "stat"), eq(translations.entityId, id)),
		);
	await db
		.delete(stats)
		.where(and(eq(stats.tenantId, TENANT), eq(stats.id, id)));
}

/* ---------------- Hero slides ---------------- */

const HERO_FIELDS = ["kicker", "title", "caption"] as const;
export type HeroInput = {
	mediaId: number | null;
	kind: string;
	videoUrl: string | null;
	sort: number;
	translations: {
		lang: string;
		kicker: string;
		title: string;
		caption: string;
	}[];
};

export async function adminListHero(db: DB) {
	const rows = await db
		.select()
		.from(heroSlides)
		.where(eq(heroSlides.tenantId, TENANT))
		.orderBy(asc(heroSlides.sort));
	const tr = await db
		.select({
			entityId: translations.entityId,
			lang: translations.lang,
			field: translations.field,
			value: translations.value,
		})
		.from(translations)
		.where(eq(translations.entityType, "hero_slide"));
	const g = groupTranslations(tr);
	return rows.map((r) => ({
		id: r.id,
		mediaId: r.mediaId,
		kind: r.kind,
		videoUrl: r.videoUrl,
		sort: r.sort,
		translations: g.get(r.id) ?? {},
	}));
}
function heroRows(input: HeroInput) {
	return input.translations.flatMap((t) =>
		HERO_FIELDS.map((f) => ({
			lang: t.lang,
			field: f,
			value: (t as Record<string, string>)[f] ?? "",
		})),
	);
}
export async function createHero(db: DB, input: HeroInput): Promise<number> {
	const [r] = await db
		.insert(heroSlides)
		.values({
			tenantId: TENANT,
			mediaId: input.mediaId,
			kind: input.kind,
			videoUrl: input.videoUrl,
			sort: input.sort,
		})
		.returning({ id: heroSlides.id });
	await setTranslations(db, "hero_slide", r.id, heroRows(input));
	return r.id;
}
export async function updateHero(
	db: DB,
	id: number,
	input: HeroInput,
): Promise<void> {
	await db
		.update(heroSlides)
		.set({
			mediaId: input.mediaId,
			kind: input.kind,
			videoUrl: input.videoUrl,
			sort: input.sort,
		})
		.where(and(eq(heroSlides.tenantId, TENANT), eq(heroSlides.id, id)));
	await setTranslations(db, "hero_slide", id, heroRows(input));
}
export async function deleteHero(db: DB, id: number): Promise<void> {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "hero_slide"),
				eq(translations.entityId, id),
			),
		);
	await db
		.delete(heroSlides)
		.where(and(eq(heroSlides.tenantId, TENANT), eq(heroSlides.id, id)));
}

/* ---------------- Schools ---------------- */

export type SchoolInput = {
	name: string;
	code: string;
	level: string;
	province: string;
	projectId: number | null;
	coverMediaId: number | null;
	address: string;
	lat: string;
	lng: string;
	sort: number;
};
export function adminListSchools(db: DB) {
	return db
		.select()
		.from(schools)
		.where(eq(schools.tenantId, TENANT))
		.orderBy(asc(schools.sort), asc(schools.name));
}
export async function getSchool(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(schools)
		.where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)))
		.limit(1);
	return r ?? null;
}
export async function createSchool(db: DB, v: SchoolInput): Promise<number> {
	const [r] = await db
		.insert(schools)
		.values({ tenantId: TENANT, ...v })
		.returning({ id: schools.id });
	return r.id;
}
export async function updateSchool(
	db: DB,
	id: number,
	v: SchoolInput,
): Promise<void> {
	await db
		.update(schools)
		.set(v)
		.where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)));
}
export async function deleteSchool(db: DB, id: number): Promise<void> {
	await db
		.delete(schools)
		.where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)));
}

/* ---------------- Donors ---------------- */

export type DonorInput = {
	name: string;
	url: string;
	sort: number;
	logoMediaId?: number | null;
};
export async function adminListDonors(db: DB) {
	const rows = await db
		.select()
		.from(donors)
		.where(eq(donors.tenantId, TENANT))
		.orderBy(asc(donors.sort));
	return attachMediaUrl(db, rows, "logoMediaId", "logoUrl");
}
export async function getDonor(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(donors)
		.where(and(eq(donors.tenantId, TENANT), eq(donors.id, id)))
		.limit(1);
	return r ?? null;
}
export async function createDonor(db: DB, v: DonorInput): Promise<number> {
	const [r] = await db
		.insert(donors)
		.values({ tenantId: TENANT, ...v })
		.returning({ id: donors.id });
	return r.id;
}
export async function updateDonor(
	db: DB,
	id: number,
	v: DonorInput,
): Promise<void> {
	await db
		.update(donors)
		.set(v)
		.where(and(eq(donors.tenantId, TENANT), eq(donors.id, id)));
}
export async function deleteDonor(db: DB, id: number): Promise<void> {
	await db
		.delete(donors)
		.where(and(eq(donors.tenantId, TENANT), eq(donors.id, id)));
}

/* ---------------- Projects (+ donors + locations) ---------------- */

const PROJECT_FIELDS = ["name", "summary", "body"] as const;
export type ProjectLocationInput = {
	schoolName: string;
	lat: string;
	lng: string;
	photoMediaId: number | null;
};
export type ProjectInput = {
	code: string;
	slug: string;
	status: string;
	sort: number;
	startDate: string;
	endDate: string;
	targetAreas: string[];
	snapshots: ProjectSnapshot[];
	translations: { lang: string; name: string; summary: string; body: string }[];
	donorIds: number[];
	locations: ProjectLocationInput[];
};

/** Blank dates are stored as NULL, and blank list entries dropped, so the
 *  public view never renders an empty label. */
function projectColumns(input: ProjectInput) {
	return {
		code: input.code,
		slug: input.slug,
		status: input.status,
		sort: input.sort,
		startDate: input.startDate || null,
		endDate: input.endDate || null,
		targetAreas: input.targetAreas.map((a) => a.trim()).filter(Boolean),
		snapshots: input.snapshots.filter((s) => s.value.trim() && s.label.trim()),
	};
}

export async function adminListProjects(db: DB) {
	const rows = await db
		.select()
		.from(projects)
		.where(eq(projects.tenantId, TENANT))
		.orderBy(asc(projects.sort));
	const tr = await db
		.select({
			entityId: translations.entityId,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "project"),
				eq(translations.field, "name"),
			),
		);
	const names = new Map<number, Record<string, string>>();
	for (const r of tr) {
		const m = names.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		names.set(r.entityId, m);
	}
	return rows.map((r) => {
		const n = names.get(r.id) ?? {};
		return {
			id: r.id,
			code: r.code,
			slug: r.slug,
			parentId: r.parentId,
			status: r.status,
			name: n.en ?? Object.values(n)[0] ?? r.code,
		};
	});
}

export async function getProjectForEdit(db: DB, id: number) {
	const [p] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)))
		.limit(1);
	if (!p) return null;
	const tr = await db
		.select({
			entityId: translations.entityId,
			lang: translations.lang,
			field: translations.field,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "project"),
				eq(translations.entityId, id),
			),
		);
	const byLang: Record<string, Record<string, string>> = {};
	for (const r of tr) {
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}
	const dRows = await db
		.select({ donorId: projectDonors.donorId })
		.from(projectDonors)
		.where(eq(projectDonors.projectId, id));
	const locs = await db
		.select()
		.from(projectLocations)
		.where(eq(projectLocations.projectId, id))
		.orderBy(asc(projectLocations.sort));
	// annotated, not inferred: the editor round-trips this straight back into
	// setProjectRelations, so a column dropped here is a column erased on save
	const locations: ProjectLocationInput[] = locs.map((l) => ({
		schoolName: l.schoolName ?? "",
		lat: l.lat,
		lng: l.lng,
		photoMediaId: l.photoMediaId,
	}));
	return {
		id: p.id,
		code: p.code,
		slug: p.slug,
		status: p.status,
		sort: p.sort,
		startDate: p.startDate ?? "",
		endDate: p.endDate ?? "",
		targetAreas: p.targetAreas ?? [],
		snapshots: p.snapshots ?? [],
		translations: byLang,
		donorIds: dRows.map((d) => d.donorId),
		locations,
	};
}

function projectTrRows(input: ProjectInput) {
	return input.translations.flatMap((t) =>
		PROJECT_FIELDS.map((f) => ({
			lang: t.lang,
			field: f,
			value: (t as Record<string, string>)[f] ?? "",
		})),
	);
}
async function setProjectRelations(db: DB, id: number, input: ProjectInput) {
	await setTranslations(db, "project", id, projectTrRows(input));
	await db.delete(projectDonors).where(eq(projectDonors.projectId, id));
	if (input.donorIds.length)
		await db
			.insert(projectDonors)
			.values(input.donorIds.map((donorId) => ({ projectId: id, donorId })));
	await db.delete(projectLocations).where(eq(projectLocations.projectId, id));
	const locs = input.locations.filter((l) => l.lat && l.lng);
	if (locs.length) {
		// spread, not a column list: what the editor sent is what gets written,
		// so a new pin field cannot be silently dropped on the way in
		await db.insert(projectLocations).values(
			locs.map((l, i) => ({
				tenantId: TENANT,
				projectId: id,
				sort: i,
				...l,
			})),
		);
	}
}
export async function createProject(
	db: DB,
	input: ProjectInput,
): Promise<number> {
	await requireFreeSlug(db, "project", input.slug);
	const [p] = await db
		.insert(projects)
		.values({ tenantId: TENANT, ...projectColumns(input) })
		.returning({ id: projects.id });
	await setProjectRelations(db, p.id, input);
	return p.id;
}
export async function updateProject(
	db: DB,
	id: number,
	input: ProjectInput,
): Promise<void> {
	await requireFreeSlug(db, "project", input.slug, id);
	await db
		.update(projects)
		.set(projectColumns(input))
		.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)));
	await setProjectRelations(db, id, input);
}
export async function deleteProject(db: DB, id: number): Promise<void> {
	// a school still pointing here makes the last delete fail: without the
	// transaction the first three have already gutted the project it refused
	db.transaction((tx) => {
		tx.delete(translations)
			.where(
				and(
					eq(translations.entityType, "project"),
					eq(translations.entityId, id),
				),
			)
			.run();
		tx.delete(projectDonors).where(eq(projectDonors.projectId, id)).run();
		tx.delete(projectLocations).where(eq(projectLocations.projectId, id)).run();
		tx.delete(projects)
			.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)))
			.run();
	});
}

/* ---------------- Terms (managed reference data) ---------------- */

export type TermInput = {
	taxonomy: string;
	key: string;
	label: string;
	sort: number;
};

export function adminListTerms(db: DB) {
	return db
		.select()
		.from(terms)
		.where(eq(terms.tenantId, TENANT))
		.orderBy(asc(terms.taxonomy), asc(terms.sort));
}

export async function createTerm(db: DB, input: TermInput): Promise<number> {
	const [row] = await db
		.insert(terms)
		.values({ tenantId: TENANT, ...input })
		.returning({ id: terms.id });
	return row.id;
}

export async function updateTerm(
	db: DB,
	id: number,
	input: TermInput,
): Promise<void> {
	await db
		.update(terms)
		.set(input)
		.where(and(eq(terms.tenantId, TENANT), eq(terms.id, id)));
}

// a term key is stored as text, so nothing in the schema stops the row going and leaving a dangling key
const TERM_HOLDERS: Record<
	string,
	{ noun: string; count: (db: DB, key: string) => Promise<number> }[]
> = {
	location: [
		{
			noun: "office",
			count: (db, key) => countTermUse(db, offices, eq(offices.province, key)),
		},
		{
			noun: "school",
			count: (db, key) => countTermUse(db, schools, eq(schools.province, key)),
		},
		{
			noun: "project",
			count: async (db, key) => {
				const rows = await db
					.select({ areas: projects.targetAreas })
					.from(projects)
					.where(eq(projects.tenantId, TENANT));
				return rows.filter((r) => r.areas.includes(key)).length;
			},
		},
	],
	partner_category: [
		{
			noun: "partner",
			count: (db, key) =>
				countTermUse(db, partners, eq(partners.category, key)),
		},
	],
	publication_category: [
		{ noun: "publication", count: (db, key) => countPostCategory(db, key) },
	],
	doc_category: [
		{ noun: "document", count: (db, key) => countPostCategory(db, key) },
	],
};

async function countTermUse(
	db: DB,
	table: typeof offices | typeof schools | typeof partners,
	where: SQL,
): Promise<number> {
	const [row] = await db
		.select({ n: count() })
		.from(table)
		.where(and(eq(table.tenantId, TENANT), where));
	return row?.n ?? 0;
}

// the key lives in a post's meta JSON, not in a column of its own
const countPostCategory = async (db: DB, key: string): Promise<number> => {
	const [row] = await db
		.select({ n: count() })
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				sql`json_extract(${posts.meta}, '$.category') = ${key}`,
			),
		);
	return row?.n ?? 0;
};

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export async function deleteTerm(db: DB, id: number): Promise<void> {
	const [term] = await db
		.select()
		.from(terms)
		.where(and(eq(terms.tenantId, TENANT), eq(terms.id, id)))
		.limit(1);
	if (!term) return;

	const held: string[] = [];
	for (const holder of TERM_HOLDERS[term.taxonomy] ?? []) {
		const n = await holder.count(db, term.key);
		if (n > 0) held.push(plural(n, holder.noun));
	}
	if (held.length)
		throw new Error(
			`"${term.label}" is still used by ${held.join(" and ")}. Move them to another term first, then delete this one.`,
		);

	await db
		.delete(terms)
		.where(and(eq(terms.tenantId, TENANT), eq(terms.id, id)));
}

/* ---------------- Languages ---------------- */

export type LanguageInput = {
	code: string;
	name: string;
	nativeName: string;
	enabled: boolean;
	isDefault: boolean;
	rtl: boolean;
	sort: number;
};

export function listAllLanguages(db: DB) {
	return db.select().from(languages).orderBy(asc(languages.sort));
}

async function ensureSingleDefault(db: DB, code: string) {
	await db
		.update(languages)
		.set({ isDefault: false })
		.where(ne(languages.code, code));
}

export async function createLanguage(
	db: DB,
	input: LanguageInput,
): Promise<void> {
	await db.insert(languages).values(input);
	if (input.isDefault) await ensureSingleDefault(db, input.code);
}

export async function updateLanguage(
	db: DB,
	code: string,
	input: Omit<LanguageInput, "code">,
): Promise<void> {
	await db.update(languages).set(input).where(eq(languages.code, code));
	if (input.isDefault) await ensureSingleDefault(db, code);
}

export async function deleteLanguage(db: DB, code: string): Promise<void> {
	db.transaction((tx) => {
		tx.delete(translations).where(eq(translations.lang, code)).run();
		tx.delete(uiStrings).where(eq(uiStrings.lang, code)).run();
		tx.delete(languages).where(eq(languages.code, code)).run();
	});
}

/* ---------------- (nav move, below) ---------------- */

/** Swap an item's sort with its previous/next sibling. */
export async function moveNavItem(
	db: DB,
	id: number,
	dir: "up" | "down",
): Promise<void> {
	const all = await db
		.select()
		.from(navItems)
		.where(eq(navItems.tenantId, TENANT));
	const item = all.find((i) => i.id === id);
	if (!item) return;
	const siblings = all
		.filter((i) => i.parentId === item.parentId)
		.sort((a, b) => a.sort - b.sort);
	const idx = siblings.findIndex((i) => i.id === id);
	const swapWith = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
	if (!swapWith) return;
	await db
		.update(navItems)
		.set({ sort: swapWith.sort })
		.where(eq(navItems.id, item.id));
	await db
		.update(navItems)
		.set({ sort: item.sort })
		.where(eq(navItems.id, swapWith.id));
}
