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

import { DONATE_OPEN, DONATE_PAYMENTS } from "#/lib/donate-defaults";
import { DEFAULT_LANG } from "#/lib/i18n-config";
import { RICH_TEXT, TRANSLATED_FIELDS } from "#/lib/record-fields";
import {
	checkImageValue,
	choiceField,
	imageField,
	isColourField,
	type SectionField,
	type SectionNode,
	sectionDef,
	translatableFields,
} from "#/lib/sections";
import { checkThemeValue } from "#/lib/site-theme";
import { PAGE_TITLE_MAX, segmentProblem } from "#/lib/slug";
import type { DB, Tx } from "../db";
import {
	alumniRegistrations,
	contactSubmissions,
	contentTypes,
	donors,
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
	stats,
	terms,
	translations,
	uiStrings,
	visitorDaily,
} from "../schema";
import { deleteUpload } from "../storage";
import {
	deleteEntityText,
	type EntityText,
	forgetDefaultLang,
	getDefaultLang,
	readEntityText,
	requireDefaultText,
	resolveOne,
	resolveTranslations,
	textByLang,
	writeEntityText,
} from "./i18n";
import { containsText } from "./like";
import { MEDIA_REFS } from "./media-refs";
import { MediaInUseError, mediaTextUsage, mediaUsedBy } from "./media-usage";
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
		downloads: number;
	}[];
	totalViews: number;
	totalReads: number;
	totalDownloads: number;
};

/**
 * What the public actually reads: pages by view, documents by how often the
 * reader was opened on the file and how often it was saved. Every counter is
 * write-on-read and unfiltered, so a crawler counts as a reader.
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
		.map((r) => {
			const m = r.meta as Record<string, unknown> | null;
			return {
				...r,
				reads: Number(m?.readCount ?? 0),
				downloads: Number(m?.downloadCount ?? 0),
			};
		})
		.filter((r) => r.reads + r.downloads > 0)
		.sort((a, b) => b.reads + b.downloads - (a.reads + a.downloads));
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
			downloads: r.downloads,
		})),
		totalViews: views.reduce((sum, v) => sum + v.count, 0),
		totalReads: read.reduce((sum, r) => sum + r.reads, 0),
		totalDownloads: read.reduce((sum, r) => sum + r.downloads, 0),
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
const POST_FIELDS = TRANSLATED_FIELDS.post;

type PostTranslation = {
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
		const meta = (r.meta ?? {}) as Record<string, unknown>;
		return {
			id: r.id,
			slug: r.slug,
			contentType: r.contentType,
			status: r.status,
			publishedAt: r.publishedAt,
			deadline: typeof meta.deadline === "string" ? meta.deadline : "",
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

const PAGE_FIELDS = TRANSLATED_FIELDS.page;
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

// pure, so the walk is planned before a transaction opens and the transaction holds no reads
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
async function applyMoves(tx: Tx, moves: SlugMove[]): Promise<void> {
	for (const m of moves) {
		await tx.update(pages).set({ slug: m.slug }).where(eq(pages.id, m.id));
		await tx
			.insert(slugRedirects)
			.values({
				tenantId: TENANT,
				entityType: "page",
				fromSlug: m.from,
				toEntityId: m.id,
			})
			.onConflictDoNothing();
	}
}

async function recomputeSubtree(
	db: DB,
	rootId: number,
	newSlug: string,
): Promise<void> {
	const moves = subtreeMoves(await allPages(db), rootId, newSlug);
	await db.transaction((tx) => applyMoves(tx, moves));
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
const CARD_IMAGE_FIELDS = ["image"];

const textItemFields = (container: SectionField): string[] =>
	container.kind === "cards"
		? CARD_TEXT_FIELDS
		: (container.itemFields ?? [])
				.filter((f) => TEXT_KINDS.has(f.kind))
				.map((f) => f.key);

const imageItemFields = (container: SectionField): string[] =>
	container.kind === "cards"
		? CARD_IMAGE_FIELDS
		: (container.itemFields ?? [])
				.filter((f) => f.kind === "image")
				.map((f) => f.key);

/** One value for every language: written beside the props, never into the overlay. */
function setShared(
	props: Record<string, unknown>,
	field: string,
	value: string,
): Record<string, unknown> {
	const next = { ...props };
	if (value) next[field] = value;
	else delete next[field];
	return next;
}

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

