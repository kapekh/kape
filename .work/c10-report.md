# C10 - Deleting a picture no longer breaks the page that shows it

J23's finding is fixed and the gap under it is closed.
The usage check now looks inside stored content, and a delete that would strand a live page is refused
instead of being allowed with a warning.
A test can now call a tRPC procedure.

Everything below was run against a `VACUUM INTO` copy at `/tmp/c10/kape-c10.db` with `DATABASE_PATH`
pointed at it and `SSG_CACHE=off`.
The repo's `kape.db` md5 is `844570341b4add22e1be4e66b3cdbbd3`, unchanged from before the run, and
`public/uploads/` is back to its 59-file baseline.
Screenshots are `01-` to `15-` in `.work/c10-shots/`.

## 1. Where a media URL can actually be stored

Established by scanning every text column of every table for `/uploads/`, not from reading code.
The script walks `sqlite_master` and `PRAGMA table_info`, so nothing is exempt by my having forgotten it.

Run against the copy after the browser fixtures were in place:

```
| table        | column   | rows containing /uploads/ | sample                                             |
|--------------|----------|---------------------------|----------------------------------------------------|
| media        | url      | 61                        | /uploads/fe08f054-e4d9-41e6-bf5a-98fddaccd262.jpg   |
| pages        | sections | 5                         | "image":"/uploads/6bae6f26-d084-486a-bd8d-41eb...jpg" |
| translations | value    | 1                         | "type":"image","attrs":{"src":"/uploads/25960e2f-...png" |

38 tables scanned, 3 columns hit.
```

`media.url` is the row itself.
The other two are the sinks, and both are now covered:

- **`pages.sections`** holds section props as JSON. A section's `image` field stores a raw URL, and a
  `richtext` field stores stringified ProseMirror JSON whose `image` nodes carry `attrs.src`. One
  column scan catches both.
- **`translations.value`** is where every rich text body lives. `posts` has no `body` column at all;
  post, page and project bodies, project summaries and person bios are all EAV rows in
  `translations`. I scan the whole column rather than a list of field names, so a body field added
  later is covered without being registered anywhere.

Two more things the scan could not show, because this database has no rows for them:

- **`forms.fields`** is JSON, and `FormBuilder` puts a `RichTextEditor` behind a field's `content`.
  Covered, and demonstrated in section 6 by creating a form through `adminForms.create` and watching
  the usage check report it.
- **`render_cache.data`** matched on an earlier scan with the cache on. It is derived and every admin
  mutation clears it, so it is not a usage site and is deliberately not reported.

