# C7 - A typo cannot blank the theme, and a failed load cannot brick the settings page

## Objective

Two defects the C3 round-two critic proved on the live page. Both are single-cause, both are high severity, and both are the same mistake in different clothes: a check that reports success on input it never actually understood.

You are done when `theme_primary = banana` is rejected at the field with a message an operator can act on, and when a failed `adminSettings.list` leaves the settings page recoverable instead of permanently read-only.

Evidence for both is in `.work/c3-critic-r2.md`, measured in Chrome. Read it before you start. Do not re-litigate the findings; they are confirmed.

## 1. The validator accepts words that are not colours

`src/lib/site-theme.ts:205-211`:

```ts
const KEYWORD = /^[a-z]{3,20}$/i;
const COMPOSITE = /^(?:color|color-mix|light-dark|var)\(/i;
const isColour = (v) => HEX.test(v) || CHANNELS.test(v) || KEYWORD.test(v) || COMPOSITE.test(v);
```

`KEYWORD` accepts any three-to-twenty-letter word. `COMPOSITE` is anchored at the prefix only, so anything may trail it. All of these pass `checkThemeValue("colour", v)` with no warning:

`banana`, `notacolour`, `lorem`, `unset`, `initial`, `none`, `transparent`, `var(--brand-primary)`, `var(--primary)`, `color-mix(in oklab, red, blue) 0 0 0 red`, `var(--x) !important`

With `theme_primary = banana`, the critic measured `--primary`, `--primary-foreground` and `--warm-foreground` all computing to `rgba(0,0,0,0)`, and `--gradient-hero` and `--shadow-lift` to `none`. The top bar, the Donate pill fill, the headings and the stats band vanish; the site renders unbranded. The field shows no error, and the Legibility panel claims the colour is in use.

The fix is a closed list, not a cleverer pattern:

- Check the keyword against the 148 CSS named colours plus `transparent` and `currentColor`. Decide deliberately whether the CSS-wide keywords (`unset`, `initial`, `inherit`, `revert`) are allowed; if you allow any, say why it is safe for a value that lands in `:root`.
- Anchor `COMPOSITE` at both ends, so trailing junk is a rejection rather than a pass.
- A self-referential `var(--primary)` inside `--primary` must not pass. Decide what to do about `var()` at all: it is a real feature for someone chaining tokens, and a footgun that produces an invalid value with no error. If you keep it, prove a cycle is caught; if you drop it, say so in the report.

`colourToHex` and `themeContrast` must agree with whatever the validator now accepts. Today they do not: `themeContrast` skips a value it cannot parse, so a bad colour reports no ratio at all rather than a warning.

## 2. `refresh()` in the settings page has no error path

`src/routes/admin.settings.tsx`:

```ts
async function refresh() {
  const all = await trpcClient.adminSettings.list.query();
  ...
  setLoading(false);
}
```

No `catch`, no `finally`. The critic aborted the request: at t=20s and t=35s all 24 inputs were still `readOnly`, the table still read "Loading…", Save was still disabled, and nothing appeared in the UI or the console. An expired session or a restarted server bricks the settings screen until a manual reload, and the operator is given no reason to reload.

This is the same shape as the module-list defect C4 round three is fixing in `admin.modules.tsx`. Look at what that lands on and match it, so the admin has one failure behaviour rather than two. The two requirements that matter: the loading state must end on failure, and the failure must be visible with a way to retry.

While you are there: typing into the settings form before it is ready still silently discards the edit. The fields are greyed and labelled "Reading the stored values…", which is a real mitigation, so this is a lower bar - do not let a slow load look like a saved edit.

## Files you own

- `src/lib/site-theme.ts`
- `src/lib/site-theme.test.ts`
- `src/routes/admin.settings.tsx`
- `.work/c7-report.md`

**Do not touch** `src/lib/modules.ts`, `src/lib/modules.test.ts`, `src/integrations/trpc/router.ts` or `src/routes/admin.modules.tsx`. C4 round three has uncommitted work in all four. Check `git status` before you start; if those files are still modified, that agent is still running.

## Acceptance

1. Every value in the list above is rejected by `checkThemeValue`, each with a message naming what is wrong. Assert them in `site-theme.test.ts`, as a table, not one representative case.
2. Every value that worked before still works: `#abc`, `#1f4e79`, `oklch(0.3 0.1 255)`, `oklch(0.3 0.1 255 / 50%)`, `rgb(31 78 121)`, `hsl(207 59% 30%)`, `rebeccapurple` and the rest of the named colours. A validator that rejects `rebeccapurple` is a worse bug than the one it fixes.
3. **Shown in a browser, not asserted in a test:** set `theme_primary = banana` in settings, and the field reports the error, the value is not written, and the painted page is unchanged. Screenshot the field and the page.
4. A failed `adminSettings.list` leaves the settings page with a visible error and a working retry, and the inputs are no longer stuck `readOnly`. Prove it the way the critic did, by aborting the request against a running server, and show the page at t=20s.
5. `bun run test` at or above the count when you start. `bunx tsc --noEmit` silent. `bun run format` clean.

## Out of scope

- The contrast rule. Rithy accepted the flip: KAPE's Donate button goes near-black on terracotta in light mode, because all four changed tokens move above AA. Do not revert it and do not retune KAPE's palette.
- The dark-mode guard test's five holes. Real, in the critic's report, and a separate job.
- The ThemeToggle SSR icon defaulting to the moon for dark-OS readers, and legacy `rgba(r, g, b, a)` falling back in `theme-color`. Both low severity, both recorded, neither is this job.

## Stop conditions

- Never run against the repo's `kape.db`. `VACUUM INTO` a copy, `export DATABASE_PATH`, `export SSG_CACHE=off`.
- Do not commit, do not touch git, do not edit the worklog.
- If the closed list turns out to reject a value KAPE itself uses, stop and report it rather than widening the list to fit.
