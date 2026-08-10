# S0 - foundation for the editable-text build

Every slice job after this one wires components to keys. None of them can start until the keys
exist and `t()` can interpolate. Keep this job small and land it fast.

Read `.work/i18n/INVENTORY.md` first - headline, Interpolation and Slice order. It is the map.
`.work/i18n/keys.proposed.ts` holds the 212 proposed keys in the exact shape of the dictionary.

## Files you own

- `src/lib/i18n.tsx`
- `src/lib/ui-strings.default.ts`
- `src/lib/i18n.test.ts` - new

Nothing else. Public components belong to the slice jobs, and `src/routes/admin.tsx`,
`src/integrations/trpc/router.ts` and `src/routes/admin.ui-strings.tsx` are live in another pane
right now.

## Do

1. **Interpolation in `t()`.** 32 of the 212 keys carry slots (`{n}`, `{site}`, `{goal}`). Today
   `t` is `(k, fb) => fb ?? k` on the null-context branch (`src/lib/i18n.tsx:59`) and a plain
   lookup otherwise. Give it a third parameter: named params substituted into `{name}` slots.
   - A missing param leaves the slot visible rather than printing `undefined`. A visible `{n}`
     is a bug someone reports; `undefined` is one they do not.
   - It must work identically on the null-context fallback branch, which returns the English
     fallback. That branch is what the root error screens hit.
   - No new dependency. This is a `replace` with a function, not a library.
   - Keep the existing two-argument calls working unchanged. There are six files calling `t()`
     today; none of them may need editing.
2. **Add the 212 keys** from `.work/i18n/keys.proposed.ts` into `src/lib/ui-strings.default.ts`,
   in the file's existing style: grouped by area with the same comment convention already there,
   keys sorted within a group.
   - English only. Do not invent Khmer. A key with no `km` falls back to `en`, which is correct
     and honest; a machine-translated Khmer string is neither, and a Khmer speaker signs the
     vocabulary off separately.
   - The three product-neutrality flags in the inventory (`donate.success.line`,
     `donate.honoree.placeholder`, `donate.secured`) ship **generic** defaults, not KAPE's copy.
     `donate.secured` keeps its `{provider}` slot.
   - Do not renumber, rename or reword the 41 keys already there.
3. **Prove the count.** `Object.keys(defaultUiStrings).length` must be 253: 41 existing + 212 new.
   If it is not, find out why before doing anything else - a collision means a key got silently
   overwritten and a component will render the wrong words.

## Acceptance

Paste real output for each.

1. `bunx tsc --noEmit` - silent.
2. `bun -e "import {defaultUiStrings} from './src/lib/ui-strings.default.ts'; console.log(Object.keys(defaultUiStrings).length)"` prints `253`.
3. `src/lib/i18n.test.ts` covers: a slot is filled; two slots in one string; a missing param leaves
   the slot text visible; a two-argument call is unchanged; the null-context branch interpolates
   its fallback too. **Mutation-test the missing-param case**: make it print `undefined`, show the
   named test failing, put it back. Paste both runs.
4. `bun run test` - at least **313 passing over 30 files** plus your new ones. Fewer is a
   regression; stop and report rather than pressing on.
5. `bun run lint` - 8 errors, 0 warnings or fewer. You may not add the ninth.

## Out of scope

- Wiring any component to any key. Every slice job after this one does that, and doing it here
  would take files out from under them.
- Khmer translation.
- The four code fixes in the inventory's "Not a key" section - locales, the root provider, the
  MapView popup, the directory headers. Each goes to the slice that owns that file.
- The admin editor. Another pane owns it.

## Stop conditions

- A key in `keys.proposed.ts` collides with an existing key: stop and report it. Do not resolve it
  by picking one.
- `bun run test` drops below 313: stop and report.
- Never run `git` commands that write: no commit, checkout, reset, stash.
