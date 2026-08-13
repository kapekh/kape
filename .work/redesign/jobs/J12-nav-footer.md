# J12 — header and footer builders

Read `.work/redesign/jobs/COMMON.md` first. Port **3052**. Deltas: G3, G4, F10.

The two screens that build the site's own navigation. Both are tree editors wearing a form's clothes.

## Files you own

```
src/routes/admin.nav.tsx     (652 — second largest route)
src/routes/admin.footer.tsx  (455)
```

`admin.footer.tsx` is the only non-shell route using `AdminHeader`, the topbar portal, and the only route importing `MediaPicker` directly. J01 owns the first, J10 the second. Consume both.

`admin.nav.tsx` imports `type LangOpt` from `PostForm.tsx`, which J06 owns. Type-only, so no edit contention. **Do not change how you use it.**

## Do

Screenshot to read first: `.work/redesign/shots/rd-06-nav.png`.

1. **G3 — the menu builder teaches itself in a paragraph.** It currently says: "Build the mega-menu. An item links to a page, `post` or `url`; give it child items to make a dropdown; reorder with ↑↓; add nested items with '+ child'."

   If a UI needs a paragraph to explain its own controls, the controls are the problem. Make the affordances self-evident, then cut what the paragraph no longer needs to say. Keep whatever still is not obvious; do not delete the help and call the screen improved.

2. **F10 — real icons.** The row controls are typographic characters: `↑`, `↓`, `＋`, `✎`, `✕`, 25 rows times 5 on nav, 19 buttons on footer. lucide.

   **They carry `title` attributes today, and a button with text content does not take its name from `title`, so those titles are dead weight.** Replacing the glyph with an icon removes the only accessible name these controls have. Every one gets an explicit `aria-label` or an `sr-only` label. Prove it.

3. **Two known naming defects, both yours to fix, both markup.** The four group disclosure buttons on `/admin/nav` are all named just `Expand`, with no item name and no `aria-expanded`. The three logo pickers on `/admin/footer` are all named `+ Logo`, distinguished only by position.

4. **G4 — two save scopes on one screen.** `/admin/nav` has a save for header settings and a separate model for the menu tree, with nothing visually separating them. Make the two scopes obviously different things.

   **Do not merge them.** Two saves is what the screen does.

5. **The tree.** Both screens edit a nested structure through move-up, move-down and add-child. Design it as a tree: indent guides, clear parent-child, a row that reads as a row.

   **No drag-and-drop.** It is new interaction logic and is explicitly deferred to a later round. The existing reordering keeps working exactly as it does.

6. **`admin.footer.tsx` reports itself dirty on load**, so its save button is armed before any edit. That is a `useDirty` baseline bug, it is logic, and it is **not yours to fix**. Note it in your report. Do not work around it by changing how the form reports dirtiness.

7. **Two of the eight baseline lint errors are yours**, at `admin.footer.tsx:80` and `:373`. Leaving them is fine. Adding a ninth is not.

## Acceptance

1. The four gates from COMMON, pasted.
2. **The menu still saves and still reaches the site.** Rename a top-level item, save, reload the editor, then load a public page and show the new label in the header. Paste all three.
3. **Structure is unchanged.** Paste the full menu tree, every item with its parent and order, before and after your change. Identical.
4. **Reordering still reorders.** Move an item up, save, reload, paste the order. Then move it back. Then do the same for a child item.
5. **Add child still adds.** Add a child, save, show it in the public dropdown, delete it, show it gone.
6. **Every row control has an accessible name.** Print the accessible name and role of every control on `/admin/nav` and `/admin/footer`, before and after. Zero unnamed. Today the nav rows are named by glyph, so before and after will differ — show that every one gained a real name and none lost one.
7. **The four disclosure buttons are distinguishable** and carry `aria-expanded`. Paste all four names and both states.
8. **The three footer logo pickers are distinguishable.** Paste all three names.
9. **Header settings still save separately from the menu.** Change the donate label, save from the header-settings control, reload, show it persisted, and show the menu was not touched.
10. **The footer still saves and still renders.** Change a footer column heading, save, reload, and show it on a public page.
11. **A failed footer save keeps the typed edit and re-arms the button.** Break the save, paste what the field holds and whether the button is clickable.
12. **Keyboard through the tree.** Tab through ten rows on `/admin/nav` and paste the order. Every control reachable, nothing trapped.
13. Screenshots at 1440 and 390 of both screens. Eight into `.work/redesign/shots/j12-*.png`.

## Out of scope

- The `useDirty` baseline bug on footer. Logic, and not this round.
- Drag-and-drop reordering.
- `MediaPicker` and `MediaLibraryDialog`. J10.
- `AdminHeader.tsx`. J01.
- The public header and footer components. `src/components/Header.tsx` and `Footer.tsx` are not yours and the public look is signed off.
- Changing the menu's data shape, or what an item can link to.

## Stop conditions

Everything in COMMON, plus:

- **The menu tree changes shape.** Paste it before and after; they must match.
- A control ends up with no accessible name.
- The two save scopes cannot stay separate.
- You are tempted to fix the footer dirty-baseline bug.
- Reordering behaviour changes in any way.
