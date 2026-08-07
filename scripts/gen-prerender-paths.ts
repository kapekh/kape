/**
 * Enumerate every public path to statically prerender — for every enabled
 * language. Content paths (home → "", page slugs, collection records) are each
 * emitted under every language prefix (/en/…, /km/…) and written to
 * prerender-paths.json, consumed by scripts/prerender-static.ts.
 *
 *   bun scripts/gen-prerender-paths.ts
 */
import { and, eq } from "drizzle-orm";

import { COLLECTIONS } from "../src/lib/collections";
import { reportUnroutable } from "../src/lib/i18n-config";
import { db } from "../src/server/db";
import { languages, pages, posts, projects } from "../src/server/schema";

const TENANT = 1;

async function main() {
	const langs = (
		await db
			.select({ code: languages.code })
			.from(languages)
			.where(eq(languages.enabled, true))
			.orderBy(languages.sort)
	).map((l) => l.code);
	if (!langs.length)
		throw new Error(
			"No enabled language in the languages table; run bun run db:seed first.",
		);
	reportUnroutable(langs, "prerender");

	// Language-agnostic content paths ("" = home).
	const content = new Set<string>([""]);
	for (const p of await db.select({ slug: pages.slug }).from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.status, "published")))) {
		if (p.slug !== "home") content.add(p.slug);
	}
	for (const def of Object.values(COLLECTIONS)) {
		if (def.kind === "project") {
			for (const r of await db.select({ slug: projects.slug }).from(projects)) content.add(`${def.prefix}/${r.slug}`);
		} else if (def.contentType) {
			for (const r of await db.select({ slug: posts.slug }).from(posts).where(and(eq(posts.tenantId, TENANT), eq(posts.contentType, def.contentType), eq(posts.status, "published")))) content.add(`${def.prefix}/${r.slug}`);
		}
	}

	// Expand under every language prefix.
	const paths = langs.flatMap((lang) => [...content].map((c) => (c ? `/${lang}/${c}` : `/${lang}`)));
	const list = [...new Set(paths)].sort();
	await Bun.write("prerender-paths.json", JSON.stringify(list, null, 2));
	console.log(`Wrote prerender-paths.json with ${list.length} paths (${content.size} content × ${langs.length} langs).`);
}

main().then(() => process.exit(0));
