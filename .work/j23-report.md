# J23 - File upload and admin CRUD, exercised for real

Second run of this contract, 2026-08-07.
The first run's report is at `056fc87` if it is needed; this file replaces it.
Everything below happened in a browser against a dev server on `http://localhost:3123`, signed in as
`admin@kapekh.org` through the real login form.

Isolation: `kape.db` was copied with `VACUUM INTO /tmp/j23/kape-j23.db` and the server ran with
`DATABASE_PATH` pointed at the copy and `SSG_CACHE=off`.
The repo's `kape.db` md5 is unchanged from before the run, and `public/uploads/` is byte-for-byte the
same 59 files it started with.
Nothing was reseeded.

Port 3123 rather than 3000, because two other panes were live.
`PORT` has to be exported alongside it: the SSR tRPC client hardcodes
`http://localhost:${process.env.PORT ?? 3000}` in
`src/integrations/tanstack-query/root-provider.tsx:12`, so on any other port every page 500s with
"Unable to connect" while still serving a shell that says "Your organisation".

Screenshots are the `01-` to `24-` files in `.work/j23-shots/`.
The files dated 2026-08-06 belong to the first run.

## 1. Uploads by file type

All through `/admin/media` then Upload, which posts to `/api/media/upload`.

| File | Lands? | Library shows | `/uploads/…` serves | What the user sees when refused |
|---|---|---|---|---|
| `j23-photo.jpg`, 5,975 B | yes, media 132 | thumbnail paints, `JPEG` badge, `naturalWidth` 400 | `200 image/jpeg`, 5,975 B | - |
| `j23-logo.png`, 10,533 B | yes, media 133 | thumbnail paints, `PNG` badge | `200 image/png` | - |
| `j23-mark.svg`, 158 B | no, `415` | count unchanged, nothing stored | nothing stored | `j23-mark.svg: File type ".svg" is not allowed`. Shot 02 |
| `j23-doc.pdf`, 7,013 B | yes, media 134 | document tile, `PDF` badge, counted as `1 file` | `200 application/pdf`, 7,013 B | - |
| `j23-big.png`, 55,010,533 B | no, `413` | count unchanged | nothing stored | `j23-big.png: File too large (max 50 MB)`. Shot 03 |
| `j23-payload.png`, a `.sh` renamed, 25 B | no, `415` | count unchanged | nothing stored | `j23-payload.png: File contents do not match ".png"`. Shot 04 |

The two holes the first run found are closed.
`bytesMatchExtension` now reads the leading bytes, so the disguised shell script is refused instead
of being stored as an image, and every refusal names the server's own reason instead of a generic
"type or size".
I re-ran the disguise against `.mp4`, `.docx` and `.jpg` as well; all three are refused on content.

More edges, all against the live endpoint:

| Case | Result |
|---|---|
| no cookie | `401 Unauthorized` |
| garbage cookie | `401 Unauthorized` |
| file with no extension | `415 File type ".j23noext" is not allowed`, quoting the whole filename as if it were an extension |
| 1-byte file named `.png` | `415 File contents do not match ".png"` |
| 0-byte file named `.png` | `400`, was `No file`, now `That file is empty`. Fixed, section 5 |
| three files at once, middle one an SVG | the two good ones land, the toast names `j23-mark.svg` only. Shot 23 |
| re-picking the same file after a refusal | fires a second request; the input is reset, so there is no stuck-picker trap |
| `GET /api/media/upload` | `200` with the SPA HTML shell rather than `405`. Cosmetic |

The 50 MB cap is enforced only on the server, so the whole 55 MB crosses the wire before the `413`
comes back: about 7 seconds over loopback, and proportionally worse on a real upload link.
Refusal toasts auto-dismiss after roughly 3 seconds, which is what made my first polling attempts
miss several of them.

**Upload from inside a form, both paths, both followed to the public site:**

