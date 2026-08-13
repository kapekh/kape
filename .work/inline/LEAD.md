# Lead state, inline editing round

Rewritten in place at every job seam. Never appended.

This round's ledger is here, not in `.work/LEAD.md`. That file is the redesign round's and still carries uncommitted changes plus J15 queued; it is not this round's to overwrite.

## Goal

Make the live site's content addressable and safely writable one field at a time, so an admin can edit a page in place without the save destroying what it was not told about.

Jobs 1, 2 and 5 shipped: the fallback signal, browser-only admin identity with affordance gating, and the UI-string editor as the proving ground. Header and footer strings are converted. What remains is the narrow write path (J03), markers in the DOM (J04), the two editors that consume them (J06, J07) and the static cache nobody busts (J08).

Rithy's rulings, from `docs/inline-editing-plan.md:156-161`: an inline edit publishes at once, the URL's language is always what gets written, and the affordance sits behind a toggle that is off by default.

Gate: `updateField` writes one row and provably destroys nothing; all 21 section types emit markers J03 can parse; an admin edits a section field and a page field in place, in both languages, and a visitor reading the static build sees the change; `bun run test` at 449 or better, `tsc` silent, lint at 6 or fewer, `bun run build` green; the public site's rendered text unchanged for anyone not editing.

Ends with UAT across every public page and every admin function, run in the lead's pane.

## Ledger

`verdict` is what the lead confirmed in its own pane. A worker's claim is not a verdict.

| id | runner | state | verdict |
|---|---|---|---|
| audit | lead pane | verified | Every plan citation re-checked. Three were stale, corrected in `AUDIT.md` |
| baseline | lead pane | verified | 449/50 green, `tsc` exit 0, lint 6, all run here on 13 Aug |
| J03 updateField | herdr `w1:p1X`, closed | **verified** | Commit `8eb2e99`, merged at `6bfc14a`. Re-run here: tests **467/51** (baseline 449/50), `tsc` exit 0, lint **6**. Only its three owned files. My own probe through `trpcRouter.createCaller` on a copy of the real database: page 40 keeps six rows and their ids, exactly one value moves, **630 translations before and after**, and three refused addresses write nothing. The same calls as `staff` are `FORBIDDEN`, so the per-entity gate it added holds |
| J04 addressing | herdr `w1:p1W`, closed | **verified** | Commit `9361e5b`, merged at `66995e1`. Re-run here: tests **449/50**, `tsc` exit 0, lint **6**, all at baseline, only its three owned files. The integration check neither job could run alone: **all 93 distinct targets the probe page emits parse through J03's real `parseFieldTarget`**, 4 `field`, 59 section prop, 30 repeater item. One structural change, a span around a hero stat label that was a bare text node, reported not styled around. **It left no runnable test**, so J06 now owes one |
| J06 section editor | herdr `w1:p1Z`, agent `j06`, worktree `kape-j06` | **live** | |
| J07 page/post editor | unassigned | after J06 | Contract written |
| J08 prerender invalidation | herdr `w1:p10`, agent `j08`, worktree `kape-j08` | **live** | |
| J15 command palette | herdr `w1:p1Y`, agent `j15`, worktree `kape-j15` | **live** | Redesign round's last job, dispatched here because it shares no file with anything |
| UAT | lead pane | after every job | Every public page and every admin function |

## Live now

Three panes, each from the merge of J03 and J04 at `66fe41c` on branch `inline-round`, each in its own git worktree with its own database copy and its own port.

- **J06**, pane `w1:p1Z`, agent `j06`, `/home/userx/workspace/kape-j06`, branch `j06-section-editor`, db `j06.db`, port 3074. Owns `lib/inline-edit.tsx`, `InlineEditBar.tsx`, `SectionRenderer.tsx`, one new test.
- **J08**, pane `w1:p10`, agent `j08`, `/home/userx/workspace/kape-j08`, branch `j08-prerender`, db `j08.db`, port 3075, prerender preview on 4185. Owns `scripts/prerender-static.ts`, one new test.
- **J15**, pane `w1:p1Y`, agent `j15`, `/home/userx/workspace/kape-j15`, branch `j15-palette`, db `j15.db`, port 3073, from `030351a`. Owns one new file, `src/components/admin/CommandPalette.tsx`. Three concurrent rather than two because Rithy asked for the whole website today and this one collides with nothing.

`kape-j03` and `kape-j04` are merged, their panes closed and their worktrees removed.

Not mine, do not touch: **`:3020` is KAPE's own live instance.** `:3021`, `:3022`, `:3011`, `:3100` are prior-round leftovers.

## Decided

- **The lead does not build.** Rithy's call, this session. Every job runs in its own pane; this pane writes contracts, verifies reports against its own re-run, merges, and runs UAT at the end.
- **A pane closes when its job is verified**, together with its worktree. Rithy's call. The branch stays until it is merged.
- **Build `updateField` rather than accept read-modify-write.** Open question 4 in the plan. The alternative routes every inline save through `updatePage`, which deletes every translation row and reinserts from the payload. That is data loss, not a preference.
- **J06 owns the shared box, J07 consumes it,** so the two are serial rather than the pair the backlog imagined. `EditTarget` and `InlineEditBar` are one file each and both editors need them widened; two panes cannot own that.
- **J08 runs beside J06,** not after J07. It depends on J03 alone and shares no file with anything.
- **This round gets its own `.work/inline/`.** `.work/LEAD.md` has uncommitted changes and belongs to the redesign round.
- **Lint gates on delta, not zero.** Six `noArrayIndexKey` errors predate the round.
- **No schema change, no migration.** That is what makes concurrent panes safe at all.
- **J15, the redesign round's command palette, is back on.** Rithy asked for every remaining job. It is not this round's ledger; it goes out after the inline round or beside it, from `.work/redesign/jobs/J15-command-palette.md`.

## Next action

Verify J06, J08 and J15 as each reports, in this pane, against a re-run of its own gates in its own worktree. J07 goes out the moment J06 is verified, because it consumes J06's box. Then UAT from `.work/inline/UAT.md`, with `uat-crawl.ts` for the page sweep.
