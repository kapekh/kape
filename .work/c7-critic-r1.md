# C7 critic, round 1

Audit of the uncommitted diff over `ac927de` in `src/lib/site-theme.ts`, `src/lib/site-theme.test.ts` and `src/routes/admin.settings.tsx`.

The critic did not read `.work/c7-report.md`, `.work/LEAD.md`, `.work/c7-deliverable/` or `.work/c7-shots/`, and edited nothing under `src/`.
Every number below came from a Chrome session against a dev server on port 3210 reading a `VACUUM INTO` copy of the database at `/tmp/.../critic/audit.db`, with `SSG_CACHE=off`, or from mutation runs in a scratch copy of `src/` outside the repo.
Screenshots are in `.work/c7-critic-shots/`.

## Verdict

| claim | holds? |
|---|---|
| 1. "A typo can no longer blank the theme." | **No.** The word `banana` is caught. Four other values still blank the page, one of them (`transparent`) named in the acceptance criteria as a must-reject and shipped with a test asserting it is accepted. |
| 2. "A failed load no longer bricks the settings page." | **Yes.** Aborted, failed twice more, recovered, and hit with a real 401. The page never bricks and the save path did not regress. Three lower-severity defects around it. |

## Claim 1 - a typo can no longer blank the theme

### What was fixed, and it is real

The original bypass list is now rejected, each with a message naming the value:

| value | validator |
|---|---|
| `banana`, `notacolour`, `lorem`, `none` | REJECT - `"banana" is not one of the CSS colour names.` |
| `unset`, `initial`, `inherit`, `revert` | REJECT - `"unset" is a CSS keyword, not a colour, and would leave this token with no value at all.` |
| `var(--brand-primary)`, `var(--primary)`, `var(--x) !important`, `var(--primary, banana)` | REJECT - `var() is not accepted here.` |
| `color-mix(in oklab, red, blue) 0 0 0 red` | REJECT - `Nothing may follow the closing bracket of color-mix().` |
| `light-dark(banana, red)`, `color-mix(in oklab, banana, red)` | REJECT - `Inside light-dark(): "banana" is not one of the CSS colour names.` |

Nesting is checked recursively, so the one-level-down hole is closed.
`var()` is refused outright, so no self-reference and no cycle across two settings is constructible.

The mirror failure did not happen. All 148 names are accepted in four casings and with surrounding whitespace, including `REBECCAPURPLE`, `RebeccaPurple`, `AliceBlue` and `  navy  `.
I checked every one of the 148 name/hex pairs against Chrome's own parser rather than against the table itself:

```js
el.style.color = name; got = getComputedStyle(el).color;
el.style.color = hex;  want = getComputedStyle(el).color;
// {"count":148,"bad":[]}
```

Named colours now work end to end, which they did not before. `theme_accent = rebeccapurple` saved through the form paints `--accent: rgb(102, 51, 153)` on the Donate button, derives a correct `--accent-foreground`, and reaches `theme-color`. Shot 13.

KAPE's fixture is unaffected. All ten `theme_*` values in `src/server/seed/site.ts` return `null` from `checkThemeValue`, and `themeCss` emits all ten. The closed list rejects nothing KAPE uses, so the stop condition was never reached.

### Defect 1.1 - `transparent` still blanks the theme, with no error. HIGH

`transparent` was in the c3 critic's bypass list and in acceptance item 1's must-reject list.
It is accepted, and `src/lib/site-theme.test.ts` now asserts that it is (`accepts transparent and currentColor, which have no hex`).

Typed into the Brand form: no error, `aria-invalid` absent, the ordinary hint shown. Saved through the form; stored in `site_settings`. Shot 06.

Measured on `/en` after the save:

```
--primary            rgba(0, 0, 0, 0)
--primary-foreground oklch(0.985 0.012 80 / 0)
--warm-foreground    oklch(0.24 0 0 / 0)
--gradient-hero      linear-gradient(135deg, rgba(0,0,0,0) 0%, oklch(0 0 5 / 0) 60%, oklch(0 0 10 / 0) 100%)
h1 colour            rgba(0, 0, 0, 0)
```

