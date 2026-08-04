# J09 — Project metadata

Delta: D19. **Queued behind J02** — both touch `src/server/schema.ts` and `drizzle/`, and two
concurrent migrations collide.

## Files you own

- `src/server/schema.ts`
- `src/components/ProjectView.tsx`
- `drizzle/` (one migration)
- the projects repo module and its admin editor

## Do

`projects` carries code, slug, status, logo and donors (`schema.ts:619-631`). Every project page
in the client's prototype leads with donor, timeline and target areas —
`feedback/src/data/projectMeta.ts` and `feedback/src/components/ProjectPage.tsx:59-160`. Today an
editor can only bury that in prose, so it cannot be listed, sorted or filtered.

1. Add start date, end date, target areas, and snapshot figures to `projects`.
2. One additive migration.
3. Surface the fields in the admin project editor and in `ProjectView.tsx`.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors.** It passes clean on `main` as of
`ba0c534`, so any type error during your run is yours.

1. `bun run test` passes, 3 of 3.
2. `bun run db:generate` produces exactly one migration; it is additive — no drop, no rename, no
   type change on an existing column. Paste the SQL.
3. `bun run db:migrate` applies clean on a scratch copy of the DB. Never migrate a database you did
   not create for this job.
4. Existing project rows still load with the new columns null. Show one.
5. A project with every new field populated renders it; a project with none renders without empty
   labels or dangling punctuation. Screenshot both.
6. Round-trip through the admin editor: set, save, reload, unchanged.
7. `bunx biome check` on your files: no new errors.

## Out of scope

Sub-projects and `parentId` — J02 owns that. Project list sections — J01 and J03. The map — J10.

## Stop conditions

- J02 has not landed: do not start, the migration will conflict.
- A field is better modelled as a related table than a column: report the trade-off, do not decide
  it alone.
