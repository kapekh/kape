/**
 * One-off: make pages authoritative for their menu-card metadata. For every nav
 * item that links to a real page, copy the nav item's backfilled brief → page
 * excerpt and its card image → page hero (only where the page doesn't already
 * have them). Nav fields are left as harmless fallbacks. Idempotent.
 *
 * Run: bun scripts/pages-own-metadata.ts
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../src/server/db";
import { navItems, pages, translations } from "../src/server/schema";

const TENANT = 1;

async function main() {
	const items = await db.select().from(navItems).where(eq(navItems.tenantId, TENANT));

	// Nav items that point at a page slug (exclude project routes — those have no page row).
	const pageItems = items.filter(
		(i) =>
			i.targetKind === "page" &&
			i.targetRef &&
			!i.targetRef.startsWith("current-projects/") &&
			!i.targetRef.startsWith("past-projects/"),
	);
	if (!pageItems.length) {
		console.log("No page-linked nav items.");
		return;
	}

	const slugs = [...new Set(pageItems.map((i) => i.targetRef))];
	const pageRows = await db.select().from(pages).where(and(eq(pages.tenantId, TENANT), inArray(pages.slug, slugs)));
	const pageBySlug = new Map(pageRows.map((p) => [p.slug, p]));

	// Nav EN briefs.
	const navDesc = await db
		.select({ entityId: translations.entityId, value: translations.value })
		.from(translations)
		.where(and(eq(translations.entityType, "nav_item"), eq(translations.field, "description"), eq(translations.lang, "en")));
	const briefByItem = new Map(navDesc.map((r) => [r.entityId, r.value]));

	// Existing page excerpts (so we don't overwrite).
	const pageExcerpts = await db
		.select({ entityId: translations.entityId })
		.from(translations)
		.where(and(eq(translations.entityType, "page"), eq(translations.field, "excerpt"), eq(translations.lang, "en")));
	const hasExcerpt = new Set(pageExcerpts.map((r) => r.entityId));

	let movedBrief = 0;
	let movedImage = 0;
	for (const item of pageItems) {
		const page = pageBySlug.get(item.targetRef);
		if (!page) continue; // list routes / non-page refs — leave nav fallback in place

		const brief = briefByItem.get(item.id);
		if (brief && !hasExcerpt.has(page.id)) {
			await db.insert(translations).values({
				tenantId: TENANT,
				entityType: "page",
				entityId: page.id,
				field: "excerpt",
				lang: "en",
				value: brief,
			});
			hasExcerpt.add(page.id);
			movedBrief++;
		}
		if (item.imageMediaId != null && page.heroMediaId == null) {
			await db.update(pages).set({ heroMediaId: item.imageMediaId }).where(eq(pages.id, page.id));
			page.heroMediaId = item.imageMediaId;
			movedImage++;
		}
	}

	console.log(`Pages now own metadata — set ${movedBrief} excerpts, ${movedImage} cover images.`);
}

main().then(() => process.exit(0));
