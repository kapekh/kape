# FIX-A - the admin shell

Three confirmed defects, all in one file. Evidence: `.work/ui-audit/R1.md` rows H2, M06, M13.

## Files you own

- `src/routes/admin.tsx`
- `src/routes/admin.forbidden.tsx` - new, if you take that route for M13

Nothing else. Other panes hold the list pages, the dialogs and the page editor.

## Do

1. **H2 - the admin is unusable below the desktop breakpoint.** At 375x812 the 256px sidebar never
   collapses, `main` is 104px wide, and the document overflows horizontally (530px in a 360px
   viewport). At 768px the document fits but the content is still squeezed.
   - Below the breakpoint the sidebar comes out of the layout and sits behind a toggle: a button in
     the header, a drawer that traps focus while open, Escape closes it, focus returns to the
     toggle, and a click outside dismisses it.
   - The toggle needs `aria-expanded` and `aria-controls`, and the drawer needs a name.
   - Above the breakpoint nothing changes. The desktop layout is signed off; do not restyle it.
   - The sidebar nav already has `hide-scroll` and scrolls without a visible scrollbar. Keep that.
   - The table clipping half of H2 is **not yours** - the wrappers live in the list pages, which
     another pane owns. Fix the shell only.
2. **M06 - two elements announce `aria-current="page"`.** The Dashboard link matches on the
   `/admin` prefix, so it stays "current" on every admin page. A screen reader announces two
   current pages. The visual active state is already right; only the announced one is wrong.
   `activeOptions={{ exact: true }}` on the item with `exact: true` is the intended shape.
3. **M13 - a signed-in user is asked to sign in.** `beforeLoad` redirects to `/login` when a role
   lacks the permission or a module is off, so staff who are already authenticated land on the
   sign-in form while `/api/auth/me` still returns their session.
   - Distinguish the two cases. **No session** keeps redirecting to `/login`. **A session without
     access** gets a page that says so and offers a way back to `/internalsources`.
   - Do not weaken the gate. The server-side refusal stays exactly as it is - the audit confirmed
     all 27 routes and five tRPC procedures return 403, and that must still be true when you are
     done.

## Acceptance

Paste real output or a screenshot path for each.

1. `bunx tsc --noEmit` silent; `bun run test` fully green and at least **333 over 33 files**;
   `bun run lint` 8 errors 0 warnings or fewer.
2. **H2 in a browser**, dev server already on `http://localhost:3011`, admin
   `admin@kapekh.org` / `kape-admin-2026`. At 375x812 on `/admin/users`: screenshot with the drawer
   closed and with it open, and paste `document.documentElement.scrollWidth` against
   `window.innerWidth` - they must be equal, where the audit measured 530 against 360.
   Then 1440x900: screenshot showing the desktop layout unchanged.
3. **H2 keyboard**: open the drawer with the keyboard, Tab three times and show focus stayed
   inside, press Escape, and show focus back on the toggle. Paste the focused element at each step.
4. **M06**: paste `document.querySelectorAll('[aria-current="page"]').length` on `/admin/pages`.
   It must be 1. It was 2.
5. **M13**: sign in as `staff@kapekh.org` / `kape-staff-2026`, open `/admin/pages`, screenshot the
   result. Then show `/api/auth/me` still returning the staff session, and show
   `adminPages.list` still answering **403** for that user. The screen changes; the refusal does not.
6. Nothing above 1024px moved: two screenshots at 1440x900, `/admin/pages` and `/admin/settings`.

## Out of scope

- The table wrappers in `admin.*.index.tsx`. Another pane owns those.
- Any restyle of the desktop layout.
- The sidebar's labels and grouping. Content, not layout.

## Stop conditions

- You need a file you do not own: stop and report with the exact edit.
- `bun run test` goes red and you cannot fix it inside your own file: stop and report.
- The dev server dies: report it, do not restart it.
- Never run `git` commands that write.
