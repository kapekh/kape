import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { env } from "#/env";
import * as schema from "./schema";

// libSQL speaks to a local SQLite file (DATABASE_PATH) or, when TURSO_DATABASE_URL
// is set, a managed database such as KOOMPI Cloud's. Same SQL either way: a
// cms.db copied off the old host can be loaded into Turso unchanged.
const url = env.TURSO_DATABASE_URL ?? `file:${env.DATABASE_PATH}`;
const client = createClient({ url, authToken: env.TURSO_AUTH_TOKEN });

if (url.startsWith("file:")) {
	// WAL improves concurrent read/write throughput for a CMS workload.
	await client.execute("PRAGMA journal_mode = WAL;");
	await client.execute("PRAGMA foreign_keys = ON;");
}

export const db = drizzle(client, { schema });

/** The Drizzle client type — use for typing repository function params. */
export type DB = typeof db;

/** A transaction handle, for helpers that run inside db.transaction(). */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** Either the database or a transaction on it. */
export type DBOrTx = DB | Tx;

/** Where the database lives, for messages to an operator. Never includes the token. */
export const DB_LOCATION = env.TURSO_DATABASE_URL ?? env.DATABASE_PATH;

// client.migrate runs the batch with foreign keys off: sqlite alters a table by
// recreating and copying it, which trips a self-referential fk when a child is
// copied before its parent
try {
	await migrate(db, { migrationsFolder: "./drizzle" });
} catch (err) {
	console.error("[db] Migration failed on startup:", err);
	throw new Error(
		`Database migrations failed (${DB_LOCATION}). The app cannot start with a schema mismatch.`,
		{ cause: err },
	);
}
