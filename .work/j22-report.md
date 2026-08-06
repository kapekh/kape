# J22 report - Mega menu design

Presentation only, in `src/components/Header.tsx`.
`src/components/NavLink.tsx` needed no change.
92 insertions, 196 deletions, one file.

## Direction changes mid-job

Five instructions arrived while the work was running, and they moved the target four times:

1. keep the mega menu full screen, no scroll
2. keep it simple, no background image
3. take back full screen: top-aligned, attached to the navbar, same width as the nav container
4. items are messy, too much text, less is more, no bento grid
5. a short description for each item

What shipped follows (2) through (5). The panel is a dropdown hanging off the header's bottom edge,
`left-1/2 -translate-x-1/2 w-full max-w-7xl`, so its box matches the header's own `mx-auto max-w-7xl`
container exactly. Rounded bottom corners, no top border, so it reads as attached rather than floating.
Height is whatever the contents need.

The contents are link columns. No cards, no borders, no images. A destination is a label with one line of
brief under it, and the only structure is the section heading above each column.

The briefs came out and went back in, and both moves were right. Out, because they were rendered as
two- and three-line blocks inside bordered cards, which is what made the panel read as noise. Back in as a
single clamped line, because without them the project entries were eighteen bare acronyms - NGS, NGPRC,
HCC, CLASS - and "New Generation Schools" appeared nowhere in the menu at all. The brief is the only place
that expansion exists.

One rule keeps the noise out: a brief that opens with its own label is not rendered. "CLASS - a KAPE
current project." under the label CLASS says nothing the label did not, so CLASS, MLDP, EQUAL-i3L, LSLAG,
SEEK, KYLA and ESCUP show a label alone. The seven that carry a real name keep their line.

## Per delta

| id | before | after |
|---|---|---|
| M1 | Full-bleed photo, backdrop-blur mask, black gradient, white text. Contrast swung with whatever photo the editor picked. | No image and no card. A label is `text-foreground/85` on the panel surface, hover `--accent`; brief and heading are `text-muted-foreground`. Contrast is a fixed set of theme tokens, identical everywhere, in light and dark. Verified in both: `whatwedo.jpg`, `whatwedo-dark.jpg`. |
| M2 | `bentoSpan` promoted item 0 to a 2x2 hero at 5+ leaves and every 5th item to a wide accent. | `bentoSpan` deleted with the whole tile grid. Every destination is one row of the same size. Nothing can claim emphasis from its position. |
| M3 | `grid-flow-row-dense` plus varied spans left an empty bottom-right cell in Who We Are. | No grid of boxes to leave a hole. Links flow down then across in CSS columns, so a short last column is just a short column. |
| M4 | Panel pinned to `100dvh`; What We Do overflowed by 525px with nothing signalling it. | Not pinned to the viewport at all. As tall as its contents: 199, 477, 281, 199px. What We Do went from a 1352px scroll to 477px with nothing hidden. Overflow 0 on all four at 1440x950 and 1280x800, English and Khmer. |
| M5 | Two unlabelled 28px icon buttons per section header, grid vs scrolling row. | Both buttons, the `mode` state and the horizontal-scroll branch deleted. |
| M6 | Out of scope. | See below. |

Four rules, no exceptions: a brief is one clamped line, never two; a brief that opens with its own label
is dropped; a titled section is a single column, because a brief needs the width to land on one line; a
menu with no sections flows into `min(3, ceil(n/3))` columns bounded to 22rem each, so links stay near
each other instead of drifting to the panel edges. Leaf L2s in a grouped menu get a column of their own,
headed by the menu they belong to, so every column starts on the same line.

The panel keeps `overflow-y-auto` under a `max-height` of `100dvh - panelTop - 1rem` as a safety for
editor-driven content. It does not trigger on any current panel in either language.

## Hover intent

Added after a pass over how comparable organisations build this menu. The panel used to open the instant
the cursor touched a trigger and close the instant it left, so a cursor crossing the nav on its way to
Donate flashed three panels open in sequence.

- First open waits 200ms. Nothing happens on a pass-through.
- Switching between triggers while a panel is already up is instant, so a reader who is deliberately
  browsing the menu never waits.
- Leaving gets a 300ms grace period, so crossing a gap does not close the panel.
- Escape and the trigger's own click both kill a pending open, or the panel reappears a fraction of a
  second after the reader dismissed it.

Measured from the live DOM: from closed, `aria-expanded` is still false at 60ms and true by 350ms. With a
panel already open, hovering the next trigger flips it at 60ms. Escape fired during a pending open leaves
all four false at 400ms.

NN/g's own numbers are 500ms in and 500ms out. 200/300 tested better here because KAPE's nav sits in a
narrow band with the Donate button immediately to its right, so the pass-through case is common and the
deliberate case wants to feel immediate.

Escape handling, the shared hover region, the body-scroll lock and the `panelTop` measurement are
untouched and confirmed working.

## Acceptance

