import { inArray } from "drizzle-orm";

import type { DB } from "../db";
import { media } from "../schema";

/** Attaches `<urlField>` and `<urlField>Width`; the width says which derivatives a `<Picture>` may offer. */
export async function attachMediaUrl<
	T extends Record<string, unknown>,
	U extends string,
>(
	db: DB,
	rows: T[],
	idField: keyof T & string,
	urlField: U,
): Promise<
	(T & { [P in U]: string | null } & {
		[P in `${U}Width`]: number | null;
	})[]
> {
	const ids = [
		...new Set(
			rows
				.map((r) => r[idField] as unknown)
				.filter((x): x is number => typeof x === "number"),
		),
	];
	const found = new Map<number, { url: string | null; width: number | null }>();
	if (ids.length) {
		for (const m of await db
			.select({ id: media.id, url: media.url, width: media.width })
			.from(media)
			.where(inArray(media.id, ids)))
			found.set(m.id, { url: m.url, width: m.width });
	}
	return rows.map((r) => {
		const id = r[idField] as unknown;
		const hit = typeof id === "number" ? found.get(id) : undefined;
		return {
			...r,
			[urlField]: hit?.url ?? null,
			[`${urlField}Width`]: hit?.width ?? null,
		} as T & { [P in U]: string | null } & {
			[P in `${U}Width`]: number | null;
		};
	});
}
