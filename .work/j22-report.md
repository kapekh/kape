# J22 report - Mega menu design (cms-core re-verification)

**No code changed. `Header.tsx` and `NavLink.tsx` are byte-identical to `58a0fe7`.**

J22 was already built and committed on this branch's history, at `fd43cdf` "Make a mega menu the visitor
can see all of at once". That commit deleted the tile grid, `bentoSpan` and the grid/scroll toggle, and
shipped its own `.work/j22-report.md`. This file replaces that one. The build narrative for the original
run is in `fd43cdf`'s commit body and in the version of this file at that commit.

What I did instead was run J22's acceptance against `cms-core` at `58a0fe7`, because the branch has moved
since: the theme became configuration, and a de-branding pass changed the data the menu renders. The old
evidence was captured on a different tree, so it no longer proves anything about this one.

Verdict: every delta M1 to M5 holds on cms-core. M6 changed shape and needs re-stating. Details below.

## Per delta

Before is `.lavish/audit-shots/pub-megamenu-*.jpg` (1440x950, 2026-08-06).
After is `.work/j22-shots/*.jpg` (1440x950, captured today against `bun run dev` on this branch).

| id | before | after on cms-core |
|---|---|---|
| M1 | Full-bleed photo per tile, backdrop-blur mask, black gradient, white text. Contrast swung with whatever photo the editor picked. | No image, no card. Measured on the live DOM: all 21 labels sit at exactly **10.89:1**, all 16 briefs and all 3 headings at **7.44:1**. One distinct value each, not a range. Dark theme: **12.87:1** and **5.88:1**, again one value each. Contrast no longer has anything to do with content. |
| M2 | `bentoSpan` promoted item 0 to a 2x2 hero at 5+ leaves. | Gone with the tile grid. Every destination is one row of the same size, so position cannot claim emphasis. |
| M3 | `grid-flow-row-dense` plus varied spans left an empty bottom-right cell in Who We Are. | No grid of boxes, so no hole. Links flow down then across in CSS columns; a short last column is just a short column. Visible in `whoweare.jpg`. |
| M4 | Panel pinned to `100dvh`; What We Do overflowed by 525px with nothing signalling it. | Fits, at both sizes. Table below. |
| M5 | Two unlabelled 28px icon buttons per section header. | Both buttons and the `mode` state are gone. |
| M6 | Coffee table for About KAPE, rainbow for Our Partners, dreamcatcher for DEP. | Different problem now, see below. |

### M4, measured

Panel box against the header container, from the live DOM.

| panel | height | top | bottom | overflow | 1440x950 | 1280x800 |
|---|---|---|---|---|---|---|
| Who We Are | 199 | 122 | 321 | 0 | fits | fits |
| What We Do | 477 | 122 | 599 | 0 | fits | fits |
| Media & Publications | 281 | 122 | 403 | 0 | fits | fits |
| Opportunities | 181 | 122 | 303 | 0 | fits | fits |

The tallest panel ends at 599px against a 950px viewport, and against an 800px one. Overflow is 0 on all
four at both sizes, so nothing is hidden and there is no overflow to signal. The `overflow-y-auto` under
`max-height: 100dvh - panelTop - 1rem` stays as a safety for editor-driven content and does not trigger.

Load-bearing behaviour, all confirmed working:

- `panelTop` measures true. Header bottom 122, panel top 122. Panel box left 80 / width 1280 matches the
  header's own `mx-auto max-w-7xl` container exactly.
- Shared hover region holds. Moving the pointer off the trigger and down into the panel body at (735, 300)
  leaves it open.
- Leaving the region entirely closes it after the grace period.
- Body-scroll lock: `body.style.overflow` is `hidden` while a panel is open and back to `""` after Escape.

## Acceptance

1. `bun run test` - **239 passed, 21 files**, on the clean tree at 20:58.
   Re-run at 21:12 is 238 passed / 1 failed. The failure is
   `src/lib/site-theme.test.ts > colourToHex > ignores a percentage alpha`, expected `#002c5e`, got `null`.
   That is c8's file, edited under me mid-run, and it is a stop condition rather than something to fix
   around. Nothing in J22 touches it.
