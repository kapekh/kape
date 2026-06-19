/**
 * Backfill the Notion-style page tree: for every page whose slug is a full path
 * (e.g. "who-we-are/about"), set `segment` (last path part), create any missing
 * ancestor pages (e.g. "who-we-are"), link `parentId`, and assign `sortOrder`
 * among siblings. Idempotent — safe to re-run.
 *
 *   bun scripts/pages-tree-migrate.ts          # dry-run: print the plan, write nothing
 *   APPLY=1 bun scripts/pages-tree-migrate.ts  # apply to the DB
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { pages, translations } from "../src/server/schema";

const TENANT = 1;
const APPLY = process.env.APPLY === "1";

const humanize = (seg: string) =>
	seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** All ancestor paths of a full slug, shortest first. "a/b/c" -> ["a","a/b"]. */
function ancestorPaths(slug: string): string[] {
	const parts = slug.split("/");
	const out: string[] = [];
	for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
	return out;
}

async function main() {
	const rows = await db
		.select({ id: pages.id, slug: pages.slug, status: pages.status })
		.from(pages)
		.where(eq(pages.tenantId, TENANT));

	const bySlug = new Map(rows.map((r) => [r.slug, r]));

	// 1. Figure out which ancestor paths are missing and must be created.
	const needed = new Set<string>();
	for (const r of rows) for (const a of ancestorPaths(r.slug)) needed.add(a);
	const toCreate = [...needed].filter((p) => !bySlug.has(p)).sort((a, b) => a.split("/").length - b.split("/").length);

	// 2. Create missing ancestor pages (shortest first so parents exist).
	console.log(`\n=== Missing parent pages to CREATE (${toCreate.length}) ===`);
	for (const path of toCreate) {
		const segment = path.split("/").pop()!;
		console.log(`  + ${path}   (segment="${segment}", title="${humanize(segment)}")`);
		if (APPLY) {
			const [r] = await db
				.insert(pages)
				.values({ tenantId: TENANT, slug: path, segment, status: "published" })
				.returning({ id: pages.id });
			bySlug.set(path, { id: r.id, slug: path, status: "published" });
			await db
				.delete(translations)
				.where(and(eq(translations.entityType, "page"), eq(translations.entityId, r.id), eq(translations.field, "title")));
			await db.insert(translations).values({
				tenantId: TENANT,
				entityType: "page",
				entityId: r.id,
				field: "title",
				lang: "en",
				value: humanize(segment),
			});
		}
	}

	// 3. Set parentId + segment for every page; sortOrder by slug among siblings.
	const all = APPLY ? [...bySlug.values()] : [...bySlug.values(), ...toCreate.map((p) => ({ id: -1, slug: p, status: "published" }))];
	const siblingCounter = new Map<string, number>(); // parentSlug ("" for root) -> next order
	console.log(`\n=== Set parent / segment / sortOrder (${all.length} pages) ===`);
	for (const r of [...all].sort((a, b) => a.slug.localeCompare(b.slug))) {
		const parts = r.slug.split("/");
		const segment = parts.pop()!;
		const parentSlug = parts.join("/");
		const parent = parentSlug ? bySlug.get(parentSlug) : null;
		const parentId = parent && parent.id > 0 ? parent.id : null;
		const order = siblingCounter.get(parentSlug) ?? 0;
		siblingCounter.set(parentSlug, order + 1);
		console.log(`  ${r.slug.padEnd(38)} parent=${(parentSlug || "—").padEnd(14)} segment=${segment.padEnd(20)} order=${order}`);
		if (APPLY && r.id > 0) {
			await db.update(pages).set({ segment, parentId, sortOrder: order }).where(eq(pages.id, r.id));
		}
	}

	console.log(APPLY ? "\n✅ Applied." : "\n(dry-run — re-run with APPLY=1 to write)");
}

main().then(() => process.exit(0));
