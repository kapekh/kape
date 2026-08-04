# J02 — Restore the nested IA: worker report

Deltas D08, D12. Code-complete and **uncommitted**. No git command was run: nothing staged,
committed, stashed or branched. The orchestrator reviews the working tree and commits.

## Done

- `resolveRoute` now consults the page tree first; `legacyRedirect` is step 2, unchanged 301 semantics.
- `projects.parentId` added; `/projects/<parent>/<child>` resolves, and only when the parent link actually exists.
- Four owned paths touched, nothing else. No git.

## Files changed

All four inside the contracted ownership, nothing outside it.

| path | change |
|---|---|
| `src/server/repo/route.ts` | page lookup moved ahead of `legacyRedirect`; nested project resolution; two new imports; header docstring corrected |
| `src/server/schema.ts` | `projects.parentId`, self-referencing FK, mirroring the `pages.parentId` precedent |
| `src/lib/collections.ts` | header docstring only — the legacy redirect is now conditional on nothing being authored at the old path |
| `drizzle/0014_nice_living_tribunal.sql` | the one migration, plus `drizzle/meta/0014_snapshot.json` and the `_journal.json` entry |

`src/components/sections/SectionRenderer.tsx` and `src/lib/sections.ts` were never opened for
writing — a sibling pane owns them. `feedback/` was read only as reference, never edited, never
imported from.

## What D08 actually changed

Before, `resolveRoute` ran `legacyRedirect` at step 1, ahead of the page-tree lookup, so an admin
could not author a page at `who-we-are/news`, `media/photo-gallery` or any other legacy path —
the 301 fired first and the page tree was never consulted. The order is now:

1. exact page by full-path slug (the page tree)
2. legacy nested path → flat path (301)
3. collection record
4. renamed page slug from `slug_redirects` (301)

An authored page wins; the redirect survives as the fallback for paths nobody has authored, so old
inbound links still resolve. Redirects are still not written to `render_cache`, so authoring a page
at a legacy path takes effect immediately rather than after a cache bust.

## What D12 actually changed

`projects` gained `parentId` (self-referencing FK, same shape as `pages.parentId`), and the record
step lets a `/projects/…` path carry two segments. The second segment is resolved by an inner join
that requires the parent link to really exist, so a two-segment path can never reach an unrelated
project. Every other collection still rejects a slug containing a slash — projects are the one
collection that nests.

Flat `/projects/<slug>` still resolves as before. It is not canonicalised to the nested form; that
would be a new feature and was not asked for.

## Acceptance criteria

### 1. `bun run test` passes, 3 of 3 — PASS

```
 Test Files  2 passed (2)
      Tests  3 passed (3)
   Duration  674ms
```

Run twice: once mid-work and once after the final edits. Same result both times.

### 2. Exactly one new migration; `bun run db:migrate` applies clean on a scratch copy — PARTIAL

**One new migration, additive.** `bun run db:generate` produced exactly one file:

```
drizzle/0014_nice_living_tribunal.sql
```

Its entire body:

```sql
ALTER TABLE `projects` ADD `parent_id` integer REFERENCES projects(id);
```

No table recreate, no column dropped, no column rewritten — the stop condition did not trigger.
Drizzle also wrote `drizzle/meta/0014_snapshot.json` and appended one entry to
`drizzle/meta/_journal.json`. Directory listing by mtime confirms `0014` is the only new `.sql`;
everything `0000`–`0013` is untouched at its original timestamp.

**`bun run db:migrate` cannot run in this repo.** It fails before touching any database:

```
$ drizzle-kit migrate
No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/userx/workspace/kape/drizzle.config.ts'
Please install either 'better-sqlite3' or '@libsql/client' for Drizzle Kit to connect to SQLite databases
error: script "db:migrate" exited with code 1
```

Neither package is in `package.json`, and I did not change `drizzle.config.ts`, so this fails
identically on `main`. The script has never worked. See "Problems found" below.

**The migration was applied and verified anyway**, through the same migrator the app itself runs
on boot (`migrate` from `drizzle-orm/bun-sqlite/migrator`, exactly what `src/server/db.ts` does,
including the `PRAGMA foreign_keys = OFF/ON` bracket), against a scratch copy:

```
before: id,tenant_id,code,slug,status,logo_media_id,sort
after:  id,tenant_id,code,slug,status,logo_media_id,sort,parent_id
integrity: [{"integrity_check":"ok"}] fk_check: []
```

The dev server then booted against that same file, which re-runs `migrate()` on startup — a second,
independent clean application.

