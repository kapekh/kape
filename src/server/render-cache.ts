/**
 * Incremental-SSG render cache. Stores resolved route data keyed by `lang::path`,
 * tagged so content mutations can bust exactly the affected entries. The public
 * loaders read through `resolveRouteCached`; admin mutations call `invalidateTags`.
 *
 * Disable entirely with SSG_CACHE=off (useful when debugging).
 */
import { like, sql } from "drizzle-orm";

import type { DB } from "./db";
import { renderCache } from "./schema";

const ENABLED = process.env.SSG_CACHE !== "off";
const TTL_SECONDS = 7 * 24 * 60 * 60; // backstop; precise invalidation is the primary mechanism

// Entries hold rendered HTML and the resolved payload's own shape, so a change
// to how rich text serialises, or a field added to what is cached, makes every
// existing entry wrong. Bump this when that happens; old rows are then
// unreachable and age out on the TTL. v3: ResolvedPost gained fileUrl and
// youtubeUrl, which a v2 entry cannot have.
const FORMAT = "v3";

export const cacheKey = (path: string, lang: string) =>
	`${FORMAT}::${lang || "en"}::${path.replace(/^\/+|\/+$/g, "")}`;

/** Read a cached value (within the TTL backstop), or null on miss/disabled. */
export async function cacheGet<T>(db: DB, key: string): Promise<T | null> {
	if (!ENABLED) return null;
	const [row] = await db
		.select({ data: renderCache.data })
		.from(renderCache)
		.where(
			sql`${renderCache.key} = ${key} AND ${renderCache.createdAt} > datetime('now', ${`-${TTL_SECONDS} seconds`})`,
		)
		.limit(1);
	if (!row) return null;
	try {
		return JSON.parse(row.data) as T;
	} catch {
		return null;
	}
}

/** Write/replace a cached value. `tags` drive invalidation. */
export async function cacheSet(
	db: DB,
	key: string,
	data: unknown,
	tags: string[],
): Promise<void> {
	if (!ENABLED) return;
	const tagStr = `|${[...new Set(tags)].join("|")}|`;
	await db
		.insert(renderCache)
		.values({
			key,
			data: JSON.stringify(data),
			tags: tagStr,
			createdAt: sql`datetime('now')`,
		})
		.onConflictDoUpdate({
			target: renderCache.key,
			set: {
				data: JSON.stringify(data),
				tags: tagStr,
				createdAt: sql`datetime('now')`,
			},
		});
}

/** Delete every cached entry carrying any of the given tags. */
export async function invalidateTags(db: DB, tags: string[]): Promise<void> {
	for (const t of tags) {
		if (t)
			await db.delete(renderCache).where(like(renderCache.tags, `%|${t}|%`));
	}
}

/** Drop a single path's entry across all languages (any-lang prefix). */
export async function invalidatePath(db: DB, path: string): Promise<void> {
	const p = path.replace(/^\/+|\/+$/g, "");
	await db.delete(renderCache).where(like(renderCache.key, `%::${p}`));
}

export async function clearCache(db: DB): Promise<void> {
	await db.delete(renderCache);
}

/** Tags an entry is filed under, derived from its slug. */
export const tagPage = (slug: string) =>
	`page:${slug.replace(/^\/+|\/+$/g, "")}`;
export const tagRecord = (contentType: string, slug: string) =>
	`record:${contentType}:${slug}`;
/** A listing/section that queries posts of a content type (e.g. home, /news). */
export const tagPostsQuery = (contentType: string) => `q:posts:${contentType}`;
export const tagSourceQuery = (source: string) => `q:${source}`;
