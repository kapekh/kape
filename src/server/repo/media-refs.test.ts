import { is } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

import * as schema from "../schema";
import { MEDIA_REFS } from "./media-refs";

function schemaMediaColumns(): string[] {
	const out: string[] = [];
	for (const table of Object.values(schema)) {
		if (!is(table, SQLiteTable)) continue;
		const config = getTableConfig(table);
		for (const fk of config.foreignKeys) {
			const ref = fk.reference();
			if (getTableConfig(ref.foreignTable).name !== "media") continue;
			for (const column of ref.columns)
				out.push(`${config.name}.${column.name}`);
		}
	}
	return out.sort();
}

const listed = MEDIA_REFS.map(
	(ref) => `${getTableConfig(ref.table).name}.${ref.column.name}`,
).sort();

describe("MEDIA_REFS", () => {
	it("covers every column that references media.id", () => {
		expect(listed).toEqual(schemaMediaColumns());
	});

	it("deletes the row for notNull references and clears the rest", () => {
		for (const ref of MEDIA_REFS) {
			expect(ref.clearBy === "row", `${ref.kind} clearBy`).toBe(
				ref.column.notNull,
			);
		}
	});
});
