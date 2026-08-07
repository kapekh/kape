# C7 - a typo cannot blank the theme, and a failed load cannot brick the settings page

**The work is finished and it is not in the working tree.**
A second agent was editing all three of my owned files while I worked, so I built in an isolated copy of the repo rather than overwrite uncommitted work I did not write.
Read section 0 before anything else.

## 0. Collision

The briefing said the tree was clean at `ac927de` and that nothing would move under me.
Both halves were false from about ninety seconds into the session.

| time | what happened |
|---|---|
| 09:36:32 | my baseline `bun run test`: 21 files, 225 tests, clean tree |
| 09:36:43 - 09:39:06 | `admin.settings.tsx`, `site-theme.ts` and `site-theme.test.ts` all modified by another process |
| 09:37:14 | `.work/jobs/C7-critic.md` appears |
| 09:43:37 | all three files revert to HEAD |
| 09:44:23 | the other agent's version is back |
| 09:58:20 | `admin.settings.tsx` modified again |

The other agent is doing this same job. Its version at 09:45 is saved at
`/tmp/claude-1000/-home-userx-workspace-kape/f0cf170d-50cc-4f48-975a-ebdf1837b135/scratchpad/other-agent-v2/`.
I did not delete, revert or overwrite any of it.

Against the contract's acceptance, that version does not close the defect:

- `COMPOSITE = /^(?:color|color-mix|light-dark|var)\(.*\)$/i` still accepts `var(--primary)` inside `--brand-primary`, which is the self-reference the contract names explicitly, and it never looks inside the brackets, so `light-dark(banana, red)` and `color-mix(in oklab, banana, red)` pass.
- `NAMED_COLOURS` is a `Set` of names with no hexes, so `colourToHex` and `themeContrast` still disagree with the validator: a colour typed by name is accepted, painted, and then reported by neither `theme-color` nor the Legibility panel. The contract required those three to agree.
- On a failed load its fields stay rendered and `readOnly` ("the fields stay locked"), which is what acceptance 4 asks to end, and it is not the `admin.modules.tsx` shape the briefing asked me to match.
- Its assertions check only `/Not a colour/`, so they pass on any rejection whatever the reason, and there is no table of accepted values - the mirror failure the contract calls the worse bug.

None of that is a criticism of the agent; it is what two agents on one contract produces. **Somebody has to pick one.**

## Where my work is

- Whole files, ready to copy over: `.../scratchpad/c7-deliverable/files/{site-theme.ts, site-theme.test.ts, admin.settings.tsx}`
- Diff against `ac927de`: `.../scratchpad/c7-deliverable/c7.patch` (725 lines)
- The isolated build tree the gates and the browser proofs ran in: `.../scratchpad/c7/`
- Screenshots: `.work/c7-shots/`

Full scratchpad root is `/tmp/claude-1000/-home-userx-workspace-kape/f0cf170d-50cc-4f48-975a-ebdf1837b135/scratchpad`.

The patch will not apply on top of the tree as it stands, because the tree holds the other agent's version of the same three files.
Decide first, then copy the files.

## 1. The validator

`KEYWORD = /^[a-z]{3,20}$/i` is gone. `COMPOSITE` is gone. What replaces them:

**A closed table of the 148 CSS colour names with the sRGB hex each resolves to.**
Not just the names, because the contract requires `colourToHex` and `themeContrast` to agree with whatever the validator accepts, and a name with no hex is a colour the page paints and the Legibility panel says nothing about.

**A recursive `colourProblem(v)`** that returns the reason or `null`. Composites are parsed, not prefix-matched:

- `light-dark(a, b)` - exactly two arguments, each recursively a colour
- `color-mix(in <space>[ <method> hue], c1[ %], c2[ %])` - three arguments, the first a colour space, the other two recursively colours with an optional percentage on either side
- `color(<profile> n n n[ / a])` - a named profile or a `--custom` one, three numbers, optional alpha
- anything after the closing bracket is a rejection, because the anchor is `$`

