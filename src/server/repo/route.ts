import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import {
	collectionFor,
	legacyRedirect,
	resolvesUnder,
} from "#/lib/collections";
import { type PublicRecordKind, publicPathOf } from "#/lib/public-path";

import type { DB } from "../db";
import {
	cacheGet,
	cacheKey,
	cacheSet,
	tagPage,
	tagPostsQuery,
	tagRecord,
	tagSourceQuery,
} from "../render-cache";
import { pages, people, posts, projects } from "../schema";
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

const TENANT = 1;

// projects are the one collection that nests, so the parent link has to really exist
async function projectRecordSlug(db: DB, rest: string): Promise<string | null> {
	const parts = rest.split("/");
	if (parts.length === 1) return parts[0];
	if (parts.length !== 2) return null;
	const [parentSlug, slug] = parts;
	const parent = alias(projects, "parent_project");
	const [row] = await db
		.select({ slug: projects.slug })
		.from(projects)
		.innerJoin(parent, eq(projects.parentId, parent.id))
		.where(
			and(
				eq(projects.tenantId, TENANT),
				eq(projects.slug, slug),
				eq(parent.slug, parentSlug),
			),
		)
		.limit(1);
	return row?.slug ?? null;
}

async function resolveRoute(
	db: DB,
	rawPath: string,
	lang: string,
	listPage = 1,
): Promise<ResolvedRoute> {
	const path = rawPath.replace(/^\/+|\/+$/g, ""); // trim slashes

	// before the legacy rules, so an admin can author a page at a legacy path
	const page = await getPageBySlug(db, path, lang, listPage);
	if (page) return { kind: "page", page };

	// 2. Legacy nested path → flat path (301), so old links never 404.
	const legacy = legacyRedirect(path);
	if (legacy && legacy !== path) return { kind: "redirect", to: legacy };

	// 3. Collection record: first segment is a known prefix, rest is the record slug.
	const slash = path.indexOf("/");
	if (slash > 0) {
		const col = collectionFor(path.slice(0, slash));
		const rest = path.slice(slash + 1);
		if (col?.kind === "project" && rest) {
			const slug = await projectRecordSlug(db, rest);
			const project = slug ? await getProjectBySlug(db, slug, lang) : null;
			if (project) return { kind: "project", label: col.label, project };
		} else if (col && rest && !rest.includes("/")) {
			if (col.kind === "album") {
				const album = await getAlbum(db, rest, lang);
				if (album) return { kind: "album", label: col.label, album };
			} else if (col.kind === "people") {
				const person = await getPersonBySlug(db, rest, lang);
				if (person) return { kind: "person", label: col.label, person };
			} else {
				const post = await getPostBySlug(db, rest, lang);
				if (post && resolvesUnder(col, post.contentType)) {
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

/** The record behind an admin screen, resolved to where the public site serves it. */
export async function publicPathFor(
	db: DB,
	kind: PublicRecordKind,
	id: number,
): Promise<string | null> {
	if (kind === "page") {
		const [row] = await db
			.select({ slug: pages.slug, status: pages.status })
			.from(pages)
			.where(and(eq(pages.tenantId, TENANT), eq(pages.id, id)))
			.limit(1);
		return row ? publicPathOf({ kind, ...row }) : null;
	}

	if (kind === "post") {
		const [row] = await db
			.select({
				slug: posts.slug,
				status: posts.status,
				contentType: posts.contentType,
			})
			.from(posts)
			.where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)))
			.limit(1);
		return row ? publicPathOf({ kind, ...row }) : null;
	}

	if (kind === "project") {
		const parent = alias(projects, "parent_project");
		const [row] = await db
			.select({ slug: projects.slug, parentSlug: parent.slug })
			.from(projects)
			.leftJoin(parent, eq(projects.parentId, parent.id))
			.where(and(eq(projects.tenantId, TENANT), eq(projects.id, id)))
			.limit(1);
		return row ? publicPathOf({ kind, ...row }) : null;
	}

	const [row] = await db
		.select({ slug: people.slug, isPublic: people.isPublic })
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)))
		.limit(1);
	return row ? publicPathOf({ kind, ...row }) : null;
}

/** Tags a resolved route is filed under, so the right entries bust on a mutation. */
function tagsFor(r: ResolvedRoute): string[] {
	if (r.kind === "page") {
		const tags = [tagPage(r.page.slug)];
		for (const s of r.page.sections ?? []) {
			const q = s.query;
			if (!q) continue;
			tags.push(
				q.source === "posts"
					? tagPostsQuery(q.contentType ?? "news")
					: tagSourceQuery(q.source),
			);
		}
		return tags;
	}
	if (r.kind === "article") return [tagRecord(r.post.contentType, r.post.slug)];
	if (r.kind === "album") return [tagRecord("album", r.album.slug)];
	if (r.kind === "project") return [tagRecord("project", r.project.slug)];
	if (r.kind === "person") return [tagRecord("person", r.person.slug)];
	return [];
}

// redirects and not-found are not cached, so new or moved content surfaces immediately
export async function resolveRouteCached(
	db: DB,
	rawPath: string,
	lang: string,
	listPage = 1,
): Promise<ResolvedRoute> {
	const path = rawPath.replace(/^\/+|\/+$/g, "");
	// a paginated page is a different document at the same path
	const key = cacheKey(listPage > 1 ? `${path}?page=${listPage}` : path, lang);
	const hit = await cacheGet<ResolvedRoute>(db, key);
	if (hit) return hit;
	const resolved = await resolveRoute(db, path, lang, listPage);
	if (resolved.kind !== "redirect" && resolved.kind !== "notfound") {
		await cacheSet(db, key, resolved, tagsFor(resolved));
	}
	return resolved;
}
