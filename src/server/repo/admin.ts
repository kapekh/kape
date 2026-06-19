import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";

import type { DB } from "../db";
import {
	alumniRegistrations,
	contactSubmissions,
	contentTypes,
	languages,
	media,
	navItems,
	newsletterSubscribers,
	visitorDaily,
	donors,
	heroSlides,
	offices,
	pages,
	partners,
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
} from "../schema";

/** Dashboard overview counts + visitor totals. */
export async function adminOverview(db: DB) {
	const n = async (q: Promise<{ c: number }[]>) => (await q)[0]?.c ?? 0;
	const w = eq(posts.tenantId, TENANT);
	const [postCount, pageCount, projectCount, schoolCount, partnerCount, donorCount, officeCount, mediaCount, staffCount, langCount] =
		await Promise.all([
			n(db.select({ c: count() }).from(posts).where(w)),
			n(db.select({ c: count() }).from(pages).where(eq(pages.tenantId, TENANT))),
			n(db.select({ c: count() }).from(projects).where(eq(projects.tenantId, TENANT))),
			n(db.select({ c: count() }).from(schools).where(eq(schools.tenantId, TENANT))),
			n(db.select({ c: count() }).from(partners).where(eq(partners.tenantId, TENANT))),
			n(db.select({ c: count() }).from(donors).where(eq(donors.tenantId, TENANT))),
			n(db.select({ c: count() }).from(offices).where(eq(offices.tenantId, TENANT))),
			n(db.select({ c: count() }).from(media).where(eq(media.tenantId, TENANT))),
			n(db.select({ c: count() }).from(staff).where(eq(staff.tenantId, TENANT))),
			n(db.select({ c: count() }).from(languages)),
		]);
	const today = new Date().toISOString().slice(0, 10);
	const vrows = await db.select().from(visitorDaily).where(eq(visitorDaily.tenantId, TENANT));
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
		.where(and(eq(translations.entityType, entityType), eq(translations.entityId, id)));
	const ins = rows
		.filter((r) => r.value !== "")
		.map((r) => ({ tenantId: TENANT, entityType, entityId: id, field: r.field, lang: r.lang, value: r.value }));
	if (ins.length) await db.insert(translations).values(ins);
}

function groupTranslations(rows: { entityId: number; lang: string; field: string; value: string }[]) {
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

export type PostTranslation = { lang: string; title: string; excerpt: string; body: string };
export type PostInput = {
	contentType: string;
	slug: string;
	status: string;
	author?: string | null;
	publishedAt?: string | null;
	meta?: Record<string, unknown> | null;
	translations: PostTranslation[];
};

/** All posts (any status) with the default-language title, for the admin list. */
export async function adminListPosts(db: DB) {
	const rows = await db
		.select()
		.from(posts)
		.where(eq(posts.tenantId, TENANT))
		.orderBy(desc(posts.id));

	const titles = await db
		.select({ entityId: translations.entityId, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "post"), eq(translations.field, "title")));
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
		.select({ field: translations.field, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "post"), eq(translations.entityId, id)));

	const byLang: Record<string, Record<string, string>> = {};
	for (const r of rows) {
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}

	return {
		id: post.id,
		contentType: post.contentType,
		slug: post.slug,
		status: post.status,
		author: post.author,
		publishedAt: post.publishedAt,
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
				rows.push({ tenantId: TENANT, entityType: "post", entityId, field, lang: tr.lang, value });
			}
		}
	}
	return rows;
}

export async function createPost(db: DB, input: PostInput): Promise<number> {
	const [row] = await db
		.insert(posts)
		.values({
			tenantId: TENANT,
			contentType: input.contentType,
			slug: input.slug,
			status: input.status,
			author: input.author ?? null,
			publishedAt: input.publishedAt ?? null,
			meta: input.meta ?? null,
		})
		.returning({ id: posts.id });
	const trs = translationRows(row.id, input);
	if (trs.length) await db.insert(translations).values(trs);
	return row.id;
}

export async function updatePost(db: DB, id: number, input: PostInput): Promise<void> {
	await db
		.update(posts)
		.set({
			contentType: input.contentType,
			slug: input.slug,
			status: input.status,
			author: input.author ?? null,
			publishedAt: input.publishedAt ?? null,
			meta: input.meta ?? null,
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)));

	// Replace translations wholesale.
	await db
		.delete(translations)
		.where(and(eq(translations.entityType, "post"), eq(translations.entityId, id)));
	const trs = translationRows(id, input);
	if (trs.length) await db.insert(translations).values(trs);
}

