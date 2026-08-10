# S6 - the staff portal

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows. This file only
names your share.

The smallest remaining slice: 29 `new-key` rows over five routes, most of them table column
headers.

## Files you own

- `src/routes/internalsources.tsx` - the portal shell, 6 rows
- `src/routes/internalsources.index.tsx` - 3 rows
- `src/routes/internalsources.calendar.tsx` - 6 rows
- `src/routes/internalsources.directory.tsx` - 9 rows
- `src/routes/internalsources.documents.tsx` - 5 rows
- `src/lib/ui-strings/internal.ts` - your dictionary module, currently an empty stub. Nobody else
  opens it.

Prefix `internal.` for everything you define.

## Your rows

`.work/i18n/INVENTORY.md`, the five `internalsources` blocks. Confirm every line number against the
real file first.

## Four specifics

- **`common.loading` is S3's, in `forms.ts`.** Four of your five files render "Loading…" and all
  four reuse that key. Define nothing for it. Grep `src/lib/ui-strings/` before you type any key.

- **This portal is behind auth.** `internalsources.tsx:56` renders `Checking access…` while the
  session resolves, and the four nav items only appear to a signed-in staff account. Sign in as
  `staff@kapekh.org` to see the real thing; `admin@kapekh.org` also reaches it. Both are in the UAT
  fixture at `.work/uat/uat.db`.

- **The column headers are data-shaped, not decorative.** `internal.directory.col.*` and
  `internal.calendar.col.*` label columns whose content comes from a staff spreadsheet. Key the
  header text; do not touch how the column is populated or sorted. `Name (KH)` and `Name (EN)` keep
  the parenthetical in the English default - it disambiguates two columns that sit side by side.

- **Two `leave` rows.** The `"?"` avatar fallback at `directory.tsx:59` and the `📄` at
  `documents.tsx:54` are glyphs, not language. Mark them skipped with that reason.

## The portal title is already content

`staffPortalTitle(settings)` at lines 18 and 68 derives from `site_settings` and is editable at
`/admin/settings` today. Leave it alone and say so in the report - it is the one string here that
already passes the round's acceptance test by another route.

## Out of scope

Everything in SLICE-COMMON, plus every `src/lib/ui-strings/*.ts` that is not `internal.ts`, and the
auth/session logic in `internalsources.tsx`. You are changing labels only.

## Acceptance

Everything in `SLICE-COMMON.md`. The round trip needs a signed-in staff session, so budget for it:
change `internal.directory.title` at `/admin/ui-strings` as admin, then load
`/internalsources/directory` as staff and show the new heading, reset, show the original back. Two
screenshots into `.work/i18n/s6-shots/`.

If the fixture's staff tables are empty and a table body never renders, the column headers may not
be on screen to photograph. Say so plainly rather than seeding data - a header wired but not
rendered is a `wired, not shown` row, and the report names it.

Report to `.work/S6-report.md`.