- `MediaPicker` on `/admin/posts/new`. The picker lists images only, correctly excluding the PDF at
  #134. Picking media 133 set `posts.cover_media_id = 133`, and after publishing,
  `/en/news/j23-post-cover` carried that `/uploads/…png` six times in the rendered HTML. Shot 08.
- `MediaLibraryDialog` on the `/admin/pages/41` rich-text section. This one does have its own
  Upload button, `accept="image/*"`. Uploading `j23-dialog.png` stored media 136, inserted it into
  the section body, and after publishing it rendered on `/en/j23-page` at `naturalWidth` 400.
  Shots 10, 21a. Uploading the SVG through the same dialog surfaces the same server reason. Shot 11.

## 2. CRUD by entity

Every record was prefixed `J23-`.
"Update sticks" means the field was re-read after a full page reload, not just after the save.

| Entity | Create | Read in list | Update | Update sticks after reload | Delete |
|---|---|---|---|---|---|
| Posts | ok, id 30, redirects to the editor | ok | title to `J23-post-cover EDITED` | ok | ok. Row, translations and public URL all gone, 404 |
| Pages | ok, id 41 | ok | title to `J23-page EDITED`, sections survived the save | ok | ok, "Its child pages move up to its parent" |
| Projects | ok, id 20 | ok | name to `J23-project EDITED` | ok | ok |
| People | ok, id 9 | ok | position to `J23 Tester EDITED` | ok | ok |
| Partners | ok, id 7 | ok | name to `J23-partner EDITED` | ok | ok |
| Offices | ok, id 6 | ok | name to `J23-office EDITED` | ok | ok |
| Schools | ok, id 7 | ok | name to `J23-school EDITED` | ok | ok |
| Forms | ok, id 2, slug normalised `j23-form` to `j23_form` | ok | title to `J23-form EDITED`, toast `Form saved.` | ok | ok. Confirm button reads `Delete`, and the prompt warns it takes the submissions too |
| Users | ok, id 5, toast `User created.` | ok | name to `J23-user EDITED`, toast `User saved.` | ok | ok. Prompt warns they are signed out immediately |

All 45 steps passed.
Two things worth naming even though nothing broke:

- Only users and forms confirm a save with a toast. The other seven show `Saved 9:56:09 PM` next to
  the button, which is quieter but is at least a signal.
- A new user defaults to the `staff` role with no radio selected, and the initial-password field is
  `type="text"`, so the password sits in the clear in the page and in any screenshot of it.

## 3. Validation edges

| Edge | Where the error surfaces |
|---|---|
| Submit any of the nine forms empty | Nowhere. All nine disable Save while the required field is blank, and nothing names which field is missing |
| Post with a title but an empty slug | Native browser bubble, focus moves to the slug field. Correct |
| Page with a title but an empty slug | Nowhere. `Save page` is a plain `type="button"` outside any `<form>`, so the slug's `required` never fires. Shot 09 |
| Duplicate post slug | Toast: `A post already exists at "j23-post-cover". Choose a different URL.` Shot 12 |
| Duplicate page slug | Same toast shape. Shot 13 |
| Duplicate project slug | Same toast shape. Shot 14 |
| Duplicate user email | Toast: `A user with that email already exists.` Shot 16 |
| Duplicate form name | Inline `✕ "j23_verify_b" is already taken - choose another` under the field, plus a toast on save. See the retraction in section 9 |
| Navigate away from a dirty `/admin/posts/30` | `Unsaved changes` dialog, Keep editing or Discard changes. Shot 17 |
| Navigate away from a dirty `/admin/pages/41` | Same dialog |
| **Navigate away from a dirty `/admin/posts/new`** | **Nothing. The typed post is gone.** Shots 18a, 18b |
| **Navigate away from a dirty `/admin/pages/new`** | **Nothing** |

## 4. Delete safety

