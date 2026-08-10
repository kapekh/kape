# UI1 - admin browser audit, round 1

You test. You do not fix. A fix you make is a file another pane owns.

## Target

`http://localhost:3011` - dev server already running in another pane, on a scratch DB copy
(`.work/scratch/uitest.db`). Break its data freely; it is a throwaway.

Login: `http://localhost:3011/login`, `admin@kapekh.org` / `kape-admin-2026`.
Second account for permission checks: `staff@kapekh.org` / `kape-staff-2026`.

Drive it with the Playwright MCP tools (`mcp__plugin_playwright_playwright__*`). Real browser, real
clicks. Never assert from source code - if you did not see it in the page, it did not happen.

## Files you own

- `.work/ui-audit/R1.md` - your report
- `.work/ui-audit/shots/` - screenshots

Nothing under `src/`. Read source only to locate a defect's line for the report.

## Do

Cover every admin surface. The routes are `src/routes/admin.*.tsx` - list them first and tick them
off, so "every page" is a checklist and not a feeling.

1. **Auth.** Wrong password, empty fields, rate limiting, logout, direct hit on `/admin/*` while
   logged out, then back after login. Does it return you where you were going?
2. **Every list page.** Empty state, sorting, filtering, search, pagination, row actions, bulk
   actions. A list that shows nothing and says nothing is a defect.
3. **Create.** For pages, posts, projects, people, partners, schools, offices, forms, campaigns,
   donors, users, roles: fill the form, save, confirm the row appears AND the public site reflects
   it where it should. Submit empty. Submit rubbish (a 300-char title, a slug with spaces, a
   duplicate slug, HTML in a text field, a past date where a future one belongs).
4. **Edit.** Change a record, save, reload, confirm it stuck. Change nothing and save. Open two
   tabs on one record and save both.
5. **Delete.** Confirm dialog, cancel path, delete path, and what happens to a record something
   else points at.
6. **Upload.** `/admin/media`. Fixtures in `.work/fixtures/`: `test-image.png`, `test-doc.pdf`,
   `evil.svg`. Upload each. Then try a file with no extension, a 0-byte file, and a name with
   spaces and unicode. Confirm the uploaded file actually serves at its URL. Insert a media item
   into a page body through the editor and confirm it renders on the public page.
7. **The page editor.** Rich text: bold, link, image, table, headings, lists. Undo. Paste. Does the
   saved HTML survive a reload unchanged? Does the public page render what the editor showed?
8. **Settings, nav, footer, languages, modules, org chart, locations, roles.** Change something in
   each and confirm the public site changes. Turning a module off should remove it from the sidebar
   and from the public site.
9. **Permissions.** Log in as staff. Which admin pages does the sidebar offer, and does typing a
   forbidden URL directly get refused? A page that 500s instead of refusing is a defect.
10. **Keyboard and screen-reader shape.** Tab through each page type. Focus visible? Dialogs trap
    focus and return it? Toasts announced? Form errors tied to their field?
11. **Responsive.** 1440x900, 768, 375. Sidebar, tables, dialogs, editor toolbar at each.
12. **Console and network.** Keep the console open. Every uncaught error, failed request, or 500 is
    a finding, even where the UI looked fine.

## Acceptance

Your report is a table, most severe first:

| id | severity | page | what you did | what happened | what should happen | file:line |

- `severity`: `high` (a user cannot finish a real task, or data is lost/corrupted, or a security
  hole), `med` (friction, exclusion, wrong-looking output), `low` (polish).
- "what you did" is a repro a stranger can follow: URL, the exact clicks, the exact input.
- A finding with no repro is not a finding. Delete it.
- Cite `file:line` where you can. Say "not located" where you cannot; do not guess.
- Screenshot every `high` into `.work/ui-audit/shots/` and name the file after the finding id.

End the report with a **Covered** section: every admin route, and for each one, tested or skipped
with the reason. An honest skip beats a silent one.

## Out of scope

- Editing anything under `src/`.
- The public site, except where you are confirming an admin change landed.
- Restyling, redesigning, or opinions about the visual language with no user-facing consequence.
  "The spacing is inconsistent" needs a screenshot and a location to be a finding.

## Stop conditions

- The dev server dies and does not come back: report it, do not restart it yourself.
- You need to change a source file to continue: stop, report what blocks you.
- Never touch `kape.db` in the repo root. Your DB is `.work/scratch/uitest.db`.
- Never run `git` commands that write: no commit, checkout, reset, stash.
