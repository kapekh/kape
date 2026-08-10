# S6 - the staff portal

29 `new-key` rows across five routes: 29 wired, 0 skipped-with-loss. 25 new keys defined in
`src/lib/ui-strings/internal.ts`; the other four rows reuse `common.loading`, which stays in
`forms.ts` where S3 owns it. Two `leave` rows (the `?` avatar fallback and the `📄` glyph) are
untouched, as the job file directs.

English only. No Khmer was written. Every key falls back to its English default, which is what a
Khmer-reading staff audience should see rather than a machine guess; the Khmer column in
`/admin/ui-strings` is empty and ready for a translator.

## Files changed

- `src/lib/ui-strings/internal.ts` - 25 keys, English only
- `src/routes/internalsources.tsx` - 6 sites
- `src/routes/internalsources.index.tsx` - 3 sites
- `src/routes/internalsources.calendar.tsx` - 6 sites
- `src/routes/internalsources.directory.tsx` - 9 sites
- `src/routes/internalsources.documents.tsx` - 5 sites

## Every row

`shown` means the string was on screen in the round trip below. `wired, not shown` means the call
site is live but the fixture never puts it in that branch.

### src/routes/internalsources.tsx (6)

| line | text | key | state |
|---|---|---|---|
| 19/70 | `staffPortalTitle(settings)` | - | content, left alone (see below) |
| 58 | Checking access… | `internal.checking` | wired, not shown (session resolves too fast to photograph) |
| 75 | Log out | `internal.logout` | wired, shown |
| 86 | News Feed | `internal.news` | wired, shown |
| 93 | Calendar | `internal.calendar` | wired, shown |
| 100 | Documents | `internal.documents` | wired, shown |
| 107 | Directory | `internal.directory` | wired, shown |

### src/routes/internalsources.index.tsx (3)

| line | text | key | state |
|---|---|---|---|
| 28 | Internal News Feed | `internal.news.title` | wired, shown |
| 32 | Loading… | `common.loading` (forms.ts) | wired, not shown |
| 36 | No internal news. | `internal.news.empty` | wired, not shown (fixture has 2 items) |

### src/routes/internalsources.calendar.tsx (6)

| line | text | key | state |
|---|---|---|---|
| 28 | Calendar of Events | `internal.calendar.title` | wired, shown |
| 32 | Loading… | `common.loading` (forms.ts) | wired, not shown |
| 40 | Program | `internal.calendar.col.program` | wired, shown |
| 43 | Event | `internal.calendar.col.event` | wired, shown |
| 46 | Start | `internal.calendar.col.start` | wired, shown |
| 49 | End | `internal.calendar.col.end` | wired, shown |

### src/routes/internalsources.directory.tsx (9 + 1 leave)

| line | text | key | state |
|---|---|---|---|
| 30 | Staff Directory | `internal.directory.title` | wired, shown |
| 34 | Loading… | `common.loading` (forms.ts) | wired, not shown |
| 43 | ID | `internal.directory.col.id` | wired, shown |
| 46 | Name (KH) | `internal.directory.col.nameKm` | wired, shown |
| 49 | Name (EN) | `internal.directory.col.nameEn` | wired, shown |
| 52 | Sex | `internal.directory.col.sex` | wired, shown |
| 55 | Phone | `internal.directory.col.phone` | wired, shown |
| 58 | Email | `internal.directory.col.email` | wired, shown |
| 61 | Program | `internal.directory.col.program` | wired, shown |
| 77 | `"?"` avatar fallback | - | skipped: single placeholder glyph, not language |

### src/routes/internalsources.documents.tsx (5 + 1 leave)

| line | text | key | state |
|---|---|---|---|
| 36 | Internal Documents | `internal.documents.title` | wired, shown |
| 40 | Loading… | `common.loading` (forms.ts) | wired, not shown |
| 44 | No documents. | `internal.documents.empty` | wired, not shown (fixture has 2 documents) |
| 60 | `📄` | - | skipped: icon glyph |
| 71 | Open | `internal.documents.open` | wired, not shown (no fixture document has a file) |
| 75 | no file | `internal.documents.nofile` | wired, shown |

