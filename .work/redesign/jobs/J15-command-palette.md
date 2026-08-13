# J15 — command palette

Read `.work/redesign/jobs/COMMON.md` first. Port **3055**. Delta: S3.

**This is the only job in the round that adds a component rather than restyling one, and it is the first thing to cut if the round runs long.** Confirm with the lead that it is still wanted before you start.

## Why it exists

The sidebar accordion opens one group at a time, which is Rithy's explicit call and is not changing. The cost is that from the dashboard an operator sees three links and six shut headers, and there is no global search anywhere in the admin. The palette is the answer to that, not a replacement for the nav.

## Files you own

```
src/components/admin/CommandPalette.tsx  (new, and the only file you own)
```

**You do not own `src/routes/admin.tsx`.** J02 does. The palette needs a mount point there, which is roughly three lines.

Write the component, prove it in isolation, then **hand the exact diff to the lead**, who applies it. Do not edit that file. This is the one job in the round with a deliberate hand-off, and reaching across is how the last round lost work.

## Do

1. **A dialog that opens on a keyboard shortcut and on a visible control.** A shortcut nobody can see helps nobody occasional, and the chosen direction is guided, so the visible entry point is not optional. Put the control at the top of the sidebar rail.

2. **What it searches**, in this order of value:
   - every admin route the current user can actually see
   - pages, posts and records by title

   **Route search costs nothing**: the nav array and the permission filter already exist in `admin.tsx` and can be passed in as a prop.

   **Content search costs a query, and that is where the boundary is.** If you can serve it from data the shell has already loaded, do it. If it needs a new tRPC procedure, **stop and report** — a new procedure is logic and this job does not have permission for it. Shipping route-only search is an acceptable outcome and is still most of the value.

3. **Respect permissions.** The palette must never show a route the signed-in user cannot reach. `canSee` in `admin.tsx` is the existing filter and its result should be what you receive, so you are not reimplementing the rule.

4. **Keyboard, completely.** Open, type, arrow, Enter to go, Escape to close, focus returns to whatever was focused before. It is a modal, so it traps focus and it is labelled.

5. **Empty and no-match states.** Opened with nothing typed it should suggest, not sit blank.

6. **Match the dialog treatment J01 built** in `src/components/Dialogs.tsx`. Do not invent a second modal language.

## Acceptance

1. The four gates from COMMON, pasted.
2. **It opens both ways.** By shortcut and by the visible control. Paste both.
3. **It closes and returns focus.** Escape, and clicking outside. Paste the active element before opening and after closing, for both.
4. **Focus is trapped while open.** Tab five times and paste the active element each time. All five inside the dialog.
5. **It navigates.** Type a route name, Enter, and show the URL changed. Three different routes.
6. **It respects permissions.** Sign in as `staff@kapekh.org`, open the palette, and paste every entry it offers. Then paste what the admin sees. The staff list must be a subset, and must contain nothing that route would refuse.
7. **No-match state.** Type something matching nothing and paste what renders.
8. **Opened empty.** Paste what it suggests with no query.
9. **Announced correctly.** Paste the dialog's role, its accessible name, and whether `aria-modal` is set.
10. **Content search, or an honest no.** Either show it finding a page by title from already-loaded data, or state plainly that it needs a new query and was therefore not built.
11. **The three-line diff for `admin.tsx`**, written out exactly, in your report. Do not apply it.
12. Screenshots at 1440 and 390, open, with a query, and with no match. Six into `.work/redesign/shots/j15-*.png`.

## Out of scope

- Editing `src/routes/admin.tsx`. Hand the diff over.
- Changing the sidebar accordion in any way.
- A new tRPC procedure, or any new server call.
- Actions beyond navigation. No "create a page" from the palette in this round.
- Recent-items history, which needs storage and is a later idea.

## Stop conditions

Everything in COMMON, plus:

- **Content search needs a new query.** Ship route-only and say so.
- The palette can show a route the user cannot reach.
- You cannot get focus return right. A modal that dumps focus on `BODY` is the exact defect a prior round fixed across the admin, and shipping a new one would be a regression by addition.
- J02 has not landed yet, so there is no mount point to hand a diff to.
- The lead has cut the job.
