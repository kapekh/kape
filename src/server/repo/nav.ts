import { asc, eq } from "drizzle-orm";

import type { DB } from "../db";
import { navItems } from "../schema";
import { resolveTranslations } from "./i18n";

export type NavNode = {
	id: number;
	label: string;
	targetKind: string;
	targetRef: string;
	href: string | null;
	children: NavNode[];
};

/** Resolve a nav item's binding to a front-end href. */
function hrefFor(targetKind: string, targetRef: string): string | null {
	switch (targetKind) {
		case "page":
			return `/${targetRef.replace(/^\//, "")}`;
		case "post_list":
		case "view":
			return `/${targetRef.replace(/^\//, "")}`;
		case "post":
			return `/${targetRef.replace(/^\//, "")}`;
		case "url":
			return targetRef;
		default:
			return null;
	}
}

/** The full visible navigation tree with labels resolved for `lang`. */
export async function getNavTree(db: DB, lang: string): Promise<NavNode[]> {
	const items = await db
		.select()
		.from(navItems)
		.where(eq(navItems.visible, true))
		.orderBy(asc(navItems.sort));

	const labels = await resolveTranslations(
		db,
		"nav_item",
		items.map((i) => i.id),
		lang,
	);

	const nodeById = new Map<number, NavNode>();
	for (const it of items) {
		nodeById.set(it.id, {
			id: it.id,
			label: labels.get(it.id)?.label ?? "",
			targetKind: it.targetKind,
			targetRef: it.targetRef,
			href: hrefFor(it.targetKind, it.targetRef),
			children: [],
		});
	}

	const roots: NavNode[] = [];
	for (const it of items) {
		const node = nodeById.get(it.id)!;
		if (it.parentId != null && nodeById.has(it.parentId)) {
			nodeById.get(it.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}
