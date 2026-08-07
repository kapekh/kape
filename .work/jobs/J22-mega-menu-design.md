# J22 — Mega menu design

**SPENT, 2026-08-07. Do not dispatch this again.** Every delta below describes a header that no
longer exists: the photo-tile bento panel was replaced with a text-column layout somewhere in the
C3/C6 theme-as-data work, before this job ever ran. `bentoSpan`, `grid-flow-row-dense` and the
grid/scroll toggle are all absent from `src/components/Header.tsx`, and the panel is bounded with
`overflow-y-auto` rather than pinned to `100dvh`. Verified in the lead pane against the source and
against `.work/j22-shots/whatwedo.jpg`. Verdict and the one live finding are in `.work/LEAD.md`;
the run is written up in `.work/j22-report.md`.

The desktop mega panel is the first thing a visitor touches and it currently reads as a stock-photo
mood board. Structure is sound; presentation is not. This job is presentation only.

Evidence: `.lavish/audit-shots/pub-megamenu-whoweare.jpg`, `pub-megamenu-whatwedo.jpg`,
`pub-megamenu-media.jpg`, `pub-megamenu-opportunities.jpg`, captured 2026-08-06 at 1440x950 against
`bun run dev`.

## Files you own

- `src/components/Header.tsx`
- `src/components/NavLink.tsx`

Nothing else. `src/server/seed/nav.ts`, `src/server/repo/nav.ts` and the `kape.db` seed are **not**
yours - another pane is exercising admin CRUD against the same database and a reseed would destroy
its run.

## Deltas

| id | what you see now | where | why it hurts |
|---|---|---|---|
| M1 | Every tile is a full-bleed photo with a dark scrim. Legibility swings with the photo: white-on-pale is near-illegible on the light tiles, hard-black on the dark ones. | `Header.tsx:56-58` frosted mask + gradient | The same label reads at different strengths depending on which image the editor picked. Type contrast cannot depend on content. |
| M2 | `bentoSpan` promotes item 0 to a 2x2 hero whenever a section has 5+ leaves, so "About KAPE" gets four times the area of "Fact Sheet" purely by ordering. | `Header.tsx:20-24` | Visual weight is claiming an editorial priority nobody set. Position in a nav tree is not importance. |
| M3 | The dense grid leaves a visible hole - Who We Are ends with an empty bottom-right cell. | `Header.tsx:98-99` `grid-flow-row-dense` + varied spans | A hole reads as a missing item, not as a layout. |
| M4 | The panel is pinned below the header and stretches to `100dvh`; What We Do overflows it, so "Past Projects" sits below a scroll nobody signals. | `Header.tsx:340`, `382-392` panelTop measurement | Content hidden inside a hover surface is content nobody finds. |
| M5 | The grid/scroll toggle is two unlabelled 28px icon buttons in the section header. | `Header.tsx:161-189` | A control this small, this quiet, and this rarely wanted is competing with the nav items for attention. |
| M6 | Tile images have no relationship to their labels - a coffee table for About KAPE, a rainbow for Our Partners, a dreamcatcher for DEP. | data, not code | Out of scope, see below. Note it in your report; do not fix it here. |

## Do

1. **M1** - Make label legibility independent of the image. Replace the image-dependent scrim with a
   deterministic treatment: a solid or near-solid plate behind the text block, or a scrim tuned to a
   fixed floor rather than a gradient over arbitrary pixels. Verify against both the palest tile
   (Our Partners, the rainbow) and the darkest (IEP, the galaxy).
2. **M2** - Drop the positional hero promotion, or gate it on something editorial that actually
   exists on the node. Uniform tiles beat arbitrary emphasis. If you keep any size variation, it
   must come from data, not from `i === 0`.
3. **M3** - With M2 done the dense-flow hole should close on its own. Confirm it, and if a partial
   final row remains, make it deliberate: let the last row stretch, or set the columns so the common
   counts (3, 5, 7, 9, 11 leaves) divide cleanly.
4. **M4** - Make the panel fit or make the overflow legible. Either cap the panel and give it a real
   scroll affordance, or reduce tile height so a section's full contents fit the viewport at 1440x950
   and at 1280x800.
5. **M5** - Justify the toggle or remove it. If it stays, give it a visible text label; if it goes,
   delete both buttons and the `mode` state and keep the grid.

Keep the existing Escape handling, the shared hover region, the body-scroll lock and the
`panelTop` measurement working. They are load-bearing and they were fixed once already.

## Acceptance

Run each, paste the output or the image.

1. `bun run test` - 31 tests over 8 files, all passing. Baseline recorded 2026-08-06 16:45.
2. `bunx tsc --noEmit` - no output.
3. `bun run format` - "No fixes applied".
4. With `bun run dev` up, open each of the four panels at 1440x950 and screenshot to
   `.work/j22-shots/`: `whoweare.jpg`, `whatwedo.jpg`, `media.jpg`, `opportunities.jpg`. Put them
   beside the `.lavish/audit-shots/` originals in your report and state, per delta M1-M5, what
   changed.
   To open a panel, hover the trigger with a real pointer move - a synthetic `click()` will not do
   it: `agent-browser mouse move <x> 81`, coordinates from
   `document.querySelectorAll('header button')`.
5. Show the What We Do panel's full height against the 1440x950 viewport and state whether every
   section fits or how the overflow is now signalled.
6. Confirm keyboard: Tab through the header, Escape closes an open panel, and the panel does not
   swap out from under a tabbing reader. One line per behaviour.

## Out of scope

- The tile imagery itself (M6). Those images come from the nav target's `image` field
  (`src/server/repo/nav.ts:208`) and the fix is the client's real photography, which is J19 and was
  dropped. Report the mismatch; do not reseed, do not pick replacement stock.
- Mobile drawer (`MobileNode`, `Header.tsx:231-320`) unless a change you make breaks it.
- Header chrome: top bar, language switcher, donate button, search/sitemap visibility rules. J06 and
  J21 settled those.
- Public page bodies, section renderer, footer.

## Stop conditions

- You need a file you do not own. Stop and report, do not reach across.
- The fix appears to need a schema, seed or `kape.db` change. Stop - another pane is live against
  that database.
- Tests or `tsc` go red and the cause is not obviously yours. Stop and report rather than fixing
  around it.
- Never run `bun run db:seed`, `db:push` or `db:migrate` in this job.