export async function deletePost(db: DB, id: number): Promise<void> {
	await db.delete(postMedia).where(eq(postMedia.postId, id));
	await db
		.delete(translations)
		.where(and(eq(translations.entityType, "post"), eq(translations.entityId, id)));
	await db.delete(posts).where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)));
}

/** Content-type registry (for the create form's type select). */
export function listContentTypes(db: DB) {
	return db.select().from(contentTypes).orderBy(contentTypes.sort);
}

/* ---------------- Pages ---------------- */

const PAGE_FIELDS = ["title", "body"] as const;
export type PageInput = {
	slug: string;
	status: string;
	translations: { lang: string; title: string; body: string }[];
};

export async function adminListPages(db: DB) {
	const rows = await db.select().from(pages).where(eq(pages.tenantId, TENANT)).orderBy(desc(pages.id));
	const titles = await db
		.select({ entityId: translations.entityId, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "page"), eq(translations.field, "title")));
	const byPage = new Map<number, Record<string, string>>();
	for (const r of titles) {
		const m = byPage.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		byPage.set(r.entityId, m);
	}
	return rows.map((r) => {
		const t = byPage.get(r.id) ?? {};
		return { id: r.id, slug: r.slug, status: r.status, title: t.en ?? Object.values(t)[0] ?? "(untitled)" };
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
		.select({ field: translations.field, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "page"), eq(translations.entityId, id)));
	const byLang: Record<string, Record<string, string>> = {};
	for (const r of rows) {
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}
	return { id: page.id, slug: page.slug, status: page.status, translations: byLang };
}

function pageTranslationRows(entityId: number, input: PageInput) {
	const rows: { tenantId: number; entityType: string; entityId: number; field: string; lang: string; value: string }[] = [];
	for (const tr of input.translations) {
		for (const field of PAGE_FIELDS) {
			const value = (tr as Record<string, string>)[field] ?? "";
			if (value !== "") rows.push({ tenantId: TENANT, entityType: "page", entityId, field, lang: tr.lang, value });
		}
	}
	return rows;
}

export async function createPage(db: DB, input: PageInput): Promise<number> {
	const [row] = await db
		.insert(pages)
		.values({ tenantId: TENANT, slug: input.slug, status: input.status })
		.returning({ id: pages.id });
	const trs = pageTranslationRows(row.id, input);
	if (trs.length) await db.insert(translations).values(trs);
	return row.id;
}

export async function updatePage(db: DB, id: number, input: PageInput): Promise<void> {
	const [prev] = await db.select({ slug: pages.slug }).from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.id, id))).limit(1);
	await db
		.update(pages)
		.set({ slug: input.slug, status: input.status, updatedAt: new Date().toISOString() })
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)));
	// Record a redirect so the old URL keeps working (301).
	if (prev && prev.slug !== input.slug) {
		await db
			.insert(slugRedirects)
			.values({ tenantId: TENANT, entityType: "page", fromSlug: prev.slug, toEntityId: id })
			.onConflictDoNothing();
	}
	await db.delete(translations).where(and(eq(translations.entityType, "page"), eq(translations.entityId, id)));
	const trs = pageTranslationRows(id, input);
	if (trs.length) await db.insert(translations).values(trs);
}

export async function deletePage(db: DB, id: number): Promise<void> {
	await db.delete(translations).where(and(eq(translations.entityType, "page"), eq(translations.entityId, id)));
	await db.delete(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)));
}

/* ---------------- Navigation builder ---------------- */

export type NavInput = {
	parentId: number | null;
	targetKind: string;
	targetRef: string;
	visible: boolean;
	labels: Record<string, string>;
};

/** Flat list of all nav items with labels grouped by language (UI builds the tree). */
export async function adminListNav(db: DB) {
	const items = await db
		.select()
		.from(navItems)
		.where(eq(navItems.tenantId, TENANT))
		.orderBy(asc(navItems.sort));
	const labelRows = await db
		.select({ entityId: translations.entityId, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "nav_item"), eq(translations.field, "label")));
	const byItem = new Map<number, Record<string, string>>();
	for (const r of labelRows) {
		const m = byItem.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		byItem.set(r.entityId, m);
	}
	return items.map((i) => ({
		id: i.id,
		parentId: i.parentId,
		sort: i.sort,
		targetKind: i.targetKind,
		targetRef: i.targetRef,
		visible: i.visible,
		labels: byItem.get(i.id) ?? {},
	}));
}

