# J02 — shell, dashboard, login

Read `.work/redesign/jobs/COMMON.md` first. Port **3042**. Deltas: S1-S6, D1-D5, X3, X4.

This is the frame every other job's work sits inside, and the first screen anyone sees.

## Files you own

```
src/routes/admin.tsx        (617 lines — the shell)
src/routes/admin.index.tsx  (380 lines — the dashboard)
src/routes/login.tsx        (the sign-in screen)
```

J01 added one line to `admin.tsx`: the `.admin` class on the shell root. Leave it.

## Do

### The shell — `admin.tsx`

1. **S1 — collapse the identity cluster.** The topbar currently carries View site, theme toggle, avatar, email, role, My account and Log out as seven separate controls. At 390px all three text buttons wrap to two lines each (`.work/redesign/shots/rd-07-posts-mobile.png`).

   One avatar menu holding email, role, My account, theme and Log out. View site keeps its own control.

   **The logout handler, the `/api/auth/logout` fetch and the navigate that follows are behaviour. They move; they do not change.**

2. **S2 — keep the accordion exactly as it is.** One group open at a time, the localStorage keys `admin-nav-open` and `admin-nav-rail`, the hydration-safe initialisation at `:327` and `:338-341`, the `inert` drawer at `:437`, the `activeOptions` exact match on Dashboard at `:492`. All of it was earned by bugs and all of it stays.

   You restyle it. You do not touch how it works.

3. **S4 — breadcrumbs.** `PageHeader` from J01 has the slot. The shell provides nothing; each route fills it. Your job here is only to make sure the shell's layout gives it room.

4. **S5 — per-surface width.** The content column is `max-w-[1600px]` and most pages render a ~768px card left-aligned inside it, leaving ~400px empty at 1440 (`rd-04-settings.png`). Give the shell a way to express prose width against full width, and document it in your report so the twelve downstream jobs use it.

5. **S6 — the studio branch.** `:311` decides full-bleed chrome by regex on the pathname. Keep the regex. Auto-collapse the rail on studio routes and restore the user's own preference on exit. **The stored preference must not be overwritten by the automatic collapse** — a user who chose a wide rail still has it when they leave the page builder.

6. **X4 — the no-access screen** (`:121-157`). One of the four `h1` treatments in F08. Onto `PageHeader` and the standard empty-state treatment.

### The dashboard — `admin.index.tsx`

7. **D1 — stat row.** Four cards, ~130px tall each for one number, and the first carries a coral left edge the others lack. One consistent treatment.

8. **D2 — the traffic chart.** No axis, no gridline, no hover, no value; 511 total rendered as mostly-zero bars. Give it a y-axis, a hover value and a stated range.

   **Read the `dataviz` skill before writing a line of chart code.** Palette, form and accessibility come from there.

9. **D3 — Content by type is misleading and that is the most important thing on this screen.** The bars are not zero-based on a shared scale, so 4 and 2 render at roughly 90% and 75% of the track. Either put them on a zero-based shared scale or drop the bars for a plain count list. A plain list is better than a chart that lies.

10. **D4 — the Manage panel.** Seven buttons duplicating an arbitrary subset of the sidebar, in no order. Replace with something a returning operator wants: recent activity, or the drafts and unanswered messages that need them.

11. **D5 — promote Needs attention.** It is the most useful panel and the least prominent.

### Login — `login.tsx`

12. **X3.** The first screen anyone sees, outside the admin shell. Give it the new language.

13. Two known defects live here and **both are logic, so you fix neither**. Note them in your report so they are not lost: a 429 rate-limit response is reported as "Invalid email or password" (`:39`), and the error `<div>` has no `role="alert"` (`:71-75`).

    The `role="alert"` one is arguably markup. **Ask the lead before adding it** rather than deciding.

## Acceptance

1. The four gates from COMMON, pasted.
2. **The sidebar still behaves.** With `admin-nav-open` set to `Posts`, full-load `/admin/media`, `/admin/users`, `/admin/posts`, `/admin/pages`, `/admin/settings`. Paste the hydration error count for each. It must be **0 on all five** — a prior round shipped a hydration bug here and this is its regression check.
3. **One group open at a time.** Click through every group and paste the count of `aria-expanded="true"` after each. Never above 1.
4. **Landing in a shut group opens it.** `/admin/settings` with `Site` shut gives `Site` open and `Settings` carrying `aria-current="page"`. Survives reload. Paste both.
5. **Exactly one `aria-current="page"`** on `/admin`, `/admin/pages` and `/admin/media`. Paste the list for each. (`/admin/posts?type=…` announces three today and is a known open defect — record what you see, do not fix it.)
6. **The drawer is still inert when shut.** At 390px, count focusable controls inside `#admin-sidebar` with the drawer shut, then open. Paste both numbers. Shut must be **0**; open must restore all of them.
7. **Escape closes the drawer and returns focus to the toggle.** Paste the active element before, during and after.
8. **The rail still collapses and remembers.** At 1440, collapse, reload, confirm still collapsed. Then enter `/admin/pages/1`, confirm auto-collapse, leave, confirm the user's own preference is back. Paste each step.
9. **Log out still works.** Click it in the new menu, show the redirect to `/login`, then show `/admin/pages` redirects to `/login`.
10. **Skip link is still the first tab stop** and one Tab after activating it lands inside `main`. Paste the sequence.
11. **The dashboard's numbers are unchanged.** Paste every stat before and after your change, from the same database.
12. **Content by type is honest.** Show the rendered widths for the values 4 and 2 and demonstrate the ratio matches the data.
13. **Login works.** Wrong password shows the error; right password lands in the admin. Paste both.
14. Screenshots at 1440 and 390, light and dark, of shell, dashboard and login. Six or more into `.work/redesign/shots/j02-*.png`.

## Out of scope

- Any route other than your three. You are not restyling a list or an editor.
- The command palette. That is J15, and it will ask you for a mount point through the lead.
- The `?type=` triple `aria-current` defect. Known, needs the link layer, not this job.
- The 429 message and the `role="alert"` on login, unless the lead says otherwise.
- Changing the accordion's one-at-a-time rule. It is Rithy's explicit call.

## Stop conditions

Everything in COMMON, plus:

- **Any hydration error appears that was not there before.** Both pieces of sidebar state must start at the server's value and adopt storage in an effect. This exact bug shipped once already.
- **The `inert` drawer stops working**, or the desktop rail becomes inert. Both were regressions once.
- You cannot express the identity menu without changing what logout does.
- The dashboard's numbers change. They are data, and a redesign that alters them has broken something.
