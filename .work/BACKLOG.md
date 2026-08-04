# Backlog

Source: `.work/AUDIT.md` — 26 deltas between the client's `feedback/` prototype and `src/`.
Deltas D01-D26 are grouped into jobs by **file ownership**, not by theme. A job owns its files
outright; two jobs may run at once only if their file lists are disjoint.

## Tree baseline

Observed 2026-08-04 on `main`, after `bun install` (449 packages).

The first reading was wrong: `biome.json`'s `**/src/**/*` glob also matched `feedback/`, so 402 of
the 856 reported problems included the client's untracked prototype. Fixed in `87f6f0c`; scope is
now 204 files. Formatting landed mechanically in `6f4b6b2`.

| command | before | now |
|---|---|---|
| `bun run test` | 3 tests pass | **10 tests, 4 files** (J08 +4, J05 +3) |
| `bun run format` | 185 errors (ours) | **clean** |
| `bun run lint` | 210 errors, 60 warnings | 216 errors, 67 warnings |
| `bun run check` | 477 errors (ours) | 216 errors, 67 warnings |
| `bunx tsc --noEmit` | 58 errors, all in `feedback/` | **0 errors** |

Formatting is clean, so a formatting regression is now a real signal. Lint is still red, so
"check passes" is not yet a gate. Every job gates on **tests still pass** and **no new Biome
errors in the files you own**.

## Jobs

| id | title | deltas | owns | state | pairs with |
|---|---|---|---|---|---|
| J00 | Biome scope fix + format | — | `biome.json`, repo-wide | **done** `87f6f0c` `6f4b6b2` | — |
| J01 | Section catalogue expansion | D02 D03 D07 | `src/lib/sections.ts` | **done** `58ae318` | — |
| J06 | Chrome and Khmer identity | D22 D23 D24 | `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/styles.css`, `src/components/KhmerCalendar.tsx` | **done** `37235ad` | — |
| J02 | Restore the nested IA | D08 D12 | `src/lib/collections.ts`, `src/server/repo/route.ts`, `src/server/schema.ts`, `drizzle/` | **done** `60ac37f` | — |
| J03 | Renderer visual fidelity | D01 D04 D06 D13 D14 D15 D16 D17 D27 | `src/components/sections/SectionRenderer.tsx`, `src/lib/sections.ts` | **done** `a4542e4` | — |
| J14 | Content repo follow-ups, from J03 | — | `src/server/repo/content.ts`, `src/server/repo/sections.ts` | **done** `6dd884a`, bar the Type column | most |
| J13 | Repo hygiene, from J02's findings | — | `src/integrations/tanstack-query/root-provider.tsx`, `README.md` | item 1 done `0784475`; items 2-3 open | most |
| J04 | Lightbox, share, related | D05 D10 D11 | `src/routes/$.tsx`, `src/components/Lightbox.tsx`, `src/components/ShareButtons.tsx` | **done** `866229e` | J09 J05 |
| J05 | Announcement modal + month counter | D09 D25 | `src/components/AnnouncementPopup.tsx`, `src/server/repo/site.ts` | **done** | J03 J04 |
| J07 | Form builder field types | D21 | `src/lib/forms.ts`, `src/components/FormRenderer.tsx`, `src/components/admin/FormBuilder*` | ready | most |
| J08 | Rich text tables | D18 | `src/lib/richtext/extensions.ts`, editor toolbar | **done** | most |
| J09 | Project metadata | D19 | `src/server/schema.ts`, `src/components/ProjectView.tsx`, `drizzle/`, projects repo + admin editor | **done** `4566c2b` | J04 J14 |
| J10 | Map pin richness | D20 | `src/components/MapView.tsx`, `src/server/schema.ts`, `drizzle/` | **done** `a67d622` | J04 J14 |
| J11 | Site search | D26 | `src/routes/search.tsx`, `src/server/repo/search.ts` | ready | most |
| J12 | Lint pass | — | repo-wide | after the visual jobs | nothing |
| J15 | Split the seed by area | — | `src/server/seed.ts` → `src/server/seed/` | **done** | nothing |
| J16 | Page copy transfer, 6 pages | — | `src/server/seed/pages-*.ts` | **done** `d06b0b9` | J17 J18 J19 |
| J17 | Project content + 8 sub-projects | — | `src/server/seed/projects.ts` | **done** `4ce8dc9` | J16 J18 J19 |
| J18 | Structured records | — | `src/server/seed/records.ts` | **done** `db65314` | J16 J17 J19 |
| J20 | UX flow audit of the live client site | — | `.work/UX-AUDIT.md`, `.work/ux-shots/` | **done** `8b09f2f` | anything |
| J21 | Five visitor-visible defects, from J20 | F04 F14 F23 F27 F40 | `src/components/Header.tsx`, `src/integrations/trpc/router.ts`, `src/lib/i18n-config.ts`, `src/routes/$.tsx`, `src/routes/$lang.*` | **done**; F04 rode with J05 `1fdf941` | nothing |
| J19 | Import the real imagery | — | `scripts/import-lovable-assets.ts`, `src/server/seed/media.ts` | **unblocked** | J16 J17 J18 |

