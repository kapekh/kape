# J04 - addressing

Closes D4, D5, D6. Unblocks J06 and J07.

Threads identity down to where the text renders, so a DOM node points back at the row it came from. No save path and no editor: this job makes the page addressable and stops.

## Files you own

- `src/components/sections/SectionRenderer.tsx` (2,196 lines)
- `src/components/SubPage.tsx`
- `src/routes/$.tsx`

Nothing else. `src/server/repo/admin.ts` and `src/integrations/trpc/router.ts` belong to J03 and may be live in another pane. If this job needs a file it does not own, stop and report.

## Do

1. Thread `entityId` and `lang` into `SectionRenderer`. It takes `{sections}` today; `entityId` is already in loader data for every kind and is simply never passed down. Closes D4.
2. Stop the flat `{...s.props}` spread from eating identity. `s.id`, `s.type` and the index must survive into each template. Closes D4.
3. Emit the marker tuple from `docs/inline-editing-plan.md:55-62` on each editable text field across the 21 templates: `entity`, `entityId`, `lang`, `target`. Target strings must be exactly the forms J03's procedure parses, `field:<name>`, `section:<sectionId>:props.<field>`, `section:<sectionId>:props.items[<n>].<field>`. Closes D5.
4. Handle `renderTitle`. It splits a title into spans and turns `*text*` into an italic accent span, so the marker goes where the round trip can reproduce the asterisk form, not on the inner accent span. Closes D6.
5. Handle `Heading`. Eyebrow and title are siblings and `h1` versus `h2` is decided from context, so the tag name is not a field marker. Mark the field, never the tag.

## Acceptance

Each item is a demonstration. Run it, paste the output into `.work/inline/J04-report.md`.

1. **All 21 templates, counted.** Render a page carrying every section type and paste the count of marked fields per type, 21 rows. A type with zero marked fields is either justified in one line or is a miss.
2. **Targets parse.** Paste every distinct `target` string the probe page emits, deduplicated. Each must match one of J03's three forms. A target this job emits that J03 cannot parse is a defect in this job.
3. **Identity is right, not just present.** For five marked fields on five different section types, paste the marker's `entityId` and `target` beside the row actually holding that text in SQL. They must agree.
4. **The accent form survives.** Take a title containing `*text*`, paste its rendered DOM and its marker, and show the marked region serializes back to the asterisk form rather than to the split spans.
5. **`h1` count unchanged.** Fifteen public pages, one `h1` each, before and after. Paste both counts.
6. **The signed-off look does not move.** This is markup only. Render every section type before and after and diff the rendered text: zero changed. Use the `j14-sections-{before,after}.json` probe already in `.work/redesign/`, it does exactly this.
7. **Anonymous visitors see nothing new.** Markers are `data-*` only. Paste the public HTML for one page showing no visible change and no new request.
8. **Gates.** `bun run test` at 449 or better, `tsc` silent, `bun run lint` at 6 or fewer, `bun run build` green. Paste all four.

## Out of scope

- Any editor, any save, any mutation. Markers only. J06 and J07 consume them.
- `T.tsx` and the UI-string path. Shipped in job 5, untouched here.
- Redesign work. No styling, no layout, no copy. If a marker forces a wrapper element, say so in the report rather than restyling around it.
- The six `noArrayIndexKey` lint errors. Not yours.

## Stop conditions

- **Never touch `:3020`.** Use a copy of the database on your own port.
- Any behaviour change. This job adds attributes. If a marker cannot be added without moving an element, stop and report which template and why.
- If acceptance 6 shows any rendered text changed, stop. The public site's signed-off look is the one thing this round must not move.
- If the 21 templates turn out to need more than one pane's worth of context, stop at a template boundary, report which types are done, and let the lead split the rest into J04b.