/** A rich field renders through `renderBody`, which shows nothing for a value that is not a document. */
function requireRichDoc(value: string): void {
	if (!value) return;
	let doc: unknown = null;
	try {
		doc = JSON.parse(value);
	} catch {}
	if ((doc as { type?: unknown } | null)?.type !== "doc")
		throw new Error(
			"Rich text arrives as a document from the editor, and this value is not one. Nothing was saved.",
		);
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
		return setShared(props, target.field, value);
	}
	if (imageField(node.type ?? "", target.field)) {
		const why = checkImageValue(value);
		if (why) throw new Error(why);
		return setShared(props, target.field, value);
	}
	const choice = choiceField(node.type ?? "", target.field);
	if (choice) {
		const allowed = (choice.options ?? []).map((o) => o.value);
		if (!allowed.includes(value))
			throw new Error(
				`"${value}" is not one of the values "${target.field}" takes on a ${node.type} section. It takes ${allowed.map((v) => v || "(empty)").join(", ")}.`,
			);
		return setShared(props, target.field, value);
	}
	const fields = translatableFields(node.type ?? "", props);
	const field = fields.find((f) => f.key === target.field);
	if (!field)
		throw new Error(
			`"${target.field}" is not translatable text on a ${node.type} section. It offers ${fields.map((f) => f.key).join(", ") || "none"}.`,
		);
	if (field.kind === "richtext") requireRichDoc(value);
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
	const image = imageItemFields(container).includes(target.field);
	if (image) {
		const why = checkImageValue(value);
		if (why) throw new Error(why);
	} else {
		const offered = textItemFields(container);
		if (!offered.includes(target.field))
			throw new Error(
				`"${target.field}" is not translatable text on a ${target.key} item. It offers ${offered.join(", ") || "none"}.`,
			);
	}
	const shared = Array.isArray(props[target.key])
		? (props[target.key] as Record<string, unknown>[])
		: [];
	// the overlay replaces the whole key, so a translated repeater is a full copy of the array
	const overlay = (props.i18n as Record<string, Record<string, unknown>>)?.[
		lang
	]?.[target.key];
	// an image is one file for every language, so it is written to the shared array
	const base =
		image || lang === DEFAULT_LANG || !Array.isArray(overlay)
			? shared
			: (overlay as Record<string, unknown>[]);
	if (target.index >= base.length)
		throw new Error(
			`Item ${target.index} is past the end of "${target.key}", which has ${base.length}.`,
		);
	const items = base.map((it, n) => {
		if (n !== target.index) return { ...it };
		const next = { ...it };
		if (value === "" && (image || lang !== DEFAULT_LANG))
			delete next[target.field];
		else next[target.field] = value;
		return next;
	});
	if (image || lang === DEFAULT_LANG) return { ...props, [target.key]: items };
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
	const offered = TRANSLATED_FIELDS[input.entity] ?? [];
	if (!offered.includes(field))
		throw new Error(
			`"${field}" is not a translated field of a ${input.entity}. It has ${offered.join(", ")}.`,
		);
	if (RICH_TEXT.has(field)) requireRichDoc(value);
	if (
		input.entity === "page" &&
		field === "title" &&
		value.length > PAGE_TITLE_MAX
	)
		throw new Error(
			`A page title is at most ${PAGE_TITLE_MAX} characters; this one is ${value.length}.`,
		);
	if (
		input.entity === "person" &&
		field === "name" &&
		!value &&
		input.lang === (await getDefaultLang(db))
	)
		throw new Error(
			"A person needs a name in the default language; every list and link uses it.",
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
	return target.kind === "field"
		? writeTranslationField(db, input, target.field, value)
		: writeSectionField(db, input, target, value);
}

/**
 * The stored source of one rich field in `lang`, for an editor opened on the page,
 * whose payload carries only the rendered html. Falls back to the default language.
 */
