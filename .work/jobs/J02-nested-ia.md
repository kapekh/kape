# J02 — Restore the nested IA

Deltas: D08, D12. The architecturally riskiest job. Read all of it before touching anything.

## Scope

The client has now shipped two prototypes asserting nested URLs — `who-we-are/news`,
`media/photo-gallery`, `current-projects/dep/air`. Our router 301s those exact paths to flat
collections, and it does so at **step 1 of `resolveRoute`, before the page lookup**
(`src/server/repo/route.ts:35-36`). The consequence is not cosmetic: an admin cannot create a
page at any of those URLs, because the redirect fires first and the page tree is never consulted.

That directly contradicts the product's central promise, that admins compose the site themselves.

## Files you own

- `src/lib/collections.ts`
- `src/server/repo/route.ts`
- `src/server/schema.ts`
- `drizzle/` (one migration)

You are the only job allowed in `schema.ts` and `drizzle/` right now. J09 and J10 are queued
behind you.

## Do

1. **D08 — stop swallowing authorable paths.** Reorder `resolveRoute` so the page-tree lookup runs
   before `legacyRedirect`. An existing page wins; the redirect stays as the fallback for URLs
   nobody has authored, so old inbound links still resolve. Keep the 301 semantics for the
   fallback path.
2. **D12 — sub-projects.** `projects` has no `parentId` (`src/server/schema.ts:619-631`) and
   `route.ts:48` rejects a record slug containing a slash, so `current-projects/dep/air` cannot
   resolve. Add `parentId`, generate one migration, and allow a two-segment record slug for
   projects only.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors.** It passes clean on `main` as of
`ba0c534`, so any type error during your run is yours.

1. `bun run test` passes, 3 of 3.
2. `bun run db:generate` produces exactly one new migration; `bun run db:migrate` applies clean on
   a scratch copy of the DB. Never migrate a database you did not create for this job.
3. A page authored at `who-we-are/news` resolves to that page. Demonstrate it — seed or create the
   row, hit the URL, paste the result.
4. `who-we-are/news` with **no** authored page still 301s to `/news`. Demonstrate it.
5. A project with a `parentId` resolves at `current-projects/<parent>/<child>`. Demonstrate it.
6. Every URL in `LEGACY_REDIRECTS` still resolves to something that is not a 404. List all seven
   with their outcome.
7. `bunx biome check` on your four owned paths: no new errors.

## Out of scope

Admin UI for choosing a parent project. Nav/menu editing. The section catalogue. Redesigning the
collection concept — flat collections stay, they just stop pre-empting the page tree.

## Stop conditions

- Reordering breaks any existing route: stop, report which, do not force it.
- The migration wants to drop or rewrite a column: stop and report. Additive only.
- You need a schema change beyond `parentId`: stop, it belongs to J09.