**`var()` is dropped.** It was a real feature for someone chaining tokens and a guaranteed footgun: `--brand-primary: var(--primary)` is a cycle that paints nothing, and at validation time there is no way to tell a token that exists from one that does not. Nothing in KAPE's fixture or anywhere in `src/` uses it. Dropping it means there is no cycle to catch rather than a cycle caught.

**The CSS-wide keywords are refused**, with their own message. On a custom property `initial`/`unset`/`inherit`/`revert` do not mean "the product's default" - they make the property guaranteed-invalid, which is the same blank page `banana` gives. Clearing the field is how an operator asks for the default, and that already worked.

**`transparent` and `currentColor` are accepted**, as the contract directed. They are the only two accepted colours with no fixed hex, so `colourToHex` returns `null` for them and the form's existing "the browser's own title bar needs a hex" message says exactly the true thing. Worth naming: `transparent` in the primary field still paints nothing. It is a valid CSS colour and a deliberate choice rather than a typo, so it is refused nowhere - but if the intent was "no value can blank the theme", that is the one remaining way.

Each rejection names what is wrong. On the live form, `banana` reads:

> "banana" is not one of the CSS colour names. Try oklch(0.30 0.10 255), #1f4e79, rgb(31 78 121) or hsl(207 59% 30%). Saved as it is, this field is ignored and the rest of the theme still applies.

### How the 148 names were established

A unit test cannot know the right hex without a second copy of the table, so the table was checked against a browser and the suite pins it to that check.

- **Every name and every hex diffed against Chrome.** 148 names set on a canvas context; all 148 resolved to exactly the hex in the table, zero mismatches.
- **Completeness swept, not assumed.** 33,352 morphologically plausible candidates (every one- and two-atom concatenation of the naming vocabulary) tested with `CSS.supports('color', n)`. Nothing outside the table is a CSS colour. The canvas pass had flagged `lightslateblue` and `violetred`; both are Chrome canvas-only X11 leftovers and `CSS.supports` rejects both, so they are correctly absent.
- **`is the table that was checked against a browser`** asserts a sha256 of the table block, so any edit to any entry fails with a message telling you to re-diff rather than reason about it. This exists because mutating `thistle #d8bfd8` to `#d8bfd9` failed nothing before it.

### KAPE's own values

All 10 `theme_*` values in `src/server/seed/site.ts` pass, 0 rejected, checked by running `checkThemeValue` over the values parsed out of the seed file. The list was not widened to fit anything.

## 2. `refresh()` in the settings page

Matched to `admin.modules.tsx` at `2f392fe`, as instructed:

- `saved` and `rows` are `null` until the read succeeds; `loading` is derived (`!saved`) rather than a separate flag that can disagree with them.
- `refresh` is a `useCallback` with `.catch`, so the failure ends the loading state by construction rather than by remembering a `finally`.
- On failure the page renders the heading, the reason and one **Try again**. Every section on this screen reads the same one query, so there is nothing to show and nothing to type into; keeping the form up with its fields `readOnly` is exactly how it used to sit there looking busy for ever. No input is stuck `readOnly` because no input is rendered.
- Save cannot exist before a successful read.

The pre-ready typing window is unchanged: greyed fields, `readOnly`, "Reading the stored values…", Save disabled. Still lossy, still visibly refused rather than silently accepted. I did not widen this; the contract called it the lower bar.

## 3. Browser proofs

Dev server on 3225 against a `VACUUM INTO` copy of `kape.db` with the admin password reset **in the copy**, `SSG_CACHE=off`, `DATABASE_PATH` pointed at the copy. The repository's `kape.db` was opened read-only and is unchanged. The copy has no `theme_*` rows, so the baseline is the product's own slate.

### Acceptance 3 - `theme_primary = banana`

Typed into the real form, saved with the real button, measured from painted pixels with a probe element rather than from `getPropertyValue`.

`02-banana-field-error.png` - the field is red, `aria-invalid="true"`, and the message names the word.

