# J11 — Site search

Deltas: D26, and it gives D15's site map somewhere to point.

The only L-effort job in the backlog, and the only one that is genuinely new capability rather
than closing a gap. Do not start it alongside another large job.

## Files you own

- `src/routes/search.tsx` (new)
- `src/server/repo/search.ts` (new)
- the search entry point in `src/components/Header.tsx` — **coordinate with J06**, which owns that
  file. If J06 is in flight, wait for it.

## Do

Both prototypes put a search box in the site chrome. Ours renders the label and links it at a
configurable URL (`src/components/Header.tsx:267-271`); theirs submits a query but only routes to
`/sitemap?q=`. Neither actually searches. The client's intent is plainly a working search box.

1. A search repo module over pages, posts, projects and documents.
2. A results route with the query in the URL, so results are linkable and shareable.
3. Wire the header input to it.

## Acceptance

1. `bun run test` passes, 3 of 3.
2. Searching a term you know exists returns the record containing it. Name the term and paste the
   result.
3. Searching in Khmer returns Khmer content. Content is bilingual at the record level via the
   `translations` table — a search that only reads English columns is half a feature and a fail.
4. `?lang=km` results stay in Khmer and link to `?lang=km` URLs.
5. Empty query and no-results both render a deliberate state, not a crash or a blank page.
6. Unpublished and non-public records never appear in results. Demonstrate with one of each —
   this is an access-control boundary, not a filter.
7. The query is parameterised. Paste the query construction so injection can be ruled out by
   reading it.
8. Results are paginated or capped. State which, and the limit.
9. Leave one runnable test behind covering ranking or filtering — this is the only job in the
   backlog with non-trivial logic and no existing test.
10. `bunx biome check` on your files: clean, they are new.

## Out of scope

The site map page (J01 and J03). Search-as-you-type. Any external search service — this is a
SQLite app, keep it in the database.

## Stop conditions

- Full-text search needs an FTS5 virtual table and therefore a migration: stop and report, schema
  is contended by J02, J09 and J10.
- J06 is still working in `Header.tsx`: wait.
