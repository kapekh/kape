import { and, asc, eq, getTableColumns, isNull, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { applyOrder, type SortableId } from "#/lib/reorder";
import type { SectionNode } from "#/lib/sections";
import type { DB } from "../db";
import {
	campaigns,
	donors,
	languages,
	navItems,
	offices,
	pages,
	partners,
	people,
	projects,
	schools,
	terms,
} from "../schema";
import { StaleWriteError } from "./admin";

const TENANT = 1;

type OrderedScope = {
	table: SQLiteTable;
	/** the column rows are addressed by: `id` everywhere but `languages`, keyed by `code` */
	key: AnySQLiteColumn;
	/** drizzle property name of the order column, because `set` keys on the property, not the column */
	sortProp: "sort" | "sortOrder";
	where: SQL | undefined;
	// breaks a tie the way the list the editor dragged breaks it; defaults to `key`
	tie?: AnySQLiteColumn;
};

type TenantOrdered = SQLiteTable & {
	id: AnySQLiteColumn;
	tenantId: AnySQLiteColumn;
	sort: AnySQLiteColumn;
};

const tenantScope = (table: TenantOrdered, extra?: SQL): OrderedScope => ({
	table,
	key: table.id,
	sortProp: "sort",
	where: and(eq(table.tenantId, TENANT), extra),
});

/**
 * Apply a dropped order to one scope of rows.
 *
 * The whole scope is renumbered densely from zero, not just the ids given: that
 * is what clears the duplicate `sort` values the seeds left behind, and it keeps
 * a later drag from having to break ties. Ids outside the scope are dropped by
 * `applyOrder`, so a stale page cannot corrupt an order it can no longer see.
 */
async function renumber<Id extends SortableId>(
	db: DB,
	scope: OrderedScope,
	ids: readonly Id[],
): Promise<void> {
	const sort = getTableColumns(scope.table)[scope.sortProp];
	const rows = await db
		.select({ id: scope.key })
		.from(scope.table)
		.where(scope.where)
		.orderBy(asc(sort), asc(scope.tie ?? scope.key));
	if (rows.length < 2) return;
	const ordered = applyOrder(
		rows.map((r) => r.id as Id),
		ids,
	);
	db.transaction((tx) => {
		for (let i = 0; i < ordered.length; i++)
			tx.update(scope.table)
				// the order column is named per table, so a shared writer cannot type `set`
				.set({ [scope.sortProp]: i } as never)
				.where(and(scope.where, eq(scope.key, ordered[i])))
				.run();
	});
}

/**
 * Reorder people. The caller may send one tier's ids only — the rest of the
 * directory keeps its slots, so a filtered grid cannot reshuffle what it hides.
 */
export function reorderPeople(db: DB, ids: number[]): Promise<void> {
	return renumber(db, tenantScope(people), ids);
}

/* Six flat tenant-wide lists, renumbered the same way. Only `sort` moves, so a
   campaign's `featured` still wins its public order. */

export function reorderPartners(db: DB, ids: number[]): Promise<void> {
	return renumber(db, tenantScope(partners), ids);
}

export function reorderProjects(db: DB, ids: number[]): Promise<void> {
	return renumber(db, tenantScope(projects), ids);
}

export function reorderOffices(db: DB, ids: number[]): Promise<void> {
	return renumber(db, tenantScope(offices), ids);
}

export function reorderSchools(db: DB, ids: number[]): Promise<void> {
	// the schools list ties on name, so the first renumber has to read it that way
	return renumber(db, { ...tenantScope(schools), tie: schools.name }, ids);
}

export function reorderDonors(db: DB, ids: number[]): Promise<void> {
	return renumber(db, tenantScope(donors), ids);
}

export function reorderCampaigns(db: DB, ids: number[]): Promise<void> {
	return renumber(db, tenantScope(campaigns), ids);
}

/** Reorder one taxonomy of the term list; the other taxonomies are out of scope. */
export function reorderTerms(
	db: DB,
	taxonomy: string,
	ids: number[],
): Promise<void> {
	return renumber(db, tenantScope(terms, eq(terms.taxonomy, taxonomy)), ids);
}

/** Reorder the language switcher. `languages` is keyed by code and has no tenant. */
export function reorderLanguages(db: DB, codes: string[]): Promise<void> {
	return renumber(
		db,
		{
			table: languages,
			key: languages.code,
			sortProp: "sort",
			where: undefined,
		},
		codes,
	);
}

/** The parent of `id`, or `undefined` when there is no such row under this tenant. */
async function parentOf(
	db: DB,
	table: SQLiteTable & {
		id: AnySQLiteColumn;
		tenantId: AnySQLiteColumn;
		parentId: AnySQLiteColumn;
	},
	id: number,
): Promise<number | null | undefined> {
	const [row] = await db
		.select({ parentId: table.parentId })
		.from(table)
		.where(and(eq(table.tenantId, TENANT), eq(table.id, id)))
		.limit(1);
	return row ? (row.parentId as number | null) : undefined;
}

const siblingsOf = (parentId: AnySQLiteColumn, parent: number | null) =>
	parent == null ? isNull(parentId) : eq(parentId, parent);

/**
 * Reorder nav siblings. The level comes from the first id rather than the
 * caller, so a payload spanning two levels reorders one of them and ignores the
 * rest instead of scrambling the tree.
 */
export async function reorderNavItems(db: DB, ids: number[]): Promise<void> {
	const head = ids[0];
	if (head === undefined) return;
	const parent = await parentOf(db, navItems, head);
	if (parent === undefined) return;
	await renumber(
		db,
		tenantScope(navItems, siblingsOf(navItems.parentId, parent)),
		ids,
	);
}

export type ReorderSectionsResult = {
	/** The new version to send with the next save. */
	updatedAt: string | null;
};

/**
 * Reorder a page's sections. Each per-language overlay lives inside its node's
 * props, so it travels with the node and needs no separate move. A stale
 * `expectedUpdatedAt` is refused and the stored order is left as it was.
 */
export async function reorderSections(
	db: DB,
	pageId: number,
	ids: string[],
	expectedUpdatedAt?: string | null,
): Promise<ReorderSectionsResult> {
	const [page] = await db
		.select({ sections: pages.sections, updatedAt: pages.updatedAt })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.id, pageId)))
		.limit(1);
	if (!page) throw new Error(`There is no page ${pageId}.`);
	const current = (page.sections ?? []) as SectionNode[];
	if (current.length < 2) return { updatedAt: page.updatedAt };
	const byId = new Map(current.map((s) => [s.id, s]));
	// reporting success here would drop a node: two nodes sharing an id collapse
	// into one on the way back out
	if (byId.size !== current.length)
		throw new Error(
			`Page ${pageId} has two sections with the same id, so its order cannot be changed until one is renamed in the page builder.`,
		);
	const sections = applyOrder(
		current.map((s) => s.id),
		ids,
	).map((id) => byId.get(id) as SectionNode);
	// one statement, so the version check and the write cannot come apart
	const updatedAt = new Date().toISOString();
	const written = await db
		.update(pages)
		.set({ sections, updatedAt })
		.where(
			and(
				eq(pages.tenantId, TENANT),
				eq(pages.id, pageId),
				...(expectedUpdatedAt ? [eq(pages.updatedAt, expectedUpdatedAt)] : []),
			),
		)
		.returning({ id: pages.id });
	if (!written.length) throw new StaleWriteError();
	return { updatedAt };
}
