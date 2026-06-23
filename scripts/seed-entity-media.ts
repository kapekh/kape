/**
 * Give every partner/donor a logo, every office an image, every staff member and
 * team person a photo — using deterministic picsum images. Insert-only: skips
 * any record that already has media. Run: bun scripts/seed-entity-media.ts
 */
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../src/server/db";
import { donors, media, offices, partners, people, renderCache } from "../src/server/schema";

const TENANT = 1;
const pic = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

async function addMedia(seed: string, w: number, h: number): Promise<number> {
	const [r] = await db.insert(media).values({ tenantId: TENANT, r2Key: `demo/${seed}.jpg`, url: pic(seed, w, h), contentType: "image/jpeg", width: w, height: h }).returning({ id: media.id });
	return r.id;
}

async function main() {
	let n = 0;

	for (const p of await db.select().from(partners).where(eq(partners.tenantId, TENANT))) {
		if (p.logoMediaId) continue;
		await db.update(partners).set({ logoMediaId: await addMedia(`logo-partner-${p.id}`, 240, 120) }).where(eq(partners.id, p.id));
		n++;
	}
	for (const d of await db.select().from(donors).where(eq(donors.tenantId, TENANT))) {
		if (d.logoMediaId) continue;
		await db.update(donors).set({ logoMediaId: await addMedia(`logo-donor-${d.id}`, 240, 120) }).where(eq(donors.id, d.id));
		n++;
	}
	for (const o of await db.select().from(offices).where(eq(offices.tenantId, TENANT))) {
		if (o.imageMediaId) continue;
		await db.update(offices).set({ imageMediaId: await addMedia(`office-${o.id}`, 800, 500) }).where(eq(offices.id, o.id));
		n++;
	}
	// People (unified directory: public team/leadership + internal staff) without a photo.
	for (const p of await db.select().from(people).where(and(eq(people.tenantId, TENANT), isNull(people.photoMediaId)))) {
		await db.update(people).set({ photoMediaId: await addMedia(`person-${p.id}`, 600, 600) }).where(eq(people.id, p.id));
		n++;
	}

	await db.delete(renderCache);
	console.log(`Set media on ${n} record(s) (partners, donors, offices, staff, people). Cache cleared.`);
}

main().then(() => process.exit(0));
