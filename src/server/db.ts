import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { env } from "#/env";
import * as schema from "./schema";

/**
 * Database client: Drizzle ORM over Bun's native SQLite (`bun:sqlite`).
 *
 * Server-only — never import from client/route components. (`bun:sqlite` is a
 * Bun runtime module; vite.config.ts externalises it so the bundler leaves it
 * for Bun to resolve at runtime.)
 */
const sqlite = new Database(env.DATABASE_PATH, { create: true });
// WAL improves concurrent read/write throughput for a CMS workload.
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });

/** The Drizzle client type — use for typing repository function params. */
export type DB = typeof db;

/**
 * Apply any pending migrations from ./drizzle on boot. Synchronous for
 * bun:sqlite, idempotent, and a no-op once everything is applied.
 * Generate new migrations with `bun run db:generate`.
 */
// Foreign keys are disabled DURING migrations — SQLite implements column/FK
// changes by recreating tables and copying rows, which trips self-referential
// FKs (e.g. org_nodes.parentId) when rows are copied child-before-parent. We
// re-enable enforcement for normal runtime queries immediately after.
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