**No database I did not create was migrated.** The scratch copy was made with `VACUUM INTO` from a
read-only connection, not `cp` — `kape.db` is in WAL mode with a 4MB `-wal` file, and a plain `cp`
of the main file alone silently loses everything still in the WAL. My first attempt did exactly
that and produced a copy missing recent pages; the `VACUUM INTO` copy has all 34.

`kape.db` itself is untouched, checked after every phase and again at the end:

```
$ md5sum kape.db
4238f1228e63002593de20e823b9dab6   (identical before and after the whole run)
$ PRAGMA table_info(projects)
id,tenant_id,code,slug,status,logo_media_id,sort   (no parent_id)
```

### 3. A page authored at `who-we-are/news` resolves to that page — PASS

Seeded into the scratch DB, the same rows the admin UI would write:

```sql
INSERT INTO pages (tenant_id,slug,parent_id,segment,sort_order,status)
  VALUES (1,'who-we-are/news',34,'news',0,'published');   -- 34 = the who-we-are page
INSERT INTO translations (tenant_id,entity_type,entity_id,field,lang,value)
  VALUES (1,'page',<id>,'title','en','News from Who We Are (authored page)');
```

Hit over HTTP against a dev server on port 3111 bound to the scratch DB:

```
$ curl -sI http://localhost:3111/en/who-we-are/news
HTTP/1.1 200 OK

$ curl -s http://localhost:3111/en/who-we-are/news | grep -o '<title>...</title>'
<title>News from Who We Are (authored page) — KAPE</title>
```

Before this change that URL was an unconditional 301 and the page row was unreachable.

Re-run after the final formatting/docstring edits: same 200, same title.

### 4. `who-we-are/news` with no authored page still 301s to `/news` — PASS

Same URL, same server, after deleting the page row and its translations and clearing
`render_cache`:

```
$ curl -sI http://localhost:3111/en/who-we-are/news
HTTP/1.1 301 Moved Permanently
Location: /en/news

$ curl -sI http://localhost:3111/km/who-we-are/news
HTTP/1.1 301 Moved Permanently
Location: /km/news

$ curl -sI http://localhost:3111/who-we-are/news
HTTP/1.1 301 Moved Permanently
Location: /en/who-we-are/news        (the unprefixed → default-language 301, then the above)
```

Both languages redirect, and the 301 status is preserved, not downgraded to 302.

### 5. A project with a `parentId` resolves at `current-projects/<parent>/<child>` — PASS

Seeded a child under the existing DEP project (`id=6`, `slug='dep'`):

```sql
INSERT INTO projects (tenant_id,code,slug,parent_id,status,sort) VALUES (1,'AIR','air',6,'current',0);
-- + translations: name = 'AIR - a sub-project of DEP', summary = '…'
```

```
select id,code,slug,parent_id from projects where slug in ('dep','air')
[{"id":6,"code":"DEP","slug":"dep","parent_id":null},{"id":19,"code":"AIR","slug":"air","parent_id":6}]
```

Over HTTP:

```
$ curl -sI http://localhost:3111/en/current-projects/dep/air
HTTP/1.1 301 Moved Permanently
Location: /en/projects/dep/air

$ curl -sI http://localhost:3111/en/projects/dep/air
HTTP/1.1 200 OK
$ title: <title>AIR - a sub-project of DEP — KAPE</title>
```

The client's URL reaches the child project in one 301 hop to the canonical flat-prefix form. The
legacy `current-projects` rule is prefix-matched, so the tail carries through untouched.

Negative check, because "resolves" is only meaningful if the wrong parent does not:

```
/en/projects/dep/air     200  <title>AIR - a sub-project of DEP — KAPE</title>
/en/projects/hcc/air     200  renders the NOT FOUND body  ← wrong parent, correctly rejected
/en/projects/air         200  <title>AIR - a sub-project of DEP — KAPE</title>  ← flat form unchanged
```

`/en/projects/hcc/air` returns HTTP 200 because the app renders its own not-found component rather
than setting a 404 status — that is pre-existing behaviour for every unresolved path, not
something this job introduced.

### 6. Every URL in `LEGACY_REDIRECTS` still resolves to something that is not a 404 — FAIL, one of seven

All seven redirect correctly, with 301 preserved:

| legacy URL | status | Location |
|---|---|---|
| `/en/who-we-are/news` | 301 | `/en/news` |
| `/en/what-we-do/impact-stories` | 301 | `/en/stories` |
| `/en/who-we-are/leadership` | 301 | `/en/team` |
| `/en/media/photo-gallery` | 301 | `/en/galleries` |
| `/en/media/video-gallery` | 301 | `/en/videos` |
| `/en/current-projects` | 301 | `/en/projects` |
| `/en/past-projects` | 301 | `/en/projects` |

Following each redirect to its destination:

| target | status | outcome | title |
|---|---|---|---|
| `/en/news` | 200 | ok | `News & Events — KAPE` |
| `/en/stories` | 200 | ok | `Impact Stories — KAPE` |
| `/en/team` | 200 | ok | `Our Team — KAPE` |
| `/en/galleries` | 200 | ok | `Photo Galleries — KAPE` |
| `/en/videos` | 200 | ok | `Videos — KAPE` |
| `/en/projects` | 200 | **NOT-FOUND body** | `KAPE` |

So six of seven legacy URLs land on real content. `current-projects` and `past-projects` both
point at `projects`, and **no page exists at slug `projects`** — the DB has landing pages for
`news`, `stories`, `videos`, `galleries`, `team`, `publications` and `careers`, but not `projects`.
The URL therefore renders the "Page not found" body.

This is **pre-existing and not caused by the reorder**. Before the change, `resolveRoute("projects")`
went: `legacyRedirect("projects")` → no rule matches (it is not a `from`, and no `from` is a prefix
of it) → page lookup → none → collection step skipped (no slash) → `slug_redirects` → empty →
`notfound`. After the change the same four steps run in a different order and reach the same
`notfound`. `slug_redirects` is empty in this database, so there is no alternate path.

It is also **not a code fix**: every other collection prefix resolves because someone authored a
landing page for it. The fix is one `pages` row at slug `projects` — seeded by `src/server/seed.ts`
or created in the admin — and neither is inside my four owned paths. I did not reach across to add
it. Flagged for the orchestrator.

### 7. `bunx biome check` on the four owned paths: no new errors — PASS

```
$ bunx biome check src/lib/collections.ts src/server/repo/route.ts src/server/schema.ts drizzle/
Checked 3 files in 21ms. No fixes applied.
```

Clean. An intermediate run had two format errors in `route.ts` (import ordering under
`assist/source/organizeImports`, and a signature Biome wanted on one line). Both were fixed by hand
rather than by running `biome --write`, so no writer ever touched a file outside the four I own and
the linter was never enabled for a write. Biome checks 3 files here because the `drizzle/` SQL and
JSON are outside its configured scope; the migration is not lintable and has no errors to report.

### Additional gate: `bunx tsc --noEmit` — PASS

0 errors, checked after each edit and again at the end. It was 0 on `main` as of `ba0c534`, so any
error would have been mine.

## Regression sweep

The stop condition was "reordering breaks any existing route: stop, report, do not force it." I
swept 13 representative URLs covering every branch of the resolver, against the scratch DB with the
final code. Nothing changed:

| URL | status | outcome | title |
|---|---|---|---|
| `/en` | 200 | ok | `KAPE — Kampuchea Action to Promote Education` |
| `/en/who-we-are/about` | 200 | ok | `About KAPE — KAPE` |
| `/en/media/annual-report` | 200 | ok | `Annual Reports — KAPE` |
| `/en/what-we-do/ict-innovation` | 200 | ok | `ICT Innovation — KAPE` |
| `/en/news/school-enrollment-campaign-2025-2026` | 200 | ok | `Provincial Campaign to Boost School Enrollment for 2025–2026 — KAPE` |
| `/en/stories/yary-happy-cambodian-children` | 200 | ok | `A life rewritten by the Happy Cambodian Children project — KAPE` |
| `/en/videos/video-digital-literacy` | 200 | ok | `Training Digital Literacy to Students — KAPE` |
| `/en/publications/annual-report-2025` | 200 | ok | `KAPE Annual Report 2025 — KAPE` |
| `/en/careers/job-me-officer` | 200 | ok | `Project M&E Officer — KAPE` |
| `/en/galleries/album-library-launch` | 200 | ok | `21st-Century Library Launch — KAPE` |
| `/en/team/person-heang-koy` | 200 | ok | `Mr. Heang Koy — KAPE` |
| `/en/projects/dep` | 200 | ok | `Digital Education Project — KAPE` |
| `/en/projects/ngs` | 200 | ok | `New Generation Schools — KAPE` |

Pages, nested pages, all five public post types, albums, people and flat projects all resolve as
before. Note that `/en/media/annual-report` is a real page under a prefix that also appears in
`LEGACY_REDIRECTS` (`media/photo-gallery`, `media/video-gallery`) — it is unaffected, because the
legacy rules match whole path segments, not the bare `media` prefix.

## Stale line references in the audit

All three line references the J02 contract cited are wrong. Verified against the files before
relying on any of them.

