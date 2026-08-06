# J24 — The two error paths J23 found and could not touch

J23 drove the admin's write paths end to end and found the CRUD itself sound: all nine entities
create, read, update and delete correctly.
Two failure paths are not sound, and both sit outside the file list J23 owned.
Full evidence, with screenshots, is in `.work/j23-report.md` sections 4 and 6.

Neither of these is a guess.
Both were reproduced in the browser against the real database, and one was confirmed by replaying the
mutation and reading the 500 back.

## The two defects

**A. Media a record points at cannot be deleted, and the dialog promises it can.**

`deleteMedia` (`src/server/repo/admin.ts:1091`) deletes the `media` row without clearing the columns
that reference it, so SQLite refuses:

```
POST /api/trpc/adminMedia.delete?batch=1  {"0":{"json":{"id":71}}}
→ 500 {"error":{"json":{"message":"FOREIGN KEY constraint failed", …}}}
```

The confirm dialog says "Deleting it will leave that record with a broken/missing image. Delete
anyway?" — an offer the schema will not honour.
An unreferenced item deletes cleanly, so the failure is specific to referenced media.

Fourteen columns reference `media.id`.
Thirteen are nullable and want clearing; `post_media.mediaId` is `notNull` on a join table and wants
its rows deleted:

| table | column | line in `schema.ts` |
|---|---|---|
| `posts` | `coverMediaId` | 131 |
| `pages` | `heroMediaId` | 160 |
| `navItems` | `imageMediaId` | 181 |
| `postMedia` | `mediaId` (notNull, delete the row) | 202 |
| `staff` | `photoMediaId` | 253 |
| `people` | `photoMediaId` | 280 |
| `campaigns` | `coverMediaId` | 317 |
| `heroSlides` | `mediaId` | 594 |
| `partners` | `logoMediaId` | 609 |
| `donors` | `logoMediaId` | 655 |
| `projects` | `logoMediaId` | 689 |
| `projectLocations` | `photoMediaId` | 716 |
| `offices` | `imageMediaId` | 737 |
| `schools` | `coverMediaId` | 754 |

`adminMediaUsage` (`src/server/repo/admin.ts:971`) already walks this set to populate the "Used in"
list — but it walks 13 of the 14 tables and misses `projectLocations`.
That is read off the source, not demonstrated, so verify it first: attach a photo to a project
location, then open that item in the media library.
If the lightbox says "Not referenced anywhere — safe to delete", the dialog is lying twice over, and
the two walks must not drift apart again: whatever the dialog lists as a usage, the delete must
clear, and vice versa.

**B. A rejected save strands the form on `Saving…` forever.**

The shape is always the same — `setSaving(true)`, bare `await …mutate(v)`, `setSaving(false)` — with
no `catch`, so any rejection skips the reset and leaves the button disabled and reading `Saving…`.
The editor loses everything typed; only a reload frees the form, and the reload discards the work.

Observed live on three, at 22 s and still stuck when abandoned:

- `/admin/pages/new` with the URL segment left blank (`admin.pages.new.tsx:22-24`)
- `/admin/posts/new` with a slug that already exists (`admin.posts.new.tsx:37-39`)
- `/admin/projects/new` with a slug that already exists (`admin.projects.new.tsx:33-35`)

21 route files carry the pattern with no `catch`:

```
admin.campaigns.$id.index  admin.campaigns.new  admin.donors.$id     admin.donors.new
admin.forms.$id.index      admin.forms.new      admin.nav            admin.offices.$id
admin.offices.new          admin.pages.$id      admin.pages.new      admin.partners.$id
admin.partners.new         admin.people.$id     admin.people.new     admin.posts.$id
admin.posts.new            admin.projects.$id   admin.projects.new   admin.schools.$id
admin.schools.new
```

Five already handle it and are the reference, not part of the fix: `admin.users.new.tsx:17-35`,
`admin.users.$id.tsx`, `admin.roles.new.tsx`, `admin.roles.$id.tsx`, `admin.footer.tsx`.
Copy that shape — `try` / `catch` toast / `finally { setSaving(false) }` — rather than inventing one.

A caught error is only half the repair. `users` reads well because `src/server/repo/users.ts:69`
pre-checks the email and throws `A user with that email already exists.` The slug creates have no
such pre-check, so a caught rejection will surface whatever SQLite says. Look at the raw message
before deciding: if it is a bare constraint string, add the same kind of pre-check to `createPost`,
`createPage` and `createProject` for the case an editor actually hits, the duplicate slug.
`posts` and `pages` both carry a unique index on `(tenantId, slug)`.

## Files you own

- `src/server/repo/admin.ts`
- the 21 route files listed above
- one new test file under `src/server/repo/`
- `.work/j24-report.md`, `.work/j24-shots/`

