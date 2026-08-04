# J00 — Biome scope fix and format

State: **done**, 2026-08-04. Commits `87f6f0c`, `6f4b6b2`.

## What was wrong

`main` did not pass its own checker: `bun run check` reported 856 problems. Two separate issues
hid inside that number.

**The scope was wrong.** `biome.json`'s `includes` used `**/src/**/*`, which also matched
`feedback/src` — the client's untracked Lovable prototype. 402 of 403 checked files were ours plus
theirs. Roughly 290 of the 856 problems were in code we do not own and will never ship, and a
formatter run would have silently rewritten the client's reference material. Fixed by adding
`!**/feedback/**`. Scope: 402 files → 204.

**The tree was genuinely unformatted.** Our real baseline was 185 formatting diffs, 210 lint
errors, 60 warnings.

## What was done

`biome check --write --linter-enabled=false` — formatter and import-organize only, linter
explicitly off, so nothing in it changes behaviour. 190 files fixed. Tests 3/3 before and after.
No generated file was touched (`routeTree.gen.ts` and `styles.css` are excluded by config;
`drizzle/` is out of scope).

Landed as two commits, kept separate because they answer different questions: one fixes what gets
checked, one applies the result.

## What remains

216 lint errors and 67 warnings. These are **not** mechanical — they include the `any` usages in
`SectionRenderer.tsx` that the project's own rules forbid. Scheduled as **J12**, after the visual
jobs land, so it does not conflict with work in flight.

Formatting is now clean, which means a formatting regression in any job's diff is a real signal
rather than noise.
