# FIX-C - the shared admin primitives

Every one of these is used by 20+ screens, so each fix lands once and every page gets it. Evidence:
`.work/ui-audit/R1.md` rows M09, M10, M11, L16, L17 and `.work/ui-audit/STATIC.md` rows 9, 17, 18.

## Files you own

- `src/components/Dialogs.tsx`
- `src/components/admin/useDirty.ts` (and its two existing test files)
- `src/components/admin/ActionMenu.tsx`
- `src/components/admin/form-ui.tsx`
- `src/components/admin/LangTabs.tsx`
- New test files beside any of the above

Nothing else. `src/routes/admin.tsx` is live in another pane, the page editor is live in a third.
**You change the primitives; you do not sweep the call sites.** A later job does that with your API.

## Do

1. **M09 - a dialog dumps focus on `BODY` when it closes.** The trap is right and the roles are
   right; only the return is missing. `finish()` at `src/components/Dialogs.tsx:99-104` resolves and
   unmounts without restoring the opener. A keyboard user who deletes a row lands at the top of the
   document and tabs through the whole sidebar to get back.
   - Remember the element that had focus when the dialog opened, restore it on every exit path:
     Escape, Cancel, Confirm, and a click outside.
   - If that element is gone - the row was just deleted - move focus somewhere sensible and say in
     your report where you chose and why.
2. **M11 - a validation error is a 4.5s toast in the far corner.** The toast host is
   `src/components/Dialogs.tsx:109-126`. Toasts are the right tool for "saved", the wrong one for
   "this field is invalid".
   - Keep the toast for confirmations. Make sure it is actually announced: the audit could not
     establish whether the `<output>` region reaches a screen reader, so settle it and show how.
   - A toast fired while a confirm dialog is open sits behind it (`Dialogs.tsx:172`). Fix the
     ordering.
3. **M10 - a form is dirty before anyone types.** `useDirty.ts:22-32` captures the baseline before
   the async data arrives, so `/admin/footer` offers "Unsaved changes - leave and lose the edits?"
   on a page nobody touched, and the Save button is enabled on load.
   - The baseline settles once the data it describes has arrived.
   - Do not fix it by weakening the guard. A form that has really been edited must still warn.
     Prove both directions.
4. **L16 - the row action menu says `role="menu"` and ignores the arrow keys.** Tab and Escape work
   and Escape returns focus correctly, so only arrow movement is missing. Add Up/Down, Home/End,
   and wrap. `PageSwitcher.tsx:132-152` is the working pattern in this codebase - copy it rather
   than inventing a second one.
5. **STATIC 9 - every row's menu is called "Row actions".** All 18 call sites take the default, so
   a screen reader hears one name 40 times on a page. Give `ActionMenu` a `label` prop and a
   sensible fallback. **You add the prop; you do not edit the 18 call sites.**
6. **STATIC 18 - no required field is marked, anywhere.** No visual marker, and no hint tied to its
   field with `aria-describedby`. Both belong in `form-ui.tsx` so they land once. Give the field
   components `required`, `error` and `hint`, wire `aria-invalid`, `aria-describedby` and the id
   plumbing, and leave the call sites to a later job.
7. **STATIC 17 - `LangTabs.tsx:36-53` announces tabs it has not built**: no `aria-controls`, no
   arrow-key movement. Either build the pattern properly or stop claiming it in the roles.

## Acceptance

Paste real output or a screenshot path for each. Dev server is already on `http://localhost:3011`;
admin `admin@kapekh.org` / `kape-admin-2026`. Do not start a second server.

1. `bunx tsc --noEmit` silent; `bun run test` fully green, at least **333 over 33 files**;
   `bun run lint` 8 errors 0 warnings or fewer.
2. **M09 in a browser**: on `/admin/pages`, keyboard-open a row menu, choose Delete, and paste
   `document.activeElement` after Escape, after Cancel, and after Confirm. Three exits, three
   sensible landings, none of them `BODY`.
3. **M10 in a browser**: load `/admin/footer`, touch nothing, click a sidebar link - no prompt, and
   paste the Save button's `disabled`. Then edit one field and show the prompt still appears. Both
   directions or it is not fixed.
4. **M10 in a test**: a test that fails if the baseline is captured too early. Mutation-test it -
   put the early capture back, show the named test failing, restore it. Paste both runs.
5. **L16**: paste the focused element after each of ArrowDown, ArrowDown, ArrowUp, End, Home in an
   open row menu.
6. **The toast**: show it is announced, and show one fired while a confirm dialog is open is
   reachable and on top. Screenshot the second.
7. **form-ui**: a short throwaway usage exercising `required`, `error` and `hint` together; paste
   the rendered `aria-invalid`, `aria-describedby` and the ids they point at. Delete the throwaway
   before you finish and say you did.

## Out of scope

- Sweeping call sites: the 18 `ActionMenu` uses, the forms that would pass `required`, the pages
  that would pass `label`. You ship the API; a later job adopts it.
- `src/routes/admin.tsx`, the page editor files, the list pages. All owned elsewhere.
- Restyling. These are behaviour and semantics fixes.

## Stop conditions

- A fix needs a call site you do not own: stop, report the exact edit, leave the API in place.
- `bun run test` goes red and you cannot fix it inside your own files: stop and report.
- Never touch `kape.db` in the repo root. The server runs on `.work/scratch/uitest.db`.
- Never run `git` commands that write.
