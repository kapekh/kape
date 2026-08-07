# C3 round-2 critic

Audit of C3 round two (theme as configuration) at `17aa6c0`.
The critic did not read C3's report and edited nothing under `src/`.
Every number below came from painted pixels in Chrome or from SSR HTML, not from reading code.

Filed by the parent session on 2026-08-07 09:20 from the agent's returned verdict; the agent wrote no file of its own.

## Verdict per acceptance item

### 1. Malformed values - PARTIAL

The bracket/quote balancer and the per-kind grammar work.
Across 53 hostile values, every rejection dropped only its own key:
`themeCss({theme_primary:"oklch(0.5 0.1 250", theme_secondary:"oklch(0.6 0.2 40)", theme_radius:"0rem"})` emits both survivors.
Confirmed on the live page for unbalanced `(`, stray `)`, `/*`, trailing `\`, `;`, `}html{`, `</style><script>`, `!important`, unicode escapes, 201-char values and newlines.
In every case `--primary` fell back to the product slate and `--secondary`, `--radius` and `--paper-*` stayed.
No injection escaped: `<` is banned, so a raw-text `<style>` cannot be terminated, and `theme_font_url` is https-only with quotes and angle brackets excluded.

**The validator still has a hole that reproduces the original failure.**
`KEYWORD = /^[a-z]{3,20}$/i` accepts any 3-20 letter word, and `COMPOSITE = /^(?:color|color-mix|light-dark|var)\(/i` is anchored at the prefix only.
So all of these pass `checkThemeValue` with no warning:

`banana`, `notacolour`, `lorem`, `unset`, `initial`, `none`, `transparent`, `var(--brand-primary)`, `var(--primary)`, `color-mix(in oklab, red, blue) 0 0 0 red`, `var(--x) !important`

Measured with `theme_primary = banana`: `--primary`, `--primary-foreground` and `--warm-foreground` all become `rgba(0,0,0,0)`, and `--gradient-hero` and `--shadow-lift` become `none`.
The top bar, the Donate pill fill, the navy headings and the stats band all disappear; the site renders unbranded.
The settings form shows no error on the field, and the Legibility panel says "This one is used on the page, but those two fall back to the product's default", which is false.
`themeContrast` skips the colour entirely, so no ratio is reported either.

Fix: check the keyword against the 148 CSS named colours instead of `[a-z]{3,20}`, and anchor `COMPOSITE` at both ends.

### 2. The settings form - PARTIAL, original symptom still reproducible

Once the form is ready (350-800 ms warm), every edit reaches the server: 1, 2 and 5 fields, Identity and Brand, all produced exactly N `adminSettings.set` mutations with the right payloads and "Saved N fields."
The builder's fix is real: typing 3 brand fields, clicking **Add setting** (which calls `refresh()`), then Save, sent all 3 drafts.

The original symptom still happens in the pre-ready window.
Navigating to `/admin/settings` and typing immediately: `fill` reported success, all 24 inputs were `readOnly`, the typed value never entered React state, six seconds later the field showed the stored value, and Save stayed disabled and sent nothing.
It is now visible (greyed fields, "Reading the stored values…"), a genuine mitigation, but the edit is still lost with no error.

**New defect, worse.** `refresh()` has no `catch` and no `finally`:

```ts
async function refresh() {
  const all = await trpcClient.adminSettings.list.query();
  ...
  setLoading(false);
}
```

Aborting `adminSettings.list` leaves the page permanently unusable: at t=20s and t=35s, all 24 inputs still `readOnly`, table still "Loading…", Save disabled, and no error anywhere in the UI or console.
Any expired session or restarted server bricks the settings screen.
Same shape as the module spinner bug the commit message says it fixed.

### 3. Contrast derivation - CONFIRMED

Measured from painted pixels across 21 palettes.
`themeContrast`'s reported ratio matched the browser to within 0.05 in every case.

| palette | derived fg | measured |
|---|---|---|
| `oklch(0.569 0 0)` (just below) | paper | 4.27:1 |
| `oklch(0.570 0 0)` (on it) | ink | 4.33:1 |
| `oklch(0.571 0 0)` (just above) | ink | 4.38:1 |
| yellow `oklch(0.59 0.14 100)` | ink | 4.79:1 |
| blue `oklch(0.55 0.20 265)` | paper | 4.84:1 |
| blue `oklch(0.60 0.15 265)` | ink | 4.80:1 |
| high-chroma red `oklch(0.63 0.30 29)` | ink | 4.85:1 |
| achromatic `oklch(0.60 0 0)` | ink | 4.91:1 |
| white / black | ink / paper | 19.4 / 20.0 |

Worst case anywhere is 4.27:1, the theoretical minimum, and the form flags it as below AA.
Yellow correctly gets ink where an L-only rule would fail, so the chroma term earns its place.
No palette produced an unreadable foreground.

### 4. `light-dark()` - CONFIRMED

All six OS-preference x class combinations resolve correctly, for the tokens and the Tailwind `dark:` variant:

| OS | class | `color-scheme` | `--background` | `dark:` variant |
|---|---|---|---|---|
| light | none | light | cream | off |
| light | dark | dark | charcoal | on |
| light | light | light | cream | off |
| dark | none | **dark** | charcoal | **on** |
| dark | dark | dark | charcoal | on |
| dark | light | **light** | cream | **off** |

`oklch(from light-dark(...) ...)` resolves in Chrome, so the derived foregrounds work.
SSR HTML carries the `:root{--brand-*}` block after the stylesheet link, so no flash.
With scripts disabled and OS dark the page renders dark (the TanStack badge is absent, proving JS was off).
The ThemeToggle switches both ways and writes both class and `localStorage`.
Writing `.light` was necessary: it is the only way a dark-OS reader can choose light, and `:root.light` outranks the media block on specificity.

Two regressions the change introduced:

- The toggle renders `aria-label="Switch to dark mode"` and the moon icon in SSR unconditionally, so a dark-OS reader with no stored choice sees the wrong icon and label until hydration. On `main`, no class always meant light, so the default was right.
- Existing readers on dark-OS machines who never touched the toggle will now flip to dark on first load.

### 5. The test - PARTIAL

It genuinely fails on the historical counterexample: adding `.dark { --primary: oklch(0.30 0.10 255); --background: oklch(0.985 0.012 80); }` fails "declares each token once".
`light-dark(x, x)` with identical arms fails. Changing the crossover formula in the stylesheet fails.

Five broken stylesheets still pass all 8 tests:

1. `--panel: light-dark(oklch(0.30 0.10 255), oklch(0.300 0.100 255))` - the same colour with a trailing zero. This is "light values copied verbatim into dark", the exact bug the test exists for, defeated by one character. The test compares arm strings, not colours.
2. `--panel: white` - a colour keyword is not matched by `namesALiteralColour`, so a light-only token passes.
3. `--panel: color-mix(in oklab, var(--primary) 50%, white)` - same.
4. An indented `:root` inside a media query is invisible to `rootDeclarations`, whose regex needs `:root` at line start.
5. A light literal in a component rule outside `:root`, `.org-tree { background: oklch(0.985 0.012 80); }`, is not examined at all. That is where the original CTA/stats bug actually lived.

A new token declared only in `.dark` also passes.

### 6. Smaller claims - CONFIRMED

- Unconfigured install: `theme-color` = `#222f3c`, matching the declared `--brand-primary: oklch(0.30 0.03 250)`. With KAPE configured it is `#002c5e`. Verified in SSR HTML both ways.
- `color-scheme` is set; on `/admin/posts/new` in dark the "Published at" field computes `color-scheme: dark` and the calendar glyph renders light on the dark field.
- Percentage alpha: `oklch(0.3 0.1 255 / 50%)` -> `#002c5e`, same as without alpha.
- `rgb(31 78 121)` -> `#1f4e79`, `hsl(207 59% 30%)` -> `#1f517a`, `#abc` -> `#aabbcc`, all confirmed against the browser's own painting. `rebeccapurple` returns `null` and the form reports it.
- `--sidebar-*`, `--chart-*`, `--ink`: zero consumers anywhere in `src/` outside the test that asserts their absence.

Two gaps: legacy `rgba(31, 78, 121, 0.5)` passes validation but `colourToHex` returns null, so `theme-color` silently falls back while the page uses the colour; and `hsl(207deg 59% 30%)` is rejected by the validator although `colourToHex` handles `deg`.

### 7. KAPE - CONFIRMED, four tokens, and the flip violates acceptance 8

`main`'s `:root`/`.dark` blocks rendered side by side with the branch, 22 tokens compared in both modes.
Exactly four change, all `*-foreground`.
Eighteen are byte-identical in both modes, including `--primary`, `--secondary`, `--accent`, `--gold`, `--palm`, `--background`, `--foreground`, `--muted*`, `--border`, `--ring` and `--radius`.

| token | mode | main | branch | main ratio | branch ratio |
|---|---|---|---|---|---|
| `--accent-foreground` | light | `#fef9f1` | `#100d08` | 2.98:1 | **6.22:1** |
| `--accent-foreground` | dark | `#fef9f1` | `#100d08` | 2.77:1 | **6.68:1** |
| `--primary-foreground` | dark | `#fef9f1` | `#100d08` | 3.47:1 | **5.34:1** |
| `--destructive-foreground` | dark | `#fef9f1` | `#100d08` | 2.77:1 | **6.68:1** |
| `--destructive-foreground` | light | `#f8fafc` | `#fef9f1` | - | cosmetic |
| `--secondary-foreground` | light/dark | `#2a140c`/`#1d140d` | `#100d08` | 6.66:1 | 7.41:1 |

Every change moves a below-AA pairing above AA, so on accessibility grounds it is right.
The problem is `--accent-foreground` in **light** mode: KAPE's Donate button, the most recognisable element on every page, goes from white-on-terracotta to near-black-on-terracotta, and so does every accent chip.
Acceptance 8 says "KAPE's own appearance is unchanged when KAPE's values are in settings", and this breaks it in the default mode.
The builder disclosed it and left it for a human, which is the right call, but a client signing off on the light-mode home page would reject it on sight.
The dark-chrome flip (`#418ad1` bar with black text) is the same trade at lower visibility.

## New defects

1. **`refresh()` in `admin.settings.tsx` has no error handling.** One failed `adminSettings.list` leaves the settings page permanently read-only with Save disabled and no error shown. Proved by aborting the request. High severity, high confidence.
2. **`checkThemeValue` accepts any 3-20 letter word and any `var(`/`color-mix(`/`light-dark(` prefix with arbitrary trailing junk.** `banana` blanks out `--primary`, `--primary-foreground`, `--warm-foreground`, `--gradient-hero` and `--shadow-lift` on the live page, with no warning and a Legibility message that misstates what happened. High severity, high confidence.
3. **ThemeToggle SSR default is wrong for dark-OS readers.** `useState(false)` renders the moon icon and "Switch to dark mode" on a page that will paint dark. Low severity, high confidence.
4. **Legacy `rgba(r, g, b, a)`:** the page uses the colour, `theme-color` and the manifest silently fall back. Low severity.

## Biggest remaining gap

The validator's whole job is to keep a typo from wrecking the theme, and it still lets the simplest typo through.
A colour field that accepts `banana`, or `notacolour`, or `unset`, or a self-referential `var()`, writes a guaranteed-invalid value into `--brand-primary`, which cascades through five derived tokens and paints KAPE's header, footer, buttons, stats band and CTA band with nothing at all.
Until the closed list lands, the audit's headline finding, that one malformed character discards the theme, is only half retired.
