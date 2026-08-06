# J24 — Referenced media could not be deleted, and a rejected save locked the form

Run on 2026-08-06 against a dev server on `http://localhost:3000` with
`DATABASE_PATH=/tmp/j24.db` (a `VACUUM INTO` copy of `kape.db`) and `SSG_CACHE=off`, signed in as
`admin@kapekh.org` through the real login form.
Every before/after pair below happened in the browser and was checked against the database and
against `public/uploads/`.
Screenshots are in `.work/j24-shots/`.

## Setup: the four references I created

One upload per referring table, so the delete could be shown on more than one shape of reference.

| Media | Attached as | Column |
|---|---|---|
| 132 | cover of post 30 `j24-fk-post` | `posts.cover_media_id` |
| 133 | gallery image of post 30 | `post_media.media_id` (notNull join row) |
| 134 | hero of page 41 `j24-hero-page` | `pages.hero_media_id` |
| 135 | photo of project location 6 `J24-site` on project 20 | `project_locations.photo_media_id` |

All four were uploaded and attached through the admin UI, not seeded or inserted.

## Defect A — media a record points at could not be deleted

### Before

`/admin/media` → search `64d2e6fa` → open media 135 → Delete → Confirm.

1. The lightbox claimed **"Used in — Unused. Not referenced anywhere — safe to delete."** while the
   row was in fact the photo of project location 6 (shot 02).
   This is the `projectLocations` gap the brief suspected, confirmed live rather than read off the
   source.
2. Because the panel found no usage, the confirm dialog was the plain "Delete this media item? This
   can't be undone." with no warning at all (shot 03).