**A media item used as a post cover.** `/admin/media` then Delete on media 133 warned before doing
anything, and named the referring record: "This image is still used in 1 place: Post cover:
j23-post-cover". Shot 19.
Confirming removed the row, unlinked `public/uploads/…png`, now `404`, and set
`posts.cover_media_id` back to null.
The public post still rendered at `200` with no broken image, and the editor showed an empty
"+ Choose image".
The warning slightly oversells the damage: it says the record will be left with a broken image, and
in fact the reference is cleared.

**A media item embedded in a rich-text body.** Media 136 was inserted into page 41's rich-text
section through `MediaLibraryDialog` and was live on `/en/j23-page`.
Deleting it produced no usage warning at all, only "Delete this media item? This can't be undone."
Shot 20.
After confirming, the page still stores that exact `/uploads/…png` in `pages.sections` and the live
page renders it at `naturalWidth: 0`, a broken-image icon in the body. Shots 21a and 21b.

## 5. What I fixed

One defect, inside my fix surface, demonstrated first.

**A file the user did pick was reported as "No file".**
`src/routes/api.media.$.tsx`.
Reproduction: create a zero-byte file, `: > empty.png`, and upload it from `/admin/media`.
Before: the toast reads `empty.png: No file`, and the endpoint returns `400 {"error":"No file"}`,
the same answer it gives when no file field was sent at all. Shot 24a.
After: `empty.png: That file is empty`, `400 {"error":"That file is empty"}`, while a request with
no file field still returns `No file`. Shot 24b.

Root cause, established by probing the live endpoint rather than by reading it: Bun parses a
zero-length multipart part into a `File` whose `size` is 0 and whose `name` is blank, so it fell
through the existing `!file.name` guard and came back out as "no file at all".
The new check tests `size` before `name`, which is why it has to come first.

Re-verified after the change: absent field `400 No file`, empty file `400 That file is empty`,
normal PNG `200`, SVG `415`, disguised `.sh` `415`.

## 6. Findings I did not fix

Each was demonstrated, and each lives outside the files this job owns.

1. **The media usage check does not see rich-text embeds.** Section 4, shots 20, 21a, 21b. The check
   is `adminMedia.usage` in `src/integrations/trpc/router.ts:1187`, which C8 holds and which I was
   told not to open, so this is a finding. It only follows foreign keys, so an image inserted into a
   page section, a post body or any other rich-text field is reported as unused, and deleting it
   silently breaks the live page. Severity: high, and it is a data-loss shape, because the bytes are
   unlinked from disk on confirm and there is nothing left to restore.
2. ~~A duplicate form name fails silently and strands the editor.~~ **Retracted.** It does not
   reproduce. See section 9.
3. **`/new` routes have no unsaved-changes guard.** Shots 18a, 18b. The edit routes have one, so a
   half-written post is protected once it exists and unprotected while it is new, which is backwards
   from where the work is easiest to lose. Severity: medium.
4. **A partner saved without a category gets an empty string, not the schema default.** Creating
   `J23-partner` without touching the category dropdown wrote `partners.category = ''` while the
   column's default is `'partner'`. Anything grouping partners by category will drop it.
   Severity: medium.
5. **`src/start.ts` has no CSRF middleware,** so TanStack Start warns on every server function call
   that they are unprotected same-origin RPC endpoints. Severity: medium, and someone should decide
   this deliberately rather than leave the warning running.
6. **That warning amplifies into gigabytes.** Each emission repeats every previous timestamp prefix,
   so the log grows quadratically: 13 GB in about 30 minutes of ordinary admin clicking, which
   filled `/tmp` and cost me a server restart. Anyone running `bun run dev > file` will hit it.
   Severity: medium.
7. **`media.width` and `media.height` are never populated.** Every row I created left both null, so
   the library cannot show dimensions and nothing can reason about aspect ratio. Severity: low.
8. **Uploaded images can never have alt text.** The `media` table has no alt column, neither picker
   offers a field, and the image TipTap inserts carries `alt: null`, which is what reached the
   public page. Severity: medium, as an accessibility gap.
