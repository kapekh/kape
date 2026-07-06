/**
 * Single entry point for the public catch-all route. Resolves any URL path to one
 * of: a page (tree), a collection record (flat /<prefix>/<slug>), a 301 redirect
 * (renamed page slug or a legacy nested path), or not-found. The `$` route renders
 * whatever this returns — so adding a page or a content record needs no new route.
 */
import { NON_PUBLIC_CONTENT_TYPES, collectionFor, legacyRedirect } from "#/lib/collections";
import type { DB } from "../db";
import { cacheGet, cacheKey, cacheSet, tagPage, tagPostsQuery, tagRecord, tagSourceQuery } from "../render-cache";
import {
	findPageRedirect,
	getAlbum,
	getPageBySlug,
	getPostBySlug,
	type ResolvedAlbum,
	type ResolvedPage,
	type ResolvedPost,
} from "./content";
import { getPersonBySlug, type ResolvedPerson } from "./people";
import { getProjectBySlug, type ResolvedProject } from "./projects";

export type ResolvedRoute =
	| { kind: "page"; page: ResolvedPage }
	| { kind: "article"; label: string; post: ResolvedPost }
	| { kind: "album"; label: string; album: ResolvedAlbum }
	| { kind: "project"; label: string; project: ResolvedProject }
	| { kind: "person"; label: string; person: ResolvedPerson }
	| { kind: "redirect"; to: string }
	| { kind: "notfound" };

export async function resolveRoute(db: DB, rawPath: string, lang: string): Promise<ResolvedRoute> {
	const path = rawPath.replace(/^\/+|\/+$/g, ""); // trim slashes

	// 1. Legacy nested path → flat path (301), highest priority so old links never 404.
	const legacy = legacyRedirect(path);
	if (legacy && legacy !== path) return { kind: "redirect", to: legacy };

	// 2. Exact page by full-path slug (the page tree).
	const page = await getPageBySlug(db, path, lang);
	if (page) return { kind: "page", page };

	// 3. Collection record: first segment is a known prefix, rest is the record slug.
	const slash = path.indexOf("/");
	if (slash > 0) {
		const col = collectionFor(path.slice(0, slash));
		const rest = path.slice(slash + 1);
		if (col && rest && !rest.includes("/")) {
			if (col.kind === "project") {
				const project = await getProjectBySlug(db, rest, lang);
				if (project) return { kind: "project", label: col.label, project };
			} else if (col.kind === "album") {
				const album = await getAlbum(db, rest, lang);
				if (album) return { kind: "album", label: col.label, album };
			} else if (col.kind === "people") {
				const person = await getPersonBySlug(db, rest, lang);
				if (person) return { kind: "person", label: col.label, person };
			} else {
				const post = await getPostBySlug(db, rest, lang);
				if (post && post.contentType === col.contentType && !NON_PUBLIC_CONTENT_TYPES.has(post.contentType)) {
					return { kind: "article", label: col.label, post };
				}
			}
		}
	}

	// 4. A renamed page slug recorded in slug_redirects (301 to current slug).
	const to = await findPageRedirect(db, path);
	if (to) return { kind: "redirect", to };

	return { kind: "notfound" };
}

/** Tags a resolved route is filed under, so the right entries bust on a mutation. */
function tagsFor(r: ResolvedRoute): string[] {
	if (r.kind === "page") {
		const tags = [tagPage(r.page.slug)];
		for (const s of r.page.sections ?? []) {
			const q = s.query;
			if (!q) continue;
			tags.push(q.source === "posts" ? tagPostsQuery(q.contentType ?? "news") : tagSourceQuery(q.source));
		}
		return tags;
	}
	if (r.kind === "article") return [tagRecord(r.post.contentType, r.post.slug)];
	if (r.kind === "album") return [tagRecord("album", r.album.slug)];
	if (r.kind === "project") return [tagRecord("project", r.project.slug)];
	if (r.kind === "person") return [tagRecord("person", r.person.slug)];
	return [];
}

/**
 * Read-through cached resolver (incremental SSG). Page/record results are cached
 * by `lang::path` and tagged for precise invalidation; redirects/not-found are not
 * cached so new or moved content surfaces immediately.
 */
export async function resolveRouteCached(db: DB, rawPath: string, lang: string): Promise<ResolvedRoute> {
	const path = rawPath.replace(/^\/+|\/+$/g, "");
	const key = cacheKey(path, lang);
	const hit = await cacheGet<ResolvedRoute>(db, key);
	if (hit) return hit;
	const resolved = await resolveRoute(db, path, lang);
	if (resolved.kind !== "redirect" && resolved.kind !== "notfound") {
		await cacheSet(db, key, resolved, tagsFor(resolved));
	}
	return resolved;
}
