import { inArray } from "drizzle-orm";

import type { DB } from "../db";
import { media } from "../schema";

const TENANT = 1;

/**
 * Resolve a media-id column on a set of rows into a public URL field, with one
 * batched query. e.g. attachMediaUrl(db, partners, "logoMediaId", "logoUrl").
 */
export async function attachMediaUrl<
	T extends Record<string, unknown>,
	U extends string,
>(
	db: DB,
	rows: T[],
	idField: keyof T & string,
	urlField: U,
): Promise<(T & { [P in U]: string | null })[]> {
	const ids = [
		...new Set(
			rows
				.map((r) => r[idField] as unknown)
				.filter((x): x is number => typeof x === "number"),
		),
	];
	const urls = new Map<number, string | null>();
	if (ids.length) {
		for (const m of await db
			.select({ id: media.id, url: media.url })
			.from(media)
			.where(inArray(media.id, ids)))
			urls.set(m.id, m.url);
	}
	return rows.map((r) => {
		const id = r[idField] as unknown;
		const url = typeof id === "number" ? (urls.get(id) ?? null) : null;
		return { ...r, [urlField]: url } as T & { [P in U]: string | null };
	});
}

export { TENANT };