2. `bunx tsc --noEmit` - no output, exit 0. Still exit 0 after c8's edits landed.
3. `bun run format` - "Checked 246 files. No fixes applied.", exit 0. Also clean run directly against
   `Header.tsx` and `NavLink.tsx`.
4. Shots in `.work/j22-shots/`, all 1440x950 unless noted:

   | after | before |
   |---|---|
   | `whoweare.jpg` | `.lavish/audit-shots/pub-megamenu-whoweare.jpg` |
   | `whatwedo.jpg` | `.lavish/audit-shots/pub-megamenu-whatwedo.jpg` |
   | `media.jpg` | `.lavish/audit-shots/pub-megamenu-media.jpg` |
   | `opportunities.jpg` | `.lavish/audit-shots/pub-megamenu-opportunities.jpg` |
   | `whatwedo-1280x800.jpg` | smaller viewport |
   | `whatwedo-dark.jpg` | dark theme |

   Panels were opened by a real pointer move to the trigger, not by `click()`. `aria-expanded` was read
   immediately before each capture and the right one is `true` in every case.

5. What We Do against 1440x950: 477px tall, top 122, bottom 599, overflow 0. Every section fits with
   351px of viewport to spare. Nothing is hidden, so no overflow affordance is needed.

6. Keyboard, one line each:
   - **Tab through the header** walks Staff login, language, theme, logo, Home, the four triggers, Contact,
     Donate, and opens nothing on the way: `aria-expanded` stays `false,false,false,false` throughout.
   - **Escape closes an open panel** and releases the lock: all four back to `false`, `body.style.overflow`
     back to `""`.
   - **The panel does not swap under a tabbing reader**: with What We Do open, four Tabs across the other
     three triggers out to Donate leave `aria-expanded` unchanged at `false,true,false,false`. Tabbing once
     more from Donate lands on the open panel's first link, so the panel is reachable rather than a trap.

## M6, restated for cms-core

Reporting only. Nothing reseeded, `kape.db` never opened by the running app.

**The mismatched imagery is gone, but not because anyone fixed the mapping.** All 45 nav thumbnails in the
mobile drawer now resolve to `/placeholder.svg`, and 0 of 39 pages carry a `hero_media_id`. The de-branding
pass dropped the hero associations, so the coffee table and the dreamcatcher are not on this branch at all.

That turns M6 from "wrong image" into "no image", which is the better failure of the two but is still a
gap the client's real photography has to close. The desktop mega panel renders no imagery either way, so
this is only visible in the drawer and on page headers.

Worth carrying forward from the original run, both still true on cms-core and both outside these two files:

- **Project labels are bare acronyms.** CLASS, MLDP, EQUAL-i3L, LSLAG, SEEK, KYLA and ESCUP show a label
  alone, because their `description` only restates the label and the one-line brief rule drops it. Those
  rows tell a first-time visitor nothing. The fix is the nav label in `nav.ts` and the seed.
- **Group headings do not link.** `nav.ts` nulls the href on any node with children, so "Current Projects"
  is text. The mobile drawer renders an Overview row; desktop cannot.

## Harness notes for whoever re-runs this

Four things cost time and will cost it again.

- **`PORT` must match the vite port.** The SSR tRPC client hardcodes
  `http://localhost:${process.env.PORT ?? 3000}` in `src/integrations/tanstack-query/root-provider.tsx:12`.
  Running `vite dev --port 3100` without also setting `PORT=3100` gives every route a 500 and
  "Unable to connect. Is the computer able to access the url?", which looks exactly like a bad
  `DATABASE_PATH` and is not.
- **A parked pointer fires nothing.** `agent-browser mouse move` to the coordinate the pointer already
  occupies produces no `mouseover`, so the panel never opens and hover looks broken. Move somewhere else
  first. Hover works fine once you do, and the earlier run's "hover only opens intermittently" was this,
  not a real defect.
- **The announcement dialog eats the pointer.** On a fresh load `elementFromPoint(x, 81)` returns the
  `<dialog>`, not the trigger. Dismiss it before hovering anything.
- **`agent-browser screenshot` needs an absolute path.** A relative one reports success and writes
  somewhere else, which is how the previous run's shots survived a re-capture and got read back as if
  they were new.

Ran against a `VACUUM INTO` copy at
`~/.tmp/claude-1000/.../scratchpad/j22.db`, never against `kape.db`. No seed script run. Not committed.