3. Confirm produced `Could not delete: it is still attached to a record. Remove it there first.`
   (J23's F1 message) and the row stayed (shot 04).

Media 132, which the panel *did* resolve, told the same lie from the other side: "Used in — 1 place ·
POST COVER · j24-fk-post" (shot 05), then the warning "Deleting it will leave that record with a
broken/missing image. Delete anyway?" (shot 06), then the same refusal.
The dialog offered something the schema would not honour.

### After

Same steps, same records.

- Media 135's panel now reads **"Used in — 1 place · PROJECT MAP PHOTO · J24-site"** (shot 07), and
  the confirm dialog carries the warning (shot 08).
- Confirm succeeds. Library count 126 → 125 (shot 09).
- Media 133, the `post_media` join row, resolves as "POST GALLERY · j24-fk-post" (shot 10) and deletes
  (shot 11).
- Media 132, the post cover, deletes with its warning (shot 12).
- Media 134, the page hero, deletes.

Verified after each delete:

| Media | Referring row after | File in `public/uploads/` |
|---|---|---|
| 135 | `project_locations` row 6 survives, `photo_media_id` NULL | gone |
| 133 | `post_media` row 6 gone; post 30 itself untouched, cover still 132 | gone |
| 132 | post 30 survives, `cover_media_id` NULL | gone |
| 134 | page 41 survives, `hero_media_id` NULL | gone |

So the confirm copy is now true and can stay: the referring record keeps everything else and loses
only the image. Post 30's editor reloads clean with the cover slot back to "+ Choose image"
(shot 13).

### What changed

`deleteMedia` (`src/server/repo/admin.ts`) now clears the thirteen nullable columns and deletes the
`post_media` rows before deleting the `media` row, inside one transaction.

Two things worth flagging about that transaction:

- Drizzle's bun-sqlite `transaction()` is synchronous. An `async` callback commits before the awaited
  work runs, so it silently does not roll back — checked with a throwaway script before writing the
  fix. The callback is therefore synchronous, using `.run()` / `.all()`.
- The file unlink happens after the commit, not inside it. Unlinking first would delete the bytes for
  a row that a rollback then keeps.

A third thing, added in round two after the audit: the transaction now reads the media row
tenant-scoped and bails before touching anything. See "Round two" below.

`adminMediaUsage` and the clear list are now one exported list, `MEDIA_REFS`, so the panel cannot
again list something the delete does not handle. The only visible copy change: a homepage hero slide
now reads "Homepage hero · #1" instead of "Homepage hero · Slide #1", since the fallback label is
shared. Seeded items still resolve correctly, including several kinds on one media row — media 1
returns both "Navigation card" and "School photo · Hun Sen Rolea B'ier High School", media 7 both
"Navigation card · team" and "Person photo · Mr. Heang Koy" (shot 21).

### The runnable check

`src/server/repo/media-refs.test.ts`, two assertions, no database:

- every `media.id` foreign key in the schema (found with `getTableConfig`) appears in `MEDIA_REFS`,
  and nothing extra;
- `clearBy === "row"` exactly where the column is `notNull`, which is what stops a future notNull
  column being nulled into an error.

Proven to fail: deleting the `Project map photo` entry makes the first assertion fail with the
missing `project_locations.photo_media_id`, and the entry was restored afterwards.

## Defect B — a rejected save stranded the form on `Saving…`

### Before

`/admin/pages/new`, title `J24-blank-slug`, URL segment left blank, Save page.
The button read **`Saving…`, disabled**, and was still disabled 26 s later (shot 01).
Only a reload frees it, and the reload discards everything typed.

The uncaught rejection had a second cost I did not expect. Vite relays client errors to the server
console and re-prints them, so each unhandled rejection re-entered the log wrapped in the previous
one. One blank-slug save grew `dev.log` to **4.97 GB** and filled `/tmp`. That stops once the
rejection is caught.

### After

Five of the twenty-one routes, four entities, one of them an edit form:

| Route | What I did | Button after | Toast |
|---|---|---|---|
| `/admin/pages/new` | segment `j24-hero-page`, already taken | back to `Save page`, enabled | `A page already exists at "j24-hero-page". Choose a different URL.` (shot 14) |
| `/admin/pages/new` | segment left blank | back to rest | raw zod blob at first (shot 16), `Segment is required.` after round two (shot 23) |
| `/admin/posts/new` | slug `j24-fk-post`, already taken | back to rest | `A post already exists at "j24-fk-post". Choose a different URL.` (shot 17) |
| `/admin/projects/new` | slug `j24-loc-project`, already taken | back to rest | `A project already exists at "j24-loc-project". Choose a different URL.` (shot 18) |
| `/admin/pages/41` (edit) | segment changed to `team`, already taken | back to rest | `A page already exists at "team". Choose a different URL.` (shot 19) |
| `/admin/campaigns/new` | slug `j24-campaign`, already taken | back to rest | `UNIQUE constraint failed: campaigns.tenant_id, campaigns.slug` (shot 20) |

Page 41's slug was unchanged after its rejected save, so the pre-check runs before the write.

### What changed

All 21 files got the same shape as `admin.users.new.tsx`: `try` around the mutation and everything
after it, `catch` toasting the message, `finally { setSaving(false) }`. No wrapper, no refactor.
`admin.nav.tsx` already imported `confirm` from the same module, so it gained `toast` alongside;
`admin.forms.$id.index.tsx` already had it. Round two replaced the message expression with
`saveErrorMessage(e)`, keeping each catch to one line.

### The raw messages, and what I did about them

The duplicate slug arrives as `UNIQUE constraint failed: posts.tenant_id, posts.slug`, read off the
real endpoint by replaying `adminPosts.create` with a taken slug (500). That is not a sentence, so
`createPost`, `createPage` and `createProject` now pre-check the slug the way `createUser` pre-checks
the email. `updatePost`, `updatePage` and `updateProject` got the same check with the record excluded
— an editor renaming a page into a collision hits exactly the same wall, and it is the same three
lines.

`campaigns` and `forms` also carry unique slugs and have no pre-check. I left them: the brief named
three, and the campaigns row above shows what the un-pre-checked case now looks like (usable form,
constraint string in the toast). Worth a follow-up.

`requireFreeSlug` runs outside the insert's own transaction, so two concurrent creates can both pass
it. See finding 1.

## Round two — two regressions the audit caught

### A cross-tenant write in the new `deleteMedia`

The thirteen UPDATEs and the `post_media` DELETE run on `where(eq(ref.column, id))` with no tenant
predicate. Only the final `delete(media)` was tenant-scoped, and it ran last. A delete aimed at
another tenant's media therefore refused to delete the row and blanked that tenant's records anyway.
The single-statement version I replaced could not do this, so it was mine, not inherited.

Reproduced against the running server. I added tenant 2 to the scratch database with one media row
(132) and one post (30) using it as a cover, then replayed the real mutation from the signed-in
tenant-1 session:

```
POST /api/trpc/adminMedia.delete?batch=1  {"0":{"json":{"id":132}}}  → 200
```

| | before the fix | after the fix |
|---|---|---|
| `media` 132 (tenant 2) | survives | survives |
| `posts` 30 `cover_media_id` (tenant 2) | **NULL** | **132, untouched** |

The transaction now selects the media row `where tenantId = TENANT and id = ?` and returns early if
it is absent, so nothing downstream runs on a row that has not been proved ours. That select also
supplies the `r2Key`, so the delete no longer needs `RETURNING`.

The tenant-1 path was re-run end to end afterwards on two referring tables: a fresh post with cover
media 133 and gallery media 134. Deleting the cover left the post with a NULL cover (shot 22),
deleting the gallery image removed the `post_media` row and left the post intact, and both files went
from `public/uploads/`.

### The blank segment still dumped a ZodError at the editor

Acceptance 3 asks the toast to name the reason, and the first of the three cases in the brief did not.
Fixed in the `catch` I already own: `saveErrorMessage` in `src/lib/save-error.ts` turns a serialised
ZodError into a sentence, names a dropped request, and otherwise passes the message straight through.
Each catch is now one line, so 21 copies of the parsing never existed.

Re-run live on `/admin/pages/new`, all three paths, button back at rest every time:

| Cause | Toast before | Toast now |
|---|---|---|
| segment left blank | `[{"origin":"string","code":"too_small","minimum":1,…}]` | `Segment is required.` (shot 23) |
| segment `team`, taken | `A page already exists at "team". Choose a different URL.` | unchanged |
| request dropped (browser set offline) | `Failed to fetch` | `Could not reach the server. Check your connection and try again.` (shot 24) |

That also retires the unreachable `"Could not save."` branch the audit found: any tRPC failure is an
`Error`, so its raw message always won. The fallback now only fires when there is genuinely no
message — a non-`Error` throw or an empty one — and `src/lib/save-error.test.ts` pins all five cases.

## Round three — three leaks the audit found

All three reproduced live first, all three in files I own.

### `UNAUTHORIZED` reached the editor as one word

`init.ts:41` throws `TRPCError({ code: "UNAUTHORIZED" })` with no message, so tRPC sends the code as
the message and `saveErrorMessage` passed it through. Reproduced on `/admin/donors/1`: type a name,
clear the session cookie, save — toast reads exactly `UNAUTHORIZED` while the sidebar still shows the
user signed in (shot 25).

`saveErrorMessage` now recognises the bare-code *shape* (`/^[A-Z][A-Z_]{2,}$/`), so no tRPC code can
reach a user as a single word again, whether or not I anticipated it. Seven codes get a specific
sentence — `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `TIMEOUT`,
`PAYLOAD_TOO_LARGE` — and anything else falls back to "Could not save. Try again, or reload the page
if it keeps failing."

After: `Your session has expired. Sign in again in another tab, then save — nothing you typed has
been lost.` (shot 27). That last clause is a claim, so I checked it: the name field still held
`J24-round3-session` after the rejection.

### `FOREIGN KEY constraint failed` reached the editor on save

The same unreadable-constraint class J24 removed from delete, reappearing on save. Reproduced with
two real tabs: upload a logo into `/admin/donors/1`, delete that media from `/admin/media` in tab B,
save tab A (shot 26).

After: `Something this record points at was deleted while you were editing. Reload the page, pick it
again, and save.` (shot 28).

`UNIQUE constraint failed: …` is handled in the same place, since it is the same class and I had
already recorded it reaching the user on campaigns. It now names the offending column —
`Another record already uses that slug. Choose a different one.` — which retires that gap without
touching the campaigns or forms repositories.

### `adminMediaUsage` was unscoped for the `post_media` reference

`postMedia` has no `tenantId` and the join to `posts` added no filter, so the usage panel crossed
tenants. Not a regression, but after round two the delete was guarded and the usage walk was not, so
the invariant this job established had an exception.

Reproduced with a planted tenant 2 (media 132, post 30, one `post_media` row), queried from the
signed-in tenant-1 session:

```
GET /api/trpc/adminMedia.usage  {"id":132}
before → [{"kind":"Post gallery","label":"j24-t2-post","href":"/admin/posts/30"}]
after  → []
```

Fixed on the join by giving that one ref `tenant: posts.tenantId`. Tenant-1 galleries still resolve —
media 56 still returns `Post gallery · album-library-launch`.

### On the test

`save-error.test.ts` now pins **verbatim `TRPCClientError.message` strings copied off the wire** from
the running server, not strings I reconstructed: the ZodError blob, `UNAUTHORIZED`,
`FOREIGN KEY constraint failed` and the campaigns `UNIQUE` string. That is strictly better than round
two's synthetic fixtures and covers both new shapes.

It is still not a pipeline test, and I could not find a cheap way to make one. Exercising a real tRPC
error end to end needs the router, which needs `bun:sqlite`, which vitest under Node cannot import;
a bun-only test would not run in `bun run test` and so would not be a gate. **A tRPC upgrade that
changed how it serialises a ZodError would still slip past these tests** and would show up as a
regression in the browser, not in CI. Saying so rather than adding assertions that only restate the
helper.

## Found, not fixed

1. **`deleteMedia` returns `void` for an id that does not exist**, so a delete that did nothing
   reports success. The reachable case is a double delete, where the outcome is right anyway.
   Returning `boolean` would be more truthful. Recorded at the coordinator's direction.
2. **`requireFreeSlug` runs outside the insert's transaction.** Two concurrent creates can both pass
   the check and one gets the raw constraint string. Nobody is stranded, because the caught rejection
   still frees the form; the message is just the ugly one. Recorded at the coordinator's direction.
3. **`PageForm` lets Save fire with an empty required segment**, which is why a server validation
   error reaches the editor at all. `saveErrorMessage` makes that arrival readable; blocking it at
   the source belongs in `src/components/admin/PageForm.tsx`, outside my file list.
4. **`PageForm` also keeps a stale segment.** Clearing the URL segment field on a form that already
   had one leaves the previous value in the form's own state — the preview still read
   `URL: /j24-hero-page` and the save submitted that segment. Same file.
5. **Two cosmetic regressions in the usage panel**, both from sharing one walk: a hero slide reads
   `Homepage hero · #1` rather than `Slide #1`, and `refUsage` dedupes project locations by
   `projectId`, so two locations on one project using the same photo list once. Both still clear
   correctly on delete. Polish, recorded at the coordinator's direction.
6. **An unhandled promise rejection can fill the disk.** See the 4.97 GB above. Nothing throttles or
   truncates vite's client-error relay, and each relayed error nests the previous one. Defect B was
   the trigger this time; anything else that rejects unhandled will do it again.
7. **Toast contrast**, unchanged from J23: `Dialogs.tsx:109-115` styles errors `bg-destructive/10
   text-destructive` with no solid backing. Readable over the page forms above, still poor over the
   media grid. Out of scope here.
8. **Row action menus are inconsistent.** Most lists label the destructive item `Delete`; campaigns
   label it `Delete campaign`. Cosmetic.

## Records created and cleaned up

Nine things created, all `J24-` prefixed, all deleted through the admin UI. A final scan for `j24`
across `posts`, `pages`, `projects`, `project_locations`, `campaigns`, `post_media` and `media`
returns zero rows.

| Entity | Record | Deleted |
|---|---|---|
| Media | 132 | yes, with its file |
| Media | 133 | yes, with its file |
| Media | 134 | yes, with its file |
| Media | 135 | yes, with its file |
| Post | 30 `j24-fk-post` | yes |
| Page | 41 `j24-hero-page` | yes |
| Project | 20 `j24-loc-project` | yes |
| Project location | 6 `J24-site` | yes, with its project |
| Campaign | 1 `j24-campaign` | yes |

Round two added one more post, `31 j24-round2-post`, with media 133 and 134 — all three deleted, both
files unlinked. It also planted a tenant 2 with one media row and one post to reproduce the
cross-tenant write; those exist only in the scratch database, which was destroyed at the end, and
`/uploads/j24-tenant2.png` was a row pointing at a file that never existed.

Rejected saves (blank page, duplicate page, post, project and campaign) created nothing.

No seeded record was deleted. `db:seed`, `db:push` and `db:migrate` were never run. Nothing under
`public/uploads/` was touched except the four files I uploaded, all of which the delete removed;
the directory has four files above my starting count of 59, all of them another pane's uploads made
during this run. The repo's `kape.db` was never opened by my server.

## Gates

- `bun run test` — **62 passed over 13 files**, nothing failing. My baseline at the start was 37 over
  9. Mine are `media-refs.test.ts` (2) and `save-error.test.ts` (9); the other pane's tests landed
  during the run and make up the rest.
- `bunx tsc --noEmit` — no output.
- `bun run format` — "No fixes applied" across all 236 files.

## Acceptance

All eight met. Acceptance 3 was short after round one — the blank-segment toast was a ZodError blob —
and is met now: every rejection shown names its reason in a sentence, including the expired session
and the stale reference that round three surfaced.
