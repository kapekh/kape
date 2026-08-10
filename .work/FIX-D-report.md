# FIX-D - the list pages

Contract: `.work/jobs/FIX-D-list-pages.md`. Evidence rows: `.work/ui-audit/R1.md` H2 (table half),
M12, L17, L18; `.work/ui-audit/STATIC.md` rows 1, 3, 8, 9, 10, 19.

All ten pages done, all eight acceptance items met. One stop condition hit and not crossed: the copy
for a refused delete lives in `src/lib/save-error.ts`, which is not mine — the exact edit is at the
end.

## What changed

Ten route files, plus three new files.

**New, and named as the contract asks:**

- `src/lib/format.ts` + `src/lib/format.test.ts` — `fmtDate`, `fmtMoney`, `localeFor`.
- `src/components/admin/list-ui.tsx` — the shared list parts. Exports `useListQuery`, `ListStatus`,
  `EmptyState`, `TableScroll`, `ListSearch`, `matchesQuery`, `removeWithRollback`. Named after the
  existing `form-ui.tsx` rather than invented. Deliberately parts, not a `<ListPage>`: STATIC 14 is
  out of scope this round and a full component would have rewritten these files twice.

**Per item:**

1. **STATIC 1, failed query.** `useListQuery` replaces the `loading` boolean with `pending | error |
   ready` and a `reload`. `ListStatus` renders the pending line, or a `role="alert"` panel with the
   reason and a Try again button. Nine of the ten had no `.catch` at all; `admin.schools.index.tsx`
   had a `try/finally` that swallowed the failure and showed an empty table instead, with a comment
   saying so — that is gone.
2. **STATIC 3, refused delete.** `removeWithRollback` drops the row, runs the mutation, and on
   rejection restores the previous array *exactly* (order included, not a re-fetch) and toasts
   `saveErrorMessage(e)`. Every delete on all ten pages goes through it.
3. **STATIC 8, empty states.** One `EmptyState`, ten call sites. Each says what the thing is and
   carries the create action. `admin.projects.index.tsx` had none at all.
4. **M12, search.** `ListSearch` + `matchesQuery` on every page, filtering the loaded rows on the
   fields a person would type. Words are ANDed, so "hun sen" matches a name written the other way
   round. A count (`3 of 39`) sits in an `<output>` next to the box, and a second `EmptyState` covers
   "nothing matches" with a Clear search button. No pagination, as instructed. Sorting: left as-is —
   Pages already sorts by slug and no other column obviously wanted one, so I did not invent any.
5. **H2, table half.** `TableScroll` replaces `overflow-hidden` with `overflow-x-auto` on the same
   element, so the desktop frame is unchanged. It is a `<section>` with an `aria-label` and
   `tabIndex={0}` so a keyboard can reach the hidden columns. `ActionMenu` positions itself `fixed`,
   so it still escapes the new scroll container.
6. **L17, count gating.** The `— N total` subtitles render only when `state === "ready"`.
7. **L18, `?type=garbage`.** **Falls back to all posts** — chosen over a 404 because the sidebar
   links stay working and an editor who mistypes a URL sees their content, not an error. Guarded in
   two places: `validateSearch` drops an unknown type, and the component re-normalises it. Both,
   because on this router version `validateSearch` alone did not strip it — measured, see below.
8. **STATIC 9, row menu names.** `label={`Actions for ${…}`}` at all ten call sites, using the
   `label` prop the other pane added. Verified distinct per row.
9. **STATIC 10, one date and one money format.** `admin.users.index.tsx` had a local `fmtDate` with
   `toLocaleDateString(undefined, …)`; `admin.campaigns.index.tsx` had a local `money` pinned to
   `Intl.NumberFormat("en-US", …)`. Both now call `src/lib/format.ts` with the active language from
   `useLang()`. `en` maps to `en-US` and `km` to `km-KH`, so **both screens look exactly as they did**
   in English and Khmer now works; unmapped codes pass through to Intl untouched. A bad currency code
   from the database degrades to `CODE 1,500` instead of throwing a RangeError and blanking the row.
10. **STATIC 19, donor URL.** Now the same anchor as partners — `target="_blank"`,
    `rel="noopener noreferrer"`.

