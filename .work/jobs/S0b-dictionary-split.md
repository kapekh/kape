# S0b - land the keys with their slice, not ahead of it

S0's interpolation work is right and stays. Its dictionary work has to be restructured.

## What went wrong

`src/lib/no-brand.test.ts` has a guard: **no seeded UI string the product does not render.** S0 added
212 keys that no component reads yet, so 204 of them are dead by construction and the guard fires.
Verified in the lead pane:

```
FAIL src/lib/no-brand.test.ts > seeds no UI string the product does not render
AssertionError: expected [ 'nav.backHome', …(203) ] to deeply equal []
```

The guard is correct and stays. A key has to arrive in the same change as the component that
renders it. That means the dictionary is written by eight different slice jobs, and one file they
all edit is a file they will collide in.

## Files you own

- `src/lib/ui-strings.default.ts`
- `src/lib/ui-strings/` - the new directory and everything in it
- `src/lib/i18n.tsx` and `src/lib/i18n.test.ts` - yours already, and **leave the interpolation work
  exactly as it is**. It is correct.

Do not touch any component, any route, or `src/lib/permissions.ts` / `src/lib/modules.ts` - the lead
has just edited those two.

## Do

1. **Take the 212 keys back out of `defaultUiStrings`.** After this step
   `Object.keys(defaultUiStrings).length` is 41 again and `bun run test` is green.
2. **Split the dictionary by area**, one module per slice in `.work/i18n/INVENTORY.md`'s Slice
   order table, under `src/lib/ui-strings/`:
   `common.ts`, `nav.ts`, `forms.ts`, `pages.ts`, `sections.ts`, `site.ts`, `donate.ts`,
   `internal.ts`. Each exports one `Record<string, { en: string; km?: string }>`.
   - Move the existing 41 keys into whichever module their area belongs to. Do not reword, rename
     or drop one.
   - `src/lib/ui-strings.default.ts` keeps its name, its doc comment and its `defaultUiStrings`
     export, and becomes the index that merges the modules. **Every existing importer keeps
     working untouched** - `src/server/install.ts`, `src/server/seed/base.ts`,
     `src/lib/no-brand.test.ts` and the rest. Check them; do not assume.
   - Merging must fail loudly on a duplicate key across two modules, not silently let one win.
     A key defined twice is how a component ends up rendering the wrong words. Write the check as
     a test, not a comment.
3. **Leave the eight modules holding only the keys that are rendered today.** Seven of them will be
   nearly empty. That is the point: each slice job then owns exactly one module plus its own
   components, adds its keys and its wiring in one change, and the guard stays green the whole way.
4. **Keep `.work/i18n/keys.proposed.ts` untouched.** It is the staging source the slices draw from.

## Acceptance

Paste real output for each.

1. `bun -e "import {defaultUiStrings} from './src/lib/ui-strings.default.ts'; console.log(Object.keys(defaultUiStrings).length)"` prints `41`.
2. `bunx tsc --noEmit` - silent.
3. `bun run test` - **green, no failures**, at least 313 passing plus the i18n tests S0 added.
   `no-brand.test.ts` must pass. Paste the summary line.
4. The duplicate-key guard is a real test: add a duplicate across two modules, show the named test
   failing, take it out, show it passing. Paste both runs.
5. `bun run lint` - 8 errors, 0 warnings or fewer.
6. List every file that imports `ui-strings.default` and state, for each, that it is unchanged.

## Out of scope

- Wiring any component. The slices do that.
- Adding any of the 212 keys. The slices do that, each with its own wiring.
- Khmer.

## Stop conditions

- An importer of `defaultUiStrings` needs editing to keep working: stop and report. That means the
  index is not a drop-in and the split needs rethinking before it lands.
- `bun run test` is not fully green at the end: stop and report rather than adjusting a test to fit.
- Never run `git` commands that write.
