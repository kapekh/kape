import { sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/** `%` and `_` are LIKE wildcards; someone typing or storing them means the characters. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// the column is a reference and the pattern a bound parameter; Drizzle never inlines it
export const containsText = (column: SQLiteColumn, text: string) =>
	sql`${column} LIKE ${`%${escapeLike(text)}%`} ESCAPE '\\'`;