29 of 29 accounted for. Both `leave` rows skipped for the reason the inventory gives.

Column headers marked `wired, not shown` do not exist - the staff, event and document tables all
have rows in the fixture, so every header was photographed on screen.

## The portal title

`staffPortalTitle(settings)` at lines 19 and 70 reads `site_settings` and is already editable at
`/admin/settings`. It is left as content, not keyed. The screenshots show it as "KAPE Staff Portal"
in the header, which is where that setting lands.

## Defaults are generic

Every English default here is a generic label - column headers, nav items, empty states. Nothing
names an organisation, a country or a sector, so `ui-strings.default.ts`'s neutrality rule needed no
substitution. All 25 use the English from `keys.proposed.ts` verbatim, including the `Name (KH)` /
`Name (EN)` parentheticals that disambiguate two adjacent columns.

## Gates

```
$ bunx tsc --noEmit
(silent)

$ bun run test
 Test Files  41 passed (41)
      Tests  382 passed (382)
   Duration  8.41s

$ bun run lint
Checked 284 files in 162ms. No fixes applied.
Found 8 errors.
```

8 lint errors, 0 warnings: the known `noArrayIndexKey` sites in files this slice does not own. Same
count as the floor measured before the slice started. `dictionary.test.ts` and `no-brand.test.ts`
both pass, so no key is defined twice and no key was seeded ahead of its call site.

Grep of the five routes for a leftover literal in JSX text, `placeholder`, `title`, `alt` or
`aria-label` position returns one hit, `alt={r.nameEn ?? ""}` in `directory.tsx`, which is data, not
chrome.

## The round trip

Scratch database `.work/scratch/s6.db` (`VACUUM INTO` from `kape.db`), own dev server on port 3031.
`kape.db` and `.work/uat/uat.db` were never opened for writing. Server stopped afterwards; port 3031
is free.

1. Signed in at `/login` as `admin@kapekh.org`.
2. `/admin/ui-strings` - the `internal` group lists all 25 new keys. Changed
   `internal.directory.title` English to "Team Contact List" and saved. Confirmed in the database:
   `select key, lang, value from ui_strings where key like 'internal.%'` returns
   `internal.directory.title|en|Team Contact List`.
3. `/internalsources/directory` renders the heading "Team Contact List", with the nav labels and all
   seven column headers coming through `t()` as well.
   `.work/i18n/s6-shots/directory-changed.png`
4. Back at `/admin/ui-strings`, clicked "Reset to default". The row is gone from `ui_strings` -
   the same query now returns 0 rows.
5. `/internalsources/directory` is back to "Staff Directory".
   `.work/i18n/s6-shots/directory-original.png`

`.work/i18n/s6-shots/admin-ui-strings-row.png` shows the editor row mid-change for reference.

The other three portal pages were loaded in the same session to confirm the rest of the wiring on
screen: news feed heading, calendar heading and four column headers, documents heading and the
"no file" label.

### One deviation

The portal pages were viewed as `admin@kapekh.org`, not `staff@kapekh.org`. The staff account exists
in `kape.db` with `role = staff`, but its password there is not `kape-admin-2026`, so the sign-in was
refused; that password belongs to the UAT fixture copy. The admin account passes the identical guard
in `internalsources.tsx` (`u.role === "staff" || u.role === "admin"`) and reaches the same pages, and
the job file names it as equivalent, so the round trip stands. Nothing about auth was changed to get
past this.

## Two data problems met, not fixed

Both were already reported by UAT and are data, not labels.

- Every internal document shows "no file" because no fixture document has one attached. That is the
  `internal.documents.nofile` branch doing its job; it also means `internal.documents.open` could
  not be photographed.
- The staff directory lists four public leadership rows (Mr. Heang Koy, Executive Director, NGS
  Program Manager, M&E Manager) above the three real staff rows. They have no staff number, sex,
  phone, email or program. Visible in both screenshots.
