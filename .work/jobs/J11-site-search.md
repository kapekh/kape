# J11 — Site search

Deltas: D26, and it gives D15's site map somewhere to point.

The only L-effort job in the backlog, and the only one that is genuinely new capability rather
than closing a gap. Do not start it alongside another large job.

## Files you own

- `src/routes/$lang.search.tsx` (new) — **not** `routes/search.tsx`, see below
- `src/server/repo/search.ts` (new)
- `src/lib/header-defaults.ts`
- the search entry point in `src/components/Header.tsx`. J06 and J21 both owned this file and both
  are committed, so it is free.

## Do

Both prototypes put a search box in the site chrome. Ours renders a "Search" label linked at
`settings.header_search_link` (`Header.tsx:419-426`); theirs submits a query but only routes to
`/sitemap?q=`. Neither actually searches. The client's intent is plainly a working search box.

1. A search repo module over pages, posts, projects and documents.
2. A results route with the query in the URL, so results are linkable and shareable.
3. Wire the header entry point to it.

Two things about the chrome link that will otherwise waste your afternoon:

- **Every public page is language-prefixed, including ones with their own route file.** J21 moved
  `contact` and `donate` under `$lang.` for exactly this reason, so your route file is
  `$lang.search.tsx` and its id is `/$lang/search`. Copy the non-language-prefix guard from
  `$lang.contact.tsx` — `/$lang/search` also matches `/foo/search`, which must 301 to
  `/en/foo/search` the way `$.tsx` does for everything else.
- **The header hides the Search link today, on purpose.** `header_search_link` defaults to
  `/sitemap.xml`, and J21 added an `isPageHref` predicate so a labelled control never hands a reader
  a machine file. Point the default at `/search` in `src/lib/header-defaults.ts` and the link comes
  back on its own, language-prefixed, via `localizedHref`. Do not weaken the predicate.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors.** It passes clean on `main` as of
`1dd8f29`, so any type error during your run is yours.

1. `bun run test` passes, **16 of 16 across 5 files**, plus whatever you add. Do not trust an older
   contract's "3 of 3".
2. Searching a term you know exists returns the record containing it. Name the term and paste the
   result.
3. Searching in Khmer returns Khmer content. Content is bilingual at the record level via the
   `translations` table — a search that only reads English columns is half a feature and a fail.
4. `/km/search?q=…` results stay in Khmer and every result href is a `/km/…` URL. The site is
   path-prefixed; there is no `?lang=` param any more, whatever a stale comment in `lib/i18n.tsx`
   says.
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

- **FTS5.** The schema lane is free now — J02, J09 and J10 are all committed and the migration lane
  is at `0016` — but reach for a virtual table only if a parameterised `LIKE` over `translations`
  demonstrably will not do. This site is a few hundred rows. If you conclude you need FTS5, stop and
  report before generating anything, because **a new migration file migrates `kape.db` by itself**:
  `db.ts` runs `migrate()` on boot and vite restarts the SSR module on any file change, so a
  migration lands in the real database within a second of `db:generate` writing it. Stop every dev
  server first or do not generate.

## Traps in this repo, all paid for already

- **Never run against `kape.db`.** Copy it with `VACUUM INTO`, never `cp` — WAL mode, a bare copy
  loses recent writes and fails with misleading FK errors. Point `DATABASE_PATH` at the copy and
  prove `kape.db` is unchanged by md5 at the end.
- **`SSG_CACHE=off` for any verification run.** `resolveRouteCached` reads through a `render_cache`
  table with a 7-day TTL, so a correct repo change looks like it never landed. No error, no log line.
- **Export `PORT` to match `--port`.** SSR self-fetches tRPC at `http://localhost:${PORT ?? 3000}`;
  without it you get a whole-page 500, or you silently measure another pane's database.
- `agent-browser press Enter` never activates a focused `<button>` — harness bug, not yours. Use
  `press Space` to prove keyboard activation.
- Assume you cannot log in to `/admin`; the permission classifier has denied it to most workers.
  Nothing in this job needs it, so do not design an acceptance step around it.
- Do not touch the worklog. Findings go in `.work/j11-report.md`; the orchestrator promotes them
  after verifying.
