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
| J11 settings and modules | this pane | **done, one violation of my own I caught and fixed** | Commit `98ec922`. Gates: **433/48**, `tsc` silent, lint **8**, build green. All 12 acceptance items in `.work/redesign/J11-report.md`. Settings round-trips: 41 keys before, 41 identical after, and the one-field save moves exactly one line of the dump. Both probes reached the public site. Section nav reaches all four sections by click and by scroll. Custom key/value 21 → 22 → 21 rows, DB 41 → 42 → 41. Schools off removes it from the sidebar and `/admin/schools` redirects to `/admin`; back on, everything returns; `Modules saved.` both times. **The violation: my first cut of Brand displayed stored colours as hex and its save wrote that hex back over eight untouched `oklch()` values.** Caught by the round-trip diff, the conversion is deleted, the eight values restored, and the re-proof is in the report. **This commit also carries the sticky fix** below, and one file's worth of the in-flight comment pass, because `admin.tsx` had both |
| J06 editors A | this pane | **done, two primitives touched deliberately** | Commit `3af6565`. Gates: **435/48**, `tsc` silent, lint **6** (both named `noArrayIndexKey` errors removed, none added), build green. All 15 acceptance items with pasted output in `.work/redesign/J06-report.md`. Eleven post-type field lists before and after, identical; counts identical on all sixteen captured screens; three fields **gained** a name they never had. Create, edit, dirty guard, validation, keyboard path on all four converted selects, and EN+KM round trip all driven through the UI and checked against SQL. **I edited `form-ui.tsx` twice** - `FormSection` gained an opt-in `split`, `EditorGrid` gained two `data-tour` hooks - because E2 names `FormSection` and eleven forms should not each invent a two-column section. Both additive, guard test untouched. **The alignment snippet caught two real defects of mine at 1440**, both fixed; every screen now reports only the documented topbar artefact |
| J07 editors B | this pane | **done, one primitive touched deliberately** | Commit `a1bae23`. Gates: **435/48**, `tsc` silent, lint **6**, build green. All 15 acceptance items with pasted output in `.work/redesign/J07-report.md`. Field counts identical on all eight screens; create, edit, dirty guard, validation, keyboard on all three converted selects, EN+KM bio round trip, both maps and a photo upload all driven through the UI and checked against SQL. Module gating proved four ways by stashing back to HEAD with `projects` off. **I edited `MediaPicker.tsx`** - its chosen-file row centred a `w-full` filename against the two buttons it pushed onto the next line, 33.75px out on every editor with an image set, invisible to J06 because none of its records had one. **Item 13's premise is wrong and the report says so**: the org chart shows a person's name and photo, never their title |
| J08-J15 | this pane | queued, contracts written | — |

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

`src/components/admin/Tour.tsx` and `tours.ts` are the in-app tour: a spotlight, a card, and `useModalPanel` for the focus trap. No new dependency. Four tours defined — `shell`, `media`, `settings` and `modules`; adding one is a `TOURS` entry plus a line in `tourForPath`. Auto-runs once per tour per browser (`localStorage`, key `admin-tour-seen:<id>`), and the account panel's **Show me around** replays the tour for the current screen. `tour.test.tsx` guards the selector list, the once-only rule and the no-two-tours-at-once rule.

**Every remaining redesign job should add its screen's tour steps** — or say it deliberately did not. A step whose target disappears degrades to a centred card with no spotlight, silently, which is exactly the kind of rot the test's selector check cannot catch.

## Every `sticky` in the admin was dead until `98ec922`

`main` carried `overflow-x: hidden`. `overflow-x: hidden` computes `overflow-y` to `auto`, so `main` was the scrollport for everything inside it — and it never scrolls, the document does. Every `position: sticky` descendant therefore had a scrollport that could not move and quietly did nothing. `EditorGrid`'s `lg:sticky lg:top-6` rail, J01's frozen primitive that **J06, J07, J08 and J09 all consume**, was one of them. Measured before the fix: `mainScrollable: false`, the settings nav rail at top `-432` instead of `80`.

`overflow-x: clip` still clips sideways and creates no scroll container. **The editor jobs inherit a working rail; they did not have one before.**

## What J11 got wrong, so the editors do not repeat it

The Brand section showed stored colours as hex, which meant its save wrote hex back over every untouched `oklch()` field in that section. One edit to `theme_paper_hue` silently rewrote eight values. It was a display convenience with a write attached.

The round-trip diff caught it, which is the whole reason acceptance asks for a full dump before and after rather than a spot check of the field you edited. **A restyle that normalises, formats or settles a stored value is a behaviour change wearing a stylesheet.**

The field shows a hex again in `daae2ac`, and this time it is only a display. `saveDraft` sends the keys in `draft`, and a key enters `draft` only through that field's `onChange`, so a colour nobody typed in is never written whatever the box shows. `-admin.settings.test.tsx` pins both halves: the stored `oklch()` reads as `#002C5E` on screen, and saving Brand after one edit writes one row and leaves the other two stored values in `oklch()`.

Driven through the real screen on `:3071` against `lead.db`, not only the mocked test. Five colour fields read `#002C5E #418AD1 #F3821D #F6623D #E6AC3D` while the table held five `oklch()`. `theme_accent` was edited to `#7C3AED` and Brand saved: **41 keys before, 41 after, one line moved.** The other seven colours kept their `oklch()`. Restored, and the dump matches the pre-probe one byte for byte.