export async function getRichFieldSource(
	db: DB,
	input: { entity: string; entityId: number; lang: string; field: string },
): Promise<{ value: string; fellBack: boolean }> {
	if (
		!RICH_TEXT.has(input.field) ||
		!(TRANSLATED_FIELDS[input.entity] ?? []).includes(input.field)
	)
		throw new Error(`"${input.field}" is not rich text on a ${input.entity}.`);
	const defaultLang = await getDefaultLang(db);
	const rows = await db
		.select({ lang: translations.lang, value: translations.value })
		.from(translations)
		.where(
			and(
				eq(translations.entityType, input.entity),
				eq(translations.entityId, input.entityId),
				eq(translations.field, input.field),
				inArray(translations.lang, [input.lang, defaultLang]),
			),
		);
	const own = rows.find((r) => r.lang === input.lang)?.value;
	if (own) return { value: own, fellBack: false };
	const fallback = rows.find((r) => r.lang === defaultLang)?.value ?? "";
	return {
		value: fallback,
		fellBack: input.lang !== defaultLang && !!fallback,
	};
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

	await db.transaction(async (tx) => {
		for (const k of kids)
			await tx
				.update(pages)
				.set({ parentId: newParentId })
				.where(eq(pages.id, k.id));
		await applyMoves(tx, moves);
		await tx
			.delete(translations)
			.where(
				and(eq(translations.entityType, "page"), eq(translations.entityId, id)),
			);
		await tx
			.delete(pages)
			.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)));
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

/** An upload from before names were kept has none, so the record using it names it. */
async function withUsedBy<
	T extends { id: number; url: string | null; originalName: string | null },
>(db: DB, rows: T[]): Promise<(T & { usedBy: string | null })[]> {
	const unnamed = rows.filter((r) => !r.originalName?.trim());
	const labels = await mediaUsedBy(db, unnamed);
	return rows.map((r) => ({ ...r, usedBy: labels.get(r.id) ?? null }));
}

/** One page of media (newest first), filtered by type + a name/URL search. */
export async function adminListMediaPage(
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
	const term = opts.query?.trim();
	if (term) {
		const match = or(
			containsText(media.originalName, term),
			containsText(media.url, term),
			containsText(media.r2Key, term),
		);
		if (match) conds.push(match);
	}
	const rows = await db
		.select()
		.from(media)
		.where(and(...conds))
		.orderBy(desc(media.id))
		.limit(opts.limit)
		.offset(opts.offset);
	return withUsedBy(db, rows);
}

const MEDIA_CARD = {
	id: media.id,
	url: media.url,
	r2Key: media.r2Key,
	originalName: media.originalName,
	contentType: media.contentType,
	width: media.width,
	height: media.height,
};

/**
 * Resolve specific media ids → name, url, type and intrinsic size. No `usedBy`:
 * its callers draw thumbnails from a list of saved ids and never read a label.
 */
export async function adminMediaByIds(db: DB, ids: number[]) {
	if (!ids.length) return [];
	return db
		.select(MEDIA_CARD)
		.from(media)
		.where(and(eq(media.tenantId, TENANT), inArray(media.id, ids)));
}

/** One file for a picker, which does show the name under the thumbnail. */
export async function adminMediaById(db: DB, id: number) {
	const rows = await db
		.select(MEDIA_CARD)
		.from(media)
		.where(and(eq(media.tenantId, TENANT), eq(media.id, id)))
		.limit(1);
	const [r] = await withUsedBy(db, rows);
	return r ?? null;
}

/** A url-mode picker stores the address, not the id, so it looks up by address. */
export async function adminMediaByUrl(db: DB, url: string) {
	const rows = await db
		.select(MEDIA_CARD)
		.from(media)
		.where(and(eq(media.tenantId, TENANT), eq(media.url, url)))
		.limit(1);
	const [r] = await withUsedBy(db, rows);
	return r ?? null;
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
		originalName?: string | null;
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
			originalName: v.originalName ?? null,
			contentType: v.contentType ?? null,
			size: v.size ?? null,
			width: v.width ?? null,
			height: v.height ?? null,
		})
		.returning({ id: media.id });
	return row.id;
}