Everything else is a finding, not a fix.

`src/components/Header.tsx` and `src/components/NavLink.tsx` belong to J22.
`src/routes/admin.media.tsx` and `src/components/admin/MediaLibraryDialog.tsx` carry J23's
uncommitted fixes — read them if useful, do not edit them.

## Getting in

`admin@kapekh.org` / `kape-admin-2026`, from `src/server/seed/users.ts:20-21` — the committed dev
defaults for this local seed, on a localhost dev server, at the repo owner's request.
Sign in at `http://localhost:3000/login`.

Two things that cost J23 time:

- `/admin` renders "Checking access…" on a hard navigation and took up to **12 s** to paint, not the
  3.5 s the older briefs claim. Wait on `main`, never on a fixed delay.
- `render_cache` has a 7-day TTL, so a correct admin edit can look inert on the public page. Check the
  cache before calling a round-trip broken.

## Do

1. **Reproduce both before touching anything.** Upload an image, attach it as a post cover, then try
   to delete it from `/admin/media` — with J23's fix in the tree you will now get
   `Could not delete: it is still attached to a record.` instead of silence. Then save a new page with
   the URL segment blank and watch the button. Screenshot both.
2. **Fix A in `deleteMedia`.** Clear the thirteen nullable columns and delete the `post_media` rows,
   then delete the `media` row and its bytes, all inside one transaction so a half-cleared failure
   cannot leave records pointing at a row that is about to vanish.
3. **Keep the clear-list and the usage-list from drifting.** Drive both from one exported list of
   `{ table, column }` rather than two hand-written walks, or leave a test that fails when they
   disagree. A media column added later must not silently become undeletable again.
4. **Re-check the confirm copy.** Once the delete succeeds, "will leave that record with a
   broken/missing image" becomes true, so it can stay — but confirm that is what actually happens to
   the referring record, and say so in the report.
5. **Fix B across all 21 files.** One pattern, copied from `admin.users.new.tsx`. No refactor, no
   shared wrapper unless the same five lines in 21 files genuinely reads worse than one helper.
6. **Give the duplicate-slug case a sentence a human can read.** Only after you have seen the raw
   message. If it is already clear, say so and skip the pre-check.
7. **Prove it in the browser.** Both defects re-run end to end, plus at least one `$id` edit form and
   one `new` form beyond the three named above, so the sample is not just the routes J23 happened to
   hit.

## Acceptance

1. `.work/j24-report.md` with, for each defect: the before screenshot, the after screenshot, and the
   exact reproduction steps. A claim with no image is a hunch.
2. Deleting a referenced media item succeeds, the referring record survives with a null image, and the
   file is gone from `public/uploads/`. Shown for at least two different referring tables, one of them
   `post_media`.
3. A rejected save leaves the form usable: the button returns to rest and an error toast names the
   reason. Shown on at least five of the 21 routes, including one `$id` edit form.
4. A runnable check on the reference list, the smallest thing that fails if the logic breaks. A pure
   test is enough — `getTableConfig` from `drizzle-orm/sqlite-core` enumerates the foreign keys
   without a database, which matters because vitest runs under Node and cannot import `bun:sqlite`.
5. `bun run test` — everything that passed before still passes, plus yours. The count moves with the
   other panes; the number to beat is whatever `main` gives on the day, not a figure copied from an
   older brief.
6. `bunx tsc --noEmit` — no output.
7. `bun run format` — "No fixes applied".
8. State how many records you created and confirm each was deleted. Prefix every one `J24-`.

## Out of scope

- The missing unsaved-changes guard on new-record forms. Edit forms have one (`useDirty`), new forms
  do not. Real, reported in `.work/j23-report.md`, and a different job.
- Toast contrast. `Dialogs.tsx:109-115` styles errors `bg-destructive/10 text-destructive` with no
  solid backing, so over the media grid they are unreadable. Report it again if you like; do not fix
  it here.
- Content sniffing on upload. `api.media.$.tsx` validates the filename extension only, so a `.sh`
  renamed `.png` is accepted. Its own job.
- Saves that succeed silently. Only users and forms confirm a save; the rest just stop. Copy, not
  correctness.
- Lint. Red repo-wide, J12's problem.

## Stop conditions

- **Never delete a seeded record.** Yours are the `J24-` ones. A reseed would destroy the other
  panes' work.
- Never run `bun run db:seed`, `db:push` or `db:migrate`. If the fix appears to need a schema change,
  stop and report — the migration lane is shared and `db.ts` migrates on boot.
- Do not delete or edit anything under `public/uploads/` that you did not upload.
- Do not touch J22's or J23's files, even to fix something obvious in them.
- If a login gate refuses you, stop and report it. Do not work around it, and do not fabricate the
  round-trip from repo-layer calls.
