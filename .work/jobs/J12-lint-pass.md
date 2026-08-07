# J12 - Lint pass

State: **queued.** Repo-wide, so it conflicts with every other job. It runs alone, after C8, C9, J22
and J23 have landed and been committed.

## Objective

`bun run check` is 219 errors and 67 warnings. Format is clean, which is what makes the error count
still worth something: a format regression would show up separately.

You are done when the count is zero or every survivor is listed with the reason it cannot be fixed
without a behaviour change.

Two of these categories are not cosmetic. `noExplicitAny` and `noDangerouslySetInnerHtml` are the
ones likely to surface a real defect, and a real defect found here is worth more than the number
dropping.

## Files you own

The whole tree, because the linter does. That is why nothing else may be in flight.

`.work/j12-report.md` is your report.

Confirm `git status` is clean of other agents' work before you start. If any source file is
modified, another job is still live and you stop.

## Baseline, measured 2026-08-07 at `58a0fe7`

The default diagnostic cap hides most of this. Use `bunx biome check --max-diagnostics=400`.

| rule | count |
|---|---|
| `correctness/useExhaustiveDependencies` | 35 |
| `suspicious/noArrayIndexKey` | 32 |
| `suspicious/noExplicitAny` | 30 |
| `style/noNonNullAssertion` | 19 |
| `security/noDangerouslySetInnerHtml` | 14 |
| `style/useImportType` | 6 |
| `complexity/useOptionalChain` | 5 |
| `suspicious/useIterableCallbackReturn` | 3 |
| `suspicious/noAssignInExpressions` | 3 |
| `correctness/useJsxKeyInIterable` | 2 |
| `suspicious/useBiomeIgnoreFolder` | 1 |
| `style/useExponentiationOperator` | 1 |

Re-measure before you start. If the table has moved, the tree moved under you and that is worth
knowing before you touch it.

## Do

Work by rule category, not by file, and stop at each category boundary to re-run the gates. Cheapest
and most mechanical first, so the risky categories get a clean tree to land on.

1. `useImportType`, `useOptionalChain`, `useExponentiationOperator`, `useBiomeIgnoreFolder`. Twelve
   findings, all mechanical.
2. `useJsxKeyInIterable` and `useIterableCallbackReturn`. Five findings, each a real if minor bug.
3. `noAssignInExpressions`, `noNonNullAssertion`. A `!` is a claim the value cannot be null. Where
   that claim is true, prove it with a narrowing the compiler can see. Where it is not, you have
   found a defect - report it separately, do not paper over it.
4. `noArrayIndexKey`. Where a list can reorder, an index key is a real React bug. Where it genuinely
   cannot, say so per site.
5. `useExhaustiveDependencies`. The largest category and the one most likely to change behaviour.
   Adding a missing dependency can turn a run-once effect into a loop. Every fix here gets exercised
   in a browser, not only type-checked.
6. `noExplicitAny`. `SectionRenderer.tsx` uses `const people: any[]` and similar throughout. Section
   props are genuinely dynamic, so the fix is a discriminated prop type, not a cast that satisfies
   the linter and tells the reader nothing.
7. `noDangerouslySetInnerHtml`. Fourteen sites. For each, establish where the HTML comes from. Rich
   text an admin authored through the editor is a different risk from anything that reached the
   database another way. Report the provenance of all fourteen. **Sanitising is a behaviour change**
   - if any site needs it, that is a finding and a proposal, not something you fold into a lint pass.

## Acceptance

1. The category table re-measured before and after, both pasted.
2. `bun run test` at or above 239 over 21 files after **every category**, not only at the end. Paste
   the count per category.
3. `bunx tsc --noEmit` silent after every category. It is silent now, so any type error is yours.
4. `bun run format` clean over 246 files.
5. `bun run check` at zero errors, or each survivor listed with a reason.
6. No rule disabled or downgraded in `biome.json` to make a number drop. If a rule is genuinely wrong
   for this project, that is a proposal with a rationale in your report, not a silent edit.
7. No `biome-ignore` without a one-line reason on the same line.
8. Every place a lint fix forced a real behaviour change, listed separately with what changed and how
   you exercised it. That list is the most valuable thing this job produces.
9. The two effect-heavy admin screens and the public home page, screenshotted after the
   `useExhaustiveDependencies` category, since that is where a fix would break something silently.

## Out of scope

- Reformatting, and refactoring for taste.
- Any behaviour change not forced by a lint fix.
- The 67 warnings, unless a category you are already in happens to clear them.

## Stop conditions

- A lint fix requires a behaviour change: stop, report it as a defect, do not fold it in quietly.
- Any other job is still in flight: do not start.
- Do not commit, do not touch git, do not edit the worklog. The lead commits per category so a
  regression can be bisected to one; leave the tree with the categories clearly separable and say in
  your report where the boundaries are.
- **Never run against the repo's `kape.db`.** `VACUUM INTO` a copy, `export DATABASE_PATH`.
