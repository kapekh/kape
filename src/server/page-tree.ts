import { and, eq } from "drizzle-orm";

import { legacyRedirect } from "#/lib/collections";
import type { SectionNode } from "#/lib/sections";
import type { DB } from "./db";
import { navItems, pages, translations } from "./schema";

const TENANT = 1;

const humanize = (s: string) =>
	s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function setTitle(db: DB, id: number, title: string, lang = "en") {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "page"),
				eq(translations.entityId, id),
				eq(translations.field, "title"),
			),
		);
	await db.insert(translations).values({
		tenantId: TENANT,
		entityType: "page",
		entityId: id,
		field: "title",
		lang,
		value: title,
	});
}

/** Upsert a page row by slug, setting its sections + title (segment/parent set later). */
export async function upsertPage(
	db: DB,
	slug: string,
	title: string,
	sections: SectionNode[],
	lang = "en",
) {
	const [existing] = await db
		.select({ id: pages.id })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.slug, slug)))
		.limit(1);
	let id: number;
	if (existing) {
		id = existing.id;
		await db
			.update(pages)
			.set({ sections, status: "published" })
			.where(eq(pages.id, id));
	} else {
		const [r] = await db
			.insert(pages)
			.values({
				tenantId: TENANT,
				slug,
				segment: slug.split("/").pop(),
				status: "published",
				sections,
			})
			.returning({ id: pages.id });
		id = r.id;
	}
	await setTitle(db, id, title, lang);
	return id;
}

/** Build the parent/segment tree over all pages, creating missing ancestors. */
export async function normalizeTree(db: DB) {
	const rows = await db
		.select({ id: pages.id, slug: pages.slug })
		.from(pages)
		.where(eq(pages.tenantId, TENANT));
	const bySlug = new Map(rows.map((r) => [r.slug, r.id]));

	const needed = new Set<string>();
	for (const r of rows) {
		const parts = r.slug.split("/");
		for (let i = 1; i < parts.length; i++)
			needed.add(parts.slice(0, i).join("/"));
	}
	for (const path of [...needed]
		.filter((p) => !bySlug.has(p))
		.sort((a, b) => a.split("/").length - b.split("/").length)) {
		const segment = path.slice(path.lastIndexOf("/") + 1);
		const [r] = await db
			.insert(pages)
			.values({ tenantId: TENANT, slug: path, segment, status: "published" })
			.returning({ id: pages.id });
		bySlug.set(path, r.id);
		await setTitle(db, r.id, humanize(segment));
	}

	const counter = new Map<string, number>();
	const sorted = [...bySlug.entries()].sort(([a], [b]) =>
		a < b ? -1 : a > b ? 1 : 0,
	);
	for (const [slug, id] of sorted) {
		const cut = slug.lastIndexOf("/");
		const segment = slug.slice(cut + 1);
		const parentSlug = cut < 0 ? "" : slug.slice(0, cut);
		const parentId = parentSlug ? (bySlug.get(parentSlug) ?? null) : null;
		const order = counter.get(parentSlug) ?? 0;
		counter.set(parentSlug, order + 1);
		await db
			.update(pages)
			.set({ segment, parentId, sortOrder: order })
			.where(eq(pages.id, id));
	}
}

/** Rewrite nav targets that still point at pre-flattening paths. */
export async function flattenNav(db: DB) {
	const items = await db
		.select({ id: navItems.id, targetRef: navItems.targetRef })
		.from(navItems)
		.where(eq(navItems.tenantId, TENANT));
	for (const it of items) {
		const flat = legacyRedirect(it.targetRef);
		if (flat && flat !== it.targetRef)
			await db
				.update(navItems)
				.set({ targetRef: flat })
				.where(eq(navItems.id, it.id));
	}
}
