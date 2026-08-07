# C8 - the settings page stops telling the operator things that are not true

Branch `cms-core`, over `58a0fe7`. Uncommitted, no git touched, worklog untouched.

Everything below was measured against a dev server on port 3211 reading a `VACUUM INTO` copy of
`kape.db` at `<scratch>/c8.db`, with `SSG_CACHE=off` and `PORT=3211`. The repo's `kape.db` was opened
read-only, once, to make that copy. Screenshots are in `.work/c8-shots/`.

## Files touched

| file | what |
|---|---|
| `src/routes/admin.settings.tsx` | three sentences, the error paths, the send filter |
| `src/lib/site-theme.ts` | `colourReach`, `checkSettingValue`, lab/lch/hwb, alpha |
| `src/lib/site-theme.test.ts` | 12 new assertions |
| `src/routes/-admin.settings.test.tsx` | new, 7 tests |
| `src/integrations/trpc/router.ts` | the `set` procedure, **plus one import line** |

That import is the only line of `router.ts` outside the procedure. There is no way to call a check
from a 900-line module without it, and putting the check inline instead would have meant copying
`THEME_FIELDS` into the router. `git diff -- src/integrations/trpc/router.ts` is 13 lines and every
one of them is either the import or inside `set`.

The route test is named with the framework's own `-` prefix, which is what
`routeFileIgnorePrefix` exists for: without it the router plugin warns on every run that the test
file is not a route.

## 1. Three groups, three sentences

`colourReach(value)` returns `"invisible"`, `"inherited"`, `"unconvertible"` or `null`, and the panel
prints one line per affected field rather than one line about `theme_primary`. The
browser-chrome clause is appended only for `theme_primary`, because only `theme_primary` reaches
`theme-color` and the manifest.

### Acceptance 1, measured in Chrome

Each value typed into Primary colour, saved through the form, then `/en` read for the computed
`--primary`, the `h1` colour, and the `h1` colour rasterised through a canvas so the alpha is visible.

| value | panel says | `--primary` on `/en` | `h1` pixel | `theme-color` | matches? |
|---|---|---|---|---|---|
| `transparent` | "paints nothing at all. Every heading, button and panel drawn in it comes out invisible." | `light-dark(transparent, oklch(0.62 0.13 250))` | `0,0,0 a=0` | `#222f3c` (product default) | **yes** |
| `currentColor` | "has no colour of its own here... it lands as whatever text colour happens to be in force rather than as a brand colour." | `light-dark(currentColor, …)` | `42,20,12 a=255`, i.e. `oklch(0.22 0.04 40)`, the page's ink | `#222f3c` | **yes** |
| `color-mix(in oklab, red, blue)` | "paints, but has no one sRGB value, so there is no legibility figure for it above." | `light-dark(color-mix(in oklab, red, blue), …)` | `140,83,162 a=255` | `#222f3c` | **yes** |
| `lab(50% 20 -30)` | nothing. Full Primary and Highlight rows instead. | `light-dark(lab(50% 20 -30), …)` | `133,108,170 a=255` | `#856caa` | **yes** |

Shots `10-` to `13-`, `-a-panel.png` for the panel and `-b-page.png` for the painted page.
The fourth row is the case that used to print nothing at all: `#856caa` in the meta tag is the same
pixel Chrome paints, so the panel's ratios, the meta tag and the screen now agree.

The old sentence said `transparent` "is used on the page". Shot `10-transparent-a-panel.png` is
what it says now, in the destructive style; `inherited` and `unconvertible` render muted, because
they are caveats rather than a blank site.

### colourToHex learned lab, lch and hwb. Deliberately

`hwb()` is three lines and reuses the existing `hslToRgb`. `lab()` and `lch()` needed a CIE Lab
transform, which is a different space from the OKLab already in the file: nineteen lines, of which
nine are the D50-to-D65 matrix CSS Color 4 specifies.

That is more than "small", so it was checked rather than reasoned about. Every accepted colour form
was converted by `colourToHex` and by Chrome, both rasterised through a 1x1 canvas and compared
channel by channel:

```
{"checked":28,"worst":0,"over1":[]}
```

28 forms, worst channel delta 0. On that evidence converting is the better fix: the panel now
reports real ratios for `lab`, `lch` and `hwb` instead of apologising, and `theme-color` carries the
real colour instead of the product default.

