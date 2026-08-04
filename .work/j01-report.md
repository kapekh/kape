Done. `src/lib/sections.ts` only; no git run.

## Acceptance

1. **PASS** — `bun run test`: 2 files, 3/3 passed.
2. **PASS** — before: `bunx biome check src/lib/sections.ts` → `Checked 1 file. No fixes applied.`, **0 errors**. After: identical, 0 errors. (`bunx tsc --noEmit` also reports 0 errors in `src/`; all remaining errors are inside `feedback/`, which `tsconfig` still includes — pre-existing, not mine.)
3. **PASS** — table below; every field traced to a live renderer line.
4. **PASS** — additive only. No field removed, renamed or reordered out of an existing key; `SectionField` has no required flag, so no authored props are invalidated.
5. **PASS** — table below.

| delta | fields added | renderer line that consumes them |
|---|---|---|
| D02 | `eyebrow` on cards, stats, cta, resources, split, pills, form, postList, videoGrid, albumGrid, publicationList, people, map, directory, partners, orgChart | `SectionRenderer.tsx` 444, 582+620, 652, 694, 758, 802, 837, 943, 1060, 1119, 1157, 1207, 1253, 1270, 1317, 1394+1402 |
| D02 | `tone` on richtext, cards, resources, split, pills, form, postList, videoGrid, albumGrid, publicationList, people, map, directory, partners, orgChart | `toneBg(p.tone)` at 399, 442, 692, 770, 800, 835, 940, 1057, 1117, 1155, 1205, 1251, 1268, 1315, 1392 |
| D02 | `center` on **cards only** | 444 |
| D03 | new `orgChart` def (source `orgchart`) + eyebrow/title/tone | registry key 1429; `p.data` 1383; query `case "orgchart"` `repo/sections.ts:51` |
| D07 | hero `cta2Label`, `cta2Href`, `stats[]{value,label}`, slide `kicker` | 287, 281, 321+322 (guard 267/313), 225-229 |

**Two audit claims are wrong, corrected rather than worked around:**
- `center` is not read "for every section". Only `Cards` passes it to `Heading` (444); `FormSection` hardcodes it (837); every other call site omits it. Added to `cards` alone.
- `tone` is not read by **hero, stats, cta** — those three paint their own backgrounds (604 `gradient-hero`, 647 `gradient-warm`, hero has no `toneBg`). Not added there.

## Handed to J03 (renderer work, skipped per stop condition)

- **D06 stat icons** — `Stats`/`StatItem` (510-640) render `value` + `label` only. No `icon` is read anywhere, so the field would be dead.
- **D13 job table** — `PostList` (933-1044) branches `list` / `featured` / else-grid. A `table` layout would silently render as a grid. Also: `listJobs` is at `content.ts:284-316` (not 206-229) and returns `id, slug, title, location, deadline` — there is **no `type` field**, so that column has no data without a repo change.
- **D14 projectList** — no `projectList` key in `sectionRegistry` (1411-1430) → would render `UnknownSection`. Worse, source `projects` resolves to `listProjectOptions` (`repo/projects.ts:53-69`) returning `{code, name}` — a picker list with no slug/title/image. Needs a renderer *and* a new repo query.
- **D15 site map** and **D16 certificate grid** — no registry key for either; both are new renderer templates.

## Also found, unclaimed by any delta (not added — outside J01's scope)

`split.statValue`/`statLabel` (744, 750), `stats.image` band background (607), and `videoGrid.moreHref` (1061) are read by the renderer but authorable nowhere. Same class of gap as D02; worth a delta.

I did not touch the worklog — concurrent workers would collide on it, and it reads like orchestrator state.

Next: orchestrator reviews `src/lib/sections.ts` and commits; J03 picks up D06, D13, D14, D15, D16 with the renderer gaps above.