Saved: `Save brand (1)` → "Saved 1 field.", and the row `theme_primary = banana` is in `site_settings`.

`03-public-after-banana-saved.png` - the public page with `banana` stored:

| token | baseline (nothing set) | with `banana` stored |
|---|---|---|
| `--primary` | `oklch(0.3 0.03 250)` | `oklch(0.3 0.03 250)` |
| `--primary-foreground` | `oklch(0.985 0.003 250)` | `oklch(0.985 0.003 250)` |
| `--warm-foreground` | `oklch(0.24 0.02 250)` | `oklch(0.24 0.02 250)` |
| `--gradient-hero` | 3-stop linear-gradient | same 3-stop linear-gradient |
| `--shadow-lift` | `oklch(0.3 0.03 250 / 0.35) …` | same |
| emitted `:root` block | none | **none** |

Byte-identical, and no `:root{--brand-*}` is emitted at all.

**The same page with the old validator swapped back in** (`04-public-banana-OLD-validator.png`), which is the mutation test for this half:

- `:root{--brand-primary:banana}` **is** emitted
- `--gradient-hero` → `none`, `--shadow-lift` → `none`
- `--primary`, `--primary-foreground` and `--warm-foreground` all collapse to the same fallback

On screen: the navy utility bar loses its fill, the "Explore impact stories" CTA loses its pill entirely, the hero panel loses its gradient and shows the image's alt text, and the news card headline goes black-on-navy. Side by side with `03-` that is the defect and its absence.

**One thing to decide.** The value *is* stored; it is dropped when the CSS is emitted, not at save time. That is C3's accepted design ("one bad value drops only itself") and the field says so in as many words, and blocking the save would stop four good brand fields landing because the fifth has a typo. If the contract's "the value is not written" meant the database row, this does not do that, deliberately.

### Acceptance 4 - a failed `adminSettings.list`

`adminSettings.list` rejected at `fetch`. Not a stub of the component: the real page, the real tRPC client, a real network failure.

`05-settings-load-failed-t20s.png`, measured at t=20s:

| | HEAD (`08-settings-bricked-HEAD-t20s.png`) | this change |
|---|---|---|
| inputs on the page | 26 | **0** |
| `readOnly` inputs | 24 | **0** |
| "Loading…" still shown | yes | no |
| Save identity / Save brand | present, disabled | absent |
| error anywhere | **none** | "This site's settings could not be read, so nothing here can be changed yet: Failed to fetch" |
| way forward | none | **Try again** |

The HEAD column reproduces the round-two critic's measurement exactly.

Then the parts a happy-path test would not reach:

| step | result |
|---|---|
| Try again, still blocked | 2nd call made, error still shown, Try again still there, 0 inputs |
| Try again, still blocked | 3rd call made, same |
| Try again, unblocked | 4th call, **46 inputs, 0 readOnly, error cleared**, 20 rows in the raw table, Save identity and Save brand back |
| real 401 (cookies stripped from that one request) | loading ends, "…could not be read…: UNAUTHORIZED", Try again |

`06-settings-recovered-after-retry.png`, `07-settings-expired-session-401.png`.

The 401 message is honest and not friendly: an operator reads `UNAUTHORIZED` rather than "your session expired, sign in again". `admin.modules.tsx` renders `err.message` the same way, so fixing it means fixing both, and I was told to match that screen rather than diverge from it. Recorded, not done.

### No regression on the happy path

Re-ran the round-two critic's check with real keystrokes into the real fields:

- 1 field edited → `Save brand (1)` → exactly 1 `adminSettings.set` → "Saved 1 field."
- 2 fields edited → `Save brand (2)` → exactly 2 → "Saved 2 fields."

The 5-field case was not reached: the Chrome session dropped mid-run three times during this work and I stopped re-running it rather than spend the budget. 1 and 2 hold with the right payloads and the right status line.

