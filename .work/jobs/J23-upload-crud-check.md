# J23 — File upload and admin CRUD, exercised for real

Nobody has driven the admin's write paths end to end since the J18 round-trip, and that one covered
three entity types. This job exercises upload plus create/read/update/delete across the admin and
reports what actually breaks. It is an exercise-first job: find, prove, then fix only what falls in
the files you own.

A fake that reproduces the symptom is how a bug ships. Every claim here needs the real admin UI, the
real upload endpoint and the real database behind it. Do not assert from reading the code.

## Files you own

Report:

- `.work/j23-report.md`
- `.work/j23-shots/`

Fix surface, only for defects you have first demonstrated:

- `src/routes/admin.media.tsx`
- `src/routes/api.media.$.tsx`
- `src/server/storage.ts`
- `src/components/admin/MediaPicker.tsx`
- `src/components/admin/MediaLibraryDialog.tsx`
- `src/components/admin/MediaThumb.tsx`

Anything outside that list is a finding, not a fix. `src/components/Header.tsx` and
`src/components/NavLink.tsx` belong to J22 and are live right now.

## Getting in

`admin@kapekh.org` / `kape-admin-2026`, from `src/server/seed/users.ts:20-21` - the committed dev
defaults for this local seed, on a localhost dev server, at the repo owner's request. Sign in at
`http://localhost:3000/login`.

Two things that will waste your time if you do not know them:

- `/admin` renders "Checking access..." on a hard navigation and takes up to 3.5s to paint. Wait on
  `main h1`, not on a fixed delay.
- `resolveRouteCached` reads a `render_cache` table with a 7-day TTL, so a correct admin edit can
  look like it did nothing on the public page. Before calling a round-trip broken, check whether the
  cache is serving it.

## Do

1. **Upload, the real endpoint.** From `/admin/media`, upload each of: a JPEG, a PNG, an SVG, a PDF,
   a file over any configured size cap, and a file whose extension lies about its content (rename a
   `.sh` to `.png`). Record for each: does it land, what does the library show, what does
   `/uploads/...` serve back, and what does the user see when it is refused.
2. **Upload from inside a form.** Open `/admin/posts/new`, attach an image through `MediaPicker`,
   save, and confirm the image survives to the public post. Repeat through
   `MediaLibraryDialog` on a page editor.
3. **CRUD per entity.** For each of posts, pages, projects, people, partners, offices, schools,
   forms and users: create a record you own (prefix every title `J23-`), read it back in the list,
   update one field, confirm the update stuck after a reload, then delete it. Record the outcome of
   all five steps in a table.
4. **The dirty-state and validation edges.** Submit each form empty, submit with a duplicate slug,
   and navigate away from a form with unsaved changes. Note where errors surface inline, where they
   surface only as a toast, and where they surface nowhere.
5. **Delete safety.** For at least one entity, delete something referenced elsewhere (a person on
   the org chart, a media item used by a post) and record what happens to the referring view.
6. **Fix what is yours.** Only defects inside your fix surface, only after you have demonstrated
   them, each with a before/after screenshot.

## Acceptance

1. `.work/j23-report.md` exists with three tables: uploads by file type, CRUD by entity with five
   columns, and validation edges. Every row carries an observed outcome, not an expectation.
2. Screenshots in `.work/j23-shots/` for every failure you report. A failure with no image is a
   hunch.
3. For each fix: the before image, the after image, and the exact reproduction steps.
4. `bun run test` - 31 tests over 8 files, all passing. Baseline recorded 2026-08-06 16:45.
5. `bunx tsc --noEmit` - no output.
6. `bun run format` - "No fixes applied".
7. State plainly how many `J23-` records you created and confirm each was deleted. List any you
   could not delete and why.

## Out of scope

- Redesigning any admin screen. Report ugly, fix broken.
- The public site's appearance. You are behind the login.
- The form builder's field types - that is J07, unstarted, and it owns `FormBuilder*`.
- Lint. It is red repo-wide and is J12's problem.

## Stop conditions

- **Never delete a seeded record.** Yours are the `J23-` ones. Deleting anything else is
  unrecoverable without a reseed, and a reseed would destroy the other pane's work.
- Never run `bun run db:seed`, `db:push` or `db:migrate`.
- Do not delete or edit anything under `public/uploads/` that you did not upload.
- If the login is refused by a permission gate, stop and report it. Do not work around it, and do
  not fabricate the round-trip from repo-layer calls.
- A defect outside your fix surface: write it up and move on. Do not reach across.
