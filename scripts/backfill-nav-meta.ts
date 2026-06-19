/**
 * One-off: backfill mega-menu card metadata (brief + background image) onto the
 * already-seeded nav items, without wiping the DB. Idempotent — skips items that
 * already have an image. Reuses NAV_META from the seed (single source of truth).
 *
 * Run: bun scripts/backfill-nav-meta.ts
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { media, navItems, translations } from "../src/server/schema";
import { NAV_META } from "../src/server/seed";

const TENANT = 1;

async function main() {
	const items = await db.select().from(navItems).where(eq(navItems.tenantId, TENANT));
	// EN labels, to match label-only containers (e.g. "Current Projects").
	const labelRows = await db
		.select({ entityId: translations.entityId, value: translations.value })
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "nav_item"),
				eq(translations.field, "label"),
				eq(translations.lang, "en"),
			),
		);
	const labelById = new Map(labelRows.map((r) => [r.entityId, r.value]));

	let updated = 0;
	for (const item of items) {
		const key = item.targetRef || labelById.get(item.id) || "";
		const meta = NAV_META[key];
		if (!meta) continue;

		// Image (only if not already set).
		if (item.imageMediaId == null) {
			const [m] = await db
				.insert(media)
				.values({
					tenantId: TENANT,
					r2Key: `seed/nav-${meta.img}.jpg`,
					url: `https://picsum.photos/seed/${meta.img}/640/400`,
					contentType: "image/jpeg",
				})
				.returning({ id: media.id });
			await db.update(navItems).set({ imageMediaId: m.id }).where(eq(navItems.id, item.id));
		}

		// Brief (replace any existing description for this item; skip if none).
		await db
			.delete(translations)
			.where(
				and(
					eq(translations.entityType, "nav_item"),
					eq(translations.entityId, item.id),
					eq(translations.field, "description"),
				),
			);
		if (meta.brief) {
			await db.insert(translations).values({
				tenantId: TENANT,
				entityType: "nav_item",
				entityId: item.id,
				field: "description",
				lang: "en",
				value: meta.brief,
			});
		}
		updated++;
	}

	console.log(`Backfilled ${updated} nav items with brief + image.`);
}

main().then(() => process.exit(0));
