# J12 — Lint pass

State: **queued.** Runs after the visual jobs land. Repo-wide, so it conflicts with everything —
it runs alone.

## Scope

216 errors and 67 warnings survive J00's formatting pass. Unlike the formatting, these are not
mechanical. Work by rule category, not by file, and stop at each category boundary.

## Do

1. Group the findings by rule and report the counts before changing anything. That table is the
   plan; the ordering below is a guess until it exists.
2. `noExplicitAny` first. `SectionRenderer.tsx` uses `const people: any[]` and similar throughout
   — the section props are genuinely dynamic, so the fix is a discriminated prop type, not a
   cosmetic cast. This is the only category likely to surface real defects.
3. Then accessibility rules, if any. Fix them properly rather than suppressing.
4. Then the remainder, cheapest first.

## Acceptance

1. `bun run test` passes, 3 of 3, after every category — not only at the end.
2. `bun run check` error count reaches zero, or you list each remaining finding with the reason it
   cannot be fixed without a behaviour change.
3. No rule is disabled or downgraded in `biome.json` to make a number drop. If a rule is genuinely
   wrong for this project, that is a proposal with a rationale, not a silent edit.
4. No `biome-ignore` comment without a one-line reason on the same line.
5. Each rule category is its own commit, so a regression can be bisected to a category.
6. Typing changes are behaviour-preserving. Where a type change forces a real code change, call it
   out separately — that is a bug found, and it deserves its own commit and its own test.

## Out of scope

Reformatting. Refactoring for taste. Any behaviour change not forced by a lint fix.

## Stop conditions

- A lint fix requires a behaviour change: stop, report it as a defect, do not fold it in quietly.
- Any job is still in flight: do not start.
