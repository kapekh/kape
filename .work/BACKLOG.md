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
| `bun run test` | 3 tests pass | 3 tests pass |
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
| J03 | Renderer visual fidelity | D01 D04 D06 D13 D14 D15 D16 D17 D27 | `src/components/sections/SectionRenderer.tsx`, `src/lib/sections.ts` | in progress | J04 J05 |
| J13 | Repo hygiene, from J02's findings | — | `package.json`, `src/integrations/tanstack-query/root-provider.tsx`, `src/server/seed.ts` | needs a decision | — |
| J04 | Lightbox, share, related | D05 D10 D11 | `src/routes/$.tsx`, `src/components/Lightbox.tsx`, `src/components/ShareButtons.tsx` | ready | J03 J05 |
| J05 | Announcement modal + month counter | D09 D25 | `src/components/AnnouncementPopup.tsx`, `src/server/repo/site.ts` | ready | J03 J04 |
| J07 | Form builder field types | D21 | `src/lib/forms.ts`, `src/components/FormRenderer.tsx`, `src/components/admin/FormBuilder*` | ready | most |
| J08 | Rich text tables | D18 | `src/lib/richtext/extensions.ts`, editor toolbar | ready | most |
| J09 | Project metadata | D19 | `src/server/schema.ts`, `src/components/ProjectView.tsx`, `drizzle/` | after J02 | J03 J04 |
| J10 | Map pin richness | D20 | `src/components/MapView.tsx`, `src/server/schema.ts`, `drizzle/` | after J02 J09 | J03 J04 |
| J11 | Site search | D26 | `src/routes/search.tsx`, `src/server/repo/search.ts` | ready | most |
| J12 | Lint pass | — | repo-wide | after the visual jobs | nothing |

`src/server/schema.ts` and `drizzle/` are contended by J02, J09, J10. Those three are strictly
sequential — one migration at a time or the snapshots collide.

`src/components/Header.tsx` is contended by J06 and J11. J06 is done, so J11 is unblocked.

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

## Open content gap, not a job

`current-projects` and `past-projects` both 301 to `projects`, and **no page exists at slug
`projects`**, so both legacy URLs land on the not-found body. Every other collection prefix
(`news`, `stories`, `videos`, `galleries`, `team`, `publications`, `careers`) has a landing page;
this one was never authored. Pre-existing, not caused by J02, and it is one `pages` row — author
it in admin or add it to `src/server/seed.ts`. J03's `projectList` section (D14) is what would
fill it.

## Rules

- One job per pane. Never two panes in the same file.
- A job that needs a file it does not own stops and reports; it does not reach across.
- Verification runs in the orchestrator pane, not the worker's. A worker's "done" is a claim.
- `feedback/` is read-only reference. Never edit it, never import from it, never ship it.
- Workers do not commit and do not touch git. The orchestrator reviews the working tree and
  commits. A worker that commits has made its own work unreviewable.
- Workers do not run `biome --write` outside the files they own, and never with the linter on.
