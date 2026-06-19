/**
 * Re-run the page-tree + flat-collection transforms on an existing DB (idempotent).
 * Same logic `db:seed` runs after seeding. Run: bun scripts/apply-tree.ts
 */
import { db } from "../src/server/db";
import { applyTreeMigrations } from "../src/server/migrate-tree";

await applyTreeMigrations(db);
console.log("Tree migrations applied (landings, static pages, home, tree, nav).");
process.exit(0);
