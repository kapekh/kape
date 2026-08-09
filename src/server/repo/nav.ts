import { and, asc, eq, inArray } from "drizzle-orm";

import type { DB } from "../db";
import { media, navItems, pages, posts, projects } from "../schema";
import { resolveTranslations } from "./i18n";

const TENANT = 1;

export type NavNode = {
	id: number;
	label: string;
	description: string | null;
	imageUrl: string | null;
	targetKind: string;
	targetRef: string;
	href: string | null;
	children: NavNode[];
};

/** Resolve a nav item's binding to a front-end href. */
function hrefFor(targetKind: string, targetRef: string): string | null {
	if (!targetRef) return null; // no destination → label-only (e.g. a dropdown group)
	switch (targetKind) {
		case "page":
		case "post_list":
		case "view":
		case "post":
			return `/${targetRef.replace(/^\//, "")}`;
		case "url":
			return targetRef;
		default:
			return null;
	}
}

type TargetKind = "page" | "project" | "post";
type Meta = { title: string; brief: string; image: string | null };

/** What entity (if any) a nav item draws its card metadata from. */
function classifyTarget(
	targetKind: string,
	targetRef: string,
): { kind: TargetKind; slug: string } | null {
	if (
		targetRef.startsWith("projects/") ||
		targetRef.startsWith("current-projects/") ||
		targetRef.startsWith("past-projects/")
	) {
		return { kind: "project", slug: targetRef.split("/").pop() ?? "" };
	}
	if (targetKind === "post") return { kind: "post", slug: targetRef };
	if (targetKind === "page" && targetRef)
		return { kind: "page", slug: targetRef };
	return null;
}

/**
 * The full visible navigation tree for `lang`. Each item's card title/brief/image
 * is consumed from its target entity (page/post/project) — the source of truth that
 * also powers SEO — falling back to the nav item's own stored fields (used for
 * label-only groups, external URLs, and list routes that have no backing entity).
 * The nav `label`, when set, overrides the target title for the menu text.
 */
export async function getNavTree(db: DB, lang: string): Promise<NavNode[]> {
	const items = await db
		.select()
		.from(navItems)
		.where(and(eq(navItems.tenantId, TENANT), eq(navItems.visible, true)))
		.orderBy(asc(navItems.sort));

	const navTr = await resolveTranslations(
		db,
		"nav_item",
		items.map((i) => i.id),
		lang,
	);

	// One media lookup for everything (nav images + page/project/post covers).
	const mediaUrl = new Map<number, string | null>();
	const resolveMedia = async (ids: (number | null)[]) => {
		const uniq = [
			...new Set(ids.filter((v): v is number => v != null && !mediaUrl.has(v))),
		];
		if (!uniq.length) return;
		const rows = await db
			.select({ id: media.id, url: media.url })
			.from(media)
			.where(inArray(media.id, uniq));
		for (const r of rows) mediaUrl.set(r.id, r.url);
	};

	// Classify each item's target and gather slugs per entity type.
	const cls = new Map(
		items.map(
			(it) => [it.id, classifyTarget(it.targetKind, it.targetRef)] as const,
		),
	);
	const pageSlugs: string[] = [];
	const projectSlugs: string[] = [];
	const postSlugs: string[] = [];
	for (const c of cls.values()) {
		if (!c) continue;
		(c.kind === "page"
			? pageSlugs
			: c.kind === "project"
				? projectSlugs
				: postSlugs
		).push(c.slug);
	}

	const pageMeta = new Map<string, Meta>();
	const projectMeta = new Map<string, Meta>();
	const postMeta = new Map<string, Meta>();

	if (pageSlugs.length) {
		const rows = await db
			.select()
			.from(pages)
			.where(and(eq(pages.tenantId, TENANT), inArray(pages.slug, pageSlugs)));
		const tr = await resolveTranslations(
			db,
			"page",
			rows.map((r) => r.id),
			lang,
		);
		await resolveMedia(rows.map((r) => r.heroMediaId));
		for (const r of rows) {
			pageMeta.set(r.slug, {
				title: tr.get(r.id)?.title ?? "",
				brief: tr.get(r.id)?.excerpt ?? "",
				image:
					r.heroMediaId != null ? (mediaUrl.get(r.heroMediaId) ?? null) : null,
			});
		}
	}
	if (projectSlugs.length) {
		const rows = await db
			.select()
			.from(projects)
			.where(
				and(
					eq(projects.tenantId, TENANT),
					inArray(projects.slug, projectSlugs),
				),
			);
		const tr = await resolveTranslations(
			db,
			"project",
			rows.map((r) => r.id),
			lang,
		);
		await resolveMedia(rows.map((r) => r.logoMediaId));
		for (const r of rows) {
			projectMeta.set(r.slug, {
				title: tr.get(r.id)?.name ?? "",
				brief: tr.get(r.id)?.summary ?? "",
				image:
					r.logoMediaId != null ? (mediaUrl.get(r.logoMediaId) ?? null) : null,
			});
		}
	}
	if (postSlugs.length) {
		const rows = await db
			.select()
			.from(posts)
			.where(and(eq(posts.tenantId, TENANT), inArray(posts.slug, postSlugs)));
		const tr = await resolveTranslations(
			db,
			"post",
			rows.map((r) => r.id),
			lang,
		);
		await resolveMedia(rows.map((r) => r.coverMediaId));
		for (const r of rows) {
			postMeta.set(r.slug, {
				title: tr.get(r.id)?.title ?? "",
				brief: tr.get(r.id)?.excerpt ?? "",
				image:
					r.coverMediaId != null
						? (mediaUrl.get(r.coverMediaId) ?? null)
						: null,
			});
		}
	}

	// Nav items' own (fallback) images.
	await resolveMedia(items.map((i) => i.imageMediaId));

	const targetFor = (it: (typeof items)[number]): Meta | undefined => {
		const c = cls.get(it.id);
		if (!c) return undefined;
		if (c.kind === "page") return pageMeta.get(c.slug);
		if (c.kind === "project") return projectMeta.get(c.slug);
		return postMeta.get(c.slug);
	};

	const nodeById = new Map<number, NavNode>();
	for (const it of items) {
		const target = targetFor(it);
		const navLabel = navTr.get(it.id)?.label ?? "";
		const navDesc = navTr.get(it.id)?.description ?? null;
		const navImg =
			it.imageMediaId != null ? (mediaUrl.get(it.imageMediaId) ?? null) : null;
		nodeById.set(it.id, {
			id: it.id,
			label: navLabel || target?.title || "", // nav label overrides the target title for menu text
			description: target?.brief || navDesc || null, // prefer the target's brief, fall back to nav's
			imageUrl: target?.image || navImg || null, // prefer the target's image, fall back to nav's
			targetKind: it.targetKind,
			targetRef: it.targetRef,
			href: hrefFor(it.targetKind, it.targetRef),
			children: [],
		});
	}

	const roots: NavNode[] = [];
	for (const it of items) {
		const node = nodeById.get(it.id);
		if (!node) continue;
		const parent = it.parentId != null ? nodeById.get(it.parentId) : undefined;
		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}

	// Items with children are dropdown groups — they never link anywhere.
	for (const node of nodeById.values()) {
		if (node.children.length > 0) node.href = null;
	}
	return roots;
}
