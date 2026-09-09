import { and, asc, eq, inArray } from "drizzle-orm";

import type { DB } from "../db";
import { media, orgNodes, people } from "../schema";
import {
	deleteEntityText,
	type EntityText,
	readEntityText,
	requireDefaultText,
	resolveTranslations,
	writeEntityText,
} from "./i18n";

const TENANT = 1;

/** Org-chart text that lives in `translations`, not in a column of `org_nodes`. */
export const ORG_TEXT_FIELDS = ["name", "title"] as const;
export type OrgText = EntityText<(typeof ORG_TEXT_FIELDS)[number]>;

/* --------------------------------- public --------------------------------- */

export type OrgNode = {
	id: number;
	name: string;
	title: string;
	photoUrl: string | null;
	personSlug: string | null;
	posX: number | null;
	posY: number | null;
	children: OrgNode[];
};

export async function getOrgTree(db: DB, lang: string): Promise<OrgNode[]> {
	const rows = await db
		.select()
		.from(orgNodes)
		.where(eq(orgNodes.tenantId, TENANT))
		.orderBy(asc(orgNodes.sort));
	if (rows.length === 0) return [];

	// Resolve linked people → name (per language), photo and public slug.
	const personIds = [
		...new Set(
			rows.map((r) => r.personId).filter((x): x is number => x != null),
		),
	];
	const persons = new Map<
		number,
		{ name: string; slug: string | null; photoUrl: string | null }
	>();
	if (personIds.length) {
		const pRows = await db
			.select({
				id: people.id,
				slug: people.slug,
				isPublic: people.isPublic,
				photoMediaId: people.photoMediaId,
			})
			.from(people)
			.where(inArray(people.id, personIds));
		const personNames = await resolveTranslations(
			db,
			"person",
			pRows.map((p) => p.id),
			lang,
		);
		const coverIds = [
			...new Set(
				pRows.map((p) => p.photoMediaId).filter((x): x is number => x != null),
			),
		];
		const covers = new Map<number, string | null>();
		if (coverIds.length)
			for (const m of await db
				.select({ id: media.id, url: media.url })
				.from(media)
				.where(inArray(media.id, coverIds)))
				covers.set(m.id, m.url);
		for (const p of pRows)
			persons.set(p.id, {
				name: personNames.get(p.id)?.name ?? "",
				slug: p.isPublic ? p.slug : null,
				photoUrl:
					p.photoMediaId != null ? (covers.get(p.photoMediaId) ?? null) : null,
			});
	}

	const text = await resolveTranslations(
		db,
		"org_node",
		rows.map((r) => r.id),
		lang,
	);
	const byId = new Map<number, OrgNode>();
	for (const r of rows) {
		const linked = r.personId != null ? persons.get(r.personId) : undefined;
		const own = text.get(r.id) ?? {};
		byId.set(r.id, {
			id: r.id,
			name: linked?.name || own.name || "",
			title: own.title ?? "",
			photoUrl: linked?.photoUrl ?? null,
			personSlug: linked?.slug ?? null,
			posX: r.posX,
			posY: r.posY,
			children: [],
		});
	}
	const roots: OrgNode[] = [];
	for (const r of rows) {
		const node = byId.get(r.id);
		if (!node) continue;
		const parent = r.parentId != null ? byId.get(r.parentId) : undefined;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}
	return roots;
}

/* --------------------------------- admin ---------------------------------- */

export type OrgInput = {
	parentId: number | null;
	personId: number | null;
	translations: OrgText[];
};

/**
 * Every node, with each language of its name and title: the canvas draws the
 * default language and the editor's tabs need the rest.
 */
export async function adminListOrg(db: DB) {
	const rows = await db
		.select({
			id: orgNodes.id,
			parentId: orgNodes.parentId,
			personId: orgNodes.personId,
			sort: orgNodes.sort,
			posX: orgNodes.posX,
			posY: orgNodes.posY,
		})
		.from(orgNodes)
		.where(eq(orgNodes.tenantId, TENANT))
		.orderBy(asc(orgNodes.sort));
	const { textOf } = await readEntityText(
		db,
		"org_node",
		rows.map((r) => r.id),
	);
	return rows.map((r) => {
		const { text, byLang } = textOf(r.id);
		return {
			...r,
			name: text.name ?? "",
			title: text.title ?? null,
			translations: byLang,
		};
	});
}