export async function deleteMedia(db: DB, id: number): Promise<void> {
	const r2Key = await db.transaction(async (tx) => {
		// prove the row is ours before clearing anything: the clears below cannot
		// be tenant-scoped, so a foreign id would blank another tenant's records
		const [own] = await tx
			.select({ r2Key: media.r2Key, url: media.url })
			.from(media)
			.where(and(eq(media.tenantId, TENANT), eq(media.id, id)))
			.limit(1);
		if (!own) return null;

		const embedded = own.url ? await mediaTextUsage(tx, own.url) : [];
		if (embedded.length) throw new MediaInUseError(embedded);

		for (const ref of MEDIA_REFS) {
			if (ref.clearBy === "row") {
				await tx.delete(ref.table).where(eq(ref.column, id));
				continue;
			}
			const key = Object.entries(getTableColumns(ref.table)).find(
				([, c]) => c === ref.column,
			)?.[0];
			if (!key) throw new Error(`Unmapped media reference: ${ref.kind}`);
			await tx
				.update(ref.table)
				.set({ [key]: null })
				.where(eq(ref.column, id));
		}
		await tx
			.delete(media)
			.where(and(eq(media.tenantId, TENANT), eq(media.id, id)));
		return own.r2Key;
	});
	// after commit: unlinking first would orphan the row if the delete rolled back
	if (r2Key) await deleteUpload(r2Key);
}

/* ---------------- Staff directory ---------------- */

/* ---------------- Site settings ---------------- */

// installer bookkeeping and derived flags, not site configuration: the settings
// grid puts a Delete button on every row, and a hand-written copy of a derived
// key would be overwritten on every read anyway
const INTERNAL_SETTINGS = new Set([
	"install_completed_at",
	DONATE_OPEN,
	DONATE_PAYMENTS,
]);

const refuseInternal = (key: string) => {
	if (INTERNAL_SETTINGS.has(key))
		throw new Error(
			`"${key}" is set by the product, not site configuration, and cannot be changed here.`,
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

/** Office text that lives in `translations`, not in a column of `offices`. */
const OFFICE_TEXT_FIELDS = ["name", "address"] as const;
type OfficeText = EntityText<(typeof OFFICE_TEXT_FIELDS)[number]>;

export type OfficeInput = {
	province: string;
	phone: string;
	email: string;
	lat: string;
	lng: string;
	isHq: boolean;
	sort: number;
	imageMediaId?: number | null;
	translations: OfficeText[];
};

/** Every office, with each language of its name and address for the list search. */
export async function adminListOffices(db: DB) {
	const rows = await db
		.select()
		.from(offices)
		.where(eq(offices.tenantId, TENANT))
		.orderBy(asc(offices.sort));
	const withUrl = await attachMediaUrl(db, rows, "imageMediaId", "imageUrl");
	const { textOf } = await readEntityText(
		db,
		"office",
		rows.map((r) => r.id),
	);
	return withUrl.map((r) => {
		const { text, byLang } = textOf(r.id);
		return {
			...r,
			name: text.name ?? "",
			address: text.address ?? "",
			translations: byLang,
		};
	});
}
export async function getOffice(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(offices)
		.where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)))
		.limit(1);
	if (!r) return null;
	return {
		...r,
		translations: (await textByLang(db, "office", [id])).get(id) ?? {},
	};
}
export async function createOffice(db: DB, v: OfficeInput): Promise<number> {
	const { translations: text, ...cols } = v;
	await requireDefaultText(db, text, "office");
	const [r] = await db
		.insert(offices)
		.values({ tenantId: TENANT, ...cols })
		.returning({ id: offices.id });
	await writeEntityText(db, "office", r.id, OFFICE_TEXT_FIELDS, text);
	return r.id;
}
export async function updateOffice(
	db: DB,
	id: number,
	v: OfficeInput,
): Promise<void> {
	const { translations: text, ...cols } = v;
	await requireDefaultText(db, text, "office");
	await db
		.update(offices)
		.set(cols)
		.where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)));
	await writeEntityText(db, "office", id, OFFICE_TEXT_FIELDS, text);
}
export async function deleteOffice(db: DB, id: number): Promise<void> {
	await deleteEntityText(db, "office", id);
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
	await deleteEntityText(db, "hero_slide", id);
	await db
		.delete(heroSlides)
		.where(and(eq(heroSlides.tenantId, TENANT), eq(heroSlides.id, id)));
}