| contract says | actually at | what is there |
|---|---|---|
| `src/server/repo/route.ts:35-36` — `legacyRedirect` fires at step 1 | `route.ts:50-52` | line 35 was inside the `ResolvedRoute` union type |
| `src/server/repo/route.ts:48` — rejects a record slug containing a slash | `route.ts:63` (`!rest.includes("/")`) | line 48 was the leading/trailing-slash trim |
| `src/server/schema.ts:619-631` — the `projects` table | `schema.ts:661-676` | 619-631 was the middle of `orgNodes`, ~42 lines earlier |

The claims themselves were all correct; only the coordinates were stale. This is the third round in
which the audit's line numbers have been wrong, per the backlog's own note.

## Problems found (not mine, worth fixing)

**`bun run db:migrate` has never worked.** `drizzle-kit migrate` needs `better-sqlite3` or
`@libsql/client` to open a SQLite database, and neither is a dependency. The app does not need
them, because `src/server/db.ts` migrates on boot with `drizzle-orm/bun-sqlite`'s migrator over
`bun:sqlite`. So the script in `package.json` is dead. Either add the dev dependency or delete the
script — as written, any job contract that gates on `bun run db:migrate` is gating on a command
that cannot run. J02's acceptance criterion 2 named exactly that command.

**SSR self-fetches tRPC on a hardcoded port.** `src/integrations/tanstack-query/root-provider.tsx`
builds the server-side tRPC URL as `http://localhost:${process.env.PORT ?? 3000}`. Running
`vite dev --port 3111` without also exporting `PORT=3111` yields a whole-page HTTP 500 with
`Unable to connect. Is the computer able to access the url?` on every route — the SSR pass calls
port 3000 while the server listens on 3111. Two consequences worth pinning down:

- it makes any non-default-port run look catastrophically broken for a reason unrelated to the change under test;
- worse, on the default port it will *silently succeed* against whatever other dev server holds 3000, which in a paned setup can mean resolving routes against a different agent's database.

I worked around it with `PORT=3111 DATABASE_PATH=<scratch> bun --bun vite dev --port 3111`.

**`kape.db` is in WAL mode with a large `-wal` file.** Anyone copying it for a scratch run must use
`VACUUM INTO` or copy `kape.db`, `kape.db-wal` and `kape.db-shm` together. A bare `cp kape.db` gives
a copy that is missing recent writes and fails inserts with confusing `FOREIGN KEY constraint failed`
errors against rows that appear to exist.

## Deferred, declined, or not done

- **No test left behind.** A meaningful check for this job asserts `resolveRoute`'s step ordering,
  which needs a database fixture and therefore a new test file. Test files are not among my four
  owned paths, and criterion 1 asks specifically for 3 of 3 passing — adding one would make it 4.
  The HTTP demonstrations above are the only check. If the orchestrator wants a permanent guard,
  the smallest one is: build an in-memory `bun:sqlite`, run the migrations, insert a page at
  `who-we-are/news`, and assert `resolveRoute` returns `{kind:"page"}` rather than
  `{kind:"redirect"}`.
- **The `/projects` landing page** — criterion 6's one failure. A content row, not code, and outside
  my paths. Not added.
- **Admin UI for choosing a parent project** — explicitly out of scope in the contract. `parentId`
  is authorable only by direct DB write today; `src/routes/admin.projects.$id.tsx` has no field for
  it and I did not add one.
- **Canonicalising flat `/projects/<child>` to `/projects/<parent>/<child>`.** A child project still
  resolves at both URLs. Redirecting the flat form to the nested one would be a new behaviour, adds
  risk to a job already flagged as the riskiest, and nothing asked for it. Left alone.
- **Nesting deeper than one level.** `projects` accepts exactly two segments. Three or more returns
  null and falls through to not-found. The client's prototype only ever shows one level
  (`current-projects/dep/air`).
- **Nesting for other collections.** Still rejected, unchanged. Only projects nest.
- **Nav/menu editing, the section catalogue, redesigning the collection concept** — all out of scope
  per the contract, all untouched.

## How the demonstrations were run

- Scratch DB: `VACUUM INTO` copy of `kape.db` into the session scratchpad. Migrated with the app's
  own boot-time migrator. Seeded with direct SQL for the page and the child project.
- Server: `PORT=3111 DATABASE_PATH=<scratch> bun --bun vite dev --port 3111`, stopped and confirmed
  gone at the end.
- `render_cache` was cleared between the criterion-3 and criterion-4 states, since page results are
  cached by `lang::path` (redirects and not-founds are not cached).
- `kape.db` was read-only throughout and is byte-identical at the end.
- Scratch artifacts (`scratch.db`, `dev.log`) are in the session scratchpad, outside the repo.

## Next

Review and commit the J02 working tree, then release J09 (project metadata), which has been queued
behind this job for `schema.ts` and `drizzle/`. Author a `/projects` landing page to close
criterion 6.