1. `bun run test` - all passing. J22's own baseline was 31 tests over 8 files; the tree now runs 37 over 9
   because the parallel pane added `seed/roles.test.ts`. Nothing in this job touches either count.
2. `bunx tsc --noEmit` - no output, exit 0.
3. `bun run format` - "Checked 229 files. No fixes applied."
4. Shots in `.work/j22-shots/`, 1440x950, against the running dev server:

   | new | original |
   |---|---|
   | `whoweare.jpg` | `.lavish/audit-shots/pub-megamenu-whoweare.jpg` |
   | `whatwedo.jpg` | `.lavish/audit-shots/pub-megamenu-whatwedo.jpg` |
   | `media.jpg` | `.lavish/audit-shots/pub-megamenu-media.jpg` |
   | `opportunities.jpg` | `.lavish/audit-shots/pub-megamenu-opportunities.jpg` |

   Extra: `whatwedo-1280x800.jpg` for the smaller viewport, `whatwedo-dark.jpg` for the dark theme.

   Panels were opened by clicking the trigger, not by hovering.
   `agent-browser mouse move` opened a panel only intermittently through this CLI; the trigger's own
   `onClick` sets the same `openId`, so the captured state is the same state a hover produces.

5. Panel box against the header container, measured from the live DOM at 1440x950:

   | panel | left | width | top | height | overflow | shape |
   |---|---|---|---|---|---|---|
   | Who We Are | 80 | 1280 | 122 | 199 | 0 | 7 links, 3 columns |
   | What We Do | 80 | 1280 | 122 | 477 | 0 | 3 columns: 3 leaves, then 9 and 9 |
   | Media & Publications | 80 | 1280 | 122 | 281 | 0 | 4 columns of 4 / 2 / 3 / 3 |
   | Opportunities | 80 | 1280 | 122 | 199 | 0 | 5 links, 2 columns |

   The header's own `mx-auto max-w-7xl` container is left 80, width 1280, bottom 121. The panel matches it
   on both edges and starts on its bottom edge.
   At 1280x800 the container is left 0, width 1280, and the panel tracks it: same widths, same heights,
   overflow 0. Khmer at 1280x800 is identical: 199 / 477 / 281 / 199, overflow 0 on all four.
   Nothing is hidden at either size, so there is no overflow to signal.

6. Keyboard:
   - Tab moves through the header in order (trigger, trigger, trigger, Contact, Donate) and then into the
     open panel's links; `document.activeElement.closest('div.fixed')` is true by the sixth Tab.
   - Escape closes the open panel and releases the body-scroll lock: `aria-expanded` returns to all false
     and `body.style.overflow` returns to empty.
   - The panel does not swap under a tabbing reader. With What We Do open, four Tabs across the other two
     triggers and out to Donate leave `aria-expanded` unchanged at `false,true,false,false`. The triggers
     still carry no `onFocus`.

## M6, the tile imagery

Reporting only, as instructed. Nothing reseeded, nothing touched in `nav.ts` or `kape.db`.

The mismatch is real: a coffee table for About KAPE, a rainbow for Our Partners, a dreamcatcher for DEP, a
galaxy for IEP. All four are visible in the original audit shots.
The desktop mega panel no longer renders those images, so the mismatch is not visible there any more.

It has not gone away. The same `image` field still feeds the mobile drawer thumbnails and the public page
headers, and those were out of scope here. The fix is still the client's real photography.

Worth raising alongside it: the nav briefs. `description` on a project node reads "MLDP - a KAPE current
project." for 18 of the 21 projects. The panel no longer shows them, but the same field renders on the
project pages, where restating the title as a sentence is the whole of the page's introduction. That is
the empty-project-pages item already on the backlog, seen from a second angle.

## Open, and not mine to fix

**The project labels are bare acronyms.** NGS, NGPRC, HCC, CLASS, IEP, DEP, MLDP, EQUAL-i3L, LLSE, then
nine more under Past Projects. The brief now carries the expansion for seven of them, so the menu is
readable, but it is readable by accident: the real name is sitting in the description field because
nobody put it in the label.

Seven still show nothing but an acronym, because their description only restates it: CLASS, MLDP,
EQUAL-i3L, LSLAG, SEEK, KYLA, ESCUP. Those rows tell a first-time visitor nothing.

The fix is the nav label, which lives in `nav.ts` and the seed, not in `Header.tsx`, and the parallel pane
was live against that database. Left alone. It wants a client decision anyway: either the labels become
"New Generation Schools (NGS)" or those seven stay insider-only.

**Group headings do not link.** Comparable menus put an Overview first in each group. `nav.ts` nulls the
href on any node with children, so "Current Projects" is text, not a link. The mobile drawer already
renders an Overview row; desktop cannot. Same file, same reason, left alone.

## One observation outside the deltas

Pressing Enter on a focused nav trigger did not fire a click in the automation harness; Space did, and the
panel opened normally. The code comment claims Enter and Space both open it. This is untouched behaviour
and may be a harness artefact rather than a browser one, so it is noted rather than fixed. Worth a real
keyboard check on a real machine.

Not committed.