/* ---------------- Schools ---------------- */

/** School text that lives in `translations`, not in a column of `schools`. */
const SCHOOL_TEXT_FIELDS = ["name", "address"] as const;
type SchoolText = EntityText<(typeof SCHOOL_TEXT_FIELDS)[number]>;

export type SchoolInput = {
	code: string;
	level: string;
	province: string;
	projectId: number | null;
	coverMediaId: number | null;
	lat: string;
	lng: string;
	sort: number;
	translations: SchoolText[];
};
/** Ordered by `sort`, ties broken on the default-language name — the order `reorderSchools` renumbers. */
export async function adminListSchools(db: DB) {
	const rows = await db
		.select()
		.from(schools)
		.where(eq(schools.tenantId, TENANT));
	const { textOf } = await readEntityText(
		db,
		"school",
		rows.map((r) => r.id),
	);
	return rows
		.map((r) => {
			const { text, byLang } = textOf(r.id);
			return {
				...r,
				name: text.name ?? "",
				address: text.address ?? "",
				translations: byLang,
			};
		})
		.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}
export async function getSchool(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(schools)
		.where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)))
		.limit(1);
	if (!r) return null;
	return {
		...r,
		translations: (await textByLang(db, "school", [id])).get(id) ?? {},
	};
}
export async function createSchool(db: DB, v: SchoolInput): Promise<number> {
	const { translations: text, ...cols } = v;
	await requireDefaultText(db, text, "school");
	const [r] = await db
		.insert(schools)
		.values({ tenantId: TENANT, ...cols })
		.returning({ id: schools.id });
	await writeEntityText(db, "school", r.id, SCHOOL_TEXT_FIELDS, text);
	return r.id;
}
export async function updateSchool(
	db: DB,
	id: number,
	v: SchoolInput,
): Promise<void> {
	const { translations: text, ...cols } = v;
	await requireDefaultText(db, text, "school");
	await db
		.update(schools)
		.set(cols)
		.where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)));
	await writeEntityText(db, "school", id, SCHOOL_TEXT_FIELDS, text);
}
export async function deleteSchool(db: DB, id: number): Promise<void> {
	await deleteEntityText(db, "school", id);
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
type ProjectLocationInput = {
	schoolName: string;
	lat: string;
	lng: string;
	photoMediaId: number | null;
};
export type ProjectInput = {
	code: string;
	slug: string;
	parentId: number | null;
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
		parentId: input.parentId,
		status: input.status,
		sort: input.sort,
		startDate: input.startDate || null,
		endDate: input.endDate || null,
		targetAreas: input.targetAreas.map((a) => a.trim()).filter(Boolean),
		snapshots: input.snapshots.filter((s) => s.value.trim() && s.label.trim()),
	};
}

/** URLs nest one level (`/projects/<parent>/<slug>`), so a parent cannot itself be a child. */
async function requireValidProjectParent(
	db: DB,
	parentId: number | null,
	id?: number,
): Promise<void> {
	if (parentId == null) return;
	if (parentId === id)
		throw new Error("A project cannot be its own parent project.");
	const [parent] = await db
		.select({ id: projects.id, parentId: projects.parentId })
		.from(projects)
		.where(and(eq(projects.tenantId, TENANT), eq(projects.id, parentId)))
		.limit(1);
	if (!parent) throw new Error("That parent project no longer exists.");
	if (parent.parentId != null)
		throw new Error(
			"That project is already a sub-project. Projects nest one level deep.",
		);
	if (id != null) {
		const [child] = await db
			.select({ id: projects.id })
			.from(projects)
			.where(and(eq(projects.tenantId, TENANT), eq(projects.parentId, id)))
			.limit(1);
		if (child)
			throw new Error(
				"This project has sub-projects of its own, so it cannot become one.",
			);
	}
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
		parentId: p.parentId,
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
	requireValidSegment(input.slug); // a slash reads as parent/child and 404s
	await requireFreeSlug(db, "project", input.slug);
	await requireValidProjectParent(db, input.parentId);
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
	requireValidSegment(input.slug);
	await requireFreeSlug(db, "project", input.slug, id);
	await requireValidProjectParent(db, input.parentId, id);
	await db
		.update(projects)
		.set(projectColumns(input))
		.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)));
	await setProjectRelations(db, id, input);
}
export async function deleteProject(db: DB, id: number): Promise<void> {
	// a school still pointing here makes the last delete fail: without the
	// transaction the first three have already gutted the project it refused
	await db.batch([
		db
			.delete(translations)
			.where(
				and(
					eq(translations.entityType, "project"),
					eq(translations.entityId, id),
				),
			),
		db.delete(projectDonors).where(eq(projectDonors.projectId, id)),
		db.delete(projectLocations).where(eq(projectLocations.projectId, id)),
		db
			.delete(projects)
			.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id))),
	]);
}

