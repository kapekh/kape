/**
 * Warm the incremental-SSG render cache: enumerate every published page (the tree)
 * and every collection record (/news/<slug>, /projects/<slug>, …) across enabled
 * languages, and resolve each through the cache. Run after a deploy or content
 * import. Run: bun scripts/prerender.ts
 */
import { and, eq } from "drizzle-orm";

import { COLLECTIONS } from "../src/lib/collections";
import { db } from "../src/server/db";
import { listLanguages } from "../src/server/repo/i18n";
import { resolveRouteCached } from "../src/server/repo/route";
import { clearCache } from "../src/server/render-cache";
import { pages, posts, projects } from "../src/server/schema";

const TENANT = 1;

async function main() {
	await clearCache(db); // rebuild from scratch

	// Default (no ?lang) maps to "", plus each enabled language code.
	const langRows = await listLanguages(db);
	const langs = ["", ...langRows.map((l) => (l as { code?: string }).code).filter((c): c is string => !!c && c !== "en")];

	const paths = new Set<string>();
	for (const p of await db.select({ slug: pages.slug }).from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.status, "published")))) paths.add(p.slug);
	for (const def of Object.values(COLLECTIONS)) {
		if (def.kind === "project") {
			for (const r of await db.select({ slug: projects.slug }).from(projects)) paths.add(`${def.prefix}/${r.slug}`);
		} else if (def.contentType) {
			for (const r of await db.select({ slug: posts.slug }).from(posts).where(and(eq(posts.tenantId, TENANT), eq(posts.contentType, def.contentType), eq(posts.status, "published")))) paths.add(`${def.prefix}/${r.slug}`);
		}
	}

	let n = 0;
	for (const lang of langs) for (const path of paths) { await resolveRouteCached(db, path, lang); n++; }
	console.log(`Warmed ${paths.size} paths × ${langs.length} lang(s) = ${n} cache entries.`);
}

main().then(() => process.exit(0));
