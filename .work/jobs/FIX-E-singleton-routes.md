# FIX-E - the singleton admin screens

The one-of-a-kind screens: footer, settings, header nav, org chart, languages, media. Each is the
only way to do its job, so a swallowed failure there has no second route. Evidence:
`.work/ui-audit/STATIC.md` rows 2, 3, 15, 20 and `.work/ui-audit/R1.md` rows M07, M11, L21.

## Files you own

- `src/routes/admin.footer.tsx`
- `src/routes/admin.settings.tsx`
- `src/routes/admin.nav.tsx`
- `src/routes/admin.org-chart.tsx`
- `src/routes/admin.languages.tsx`
- `src/routes/admin.media.tsx`
- `src/components/admin/TermsManager.tsx`
- `src/components/admin/OrgCanvas.tsx`

Not yours: `src/routes/admin.tsx`, the list pages, `Dialogs.tsx`, `useDirty.ts`, `ActionMenu.tsx`,
`form-ui.tsx`, `RichTextEditor.tsx`, `MediaLibraryDialog.tsx`. Several of those changed this round -
**read their current props before using them**, do not edit them.

The lead has already applied the `useDirtyGuard(..., ..., !loading)` argument at
`admin.footer.tsx:204` and `admin.nav.tsx:58`. Leave those two lines alone.

## Do

1. **STATIC 2 - `admin.footer.tsx:178` has no `try`.** One rejected `settings.set` pins the button
   on "Saving…" forever and the only way out discards the edits. `admin.nav.tsx:44` already does
   this correctly - copy that shape rather than inventing a third.
2. **STATIC 20 - a save with no confirmation, no error and no visible change.**
   `admin.settings.tsx:570` and `TermsManager.tsx:164` write a row and say nothing at all. Confirm
   success, surface failure.
3. **STATIC 3 across your files - swallowed mutation failures.** Every mutation in your six routes:
   either it reports its failure to the user or you say in your report why it cannot fail. "It
   probably won't" is not a reason.
4. **STATIC 15 - a mutation with no `disabled` while in flight.** Your files hold several of the 12
   Add/Save/Move controls that can be double-fired. Disable while pending.
5. **M07 - controls named by their glyph.** `admin.nav.tsx:446,454,462,477,485` (25 rows x 5
   buttons) and the footer's 19 are announced as `↑`, `↓`, `＋`, `✎`, `✕`. The `title` attribute is
   dead weight: a button with text content never takes its name from `title`. Give each an
   `aria-label` or an `.sr-only` label, and include what it acts on - "Move Home up", not "Move up".
   `OrgCanvas.tsx:124-147` has the same problem.
6. **M11, your half - a save that worked says nothing.** Save identity and Save header settings both
   complete silently; only Save modules confirms. Make the confirmation consistent across your six.
7. **L21 - video is treated as a generic file** in `/admin/media`: counted as "files", given the 📄
   tile, and absent from the filter tabs. Give video its own kind, tab and preview. The audit
   confirmed upload and serving already work, so this is presentation only.
8. **`admin.languages.tsx:159` renders an empty table with no empty state.** Same fix the list
   pages are getting; do yours.

## Acceptance

Paste real output or a screenshot path. Dev server already on `http://localhost:3011`, admin
`admin@kapekh.org` / `kape-admin-2026`. Do not start a second server.

1. `bunx tsc --noEmit` silent; `bun run test` fully green and at least **356 over 37 files**;
   `bun run lint` 8 errors 0 warnings or fewer.
2. **A table of every mutation in your six routes**: file:line, what it does, how failure reaches
   the user now, and whether the control disables while pending. No blanks.
3. **The footer failure, in a browser.** Block the `settings.set` request, click Save footer, and
   screenshot the result. The button must recover and the edits must survive. This was the defect;
   show it gone.
4. **A silent save, now confirmed**: screenshot Save identity and one `TermsManager` save both
   confirming.
5. **M07 in a browser**: paste the accessible name of five nav row buttons and five footer buttons.
   None may be a bare glyph, and each must name what it acts on.
6. **L21**: upload a video, screenshot the tile, the counter and the filter tabs.
7. Two screenshots at 1440x900 showing `/admin/settings` and `/admin/nav` otherwise unchanged.

## Out of scope

- The list pages, the page editor, the shared primitives. All owned elsewhere this round.
- Restyling any of these screens.
- The media library dialog and the rich text editor - another job owns the alt-text work (M08, L20).
- Copy drift (STATIC 11). A separate pass.

## Stop conditions

- A fix needs a file you do not own: stop and report the exact edit.
- `bun run test` goes red and you cannot fix it inside your own files: stop and report.
- Never touch `kape.db` in the repo root. The server runs on `.work/scratch/uitest.db`.
- Never run `git` commands that write.
