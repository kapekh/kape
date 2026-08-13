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
| J03 updateField | herdr `w1:p1X`, agent `j03`, worktree `kape-j03` | **live** | |
| J04 addressing | herdr `w1:p1W`, agent `j04`, worktree `kape-j04` | **live** | |
| J06 section editor | unassigned | after J03, J04 | Contract written |
| J07 page/post editor | unassigned | after J06 | Contract written |
| J08 prerender invalidation | unassigned | after J03 | Contract written |
| UAT | lead pane | after every job | Every public page and every admin function |

## Live now

Two panes, both from commit `63a0ec8` on branch `inline-round`, each in its own git worktree with its own database copy and its own port.

- **J03**, pane `w1:p1X`, agent `j03`, `/home/userx/workspace/kape-j03`, branch `j03-updatefield`, db `j03.db`, port 3071. Owns `router.ts`, `repo/admin.ts`, its new test.
- **J04**, pane `w1:p1W`, agent `j04`, `/home/userx/workspace/kape-j04`, branch `j04-addressing`, db `j04.db`, port 3072. Owns `SectionRenderer.tsx`, `SubPage.tsx`, `$.tsx`.

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

Verify J03 and J04 in this pane when they report: re-run their gates in their own worktree at their commit, check the ownership boundary held, then merge into `inline-round` and close the pane. J06 and J08 go out at that seam.