Pre-ready typing, with real keystrokes: field `readOnly`, value stays empty, "Reading the stored values…", Save disabled, and after the load the field holds the stored value. Unchanged from before.

**One methodology note, because it nearly shipped a false proof.** My first pre-ready test drove the field with a synthetic `input` event, which bypasses `readOnly` entirely - it reported the edit surviving the load, which a real keyboard cannot do. Every field interaction reported above uses real key events.

## 4. Mutation testing

Every assertion added was watched failing on the bug it exists for. Nine mutations, each failing a test **by name**:

| mutation | test that failed |
|---|---|
| M1 put `/^[a-z]{3,20}$/` back | `refuses a word that is not a colour name, and says which word`, `drops a word that is not a colour and keeps one that is`, `refuses junk nested inside a composite colour` |
| M2 unanchor the composite (prefix-only) | `refuses var(), and refuses anything trailing a composite colour`, `accepts the composite colours that are actually well formed`, `accepts the colour forms an operator would type` |
| M3 accept `var()` again | `refuses var(), and refuses anything trailing a composite colour` |
| M4 stop recursing into composite arguments | `refuses junk nested inside a composite colour` |
| M5 misspell one name in the table | `carries the values a person would check by hand` + 5 others |
| M6 wrong hex on `navy` | `carries the values a person would check by hand`, `reads a colour typed by name` |
| M7 `colourToHex` stops reading names | `accepts every CSS colour name, whatever the casing`, `reads a colour typed by name`, `measures a colour typed by name` |
| M8 allow the CSS-wide keywords | `refuses a word that is not a colour name, and says which word` |
| M9 wrong hex on `thistle` (a name nothing hand-checks) | `is the table that was checked against a browser` |

**M9 is why the checksum test exists.** Before it, a wrong hex on 144 of the 148 names failed nothing: every other assertion reads the table out of the same source it is checking. M6 only failed because `navy` happens to be one of the four hand-checked entries. That is the shape of the three tests this project has on record that passed on their own bug, and it was live in my own work until I mutated for it.

Acceptance 4 has no unit test - it is a route component, and the contract says so. Its mutation is the HEAD component in a browser, in the table above.

## 5. Gates

Observed in the isolated build tree (`.../scratchpad/c7/`), not in the repo, because the repo holds the other agent's code.

| gate | floor | observed |
|---|---|---|
| `bun run test` | 225 tests / 21 files | **237 tests / 21 files, all pass** |
| `bunx tsc --noEmit` | silent | **silent** |
| `bun run format` | clean | **clean** - "Checked 246 files. No fixes applied." |

Twelve tests added, none removed.

One trap: with the dev server running, five unrelated tests (`no-brand`, `install`) time out at 5000 ms on CPU contention. With it stopped, 237/237. If a gate run shows those five failing, stop the dev server before believing it.

## 6. Tests changed rather than added

Two existing assertions asserted the behaviour this job was told to change, so they were rewritten rather than deleted:

- `colourToHex` "says so rather than guessing at a name it cannot read" asserted `colourToHex("rebeccapurple") === null`. It now reads `#663399`, and the "cannot read" case is `transparent` and `currentColor`, which is what it actually is.
- `themeContrast` "skips a colour it was not given or cannot read" asserted `themeContrast({theme_primary: "rebeccapurple"}) === []`. It now reports four rows for a named colour, and the skip cases are `currentColor` and `banana`.

Both changes are the "colourToHex and themeContrast must agree with the validator" requirement in the contract, section 1.

## 7. Out of scope, confirmed left alone

- The contrast flip on `--accent-foreground`. Not touched, not reverted.
- The dark-mode guard test's five holes.
- The ThemeToggle SSR icon.
- Legacy `rgba(r, g, b, a)`: still accepted by the validator, still `null` from `colourToHex`. Named as out of scope, and it is the one remaining disagreement between the two.
- `hsl(207deg 59% 30%)`: still rejected by the validator although `colourToHex` handles `deg`. Stricter than the converter, so it is safe, but it is a real gap and it did not close.
