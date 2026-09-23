import { and, eq, inArray, sql } from "drizzle-orm";

import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type { DB } from "../db";
import { media, translations } from "../schema";
import { resolveTranslations } from "./i18n";
import { containsText, escapeLike } from "./like";
import {
	MEDIA_REFS,
	MEDIA_TEXT_REFS,
	type MediaRef,
	type MediaTextRef,
	type MediaUsage,
	TRANSLATED_ENTITIES,
} from "./media-refs";

const TENANT = 1;

async function refUsage(
	db: DB,
	ref: MediaRef,
	id: number,
): Promise<MediaUsage[]> {
	const where = ref.tenant
		? and(eq(ref.tenant, TENANT), eq(ref.column, id))
		: eq(ref.column, id);
	let q = db
		.select({ rowId: ref.rowId, label: ref.label ?? sql<string | null>`null` })
		.from(ref.table)
		.$dynamic();
	if (ref.join) q = q.innerJoin(ref.join.table, ref.join.on);

	const seen = new Set<number>();
	const rows: { rowId: number; label: string }[] = [];
	for (const r of await q.where(where)) {
		const rowId = Number(r.rowId);
		if (seen.has(rowId)) continue;
		seen.add(rowId);
		rows.push({ rowId, label: String(r.label ?? "") });
	}
	const named = ref.labelEntity
		? await resolveTranslations(
				db,
				ref.labelEntity,
				rows.map((r) => r.rowId),
			)
		: null;
	return rows.map((r) => ({
		kind: ref.kind,
		label:
			named?.get(r.rowId)?.[ref.labelField ?? "name"] ||
			r.label ||
			`#${r.rowId}`,
		href: ref.href?.(r.rowId) ?? null,
		blocking: false,
	}));
}

// synchronous because deleteMedia runs it inside its transaction: checking outside leaves a window to embed the image
type Queryable = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

export function mediaTextUsage(db: Queryable, url: string): MediaUsage[] {
	const out: MediaUsage[] = [];

	for (const ref of MEDIA_TEXT_REFS) {
		for (const r of db
			.select({
				rowId: ref.rowId,
				label: ref.label ?? sql<string | null>`null`,
			})
			.from(ref.table)
			.where(
				and(
					eq(ref.tenant, TENANT),
					containsText(ref.column, url),
					...(ref.keys ? [inArray(ref.rowId, ref.keys)] : []),
				),
			)
			.all()) {
			const rowId = String(r.rowId);
			out.push({
				kind: ref.kind,
				label: ref.place?.(rowId) || String(r.label ?? "") || ref.kind,
				href: ref.href(rowId),
				blocking: true,
			});
		}
	}

	// One scan of the whole column rather than a list of translated fields, so a
	// body field added later is covered without being registered anywhere.
	const hits = db
		.select({ type: translations.entityType, entityId: translations.entityId })
		.from(translations)
		.where(
			and(
				eq(translations.tenantId, TENANT),
				containsText(translations.value, url),
			),
		)
		.all();

	const seen = new Set<string>();
	for (const hit of hits) {
		const key = `${hit.type}:${hit.entityId}`;
		if (seen.has(key)) continue; // same body in two languages is one place
		seen.add(key);
		const target = TRANSLATED_ENTITIES[hit.type];
		if (!target) {
			out.push({
				kind: "Text",
				label: `${hit.type} #${hit.entityId}`,
				href: null,
				blocking: true,
			});
			continue;
		}
		const [row] = db
			.select({ label: target.label })
			.from(target.table)
			.where(and(eq(target.tenant, TENANT), eq(target.id, hit.entityId)))
			.limit(1)
			.all();
		if (!row) continue; // translation orphaned by a deleted entity
		out.push({
			kind: target.kind,
			label: String(row.label ?? "") || `#${hit.entityId}`,
			href: target.href(hit.entityId),
			blocking: true,
		});
	}

	return out;
}