Shots 04 and 05 against the baseline in shot 01: the navy top bar, the announcement heading, the "Read more" button, the navy half of the hero headline and the KAPE crest are all gone. This is the c3 finding reproduced word for word, on a value the fix explicitly allows.

The Legibility panel with `transparent` in place prints the same false sentence the previous critic quoted:

> The browser's own title bar and the installed-app icon need a hex, oklch(), rgb() or hsl() colour. **This one is used on the page**, but those two fall back to the product's default.

It is not used on the page. It paints nothing.

`light-dark(transparent, red)` is accepted too and blanks light mode the same way (`oklch(0 0 0 / 0)` measured in Chrome).

### Defect 1.2 - the colour-space list inside `color-mix()` and `color()` is open. HIGH

`MIX_SPACE = /^in\s+[a-z0-9-]+.../` accepts any word, and `COLOR_BODY` accepts any `--custom-profile` name.
Both are invalid CSS, and both reproduce the original symptom exactly.

Typed into the form: no error on either. Saved; measured on `/en`:

| stored value | `--primary` | `--primary-foreground` | `--warm-foreground` |
|---|---|---|---|
| `color-mix(in banana, red, blue)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |
| `color(--myprofile 1 0 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |

Shot 07. The closed list stops one character short: the colour *names* are closed, the colour *spaces* are not.

### Defect 1.3 - `currentColor` makes the brand whatever the surrounding text colour is. MEDIUM

Accepted with no error, and asserted in the test suite. Measured with it stored: `--primary` resolves to `rgb(0, 0, 0)` at the point of use rather than to a brand colour.
It is not blank, but it is not a brand either, and no warning is shown. `themeContrast` reports nothing for it.

### Defect 1.4 - `hsl(207deg 59% 30%)` is still rejected. MEDIUM

The c3 critic flagged this gap and the C7 contract asked whether it closed. It did not.
`NUM` still has no unit, so any angle written with `deg` is refused with the generic `Not a colour.` message, while Chrome paints it (`oklch(0.421781 0.0860725 246.555)` measured) and `colourToHex` handles `deg` in its own `hsl` branch.
`rgb(from #1f4e79 r g b)` and `oklch(from #1f4e79 l c h)` are refused for the same reason; those are lower value, `deg` is not.

### Defect 1.5 - nine accepted colour forms report no legibility ratio at all. MEDIUM

The contract asked that `themeContrast` report a ratio for everything the validator accepts. It does not:

| accepted value | `colourToHex` | contrast rows |
|---|---|---|
| `lab(50% 40 30)`, `lch(50% 40 30)`, `hwb(207 12% 40%)` | null | 0 |
| `color(display-p3 1 0 0)`, `color-mix(in oklab, red 40%, blue)`, `light-dark(red, blue)` | null | 0 |
| `rgba(31, 78, 121, 0.5)` | null | 0 |
| `transparent`, `currentColor` | null | 0 |
| `rebeccapurple`, `oklch(0.3 0.1 255)` | hex | 4 |

Named colours were fixed. Everything else the validator opened up still falls through `bothModes`, so an operator who types a perfectly good `hwb()` or `color-mix()` gets a Legibility panel that silently drops the primary and highlight rows and a `theme-color` that falls back to the product default.

### Defect 1.6 - a value that fails validation is still written to the database. LOW

Acceptance item 3 asked that a rejected value not be written. It is.
Typing `banana`, clicking **Save brand**: `adminSettings.set` fires, `site_settings.theme_primary = 'banana'`, and the form says "Saved 1 field." The field keeps its inline error, and the hint under it does say the field will be ignored, so this is disclosed rather than hidden.

The consequence is worth naming: `themeCss` then drops `--brand-primary` alone, so light mode reverts to the product's slate `oklch(0.3 0.03 250)` while `--brand-primary-dark` survives and dark mode keeps KAPE's navy. SSR `theme-color` goes to `#222f3c`. Measured; shot 03. Half the brand in one mode, product default in the other.

### The tests

Mutations run in a scratch copy at `/tmp/.../critic/mut`, `bunx vitest run src/lib/site-theme.test.ts` (45 tests):

| mutation | result |
|---|---|
| `KEYWORD = /^[a-z]{3,20}$/i` restored | 3 fail: `themeCss > drops a word that is not a colour and keeps one that is`, `checkThemeValue > refuses a word that is not a colour name, and says which word`, `checkThemeValue > refuses junk nested inside a composite colour` |
| `COMPOSITE` unanchored (prefix accept at top of `colourProblem`) | 3 fail: `drops a word that is not a colour and keeps one that is`, `refuses var(), and refuses anything trailing a composite colour`, `refuses junk nested inside a composite colour` |
| drop `aliceblue` from the table | 3 fail: `holds 148 names...`, `is the table that was checked against a browser`, `accepts every CSS colour name, whatever the casing` |
| corrupt one hex (`thistle #d8bfd8` -> `#d8bfd9`) | **1** fail, the sha256 pin only |

The last row is the weakness. `accepts every CSS colour name` asserts `colourToHex(name) === hex` where `hex` is read out of the same table, so it can never catch a wrong hex; only the sha256 snapshot can, and a snapshot pins whatever was written rather than what is true. Four names are hand-checked. I checked all 148 against Chrome and they are correct, so this is a durability problem, not a live defect.

`refresh()` has no test at all. Removing the `.catch` from `admin.settings.tsx` changes nothing in `bun run test`: no test file imports `admin.settings.tsx` or references `adminSettings`, so the "remove the catch / remove the finally" mutations are unkillable by construction. Claim 2 rests entirely on the browser evidence below.

## Claim 2 - a failed load no longer bricks the settings page

`network route --abort` in the CLI did not survive navigation reliably, so the abort was done in-page with a real `AbortController` on the app's own `fetch` for `adminSettings.list` - a genuine aborted request against a running server, not a stubbed response. The 401 was genuine too: the same URL re-issued with `credentials: 'omit'`, which the running server answers `401 {"error":{"json":{"message":"UNAUTHORIZED",...}}}`.

### Aborted load - the page recovers. CONFIRMED

Client-side navigation into `/admin/settings` with the list aborted:

- t=3s and t=20s: 0 inputs, 0 readOnly, 0 Save buttons, no "Loading…" table.
- Error shown: `This site's settings could not be read, so nothing here can be changed yet: signal is aborted without reason`, with a **Try again** button. Shot 08.

The c3 symptom is gone: nothing sits `readOnly` for ever, and Save is absent rather than disabled, so there is no button that could write a guess over a live site.

### Failing the retry twice - CONFIRMED

Two further clicks on **Try again**, both aborted (`window.__aborted` reached 3). Error re-rendered both times, **Try again** still offered, still 0 inputs. No dead end.

### Succeeding after failure - CONFIRMED

Third retry with the abort disarmed: error cleared, 48 inputs, 0 readOnly, `set-theme_primary` = `oklch(0.30 0.10 255)`, `set-site_name_en` = `Kampuchea Action to Promote Education`. Shot 09. The error does not sit under a loaded form.

### Save path did not regress - CONFIRMED

Counted from a `fetch` spy, with request bodies:

| edit | `adminSettings.set` calls | payloads | status |
|---|---|---|---|
| 1 field (Identity) | 1 | `site_name_short=KAPE-1` | "Saved 1 field." |
| 2 fields (Identity) | 2 | `site_name_short=KAPE-2`, `og_site_name=KAPE Social` | "Saved 2 fields." |
| 5 fields (Brand) | 5 | `theme_primary`, `theme_secondary`, `theme_accent`, `theme_paper_hue`, `theme_radius`, all correct | "Saved 5 fields." |

Exactly N mutations, correct payloads, correct wording. No edit dropped.

### Defect 2.1 - a 401 does not tell the operator they are signed out. MEDIUM

With a real 401 on `adminSettings.list`, the page reads:

> This site's settings could not be read, so nothing here can be changed yet: **UNAUTHORIZED**

and offers **Try again**, which for an expired session can never succeed. Shot 10.
`err.message` is rendered raw, so the operator gets a tRPC error code, no mention of the session, and no way to sign in.

Two mitigations, both real. `admin.modules.tsx` does exactly the same thing, so the admin has one failure behaviour rather than two, which is what the job asked for. And a session that has actually expired is caught earlier: I deleted every row from `sessions`, navigated client-side, and the admin shell redirected to `/login`. The bare-401-on-the-settings-query path is reachable only when the shell guard and the query disagree.

### Defect 2.2 - a failed re-read hides an unsaved edit. LOW

`admin.modules.tsx` keeps its error inside one `FormSection`. `admin.settings.tsx` returns early on `error`, so the whole page - Identity, Brand, Add setting and the key/value table - is replaced.

Loaded the page, typed `oklch(0.50 0.20 130)` into `theme_secondary` without saving, then made the re-read triggered by **Add setting** abort. The error screen replaced the form and the unsaved edit was no longer visible or reachable. Shot 11.
A successful **Try again** restored it (`set-theme_secondary` = `oklch(0.50 0.20 130)`, `Save brand (1)`), so nothing is lost in React state - but the operator, told the settings "could not be read", is one page reload away from losing it, and a reload is the obvious response to that message.

The same early return also prints the whole-page failure under the heading **Site identity** with a description about page titles and social cards, which is not what failed.

### Defect 2.3 - `create()` still has no error path. LOW

`async function create()` awaits `adminSettings.set` with no `try`/`catch`. With the server failing, clicking **Add** produced one aborted `set`, an unhandled rejection, no error in the UI, no toast, and `refresh()` never ran. The same class of defect this job was sent to fix, one function down.

### Pre-ready window - unchanged, still lossy

Measured with real keystrokes, not `fill` (Playwright's `fill` waits for the element to become editable and so cannot enter the window at all). Delayed the list response by 15s, focused `set-site_name_en` at t=1s and pressed K, A, P, E:

```
during: readOnly=true, value=""      // four keypresses, nothing landed
after:  value="Kampuchea Action to Promote Education", Save identity disabled
```

Identical to what the c3 critic measured: the field is greyed, labelled "Reading the stored values…", `readOnly`, and the edit is discarded with no error. Not a regression, not a fix. Shot 12.

Incidental: `refresh()` runs twice on mount in dev, visible as `/api/trpc/adminSettings.list,adminSettings.list?batch=1` - React's double-effect, batched into one request, harmless.

## Gates, observed

```
bun run test     Test Files  21 passed (21)   Tests  237 passed (237)
bunx tsc --noEmit  (silent, exit 0)
bun run format   Checked 246 files in 116ms. No fixes applied.  (exit 0)
```

## What I tried that failed to break claim 1

Worth recording, because the closed list is genuinely tight in these directions:

- All 148 names in four casings each and with leading/trailing whitespace: all accepted, all hexes match Chrome.
- Trailing junk after a balanced composite, in several shapes (`light-dark(red, blue) trailing`, `light-dark(red, blue) rgb(0 0 0)`, `color-mix(...) 0 0 0 red`): every one rejected, either by the "nothing may follow" check or by the argument count.
- `var()` at top level, nested inside `light-dark()`, nested inside `color-mix()` with a percentage attached, and with a fallback (`var(--primary, banana)`): all rejected. No self-reference and no two-setting cycle is constructible.
- Uppercase function names, `LIGHT-DARK(RED, BLUE)`, spacing variants `light-dark(red , blue)` and `color-mix(in oklab,red,blue)`: correctly accepted and correctly painted.
- `color-mix(in oklab, red 40% 50%, blue)`, `light-dark(red)`, `color-mix(oklab, red, blue)`, `color(nonsense 1 0 0)`: all rejected with the right message.
- System colour keywords (`Canvas`, `LinkText`, `AccentColor`, `ButtonText`) are rejected although Chrome paints them. Arguably correct for a brand field; recorded, not filed.

## Notes on the tree

`.env.example` and `vite.config.ts` are also modified. `vite.config.ts` scoping `test.include` to `src/**` is deliberate. `.env.example` is outside the files C7 owns and was not audited.
