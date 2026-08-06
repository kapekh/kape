# J23 — File upload and admin CRUD, exercised for real

Run on 2026-08-06 against the running dev server at `http://localhost:3000`, signed in as
`admin@kapekh.org` through the real login form.
Every row below is something that happened in the browser, verified against `kape.db` and against
what `/uploads/…` actually served back.
Nothing here is read off the source.

Screenshots are in `.work/j23-shots/`.

## 1. Uploads by file type

All six went through `/admin/media` → Upload, which posts to `/api/media/upload`.

| File | Lands? | Library shows | `/uploads/…` serves | What the user sees when refused |
|---|---|---|---|---|
| `j23-blue.jpg`, 342 B | yes, media 67 | correct thumbnail, `JPEG` badge, `342 B` | `200 image/jpeg`, 342 B | — |
| `j23-red.png`, 73 B | yes, media 68 | correct thumbnail, `PNG` badge | `200 image/png` | — |
| `j23-mark.svg`, 113 B | no, `415` | unchanged, count stays 65 | nothing stored | before fix: `1 of 1 upload(s) failed (type or size).` The server said `File type ".svg" is not allowed`; the UI threw that away. Shot 02, 05 |
| `j23-doc.pdf`, 193 B | yes, media 69 | 📄 tile, `PDF` badge, counted as `1 file` | `200 application/pdf` | — |
| `j23-big.png`, 55,000,000 B | no, `413` | unchanged | nothing stored | before fix: same generic `type or size` toast. The whole 55 MB crosses the wire first — there is no client-side size check. Shot 04 |
| `j23-payload.png` (a `.sh` renamed), 25 B | **yes**, media 70 | image tile with a broken `<img>` (`naturalWidth 0`), alt text falls back to the filename | `200 image/png`, body is `#!/bin/sh\necho j23-pwned` | not refused. Shot 04, 05 |

The allow-list is extension-only. Nothing sniffs content, and the stored `contentType` is whatever
the browser declared. The disguised file is not executable when served (`.png` fixes the response
type), so this is a data-integrity hole rather than an XSS one, but the library will keep showing a
broken tile for it.

Upload from inside a form, both paths:

- `MediaPicker` on `/admin/posts/new` → dialog → Upload: `j23-cover.png` stored as media 71, selected
  into the cover field, saved with the post, and it reached the public page. `/en/news/j23-post-cover`
  rendered `<img src="/uploads/5d8d72e3-….png">` in the body plus the JSON-LD `image`, and the news
  index carried the card. No cache staleness to unpick — the row was written after the render.
- `MediaLibraryDialog` on the `/admin/pages/36` editor → Upload: `j23-page.png` stored as media 72,
  selected, and `pages.hero_media_id = 72` after save.

## 2. CRUD by entity

Every record's title or name was prefixed `J23-`. "Update sticks" means the field was re-read after a
full page reload, not just after the save.

| Entity | Create | Read in list | Update | Update sticks after reload | Delete |
|---|---|---|---|---|---|
| Posts | ok, id 28, redirected to the editor | ok, `J23-post-cover News Published` | excerpt set to `J23 excerpt v1` | ok | ok, ⋯ → Delete → Confirm, row and DB gone |
| Pages | ok, id 36 | ok, `J23-page /j23-page Draft` | title → `J23-page EDITED` | ok | ok |
| Projects | ok, id 19 | ok, `J23C … Current` | name → `J23-project EDITED` | ok | ok |
| People | ok, id 8 | ok | position → `J23 Tester EDITED` | ok | ok |
| Partners | ok, id 6 | ok | name → `J23-partner EDITED` | ok | ok |
| Offices | ok, id 5 | ok | name → `J23-office EDITED` | ok | ok |
| Schools | ok, id 6 | ok, listed among 6 total | name → `J23-school EDITED` | ok | ok |
| Forms | ok, id 1, slug normalised `j23-form` → `j23_form` | ok | title → `J23-form EDITED`, toast `Form saved.` | ok, checked in DB after the redirect to the list | ok, confirm button is labelled `Delete`, not `Confirm` |
| Users | ok, id 3, toast `User created.` | ok | name → `J23-user EDITED`, toast `User saved.` | ok | ok |

All 45 steps passed. Two things worth naming even though nothing broke:

