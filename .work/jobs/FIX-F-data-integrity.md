# FIX-F - data integrity in the repo layer

Three defects UAT-B found, all server-side, all confirmed in this pane by reading the code. Two of
them lose data or block an admin permanently. You are fixing causes, not symptoms.

## Files you own

- `src/server/repo/admin.ts`
- `src/server/repo/users.ts`
- `src/lib/i18n-config.ts` and whatever `/admin/languages` needs (see B3 - the fix may be a warning
  in the admin rather than a change to the router)

Nobody else is in these files this round. Do not open `src/components/`, `src/routes/$lang.*` or
anything under `src/lib/ui-strings/` - two other jobs live there.

## B1 - a refused delete destroys the record first. HIGH, data loss.

`deleteProject` at `src/server/repo/admin.ts:2182` runs four statements with no transaction:
translations, then `projectDonors`, then `projectLocations`, then the project itself. When the last
one trips a foreign key - a school still points at the project - the first three have already
committed. The delete is correctly refused and the record is already gutted.

UAT-B hit this on the real fixture: project HCC lost all 23 of its translation rows, both languages,
title summary and body, and is still in the list looking intact until you open it.

`deleteLanguage` in the same file has the identical shape, three deletes and no transaction.

**The pattern to copy is already in this file.** `deleteMedia` at `admin.ts:1471` wraps its work in
`db.transaction((tx) => …)`, and the comment above it at 1345 explains why the check has to live
inside the transaction rather than before it. Do the same for both.

Check every other `delete*` in `src/server/repo/` as you go. The sweep I ran here found only these
two with more than one delete and no transaction, but I matched on shape, not on meaning - a
function that deletes one row and updates another has the same exposure.

## B2 - a user who has ever signed in can never be deleted. HIGH.

`deleteUser` at `src/server/repo/users.ts:144` revokes sessions - `update … set revokedAt` - and
then deletes the user, which trips the `sessions.user_id` foreign key. A user who never signed in
deletes fine, which is what isolates it.

Decide between deleting the user's sessions and making the FK cascade, and say in the report which
you chose and why. A revoked session row that outlives its user has no reader; if you keep the rows
for an audit trail, then the FK is what has to change, and that is a migration.

Whatever you choose, the admin must not be able to reach a state where the only way to remove a
user is by hand in SQLite.

## B3 - adding a language 404s the whole site. MED.

`/admin/languages` adds `fr`, the language switcher offers Français on every page, and `/fr`
returns 404. The router matches `LANGS` in `src/lib/i18n-config.ts:14`, a hand-maintained constant,
and the header comment says so: "Adding a language: enable it in the admin AND add its code to
LANGS."

So this is a documented limitation, not a surprise - but the admin offers the action, completes it
with a success message, and breaks the public site. `reportUnroutable()` already exists and warns
to the server console, where no admin will ever see it.

**The laziest fix that holds is the honest one**: `/admin/languages` tells the truth at the point of
the action. A language the router cannot serve is shown as needing a developer, and the switcher
does not offer it to visitors. Making the router read the table is the better fix and a much larger
one - route definitions are synchronous, which is the whole reason the constant exists. Do not
attempt it in this job; if you think it is worth doing, say so in the report and price it.

## Acceptance

Each of the three gets a repro that fails before your change and passes after, run against a
throwaway copy of the database - not `.work/uat/uat.db`, which is the UAT instance, and never
`kape.db`. Make your own copy under `.work/scratch/`.

- **B1**: attach a school to a project, delete the project, watch it be refused, then show the
  project's translations, donors and locations all still present. Show the before/after row counts.
- **B2**: create a user, sign in as them, sign out, delete them. Then do it again with a user who
  never signed in, so the report shows both paths working.
- **B3**: add a language in the admin, and show what a visitor and an admin each see now.

Non-trivial logic leaves a runnable check behind: B1 and B2 each need a test that fails if the fix
is reverted. Put them where the repo's existing server tests live.

Gates before you report: `bunx tsc --noEmit` silent, `bun run test` at or above 370 tests over 38
files, `bun run lint` at 8 errors and 0 warnings - the known `noArrayIndexKey` sites, which are not
yours.

Report to `.work/FIX-F-report.md`. State plainly which of the three you closed and which you did
not.
