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
| J06 section editor | herdr `w1:p1Z`, closed | **verified** | Commit `a82bda1`, merged at `032dd94`. Tests **476/52** on its base of 467/51, `tsc` 0, lint 6, only its four files. Its guard builds a probe from the section registry, 40 sections and 151 addresses, and asserts the set of fields a box opens on equals the set J03's real write accepts. That found J04 marking a `resources` item's `kind`, a select; the marker is deleted at `48a8300` |
| J07 page/post editor | herdr `w1:p21`, closed | **verified** | Commit `90c3dfe`, merged at `7d48c09`. Tests **496/54** on its base of 487/53, `tsc` 0, lint 6. It closed the version hole rather than working around it: `updatedAt` rides on the public payload, the extra `adminPages.get` per record is gone, and **a post save carries `expectedUpdatedAt` for the first time**, proved with two tabs and a six-row dump. It edited J06's test, outside its list, which removing that read made necessary |
| J08 prerender invalidation | herdr `w1:p10`, closed | **verified** | Commit `6ecf5ff`, merged at `858bad6`. Tests **478/52**, `tsc` 0, lint 6 on src and scripts. My own run: nothing stale writes no file and never starts the preview server; one `updateField` marks exactly the two paths of that page and the regenerated html carries the new title. It also fixed the path list, which emitted six paths the router refuses, so three events 404'd on every prerender and two announcements were never written: **150/150 where it was 146/152** |
| J15 command palette | herdr `w1:p1Y`, closed | **verified** | Commit `e879bbc`, merged at `b1c6087`, mount applied by the lead at `a4ddbae`. Tests 449/50 at its base, `tsc` 0, lint 6, one new file. Driven here: `Ctrl+K`, type `donat`, Enter lands on `/admin/donations`. Route search only; content search needs a procedure the job could not add, which its contract allowed |
| UAT | lead pane | **done** | `.work/inline/UAT-report.md`. 107/107 public URLs, 50/50 admin routes, permissions refused at the API, contact form end to end, modules on and off, search, media, donate, the palette, inline editing in both languages, and the static build catching up in two paths of 150 |

## Live now

**Nothing is dispatched. Every job in this round and the redesign round's J15 is merged into `inline-round`, every pane is closed and every worktree is removed.**

`uat.db` is a copy of the client database that UAT wrote to. `kape.db` was never written to by this session.

Not mine, do not touch: **`:3020` is KAPE's own live instance.**

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

Merge `inline-round` into `main` and push, then deploy: `bun run build && PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale` on the host, which is also the command that fixes the 138 pages serving pre-fix html.

Open, and Rithy's to rule on: the palette opening on top of a tour, the media row whose file is missing, a post body that is still unmarked because the payload carries rendered html rather than the source, and the 157 branded files under `.work/`.