- Only users and forms confirm a save. Posts, pages, projects, people, partners, offices and schools
  save silently — the button returns to rest and that is the only signal.
- Delete confirmation copy and button labels are inconsistent: `Confirm` for most, `Delete` for forms
  and users; `Delete this person?` versus `Delete this form and all its submissions? This can't be
  undone.`

## 3. Validation and dirty-state edges

| Edge | Form | What happened | Where the error surfaced |
|---|---|---|---|
| Submit empty | `/admin/posts/new` | blocked, focus jumped to the required slug field, `validationMessage` = "Please fill out this field." | native browser validation only |
| Submit empty | `/admin/pages/new` | nothing at all — Save is `disabled` until the form is dirty | nowhere, and nothing tells you why the button is dead |
| Submit empty | projects, people, partners, offices, schools, forms, users | same: Save `disabled` until dirty, click is a no-op | nowhere |
| Dirty but required field blank | `/admin/pages/new` (title filled, URL segment blank) | button went to `Saving…` **and stayed there for 22 s+**, still stuck when abandoned. No row created, no error, form permanently locked. Shot 12, 13 | nowhere |
| Duplicate slug | `/admin/posts/new`, slug `j23-post-cover` | same permanent `Saving…`. Shot 14 | nowhere |
| Duplicate slug | `/admin/projects/new`, slug `j23-project` | same permanent `Saving…`. Shot 18 | nowhere |
| Duplicate email | `/admin/users/new`, `j23-user@kapekh.org` | rejected cleanly, form stayed usable, toast `A user with that email already exists.` Shot 17 | toast |
| Navigate away dirty | `/admin/posts/new`, `/admin/pages/new` | navigated straight to the destination, edits gone, no prompt. Shot 15 | nowhere |
| Navigate away dirty | `/admin/posts/28` (edit) | guarded: "Unsaved changes — Leave this page and lose the edits you have not saved?" with Keep editing / Discard changes. Shot 16 | modal |

The guard exists on edit forms and is missing on every new-record form.

## 4. Delete safety, referenced record

`media 71` was the cover of post `j23-post-cover`.

1. The lightbox resolved usage correctly: `Used in — 1 place · POST COVER · j23-post-cover` (shot 07).
2. Delete raised the right warning: "⚠ This image is still used in 1 place … Deleting it will leave
   that record with a broken/missing image. Delete anyway?" (shot 08).
3. Confirm did nothing at all. No toast, no change to the lightbox, row still in `media`, file still
   on disk, `/uploads/5d8d72e3-….png` still `200` (shot 10).

The mutation was failing. Replayed against the real endpoint from the page:

```
POST /api/trpc/adminMedia.delete?batch=1  {"0":{"json":{"id":71}}}
→ 500 {"error":{"json":{"message":"FOREIGN KEY constraint failed", …}}}
```

An unreferenced item (media 70) deleted cleanly in the same session: row gone, file unlinked from
`public/uploads/`, lightbox closed. So the failure is specific to media a record still points at.

Bulk delete was worse. Selecting one free item and one referenced item and confirming "Delete all 2
anyway" **deleted the free one and kept the referenced one**, while the grid still showed both tiles
and the toolbar still read "2 selected", with no message (shot 24). The admin misreported its own
state until a reload.

## 5. Fixed, inside the fix surface

Four defects, all demonstrated before the edit. `src/routes/admin.media.tsx` and
`src/components/admin/MediaLibraryDialog.tsx` only.

### F1 — A refused media delete said nothing

Reproduce: `/admin/media` → open any image used as a post cover → Delete → Confirm.
Before: nothing happens, forever (shot 10). After: `Could not delete: it is still attached to a
record. Remove it there first.` (shot 23).

`del()` awaited the mutation bare, so the rejection went nowhere and `dropLocal` never ran. Now
wrapped, with the FK message translated into something an editor can act on.

### F2 — Bulk delete hid partial failure

Reproduce: select one unreferenced and one referenced item → Delete → Confirm.
Before: one row silently destroyed, the other silently kept, grid and selection both stale, no toast
(shot 24). After: the deleted tile disappears, the referenced one stays selected, and the toast reads
`1 item could not be deleted: still attached to a record.` (shot 25).

`Promise.all` rejected on the first failure and skipped `dropLocal` entirely; it is now
`allSettled`, dropping exactly what the server dropped.

### F3 — Upload rejections lost the reason (media library)