`color()` and the composites stay unconvertible and get the group-3 sentence. Converting
`color(display-p3 …)` means another matrix per colour space for a case nobody has typed.

### Two live falsehoods found on the way, both fixed

**A percentage chroma produced `#NaNNaNNaN`.** Measured against `58a0fe7`:

```
oklab(0.5 25% -25%)        58a0fe7: #NaNNaNNaN
oklch(0.5 50% 120)         58a0fe7: #NaNNaNNaN
```

Both are accepted by the validator, and that string went into `<meta name="theme-color">` verbatim
and into every contrast row. `scaled()` now carries each channel's own full scale (0.4 for OKLab
a/b/C, 125 for Lab a/b, 150 for LCH C), so they convert.

**A translucent colour was reported as its opaque self.** `rgb(31 78 121 / 0.5)` returned `#1f4e79`
at `58a0fe7` while `rgba(31, 78, 121, 0.5)` returned null - the same colour, two answers. What a
half-transparent brand paints depends on what is behind it, so there is no ratio to print. Both
forms are now `unconvertible` and say so. This is a behaviour change, and it replaced a number the
page could not keep its promise about; the test that guarded the original bug (alpha read as
lightness) still guards it, through `oklch(… / 100%)`.

## 2. A rejected value does not reach the database

`checkSettingValue(key, value)` in `site-theme.ts`, called from `adminSettings.set`. Rejection is a
`BAD_REQUEST` the client surfaces.

### Acceptance 2 - curl, admin session, no browser

```
### the row before
[{"key":"theme_primary","value":"oklch(0.30 0.10 255)"}]

### POST adminSettings.set theme_primary=banana
HTTP 400
{"error":{"json":{"message":"\"banana\" is not one of the CSS colour names. Try oklch(0.30 0.10 255),
 #1f4e79, rgb(31 78 121) or hsl(207 59% 30%).","code":-32600,"data":{"code":"BAD_REQUEST",
 "httpStatus":400,…,"path":"adminSettings.set"}}}}

### the row after
[{"key":"theme_primary","value":"oklch(0.30 0.10 255)"}]
any row holding banana: []
```

The whole matrix, same session, same route:

```
400  theme_primary    "banana"                                "banana" is not one of the CSS colour names. …
400  theme_primary    "unset"                                 "unset" is a CSS keyword, not a colour, …
400  theme_primary    "var(--x)"                              var() is not accepted here. …
400  theme_paper_hue  "blue"                                  Not a plain number, e.g. 0.25 or 170.
400  theme_radius     "12"                                    Not a length, e.g. 0.5rem.
400  theme_font_url   "http://evil.test/f.css"                Must be an https:// stylesheet address.
400  theme_primary    "red</style><script>alert(1)</script>"  Contains one of < > { } ; @ \ or /*, …
200  contact_email    "hello@example.org"                     stored
200  theme_primary    "lab(50% 20 -30)"                       stored
200  theme_primary    "oklch(0.30 0.10 255)"                  stored
```

A key with no theme kind is untouched, which is what keeps the open-ended settings grid working.

The client stopped sending them too. A field the form has already marked wrong is filtered out of
the batch, so the round trip cannot come back saying what is already on screen in the server's
words. Everything beside it still saves; the status line says how many were held.

The field message changed from "Saved as it is, this field is ignored and the rest of the theme still
applies" to "Until that is fixed, or the field is cleared, this one is not sent and not saved."

**No stop condition hit.** `checkSettingValue` over every row of the repo's `kape.db` (21 rows), the
scratch copy (31 rows) and all ten `theme_*` values in `src/server/seed/site.ts`: 0 rejections.

## 3. A failed read does not eat an edit, and a 401 does not offer a dead button

`if (error)` became `if (error && !saved)`. The first read has nothing to show and still stands in
for the page; after that a failure is a banner over the intact form. `create()` has a catch, and
reports into the Add setting section rather than nowhere.

### Acceptance 3 - the server actually stopped

Draft typed, `office_hours` typed into the Add key, `vite dev` killed, **Add** clicked:

```
{"secondaryStillTyped":"oklch(0.50 0.20 130)","addKeyStillTyped":"office_hours","inputs":46,
 "saveButtons":["Save identity","Save brand (1)","Save", …],
 "errors":["This setting was not added: Failed to fetch"]}
```

