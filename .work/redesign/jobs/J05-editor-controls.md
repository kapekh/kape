# J05 — shared editor controls

Read `.work/redesign/jobs/COMMON.md` first. Port **3045**. Deltas: E5, E6, F10, F11.

Five controls that every editor renders. You land before J06, J07, J08, J09 and J12 so those jobs restyle forms around finished controls instead of doing the work twice.

## Files you own

```
src/components/admin/RichTextEditor.tsx    (265)
src/components/admin/LangTabs.tsx          (108)
src/components/admin/SearchableSelect.tsx  (150)
src/components/admin/MapField.tsx          (119)
src/components/admin/MapPicker.tsx         (116)
```

`LangTabs.test.tsx` and `field-naming.test.tsx` exist beside these and both must keep passing.

## Do

1. **`RichTextEditor` toolbar** (F10). The buttons are typographic characters: `B`, `I`, `H2`, `❝`, `🖼 Image`, `▦ Table`, `⁝⁝ Terms`, `▤ Form`. Real lucide icons.

   **Their accessible names must survive byte for byte.** A button with text content takes its name from that text, so replacing the glyph with an icon removes the name unless you add it back. Icon gets `aria-hidden="true"`; the control keeps an explicit label.

   Group the toolbar: text style, then blocks, then inserts. Show active state for the mark under the cursor.

2. **`LangTabs`** (E5). Today English and Khmer with EN/KM chips; the inactive tab has almost no affordance and there is no signal that a translation is missing.

   Give the tab a per-language state. **Check first whether the component already receives enough to know "this language has no value".** If it does, show it. If it does not, that is a data change — stop and report, do not add a prop that changes a caller's contract.

3. **`SearchableSelect`** (F11). It already exists and does the job in two routes. Bring it onto J01's primitives and make it the thing the editor jobs reach for instead of a native `<select>`.

   Its keyboard behaviour is the whole value of the component. Prove it survives.

4. **`MapField` and `MapPicker`.** Leaflet-backed. Bring the surrounding chrome onto the scale; leave the map canvas alone.

5. **The four states on each.** A rich text editor loading, a map that has not resolved, a searchable select with no matches, a language tab whose data has not arrived.

## Acceptance

1. The four gates from COMMON, pasted.
2. **Rich text still edits, under real key presses.** Do not drive ProseMirror through DOM calls; it does not work. Apply H2, `Ctrl+B` on a selection, `Ctrl+Z` once, `Ctrl+Shift+Z` once, insert a table. Paste what happened at each step.
3. **The saved body survives a reload and renders publicly.** Edit a page body, save, reload the editor, then load the public page. Paste all three.
4. **Every toolbar button has an accessible name.** Print the accessible name and role of all eight before and after your change. Zero unnamed, zero changed.
5. **`SearchableSelect` by keyboard.** Tab to it, type to filter, ArrowDown and ArrowUp, Enter to select, Escape to close, and show focus returns to the trigger. Paste the sequence and the accessible name.
6. **`LangTabs` still switches.** Type an English title, switch to Khmer, type a Khmer title, switch back, and show the English is still there. Paste all four states.
7. **`LangTabs` keyboard.** Arrow between tabs; state which ARIA tab pattern it implements and whether that is unchanged.
8. **The map still picks.** Click the map, show the coordinates that land in the field. Paste before and after.
9. **`LangTabs.test.tsx` and `field-naming.test.tsx` pass.** Paste both.
10. Screenshots at 1440 and 390 of each of the five controls in context. Into `.work/redesign/shots/j05-*.png`.

## Out of scope

- Any form that renders these. J06, J07, J08, J09 and J12 own those.
- Alt text on inserted images. It is a data change and is in `docs/inline-editing-plan.md`.
- The media picker and library dialog. J10 owns both, and `RichTextEditor` only calls them.
- Adding a prop that changes what a caller must pass.
- Replacing tiptap or leaflet.

## Stop conditions

Everything in COMMON, plus:

- **A toolbar button loses its accessible name.** This is the exact defect a prior round fixed here.
- ProseMirror behaviour changes in any way. Undo granularity, paste handling, mark toggling — all behaviour.
- `LangTabs` cannot show a missing-translation state without a new prop. Report it; do not add the prop.
- `SearchableSelect`'s keyboard path regresses.
