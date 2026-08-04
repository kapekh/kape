/**
 * Point `header_search_link` at the search page on a database seeded before
 * search existed. `seed-footer-settings.ts` only inserts missing keys, so it
 * cannot fix a key that is present and stale. Only rewrites the old default —
 * an admin's own value is left alone. Run: bun scripts/retarget-search-link.ts
 */
import { and, eq } from "drizzle-orm";

import { HEADER_DEFAULTS } from "../src/lib/header-defaults";
import { db } from "../src/server/db";
import { siteSettings } from "../src/server/schema";

const TENANT = 1;
const KEY = "header_search_link";
const STALE = "/sitemap.xml";

async function main() {
	const [row] = await db
		.select({ value: siteSettings.value })
		.from(siteSettings)
		.where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, KEY)))
		.limit(1);

	if (!row) {
		console.log(`${KEY} is unset; seed-footer-settings.ts will insert it.`);
		return;
	}
	if (row.value !== STALE) {
		console.log(`${KEY} is "${row.value}", not the stale default. Left alone.`);
		return;
	}
	await db
		.update(siteSettings)
		.set({ value: HEADER_DEFAULTS[KEY] })
		.where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, KEY)));
	console.log(`${KEY}: ${STALE} -> ${HEADER_DEFAULTS[KEY]}`);
}

main().then(() => process.exit(0));
