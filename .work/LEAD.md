# Lead state

Rewritten in place at every job seam. Never appended. See `~/.claude/skills/paneout/SKILL.md`.

## Goal

Extract an installable CMS core from KAPE's site. `main` stays KAPE's site, frozen at `b21751a`.
`cms-core` is the product.

Gate: `bun run db:seed` gives a blank unbranded CMS, `bun run seed:kape` restores KAPE across 89
routes with no title and no visible-body difference beyond deliberate de-brandings, and a re-skin
needs no component edit. Domain features are modules an install enables.

**The gate is met.** Everything below is defect work and product hygiene, not new capability.

## Ledger

`verdict` is what the lead confirmed in its own pane. A worker's claim is not a verdict.

| id | runner | state | verdict |
|---|---|---|---|
| C1 fresh-install | pane | verified | blank install boots unbranded. `.work/c1-report.md` |
| C2 debrand | pane | verified | 89 routes, no title or visible-body diff beyond deliberate de-brandings. `.work/c2-report.md` |
| C3 theme-as-data | pane | verified, defects handed to C7/C8 | critic r2: `.work/c3-critic-r2.md` |
| C4 optional-modules | pane | verified | committed `2f392fe` |
| C5 install-safety | pane | verified | one-transaction installer. `.work/c5-report.md` |
| C6 neutral-identity | pane | verified | `.work/c6-report.md`, evidence in `.work/c6-evidence/` |
| C7 validator + settings load | pane | **verified, committed `58a0fe7`** | won the bake-off, scorecard below. Gates re-run here at commit time: 239 tests / 21 files, `tsc` silent, format clean over 246 files |
| C7-critic | subagent | verified | 9 defects, `.work/c7-critic-r1.md`. Every finding re-run here; all confirmed. 2 fixed in C7, the rest are C8 |
| C8 settings-page-truth | pane | **verified, committed `029bc26`** | all seven clauses re-run here. 256 tests / 22 files, `tsc` silent, format clean over 247. KAPE byte-identical over its real fixture. Mutation-tested here, not taken on trust |
| J22 mega-menu-design | pane | **verified no-op, spent** | contract was stale. Re-checked here in the source and the pixels: none of M1-M5 exist any more. Zero source lines changed. `.work/j22-report.md` |
| J23 upload-crud-check | pane | **verified, committed `29a23ab`** | its one fix is four lines in a file it owned. Gates re-run here: 256 tests / 22 files, `tsc` silent, format clean. Repo `kape.db` untouched, checked through a connection. Its standing finding confirmed here in the code |
| C9 debrand-leftovers | pane | **verified, committed `4773690`** | package renamed `koompi-cms`, `docs/` generalised, two client-specific files deleted (both survive on `main`, checked). Language work landed its build-time half and priced the rest |
| C10 media-usage + trpc-tests | pane | **verified, committed `145d962`** | both contract-named mutations re-run here, each kills its own named test. Refusal confirmed in `.work/c10-shots/05` |
| J12 lint-pass | - | queued, runs alone | - |

## Live now

Nothing. `j12` and `k1` are closed, their output committed or on disk. Tree clean at `421e151` bar
`.env.example` and the unattributed script, both still needing Rithy's call.

**J12 and K1 both landed here, not in their own panes.** J12 was at 164% context and could not
verify itself; its 62-file lint pass was re-gated in this pane and committed as `70499a0`. K1's
`projects.json` and report were already tracked, so closing its pane lost nothing.

**A fourth occurrence of unsubmitted text in a pane input.** K1's held "now do the same for the
other 16 placeholder projects", matching its own suggested next step. Not typed by this lead, not
confirmed by Rithy at the time. Left unsent and the pane closed. The work is now in scope by Rithy's
own answer, and it goes to a fresh pane under `SEED-COPY`, not by pressing enter on found text.

## Queued, two rounds of two

