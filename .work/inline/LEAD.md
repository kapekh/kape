# Lead state, inline editing round

Rewritten in place at every job seam. Never appended.

This round's ledger is here, not in `.work/LEAD.md`. That file is the redesign round's and still carries uncommitted changes plus J15 queued; it is not this round's to overwrite.

## Goal

Make the live site's content addressable and safely writable one field at a time, so an admin can edit a page in place without the save destroying what it was not told about.

Jobs 1, 2 and 5 shipped: the fallback signal, browser-only admin identity with affordance gating, and the UI-string editor as the proving ground. Header and footer strings are converted. What remains before any real editor can exist is a narrow write path (J03) and markers in the DOM (J04).

Rithy's rulings, from `docs/inline-editing-plan.md:156-161`: an inline edit publishes at once, the URL's language is always what gets written, and the affordance sits behind a toggle that is off by default.

Gate: `updateField` writes one row and provably destroys nothing; all 21 section types emit markers J03 can parse; `bun run test` at 449 or better, `tsc` silent, lint at 6 or fewer, `bun run build` green; the public site's rendered text unchanged.

## Ledger

`verdict` is what the lead confirmed in its own pane. A worker's claim is not a verdict.

| id | runner | state | verdict |
|---|---|---|---|
| audit | lead pane | verified | Every plan citation re-checked. Three were stale, corrected in `AUDIT.md` |
| baseline | lead pane | verified | 449/50 green, `tsc` exit 0, lint 6, all run here on 13 Aug |
| J03 updateField | unassigned | ready | |
| J04 addressing | unassigned | ready | |
| J06 section editor | unassigned | after J03, J04 | |
| J07 page/post editor | unassigned | after J03, J04 | |
| J08 prerender invalidation | unassigned | after J03 | |

## Live now

**Nothing is dispatched.** Ready set is {J03, J04}; J03 goes first because it unblocks three jobs to J04's two.

Dispatch is blocked on the runner, not on the plan. This lead is not running inside Herdr (`HERDR_ENV` unset), and the worktree boundary only applies to a job that leaves the lead's pane. Both contracts are runner-agnostic and can go out the moment a pane exists.

## Decided

- **Build `updateField` rather than accept read-modify-write.** Open question 4 in the plan, unanswered until now. The plan recommends building it at `:92`, and the alternative routes every inline save through `updatePage`, which deletes every translation row and reinserts from the payload. That is data loss, not a preference. J03's acceptance 1 is the proof obligation.
- **This round gets its own `.work/inline/`.** `.work/LEAD.md` has uncommitted changes and belongs to the redesign round. Overwriting it would destroy work this lead did not do.
- **Lint gates on delta, not zero.** Six `noArrayIndexKey` errors predate the round. Six in, six or fewer out.
- **No schema change, no migration.** That is what makes J03 and J04 safe to run concurrently at all; the moment one needs `drizzle/`, they become serial.
- **Rejected: committing all of `.work/` before dispatch.** The precondition is that the *contracts* exist in the commit a worktree is built from. `.work/` also holds chrome profiles and screenshots, so the commit is `.work/inline/`, not the directory.

## Next action

Commit `.work/inline/` on a branch, then dispatch J03 into a worktree from that commit. Nothing else starts until J03's acceptance 1 is verified in the lead's pane.