async function setNavLabels(db: DB, id: number, labels: Record<string, string>) {
	await db
		.delete(translations)
		.where(and(eq(translations.entityType, "nav_item"), eq(translations.entityId, id)));
	const rows = Object.entries(labels)
		.filter(([, v]) => v !== "")
		.map(([lang, value]) => ({ tenantId: TENANT, entityType: "nav_item", entityId: id, field: "label", lang, value }));
	if (rows.length) await db.insert(translations).values(rows);
}

export async function createNavItem(db: DB, input: NavInput): Promise<number> {
	// next sort = max sort among same-parent siblings + 1
	const sibSorts = (await db.select().from(navItems).where(eq(navItems.tenantId, TENANT)))
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
		})
		.returning({ id: navItems.id });
	await setNavLabels(db, row.id, input.labels);
	return row.id;
}

export async function updateNavItem(db: DB, id: number, input: Omit<NavInput, "parentId">): Promise<void> {
	await db
		.update(navItems)
		.set({
			targetKind: input.targetKind,
			targetRef: input.targetRef,
			visible: input.visible,
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(navItems.tenantId, TENANT), eq(navItems.id, id)));
	await setNavLabels(db, id, input.labels);
}

/** Delete an item and all its descendants. */
export async function deleteNavItem(db: DB, id: number): Promise<void> {
	const all = await db.select().from(navItems).where(eq(navItems.tenantId, TENANT));
	const toDelete = new Set<number>([id]);
	let added = true;
	while (added) {
		added = false;
		for (const i of all) {
			if (i.parentId != null && toDelete.has(i.parentId) && !toDelete.has(i.id)) {
				toDelete.add(i.id);
				added = true;
			}
		}
	}
	const ids = [...toDelete];
	await db
		.delete(translations)
		.where(and(eq(translations.entityType, "nav_item"), inArray(translations.entityId, ids)));
	await db.delete(navItems).where(inArray(navItems.id, ids));
}

/* ---------------- Media ---------------- */

export function adminListMedia(db: DB) {
	return db.select().from(media).where(eq(media.tenantId, TENANT)).orderBy(desc(media.id));
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
	await db.delete(media).where(and(eq(media.tenantId, TENANT), eq(media.id, id)));
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
};

export function adminListStaff(db: DB) {
	return db.select().from(staff).where(eq(staff.tenantId, TENANT)).orderBy(asc(staff.sort));
}

export async function createStaff(db: DB, input: StaffInput): Promise<number> {
	const [row] = await db
		.insert(staff)
		.values({ tenantId: TENANT, ...input })
		.returning({ id: staff.id });
	return row.id;
}

export async function updateStaff(db: DB, id: number, input: StaffInput): Promise<void> {
	await db.update(staff).set(input).where(and(eq(staff.tenantId, TENANT), eq(staff.id, id)));
}

export async function deleteStaff(db: DB, id: number): Promise<void> {
	await db.delete(staff).where(and(eq(staff.tenantId, TENANT), eq(staff.id, id)));
}

/* ---------------- Site settings ---------------- */

export function adminListSettings(db: DB) {
	return db.select().from(siteSettings).where(eq(siteSettings.tenantId, TENANT));
}
export async function upsertSetting(db: DB, key: string, value: string): Promise<void> {
	await db
		.insert(siteSettings)
		.values({ tenantId: TENANT, key, value })
		.onConflictDoUpdate({ target: [siteSettings.tenantId, siteSettings.key], set: { value } });
}
export async function deleteSetting(db: DB, key: string): Promise<void> {
	await db.delete(siteSettings).where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, key)));
}

/* ---------------- Partners ---------------- */

export type PartnerInput = { name: string; category: string; url: string; sort: number };
export function adminListPartners(db: DB) {
	return db.select().from(partners).where(eq(partners.tenantId, TENANT)).orderBy(asc(partners.sort));
}
export async function createPartner(db: DB, v: PartnerInput): Promise<number> {
	const [r] = await db.insert(partners).values({ tenantId: TENANT, ...v }).returning({ id: partners.id });
	return r.id;
}
export async function updatePartner(db: DB, id: number, v: PartnerInput): Promise<void> {
	await db.update(partners).set(v).where(and(eq(partners.tenantId, TENANT), eq(partners.id, id)));
}
export async function deletePartner(db: DB, id: number): Promise<void> {
	await db.delete(partners).where(and(eq(partners.tenantId, TENANT), eq(partners.id, id)));
}

