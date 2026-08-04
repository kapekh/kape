# J03 — Renderer visual fidelity

Deltas: D01, D04, D06, D13, D14, D15, D16, D17, D27.

**J01 has landed** (`58ae318`). It added `eyebrow`, `tone`, `center` and the hero extras where a
renderer line already consumed them, and registered `orgChart`. It deliberately did **not** add
fields for D06, D13, D14, D15 and D16, because each needs renderer work first and the field would
otherwise be dead. Those came here, so this job is now larger than first written. Read
`.work/jobs/J01-section-catalogue.md` and its findings below before planning.

You may add catalogue entries in `src/lib/sections.ts` for the deltas handed to you — J01 is
finished, so that file is yours now. Nothing else about its ownership changes.

## Findings from J01 you must not rediscover

- `PostList` (~933-1044) branches `list` / `featured` / else-grid. A `table` layout added without
  a branch renders silently as a grid.
- `listJobs` is at `content.ts:284-316`, not the line range the audit gave, and returns
  `id, slug, title, location, deadline` — **no `type` field**. D13's type column has no data
  without a repo change. Decide and report: drop the column, or extend the query.
- Source `projects` resolves to `listProjectOptions` (`repo/projects.ts:53-69`) returning
  `{code, name}` — a picker list with no slug, title or image. D14 needs a **new repo query** as
  well as a renderer and a catalogue entry.
- `orgChart`'s query source is `orgchart` (lowercase) at `repo/sections.ts:51`.
- **D27, new:** `split.statValue`/`statLabel` (~744, 750), the `stats` band background image
  (~607) and `videoGrid.moreHref` (~1061) are read by the renderer but authorable nowhere. Same
  class as D02. Add the fields; no renderer work needed.

## Files you own

- `src/components/sections/SectionRenderer.tsx`
- `src/lib/sections.ts` (inherited from J01, now finished)
- `src/components/PublicationGrid.tsx` (currently dead code — no importers; revive or delete it)
- a projects repo query, if D14 needs one — name the file in your report before you add it

## Do

1. **D01 — people photos.** `People` builds initials and never reads `person.photoUrl`
   (`SectionRenderer.tsx:686-706`), although `listPeople` already returns it
   (`src/server/repo/people.ts:21`). Render the photo, fall back to initials only when it is null.
   Their grid is 5 columns; ours is `lg:grid-cols-6`. Match theirs.
2. **D04 — publication covers and counts.** Publication lists render a generic doc icon
   (`SectionRenderer.tsx:660-683`) while `src/server/repo/content.ts:165-172` already supplies
   cover art and download counts. Render both. Decide `PublicationGrid.tsx`'s fate explicitly:
   either it becomes the implementation, or it goes. Do not leave dead code behind.
3. **D06 — stat icons.** Render the per-item icon J01 added to `stats`.
4. **D17 — partner marquee.** A `marquee` keyframe already exists unused at `src/styles.css:254`.
   Add a logo-marquee layout to the partners section. You do **not** own `styles.css` — if the
   existing keyframe is insufficient, report it rather than editing that file.
5. Render any new def J01 added that has no renderer yet — `projectList`, site map, certificate
   grid, `postList` table layout. Read `.work/jobs/J01-section-catalogue.md` for their shapes.

## Acceptance

1. `bun run test` passes, 3 of 3.
2. Every section you touched renders with real seeded data, screenshotted. An unrendered branch is
   not done.
3. A person with no photo still renders (initials fallback). Show it.
4. A publication with no cover still renders. Show it.
5. No section def from J01 is left without a renderer, or you list exactly which and why.
6. `bunx biome check src/components/sections/SectionRenderer.tsx`: no new errors. Note that this
   file already carries `any` usages; do not add more, and do not embark on fixing the existing
   ones — that is J00's lint pass.

## Out of scope

`src/styles.css` (J06 owns it, and it is done — do not reopen it). Article and album pages
(J04 owns `$.tsx`).

## Stop conditions

- A delta needs a repo query beyond the one D14 calls for: report it, do not widen silently.
- Anything pulls you into `$.tsx` or `styles.css`: stop and report.
