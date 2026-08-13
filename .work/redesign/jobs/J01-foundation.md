# J01 — design system foundation

**Read first, in this order:** `.work/redesign/DESIGN.md`, then `docs/ui-audit.md` Part 1.
`DESIGN.md` is the spec. This file is the contract.

You are the serial gate for the whole round. Twelve jobs are blocked on you and every one of them will build against the API you freeze. Get it right rather than fast.

## Files you own

Exclusive. No other job opens these. You open nothing else.

```
src/styles.css
src/components/ui/button.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/select.tsx
src/components/ui/slider.tsx
src/components/ui/switch.tsx
src/components/ui/textarea.tsx
src/components/ui/card.tsx          (new)
src/components/ui/badge.tsx         (new)
src/components/ui/table.tsx         (new)
src/components/ui/page-header.tsx   (new)
src/components/ui/skeleton.tsx      (new)
src/components/Dialogs.tsx
src/components/admin/form-ui.tsx
src/components/admin/list-ui.tsx
src/components/admin/ActionMenu.tsx
src/components/admin/AdminHeader.tsx
src/components/admin/AdminIcon.tsx
src/components/admin/MediaThumb.tsx  (delete)
```

You may add test files beside anything you own.

**One exception, and it is the only one:** you add a single class to the shell root in `src/routes/admin.tsx` so the admin token block has something to scope to. One line. J02 owns that file, so make that edit first, keep it to the one line, and say so in your report.

## Do

1. **Admin token block in `src/styles.css`.** Closes F01. Scoped under `.admin`, derived from the existing `--brand-*` inputs. The names are listed in `DESIGN.md` layer 1. Do not edit a public token. The admin does not inherit `body::before` (`:279-287`) or Fraunces on headings (`:253-256`).

   `styles.test.ts` already enforces the file's rules and reads values rather than names. Every new token obeys them: declared once, `light-dark()` only where it differs by mode, registered in `@theme inline`, oklch only.

2. **Prove the public site did not move.** Add a test asserting the public tokens resolve to the same values they do today. This is the guard that lets twelve downstream jobs work without anyone re-checking the client's signed-off look.

3. **Retune the seven existing `src/components/ui/*` files.** They have zero importers repo-wide, so nothing can break. Keep radix. Do not rewrite them from scratch.
   - `Button`: variants `primary` `secondary` `ghost` `danger`, sizes `sm` `md` `icon`. Closes F04. Disabled keeps its shape and carries its reason (F05).
   - `Select`: the riskiest of the set. See stop conditions.
   - `Input` `Textarea` `Label` `Switch` `Slider`: retune only.

4. **Build the five new primitives.** `Card` (F03), `Badge` (F07), `Table` (F06), `PageHeader` (F08, and it introduces breadcrumbs), `Skeleton` (F12). APIs are in `DESIGN.md` layer 3.

   `Table` renders a stacked card list below `md` rather than a horizontal scroll (L7). Get this right here and ten list routes inherit it.

5. **Rework `form-ui.tsx` onto the primitives.** It has 15 component consumers and 8 route consumers, so **its exported names and their signatures do not change**. `fieldInput`, `fieldLabel`, `cancelButtonClass`, `EditorHeader`, `EditorGrid`, `FormSection`, `Field`, `TextField`, `FormActions` all keep working exactly as they do now.

   `TextField` and `FormActions` have zero call sites. Delete them, and note it. `FormActions`'s submit is one of the two different primary button sizes inside this one file (`:45` vs `:225`); after the rework there is one.

6. **Rework `list-ui.tsx` onto the primitives.** 10 consumers, same rule: exported names and signatures unchanged. `EmptyState` moves to `src/components/ui/` and gains an icon slot; `list-ui` re-exports it so its ten consumers do not notice.

   Fold in the skeleton loading state (F12) so `ListStatus` stops rendering a bare `Loading…` row.

7. **Rework `ActionMenu.tsx`.** 17 consumers. Same rule. Its keyboard behaviour and its `label` prop are load-bearing and were earned by a prior round.

8. **Restyle `Dialogs.tsx`.** 55 importers, the most-adopted primitive in the repo. Toast, confirm and prompt. **Focus return, focus trap, toast ordering and the 4.5s toast life are all behaviour and all survive untouched.**

9. **`AdminIcon.tsx` onto lucide-react** (F10), already a dependency. Keep it as the nav's named-icon indirection so `admin.tsx` does not change. All 31 names keep resolving; `hero` and `stats` are unused and may go. The fallback at `:65` stays.

10. **`AdminHeader.tsx`.** Used by 2 of 57 routes. Keep the portal working. `PageHeader` is what the other 55 will adopt; make sure the two can coexist, because J02 and J12 will each be holding one.

11. **Delete `src/components/admin/MediaThumb.tsx`.** Zero importers repo-wide.