### Not done, and why

- **`+ New new`** on `/admin/posts?type=news`: the singular is derived by stripping a trailing `s`
  from the label, so "News" becomes "New". This predates the job (the old code had the identical
  expression) and picking singulars is exactly the decided-vocabulary pass the contract defers as
  STATIC 11. Left alone, flagged here.
- **Sorting controls**: see item 4.

## Acceptance

### 1. Gates

```
=== TSC ===
0
=== TEST ===
      Tests  369 passed (369)
   Start at  11:14:35
   Duration  9.05s (transform 10.21s, setup 0ms, import 22.54s, tests 16.61s, environment 8.95s)

=== LINT ===
Checked 281 files in 249ms. No fixes applied.
Found 8 errors.
```

`bunx tsc --noEmit` prints nothing (0 lines). Tests **369 over 38 files**, against a floor of 356 over
37. Lint 8 errors, 0 warnings — the same 8 `noArrayIndexKey` errors as the baseline, none in my files
(`bunx biome check` over my thirteen files: "Checked 13 files. No fixes applied.").

Baseline before I started, for comparison: 356 tests / 37 files, tsc silent, lint 8 errors 0 warnings.

### 2. Ten pages x six behaviours

Every cell measured in the browser, not read off the source. "Per-row menu" gives distinct
`aria-label`s counted against row count.

| page | error state | empty state | search | overflow | count gating | per-row menu |
|---|---|---|---|---|---|---|
| `/admin/pages` | done | done | done — "Search pages" | done — `SECTION`, tabIndex 0, `overflow-x: auto`, "Pages" | n/a — subtitle carries no count | done — 40/40 distinct |
| `/admin/posts` | done | done | done — "Search posts" | done — "All posts" | n/a — no count shown | done — 26/26 distinct |
| `/admin/projects` | done | done | done — "Search projects" | done — "Projects" | n/a — no subtitle | done — 18/18 distinct |
| `/admin/people` | done | done | done — "Search people" | done — "People" | done — "…— 7 total." only when ready | done — 7/7 distinct |
| `/admin/partners` | done | done | done — "Search partners" | done — "Partners" | done — "…— 5 total." | done — 5/5 distinct |
| `/admin/schools` | done | done | done — "Search schools" | done — "Schools" | done — "…— 5 total." | done — 5/5 distinct |
| `/admin/offices` | done | done | done — "Search offices" | done — "Offices" | done — "…— 4 total." | done — 4/4 distinct |
| `/admin/donors` | done | done | done — "Search donors" | done — "Donors" | done — "…— 5 total." | done — 5/5 distinct |
| `/admin/users` | done — shown below | done | done — "Search users" | done — "Users", measured below | done — shown below | done — 2/2 distinct |
| `/admin/campaigns` | done | done — on screen now, list is empty | done | n/a here — no table renders while the list is empty; same `TableScroll` as the other nine | done — "…— 0 total." once ready | n/a here — no rows in this DB |

Raw probe output for three of them:

```json
{ "page": "/admin/people",  "subtitle": "Team, leadership & staff — 7 total. …",
  "searchLabel": "Search people",
  "wrapper": { "tag": "SECTION", "tabIndex": 0, "overflowX": "auto", "label": "People" },
  "rowMenuLabels": ["Actions for Mr. Heang Koy", "Actions for NGS Program Manager", "Actions for M&E Manager"],
  "distinctMenuLabels": 7, "totalRows": 7 }

{ "page": "/admin/schools", "subtitle": "Schools supported — 5 total.",
  "searchLabel": "Search schools",
  "wrapper": { "tag": "SECTION", "tabIndex": 0, "overflowX": "auto", "label": "Schools" },
  "distinctMenuLabels": 5, "sampleMenu": "Actions for Hun Sen Rolea B'ier High School", "rows": 5 }

{ "page": "/admin/projects", "searchLabel": "Search projects",
  "wrapper": { "tag": "SECTION", "tabIndex": 0, "overflowX": "auto", "label": "Projects" },
  "distinctMenuLabels": 18, "sampleMenu": "Actions for Books for Cambodia", "rows": 18 }
```