/* ---------------- Offices ---------------- */

export type OfficeInput = {
	name: string; province: string; address: string; phone: string; email: string;
	lat: string; lng: string; isHq: boolean; sort: number;
};
export function adminListOffices(db: DB) {
	return db.select().from(offices).where(eq(offices.tenantId, TENANT)).orderBy(asc(offices.sort));
}
export async function createOffice(db: DB, v: OfficeInput): Promise<number> {
	const [r] = await db.insert(offices).values({ tenantId: TENANT, ...v }).returning({ id: offices.id });
	return r.id;
}
export async function updateOffice(db: DB, id: number, v: OfficeInput): Promise<void> {
	await db.update(offices).set(v).where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)));
}
export async function deleteOffice(db: DB, id: number): Promise<void> {
	await db.delete(offices).where(and(eq(offices.tenantId, TENANT), eq(offices.id, id)));
}

/* ---------------- Stats (with translated label) ---------------- */

export type StatInput = { value: number; sort: number; labels: Record<string, string> };

export async function adminListStats(db: DB) {
	const rows = await db.select().from(stats).where(eq(stats.tenantId, TENANT)).orderBy(asc(stats.sort));
	const tr = await db
		.select({ entityId: translations.entityId, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "stat"), eq(translations.field, "label")));
	const byStat = new Map<number, Record<string, string>>();
	for (const r of tr) {
		const m = byStat.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		byStat.set(r.entityId, m);
	}
	return rows.map((r) => ({ id: r.id, value: r.value, sort: r.sort, labels: byStat.get(r.id) ?? {} }));
}

async function setStatLabels(db: DB, id: number, labels: Record<string, string>) {
	await db.delete(translations).where(and(eq(translations.entityType, "stat"), eq(translations.entityId, id)));
	const rows = Object.entries(labels)
		.filter(([, v]) => v !== "")
		.map(([lang, value]) => ({ tenantId: TENANT, entityType: "stat", entityId: id, field: "label", lang, value }));
	if (rows.length) await db.insert(translations).values(rows);
}
export async function createStat(db: DB, input: StatInput): Promise<number> {
	const [r] = await db.insert(stats).values({ tenantId: TENANT, value: input.value, sort: input.sort }).returning({ id: stats.id });
	await setStatLabels(db, r.id, input.labels);
	return r.id;
}
export async function updateStat(db: DB, id: number, input: StatInput): Promise<void> {
	await db.update(stats).set({ value: input.value, sort: input.sort }).where(and(eq(stats.tenantId, TENANT), eq(stats.id, id)));
	await setStatLabels(db, id, input.labels);
}
export async function deleteStat(db: DB, id: number): Promise<void> {
	await db.delete(translations).where(and(eq(translations.entityType, "stat"), eq(translations.entityId, id)));
	await db.delete(stats).where(and(eq(stats.tenantId, TENANT), eq(stats.id, id)));
}

/* ---------------- Hero slides ---------------- */

const HERO_FIELDS = ["kicker", "title", "caption"] as const;
export type HeroInput = {
	mediaId: number | null;
	kind: string;
	videoUrl: string | null;
	sort: number;
	translations: { lang: string; kicker: string; title: string; caption: string }[];
};