Shot `20-server-stopped-add.png`. Still a form, draft intact, key not retyped, one local message.
At `58a0fe7` this produced an unhandled rejection and nothing on screen.

The other half of the defect needs the write to succeed and the re-read to fail, which is what
C7's critic recorded as defect 2.2. The `set` went to the real server and really wrote; the `list`
that follows it was rejected on the app's own `fetch`, the way a connection that goes away between
two calls rejects it:

```
{"listCallsDropped":1,"secondaryStillTyped":"oklch(0.50 0.20 130)",
 "identityStillThere":"Kampuchea Action to Promote Education","inputs":48,
 "banner":["The stored values could not be re-read, so what is on screen may be out of date: Failed to fetch",
           "Nothing you have typed has been lost. Try again to reload the stored values, or carry on editing and save."],
 "actions":["Try again"]}
```

Shot `21-reread-failed-banner.png`.

### Acceptance 4 - what actually produces a 401, measured

**The shell does catch a session that is already dead.** Every row deleted from `sessions`, then a
client-side navigation from `/admin` into Settings:

```
sessions before: 7   sessions after: 0
"clicked Settings"
http://localhost:3211/login
```

Redirected. So the contract's suspicion is half right: you cannot *arrive* at this page with a dead
session.

**It is reachable once the page is already open**, and this is a real 401, not an injected one:

1. Page loaded, session valid, one re-read dropped so a **Try again** exists (the shot 21 state).
2. `delete from sessions` - the session ends while the page sits there.
3. Operator clicks **Try again**. `adminSettings.list` goes out with a cookie the server no longer
   honours and comes back 401.

```
{"messages":["Your session has ended, so the stored values could not be re-read. Everything on screen
  is still here, but nothing will save until you sign in again."],
 "tryAgain":false,"signIn":["/login"],"stillAForm":48}
```

At t=20s, unchanged, 48 inputs, 0 readOnly. Shots `22-401-t0.png` and `23-401-t20s.png`.

So the branch is not unreachable and does need a message. The word `UNAUTHORIZED` is gone, the dead
**Try again** is replaced by a **Sign in again** link to `/login`, and the form stays up because the
drafts are still in React state.

`admin.modules.tsx:47` and `:114` have the identical defect. **Not touched.** `ReadError` and
`readFailureSentence` in `admin.settings.tsx` are the shape it can take: an `error`, a `firstLoad`
flag and an `onRetry`. Lifting them into a shared component is a job, not a line.

`src/lib/save-error.ts` already maps `UNAUTHORIZED` for the *save* path, with a sentence that ends
"then save" - wrong for a read. The settings page uses the same bare-code convention and its own
sentence rather than importing a save-shaped one.

## 4. Tests

`-admin.settings.test.tsx` is the first test to mount a route file. **No dependency was added:**
`@testing-library/react`, `@testing-library/dom` and `jsdom` are already devDependencies and already
used by `AnnouncementPopup.test.tsx`.

One wrinkle worth recording. `Route.options.component` is a `Lazy` wrapper once the Start plugin has
split the route, and it never resolves under vitest - it suspends for ever (measured: 5s timeout,
fallback still on screen). Exporting the component from the route file works but makes the plugin
warn that the route will no longer code-split. The test imports the split chunk by the plugin's own
id instead:

```ts
const COMPONENT_CHUNK = "./admin.settings?tsr-split=component";
```

which is the component that actually ships, with no source change and no bundle cost. If that id
changes the import throws by name.

### Acceptance 5 - every assertion mutation-tested

Unmutated, `-admin.settings.test.tsx` + `site-theme.test.ts`:

```
 Test Files  2 passed (2)
      Tests  64 passed (64)
```

Each mutation applied to the real file, the pair re-run, the file restored:

| mutation | tests killed |
|---|---|
| M1 `.catch` on the read drops the error | 4: both first-load tests, both re-read tests |
| M2 `setError(null)` removed from `refresh` | 1: `recovers when the retry works` |
| M3 `if (error && !saved)` back to `if (error)` | 1: `keeps the unsaved edit visible and keeps the page a form` |
| M4 `signedOut` forced false | 1: `offers a way back in rather than a retry that can only fail again` |
| M5 the send filter removed | 2: `marks the field and sends nothing`, `still saves the fields beside it` |
| M6 `create()`'s try/catch removed | 1: `says the setting was not added instead of failing silently` |
| M7 the server check removed | **0 - survived** |
| M8 `transparent` no longer classified | 1: `separates a colour that paints nothing from one that paints` |
| M9 lab's percentage scale 125 -> 100 | 1: `reads a chroma written as a percentage of its own scale` |
| M10 alpha ignored again | 2: `refuses to reduce a translucent colour to one hex`, `marks a colour that paints but has no one sRGB value` |

