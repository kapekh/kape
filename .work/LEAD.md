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
| C8 settings-page-truth | pane | **live** | - |
| J22 mega-menu-design | pane | **verified no-op, spent** | contract was stale. Re-checked here in the source and the pixels: none of M1-M5 exist any more. Zero source lines changed. `.work/j22-report.md` |
| J23 upload-crud-check | pane | **live** | - |
| C9 debrand-leftovers | - | ready, queued | - |
| J12 lint-pass | - | queued, runs alone | - |

## Live now

Two panes.

- **C8**, `.work/jobs/C8-settings-page-truth.md`. Owns `src/routes/admin.settings.tsx`,
  `src/lib/site-theme.ts`, `src/lib/site-theme.test.ts`, the `adminSettings.set` procedure only in
  `src/integrations/trpc/router.ts`, and `src/routes/-admin.settings.test.tsx`.
- **J23**, `.work/jobs/J23-upload-crud-check.md`. Owns `src/routes/admin.media.tsx`,
  `src/routes/api.media.$.tsx`, `src/server/storage.ts`, `src/components/admin/Media*.tsx`.
  Told explicitly that `router.ts` is C8's, so a media defect in a tRPC procedure is a finding for
  its report rather than a fix.

File lists are disjoint. Neither may reseed `kape.db`; both work against a `VACUUM INTO` copy.

**While C8 is live, `bun run test` is not a gate for anyone else.** J22 saw
`site-theme.test.ts > colourToHex > ignores a percentage alpha` go red at 21:12 when C8's edits
landed mid-run. The clean tree was 239/239 at 20:58. Correct call by J22 to leave it alone.

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

## Open, owned by nobody yet

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

## Next action

Read C8's pane and re-run its checks here. Commit C8 and J23 separately, then dispatch C9. J12 runs
alone, last, after everything else is committed. Before dispatching C9, re-read its contract against
current source - J22 is what happens when nobody does.