/** Persist a node's canvas position (n8n-style free drag). */
export async function setOrgPosition(
	db: DB,
	id: number,
	x: number,
	y: number,
): Promise<void> {
	await db
		.update(orgNodes)
		.set({ posX: Math.round(x), posY: Math.round(y) })
		.where(and(eq(orgNodes.tenantId, TENANT), eq(orgNodes.id, id)));
}

/** Re-parent a node by dragging a connection. Rejects cycles (parent can't be a descendant). */
export async function reparentOrgNode(
	db: DB,
	id: number,
	parentId: number | null,
): Promise<void> {
	if (parentId === id) return;
	if (parentId != null) {
		const all = await db
			.select({ id: orgNodes.id, parentId: orgNodes.parentId })
			.from(orgNodes)
			.where(eq(orgNodes.tenantId, TENANT));
		// Walk up from the proposed parent; if we reach `id`, this would form a cycle.
		let cur: number | null = parentId;
		const byId = new Map(all.map((n) => [n.id, n.parentId]));
		while (cur != null) {
			if (cur === id) return; // cycle — ignore
			cur = byId.get(cur) ?? null;
		}
	}
	await db
		.update(orgNodes)
		.set({ parentId, updatedAt: new Date().toISOString() })
		.where(and(eq(orgNodes.tenantId, TENANT), eq(orgNodes.id, id)));
}

export async function createOrgNode(db: DB, input: OrgInput): Promise<number> {
	await requireDefaultText(db, input.translations, "box");
	const sort = await siblingCount(db, input.parentId);
	const [row] = await db
		.insert(orgNodes)
		.values({
			tenantId: TENANT,
			parentId: input.parentId ?? null,
			personId: input.personId ?? null,
			sort,
		})
		.returning({ id: orgNodes.id });
	await writeEntityText(
		db,
		"org_node",
		row.id,
		ORG_TEXT_FIELDS,
		input.translations,
	);
	return row.id;
}

export async function updateOrgNode(
	db: DB,
	id: number,
	input: OrgInput,
): Promise<void> {
	await requireDefaultText(db, input.translations, "box");
	await db
		.update(orgNodes)
		.set({
			parentId: input.parentId ?? null,
			personId: input.personId ?? null,
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(orgNodes.tenantId, TENANT), eq(orgNodes.id, id)));
	await writeEntityText(
		db,
		"org_node",
		id,
		ORG_TEXT_FIELDS,
		input.translations,
	);
}

/** Delete a node and all its descendants. */
export async function deleteOrgNode(db: DB, id: number): Promise<void> {
	const all = await db
		.select({ id: orgNodes.id, parentId: orgNodes.parentId })
		.from(orgNodes)
		.where(eq(orgNodes.tenantId, TENANT));
	const ids = new Set<number>([id]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const n of all)
			if (n.parentId != null && ids.has(n.parentId) && !ids.has(n.id)) {
				ids.add(n.id);
				grew = true;
			}
	}
	await deleteEntityText(db, "org_node", [...ids]);
	await db
		.delete(orgNodes)
		.where(and(eq(orgNodes.tenantId, TENANT), inArray(orgNodes.id, [...ids])));
}

/** Reorder a node among its siblings (swap sort with the adjacent sibling). */
export async function moveOrgNode(
	db: DB,
	id: number,
	dir: "up" | "down",
): Promise<void> {
	const [node] = await db
		.select()
		.from(orgNodes)
		.where(and(eq(orgNodes.tenantId, TENANT), eq(orgNodes.id, id)))
		.limit(1);
	if (!node) return;
	const siblings = (
		await db.select().from(orgNodes).where(eq(orgNodes.tenantId, TENANT))
	)
		.filter((s) => s.parentId === node.parentId)
		.sort((a, b) => a.sort - b.sort);
	const i = siblings.findIndex((s) => s.id === id);
	const j = dir === "up" ? i - 1 : i + 1;
	if (j < 0 || j >= siblings.length) return;
	const other = siblings[j];
	await db
		.update(orgNodes)
		.set({ sort: other.sort })
		.where(eq(orgNodes.id, node.id));
	await db
		.update(orgNodes)
		.set({ sort: node.sort })
		.where(eq(orgNodes.id, other.id));
}

// Sort value for a new node = number of existing siblings under the same parent.
async function siblingCount(db: DB, parentId: number | null): Promise<number> {
	const rows = await db
		.select({ id: orgNodes.id, parentId: orgNodes.parentId })
		.from(orgNodes)
		.where(eq(orgNodes.tenantId, TENANT));
	return rows.filter((r) => r.parentId === (parentId ?? null)).length;
}