Full log with counts and names: `<scratch>/c8/mutation-log.txt`, reproduced by `<scratch>/c8/mutate.ts`.

Two mutations survived the first pass and were closed by tightening the tests, not the code:
M2 (the recovery test only looked for the whole-page wording, so the banner slipped past it) and
M6 (no test made the *write* fail, only the read that follows it).

**M7 still survives, and it is a real hole.** Nothing in the suite proves the procedure calls
`checkSettingValue`. Acceptance 2 proves it against a running server, and `site-theme.test.ts` pins
what `checkSettingValue` returns, but the wire between them is ungated: delete the two lines in
`router.ts` and 256 tests still pass. Closing it needs an in-process tRPC caller with a temp
database and a faked admin context - `src/server/repo/admin-guards.test.ts` does the nearest thing
today by spawning subprocesses. That is a second new test file in a file I do not own, so it is
reported rather than done. It is the one gap in this job's coverage.

### Acceptance 6 - gates

| gate | started at `58a0fe7` | now |
|---|---|---|
| `bun run test` | 239 tests / 21 files | **256 tests / 22 files** |
| `bunx tsc --noEmit` | exit 0, silent | exit 0, silent |
| `bun run format` | 246 files, no fixes | **247 files, no fixes** |

The 247th file is the new route test. All three re-run after the mutation suite restored the tree.

### Acceptance 7 - no KAPE pixel moved

`themeCss`, `themeColor`, `themeFontUrl` and `themeContrast` computed by the tree and by the
`58a0fe7` copy of `site-theme.ts`, over the real stored settings:

```
themeCss       identical=true
themeColor     identical=true
themeFontUrl   identical=true
themeContrast  identical=true

themeCss emitted: :root{--brand-primary:oklch(0.30 0.10 255);--brand-primary-dark:oklch(0.62 0.13 250);
--brand-secondary:oklch(0.72 0.17 55);--brand-secondary-dark:oklch(0.74 0.17 55);
--brand-accent:oklch(0.68 0.19 35);--brand-accent-dark:oklch(0.70 0.19 35);
--brand-highlight:oklch(0.78 0.14 80);--brand-highlight-dark:oklch(0.80 0.14 80);
--paper-chroma:1;--paper-hue:0}

SSR :root block equals themeCss: true
SSR theme-color: #002c5e
```

Over `src/server/seed/site.ts`'s ten values the same four functions are byte-identical too, sha256
`46dfe2c6…` before and after, and all fourteen contrast ratios match to four decimals. The SSR
`<style>` is `themeCss` and nothing else in the diff touches rendering, so identical output means
identical paint. `01-baseline-en.png` and `02-after-en.png` are the site before and after; their PNG
bytes differ because the hero rotates and images lazy-load, which is why the token comparison above
is the real check.

A new test reads the palette out of `src/server/seed/site.ts` rather than copying it, so a re-skin of
the fixture cannot quietly stop being covered by the check that now runs on the way into the database.

## Found, not fixed

1. **The grid's row Save has no error path.** `save(key, value)` at `admin.settings.tsx` awaits the
   mutation with no catch, exactly as `create()` did. Measured with the write dropped:
   `{"unhandled":["TRPCClientError: Failed to fetch"],"anyVisibleError":[]}` - an unhandled rejection
   and nothing on screen. Same class as C7 critic defect 2.3, one function along, and outside this
   job's four sections.
2. **`admin.modules.tsx` still prints `UNAUTHORIZED` with a dead Try again.** Confirmed, untouched,
   as instructed.
3. **M7**, above: the trust boundary has no regression gate.
4. The pre-ready window is unchanged. Typing into a field before the list arrives is still discarded;
   the field is `readOnly` and says "Reading the stored values…". Not this job.

## Left the way it was found

`transparent` and `currentColor` stay accepted, as decided. `hsl(207deg 59% 30%)` works;
`rgb(from #1f4e79 r g b)` does not. `admin.modules.tsx`, the dark-mode guard test's five holes and
the 218 `bun run check` lint errors are all untouched.
