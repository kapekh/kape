# UI2 - admin component review, source only

You review. You do not fix, and you do not open a browser. Another pane is driving the live admin
right now; a second browser session would fight it for the same database.

## Files you own

- `.work/ui-audit/STATIC.md` - your report

Everything under `src/` is read-only to you. Do not edit a single line.

## What this job is for

The browser pass finds what breaks. You find what is *inconsistent* - the thing a browser walk
misses because each page looks fine on its own and only the set is wrong.

Read all of `src/components/admin/*.tsx` and `src/routes/admin*.tsx`, plus `src/components/ui/*` for
the primitives they are built from. 34 components, 57 routes, roughly 8,000 lines of route code.
Budget your reads; skim the large files for the patterns below rather than reading every line twice.

## Do

Build one table per axis. Each row is a concrete site, not an impression.

1. **Empty states.** Every list page: what shows when there are zero rows? Name the pages with no
   empty state, the ones with a bare "No results", and the ones that offer the create action.
2. **Loading and pending.** What does each page show while its query is in flight? Which mutations
   disable their submit button, and which let you double-submit?
3. **Errors.** Where does a failed mutation surface? Toast, inline, or nowhere? List every mutation
   whose failure is swallowed.
4. **Destructive actions.** Which deletes confirm, which use `window.confirm`, which use a real
   dialog, and which just fire. Inconsistency here is a finding on its own.
5. **Unsaved changes.** `useDirty` exists. Which forms use it and which let you navigate away from
   an edited form with no warning?
6. **Labels and icon-only buttons.** Every icon-only control with no accessible name. Cite the line.
7. **Form field patterns.** Required marking, help text, error placement, autofocus. Name the
   outliers, not the majority pattern.
8. **Table patterns.** Column alignment, date formatting, truncation, row action placement. Say
   what the majority does and which pages deviate.
9. **Copy.** Button verbs, title case vs sentence case, "Delete" vs "Remove", terminology drift for
   the same concept across pages.
10. **Duplication worth collapsing.** Where the same 20 lines appear in six route files, say so and
    name the files. Only where a shared component would actually be simpler, not as a matter of
    taste.

## Acceptance

For each axis: a table with `file:line`, what is there, and what the majority pattern is. Then a
single prioritised list at the end, most user-visible first, each row sized `S`/`M`/`L` for the
work to fix it.

- Every claim carries `file:line`. A claim without one gets deleted before you write the report.
- Where the codebase is already consistent, say so in one line and move on. A clean axis is a
  result and it stops someone else re-checking it.
- No recommendation you cannot state as a concrete edit to a named file.

## Out of scope

- Editing anything.
- Opening a browser, running the dev server, running the test suite.
- The public site.
- Visual/aesthetic opinions with no user-facing consequence and no `file:line`.

## Stop conditions

- You need to run the app to answer something: leave the row marked `needs-browser` and move on.
  The other pane will pick it up.
- Never run `git` commands that write: no commit, checkout, reset, stash.