/** Everywhere a media item is referenced — for the "Used in" panel. */
export async function adminMediaUsage(
	db: DB,
	id: number,
): Promise<MediaUsage[]> {
	const out: MediaUsage[] = [];
	for (const ref of MEDIA_REFS) out.push(...(await refUsage(db, ref, id)));
	const [row] = await db
		.select({ url: media.url })
		.from(media)
		.where(and(eq(media.tenantId, TENANT), eq(media.id, id)))
		.limit(1);
	if (row?.url) out.push(...mediaTextUsage(db, row.url));
	return out;
}

// an <img src> inside someone's HTML cannot be cleared without rewriting what they wrote
export class MediaInUseError extends Error {
	constructor(readonly usage: MediaUsage[]) {
		const shown = usage.slice(0, 3).map((u) => `${u.kind}: ${u.label}`);
		const more = usage.length - shown.length;
		super(
			`This file is still in the content of ${usage.length} ${usage.length === 1 ? "place" : "places"} (${shown.join(", ")}${more > 0 ? `, and ${more} more` : ""}). Remove it there first, then delete the file.`,
		);
		this.name = "MediaInUseError";
	}
}

export type MediaRow = { id: number; url: string | null };

type ForeignKeyHit = {
	mediaId: number;
	rowId: number;
	label: string | null;
	refIndex: number;
};

/**
 * Every foreign key to `media` in one statement rather than thirteen, grouped so
 * a file a hundred posts share still comes back as one row per reference.
 */
async function foreignKeyHits(db: DB, ids: number[]): Promise<ForeignKeyHit[]> {
	const parts = MEDIA_REFS.map(
		(ref, refIndex) => sql`
		select ${ref.column} as mediaId, ${ref.rowId} as rowId,
		       ${ref.label ?? sql`null`} as label, ${refIndex} as refIndex
		from ${ref.table}
		${ref.join ? sql`join ${ref.join.table} on ${ref.join.on}` : sql``}
		where ${inArray(ref.column, ids)}
		  ${ref.tenant ? sql`and ${ref.tenant} = ${TENANT}` : sql``}`,
	);
	// min() fixes the other columns to its own row, so the label belongs to rowId
	return db.all<ForeignKeyHit>(sql`
		select mediaId, min(rowId) as rowId, label, refIndex
		from (${sql.join(parts, sql` union all `)})
		group by mediaId, refIndex
		order by mediaId, refIndex`);
}

async function labelFromForeignKeys(
	db: DB,
	ids: number[],
	out: Map<number, string>,
): Promise<void> {
	const hits = await foreignKeyHits(db, ids);
	if (!hits.length) return;

	const byEntity = new Map<string, number[]>();
	for (const hit of hits) {
		const entity = MEDIA_REFS[hit.refIndex]?.labelEntity;
		if (entity)
			byEntity.set(entity, [
				...(byEntity.get(entity) ?? []),
				Number(hit.rowId),
			]);
	}
	const named = new Map<
		string,
		Awaited<ReturnType<typeof resolveTranslations>>
	>();
	for (const [entity, rowIds] of byEntity)
		named.set(entity, await resolveTranslations(db, entity, rowIds));

	// hits arrive in MEDIA_REFS order, so the first one to claim a file keeps it
	for (const hit of hits) {
		const mediaId = Number(hit.mediaId);
		if (out.has(mediaId)) continue;
		const ref = MEDIA_REFS[hit.refIndex];
		if (!ref) continue;
		const translated = ref.labelEntity
			? named.get(ref.labelEntity)?.get(Number(hit.rowId))?.[
					ref.labelField ?? "name"
				]
			: undefined;
		// a slide has no name of its own, and "Homepage hero" reads as a place
		out.set(mediaId, translated || hit.label || ref.kind);
	}
}

async function translatedLabels(
	db: DB,
	hits: { type: string; entityId: number }[],
): Promise<Map<string, string>> {
	const byType = new Map<string, Set<number>>();
	for (const hit of hits) {
		const seen = byType.get(hit.type) ?? new Set<number>();
		seen.add(hit.entityId);
		byType.set(hit.type, seen);
	}
	const out = new Map<string, string>();
	for (const [type, idSet] of byType) {
		const target = TRANSLATED_ENTITIES[type];
		if (!target) {
			for (const id of idSet) out.set(`${type}:${id}`, `${type} #${id}`);
			continue;
		}
		for (const row of await db
			.select({ id: target.id, label: target.label })
			.from(target.table)
			.where(and(eq(target.tenant, TENANT), inArray(target.id, [...idSet]))))
			out.set(
				`${type}:${Number(row.id)}`,
				String(row.label ?? "") || target.kind,
			);
	}
	return out;
}

