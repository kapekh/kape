/**
 * Insert any UI strings from the default dictionary that are missing from the
 * `ui_strings` table (insert-only, so existing edits are never overwritten).
 * Makes newly-added keys work on an existing DB without a full reseed.
 * Run: bun scripts/seed-ui-strings.ts
 */
import { and, eq } from "drizzle-orm";

import { defaultUiStrings } from "../src/lib/ui-strings.default";
import { db } from "../src/server/db";
import { uiStrings } from "../src/server/schema";

const TENANT = 1;

async function main() {
	let added = 0;
	for (const [key, v] of Object.entries(defaultUiStrings)) {
		for (const [lang, value] of [["en", v.en], ["km", v.km]] as const) {
			if (!value) continue;
			const [existing] = await db
				.select({ key: uiStrings.key })
				.from(uiStrings)
				.where(and(eq(uiStrings.tenantId, TENANT), eq(uiStrings.key, key), eq(uiStrings.lang, lang)))
				.limit(1);
			if (existing) continue;
			await db.insert(uiStrings).values({ tenantId: TENANT, key, lang, value });
			added++;
			console.log(`  + ${key} [${lang}]`);
		}
	}
	console.log(`\n${added} UI string(s) added.`);
}

main().then(() => process.exit(0));