**How the match works, and what it can get wrong.** `LIKE '%<url>%' ESCAPE '\'`, with `\`, `%` and
`_` in the url escaped so a stored name containing a wildcard cannot widen the match.
Demonstrated: with media `/uploads/a_b.png` and a page containing `/uploads/axb.png`, the usage of
`a_b.png` is `[]` and the usage of `axb.png` is the page. Unescaped, `_` would have matched `x`.

It is still a substring test, so an image whose url is a proper prefix of another's is reported for
both. Uploads are uuid-named, which makes that improbable rather than impossible.
That is the direction I chose on purpose: over-reporting costs a warning an operator can read past,
under-reporting is the defect J23 found.

One consequence worth naming. This install has 63 media rows sharing the url `/placeholder.svg`.
Any content embedding that path will report all of them, so a seeded placeholder row is now harder to
delete than it was. It is the same over-report, and it is the safe side of the trade.

## 2. What `deleteMedia` does now, and why

**It refuses**, and names where the file is used.

Clearing a foreign key is well defined, and that behaviour is untouched: a post cover still deletes,
still clears `posts.cover_media_id` to null, still unlinks the file.
Removing an `<img>` from inside someone's stored ProseMirror JSON is not well defined, and doing it
silently inside a delete transaction would destroy an editor's work to make a delete succeed.
Deleting anyway is what produced the broken page J23 photographed, and it is unrecoverable because
the bytes go with it.

Refusing is the only option here that loses nothing. The operator is one click from the fix: the
"Used in" panel already renders an **Open** link straight to the page or post holding the image, so
removing the embed and retrying takes seconds. The `media` row and the file both survive the refusal.

The check runs inside the delete transaction rather than before it, so there is no window where an
editor embeds the image between the check and the unlink.

Message the operator gets:

```
Could not delete: This file is still in the content of 1 place (Page content: c10-page-section).
Remove the image there first, then delete the file.
```

## 3. The browser run

Dev server on port 3141 against the copy, signed in through the real login form as `admin@kapekh.org`.
`PORT` exported alongside, per J23's finding 9.
The credential was set only on the copy, so signing in at all proves the server was not on the repo
database.

Fixtures built through the real admin UI:

| Image | Where it was put | Stored as |
|---|---|---|
| media 132 | `Text + media` section's Image field on page `c10-page-section` | raw url in `pages.sections` |
| media 133 | post `c10-post-body` rich text body, inserted with the editor's Image button | `attrs.src` in `translations.value` |
| media 136 | post `c10-cover-control` cover, via `MediaPicker` | `posts.cover_media_id` |
| media 137 | uploaded, used nowhere | nothing |

Both live pages rendered their image at `naturalWidth: 64` before any delete. Shots 01, 02.

**A picture embedded in a page section.** The detail panel reads
"Used in 1 place / PAGE CONTENT / c10-page-section" with an Open link to `/admin/pages/41`. Shot 03.
J23 got no warning here at all.
Delete shows "This image is still used in 1 place: Page content: c10-page-section". Shot 04.
Confirming is refused, with the message in section 2. Shot 05.
Afterwards the row is still there, the file is still on disk, `/uploads/…png` still returns `200`
`178 B`, and the live page still renders at `naturalWidth: 64`. Shot 14.

**A picture embedded in a rich text body.** Same shape: "POST TEXT / c10-post-body", Open link
`/admin/posts/30`. Shots 06, 07, 08.
Refused, row and file intact, live page still renders. Shot 15.

**Control, a post cover.** Still reports exactly "POST COVER / c10-cover-control", still deletes on
confirm, still clears `posts.cover_media_id` to null, file now `404`. Shots 09, 10, 11.
Unchanged from before this job.

**Control, an unused picture.** "Used in / Unused / Not referenced anywhere, safe to delete", the
plain prompt "Delete this media item? This can't be undone.", deletes cleanly with no false warning.
Shots 12, 13.

## 4. A test can now call a procedure

`bun:sqlite` will not load inside a vitest worker, which is why nothing had reached a procedure before.
`bunx vitest` and `bun run test` both fail with `Cannot find package 'bun:sqlite'` on any import of
`#/server/db`, because the workers are Node.

So the caller runs under Bun in a subprocess, which is the same thing `install.test.ts` already does
for the same reason. `src/integrations/trpc/test-caller.ts` reads a plan of steps on stdin, builds a
scratch database from the real migrations, signs a session cookie, builds the context through the real
`createTRPCContext`, and prints results as JSON. `src/integrations/trpc/router.test.ts` spawns it and
asserts.

Going through `createTRPCContext` with a cookie rather than a hand-built context means a call passes
the same auth and permission checks a browser request does.

No dependency was added. Fixing this properly would mean a vitest pool that runs under Bun, which is a
change to `vite.config.ts`, and that file belongs to nobody in this round.

## 5. Every assertion, mutation tested

7 tests. Each mutation was applied to the line the test covers, the suite run, then the file restored
from a pristine copy. Passing run first:

```
✓ adminSettings.set > refuses a theme value CSS cannot parse, and stores nothing
✓ adminSettings.set > stores a value CSS can parse, so the refusal is the check and not the path
✓ adminMedia.usage > reports an image embedded in a page section and in a post body
✓ adminMedia.usage > still reports a foreign-key reference, and still calls an unused image unused
✓ adminMedia.delete > refuses to unlink bytes a page still points at, and names the page
✓ adminMedia.delete > deletes an image nothing references
✓ adminMedia.delete > deletes an image held only by a foreign key, clearing the key
Test Files 1 passed (1) | Tests 7 passed (7)
```

| Mutation | Test that failed | Others |
|---|---|---|
| `checkSettingValue` result forced to null in `adminSettings.set` | refuses a theme value CSS cannot parse | 6 passed |
| `adminMediaUsage` reverted to `MEDIA_REFS` only | reports an image embedded in a page section and in a post body | 6 passed |
| `upsertSetting` call dropped | stores a value CSS can parse | 6 passed |
| `MEDIA_REFS` loop dropped from `adminMediaUsage` | still reports a foreign-key reference | 6 passed |
| url matcher weakened to `LIKE '%'` | all five media tests | 2 passed |
| `MediaInUseError` throw dropped from `deleteMedia` | refuses to unlink bytes a page still points at | 6 passed |
| foreign-key clear dropped from `deleteMedia` | deletes an image held only by a foreign key | 6 passed |