### 3. The refused delete, in a browser

**A real server refusal.** `/admin/projects`, delete "New Generation Schools" — schools point at it,
so the server refuses on a foreign key. Row menu opened, Delete chosen, Confirm clicked:

```json
{
  "menuLabel": "Actions for New Generation Schools",
  "dialogText": "Delete this project? | Cancel | Confirm",
  "rowsBefore": 18,
  "countTimeline": "18 … min 18 … final 18",
  "ngsStillListed": true,
  "toasts": ["Something this record points at was deleted while you were editing. Reload the page, pick it again, and save."]
}
```

The row survives and the failure is on screen. The drop-and-restore was faster than my 100ms
sampling here, so to show both halves I ran it again with the request refused after a visible pause —
`/admin/pages`, deleting "Verify H3 Fresh Page":

```json
{
  "rowsBefore": 40,
  "whileInFlight": "at 100ms: 39 rows, target gone",
  "afterRefusal": "40 rows, target back: true",
  "toasts": ["Could not reach the server. Check your connection and try again."]
}
```

Dropped, then restored, with the reason shown. Screenshot of the refusal on screen (row present,
toast up): `.work/ui-audit/shots/FIXD-refused-delete.png`

**The one thing wrong with it, and it is not in my files.** For a foreign-key failure
`saveErrorMessage` returns "Something this record points at was deleted while you were editing.
Reload the page, pick it again, and save." That sentence describes a stale reference *in a form*. On
a delete the direction is the opposite: other records point at *this* one. The user is told to reload
and pick again, which does nothing for them. Exact edit, in `src/lib/save-error.ts`, which the
contract does not give me:

```
  if (m[1] === "FOREIGN KEY")
-   return "Something this record points at was deleted while you were editing. Reload the page, pick it again, and save.";
+   return "Something else still points at this record. Remove those links first, then try again.";
```

That sentence has to serve both directions, so whoever owns the file may prefer to pass the
direction in rather than reword it flat. Either way it is their call.

### 4. The failed-query state, in a browser

`adminUsers.list` blocked in the browser, then `/admin/users` opened by clicking the sidebar:

```json
{
  "blockedCalls": 1,
  "saysLoading": false,
  "alertPresent": true,
  "alertText": "This list could not be loaded. | Could not reach the server. Check your connection and try again. | Try again",
  "retryButton": true,
  "countInSubtitle": "People who can sign in."
}
```

It does not say "Loading…". Screenshot: `.work/ui-audit/shots/FIXD-list-query-failed.png`

That same output is the L17 evidence: the subtitle reads "People who can sign in." with no
"— 0 total" while the data is not there. Unblocking and pressing Try again:

```json
{ "recoveredRows": 2, "alertGone": true, "subtitle": "People who can sign in — 2 total." }
```

### 5. H2 in a browser, 375x812 on `/admin/users`

```json
{
  "wrapperTag": "SECTION",
  "ariaLabel": "Users",
  "tabIndex": 0,
  "overflowX": "auto",
  "clientWidth": 341,
  "scrollWidth": 442,
  "maxScrollLeft": 101,
  "scrollLeftBefore": 0,
  "scrollLeftAfterScrollingRight": 101,
  "scrolls": true
}
```

`clientWidth` 341 against `scrollWidth` 442, and it scrolls the full 101px. It was 70 against 442 —
the client width also grew because FIX-A took the sidebar out of the layout at this size; what this
job changed is that the remaining 101px is now **reachable** instead of clipped.

Reachable by keyboard too. Focusing the region and pressing ArrowRight:

```json
{ "focused": true, "activeTag": "SECTION", "activeLabel": "Users", "scrollLeft": 0 }
{ "focusedStill": true, "afterArrowRight_scrollLeft": 40, "maxScrollLeft": 101 }
```

(`End` does not move it — the browser gives that key to the document. ArrowLeft/Right is what drives
a focused scroll container.) Screenshot: `.work/ui-audit/shots/FIXD-375-users-scrolled.png`

### 6. Search on `/admin/pages`

