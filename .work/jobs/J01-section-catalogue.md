# J01 — Section catalogue expansion

Deltas: D02, D03, D06, D07, D13, D14, D15, D16.

## Scope

The renderer and the query resolver already support more than the catalogue lets an admin author.
This job closes that gap by editing **one file**: the section catalogue. Additive only.

## Files you own

- `src/lib/sections.ts`

Nothing else. If a change seems to need `SectionRenderer.tsx`, it belongs to J03 — note it and
move on.

## Do

1. **D02 — authorable eyebrow/tone/center.** `Heading` (`SectionRenderer.tsx:38-46`) renders
   `eyebrow`, `center` and `toneBg(p.tone)` for every section, but only `hero` declares an
   `eyebrow` field (`sections.ts:81`). Add `eyebrow`, `tone` and `center` fields to every section
   def whose renderer passes them. Verify against the renderer which ones actually do.
2. **D03 — org chart.** `orgChart` is registered at `SectionRenderer.tsx:835` and its query source
   `orgchart` resolves at `src/server/repo/sections.ts:39`, but no `SectionDef` exists, so it can
   never be placed on a page. Add the def, wired to that query source.
3. **D06 — stat icons.** `stats` items are `value` + `label` (`sections.ts:157-166`). Add a
   per-item `icon` image field. The client's homepage band has eight icon-led stats.
4. **D07 — hero extras.** The carousel renderer reads slide `kicker`, inline `stats` and a second
   CTA (`SectionRenderer.tsx:158-190`); the def (`sections.ts:80-97`) declares none of them.
   Add `stats`, `cta2Label`, `cta2Href`, and slide `kicker`.
5. **D13 — job table layout.** Add a `table` layout to `postList` carrying location, type and
   deadline columns. Data already exists (`src/server/repo/content.ts:206-229`).
6. **D14 — project list.** `case "projects"` resolves at `repo/sections.ts:45` but no def offers
   it. Add a `projectList` def so "Current Projects" and "Past Projects" have a buildable landing
   page.
7. **D15 — site map section.** A def that renders the nav tree with per-page descriptions.
8. **D16 — certificate grid.** A def for image+PDF credentials, for the new Accreditations page.

## Acceptance

1. `bun run test` still passes, 3 of 3.
2. `bunx biome check src/lib/sections.ts` reports no error that was not there before you started.
   Record the before count in your report.
3. Every new field you added is read by existing renderer code — cite the renderer line for each.
   A field nothing reads is a defect, not a feature.
4. No existing section's authored props are invalidated. Adding required fields to an existing
   def is a breaking change; new fields are optional.
5. Report a table: delta id, fields added, renderer line that consumes them.

## Out of scope

Rendering. Migrations. Admin UI changes. Seed data.

## Stop conditions

- A delta turns out to need renderer work: record it for J03 and continue with the rest.
- The renderer does *not* consume a field the audit claims it does: say so, skip that item.
