/**
 * One-off: group the flat "Media & Publications" menu into sections, in place.
 * Creates the group nav items (with brief + image) and reparents the existing
 * leaf items under them. Idempotent — skips if already grouped.
 *
 * Run: bun scripts/regroup-media-nav.ts
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { media, navItems, translations } from "../src/server/schema";
import { MEDIA_GROUPS, NAV_META } from "../src/server/seed";

const TENANT = 1;

async function main() {
	const items = await db.select().from(navItems).where(eq(navItems.tenantId, TENANT));
	const enLabels = await db
		.select({ entityId: translations.entityId, value: translations.value })
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "nav_item"),
				eq(translations.field, "label"),
				eq(translations.lang, "en"),
			),
		);
	const labelById = new Map(enLabels.map((r) => [r.entityId, r.value]));

	const mediaRoot = items.find((i) => i.parentId == null && labelById.get(i.id) === "Media & Publications");
	if (!mediaRoot) {
		console.log("Media & Publications root not found — nothing to do.");
		return;
	}

	const children = items.filter((i) => i.parentId === mediaRoot.id);
	if (children.some((c) => c.targetKind === "none")) {
		console.log("Already grouped — skipping.");
		return;
	}
	const byRef = new Map(children.map((c) => [c.targetRef, c]));

	for (let gi = 0; gi < MEDIA_GROUPS.length; gi++) {
		const g = MEDIA_GROUPS[gi];
		const meta = NAV_META[g.en];

		// Image for the group section card.
		let imageMediaId: number | null = null;
		if (meta) {
			const [m] = await db
				.insert(media)
				.values({
					tenantId: TENANT,
					r2Key: `seed/nav-${meta.img}.jpg`,
					url: `https://picsum.photos/seed/${meta.img}/640/400`,
					contentType: "image/jpeg",
				})
				.returning({ id: media.id });
			imageMediaId = m.id;
		}

		const [group] = await db
			.insert(navItems)
			.values({
				tenantId: TENANT,
				parentId: mediaRoot.id,
				sort: gi,
				targetKind: "none",
				targetRef: "",
				visible: true,
				imageMediaId,
			})
			.returning({ id: navItems.id });

		const rows = [
			{ tenantId: TENANT, entityType: "nav_item", entityId: group.id, field: "label", lang: "en", value: g.en },
			{ tenantId: TENANT, entityType: "nav_item", entityId: group.id, field: "label", lang: "km", value: g.km },
		];
		if (meta?.brief) {
			rows.push({ tenantId: TENANT, entityType: "nav_item", entityId: group.id, field: "description", lang: "en", value: meta.brief });
		}
		await db.insert(translations).values(rows);

		// Reparent the group's members in order.
		for (let ri = 0; ri < g.refs.length; ri++) {
			const child = byRef.get(g.refs[ri]);
			if (!child) {
				console.warn(`  ! missing nav item for ref ${g.refs[ri]}`);
				continue;
			}
			await db.update(navItems).set({ parentId: group.id, sort: ri }).where(eq(navItems.id, child.id));
		}
		console.log(`Created group "${g.en}" with ${g.refs.length} items.`);
	}
	console.log("Done.");
}

main().then(() => process.exit(0));
