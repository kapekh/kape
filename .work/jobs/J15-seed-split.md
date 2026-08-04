# J15 — Split the seed so content work can run in parallel

Mechanical, no behaviour change. **Runs alone** — it rewrites the file every content job needs.
Do this before J16, J17 or J18.

## Why

`src/server/seed.ts` is 1908 lines and every remaining content job writes into it. Left as one
file, J16, J17 and J18 are strictly sequential and each one's diff is unreadable against the
others. Split by IA area and they become file-disjoint.

## Files you own

- `src/server/seed.ts` and the new `src/server/seed/` directory
- `package.json` only if the `db:seed` script path must change

## Do

1. Split into `src/server/seed/` by area, keeping `seed.ts` (or `seed/index.ts`) as the entry
   point that composes them in the existing order. Suggested split, adjust to what the file
   actually contains: `nav.ts`, `pages-who-we-are.ts`, `pages-what-we-do.ts`, `pages-media.ts`,
   `pages-opportunities.ts`, `projects.ts`, `records.ts` (people, partners, posts), `media.ts`,
   `helpers.ts` (`doc`, `addTranslations`, `createPicsumMedia`, `alreadySeeded`).
2. Order of insertion must not change. Foreign keys depend on it — nav references pages, sections
   reference media.
3. No content edits. Not one word of copy changes in this job.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 3 of 3.

1. `bun run db:seed` against a **fresh empty database** produces a row-for-row identical result to
   the same command on `main` before the split. Dump both and diff them: every table's row count
   and every `translations` row must match. This is the whole acceptance — a split that changes
   the seed output is a failed split.
2. `bun run db:seed` against an already-seeded database still no-ops exactly as before
   (`alreadySeeded`).
3. `kape.db` is untouched. Prove it by querying it, not by hashing it — it is WAL-mode and the
   main file stays byte-identical through writes.
4. Every new module is imported and reachable. No orphaned file, no dead export.
5. `bunx biome check` on your files: no new errors.

## Out of scope

Adding content. Changing the content model. Touching `schema.ts` or `drizzle/`.

## Stop conditions

- The file resists a clean split because ordering is implicit and fragile: stop and report the
  shape you found rather than forcing it. A wrong split silently corrupts every future seed.