`src/server/schema.ts` and `drizzle/` are contended by J02, J09, J10. All three are done; the
migration lane is free at `0016`.

**Acceptance B is now done for all three content jobs.** J18's worker ran its own; J16's and J17's
were run by the orchestrator on 2026-08-04 after the permission classifier denied both workers the
admin login, quoting credential exploration, while letting J18 through. The rule is not applied
consistently, so **assume a worker cannot log in to `/admin` and plan the round-trip as an
orchestrator step** rather than writing it into a contract that may be unrunnable.

**The client's project pages are boilerplate.** 24 of the 26 routes under `current-projects.` and
`past-projects.` carry one identical body sentence — "published on this page and updated by the
KAPE communications team" — preceded by their meta description repeated verbatim. Only `dep` and
`iep` differ, and both are parent listing pages. J17 transferred this faithfully; there is simply
almost no project prose to transfer. KAPE has to write it before those 26 pages say anything.

`.work/km-review.md` was going to be shared by J16, J17 and J18. Three panes appending to one file
lose each other's writes, so each now writes `.work/km-review-j1N.md` and the orchestrator merges.

`src/components/Header.tsx` is contended by J06, J11 and J21. All three of its owners are done, so
**J11 is unblocked**.

J21 never had a job file. It existed as a backlog row because its F14/F23/F27 fixes were already
sitting in the working tree and would otherwise have been lost. Report at `.work/j21-report.md`.

**Contact and donate are language-prefixed now.** `/km/contact`, `/en/donate/success`, and so on;
`routes/contact.tsx` and the four `donate*.tsx` files moved under `$lang.`. Anything that adds a
public page with its own route file has to go under `$lang.` too, or it silently reverts the visitor
to English. `FUNCTIONAL` in `lib/i18n-config.ts` is now only the staff app, the API, uploads and
static files.

## What the first round changed

J01 and J06 ran concurrently and both pushed back on the contract rather than complying:

- **D25 moved to J05.** The month counter needs a field from `recordAndGetVisits` in
  `server/repo/site.ts`, which J05 owns. J06 reported it blocked instead of reaching across.
- **D06, D13, D14, D15, D16 moved to J03.** Each needs renderer work before a catalogue field
  would do anything. J01 declined to add fields nothing reads.
