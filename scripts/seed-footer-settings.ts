/**
 * Insert the editable footer keys into site_settings (only the ones not already
 * present, so existing edits are never overwritten). Makes the footer text/links
 * editable in /admin/settings on an existing DB. Run: bun scripts/seed-footer-settings.ts
 */
import { and, eq } from "drizzle-orm";

import { FOOTER_DEFAULTS } from "../src/lib/footer-defaults";
import { db } from "../src/server/db";
import { siteSettings } from "../src/server/schema";

const TENANT = 1;

async function main() {
	let added = 0;
	for (const [key, value] of Object.entries(FOOTER_DEFAULTS)) {
		const [existing] = await db.select({ key: siteSettings.key }).from(siteSettings).where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, key))).limit(1);
		if (existing) continue;
		await db.insert(siteSettings).values({ tenantId: TENANT, key, value });
		added++;
		console.log(`  + ${key}`);
	}
	console.log(`\n${added} footer setting(s) added (${Object.keys(FOOTER_DEFAULTS).length - added} already present).`);
}

main().then(() => process.exit(0));
