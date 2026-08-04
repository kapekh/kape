# J14 — Content repo follow-ups, from J03

Three things J03 could not do honestly because `src/server/repo/content.ts` was not its file. All
three leave a shipped feature partly inert, so none is optional.

## Files you own

- `src/server/repo/content.ts`
- `src/server/repo/sections.ts` (the `POST_LINK_BASE` map and query wiring only)

## Do

1. **The job table has no employment-type column.** D13 shipped as Position / Location / Deadline
   because `listJobs` (`content.ts:284-316`) returns no such field, and the client's prototype
   shows one. Either add it to the query and to the `postList` `table` layout, or decide the column
   is not wanted and say so — the contract that dropped it did so provisionally, not by choice.
2. **The job table's Apply cell is always empty.** It renders only when `linkBase` is set, and
   `POST_LINK_BASE` has no `job` entry, so every row's Apply column is blank in production. Add
   the entry pointing at the real careers detail route. J03 declined to guess the route.
3. **`publications` resolves to two incompatible shapes.** With a category it goes to
   `listPublications`, which has `downloadCount` but **no cover**. Without one it goes to
   `listPosts`, which has `image` but no `fileUrl` or `downloadCount`. So a category-filtered
   publication page can never show covers, no matter what the renderer does. Reconcile them to one
   shape carrying all four fields.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 3 of 3.

1. A job row renders a working Apply link that reaches a real careers detail page. Click it and
   paste the resolved URL. A link to a 404 is a fail.
2. A category-filtered publication list renders both a cover and a download count on the same
   record. Screenshot it — this is the whole point of item 3.
3. The uncategorised publication list still renders, with the same fields. Show it.
4. Item 1 resolved either way, with the reason stated. If the column is added, the data comes from
   the query rather than being derived in the renderer.
5. Nothing that consumes these repo functions breaks. Name every caller you checked — the
   admin picker at `router.ts:360` and `SectionRenderer`'s publication branches at minimum.
6. `bunx biome check` on your files: no new errors.

## Out of scope

`SectionRenderer.tsx` and `src/lib/sections.ts` beyond whatever a shape change forces. If the
renderer needs more than a field rename, stop and report — that is a second job, not a widening of
this one.

## Stop conditions

- Reconciling the publication shapes needs a schema change: stop and report. `schema.ts` is
  contended.
- The careers detail route does not exist: say so plainly rather than inventing one.
