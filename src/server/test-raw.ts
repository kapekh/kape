// tests only: a synchronous bun:sqlite handle on the same local file the app's
// libSQL client opened, for arranging and inspecting rows in one line each.
// Importing ./db first means the file exists and is migrated before this opens it.
import "./db";

import { Database } from "bun:sqlite";

import { env } from "#/env";

if (env.TURSO_DATABASE_URL)
	throw new Error("test-raw reads a local file; unset TURSO_DATABASE_URL");

export const raw = new Database(env.DATABASE_PATH);