## No oklch-to-hex migration, and there will not be one

Asked because the field now speaks hex and the table does not. Nothing needs it, and it would cost something.

Nothing reads a stored colour as text. Every JS consumer - `themeColor`, the swatch, `themeContrast` - goes through `colourToHex` first, and every derived CSS token is `oklch(from var(--brand-primary) …)`, which converts whatever it is handed. Proved on `:3071` with `--brand-primary: #1F4E79` in the table: `--primary-foreground` computed `oklch(0.985 0.012 80)`, and `--warm-foreground` came out `oklch(0.24 0.078 249.105)`, so relative colour syntax read the hue back out of the hex. A mixed table is fine too, because no two values are ever compared.

The cost is that hex is the smaller space. `theme_primary`'s own `oklch(0.30 0.10 255)` is already slightly outside sRGB - linear red `-0.0031` - so a migration would store the clipped 8-bit approximation and throw the authored value away. Rewriting an operator's colour to gain nothing is the J11 mistake with a schedule attached.

**Named, not fixed:** for a colour outside sRGB the box shows the clipped hex, so the field can read a shade off what the page paints. No write is attached - only retyping that field replaces it - and the swatch beside it was already clipped before any of this. Revisit if a P3 brand ever turns up.

## What J06 leaves for J07 and J08

**Build on these rather than re-inventing them.** J06's whole point was that the three jobs come
back with one thing, and two of them have not run yet.

- **`FormSection` takes `split`.** Description column left, fields right, above `lg`. Opt in per
  section. **Do not split a section holding a rich text editor or a row of three-plus controls** -
  the main column is ~680px and both wrap. J06 measured it twice.
- **`useFieldErrors`** renders the browser's own constraint message under its field, sets
  `aria-invalid`, focuses the first invalid control. Spread `{...invalid("key")}` onto the control
  and pass `error={errors.key}` to `Field`. It invents no errors, so it stays inside the E3 boundary.
- **`EditorSkeleton`** is the loading state. Five routes use it; the rest still say "Loading…".
- **`EditorGrid` marks its columns** `data-tour="editor-main"` and `data-tour="editor-aside"`, and
  the `editor` tour already points at them. A new editor screen gets the tour for free; add its
  path to `tourForPath`.
- **`Field`'s required marker** now appears wherever `required` is passed, with `(required)` for a
  screen reader and the `*` `aria-hidden`.

**The verification server needs `PORT` as well as `--port`.** `getUrl()` in `root-provider.tsx`
reads `process.env.PORT` and falls back to 3000, so SSR fetches a port nobody is serving and every
page 500s with `Unable to connect. Is the computer able to access the url?`. `COMMON.md`'s command
is missing it. Use:

```bash
PORT=3061 DATABASE_PATH=.work/redesign/lead.db AUTH_SECRET=redesign-audit-secret-key-0001 \
  bun --bun vite dev --port 3061
```

**`chrome-devtools-axi` cannot write a screenshot into the repo** from a sandboxed bash - it
reports the path and writes nothing. Shoot into `/tmp` and copy. `.work/redesign/j06-shots.sh`
does that, and marks every tour seen first, because a restarted browser auto-runs the shell tour
over whatever you were photographing.

## What J07 leaves for J08

**The split rule, so the eleven come back as one thing.** J06 said which sections must not split.
J07 turned that into the positive rule and J08 should copy it rather than invent a third:
**split a section when every field in it is a single full-width control, and stack those fields.**
A split section's fields column is ~440px at 1440, so a `grid sm:grid-cols-2` inside one reads as
cramped; unsplit the section or drop the grid.

**Radix `Select` rejects `""` as an item value.** Person `Sex` stores `""` for "not recorded", so
the control shows a sentinel and maps it back on change. State, dirty baseline and payload stay
`""`. Any remaining editor with an empty-valued option needs the same two lines.

**The `editor` tour now covers all eleven entity editors**, so J08 inherits it and adds nothing.
Its step bodies were reworded off posts-only language while doing that.

**`/admin/org-chart` is not fed by a person's title.** An `org_nodes` row has its own `name` and
`title`; `personId` resolves to the person's name, slug and photo only. Do not repeat J07's
contract's claim in a later one.

## Next action

Build **J08**, then J09, J12, J13, J14, and J15 last or not at all.

`.work/redesign/lead.db` now carries five seeded donations, one seeded campaign, one real contact message (all tagged "Lead Probe"), J10's traffic: **six probe uploads, one deleted media item (id 96, a post cover, whose reference was nulled), and a probe image in the body of posts 3 and 26**, J06's: **post 30, project 20, campaigns 2 and 3, and project 3 moved to 13.1234 / 104.5678 with USAID added**, and J07's: **person 9 with two bio translations and media 138, school 7, office 6, partner 7, and one `org_nodes` row linked to person 9.** Harmless, but do not read those counts as the client's. `kape.db` is untouched at `e9789f59cb05f9f3426b9aba88001f9a`.

Two things every job still owes, whoever runs it: the four gates, and **the alignment snippet from `COMMON.md` on every screen it touched, at 1440 and 390** — read with the caveat above.

Order is unchanged from `BACKLOG.md` because the sequencing was about which primitives land before their consumers, not about who was free.
