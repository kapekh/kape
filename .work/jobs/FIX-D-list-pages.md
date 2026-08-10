# FIX-D - the list pages

Nine near-identical pages with the same six defects each. Evidence: `.work/ui-audit/R1.md` rows H2
(the table half), M12, L17, L18, and `.work/ui-audit/STATIC.md` rows 1, 3, 8, 9, 10, 19.

## Files you own

- `src/routes/admin.pages.index.tsx`
- `src/routes/admin.posts.index.tsx`
- `src/routes/admin.projects.index.tsx`
- `src/routes/admin.people.index.tsx`
- `src/routes/admin.partners.index.tsx`
- `src/routes/admin.schools.index.tsx`
- `src/routes/admin.offices.index.tsx`
- `src/routes/admin.donors.index.tsx`
- `src/routes/admin.users.index.tsx`
- `src/routes/admin.campaigns.index.tsx`
- `src/lib/format.ts` and `src/lib/format.test.ts` - new
- New shared list components under `src/components/admin/` **only if you create them** - name them
  in your report

Not yours: `src/routes/admin.tsx`, `src/routes/admin.media.tsx`, `src/routes/admin.forms.index.tsx`,
`src/routes/admin.donations.index.tsx`, anything in `src/components/admin/` that already exists.
`ActionMenu.tsx` and `form-ui.tsx` were changed by another pane this round - **read their current
props before you use them**, do not edit them.

## Do

1. **STATIC 1 - a failed query leaves a permanent "Loading…".** Roughly 30 screens have no error
   branch: if the list query rejects, the page says "Loading…" forever. Give each list three real
   states - pending, error with a retry, and loaded.
2. **STATIC 3 - a refused delete looks like a successful one.** The row is dropped optimistically
   and the failure is swallowed, so the row reappears only on reload. Surface the failure and put
   the row back. This is the highest-value item in the job: it is silent data confusion.
3. **STATIC 8 / empty states.** `admin.projects.index.tsx:60` and others render an empty table with
   nothing in it. Every list gets an empty state that says what the thing is and offers the create
   action. One shared component, not nine copies.
4. **M12 - no way to find a record.** 39 pages, 26 posts, no search, sort, filter or pagination
   anywhere except Media. Add a search box filtering the loaded rows on the fields a person would
   actually type. Sorting where a column obviously wants it. **No pagination** - not asked for, and
   the row counts do not need it yet.
5. **H2, the table half.** The wrappers are `overflow-hidden`, so below the breakpoint columns are
   clipped with no way to reach them - 70px of a 442px table. Make the wrapper scroll horizontally,
   and make sure the scroll container is focusable so a keyboard can reach the columns too.
6. **L17 - "0 total" while the data is still loading.** The zero is wrong, not pending. Hide the
   count until the query resolves.
7. **L18 - `?type=garbage` renders the raw parameter as the h1** and offers "+ New post" for a type
   that does not exist. Validate the param: unknown falls back to all posts or 404s. Say which you
   chose.
8. **STATIC 9 - every row menu is called "Row actions".** Another pane added a `label` prop to
   `ActionMenu` this round. Pass a per-row name at all your call sites.
9. **STATIC 10 - two date formats and two money formats** for the same values across these pages.
   One `fmtDate` and one `fmtMoney` in `src/lib/format.ts`, used everywhere in your files. They take
   the active language rather than hardcoding a locale.
10. **STATIC 19 - `admin.donors.index.tsx:105` prints a URL as text** where
    `admin.partners.index.tsx:116` links it. Link it.

## Acceptance

Paste real output or a screenshot path. Dev server already on `http://localhost:3011`, admin
`admin@kapekh.org` / `kape-admin-2026`. Do not start a second server.

1. `bunx tsc --noEmit` silent; `bun run test` fully green and at least **356 over 37 files**;
   `bun run lint` 8 errors 0 warnings or fewer.
2. **A table of all ten pages** x the six behaviours (error state, empty state, search, overflow,
   count-gating, per-row menu label), each cell `done` or `n/a` with a reason. Ten rows, no gaps.
3. **The refused delete, in a browser.** Force a delete to fail - block the request in the browser
   or delete a record something else points at - and show the row coming back and the failure on
   screen. This is the one that matters; do not report it from the code.
4. **The failed-query state, in a browser.** Block the list request and screenshot what the page
   says. It must not say "Loading…".
5. **H2 in a browser** at 375x812 on `/admin/users`: paste the wrapper's `clientWidth` and
   `scrollWidth` and show it scrolls. It was 70 against 442.
6. **Search**: on `/admin/pages` type a word that matches 1 of 39 rows and paste the row count
   before and after.
7. `src/lib/format.test.ts` covers both formatters including a non-English language.
   **Mutation-test one**: break the locale handling, show the named test failing, restore it.
8. Two screenshots at 1440x900 showing a list page unchanged in its desktop look.

## Out of scope

- Collapsing the nine pages into one component (STATIC 14). Worth doing, but after this round -
  doing it now would mean this job rewrites everything twice.
- Copy drift (STATIC 11). A separate pass with a decided vocabulary.
- Pagination, bulk actions, column customisation. Not asked for.
- Any file not in your list.

## Stop conditions

- A fix needs `ActionMenu.tsx`, `form-ui.tsx` or `admin.tsx`: stop and report the exact edit.
- `bun run test` goes red and you cannot fix it inside your own files: stop and report.
- Never touch `kape.db` in the repo root. The server runs on `.work/scratch/uitest.db`.
- Never run `git` commands that write.