Reproduce: `/admin/media` → Upload → `j23-mark.svg`, then a 55 MB file.
Before: `1 of 1 upload(s) failed (type or size).` for both (shots 02, 05). After:
`j23-mark.svg: File type ".svg" is not allowed` (shot 21) and
`j23-big.png: File too large (max 50 MB)` (shot 22). The endpoint had been sending both messages all
along; the UI discarded them and guessed. Failures are now named per file, so a mixed multi-file drop
says which one lost.

### F4 — Upload rejections lost the reason (picker dialog)

Reproduce: `/admin/partners/new` → + Choose logo → Upload → `j23-mark.svg`.
Before: `Upload failed` (shot 19). After:
`j23-mark.svg: File type ".svg" is not allowed` (shot 20).

## 6. Found, not fixed — outside the fix surface

Ordered by what I would fix first.

1. **Referenced media cannot be deleted at all, and the dialog promises the opposite.**
   `deleteMedia` (`src/server/repo/admin.ts:1091`) deletes the row without clearing referring
   columns, so SQLite refuses. The confirm text explicitly offers to leave records with a broken
   image, which the database will not allow. Either clear the references first (`posts.coverMediaId`,
   `pages.heroMediaId`, `people.photoMediaId`, …) or make it `ON DELETE SET NULL` — and then the
   warning becomes true. F1 only stops the UI lying about it.
2. **A rejected save locks the form forever.** `admin.pages.new.tsx:22-24`,
   `admin.posts.new.tsx:37-39`, `admin.projects.new.tsx:33-35` all do
   `setSaving(true); await …mutate(v); setSaving(false)` with no `catch`. Any rejection — duplicate
   slug, missing required field — strands the button on `Saving…` and the editor loses everything
   typed. Three occurrences found; the pattern is likely repo-wide in `admin.*.new.tsx`.
3. **No unsaved-changes guard on new-record forms.** Edit forms have one and it works well. Clicking
   any sidebar link from a half-written new post or page discards it without a word.
4. **Error toasts are close to unreadable.** `Dialogs.tsx:109-115` styles them
   `bg-destructive/10 text-destructive` with no solid backing, so over the media grid the text sits on
   top of photographs (shot 05). Every upload failure in this run landed there.
5. **Uploads are validated by filename extension only.** `api.media.$.tsx:52-62` takes the extension
   from `file.name`, trusts `file.type` for the stored `contentType`, and never looks at the bytes. A
   renamed `.sh` was accepted and is now an image row that can never render.
6. **The size cap is enforced only after the body is buffered.** 55 MB was uploaded in full before the
   `413`. A `file.size` check before the fetch would refuse it instantly.
7. **`/admin` hard navigation took up to 12 s to paint**, not the 3.5 s the job brief expects.
   `Checking access…` was still on screen at 9 s on `/admin/pages/new`, and `document.body` was null
   for the first few seconds. Measured repeatedly across the session.
8. **Most saves give no confirmation.** Only users and forms toast. See section 2.

## 7. Records created and cleaned up

10 `J23-` records plus 6 media items created, all deleted, verified by scanning every table for
`j23` afterwards — zero rows left:

| Entity | Record | Deleted |
|---|---|---|
| Post | 28 `j23-post-cover` | yes |
| Post | 29 `j23-fk` (created to reproduce F1/F2 after the first post was gone) | yes |
| Page | 36 `j23-page` | yes |
| Project | 19 `j23-project` | yes |
| Person | 8 `J23-person` | yes |
| Partner | 6 `J23-partner` | yes |
| Office | 5 `J23-office` | yes |
| School | 6 `J23-school` | yes |
| Form | 1 `j23_form` | yes |
| User | 3 `j23-user@kapekh.org` | yes |
| Media | 67, 68, 69, 70, 71, 72 | yes, all six |

`public/uploads/` is back to its 59 starting files; nothing I did not upload was touched. No seeded
record was deleted, and `db:seed`, `db:push` and `db:migrate` were never run.

## 8. Gates

- `bun run test` — 37 passed over 9 files. The brief's baseline was 31 over 8; the extra file is
  `src/server/seed/roles.test.ts`, which the other pane added during this run. Nothing failing.
- `bunx tsc --noEmit` — no output.
- `bun run format` — "No fixes applied".

Not committed, as asked.