Baseline for all four, measured here at `421e151`: 142 errors, 30 warnings, `tsc` silent, 269 tests
over 24 files, format clean over 247.

- Round 1: **A11Y** (`.work/jobs/A11Y-label-and-svg-pass.md`) owns every `.tsx` under
  `src/components/` and `src/routes/`. **SEED-COPY** (`.work/jobs/SEED-COPY-project-bodies.md`) owns
  `src/server/seed/projects.ts` and `.work/kape-copy/`. Disjoint.
- Round 2: **J07** (`.work/jobs/J07-form-fields.md`, its "3 of 3 tests" line is stale, read 269)
  owns the form files. **NOANY** (`.work/jobs/NOANY-type-the-thirty.md`) owns the other 28 `any`
  sites. Round 2 follows round 1 because A11Y and NOANY both touch the same `.tsx` files.

## How C9 and C10 were verified

Gates re-run here for both together: 266 tests / 24 files (from 256/22), `tsc` silent, format clean
over 250, `bun.lock` untouched so neither added a dependency, and `bun run check` still 219 errors,
so ~350 new lines introduced no lint regression.

**C10's two contract-named mutations, re-run here.** Replacing `checkSettingValue` with `null` in
`adminSettings.set` fails "refuses a theme value CSS cannot parse, and stores nothing". Dropping the
`mediaTextUsage` call from `adminMediaUsage` fails "reports an image embedded in a page section and
in a post body". Each kills one test and leaves the other six green. **The gap C8 left is closed.**

Refusal confirmed in `.work/c10-shots/05`: "Used in 1 place, Page content, c10-page-section" with a
link to it, and "Could not delete: this file is still in the content of 1 place. Remove the image
there first."

**C9's live defect is real and I confirmed the cause.** `install.ts:273` inserts exactly one
`languages` row, so a blank install has only `en` enabled while `LANGS` is `["en","km"]`. The sitemap
expanded every path over `LANGS`, advertising a `/km/` URL for every page of a site with no Khmer.
KAPE is unaffected: its table holds `en` and `km` in the same order as `LANGS`, so its sitemap is
byte-identical.

**Both deleted docs survive on `main` at `b21751a`**, checked with `git ls-tree` before accepting the
deletion. Nothing was lost.

## Two things the workers did right, worth keeping

- **C9 refused to make its own acceptance pass.** It was asked to demonstrate a third language and
  declined to add `fr` to `LANGS` for the demo, because that would have hidden the exact edge it was
  reporting. It showed `/fr` 301ing to `/en/fr` and dying instead.
- **C9 declared its own scope violation.** It edited four lines of `README.md`, which it did not own,
  because deleting two docs broke that file's links. Accepted: leaving the README pointing at deleted
  files would have been the worse outcome, and it flagged the trade rather than hiding it.

**Unsubmitted text was again sitting in both panes' inputs** ("fix the confirm dialog copy in
admin.media.tsx", "keep the README paragraph, drop the kapecambodia-main lines"), each matching that
agent's own suggested next step. Not typed by this lead and not confirmed by Rithy, so left unsent.
Third occurrence; recorded rather than acted on.

## J23's finding, confirmed here in the code

**Deleting a media item that a rich text body or a page section embeds is silent data loss.**
`adminMediaUsage` (`server/repo/admin.ts:1204`) iterates `MEDIA_REFS` and nothing else, and
`MEDIA_REFS` is a list of foreign-key columns: post cover, post gallery, page hero and the rest.
An image referenced only as a URL inside `pages.sections` JSON or a rich text body is invisible to
it. So the confirm dialog reports no usage, `deleteMedia` clears the refs, drops the row and
unlinks the file, and the live page keeps a URL that now 404s.

Confirmed by reading the query rather than by trusting the screenshots, and J23's own control
proves the boundary: the same image as a post cover produced the full "still used in 1 place"
warning from the same dialog.

**The fix belongs in `adminMediaUsage`, which J23 did not own.** It needs to scan rich text and
section JSON for the URL, not only follow foreign keys.

