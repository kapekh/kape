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

Formatting is clean, so a formatting regression is now a real signal. Lint is still red, so
"check passes" is not yet a gate. Every job gates on **tests still pass** and **no new Biome
errors in the files you own**.

## Jobs

| id | title | deltas | owns | state | pairs with |
|---|---|---|---|---|---|
| J00 | Biome scope fix + format | — | `biome.json`, repo-wide | **done** `87f6f0c` `6f4b6b2` | — |
| J01 | Section catalogue expansion | D02 D03 D06 D07 D13 D14 D15 D16 | `src/lib/sections.ts` | ready | J02 J06 |
| J02 | Restore the nested IA | D08 D12 | `src/lib/collections.ts`, `src/server/repo/route.ts`, `src/server/schema.ts`, `drizzle/` | ready | J01 J06 |
| J06 | Chrome and Khmer identity | D22 D23 D24 D25 | `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/styles.css`, `src/components/KhmerCalendar.tsx` | ready | J01 J02 |
| J03 | Renderer visual fidelity | D01 D04 D06 D17 | `src/components/sections/SectionRenderer.tsx` | after J01 | J04 J05 |
| J04 | Lightbox, share, related | D05 D10 D11 | `src/routes/$.tsx`, `src/components/Lightbox.tsx`, `src/components/ShareButtons.tsx` | ready | J03 J05 |
| J05 | Announcement modal | D09 | `src/components/AnnouncementPopup.tsx`, `src/server/repo/site.ts` | ready | J03 J04 |
| J07 | Form builder field types | D21 | `src/lib/forms.ts`, `src/components/FormRenderer.tsx`, `src/components/admin/FormBuilder*` | ready | most |
| J08 | Rich text tables | D18 | `src/lib/richtext/extensions.ts`, editor toolbar | ready | most |
| J09 | Project metadata | D19 | `src/server/schema.ts`, `src/components/ProjectView.tsx`, `drizzle/` | after J02 | J03 J04 |
| J10 | Map pin richness | D20 | `src/components/MapView.tsx`, `src/server/schema.ts`, `drizzle/` | after J02 J09 | J03 J04 |
| J11 | Site search | D26 | `src/routes/search.tsx`, `src/server/repo/search.ts` | ready | most |
| J12 | Lint pass | — | repo-wide | after the visual jobs | nothing |

`src/server/schema.ts` and `drizzle/` are contended by J02, J09, J10. Those three are strictly
sequential — one migration at a time or the snapshots collide.

`src/components/Header.tsx` is contended by J06 and J11. J06 owns it; J11 waits.

## Rules

- One job per pane. Never two panes in the same file.
- A job that needs a file it does not own stops and reports; it does not reach across.
- Verification runs in the orchestrator pane, not the worker's. A worker's "done" is a claim.
- `feedback/` is read-only reference. Never edit it, never import from it, never ship it.
