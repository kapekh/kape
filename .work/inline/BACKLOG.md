# Inline editing round, partition

Frozen the moment the first job goes out. What actually happened lives in `LEAD.md`; when the two disagree, LEAD.md wins and this file is history.

## Baseline

Run in the lead's pane on 13 Aug at `55e9ace`, real output, not remembered:

- `bun run test` (vitest): **449 passed / 50 files**, 7.73s. `bun test` is the wrong runner here, it skips jsdom and reports false failures.
- `bunx tsc --noEmit`: silent, exit 0.
- `bun run lint`: **6 errors**, 307 files checked. Already red, and red for a known reason: all six are `noArrayIndexKey`, carried since the redesign round.

Lint gates on **delta**, not on zero. Six in, six or fewer out. A gate nobody can pass is not a gate.

## Jobs

| id | title | deltas | owns | state | pairs with |
|---|---|---|---|---|---|
| J03 | Narrow `updateField` procedure | D1, D2, D3 | `src/integrations/trpc/router.ts`, `src/server/repo/admin.ts`, `src/server/repo/admin-updatefield.test.ts` (new) | ready | - |
| J04 | Addressing: identity into `SectionRenderer`, markers in 21 templates | D4, D5, D6 | `src/components/sections/SectionRenderer.tsx`, `src/components/SubPage.tsx`, `src/routes/$.tsx` | ready | - |
| J06 | Inline editor for section text fields | - | not partitioned yet | after J03, J04 | J07 |
| J07 | Inline editor for page and post fields | - | not partitioned yet | after J03, J04 | J06 |
| J08 | Prerender invalidation | D7 | `scripts/prerender-static.ts` | after J03 | - |

## Contended files

**None between J03 and J04.** J03 is server-side write path, J04 is one client component tree plus the two routes that feed it. Checked file by file: the two `owns` lists do not intersect.

`src/server/repo/admin.ts` is the only file two future jobs both want (J03 now, J07 later), so J07 is strictly after J03 for that reason on top of its stated dependency.

No schema change and no migration in this round. Nothing here touches `drizzle/`, which is what makes two concurrent panes safe at all.

## Ready set

Blockers clear on `verified` in LEAD.md's ledger, never on `returned`.

At the start of the round the ready set is **{J03, J04}**.
J03 goes first: it unblocks J06, J07 and J08, where J04 unblocks J06 and J07. Three beats two at comparable effort.