```json
{
  "searchLabel": "Search pages",
  "searchPlaceholder": "Search by title or URL…",
  "rowsBefore": 40,
  "rowsAfter": 1,
  "status": "1 of 40",
  "matchedTitles": ["Verify H3 Fresh Page"]
}
```

40 rows before, 1 after typing `verify-h3-fresh`. Clearing the box restores all 40
(`{"rowsRestored": 40}`). Screenshot: `.work/ui-audit/shots/FIXD-1440-pages-search.png`

(40 rather than the 39 in the audit: the verification pane left a page behind.)

### 7. `src/lib/format.test.ts`, including the mutation test

13 tests over both formatters, covering Khmer as the non-English language, SQLite's
`CURRENT_TIMESTAMP`, a bare calendar day, `Date` and number inputs, nullish and unparseable values, a
bad currency code, and non-finite amounts.

Mutation: `localeFor` changed to `return "en-US";` before its body, ignoring the language.

```
     × maps the site's language codes to real locales 8ms
     × passes an unknown code through and falls back for nothing 1ms
     × reads a date in the active language, not always English 2ms
     × writes money the way the active language writes it 1ms

 FAIL  src/lib/format.test.ts > fmtDate > reads a date in the active language, not always English
AssertionError: expected 'Aug 10, 2026' to be '10 សីហា 2026' // Object.is equality
Expected: "10 សីហា 2026"
Received: "Aug 10, 2026"

 FAIL  src/lib/format.test.ts > fmtMoney > writes money the way the active language writes it
AssertionError: expected 'KHR 4,200,000' to be '4,200,000៛' // Object.is equality
Expected: "4,200,000៛"
Received: "KHR 4,200,000"

      Tests  4 failed | 9 passed (13)
```

The two named guards are `reads a date in the active language, not always English` and `writes money
the way the active language writes it`. Restored, and green again: `Tests  13 passed (13)`, tsc 0.

### 8. Desktop unchanged, 1440x900

- `.work/ui-audit/shots/FIXD-1440-pages.png`
- `.work/ui-audit/shots/FIXD-1440-users.png`

Also `.work/ui-audit/shots/FIXD-empty-state.png` (`/admin/campaigns`, the new empty state) and
`.work/ui-audit/shots/FIXD-1440-pages-search.png` (search filtered to one row).

### L18, measured

`?type=garbage` before the component-level normalisation went in — the first attempt crashed the
screen, which is how I found that `validateSearch` alone was not enough on this router version:

```
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at PostsList (…/admin.posts.index.tsx:61:34)
```

After normalising in the component as well:

```json
{ "url": "/admin/posts?type=garbage&cb=2", "h1": "All posts", "rows": 26,
  "backLinkPresent": false, "newButton": "+ New post", "hasTypeColumn": true }
```

A real type still filters:

```json
{ "h1": "News", "rows": 3, "backLink": true, "newButton": "+ New new" }
```

### STATIC 19, measured

Donor 1 given a website through the donor form, then the list re-read:

```json
{ "rendered": "anchor", "href": "https://www.moeys.gov.kh",
  "target": "_blank", "rel": "noopener noreferrer", "text": "https://www.moeys.gov.kh" }
```

The other four donors have no URL and still render `—`.

## Stop conditions

- `ActionMenu.tsx` — read, not edited. Its `label` prop was already there; I pass it at all ten sites.
- `form-ui.tsx`, `admin.tsx` — untouched, not needed.
- One edit I could not make: `src/lib/save-error.ts`, above.
- `bun run test` went red once, on my own doing: three empty-state descriptions named the customer,
  and `src/lib/no-brand.test.ts` caught it —
  `"routes/admin.offices.index.tsx:83: description=\"Offices are the places KAPE works from…\""` and
  two more. Reworded to be brand-neutral; green since.
- `kape.db` in the repo root is `e9789f59cb05f9f3426b9aba88001f9a`, unchanged. All testing on
  `.work/scratch/uitest.db` via the running server on 3011. No second server started.
- No `git` command that writes was run.

## Left behind in the scratch DB

Donor 1 now has the website `https://www.moeys.gov.kh` (added to prove STATIC 19 renders). The
project NGS survived four refused delete attempts, as intended. Nothing else changed.
