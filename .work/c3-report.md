# C3 - A re-skin needs no component edit

Status: done, with two gaps named at the end.

An organisation now sets its palette, paper, corner radius and typefaces in `/admin/settings`, and the whole site follows in both modes.
The proof is a green-and-grey law firm re-skin applied through the settings form, across seven surfaces in light and dark, with no component edited and no server restart.
The same code renders KAPE pixel for pixel as before when KAPE's values are in settings.

## How this was verified

Everything below was measured against a running dev server on port 3000, `SSG_CACHE=off`, against scratch databases in the session scratchpad.
The repo's `kape.db` was never opened; its mtime is unchanged from before the session.

Three databases, all built by the real seed path (`bun run seed:kape`), never hand-edited:

| file | built from | used for |
| --- | --- | --- |
| `kape-pristine.db` | seed at `HEAD` | the before screenshots |
| `kape-after.db` | seed with this change | the KAPE-unchanged comparison |
| `kape-reskin.db` | the above, then re-skinned through `/admin/settings` | the re-skin screenshots |

The re-skin was typed into the real admin form and saved with its real Save button.
Values were written with the native `HTMLInputElement` value setter plus an `input` event, because `agent-browser`'s keystroke driver silently drops `(` and `.`.
That drives the component's own `onChange` and its own `adminSettings.set` mutation, so the path exercised is the operator's path; only the key-press simulation differs.
The values were then read back out of the database to confirm they landed.

## Inventory

Counted myself, at `HEAD` and again after. The survey's 105 was close.

| class | before | after | what happened |
| --- | ---: | ---: | --- |
| inline `oklch()` in TSX | 11 | 1 | 10 replaced by tokens; 1 left in `admin.index.tsx`, which C4 owns |
| Tailwind palette classes | 13 | 9 | 4 replaced; 9 left in fundraising and forms admin, which C4 owns |
| `white` / `black` utilities | 72 | 65 | 7 replaced; 65 judged correct and left |
| hex literals | 4 | 2 | `theme-color` and the manifest now derive from the primary |
| `rgba()` text-shadows | 7 | 7 | all judged correct and left |
| tokens in `:root` with no `.dark` value | 5 | 0 | `--ink` deleted, the other four now mode-aware |
| tokens with zero consumers | 14 | 13 | `--ink` deleted; 13 named below |

Total colour literals: 107 before, 84 after.

## The rule I applied

A literal is a bug when the thing it colours would look wrong under a different brand.
It is correct when the thing it colours is not the brand's to choose.

**Becomes a token.** Anything an organisation would recognise as theirs: headings, buttons, bands, links, eyebrows, badges, status chips, focus rings, shadows and gradients.

**Stays literal.** Achromatic furniture that exists to make a photograph readable, and surfaces whose whole job is to be non-colour:

- Scrims and backdrops. `bg-black/50` behind a dialog, `bg-black/40` behind the mobile nav, `bg-black/70` behind the announcement, `bg-black/85 via-black/55` under hero text. A scrim tinted with the brand is a scrim that stops working.
- Text and shadows over photographs. `text-white/90` on a hero, `[text-shadow:...rgba(0,0,0,0.45)]`. The photograph decides the contrast, not the palette.
- The lightbox, all fifteen of them. A photo viewer is deliberately achromatic so nothing competes with the image.
- Logo plates. `bg-white` behind a partner logo, a footer social mark, a map pin. Third-party logos are drawn assuming white; tinting the plate breaks somebody else's brand to express yours.

**Gets deleted.** `--ink`, which had zero consumers, as the job asked.

**Stays a product opinion, not a knob.** The neutral lightness ramp, the spacing rhythm (`Container`, `PAD`) and the type scale (`.t-display` through `.t-meta`).
These carry no brand meaning, and a CMS that lets an operator break its own vertical rhythm produces worse sites rather than more personal ones.
The paper's *tint* is configurable without its lightness ramp being configurable, which is the part that actually reads as a brand: see `theme_paper_chroma` and `theme_paper_hue` below.
`--palm` stays fixed for the same reason in reverse: it means "this worked", and green has to keep meaning green.