type Wanted = { id: number; url: string };

/** `(values (id, like-pattern), …)`, the left side of every text-sink join. */
const urlValues = (wanted: Wanted[]) =>
	sql`(values ${sql.join(
		wanted.map((r) => sql`(${r.id}, ${`%${escapeLike(r.url)}%`})`),
		sql`, `,
	)})`;

// u.column1 is the media id, u.column2 its ready-made pattern: sqlite names a
// VALUES list's columns, and takes no alias list to rename them
const embedsUrl = (column: SQLiteColumn) =>
	sql`${column} LIKE u.column2 ESCAPE '\\'`;

/**
 * At most one row per media id, whatever the content weighs: min() makes the
 * other selected columns come from the row that produced it (a documented sqlite
 * rule), so the body itself never leaves the database.
 */
async function labelFromTextRef(
	db: DB,
	ref: MediaTextRef,
	wanted: Wanted[],
	out: Map<number, string>,
): Promise<void> {
	const rows = await db.all<{
		mediaId: number;
		rowId: string;
		label: string | null;
	}>(sql`
		select u.column1 as mediaId,
		       min(${ref.rowId}) as rowId,
		       ${ref.label ?? sql`null`} as label
		from ${ref.table} cross join ${urlValues(wanted)} u
		on ${embedsUrl(ref.column)}
		where ${ref.tenant} = ${TENANT}
		  ${ref.keys ? sql`and ${inArray(ref.rowId, ref.keys)}` : sql``}
		group by u.column1
	`);
	for (const row of rows) {
		const mediaId = Number(row.mediaId);
		if (out.has(mediaId)) continue;
		const place = ref.place?.(String(row.rowId));
		out.set(mediaId, place || row.label || ref.kind);
	}
}

/** The same, over every translated body at once. */
async function labelFromTranslations(
	db: DB,
	wanted: Wanted[],
	out: Map<number, string>,
): Promise<void> {
	const rows = await db.all<{
		mediaId: number;
		entityType: string;
		entityId: number;
	}>(sql`
		select u.column1 as mediaId,
		       min(${translations.id}),
		       ${translations.entityType} as entityType,
		       ${translations.entityId} as entityId
		from ${translations} cross join ${urlValues(wanted)} u
		on ${embedsUrl(translations.value)}
		where ${translations.tenantId} = ${TENANT}
		group by u.column1
	`);
	if (!rows.length) return;
	const labels = await translatedLabels(
		db,
		rows.map((r) => ({ type: r.entityType, entityId: Number(r.entityId) })),
	);
	for (const row of rows) {
		const label = labels.get(`${row.entityType}:${Number(row.entityId)}`);
		if (label && !out.has(Number(row.mediaId)))
			out.set(Number(row.mediaId), label);
	}
}

const stillUnlabelled = (
	rows: MediaRow[],
	out: Map<number, string>,
): Wanted[] => rows.filter((r): r is Wanted => !!r.url && !out.has(r.id));

/**
 * One label per media row: the first record that references it. Batched, because
 * the library asks for a whole page of unnamed files at once, and it stops as
 * soon as every row has one — a cover is found on the first reference of thirteen.
 */
export async function mediaUsedBy(
	db: DB,
	rows: MediaRow[],
): Promise<Map<number, string>> {
	const out = new Map<number, string>();
	if (!rows.length) return out;
	await labelFromForeignKeys(
		db,
		rows.map((r) => r.id),
		out,
	);
	for (const ref of MEDIA_TEXT_REFS) {
		const wanted = stillUnlabelled(rows, out);
		if (!wanted.length) return out;
		await labelFromTextRef(db, ref, wanted, out);
	}
	const wanted = stillUnlabelled(rows, out);
	if (wanted.length) await labelFromTranslations(db, wanted, out);
	return out;
}