12. **Write `.work/redesign/PRIMITIVES.md`** when the API is frozen. One page: every export, its props, and a three-line usage example. Twelve jobs read this instead of reading your source. This is a deliverable, not a nicety.

## Acceptance

Numbered, each a demonstration. Run it, paste the output.

1. `bun run test` — 399 passed / 43 files or better. Paste the summary line.
2. `bunx tsc --noEmit` — silent. Paste the empty result and the exit code.
3. `bun run lint` — 8 errors or fewer. Paste the count. Name any you removed.
4. `bun run build` — green. Paste the last 5 lines.
5. **Public tokens unmoved.** Run your new test from step 2 of Do. Then, in a browser on the public site, dump the computed value of `--background`, `--foreground`, `--primary`, `--accent`, `--border` on `/en` and paste them. Show they match a run from before your change.
6. **Every primitive rendered.** Build one scratch route or one test that renders every variant and size of `Button`, `Badge`, `Card`, `Table`, `PageHeader`, `Skeleton`, `Select`. Screenshot it at 1440 and at 390, light and dark. Four images into `.work/redesign/shots/j01-*.png`.
7. **`Table` below `md`.** At 390px, show the stacked card list, not a horizontal scroll. Paste the `clientWidth`/`scrollWidth` pair proving nothing is clipped.
8. **`Select` by keyboard.** Tab to it, open with Enter and with Space, move with ArrowUp/ArrowDown, select with Enter, close with Escape, and show focus returns to the trigger. Paste the sequence and what happened at each step. State the accessible name and role.
9. **`form-ui` API unchanged.** List all 9 current exports with their signatures before and after, side by side. Any difference is a failure unless it is the two dead exports you deleted.
10. **`list-ui` and `ActionMenu` API unchanged.** Same, for all 7 `list-ui` exports and both `ActionMenu` exports.
11. **`Dialogs` behaviour intact.** Open a confirm from a button, Tab three times and show focus stays inside, press Escape, and show focus returns to the opening button. Paste the active element at each step.
12. **`AdminIcon` resolves.** Print all 31 names and what each renders now. Zero blanks.
13. `.work/redesign/PRIMITIVES.md` exists and covers every export.

## Out of scope

- Any file not in your list. You are not restyling a single route. That is what J02 to J15 are for.
- Refactoring `form-ui`, `list-ui` or `ActionMenu` into a different shape. Their consumers are frozen against their current API.
- Fixing bugs you notice. Report them to the lead.
- Adding a dependency.
- The command palette. That is J15.
- Anything in `src/components/sections/` or on the public site beyond proving you did not move it.

## Stop conditions

Halt and report rather than pushing through:

- **A `form-ui`, `list-ui`, `ActionMenu` or `Dialogs` export cannot keep its signature.** Do not change it and hope. Twelve jobs are compiling against it.
- **The radix `Select` cannot match the native one's keyboard or screen-reader behaviour.** A native select is correct for free. If the radix one is not, say so and leave the native selects alone; F11 is worth doing but not at the cost of keyboard access. This is a real possible outcome, not a formality.
- **`styles.test.ts` fails and the fix would mean relaxing what it asserts.** That test exists because the stats and CTA bands once painted light-mode navy on a dark page.
- **A public token has to move to make an admin token work.** The client signed off on that look.
- **You need to change behaviour.** Report it.

Destructive steps, named: you delete `src/components/admin/MediaThumb.tsx` and two dead exports from `form-ui.tsx`. Confirm zero importers with `grep -rn` immediately before each, and paste the empty result. Note `src/routes/admin.ui-strings.tsx` contains non-UTF8 bytes so plain `grep` skips it silently — use `grep -a` for any repo-wide search.

## Your instance

```
sqlite3 kape.db "VACUUM INTO '.work/redesign/j01.db'"
DATABASE_PATH=.work/redesign/j01.db bun -e '
import { hashPassword } from "#/server/auth";
import { Database } from "bun:sqlite";
const h = await hashPassword("redesign-dev-pw");
new Database(".work/redesign/j01.db").run(
  "update users set password_hash = ? where email = ?", [h, "admin@kapekh.org"]);'
DATABASE_PATH=.work/redesign/j01.db AUTH_SECRET=redesign-audit-secret-key-0001 \
  bun --bun vite dev --port 3041
```

Sign in as `admin@kapekh.org` / `redesign-dev-pw`. Port 3041 is yours.

**Never open `kape.db`. Never touch port `:3020`, which is the client's own instance.**
Checksum `kape.db` at the start and at the end and paste both.

## Reporting

Write `.work/redesign/J01-report.md`: what you did, the acceptance output, what you could not do and why, and anything you found and deliberately left alone.

Then one commit. Message names the surface, explains why, no agent as co-author, no `CHANGELOG.md`.

Your "done" is a claim. The lead re-runs your checks in its own pane before believing it.
