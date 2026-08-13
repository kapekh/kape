# J09 — the page studio

Read `.work/redesign/jobs/COMMON.md` first. Port **3049**. Deltas: P1-P6.

The page builder. 2,881 lines across six files, the largest coherent surface in the admin, and the one whose bones are already closest to right.

## Files you own

```
src/routes/admin.pages.new.tsx            (53)
src/routes/admin.pages.$id.tsx            (98)
src/components/admin/PageForm.tsx         (514)
src/components/admin/SectionsBuilder.tsx  (954)
src/components/admin/PagePreview.tsx      (54)
src/components/admin/PageSwitcher.tsx     (208)
```

The shell decides full-bleed chrome for these routes by regex at `admin.tsx:311`. J02 owns that and is auto-collapsing the rail here. Coordinate through the lead if the two disagree.

## Do

Screenshot to read first: `.work/redesign/shots/rd-03-page-editor.png`.

1. **P1 — keep the two-pane structure.** Inspector left, live preview right, drag handle between. It is the closest thing in this admin to the Sanity reference and it is right. Restyle it; do not restructure it.

2. **P2 — the empty preview.** Today the largest area on screen shows one centred sentence: "Add a section to see a live preview." Roughly 760px doing nothing. Make it show what adding a section will do.

3. **P3 — move Save and Cancel.** They currently sit in the preview pane's header while acting on the left pane. Into the inspector's own sticky footer.

   **The dirty gate and the conflict handling move with them unchanged.** A stale save returns `409 CONFLICT` and the editor says so; that path is behaviour and was earned.

4. **P4 — group the inspector.** Page sections, Metadata, Page settings and Cover image stack in one 410px scroll as four unrelated jobs under three different heading weights. Tabs or an accordion, Sections open by default.

5. **P6 — promote status.** Published or draft is the most consequential control on the screen and it is a native `<select>` buried mid-form. Into the header as an explicit control.

   Same value, same field, new position and new control. **If moving it means changing what the form submits, stop.**

6. **F11 — the native selects.** Parent page and Status are unstyled OS controls and are the loudest visual tell in the whole admin. `SearchableSelect` (J05) for parent page, since it is a long list; J01's `Select` for status.

7. **P5 — `SectionsBuilder`, restyled in place.** 954 lines, the largest file in the tree, and it owns section editing for 21 section types.

   **Restyle only. Do not refactor. Do not extract. Do not reorganise.** Three of the eight baseline lint errors live here (`:175`, `:282`, `:362`); leaving them is fine, adding a fourth is not.

   The section list wants to read as a list of blocks you can reorder and open, with each section's fields revealed on selection rather than all inline at once. Whatever reordering exists today keeps working exactly as it does.

8. **`PageSwitcher`** is the studio's own navigation, in the topbar. It has three inline `<svg>` elements; lucide them.

9. **The four states, plus not-found.** `/admin/pages/43` for a page that does not exist currently renders a bare `Page not found.` at the top-left with no chrome and no way back. That is L9 and this is the route where it is worst.

## Acceptance

1. The four gates from COMMON, pasted.
2. **A page still saves.** Edit the title, save, reload, show it persisted. Then view it publicly and show the change.
3. **Sections still save.** Add a rich text section, save, reload the editor, show it is there, then show it on the public page.
4. **Every one of the 21 section types still opens and edits.** Paste, per type, the list of editable field names before and after your change. Twenty-one lists matching twenty-one lists. This is the check that proves the restyle did not eat a field.
5. **Section reordering still reorders.** Move a section, save, reload, and paste the order at each step. Then confirm the public page renders the new order.
6. **The lost-update guard still fires.** Open the same page in two tabs. Save in tab B, then save in tab A. Tab A must be refused with the conflict message, and tab B's edit must survive. Paste both.
7. **The segment guard still refuses.** Save a segment with a space, and one with `../`. Paste both refusals.
8. **Status still publishes.** Flip a page to draft, confirm it disappears from the public site; flip it back, confirm it returns. Paste both.
9. **The dirty gate still gates.** Load, touch nothing, show Save disabled. Edit, show it armed. Navigate away, show the guard.
10. **Both selects work by keyboard.** Parent page and status. Tab, open, arrow, select, Escape, focus returns. Paste both sequences and both accessible names.
11. **Translations survive.** English title, Khmer title, save, reload, both present. The write path deletes and reinserts every translation row, so this is not optional.
12. **The live preview still previews.** Change a section's title and show the preview updating without a save.
13. **Not found.** `/admin/pages/999999` renders inside the shell with a route back to Pages.
14. **The rail auto-collapses here and restores on exit**, and the user's own preference is not overwritten. Paste the state at each step.
15. Screenshots at 1440 and 390, light and dark, of the studio empty, with sections, and with a section selected. Into `.work/redesign/shots/j09-*.png`.

## Out of scope

- Refactoring `SectionsBuilder`. Restyle in place.
- The section renderer on the public site. J14 owns `SectionRenderer.tsx`.
- Adding, removing or changing a section type. `src/lib/sections.ts` is not yours and is not touched.
- `RichTextEditor`, `LangTabs`, `MediaPicker`, `MediaLibraryDialog`. J05 and J10.
- Drag-and-drop for section reordering, if it is not already there.
- `admin.pages.index.tsx`. J03.
- Alt text on inserted images. Deferred to `docs/inline-editing-plan.md`.

## Stop conditions

Everything in COMMON, plus:

- **A section type loses an editable field.** Count them, all 21.
- **The conflict guard stops firing.** A silent lost update is the worst defect this surface can have and it was fixed once already.
- The segment validation stops refusing.
- Moving status out of the form changes what gets submitted.
- You are tempted to extract something out of `SectionsBuilder` to make it manageable. It is 954 lines and it stays 954 lines in one file.
- The live preview stops updating.