## What an operator can set

Fifteen keys, all optional, all resolving through `src/lib/site-theme.ts`, which follows the shape of `site-identity.ts`.

| key | effect |
| --- | --- |
| `theme_primary`, `theme_primary_dark` | the brand colour |
| `theme_secondary`, `theme_secondary_dark` | supporting colour, and the left edge of the CTA band |
| `theme_accent`, `theme_accent_dark` | links, eyebrows, donate, and the right edge of the CTA band |
| `theme_highlight`, `theme_highlight_dark` | bright marks on top of the brand colour (was `--gold`) |
| `theme_paper_chroma` | how much colour the neutral ramp carries. 0 is grey, 1 is full cream |
| `theme_paper_hue` | degrees to rotate that colour |
| `theme_radius` | corner radius, feeding every `rounded-*` utility |
| `theme_font_url` | an https stylesheet that loads the typefaces |
| `theme_font_display`, `theme_font_body`, `theme_font_script` | the three stacks |

Each dark-mode colour is optional.
Left empty it is derived from its light counterpart by lifting lightness into a readable band while keeping chroma and hue, so a one-field re-skin works.
The derivation is a guess, so an operator who has tuned their dark palette can overrule it; the KAPE fixture does exactly that for all four.

`theme_paper_chroma` and `theme_paper_hue` are a multiplier and a rotation rather than absolute colours.
That keeps the ramp's internal relationships whatever an operator picks, and makes 1 and 0 reproduce the existing cream exactly.

### Why a `<style>` in the head and not a script

`themeCss(settings)` returns a single `:root{...}` block that `__root.tsx` puts in `head().styles`, after the app stylesheet so it wins on source order.
On a hard load of the re-skinned site the brand block sits at byte 2200 and `<body>` at byte 3270, so the palette is parsed before any content exists to paint.

`.work/c3-shots/reskin-no-javascript.jpg` is the same page with every `.js` request aborted at the network layer.
It renders fully in the new brand, which is the strongest available statement that nothing applies the theme after paint.

### Values from settings are untrusted

