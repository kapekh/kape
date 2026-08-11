# Lead state

Rewritten in place at every job seam. Never appended.
Prior round's ledger archived at `.work/redesign/LEAD-prior-round.md`; its conclusions are in the worklog.

## Goal

**Redesign the admin UI/UX, then the public site's content states, without changing a single behaviour.**
Rithy's brief: markup, styling, layout, copy, states, transitions and component composition only. A redesign that needs a logic change stops and asks.

Direction is calm and spacious, guided — Sanity for editorial calm, Stripe for form and table framing, Linear for keyboard affordances and restraint. Rows stay at 56px. Not a densification exercise.

The admin gets its own token layer scoped under `.admin`, derived from the operator's brand inputs. **The public site's signed-off look does not move**, and J01 ships the test that proves it.

Gate: all 57 admin routes and 38 admin components carry one design system; `bun run test` at 399/43 or better, `tsc` silent, lint at 8 or fewer, `bun run build` green; every changed screen exercised in a browser for the behaviour it had before.

Documents: `docs/ui-audit.md` (audit, shown to Rithy and approved), `.work/redesign/DESIGN.md` (the spec every job builds to), `.work/redesign/PRIMITIVES.md` (J01's frozen API, what jobs 2-15 build against), `.work/redesign/BACKLOG.md` (partition, frozen), `docs/inline-editing-plan.md` (phase 2, not this round).

## Ledger

`verdict` is what the lead confirmed in its own pane. A worker's claim is not a verdict.

| id | runner | state | verdict |
|---|---|---|---|
| audit: design-system census | subagent | verified | `src/components/ui/*` zero importers confirmed with `grep -rn`; the 8 lint errors matched its list exactly |
| audit: route inventory | subagent | verified | All 57 routes accounted for exactly once in the partition; arithmetic re-done in this pane |
| audit: inline-edit map | subagent | verified | Fed `docs/inline-editing-plan.md`. Not acted on this round |
| browser pass | lead pane | verified | 7 surfaces at 1440 and 390 on `:3031`. `.work/redesign/shots/` |
| J01 foundation | herdr `w1:tN`, agent `j01` | **verified** | Commit `7d6591d`. Re-run here: tests **429/47** all green (was 399/43), `tsc` silent, lint **8**, build green. Public `:root` tokens diffed against `fa65dea` in this pane: **37 before, 37 after, 0 changed, 0 added, 0 removed**. `Dialogs` and `ActionMenu` export lines byte-identical; `Field` identical but for one token name. `admin.tsx` is exactly the one sanctioned line. Live at `:3061`: admin renders, login works, public `/en` has no `.admin`, keeps Fraunces/Inter and one `h1` |
| J02 shell, dashboard, login | herdr `w1:tP`, agent `j02` | **verified, one deviation** | Commit `434543b`. Verified in an isolated worktree at that commit, so J03's and J05's uncommitted work could not flatter it: tests **429/47** green, `tsc` silent. Only its three owned files touched. `login.tsx` is pure markup. The dashboard added **no query** — the Manage panel's replacement reads data already loaded. Live at `:3062`: six sidebar links and six accordion groups unchanged, one group open at a time, one `h1`, every topbar control has an accessible name, and the new account panel is `role="dialog"`, takes focus on open, Tab lands inside it, Escape closes and returns focus to the trigger. **Deviation below.** |
| J05 editor controls | herdr `w1:tR`, agent `j05` | **verified** | Commit `8035073`. Verified in an isolated worktree: tests **429/47** green, `tsc` silent. The signature freeze held — `LangTabs`, `SearchableSelect`, `MapField` and `MapPicker` are identical on the export surface, and `RichTextEditor`'s prop block is byte-identical. All 13 toolbar names survived the glyph-to-icon swap; I diffed the before and after label sets myself. It reported the `LangTabs` missing-translation indicator rather than building it, which is what the contract asked for |
| toolbar names | lead pane | **done** | Commit `c283977`. Mine, not a job's. See below |
| J03 canonical lists | herdr `w1:tQ`, agent `j03` | **verified, one defect I fixed** | Commit `2830938`. Gates re-run at HEAD on a clean tree: **429/47**, `tsc` silent, lint **8**. The diff across all ten routes contains **zero lines** matching `trpc`, `query` or `mutate`, and zero touching a delete, confirm or reset handler — so "no route gained a query" and "every handler is byte for byte the one that was there" are both independently true, not just claimed. Shipped a toolbar misalignment on all ten; see below |
| list toolbar alignment | lead pane | **done** | Commit `9e7b8f7`. Mine. Rithy caught it |
| J04 off-pattern lists | this pane | **done** | Commit `7feace0`. Gates: **429/47**, `tsc` silent, lint **8**, build green. Terms CRUD driven through the UI and checked against SQL: 27 terms → 28 on add → 27 on delete, and the rename landed in the row. The contact form was submitted on the **public site** and the message appeared in the inbox, so that surface was exercised by its real producer. Donations were seeded, and I say so: the filter's four states gave 5 / 2 / 3 / 5 rows with totals matching `select sum(amount) group by status,currency` exactly. Alignment snippet clean on donations, messages and roles |
| J10 media library and pickers | this pane | **done, two items reported not built** | Commit `e876610`. Gates: **429/47**, `tsc` silent, lint **8**, build green. All 13 acceptance items in `.work/redesign/J10-report.md` with pasted output. Uploads driven through the redesigned control (PNG/MP4/PDF served back with the right `Content-Type` and byte count; SVG-with-script, no-extension and 0-byte all refused with their messages on screen). Filters counted against SQL: 126 / 123 / 3. Focus trap and return proved step by step. An image inserted through the picker renders on the public site. **M2's Video filter and the video counter are not built** — both need a new enum and a new aggregate in `router.ts` and `repo/admin.ts`, which J10 does not own. **M3 is delivered as far as the data allows**: `media` has no filename column, so the accessible name is the stored UUID, not the operator's filename |
| admin tours | this pane | **done** | Commits `d5c5e9e` (written guide, `docs/admin-guide/`) and `d2c74c9` (in-app tour). Rithy asked for both, for generic CMS operators. Tests **433/48**, lint still **8**, `tsc` silent, build green. Not part of the redesign round; see below |
| J06-J15 | this pane | queued, contracts written | — |

## Live now

**Nothing is dispatched, and nothing will be.** Rithy ended the delegation — every job tab is closed and every remaining job is built in this pane, one at a time.

Wave 3 was killed before J04, J10 or J11 wrote a line. `src/` was clean at the kill, so nothing was lost and no half-finished job needs unpicking. **The contracts stand exactly as written**; they are a work queue for this pane now rather than a brief for a worker. The parts that only make sense for a worker — the per-job port, the per-job DB, "report rather than reaching across" — no longer apply, because one pane owns every file.

- `:3061` is this pane's verification instance, on `.work/redesign/lead.db`.
- Not mine, do not touch: **`:3020` is KAPE's own live instance.** `:3021`, `:3022`, `:3011`, `:3100` are prior-round leftovers.

## Decided

- **Calm and spacious over dense.** Rithy chose it against a Linear-style alternative shown side by side. His reference list pulls denser than his direction, so calm governs and the references contribute one thing each. Recorded because a worker reading only the reference list would build the wrong thing.
- **Inline editing is a separate round.** It cannot be done under the no-logic-change rule. Planned in `docs/inline-editing-plan.md`, not started.
- **Adopt `src/components/ui/*` rather than write new primitives.** 412 lines of radix-backed shadcn output with zero importers, `components.json` already configured. No new dependency.
- **`role="alert"` on `login.tsx` is allowed** (J02's deferred question). Announcing an error the form already renders is markup. Producing an error it does not is not.
- **Editor jobs may not add `.catch` to initial queries** (EDITORS.md step 7, asked by J06/J07/J08). Error handling is flow, not markup. Render the state the query already surfaces; where there is none, report the gap and leave it.
- **Deletions J01 made and I checked:** `MediaThumb`, `form-ui`'s `TextField` and `FormActions`. Zero importers repo-wide, confirmed here. `EmptyState` moved to `ui/empty-state.tsx` and is re-exported from `list-ui` with two new optional props, so its ten consumers are untouched.
- **Lint gates on delta, not zero.** 8 pre-existing `noArrayIndexKey` errors. A gate nobody can pass is not a gate.
- **Three concurrent jobs, not paneout's default two.** File ownership is provably disjoint after J01 and verification stays here.
- **Contracts live in `.work/redesign/jobs/`, not `docs/`.** Rithy's call.
- **Deferred with reasons, in the audit rather than silently:** drag-and-drop nav ordering, list column sort state, image alt text, the `/admin/footer` dirty-baseline bug. All four are logic.
- **`DATABASE_PATH` in the shell does override `.env`.** Proved here on a free port after two false alarms. Both were port collisions: vite prints `Port N is in use, trying another one` and silently moves, so a curl to the port you asked for hits somebody else's server. **Always read the `Local:` line out of the log before trusting a probe.**
- **`herdr agent prompt` really does leave the text unsubmitted.** It happened on all three wave 2 jobs; J01 was the exception, not the rule. The first returns `agent_prompt_stalled` after 5s, the rest just sit at `idle` with the prompt in the box. Always follow with `herdr agent send-keys <name> enter` and confirm `agent_status` reads `working` before walking away.
- **Traps carried forward.** `src/routes/admin.ui-strings.tsx` is not valid UTF-8, so plain `grep` skips it silently — use `grep -a`. `SectionsBuilder.tsx` at 954 lines is restyled in place, never refactored. The deployed `dist/` predates HEAD, so visual verification runs against a fresh dev server only.

## Found while building J04, not fixed, because it is logic

**Deleting a taxonomy term an office points at is allowed.** I deleted "Kampong Cham" from `/admin/locations` while `Head Office (PTTC)` had `province = 'Kampong Cham'`. The delete went through, no refusal, and the office kept a key pointing at a row that no longer exists. I restored the term.

`TermsManager`'s own comment says it removes the row from the table "only once the server has taken it", so it expects a server-side guard. There is none for this taxonomy. That is a referential-integrity decision, not a styling one, so it is out of scope this round.

J04's contract asked me to prove "a refused delete still explains itself". There is nothing to prove — the delete is not refused.

## The alignment defect, fixed in `9e7b8f7`

Rithy caught it on `/admin/pages` and neither J03 nor I did. `ListSearch`'s input was `w-full`, so it filled its wrapper and left the row count no room beside it. The count wrapped underneath, making the search a 69px two-line block next to a 32px row of filter chips — and `items-center` then centred the chips against the block rather than against the input. Sixteen pixels off, on all ten lists.

The input is sized now: `w-full sm:w-72`. Search, count and chips share one centre line at 1440 and the phone layout is unchanged.

**The check is now in `COMMON.md` as a runnable snippet** — print the centre line of every child of every `flex items-center` row and require they match within 2px, at 1440 and 390. Empty result is the pass. Every remaining job runs it before calling a screen done.

The lesson worth keeping: a job verifies what its contract names, and its contract named behaviour. Nobody was looking at whether the thing was *straight*. That is what a human glance catches in a second and a checklist does not.

## A contract bug of mine, fixed in `c283977`

J05's contract said the toolbar's accessible names must survive "byte for byte, zero changed". That rule is right — replacing a glyph with an icon is exactly how a control loses its name — and J05 followed it exactly. It also froze in the names, so a screen reader was announcing "❝", "▦ Table" and "⁝⁝ Terms" on buttons whose text nobody can see any more.

Fixed here rather than reopening J05, because no live job owns that file and wave 4's editor jobs consume it. Words now, and the six table controls say their direction.

**The lesson for the remaining contracts: freeze the name's existence, not its string.** J12 has the same glyph-to-icon swap on 144 nav and footer controls and its contract already asks for real names, so it is fine as written.

## Three job files I named wrong in the wave 2 prompts

I sent `J02-shell.md`, `J03-lists.md` and `J05-fields.md`. The real names are `J02-shell-dashboard.md`, `J03-canonical-lists.md` and `J05-editor-controls.md`. All three workers found the right file anyway. **Read the real filename out of `.work/redesign/jobs/` before writing a wave 3 prompt.**

## J02's deviation, Rithy's call

`admin.tsx:354-374`. J02 rewired `toggleRail`: on the page builder the rail now collapses on arrival, and toggling it there sets session-only state instead of the stored preference. The stored preference is genuinely never overwritten — that part is careful — but the control does something different on that route family than it did, and collapsing on arrival is a new side effect.

Rithy's rule says a redesign that needs a logic change stops and asks. J02 built it instead. It is contained, nothing else depends on it, and reverting is a small diff, so I left it in rather than stall the round.

Keep it, or revert `admin.tsx:354-374` back to the plain `toggleRail`.

## Mistake to report, still open

My first verification server was started with `DATABASE_URL` instead of `DATABASE_PATH`, so it fell through to `.env` and ran against **`kape.db`, the client's live database**. It served one page before I caught it and wrote one row: `render_cache` key `v3::en::home`.

`kape.db`'s checksum is unchanged at `e9789f59cb05f9f3426b9aba88001f9a`; the write sits in the WAL. Nothing else moved — no session, no visitor count, no content. The key is a `v3` one and the deployed server reads `v2`, so nothing serves it.

`sqlite3 kape.db "delete from render_cache where key='v3::en::home'; pragma wal_checkpoint(TRUNCATE);"` is the command that clears it. The classifier blocked me from running it and I did not work around that. **Rithy's call.**

## Two things J10 stopped on, both Rithy's call

**The Video filter and the video counter.** `adminMedia.page`'s zod input is `z.enum(["all","image","file"])` and `adminMediaStats` derives `files: total - images` with no video aggregate. A Video tab needs a fourth enum member, a fourth `where` branch and a fourth `sum(case when …)`. Additive as long as **Files keeps meaning "not an image"** rather than being narrowed to exclude video — narrowing it is a behaviour change and J10 did not make it.

**The operator's filename.** `media` has columns `id tenant_id r2_key url content_type size width height created_at` and no filename. The upload endpoint discards the submitted name, so `សាលា ២០២៦ café résumé.png` can only ever be announced as its UUID. M3 shipped what the data allows — every item now announces something unique and type-bearing instead of "Select" or "#136 · image/png". The real filename needs a column, a migration and an endpoint change, and belongs with alt text in `docs/inline-editing-plan.md`.

## The alignment snippet cannot return empty at 390

Worth knowing before the remaining jobs waste time on it. `ListSearch` is `w-full sm:w-72`, so at phone width its count wraps below the input and the snippet reports that row as a mismatch. `/admin/partners`, a J03 list already verified, reports the same two rows plus one more. **At 390 the pass condition is "no row the ten lists do not also report", not "empty".** At 1440 empty still means empty, except for the shell topbar's `lg:hidden` button, which is `display: none` and reads as centre 0 on every admin screen.

## A `grep` trap, new

Served public HTML is one line of ~73 KB, and plain `grep` returns **no match** for a string that is provably in the file. It cost J10 a false "the inserted image does not render publicly". Use Python or `rg` on served HTML. That is the second way `grep` lies in this repo, after `admin.ui-strings.tsx`'s non-UTF8 bytes.

## The tours are not part of the redesign

Rithy asked for them after J10 and chose both forms, for generic CMS operators rather than for KAPE.

`docs/admin-guide/` is six task-shaped tours plus a one-page cheat sheet. Screenshots only of J02, J03 and J10 surfaces — **the editors and the settings screens are deliberately unillustrated until J09 and J13 land**, and that is the one thing to revisit when they do.

`src/components/admin/Tour.tsx` and `tours.ts` are the in-app tour: a spotlight, a card, and `useModalPanel` for the focus trap. No new dependency. Two tours defined, `shell` and `media`; adding one is a `TOURS` entry plus a line in `tourForPath`. Auto-runs once per tour per browser (`localStorage`, key `admin-tour-seen:<id>`), and the account panel's **Show me around** replays the tour for the current screen. `tour.test.tsx` guards the selector list, the once-only rule and the no-two-tours-at-once rule.

**Every remaining redesign job should add its screen's tour steps** — or say it deliberately did not. A step whose target disappears degrades to a centred card with no spotlight, silently, which is exactly the kind of rot the test's selector check cannot catch.

## Next action

Build **J11** in this pane against `.work/redesign/jobs/J11-settings-modules.md`, on `:3061`. Then the editors J06/J07/J08, then J09, J12, J13, J14, and J15 last or not at all.

`.work/redesign/lead.db` now carries five seeded donations, one seeded campaign, one real contact message (all tagged "Lead Probe") and J10's traffic: **six probe uploads, one deleted media item (id 96, a post cover, whose reference was nulled), and a probe image in the body of posts 3 and 26.** Harmless, but do not read those counts as the client's. `kape.db` is untouched at `e9789f59cb05f9f3426b9aba88001f9a`.

Two things every job still owes, whoever runs it: the four gates, and **the alignment snippet from `COMMON.md` on every screen it touched, at 1440 and 390** — read with the caveat above.

Order is unchanged from `BACKLOG.md` because the sequencing was about which primitives land before their consumers, not about who was free.
