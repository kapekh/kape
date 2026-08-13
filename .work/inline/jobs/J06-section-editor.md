# J06 - inline editor for section text fields

Depends on J03 and J04, both verified before this goes out.
Unblocks J07, which reuses the box this job builds.

J05 shipped the pattern for UI strings: a switch in `InlineEditBar`, a box for whatever is selected, a save that writes one row.
This job does the same for the text inside page sections, using J03's `updateField` as the write and J04's markers as the addressing.

## Files you own

- `src/lib/inline-edit.tsx`
- `src/components/InlineEditBar.tsx`
- `src/components/sections/SectionRenderer.tsx`
- one new test beside whichever of those it exercises

Nothing else.
`scripts/prerender-static.ts` is J08's and may be live in another pane.
If this job needs a file it does not own, stop and report.

## Do

1. Widen `EditTarget` past `kind: "uiString"`.
   The comment at `src/lib/inline-edit.tsx:18` already says section and page fields follow.
   The new kind carries J04's tuple: `entity`, `entityId`, `lang`, `target`, plus the text the page is showing and whether that text fell back from the default language.
2. Add the field editor to `InlineEditBar` beside `StringEditor`.
   It saves through J03's `updateField`, passing `expectedUpdatedAt` from the payload the page already has, and it surfaces a refused stale write through `saveErrorMessage` the way the wholesale editor does.
3. Make J04's markers selectable in edit mode.
   Client-only, gated on `useInlineEdit().editing` and on `may("pages")`, so an anonymous visitor and a staff user without the area both get plain text and no listener.
4. Honour the language rule.
   On `/km` where the section text fell back to English, the box opens **empty** and quotes the English beside it, exactly as `StringEditor` does for a key with no row.
   `i18nFallback` on the resolved props is the signal; job 1 put it there.
5. Single-line and multi-line text only.
   A `richtext` field opens the same box as a textarea and saves the source, not rendered HTML.

## Acceptance

Each item is a demonstration.
Run it, paste the output into `.work/inline/J06-report.md`.

1. **A section title saves on `/en`.** Paste the `pages.sections` JSON for that section before and after, and the public page showing the new text after a reload.
2. **The same field saves on `/km` without touching English.** Paste the section JSON before and after: `props.i18n.km` gains the field, the base prop is byte for byte unchanged.
3. **Fallback is not overwritten.** On a `/km` field with no Khmer text, paste the box's initial value (must be empty) and the English it quotes.
4. **A repeater item saves.** One `items[<n>].<field>` write, JSON before and after, and the rendered page.
5. **Stale write refused.** Save the same field from two tabs, paste the second one's message on screen.
6. **Anonymous sees nothing.** Paste the public HTML and the network log for one page as a signed-out visitor: no editor chrome, no `auth.me` call, no new request.
7. **Permission gated.** Sign in as `staff@kapekh.org`, paste what the page offers.
8. **Keyboard.** Open a field, Escape closes it, focus returns to where it was. Paste the active element before and after.
9. **Cache cleared.** Show the public page serving the new text without a manual cache bust.
10. **Gates.** `bun run test` at 449 or better, `tsc` silent, `bun run lint` at 6 or fewer, `bun run build` green. Paste all four.

## Out of scope

- Page and post fields, which are J07 and reuse this box.
- The prerender cache, which is J08.
- Any change to `updateField` itself. If it cannot serve a case, stop and report rather than widening it.
- Redesign work of any kind on the public site.
- The six `noArrayIndexKey` lint errors.

## Stop conditions

- **Never touch `:3020`.** Use a copy of the database on your own port.
- A marker J04 emitted that `updateField` refuses. Report the target string and the section type; that is an integration defect between two verified jobs and the lead needs it, not a workaround.
- Any editor chrome reaching server-rendered HTML. Every affordance is resolved after hydration, because a prerendered page is byte-identical for everyone.
- Rendered text changing for a visitor who is not editing.