Settings are admin-writable and land inside a `<style>` on every page, so `</style><script>` in a settings value would be stored XSS rather than a typo.
`safeCssValue` rejects any value containing `< > { } ; @ \` or `/*`, caps length, and type-checks numbers and lengths against a pattern.
`themeFontUrl` accepts only `https://` with no quotes or angle brackets.
Six tests cover the escape attempts.

## Dark mode

Five tokens were declared in `:root` and never in `.dark`.
Measured live on the before build, in dark mode, `--primary` resolved to `oklch(0.62 0.13 250)` while `--gradient-hero` still resolved to `linear-gradient(135deg, oklch(0.30 0.10 255) ...)`, the light-mode navy, and `--shadow-lift` to a light-mode navy shadow.

All four appearance tokens are now derived from `--primary`, `--secondary`, `--accent` and `--foreground` using relative colour syntax, and restated in `.dark`.
The derivation was chosen to reproduce the previous literals exactly:
`oklch(from var(--primary) calc(l - 0.06) calc(c - 0.01) calc(h + 5))` on KAPE's primary gives `oklch(0.24 0.09 260)`, which is the middle stop the gradient had hardcoded.

`--ink` is deleted.
`--radius` stays declared once, because a corner radius does not vary by mode.

`src/styles.test.ts` enforces the rule from now on: every custom property declared in `:root` must be redeclared in `.dark` unless it is an operator input (`--brand-*`, `--paper-*`) or `--radius`.
Run against the file at `HEAD` the check reports exactly the five the job named, so it fails on the bug it was written for rather than only passing on the fix.

## Files changed

```
components.json                             |   2 +-
src/components/Dialogs.tsx                  |   2 +-
src/components/FormRenderer.tsx             |   2 +-
src/components/MapView.tsx                  |   4 +-
src/components/sections/SectionRenderer.tsx |  10 +-
src/components/ui/button.tsx                |   2 +-
src/components/ui/slider.tsx                |   2 +-
src/routes/$lang.donate.index.tsx           |  10 +-
src/routes/__root.tsx                       |  14 +-
src/routes/admin.media.tsx                  |   2 +-
src/routes/admin.settings.tsx               |  99 ++++++++-----
src/routes/manifest[.]json.tsx              |   3 +-
src/server/seed/site.ts                     |  20 ++
src/styles.css                              | 156 +++++++++++++-------
```

New: `src/lib/site-theme.ts`, `src/lib/site-theme.test.ts`, `src/styles.test.ts`.

`SectionRenderer.tsx` changed in one component, `Cta`, and only its colour classes.
No section's structure, no registry entry and no section definition was touched.
`admin.settings.tsx` grew a Brand section; the field rendering was lifted into a local `Fields` component so identity and brand share it rather than being copied.

The product's own default palette moved from KAPE's navy and saffron to a restrained single-hue slate, and KAPE's palette moved into the fixture at `src/server/seed/site.ts`.
That is what makes criterion 8 mean anything: before, "KAPE's values in settings" would have been a no-op, and a fresh unbranded install would still have looked like KAPE.

## Acceptance

**1. Report with inventory, rule and after count.** Above.

**2. A re-skin to an unrelated palette, through settings, no component edited, six surfaces, both modes.**
Met. Fifteen settings written through the admin form; seven surfaces captured in both modes in `.work/c3-shots/reskin/`: home, a content page, the news collection, the donate landing, contact, search and the admin.
Compare against `.work/c3-shots/kape-after/` file for file.
No navy and no saffron survives anywhere in the chrome, bands, cards, buttons, links, footer or admin.
The one exception is the placeholder image, below.

**3. No token defined in `:root` is missing from `.dark`.**
Met, and now enforced by `src/styles.test.ts`.

**4. The stats band and the CTA band are correct in dark mode, before and after.**
Met on the mechanism, and I want to be exact about what the pictures show.
Both bands now derive from the mode-aware tokens, and the measured evidence of the old gap is quoted above.
But for *KAPE's* palette the visible before/after difference is small, because KAPE's dark secondary and accent were tuned to sit within 0.02 lightness of their light values, and the stats band additionally carried a `bg-primary/70` overlay that masked the stale gradient underneath.
`.work/c3-shots/dark-stats-band-before-after.jpg` and `dark-cta-band-before-after.jpg` show this honestly: the stats band becomes a cleaner, more uniform brand blue; the CTA band barely moves.
The defect was never mainly that KAPE looked wrong. It was that those bands did not follow the tokens at all, and the visible payoff is in the re-skin, where they are now green.

**5. Fonts are configurable, including the script-specific stack, with a sensible default.**
Met. The `@import` is gone from `styles.css`; `themeFontUrl` owns the stylesheet link and returns the previous Google Fonts URL when nothing is set, so an unconfigured install is unchanged.
The re-skin swapped all three stacks and the stylesheet, including the Khmer stack from Battambang to Noto Serif Khmer.
`KhmerCalendar.tsx` was not touched.

**6. `theme-color` derives from the primary.**
Met. `oklchToHex` converts OKLCH through OKLab and linear sRGB with per-channel clipping.
KAPE's primary gives `#002c5e`; the literal it replaced was `#1f4e79`, which had drifted, exactly as the job suspected.
The re-skin gives `#1d442c`.
The same function fixes `manifest.json`, which carried the same stale hex.
Nine tests cover it, including the two endpoints and an out-of-gamut colour.

**7. No flash of the default theme on a hard load.**
Met, demonstrated with all JavaScript blocked: `.work/c3-shots/reskin-no-javascript.jpg`.

**8. KAPE's appearance is unchanged when KAPE's values are in settings.**
Met, and this is the strongest result.

Every semantic token resolves to its previous value byte for byte, in both modes.
Measured in the browser: all 21 colour tokens, both gradients, both shadows, the radius and all three font stacks.
The only tokens whose computed value changed are the four that were previously wrong in dark mode, which is the fix.

Pixel comparison of the light-mode pages, before build against after build:

| page | differing region | what it is |
| --- | --- | --- |
| `news` | 92x9 px | the live visit counter in the footer |
| `content` | 133x12 px | the live visit counter |
| `donate` | 134x12 px | the live visit counter |
| `search` | 1x20 px | the text cursor blinking in the search field |

`.work/c3-shots/kape-only-delta-visit-counter.jpg` is that region.
Everything else on those pages is pixel-identical.
Dark-mode pages differ by 0.3 percent to 3 percent RMSE, which is the shadow and gradient fix and nothing else.

Two caveats on this criterion, stated rather than buried:

- The admin screenshots differ by about 3 percent in both modes. That is C4, which was editing `admin.tsx`, `admin.index.tsx` and `admin.modules.tsx` in the same working tree while I captured. The diff image is entirely sidebar menu items moving. None of my files touch the admin sidebar.
- The first `content-dark` capture differed by 21 percent because Leaflet's map tiles and the Khmer calendar had not finished loading. Re-captured with a longer settle it came back to 2 percent, in line with the other dark pages.

**9. Gates.**

| gate | floor | observed |
| --- | --- | --- |
| `bun run test` | 129 tests, 18 files | 174 tests, 21 files, all passing |
| `bunx tsc --noEmit` | silent | silent |
| `bun run format` | clean | clean |

24 of the new tests are mine, in `src/styles.test.ts` and `src/lib/site-theme.test.ts`.
The rest arrived with C4 in the shared tree.

## What resisted, and what I left

**The placeholder image does not follow the brand.**
`public/placeholder.svg` is a hardcoded navy gradient, `#1f3f75` to `#0f2544`.
It is the single most visible thing that stays KAPE-coloured after a re-skin, and it is easy to see in `.work/c3-shots/reskin/home-light.jpg`: every image-less card is a navy rectangle on a green site.
It cannot be fixed inside the token system, because an `<img src>` cannot read the page's custom properties.
There are exactly two ways out.
Make the placeholder neutral grey, which is arguably more correct since a missing image should read as a gap rather than as a brand statement, but which changes KAPE's appearance and so fails criterion 8 here.
Or serve it from a route that reads `site_settings`, the way `manifest.json` already does, and emit the gradient from the primary.
I did neither: the file is an untracked artefact of another in-flight job, and both fixes are larger than a colour swap.
The second option is the right one and belongs in a follow-up.

**Thirteen tokens still have zero consumers.**
`--sidebar` and its seven relatives, and `--chart-1` through `--chart-5`, are declared in both `:root` and `.dark` and read by nothing.
The sidebar set is also a cold shadcn blue-grey that contradicts the palette, which is the same complaint the job raised about `components.json`'s `baseColor` (now `neutral`).
I did not delete them because C4 owns the admin and was editing `admin.tsx` while I worked, and deleting a token another pane may be about to use is not worth the eight lines.
They should go, or the chart set should be re-derived from the brand when a dashboard chart actually lands.

**Ten literals left alone because C4 owns the file.**
`admin.index.tsx:370` has `text-[oklch(0.5_0.12_80)]` for a draft badge, next to a `--gold` token that already does that job.
`DonationsTable.tsx:34`, `admin.campaigns.index.tsx:26` and `admin.forms.index.tsx:105` each carry `bg-amber-500 text-amber-600 text-amber-400` for a pending status pill.
All four are one-line swaps to `--gold`. They are listed here rather than done, because the job forbids touching them.

**Two hex literals kept.**
`MapView.tsx:25` uses `#fff` for the white disc behind a map pin's logo; the pin's ring and arrow already read `var(--accent)`.
`manifest[.]json.tsx` keeps `background_color: "#ffffff"`, the splash-screen colour, which is white by intent rather than by brand.

**One tradeoff taken deliberately.**
The map's project status chips were `bg-slate-600` and `bg-emerald-600` with white text.
They are now `bg-[var(--muted-foreground)]` and `bg-[var(--palm)]` with `text-background`, which keeps them near-identical in light mode and makes them legible in dark mode, where white on a light chip would not have been.
They appear only inside a Leaflet popup, so no screenshot covers them.

## Artefacts

```
.work/c3-shots/kape-before/        14  before build, KAPE fixture, 7 surfaces x 2 modes
.work/c3-shots/kape-after/         14  after build, same fixture, same surfaces
.work/c3-shots/reskin/             14  after build, green-and-grey palette from settings
.work/c3-shots/reskin-no-javascript.jpg
.work/c3-shots/dark-stats-band-before-after.jpg
.work/c3-shots/dark-cta-band-before-after.jpg
.work/c3-shots/kape-only-delta-visit-counter.jpg
```

The re-skin palette, for anyone reproducing it:

```
theme_primary          oklch(0.35 0.06 155)     theme_paper_chroma  0.15
theme_primary_dark     oklch(0.72 0.10 155)     theme_paper_hue     80
theme_secondary        oklch(0.62 0.03 155)     theme_radius        0.125rem
theme_secondary_dark   oklch(0.68 0.03 155)
theme_accent           oklch(0.50 0.11 150)     theme_font_display  "Playfair Display", Georgia, serif
theme_accent_dark      oklch(0.65 0.12 150)     theme_font_body     "Source Sans 3", system-ui, sans-serif
theme_highlight        oklch(0.80 0.09 130)     theme_font_script   "Noto Serif Khmer", serif
theme_highlight_dark   oklch(0.85 0.09 130)
```

---

# Round two

Status: five of the six things the critic found are fixed and demonstrated; one is fixed differently from how it was described, and one part of it cannot be fixed at all and is now reported to the operator instead.

Everything below was measured against a dev server on port 3000, `SSG_CACHE=off`, on a scratch database built by the real seed (`bun run seed:kape` into the session scratchpad).
The repo's `kape.db` was never opened for writing; its md5 is `18be33be...be27` before and after, the same value it had at the start.
C4 was working in the same tree throughout.

## 1. One malformed character no longer discards the theme

The bug was not that `safeCssValue` was too permissive about *danger*.
It was that a value which is perfectly safe can still be untokenisable, and CSS recovers from that by eating everything after it.

Measured in the browser, on a stylesheet with one unclosed bracket:

```
.probeA{--a:oklch(0.5 0.1 250;--b:red;--c:blue}.probeB{--d:green}
  parsed rules      [".probeA { }"]
  --a --b --c --d   "" "" "" ""

.probeC{--b:red;--c:blue}.probeD{--d:green}
  --b --c --d       "red" "blue" "green"
```

One bracket costs two later declarations *and the entire following rule*.
That is why splitting the theme into one rule per declaration would not have helped, and why the fix has to be validation.

`checkThemeValue(kind, value)` now returns either `null` or a sentence an operator can act on, and `themeCss` drops only the value that failed:

```
themeCss({ theme_primary: "oklch(0.5 0.1 250",
           theme_secondary: "oklch(0.6 0.2 40)",
           theme_radius: "0rem" })
  -> ":root{--brand-secondary:oklch(0.6 0.2 40);--radius:0rem}"
```

Live, with that malformed primary written straight into the database, the served page carries all nine surviving declarations and `--primary` falls back to the product's own slate while the rest of the brand still applies.

Validation is in two parts.
Structural: balanced brackets, balanced quotes, no `< > { } ; @ \` or `/*`, 200 characters.
Then per kind: a colour must be a hex, one of the channel functions with three components, a `color-mix()`-style composite, or a bare keyword; a font stack may only contain word characters, quotes, commas, dots and hyphens.
The structural half is the one that makes the guarantee, because a value that cannot end early cannot take anything with it.

In the form, an invalid value marks its field, sets `aria-invalid`, and replaces the hint with the reason and what will happen: "This leaves a bracket open. Saved as it is, this field is ignored and the rest of the theme still applies."
`.work/c3-shots/round-two/after-settings-rejection.png`.

## 2. The settings form no longer discards edits

I could not reproduce "editing between one and five fields and clicking Save sends no request at all" as described.
Five different input methods, one field and five fields, both sections, blanking a field, and an edit made while a save was in flight all reached the server and landed in the database on the unfixed code.

What does reproduce, every time, is the same symptom by a different route, and I think it is what the critic hit:

```
load /admin/settings
type a new primary colour and a new organisation name
add any unrelated key through the Add setting form
  -> the form still shows both typed values
  -> both Save buttons send 0 requests
  -> the database still holds the old values
```

`create()` calls `refresh()`, and `refresh()` overwrote both `named` and `savedNamed` with the server's copy.
The pending edits were thrown away and the comparison that decides what to send then found nothing to send.
The same thing happens without touching Add: the settings list takes seconds to arrive on a cold dev server, the form renders empty and editable in the meantime, and anything typed in that window is wiped when the list lands.
A scripted harness that loads the page and starts typing hits that window every time.

Three changes:

- The server's copy and the operator's pending edits are separate state. `refresh()` only replaces the server's copy. A field's value is its pending edit if it has one, otherwise the stored value, so an edit to empty is a real edit rather than reading as unchanged.
- The fields are `readOnly` until the stored values have arrived, and `loading` starts `true`, so the server-rendered HTML is read-only too and the window closes on both sides of hydration. The button says "Reading the stored values…".
- Saving reports. The button counts what is pending ("Save brand (2)"), and a failure says how many of how many landed rather than failing silently. Only the keys that actually saved are cleared from the pending set.

Verified after the fix, same sequence: the pending edits survive the list reload, the buttons read "Save identity (1)" and "Save brand (1)", and both values reach the database.
Blanking `theme_primary_dark` stores `""` and the site falls back to the derivation, measured live: a primary of `oklch(0.42 0.18 300)` gives a dark primary of `oklch(0.74 0.18 300)`.

## 3. A light primary no longer makes the site unreadable

`--primary-foreground: var(--background)` is replaced by a derivation that reads the colour it will sit on:

```css
--primary-foreground: oklch(from var(--primary)
  clamp(0.16, (0.57 + c * 0.1 - l) * 1000, 0.985)
  calc(0.012 * var(--paper-chroma)) calc(80 + var(--paper-hue)));
```

Below the crossover it resolves to the paper colour, above it to ink, with a 0.001-wide ramp between.
`--secondary-foreground`, `--accent-foreground` and `--destructive-foreground` get the same treatment, because they had the same bug.

The crossover was measured, not guessed.
For a neutral it is 0.5677; for a saturated red it is 0.600, because a colourful surface carries less luminance than its OKLCH lightness suggests.
`0.57 + c * 0.1` tracks the measured crossover to within 0.01 across every hue and chroma in KAPE's palette and the product default.
`site-theme.ts` runs the same two numbers to compute the warning and `site-theme.test.ts` reads them back out of `styles.css`, so they cannot drift.

What this fixes, measured:

| pairing | before | after |
| --- | ---: | ---: |
| a label on the primary, dark mode | 3.47:1 | 5.35:1 |
| a label on the accent, light mode | 2.98:1 | 6.23:1 |
| a label on the accent, dark mode | 2.77:1 | 6.68:1 |
| a label on destructive, dark mode | 2.78:1 | 6.69:1 |
| a label on a white primary | 1.05:1 | 19.4:1 |

Four of those crossed AA in the process.

**This changes how KAPE looks in dark mode, and I want that said plainly.**
KAPE's dark primary is `oklch(0.62 0.13 250)`, which is above the crossover, so its header, footer, primary buttons and top bar now carry dark ink instead of white.
That is the 3.47 to 5.35 row.
`before-home-dark.png` and `after-home-dark.png` are the same page with the same announcement open; the difference is the "Read more" button's label.
Light mode is unchanged apart from the accent and destructive foregrounds.

### What the derivation cannot fix

The derivation controls what the site writes *on* a brand colour.
It cannot control the brand colour written *on the page*, because that is the brand.
A white primary still makes every heading and every link invisible on cream paper, and no formula can fix that without changing the operator's colour.

So the form measures both, per colour, per mode, and colours the failures red.
With the primary set to `oklch(1 0 0)` it reads:

```
Primary, light mode, a label on it: 19.4:1
Primary, light mode, a heading or link in it: 1.0:1 - hard to read at any size.
```

The highlight is measured against the primary it sits on rather than against the page, because that is the only place the site uses it.

That panel is honest about KAPE too, which is worth knowing:

```
Secondary, light mode, a heading or link in it: 2.5:1 - hard to read at any size.
Accent, light mode, a heading or link in it: 3.0:1 - hard to read at any size.
Highlight, dark mode, a mark on the primary colour: 1.9:1 - hard to read at any size.
```

Those are real: KAPE's saffron italic emphasis and coral links on cream, and gold footer headings on the lifted blue footer.
Not introduced by this job, not fixed by it, now visible.
`.work/c3-shots/round-two/after-settings-legibility.png`.

## 4. The dark-mode test now asserts values, and there is no second block to copy into

The critic's counterexample worked because there were two blocks and the test only compared names.
The fix removes the second block.

Every semantic token is now declared exactly once, in one `:root` rule.
A token that genuinely differs by mode says so with `light-dark(<light>, <dark>)`.
A token derived from another names no colour of its own and follows whatever that one resolved to.
`--gradient-hero`, `--gradient-warm`, `--card-foreground`, `--popover-foreground`, `--input` and `--ring` were byte-identical duplicates in `:root` and `.dark`; they are now single declarations.

`styles.test.ts` enforces four things, and I checked each one fails on the bug it exists for by mutating `styles.css` and running it:

| mutation | test that fails |
| --- | --- |
| a second `.dark` block copying the light navy gradients verbatim | declares each token once |
| `--brand-hero-overlay: oklch(...)` added beside the inputs | gives every mode-varying token two different values |
| `light-dark(X, X)` | gives every mode-varying token two different values |
| `--primary-foreground` back to `var(--background)` | writes a readable foreground on every brand colour |

The exemption is a list of ten exact names, and the test asserts that list equals the set of fields the settings form offers, minus the `*_dark` counterparts.
A new `--brand-*` token that describes an appearance rather than carrying an operator's value cannot join it by being named the right way; it has to be added to `THEME_FIELDS` as something an operator can set, or it fails.

`--sidebar-*` and `--chart-*` are deleted, sixteen declarations and eight `@theme inline` mappings.
Nothing in `src` read them; `grep` for `-sidebar` and `chart-[1-5]` outside `styles.css` returns nothing.
That is the thirteen zero-consumer tokens round one listed and left.

## 5. The smaller five

**`theme-color`'s default.**
`DEFAULT_PRIMARY` is now `oklch(0.30 0.03 250)`, the `--brand-primary` an unbranded install actually paints, so an unconfigured site reports `#222f3c` rather than the previous product's `#002c5e`.
A test reads `--brand-primary` out of `styles.css` and compares, so the hex cannot drift again rather than only being moved.

**`color-scheme`.**
`:root` declares `light`, `.dark` declares `dark`, and a media query covers the case where no class is set.
Measured: `getComputedStyle(document.documentElement).colorScheme` was `normal` before and is now `light` or `dark` to match.
`before-postnew-dark.png` and `after-postnew-dark.png` are `/admin/posts/new`: the calendar glyph in "Published at", the select arrows and the scrollbar go from light-mode furniture on a dark page to dark-mode furniture.

**Percentage alpha read as lightness.**
`colourToHex` now reads each channel's own `%` rather than testing the whole string, so `oklch(0.3 0.1 255 / 50%)` gives `#002c5e` instead of `#01000c`.

**`rgb()`, `hsl()` and named colours.**
`rgb()` and `hsl()` convert, in both the space-separated and comma-separated forms, and hex shorthand expands.
A named colour still cannot be converted without shipping a 148-entry table, so instead of falling back silently the form says so: "The browser's own title bar and the installed-app icon need a hex, oklch(), rgb() or hsl() colour. This one is used on the page, but those two fall back to the product's default."
The field's hint no longer invites "any CSS colour"; it names the four forms.

**`prefers-color-scheme` with JavaScript off.**
The dark tokens now follow `color-scheme`, which the media query sets when no class is present, so there is nothing to duplicate.
Demonstrated with every `.js` request aborted at the network layer and the operating system emulated dark: `htmlClass: ""`, `scripts: 0`, `colorScheme: "dark"`, body background `oklch(0.19 0.015 60)`.
`.work/c3-shots/round-two/nojs-os-dark.png`.

This needed one thing beyond the stylesheet.
The bootstrap script previously wrote only `dark`, so absence of a class meant light; with a media fallback, absence has to mean "follow the system" and an explicit light choice needs its own class.
The script now writes whichever choice is stored, and `ThemeToggle.tsx` writes both classes.
That file is not on my list and nobody else's either; it is two lines and it is named here because the change is not visible from the stylesheet.

Checked in all five combinations that the token layer and Tailwind's `dark:` variant agree:

| system | class | resolved |
| --- | --- | --- |
| light | none | light |
| light | dark | dark |
| dark | none | dark |
| dark | light | light |
| dark | dark | dark |

## What still works

A re-skin still needs no component edit, which was the point of the job and the thing my rewrite could most easily have broken.
`reskin-home-light.png` and `reskin-home-dark.png` are a magenta, lime, violet and cyan palette with square corners and Georgia plus Courier stacks, applied through settings, with every `*_dark` field left empty so the dark counterparts are derived.
Both modes follow; no navy and no saffron survives.

KAPE's own tokens, measured before and after this round on the same fixture: 28 of 32 identical in light, 26 of 32 in dark.
Every difference is one of the four contrast-aware foregrounds, `color-scheme`, or `--warm-foreground` in dark mode moving by 0.01 chroma because it is now one declaration rather than two that disagreed by that much.
The raw measurements are in `.work/c3-shots/round-two/resolved-{before,after}-{light,dark}.json`.

## Recorded, not fixed

As instructed.

- No `::selection` rule anywhere, so text selection uses the browser's default blue whatever the brand is.
- `manifest.json` still has `background_color: "#ffffff"`, the splash colour. White by intent, but it should follow the paper.
- `admin.index.tsx` still has `text-[oklch(0.5_0.12_80)]` for a draft badge, and the amber status pills in `DonationsTable.tsx`, `admin.campaigns.index.tsx` and `admin.forms.index.tsx`. All four are one-line swaps to `--gold`. C4 owns those files.
- `SupportersWall` derives avatar colours from a hash of the name, so it stays the same rainbow under any brand.
- `public/placeholder.svg` is still a hardcoded navy gradient, and is still the most visible thing that stays KAPE-coloured after a re-skin. Round one's second option, serving it from a route that reads `site_settings` the way `manifest.json` does, is still the right one.

## Files changed this round

```
src/components/ThemeToggle.tsx      +5 -2
src/lib/site-theme.ts               rewritten
src/lib/site-theme.test.ts          rewritten
src/routes/__root.tsx               +5 -3
src/routes/admin.settings.tsx       rewritten
src/styles.css                      token layer rewritten
src/styles.test.ts                  rewritten
```

`oklchToHex` is now `colourToHex`, which reads four colour forms rather than one.
No component was edited for styling this round; the only component change is the two lines in `ThemeToggle.tsx`.

## Gates

| gate | floor | observed |
| --- | --- | --- |
| `bun run test` | 174 tests, 21 files | 213 tests, 21 files, all passing |
| `bunx tsc --noEmit` | silent | silent |
| `bun run format` | clean | clean |

The floor's 174 had grown to 205 in the shared tree before I started; 41 of the 213 are in `site-theme.test.ts` and `styles.test.ts`.

## What I could not do

- I could not reproduce the save bug as the critic described it. What I fixed is a real, deterministic path to the same symptom, root-caused and demonstrated; if the critic's exact sequence was something else, it may still be there.
- The brand colour as *text on the page* is reported, not fixed. Fixing it means either constraining the operator's colour or adding a second "primary as ink" token and changing every call site that uses `text-primary`. Both are larger than a theming change and neither is obviously right.
- I did not re-verify round one's pixel-identity claim for KAPE, because this round deliberately changes four token values. The 28-of-32 and 26-of-32 token comparison above is what replaces it.