**J23 retracted its own second finding** after failing to reproduce it three ways, and traced its
error to a fix that landed in `e54d5b6` on 2026-08-06. A worker correcting itself before the lead
does is the loop working.

**Unsubmitted text was sitting in J23's pane input: "hand the rich-text usage scan to C8".** Not
typed by this lead and not confirmed by Rithy, so it was left unsent and is recorded here rather
than acted on. C8's pane is finished in any case.

## How C8 was verified

Re-run here, not read. The gates matched its claim exactly: 256 tests / 22 files, `tsc` silent,
format clean over 247, and `package.json` and `bun.lock` untouched, so the route test really did add
no dependency.

**The stop condition, properly.** `kape.db` has 21 `site_settings` rows and **none of them start with
`theme_`**, so comparing theme output against the database compares defaults and proves nothing. The
real fixture is `src/server/seed/site.ts:72-82`. Against that, `themeCss`, `themeColor` and
`themeContrast` are byte-identical to `58a0fe7`, `themeColor` is `#002c5e`, `themeContrast` gives 14
rows, and 0 KAPE values are rejected. A future round must use the seed, not the database.

**Two conversions checked by hand rather than against the same code that produced them.**
`hwb(200 20% 30%)` to `#3388b3` and `hsl(207deg 59% 30%)` to `#1f517a` are both exactly right.

**Three mutations run here:**

- Making the `refresh` catch swallow silently fails 4 of the 7 route tests by name and leaves the
  other 3 passing. A real gate, not a file that merely loads.
- Removing `transparent`'s `invisible` classification fails exactly one named test. Rithy's decision
  is gated.
- **Gutting the server-side check leaves 256/256 green.** C8 declared this itself and it is true.
  The trust boundary is enforced in the code and demonstrated over curl, but nothing stops the next
  agent deleting it. Fixing it needs an in-process tRPC caller in a test file C8 did not own.

Browser evidence confirmed in `.work/c8-shots/`: `10-transparent-a-panel.png` shows the panel naming
`transparent` and saying it paints nothing, and `23-401-t20s.png` shows "Your session has ended" with
a Sign in again over an intact form holding its values.

## J22's verdict: the contract was stale, not the header

J22 changed no source. Re-verified here rather than taken on trust, because a worker reporting "your
job was already done" is exactly the claim that most needs checking:

- `bentoSpan`, `grid-flow-row-dense` and the grid/scroll toggle are absent from `Header.tsx`.
- `Header.tsx:519-522` bounds the panel with `overflow-y-auto` and
  `maxHeight: calc(100dvh - panelTop - 1rem)` rather than pinning it to `100dvh`, which was M4.
- `Header.tsx:525-585` renders text columns. There are no photo tiles to put a scrim on, so M1's
  legibility-varies-with-imagery defect cannot occur. `.work/j22-shots/whatwedo.jpg` shows the panel
  ending around y=597, well inside the viewport.

The bento panel was designed out during the C3/C6 theme work, before the job was dispatched. **The
lesson is the job file's date.** J22 was written 2026-08-06 against a tree that six commits later
was not the same component. Re-read a queued contract against current source before dispatching it.

**J22's one live finding, confirmed here by query:** `pages` has 39 rows and 0 carry a
`hero_media_id`. Not a regression - it matches the known dead-data note that the home hero comes
from page section props, and J19 was dropped precisely so placeholders stay until an editor uploads.
Recorded, not a job.

## What C8 was given, and why

The C7 critic's nine findings, minus the two C7 fixed. Every one is the page stating something false:
a colour that paints nothing described as "used on the page", a 401 shown as `UNAUTHORIZED` with a
Try again that can never succeed, a colour the field just rejected written to the database anyway.

Two things C8 carries that were nobody's job before:

