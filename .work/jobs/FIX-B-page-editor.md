# FIX-B - the page editor loses work and accepts URLs that do not work

Evidence: `.work/ui-audit/R1.md` rows H1, H3, H5, L19, M11.

## Files you own

- `src/routes/admin.pages.$id.tsx`
- `src/routes/admin.pages.new.tsx`
- `src/components/admin/PageForm.tsx`
- `src/routes/$.tsx`
- `src/lib/slug.ts` - new, if you take that route
- `src/lib/slug.test.ts` - new
- The `adminPages` create/update input schema and handler, wherever they live in
  `src/server/repo/admin.ts` and `src/integrations/trpc/router.ts`. **Only the `adminPages`
  procedures.** Both files are large and shared; touch nothing else in either.

## Do

1. **H1 - a two-tab edit silently destroys the older save.** Open a page in two tabs, save B, then
   save A: A overwrites B, the reloaded record is A's, and nobody is told. The message for this
   already exists and unused at `src/lib/save-error.ts:19` (`CONFLICT`); nothing ever sends the code.
   - The update carries the version the editor loaded - `updatedAt` is already on the row - and the
     server refuses when the stored value has moved.
   - The refusal has to reach the editor as a message the author can act on: what happened, and a
     way to reload the current version. Losing the typing on refusal is a worse bug than the one
     you are fixing, so the draft stays on screen.
   - **Do not add a migration.** If `updatedAt` is not maintained on update, make the update
     maintain it.
2. **H3 - a page with sections ships with no `h1` and no title.** `src/routes/$.tsx:218-224`
   bypasses the `SubPage` wrapper that owns the `h1` once `page.sections.length > 0`, so a
   published page has zero `h1` in the document, no brief and no breadcrumb - while the editor
   still makes you fill the Title in.
   - A published page renders its title. No published page ships without an `h1`.
   - A hero section that already renders its own `h1` must not produce a second one. Check what the
     section templates emit before you choose where the title goes.
3. **H5 - the URL segment accepts anything.** `ui1 slug with spaces` and `../ui1-escape` both save.
   The editor shows `URL: /../ui1-escape`, which 404s, and both land in `sitemap.xml` verbatim -
   a raw space in `<loc>` is invalid and crawlers drop the entry.
   - Validate on the **server** as well as the client. A client-only rule is not a rule.
   - Lowercase, no spaces, no `/`, no `.`, no leading or trailing `-`. Decide whether you slugify
     silently or reject with a message, and say which you chose and why. Rejecting is usually
     kinder than silently renaming someone's URL.
   - Existing rows may already violate this. Do not rewrite them and do not break the editor for
     them; validate what is being written.
4. **L19 - a 300-character title is accepted**, producing a 307-character `<title>` and breaking
   the Parent page dropdown on every other editor. Cap it, and truncate the dropdown label.
5. **M11 - a validation failure appears as a toast in the far corner and disappears.** "Segment is
   required." fires as a 4.5s toast; the field is not marked required, gets no `aria-invalid`, and
   focus never moves to it. A save that succeeds says nothing at all.
   - The field error sits next to its field, is tied to it with `aria-describedby`, and the first
     invalid field takes focus.
   - A save that worked confirms it.

## Acceptance

Paste real output or a screenshot path for each.

1. `bunx tsc --noEmit` silent; `bun run test` fully green and at least **333 over 33 files**;
   `bun run lint` 8 errors 0 warnings or fewer.
2. **H1 reproduced and fixed in a browser.** Dev server already on `http://localhost:3011`, admin
   `admin@kapekh.org` / `kape-admin-2026`. Two tabs on one page, save B, save A: show A refused,
   show the message, show the draft still on screen, and show that after reloading, B's text is
   what is stored. This is the audit's exact repro; run it, do not simulate it.
3. **H3**: create a page with a title and a brief, publish, add one Rich text section, save, load
   the public page, and paste `document.querySelectorAll('h1').length` and the `h1` text. It must
   be exactly 1 and it must be the title. It was 0.
4. **H5**: try to save `ui1 slug with spaces` and `../ui1-escape`. Show both refused in the UI, then
   show the **server** refusing them too by calling the `adminPages` mutation directly with those
   values, so it is clear the rule is not client-only. Then confirm a valid segment still saves.
5. **Regression check on H5**: the audit confirmed a duplicate slug is already caught with
   "A page already exists at …". Show that still happens.
6. **L19**: paste a 300-character title, show the cap, and show the Parent dropdown readable.
7. **M11**: submit with an empty segment. Screenshot the error beside the field, and paste the
   focused element and the field's `aria-describedby` and `aria-invalid`. Then show a successful
   save confirming itself.
8. Your slug rule has tests covering: spaces, `..`, `/`, uppercase, leading and trailing `-`, and a
   valid segment. **Mutation-test one**: remove the `..` guard, show the named test failing, put it
   back. Paste both runs.

## Out of scope

- The rich text editor's toolbar and image handling. Another pane owns `RichTextEditor.tsx`.
- Anything in `src/server/repo/admin.ts` or the tRPC router outside the `adminPages` procedures.
- The dirty-state hook and the toast host. Another pane owns `useDirty.ts` and `Dialogs.tsx` - if
  M11 needs a change there, stop and report the exact edit rather than reaching across.
- Any schema migration.

## Stop conditions

- Fixing H3 needs a section template file: stop and report which one. `SectionRenderer.tsx` is
  spoken for.
- `bun run test` goes red and you cannot fix it inside your own files: stop and report.
- Never touch `kape.db` in the repo root. The server runs on `.work/scratch/uitest.db`.
- Never run `git` commands that write.