9. **The SSR tRPC base URL hardcodes port 3000.** `root-provider.tsx:12`. Running the dev server on
   any other port without also exporting `PORT` makes every route 500 while still rendering an
   unbranded shell, which reads as a data problem rather than a config one. Severity: low, but it
   costs the next agent twenty minutes.

## 7. Records created and deleted

17 `J23-` records, all deleted, none left behind:

- posts 30, pages 41, projects 20, people 9, partners 7, offices 6, schools 7, forms 2, users 5
- media 132, 133, 134, 135, 136, plus three more created while testing multi-file upload and the
  fix in section 5: 137, 138, 139

Verified after cleanup: no `J23`-prefixed row in any of those tables, no `translations` row with a
`J23` value, no `media` row above id 131, `public/uploads/` identical to its 59-file baseline, and
the repo's `kape.db` md5 unchanged.
Nothing had to be left undeleted.

## 8. Gates

| Gate | Result |
|---|---|
| `bunx tsc --noEmit` | no output |
| `bun run format` | `Checked 247 files in 152ms. No fixes applied.` |
| `bun run test` | 256 passed over 22 files, 0 failed |

The contract's stated baseline of "31 tests over 8 files" is stale by a wide margin; the tree has
moved a long way since 2026-08-06.
C8 was live in `router.ts`, `admin.settings.tsx`, `site-theme.ts` and `site-theme.test.ts` for part
of this run, so the suite is reported as observed, not used as a gate on my own work.
My diff is one file and four lines: `src/routes/api.media.$.tsx`.

## 9. Re-run of the two high-severity findings, 2026-08-07

Both were re-driven from a fresh `VACUUM INTO` copy on a restarted server so the lead could watch.

**Finding 1, the rich-text embed, reproduces exactly.**
A new page `J23-verify-A` got a rich-text section, `verify-a.png` was uploaded through
`MediaLibraryDialog` as media 132, and the page was published.
`/en/j23-verify-a` served that image at `naturalWidth: 400`, shot `verify-A1-live-page-before.png`.
Deleting media 132 from `/admin/media` showed only "Delete this media item? This can't be undone.",
with no usage warning at all, shot `verify-A2-delete-no-warning.png`.
After confirming, `pages.sections` still holds the URL, `/uploads/…png` is `404`, and the live page
renders a broken-image icon at `naturalWidth: 0`, shot `verify-A3-live-page-broken.png`.

The control makes the gap unambiguous.
The same image, referenced instead as a post cover through the foreign key, produces the full
warning from the same dialog: "This image is still used in 1 place: Post cover: j23-verify-a-ctrl",
shot `verify-A4-delete-fk-warns.png`.
The check follows foreign keys and nothing else.

**Finding 2, the duplicate form name, does not reproduce. I am retracting it.**
Three variants, all against a form whose stored slug was `j23_verify_b`:

| Variant | Result |
|---|---|
| type the exact stored slug `j23_verify_b` | inline `✕ "j23_verify_b" is already taken - choose another` before saving, toast `That form name is already taken - pick a different one.` on save, `Save form` stays enabled |
| type `j23-verify-b`, which only collides after the server normalises dashes to underscores | same inline warning, same toast, button stays enabled |
| fill both fields and click Save in one tick, to race the name check | inline warning plus `Another record already uses that slug. Choose a different one.`, button stays enabled, three times out of three |

The button was still enabled and the message still on screen at t+20s.
The stuck-editor behaviour I described was fixed on 2026-08-06 in `e54d5b6`, "Stop a rejected save
from eating the editor's work", which moved `setSaving(false)` into a `finally` across 21 editor
routes. That commit was in the tree for the whole of my run, so I was never looking at that bug.
The likeliest reading of shot 15 is that I photographed the in-flight pending state and my polling
helper missed a toast that had already dismissed, which is the same timing mistake I had already
made once on the duplicate post slug earlier in the run.
Nothing in section 6 item 2 should be actioned.