- **J03 grew and got harder.** `postList` has no `table` branch; `listJobs` (`content.ts:284-316`,
  not the audit's line numbers) returns no `type` field, so D13's type column has no data without
  a repo change. Source `projects` resolves to `listProjectOptions` returning `{code, name}` — a
  picker list — so D14 needs a new repo query as well as a renderer.
- **Two audit claims were wrong** and were corrected, not implemented: `center` is read only by
  `cards`; `hero`, `stats` and `cta` paint their own backgrounds and never read `tone`.
- **D27, new.** `split.statValue`/`statLabel`, the `stats` band background image, and
  `videoGrid.moreHref` are read by the renderer but authorable nowhere — same class as D02.
- **`tsconfig.json` had the same scope bug as `biome.json`** and excluded only the previous
  prototype. Fixed in `ba0c534`; `bunx tsc --noEmit` is now 0 errors and is a usable gate.

## Content transfer from `feedback/` — measured 2026-08-04

The audit compared **capabilities**, not content: it was told a hardcoded prototype page is only a
delta if our catalogue cannot express it. So the copy itself was never in its remit. Measured
directly, route by route, against `kape.db`:

| state | count | detail |
|---|---|---|
| copy already matches, verbatim | 18 | carried over from the earlier drop; spot-checked `what-we-do/ict-innovation` word for word |
| page exists but has **zero sections** | 4 | `who-we-are/` about, fact-sheet, director-speech, vision-mission |
| page missing entirely | 2 | `what-we-do/ten-subsectors`, `who-we-are/accreditations` |
| resolves via legacy 301 to a collection | 5 | leadership→team, news→news, photo-gallery→galleries, video-gallery→videos, impact-stories→stories |
| project record exists, body is **placeholder** | 18 | e.g. `ngs` body reads "New Generation Schools overview and outcomes." |
| sub-project missing entirely | 8 | `dep/{air,camscam,ideal,midl,dvitsa}`, `iep/{ctsp,dwd,lotus-outreach}` — J02's `parentId` now allows these |

Structured records, ours vs theirs: people 7 / 24 leaders, partners 5 / **26**, posts 26 / **6**
news + **3** stories. The 34 / 36 / 12 figures first recorded here were wrong; J18 measured the
four data files directly and both routes map their arrays with no slicing, so those are the
client's whole lists. `.work/AUDIT.md` carries the same error where it repeats them.

**Design is not the gap.** `src/styles.css` was already a superset of theirs, and J06 matched the
Khmer font stacks. What is missing is copy, records and imagery.

### Two standing constraints

- **Imagery lives only on the client's deployment.** `feedback/` ships 59 `.asset.json` stubs and
  zero binaries; the `url` is a relative `/__l5e/...` path. Resolved: the client's site is
  `https://kapecambodia.lovable.app`, and all 59 assets were verified fetchable from it on
  2026-08-04, each returning 200 with a byte count matching its recorded `size` (32 JPEG, 25 PNG,
  1 WebP, 1 PDF). That deployment is the only place the client's real photographs exist, so J19
  should run early - if it goes down they are gone.
- **Khmer must be machine-translated**, per the user's decision, and marked. Their content is
  English-only. Every generated string goes in `.work/km-review.md` for a native speaker to sweep
  before launch. Nothing generated may ship unreviewed as final copy.

## Open content gap, not a job

`current-projects` and `past-projects` both 301 to `projects`, and **no page exists at slug
`projects`**, so both legacy URLs land on the not-found body. Every other collection prefix
(`news`, `stories`, `videos`, `galleries`, `team`, `publications`, `careers`) has a landing page;
this one was never authored. Pre-existing, not caused by J02, and it is one `pages` row — author
it in admin or add it to `src/server/seed.ts`. J03's `projectList` section (D14) is what would
fill it.

## Database facts, learned the hard way

- `kape.db` is **WAL-mode**. Copy it with `VACUUM INTO`, never `cp` — a bare copy silently drops
  everything still in the 4MB `-wal` file and then fails with misleading FK errors.
- **`md5sum kape.db` proves nothing.** J03 inserted a page and mutated three rows while leaving the
  main file byte-identical; the writes were all in the WAL. To prove a database was not touched,
  query it through a connection, which reads through the WAL. Do not hash it.
- `db:migrate`, `db:push` and `db:studio` work as of `0784475`. They did not before.
- **A dev server on `kape.db` migrates it, and no worker can prevent that.** `src/server/db.ts`
  runs `migrate()` on boot and vite restarts the SSR module on any file change, so the mere
  existence of a new `drizzle/*.sql` is enough. J09 generated a migration and `kape.db` applied it
  within the same second, with three dev servers up. So: **any worker running a dev server must
  export `DATABASE_PATH` to a scratch copy**, never the repo default, and the orchestrator stops
  stray servers before a schema job starts. "Never migrate a database you did not create" is not
  something a worker can honour on its own.
- Workers cannot write to the database - the permission classifier denies it. Acceptance that needs
  fixture data must either use what is already seeded or stop and ask, as J03 and J04 both did.

## Rules

- One job per pane. Never two panes in the same file.
- A job that needs a file it does not own stops and reports; it does not reach across.
- Verification runs in the orchestrator pane, not the worker's. A worker's "done" is a claim.
- `feedback/` is read-only reference. Never edit it, never import from it, never ship it.
- Workers do not commit and do not touch git. The orchestrator reviews the working tree and
  commits. A worker that commits has made its own work unreviewable.
- **Workers never touch the worklog.** The shared Obsidian worklog records verified state, and a
  worker only ever has a claim. Write findings into the job's own report and let the orchestrator
  promote them after verifying. Concurrent panes editing one file also lose each other's edits.
- Workers do not run `biome --write` outside the files they own, and never with the linter on.

## Transferred content must be CMS-managed

The product's whole premise is that non-technical admins compose the site themselves. Content that
renders but cannot be edited in `/admin` has not been transferred - it has been hardcoded somewhere
new. The seed is a **delivery mechanism**, not a place content lives; what it writes must be
ordinary CMS rows the page builder can edit.

The specific trap, verified in `SectionsBuilder.tsx`: `setProp` spreads existing props
(`{...props, [key]: v}`), so an unknown prop **survives** a save - but the editor only renders a
control for keys declared as fields in `SECTION_DEFS` (`props[f.key]`, line 711). So a seeded prop
with no field def is invisible to the admin and permanently uneditable, while looking perfect on
the public page. Nothing errors. Nobody finds out until an editor tries to change it.

So every content job owes the inverse of what J01 and J03 proved. They showed every field is read
by a renderer; content jobs must show **every prop they seed is declared as a field**, and that a
real edit in `/admin` round-trips to the public page.