- **`adminSettings.set` has no server-side validation.** `router.ts:919-922` upserts any string.
  The theme validator exists only in the browser, so anything with a session can blank the site over
  the API. That is the trust boundary and it is where the check belongs. This is the root of the old
  1.6, not the field message.
- **No test imports any route file.** The `catch` and `finally` mutations in the settings page are
  unkillable, so C7's claim 2 rested entirely on screenshots. Real evidence, not a regression gate.
  C8 lands the first route-mounting test, and stops to ask if it needs a new dependency.

## Decided

- **The product is called `koompi-cms`.** Rithy, 2026-08-07. C9 renames `package.json` to it. No
  display name was chosen alongside it, so nothing should invent one.
- **`transparent` and `currentColor` stay accepted, and the page must warn they paint nothing.**
  Rithy, 2026-08-07. This resolves the C7 contract contradicting itself: acceptance 1 listed
  `transparent` as must-reject while the same contract's fix instruction said to allow it. The fix
  instruction wins; acceptance 1's clause is what was wrong. C8 implements the warning.
- Contrast flip accepted by Rithy: KAPE's Donate button is near-black on terracotta in light mode,
  2.98:1 to 6.22:1. C3 acceptance 8 is waived.
- `staff`, `events`, `documents` stay core rather than gated. C4 section 7 costs the alternative.
- Modules own their URL prefix: `/donate` + `payments`, `site.offices` / `site.partners`,
  `internalsources`. All still ungated.
- Workers do not commit and do not touch the worklog. Every significant defect on this project came
  from a critic, none from a builder's self-check.
- `.env.example` stays uncommitted: the global hook refuses `git add` on anything matching `.env`.
  It documents `TRUSTED_PROXY_HEADER`, `cms.db`, `ALLOWED_HOSTS`, all named in the README.
- `vite.config.ts` scoped to `test.include: ["src/**/*.test.{ts,tsx}"]`, lead change, committed with
  C7. Vitest had no `test` block, so the default glob collected the `.test.ts` copies parked under
  `.work/` and reported six phantom failures.
- **One lead owns `.work/` at a time.** Two orchestrators ran the C7 contract concurrently and the
  loser found its three owned files rewritten under it mid-job. Check `Live now` is empty before
  dispatching.
- **A backgrounded dev server needs a bounded log.** `.work/scratch/dev-audit.log` reached **31.7
  GiB** on 2026-08-06: an edit left `MegaBentoGrid` referenced but deleted in `Header.tsx`, vite hot
  reloaded into it, and the root route threw `MegaBentoGrid is not defined` about 11 million times
  between 16:21 and 19:10 before vite was SIGKILLed. Devtools printed each frame twice, raw and
  source-mapped, which doubled it. Deleted 2026-08-07 with Rithy's agreement, along with the now
  superseded `.work/c7-deliverable/`; `.work` went from 32G to 133M. Pipe a dev server through
  `tail -c` or a rotating log, and never leave one running unattended against a module that will not
  compile. The same edit is what made J22's contract stale, so both defects trace to one afternoon.

## Open, owned by nobody yet

- **The media confirm dialog still says "Delete anyway?"**, which is now wrong for a content embed
  the delete will refuse. Copy lives in `admin.media.tsx`, which C10 did not own. Small, and the
  last rough edge on that fix.
- **The router half of data-driven languages**, priced at two to three days in `.work/c9-report.md`.
  Not a restructure: every route already takes a `$lang` param, so what blocks it is language
  resolution in three pieces.
- `scripts/` is not covered by `no-brand.test.ts`: 8 fixture files, 145 hits. Four dead
  `kapecambodia-main` references. The README's opening paragraph still names the client, which is
  Rithy's call rather than a defect.
- **The grid's row Save has no error path.** `save(key, value)` in `admin.settings.tsx` awaits the
  mutation with nothing around it; C8 measured an unhandled rejection and nothing on screen. Same
  defect it just fixed one section higher up the same page.
