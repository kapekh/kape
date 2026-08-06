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

import type { SectionNode } from "#/lib/sections";
import type { DB } from "../db";
import {
	alumniRegistrations,
	campaigns,
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

/**
 * The unique index on (tenantId, slug) otherwise surfaces to the editor as
 * "UNIQUE constraint failed: posts.tenant_id, posts.slug".
 */
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
};

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

/**
 * Recompute slugs for a subtree after a node's slug changed (rename or reparent),
 * recording a 301 redirect for every page whose URL moved. `newSlug` is the node's
 * freshly-computed path.
 */
async function recomputeSubtree(
	db: DB,
	rootId: number,
	newSlug: string,
): Promise<void> {
	const all = await db
		.select({
			id: pages.id,
			parentId: pages.parentId,
			segment: pages.segment,
			slug: pages.slug,
		})
		.from(pages)
		.where(eq(pages.tenantId, TENANT));
	const childrenOf = new Map<number, typeof all>();
	for (const p of all) {
		if (p.parentId == null) continue;
		(
			childrenOf.get(p.parentId) ??
			childrenOf.set(p.parentId, []).get(p.parentId)!
		).push(p);
	}
	const walk = async (id: number, slug: string, oldSlug: string) => {
		if (slug !== oldSlug) {
			await db.update(pages).set({ slug }).where(eq(pages.id, id));
			await db
				.insert(slugRedirects)
				.values({
					tenantId: TENANT,
					entityType: "page",
					fromSlug: oldSlug,
					toEntityId: id,
				})
				.onConflictDoNothing();
		}
		for (const c of childrenOf.get(id) ?? [])
			await walk(c.id, `${slug}/${c.segment}`, c.slug);
	};
	const root = all.find((p) => p.id === rootId);
	await walk(rootId, newSlug, root?.slug ?? newSlug);
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

export async function createPage(db: DB, input: PageInput): Promise<number> {
	const segment = (input.segment || input.slug).replace(/^\/+|\/+$/g, "");
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
): Promise<void> {
	const [prev] = await db
		.select({ slug: pages.slug, parentId: pages.parentId })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
		.limit(1);
	const segment = (input.segment || input.slug).replace(/^\/+|\/+$/g, "");
	// Guard against reparenting under self/descendant (would orphan the subtree).
	const parentId = (await isDescendant(db, input.parentId, id))
		? (prev?.parentId ?? null)
		: input.parentId;
	const newSlug = await slugFor(db, parentId, segment);
	await requireFreeSlug(db, "page", newSlug, id);
	const reorder =
		parentId !== (prev?.parentId ?? null)
			? await nextSortOrder(db, parentId)
			: undefined;
	await db
		.update(pages)
		.set({
			segment,
			parentId,
			status: input.status,
			heroMediaId: input.coverMediaId,
			sections: input.sections,
			...(reorder != null ? { sortOrder: reorder } : {}),
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)));
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
	// Reparent children up to the deleted node's parent so the subtree isn't orphaned,
	// recomputing their slugs (with 301s) under the new parent.
	const [self] = await db
		.select({ parentId: pages.parentId, slug: pages.slug })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
		.limit(1);
	if (self) {
		const kids = await db
			.select({ id: pages.id, segment: pages.segment })
			.from(pages)
			.where(and(eq(pages.tenantId, TENANT), eq(pages.parentId, id)));
		for (const k of kids) {
			await db
				.update(pages)
				.set({ parentId: self.parentId })
				.where(eq(pages.id, k.id));
			await recomputeSubtree(
				db,
				k.id,
				await slugFor(db, self.parentId, k.segment ?? ""),
			);
		}
	}
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "page"), eq(translations.entityId, id)),
		);
	await db
		.delete(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)));
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

export type MediaType = "all" | "image" | "file";

/** One page of media (newest first), filtered by type + a name/URL search. */
export function adminListMediaPage(
	db: DB,
	opts: { limit: number; offset: number; query?: string; type?: MediaType },
) {
	const conds = [eq(media.tenantId, TENANT)];
	if (opts.type === "image") conds.push(like(media.contentType, "image/%"));
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

/** Resolve specific media ids → {id, url, contentType} (e.g. saved cover ids). */
export async function adminMediaByIds(db: DB, ids: number[]) {
	if (!ids.length) return [];
	return db
		.select({ id: media.id, url: media.url, contentType: media.contentType })
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

/**
 * Every column that points at media.id. The "Used in" panel and deleteMedia
 * both walk this, so anything the panel lists is something the delete clears.
 * media-refs.test.ts fails if the schema grows a reference missing here.
 */
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

/** Everywhere a media item is referenced — for the "Used in" panel. */
export async function adminMediaUsage(
	db: DB,
	id: number,
): Promise<MediaUsage[]> {
	const out: MediaUsage[] = [];
	for (const ref of MEDIA_REFS) out.push(...(await refUsage(db, ref, id)));
	return out;
}

/** Aggregate counts for the library header (independent of the current page). */
export async function adminMediaStats(db: DB) {
	const [r] = await db
		.select({
			total: sql<number>`count(*)`,
			images: sql<number>`sum(case when ${media.contentType} like 'image/%' then 1 else 0 end)`,
			bytes: sql<number>`coalesce(sum(${media.size}), 0)`,
		})
		.from(media)
		.where(eq(media.tenantId, TENANT));
	const total = Number(r?.total ?? 0);
	const images = Number(r?.images ?? 0);
	return { total, images, files: total - images, bytes: Number(r?.bytes ?? 0) };
}

export async function createMediaRecord(
	db: DB,
	v: { r2Key: string; url: string; contentType?: string; size?: number },
): Promise<number> {
	const [row] = await db
		.insert(media)
		.values({
			tenantId: TENANT,
			r2Key: v.r2Key,
			url: v.url,
			contentType: v.contentType ?? null,
			size: v.size ?? null,
		})
		.returning({ id: media.id });
	return row.id;
}

export async function deleteMedia(db: DB, id: number): Promise<void> {
	const r2Key = db.transaction((tx) => {
		// prove the row is ours before clearing anything: the clears below cannot
		// be tenant-scoped, so a foreign id would blank another tenant's records
		const [own] = tx
			.select({ r2Key: media.r2Key })
			.from(media)
			.where(and(eq(media.tenantId, TENANT), eq(media.id, id)))
			.limit(1)
			.all();
		if (!own) return null;

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

export function adminListSettings(db: DB) {
	return db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.tenantId, TENANT));
}
export async function upsertSetting(
	db: DB,
	key: string,
	value: string,
): Promise<void> {
	await db
		.insert(siteSettings)
		.values({ tenantId: TENANT, key, value })
		.onConflictDoUpdate({
			target: [siteSettings.tenantId, siteSettings.key],
			set: { value },
		});
}
export async function deleteSetting(db: DB, key: string): Promise<void> {
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
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "project"),
				eq(translations.entityId, id),
			),
		);
	await db.delete(projectDonors).where(eq(projectDonors.projectId, id));
	await db.delete(projectLocations).where(eq(projectLocations.projectId, id));
	await db
		.delete(projects)
		.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)));
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

export async function deleteTerm(db: DB, id: number): Promise<void> {
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
	await db.delete(translations).where(eq(translations.lang, code));
	await db.delete(uiStrings).where(eq(uiStrings.lang, code));
	await db.delete(languages).where(eq(languages.code, code));
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
