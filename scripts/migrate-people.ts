/**
 * One-time migration: fold `person` posts + the `staff` table into the unified
 * `people` table. Remaps org-chart links, then removes the old person posts and
 * the "person" content type. Idempotent: skips if `people` is already populated.
 * Run: bun scripts/migrate-people.ts
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../src/server/db";
import { contentTypes, orgNodes, people, postMedia, posts, renderCache, staff, translations } from "../src/server/schema";

const TENANT = 1;

async function main() {
	const [exists] = await db.select({ id: people.id }).from(people).where(eq(people.tenantId, TENANT)).limit(1);
	if (exists) {
		console.log("people already populated — skipping migration.");
		return;
	}

	// --- 1. person posts -> people (record old post id -> new people id) ---
	const personPosts = await db.select().from(posts).where(and(eq(posts.tenantId, TENANT), eq(posts.contentType, "person")));
	const postIds = personPosts.map((p) => p.id);
	const tr = postIds.length
		? await db.select({ entityId: translations.entityId, field: translations.field, lang: translations.lang, value: translations.value })
				.from(translations)
				.where(and(eq(translations.entityType, "post"), inArray(translations.entityId, postIds)))
		: [];
	const trOf = (id: number, field: string, lang: string) => tr.find((r) => r.entityId === id && r.field === field && r.lang === lang)?.value ?? "";

	const idMap = new Map<number, number>(); // old post id -> new people id
	for (let i = 0; i < personPosts.length; i++) {
		const p = personPosts[i];
		const meta = (p.meta ?? {}) as Record<string, unknown>;
		const [row] = await db
			.insert(people)
			.values({
				tenantId: TENANT,
				nameEn: trOf(p.id, "title", "en") || "(unnamed)",
				nameKm: trOf(p.id, "title", "km") || null,
				position: String(meta.position ?? "") || trOf(p.id, "excerpt", "en") || null,
				tier: String(meta.section ?? "team"),
				isPublic: p.status === "published",
				slug: p.slug,
				photoMediaId: p.coverMediaId ?? null,
				sort: i,
			})
			.returning({ id: people.id });
		idMap.set(p.id, row.id);
		// Bio (bilingual rich text) carries over from the post body.
		const bioRows = (["en", "km"] as const)
			.map((lang) => ({ lang, value: trOf(p.id, "body", lang) }))
			.filter((b) => b.value)
			.map((b) => ({ tenantId: TENANT, entityType: "person", entityId: row.id, field: "bio", lang: b.lang, value: b.value }));
		if (bioRows.length) await db.insert(translations).values(bioRows);
	}
	console.log(`  migrated ${personPosts.length} person post(s) -> people`);

	// --- 2. staff table -> people (internal directory, not public) ---
	const staffRows = await db.select().from(staff).where(eq(staff.tenantId, TENANT));
	for (let i = 0; i < staffRows.length; i++) {
		const s = staffRows[i];
		await db.insert(people).values({
			tenantId: TENANT,
			nameEn: s.nameEn || "(unnamed)",
			nameKm: s.nameKm ?? null,
			position: null,
			tier: "staff",
			isPublic: false,
			slug: null,
			photoMediaId: s.photoMediaId ?? null,
			staffNo: s.staffNo ?? null,
			sex: s.sex ?? null,
			phone: s.phone ?? null,
			email: s.email ?? null,
			program: s.program ?? null,
			sort: 1000 + i,
		});
	}
	console.log(`  migrated ${staffRows.length} staff row(s) -> people`);

	// --- 3. remap org-chart links (org_nodes.personId was a person post id) ---
	let remapped = 0;
	for (const n of await db.select().from(orgNodes).where(eq(orgNodes.tenantId, TENANT))) {
		if (n.personId != null && idMap.has(n.personId)) {
			await db.update(orgNodes).set({ personId: idMap.get(n.personId) }).where(eq(orgNodes.id, n.id));
			remapped++;
		}
	}
	console.log(`  remapped ${remapped} org-chart link(s)`);

	// --- 4. delete the old person posts + their translations/media links ---
	if (postIds.length) {
		await db.delete(postMedia).where(inArray(postMedia.postId, postIds));
		await db.delete(translations).where(and(eq(translations.entityType, "post"), inArray(translations.entityId, postIds)));
		await db.delete(posts).where(inArray(posts.id, postIds));
	}
	// Remove the now-unused "person" content type so it leaves the Posts admin.
	await db.delete(contentTypes).where(eq(contentTypes.key, "person"));
	console.log(`  removed ${postIds.length} person post(s) + the 'person' content type`);

	await db.delete(renderCache);
	console.log("Done. (The legacy `staff` table is now unused — drop it in a follow-up migration.)");
}

main().then(() => process.exit(0));
