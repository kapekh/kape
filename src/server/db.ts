import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { env } from "#/env";
import * as schema from "./schema";

// bun:sqlite is a Bun runtime module; vite.config.ts externalises it so Bun resolves it at runtime
const sqlite = new Database(env.DATABASE_PATH, { create: true });
// WAL improves concurrent read/write throughput for a CMS workload.
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });

/** The Drizzle client type — use for typing repository function params. */
export type DB = typeof db;

// sqlite alters a table by recreating and copying it, which trips a self-referential fk when a child is copied before its parent
try {
	sqlite.exec("PRAGMA foreign_keys = OFF;");
	migrate(db, { migrationsFolder: "./drizzle" });
} catch (err) {
	console.error("[db] Migration failed on startup:", err);
	throw new Error(
		`Database migrations failed (DATABASE_PATH=${env.DATABASE_PATH}). The app cannot start with a schema mismatch.`,
		{ cause: err },
	);
} finally {
	sqlite.exec("PRAGMA foreign_keys = ON;");
}

export { schema };