export async function adminListHero(db: DB) {
	const rows = await db.select().from(heroSlides).where(eq(heroSlides.tenantId, TENANT)).orderBy(asc(heroSlides.sort));
	const tr = await db
		.select({ entityId: translations.entityId, lang: translations.lang, field: translations.field, value: translations.value })
		.from(translations)
		.where(eq(translations.entityType, "hero_slide"));
	const g = groupTranslations(tr);
	return rows.map((r) => ({ id: r.id, mediaId: r.mediaId, kind: r.kind, videoUrl: r.videoUrl, sort: r.sort, translations: g.get(r.id) ?? {} }));
}
function heroRows(input: HeroInput) {
	return input.translations.flatMap((t) => HERO_FIELDS.map((f) => ({ lang: t.lang, field: f, value: (t as Record<string, string>)[f] ?? "" })));
}
export async function createHero(db: DB, input: HeroInput): Promise<number> {
	const [r] = await db.insert(heroSlides).values({ tenantId: TENANT, mediaId: input.mediaId, kind: input.kind, videoUrl: input.videoUrl, sort: input.sort }).returning({ id: heroSlides.id });
	await setTranslations(db, "hero_slide", r.id, heroRows(input));
	return r.id;
}
export async function updateHero(db: DB, id: number, input: HeroInput): Promise<void> {
	await db.update(heroSlides).set({ mediaId: input.mediaId, kind: input.kind, videoUrl: input.videoUrl, sort: input.sort }).where(and(eq(heroSlides.tenantId, TENANT), eq(heroSlides.id, id)));
	await setTranslations(db, "hero_slide", id, heroRows(input));
}
export async function deleteHero(db: DB, id: number): Promise<void> {
	await db.delete(translations).where(and(eq(translations.entityType, "hero_slide"), eq(translations.entityId, id)));
	await db.delete(heroSlides).where(and(eq(heroSlides.tenantId, TENANT), eq(heroSlides.id, id)));
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
	return db.select().from(schools).where(eq(schools.tenantId, TENANT)).orderBy(asc(schools.sort), asc(schools.name));
}
export async function getSchool(db: DB, id: number) {
	const [r] = await db.select().from(schools).where(and(eq(schools.tenantId, TENANT), eq(schools.id, id))).limit(1);
	return r ?? null;
}
export async function createSchool(db: DB, v: SchoolInput): Promise<number> {
	const [r] = await db.insert(schools).values({ tenantId: TENANT, ...v }).returning({ id: schools.id });
	return r.id;
}
export async function updateSchool(db: DB, id: number, v: SchoolInput): Promise<void> {
	await db.update(schools).set(v).where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)));
}
export async function deleteSchool(db: DB, id: number): Promise<void> {
	await db.delete(schools).where(and(eq(schools.tenantId, TENANT), eq(schools.id, id)));
}

/* ---------------- Donors ---------------- */

export type DonorInput = { name: string; url: string; sort: number };
export function adminListDonors(db: DB) {
	return db.select().from(donors).where(eq(donors.tenantId, TENANT)).orderBy(asc(donors.sort));
}
export async function createDonor(db: DB, v: DonorInput): Promise<number> {
	const [r] = await db.insert(donors).values({ tenantId: TENANT, ...v }).returning({ id: donors.id });
	return r.id;
}
export async function updateDonor(db: DB, id: number, v: DonorInput): Promise<void> {
	await db.update(donors).set(v).where(and(eq(donors.tenantId, TENANT), eq(donors.id, id)));
}
export async function deleteDonor(db: DB, id: number): Promise<void> {
	await db.delete(donors).where(and(eq(donors.tenantId, TENANT), eq(donors.id, id)));
}

/* ---------------- Projects (+ donors + locations) ---------------- */

const PROJECT_FIELDS = ["name", "summary", "body"] as const;
export type ProjectLocationInput = { schoolName: string; lat: string; lng: string };
export type ProjectInput = {
	code: string;
	slug: string;
	status: string;
	sort: number;
	translations: { lang: string; name: string; summary: string; body: string }[];
	donorIds: number[];
	locations: ProjectLocationInput[];
};

export async function adminListProjects(db: DB) {
	const rows = await db.select().from(projects).where(eq(projects.tenantId, TENANT)).orderBy(asc(projects.sort));
	const tr = await db
		.select({ entityId: translations.entityId, lang: translations.lang, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "project"), eq(translations.field, "name")));
	const names = new Map<number, Record<string, string>>();
	for (const r of tr) {
		const m = names.get(r.entityId) ?? {};
		m[r.lang] = r.value;
		names.set(r.entityId, m);
	}
	return rows.map((r) => {
		const n = names.get(r.id) ?? {};
		return { id: r.id, code: r.code, slug: r.slug, status: r.status, name: n.en ?? Object.values(n)[0] ?? r.code };
	});
}

export async function getProjectForEdit(db: DB, id: number) {
	const [p] = await db.select().from(projects).where(and(eq(projects.tenantId, TENANT), eq(projects.id, id))).limit(1);
	if (!p) return null;
	const tr = await db
		.select({ entityId: translations.entityId, lang: translations.lang, field: translations.field, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "project"), eq(translations.entityId, id)));
	const byLang: Record<string, Record<string, string>> = {};
	for (const r of tr) {
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}
	const dRows = await db.select({ donorId: projectDonors.donorId }).from(projectDonors).where(eq(projectDonors.projectId, id));
	const locs = await db.select().from(projectLocations).where(eq(projectLocations.projectId, id)).orderBy(asc(projectLocations.sort));
	return {
		id: p.id,
		code: p.code,
		slug: p.slug,
		status: p.status,
		sort: p.sort,
		translations: byLang,
		donorIds: dRows.map((d) => d.donorId),
		locations: locs.map((l) => ({ schoolName: l.schoolName ?? "", lat: l.lat, lng: l.lng })),
	};
}