- **`admin.modules.tsx:47` and `:114` still print `UNAUTHORIZED` with a dead Try again.** C8 was
  told not to touch it and did not. The settings page now has the better shape to copy.
- `scripts/import-client-assets.ts` is untracked, 313 lines, and imports the prototype's 59 asset
  stubs. That is J19, which the client dropped with "do not resurrect it". It is uncommitted work so
  it has not been deleted. **Rithy: attribute it or say delete.**
- The dark-mode guard test passes five broken stylesheets, including a light literal in a component
  rule, which is where the original bug lived.
- An invalid-but-safe CSS value swallows its whole rule and the next one. Escaping is not validation.
- `rgb(from #1f4e79 r g b)` is still rejected. `hsl(207deg 59% 30%)` now works.
- No page exists at slug `projects`, while `current-projects` and `past-projects` both 301 to it, so
  both legacy URLs land on the not-found body. One `pages` row. Pre-existing.
- `.work/km-review.md`: 208 machine-translated rows, 112 with no Khmer at all. Needs a native
  speaker, not an agent.
- A `directory` section bound to `staff` still saves with every module off. Decided by C4 and proved
  live, not an oversight.

## The C7 bake-off, for the record

Two agents ran the same contract concurrently. C7's version won on every acceptance clause and is
what shipped in `58a0fe7`. Widest margins: nested junk 6/6 against 0/6, and `colourToHex` agreement
5 unconvertible against 156. The displaced version and both its earlier states are at
`.work/c7-deliverable/rival/` with diffs, if the swap ever has to come back out. C7's own patch and
files are at `.work/c7-deliverable/`, md5-verified against the source, and `c7.patch` applies cleanly
to `ac927de`.

Left in `/tmp`: an 11G isolated build tree, reproducible from the patch. Safe to delete.
`git worktree prune` is still needed before `main` can be checked out here.

## What finishing KAPE actually needs, measured 2026-08-09

**Audit the seed, never the repo's `kape.db`.** That file is stale by a wide margin: it has 39 pages
to the seed's 40, no `accreditations` and no `ten-subsectors`, a leftover `j03-preview`, and zero
sections on the four Who We Are pages the seed fills with 2,200 to 7,800 characters each. An audit
against it reports a content crisis that does not exist. Seed a scratch copy and query that.

Against a fresh `db:seed` + `seed:kape`:

- **Pages are in good shape.** `fact-sheet` 7801, `director-speech` 7364, `about` 5699, `home` 3288,
  `accreditations` 2256, `vision-mission` 2244, `ten-subsectors` 1864. The eight zero-section pages
  are hubs, and `$.tsx:245` renders a childless hub as an index of its children.
- **Projects are the gap: 24 of 26 bodies are the 152-character `TAIL` placeholder**, and only DEP
  and IEP carry real copy. The worklog was right about this and the stale database hid it.
- **8 of those 24 are recoverable now.** The client's prototype has full structured copy - objective,
  activities, results, target groups, outcomes - for the DEP and IEP children, and the seed lifted
  only their summary. K1 owns that.
- **The other 16 have no source anywhere.** Their prototype route serves the same `TAIL` sentence, so
  nobody has ever written them. That needs KAPE, not an agent.
- **Khmer is ~80 short strings from complete**: 49 `nav_item.description`, 30 `page.title`, 1
  excerpt. Every body field is fully translated and `ui_strings` is 91/91 both languages. Do not
  spend the Khmer budget on project bodies while they are still placeholder.

The prototype is a client-rendered SPA; page HTML is a shell and the copy lives in a per-route JS
chunk listed in `assets/index-Cc67oJRE.js`. Fetch the chunk to find the strings, render the page to
learn their order.

## Next action

When J12 lands, apply K1's `.work/kape-copy/projects.json` to `src/server/seed/projects.ts`. That is
a source edit and must not overlap the lint pass.

The confirm-dialog copy and the router half of the language work are still open. Re-read any queued
contract against current source before it goes out - J22 is what happens when nobody does.