The two the contract named behave as it required. Removing `checkSettingValue` fails
"refuses a theme value CSS cannot parse, and stores nothing" by name; reverting to `MEDIA_REFS`-only
fails "reports an image embedded in a page section and in a post body" by name.

The url matcher is the one shared primitive, so weakening it kills five tests rather than one. That is
the correct blast radius for it, not a leak.

Verified after the last mutation: both owned files byte-identical to their pristine copies.

## 6. The forms sink, demonstrated

`forms.fields` has no rows in this database, so the scan in section 1 could not show it. Driven
through `adminForms.create` on a scratch database instead, which is the real write path:

```
adminForms.create -> form 1, fields: [{"key":"blurb","type":"content","content":"{\"type\":\"doc\"…image…"}]
adminMedia.usage  -> [{ kind: "Form content", label: "C10 form", href: "/admin/forms/1" }]
adminMedia.delete -> BAD_REQUEST "This file is still in the content of 1 place (Form content: C10 form).
                     Remove the image there first, then delete the file."
```

## 7. Gates

| Gate | Started at | Ended at |
|---|---|---|
| `bun run test` | 256 passed over 22 files | **266 passed over 24 files** |
| `bunx tsc --noEmit` | 2 errors in `src/routes/sitemap[.]xml.tsx` | **no output** |
| `bun run format` | clean, 247 files | **clean, 250 files** |

Seven of the ten new tests are mine, in one new file. The other file and three tests are C9's
`src/lib/i18n-langs.test.ts`, landed while I was running.

The two tsc errors at the start were unused-import errors in `sitemap[.]xml.tsx`, which C9 owns and
which I did not open. C9 cleared them during the run.

**No dependency was added.** `bun.lock` is unmodified. `package.json` has exactly one changed line and
it is C9's, `"name": "kape"` to `"name": "koompi-cms"`. My diff is 196 insertions and 2 deletions
across `src/server/repo/admin.ts` and `src/integrations/trpc/router.ts`, plus two new files under
`src/integrations/trpc/`.

## 8. Findings I did not fix

Each is outside the files this job owns.

1. **The confirm dialog now offers a choice the server will not honour.** `src/routes/admin.media.tsx`
   line 262 says "Deleting it will leave that record with a broken/missing image. Delete anyway?" and
   offers Confirm. For a content embed the server refuses, so the operator confirms and then gets an
   error toast. Shots 04 and 05 are that sequence. The dialog should say the delete will be refused
   and point at the Open link when any usage entry is a content kind, and keep the current copy for
   foreign-key kinds, which really do just clear. J23 owns this surface. Severity: medium, and it is
   the last rough edge on an otherwise complete fix.
2. **The same copy is wrong in bulk delete.** `bulkDelete` warns that the selection "will leave broken
   images" before confirming, then reports per-item failures as "still attached to a record", which is
   already close to right. Only the pre-confirm sentence needs the same change as item 1.
   Severity: low.
3. **The error toast renders semi-transparent over the buttons it covers.** Visible in shot 05: the
   refusal text overlaps Open and Delete and is hard to read against them. Pre-existing toast styling,
   nothing to do with this change. Severity: low.
4. **A vitest pool that runs under Bun would delete `test-caller.ts` entirely.** The subprocess exists
   only because `bun:sqlite` cannot load in a Node worker. If someone owns `vite.config.ts` in a later
   round, switching the pool would let these tests import the router directly and run in-process.
   Severity: low, it is a simplification rather than a defect.
5. **J23's finding 6 still stands.** The uncapped dev log grows quadratically. Both of my runs were
   piped through `head -c 20000000`; they finished at 720 KB and 120 KB, so nothing was truncated, but
   the cap is the only reason that is knowable in advance.

## 9. Isolation

- `kape.db` md5 `844570341b4add22e1be4e66b3cdbbd3` before and after. Never opened for writing.
- `public/uploads/` back to 59 files, listing hash `e665c1eb1cbbec97699b7c211c3d3e6e`, matching the
  baseline taken before the run. The four uploads I made are gone: two the app deleted, two I removed
  after the refusals kept them.
- Both dev servers stopped. Logs capped, 720 KB and 120 KB.
- Scratch state under `/tmp/c10/` only.
- No commit, no git command beyond `status` and `diff`, no worklog edit.
- Nothing opened in `package.json`, `docs/`, `src/lib/i18n-config.ts`, `src/server/install.ts`,
  `src/routes/sitemap[.]xml.tsx`, `scripts/gen-prerender-paths.ts` or the four route files C9 holds.