function projectTrRows(input: ProjectInput) {
	return input.translations.flatMap((t) => PROJECT_FIELDS.map((f) => ({ lang: t.lang, field: f, value: (t as Record<string, string>)[f] ?? "" })));
}
async function setProjectRelations(db: DB, id: number, input: ProjectInput) {
	await setTranslations(db, "project", id, projectTrRows(input));
	await db.delete(projectDonors).where(eq(projectDonors.projectId, id));
	if (input.donorIds.length) await db.insert(projectDonors).values(input.donorIds.map((donorId) => ({ projectId: id, donorId })));
	await db.delete(projectLocations).where(eq(projectLocations.projectId, id));
	const locs = input.locations.filter((l) => l.lat && l.lng);
	if (locs.length) {
		await db.insert(projectLocations).values(locs.map((l, i) => ({ tenantId: TENANT, projectId: id, schoolName: l.schoolName, lat: l.lat, lng: l.lng, sort: i })));
	}
}
export async function createProject(db: DB, input: ProjectInput): Promise<number> {
	const [p] = await db.insert(projects).values({ tenantId: TENANT, code: input.code, slug: input.slug, status: input.status, sort: input.sort }).returning({ id: projects.id });
	await setProjectRelations(db, p.id, input);
	return p.id;
}
export async function updateProject(db: DB, id: number, input: ProjectInput): Promise<void> {
	await db.update(projects).set({ code: input.code, slug: input.slug, status: input.status, sort: input.sort }).where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)));
	await setProjectRelations(db, id, input);
}
export async function deleteProject(db: DB, id: number): Promise<void> {
	await db.delete(translations).where(and(eq(translations.entityType, "project"), eq(translations.entityId, id)));
	await db.delete(projectDonors).where(eq(projectDonors.projectId, id));
	await db.delete(projectLocations).where(eq(projectLocations.projectId, id));
	await db.delete(projects).where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)));
}

/* ---------------- Terms (managed reference data) ---------------- */

export type TermInput = { taxonomy: string; key: string; label: string; sort: number };

export function adminListTerms(db: DB) {
	return db.select().from(terms).where(eq(terms.tenantId, TENANT)).orderBy(asc(terms.taxonomy), asc(terms.sort));
}

export async function createTerm(db: DB, input: TermInput): Promise<number> {
	const [row] = await db
		.insert(terms)
		.values({ tenantId: TENANT, ...input })
		.returning({ id: terms.id });
	return row.id;
}

export async function updateTerm(db: DB, id: number, input: TermInput): Promise<void> {
	await db.update(terms).set(input).where(and(eq(terms.tenantId, TENANT), eq(terms.id, id)));
}

export async function deleteTerm(db: DB, id: number): Promise<void> {
	await db.delete(terms).where(and(eq(terms.tenantId, TENANT), eq(terms.id, id)));
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
	await db.update(languages).set({ isDefault: false }).where(ne(languages.code, code));
}

export async function createLanguage(db: DB, input: LanguageInput): Promise<void> {
	await db.insert(languages).values(input);
	if (input.isDefault) await ensureSingleDefault(db, input.code);
}

export async function updateLanguage(db: DB, code: string, input: Omit<LanguageInput, "code">): Promise<void> {
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
export async function moveNavItem(db: DB, id: number, dir: "up" | "down"): Promise<void> {
	const all = await db.select().from(navItems).where(eq(navItems.tenantId, TENANT));
	const item = all.find((i) => i.id === id);
	if (!item) return;
	const siblings = all
		.filter((i) => i.parentId === item.parentId)
		.sort((a, b) => a.sort - b.sort);
	const idx = siblings.findIndex((i) => i.id === id);
	const swapWith = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
	if (!swapWith) return;
	await db.update(navItems).set({ sort: swapWith.sort }).where(eq(navItems.id, item.id));
	await db.update(navItems).set({ sort: item.sort }).where(eq(navItems.id, swapWith.id));
}