/* ---------------- Terms (managed reference data) ---------------- */

export type TermInput = {
	taxonomy: string;
	key: string;
	sort: number;
	labels: Record<string, string>;
};

const termText = (labels: Record<string, string>) =>
	Object.entries(labels).map(([lang, label]) => ({ lang, label }));

/** Every term with every language of its label; the list edits them side by side. */
export async function adminListTerms(db: DB) {
	const rows = await db
		.select({
			id: terms.id,
			taxonomy: terms.taxonomy,
			key: terms.key,
			sort: terms.sort,
		})
		.from(terms)
		.where(eq(terms.tenantId, TENANT))
		.orderBy(asc(terms.taxonomy), asc(terms.sort));
	const text = await textByLang(
		db,
		"term",
		rows.map((r) => r.id),
	);
	return rows.map((r) => {
		const labels: Record<string, string> = {};
		for (const [lang, fields] of Object.entries(text.get(r.id) ?? {}))
			if (fields.label) labels[lang] = fields.label;
		return { ...r, labels };
	});
}

export async function createTerm(db: DB, input: TermInput): Promise<number> {
	const { labels, ...cols } = input;
	const [row] = await db
		.insert(terms)
		.values({ tenantId: TENANT, ...cols })
		.returning({ id: terms.id });
	await writeEntityText(db, "term", row.id, ["label"], termText(labels));
	return row.id;
}

export async function updateTerm(
	db: DB,
	id: number,
	input: TermInput,
): Promise<void> {
	const { labels, ...cols } = input;
	await db
		.update(terms)
		.set(cols)
		.where(and(eq(terms.tenantId, TENANT), eq(terms.id, id)));
	await writeEntityText(db, "term", id, ["label"], termText(labels));
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
	if (held.length) {
		const label =
			(await resolveOne(db, "term", id, await getDefaultLang(db))).label ||
			term.key;
		throw new Error(
			`"${label}" is still used by ${held.join(" and ")}. Move them to another term first, then delete this one.`,
		);
	}

	await deleteEntityText(db, "term", id);
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
	forgetDefaultLang(db);
}

// every record is named by its default-language row, so the default is handed on, never dropped
async function refuseUnlessAnotherDefault(db: DB, code: string, doing: string) {
	if ((await getDefaultLang(db)) !== code) return;
	throw new Error(
		`${code} is the default language, which every list and link names records by. Make another language the default before ${doing} it.`,
	);
}

export async function updateLanguage(
	db: DB,
	code: string,
	input: Omit<LanguageInput, "code">,
): Promise<void> {
	if (!input.isDefault)
		await refuseUnlessAnotherDefault(db, code, "un-defaulting");
	await db.update(languages).set(input).where(eq(languages.code, code));
	if (input.isDefault) await ensureSingleDefault(db, code);
	forgetDefaultLang(db);
}

export async function deleteLanguage(db: DB, code: string): Promise<void> {
	await refuseUnlessAnotherDefault(db, code, "deleting");
	await db.batch([
		db.delete(translations).where(eq(translations.lang, code)),
		db.delete(uiStrings).where(eq(uiStrings.lang, code)),
		db.delete(languages).where(eq(languages.code, code)),
	]);
	forgetDefaultLang(db);
}
