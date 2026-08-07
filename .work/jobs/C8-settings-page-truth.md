# C8 - The settings page stops telling the operator things that are not true

## Objective

C7 closed the validator. What is left is the page around it, and every remaining defect is the same
shape: the screen states something confidently that is false. A colour that paints nothing is
described as "used on the page". A session that expired is reported as `UNAUTHORIZED` with a Try
again that can never succeed. A colour the field just rejected is written to the database anyway.

You are done when every message on that page is true of the state it describes, and when a test can
see the page at all.

Evidence is in `.work/c7-critic-r1.md`, measured in Chrome, and the findings are confirmed. Do not
re-litigate them.

## Files you own

- `src/routes/admin.settings.tsx`
- `src/lib/site-theme.ts`
- `src/lib/site-theme.test.ts`
- `src/integrations/trpc/router.ts`, **only** the `adminSettings.set` procedure at line 919
- one new test file for the route, yours to name
- `.work/c8-report.md`, `.work/c8-shots/`

Nothing else. `src/components/Header.tsx` and `src/components/NavLink.tsx` are J22's and live right
now. `src/routes/admin.media.tsx`, `src/routes/api.media.$.tsx`, `src/server/storage.ts` and
`src/components/admin/Media*.tsx` are J23's. If you need one of them, stop and report.

`router.ts` is 900+ lines and shared by every admin screen. Touch the one procedure. A diff that
reaches any other line of that file will be reverted whole.

## 1. A colour that paints nothing must say so

**Rithy has decided this. Do not reopen it.** `transparent` and `currentColor` stay accepted by
`checkThemeValue`. What changes is that the page stops claiming they are visible.

`admin.settings.tsx:200-206` currently prints, for a value it cannot convert:

> This one is used on the page, but those two fall back to the product's default.

For `transparent` that is exactly backwards. The critic measured `--primary` at `rgba(0,0,0,0)`, the
hero gradient transparent, the `h1` invisible, and this sentence underneath it.

Three groups need three different sentences, and the code needs to be able to tell them apart:

- **Paints nothing.** `transparent`, and `currentColor` in a `:root` custom property where there is
  no inherited colour to take. Accepted, and warned about in words an operator can act on.
- **Paints, but no fixed sRGB value.** `color-mix`, `light-dark`, `var()` if you kept it. The
  existing sentence is correct for these and stays.
- **Paints, and convertible.** No warning at all.

`admin.settings.tsx:181-182` only ever inspects `theme_primary`. The critic listed nine accepted
forms reporting zero legibility rows across the brand fields; `lab`, `lch`, `hwb`, `color()` and
legacy `rgba` with alpha are all in that list. Widen the check to every field `themeContrast` is
supposed to cover, and decide deliberately whether `colourToHex` should learn `lab`, `lch` and `hwb`
rather than the panel apologising for them. Converting them is the better fix if it is small; say
which you chose and why.

## 2. A rejected value must not reach the database

`admin.settings.tsx:149` tells the operator "Saved as it is, this field is ignored". It is honest
about what happens and what happens is wrong. C7's acceptance 3 asked that the value not be written.

`integrations/trpc/router.ts:919-922`: `adminSettings.set` takes `z.object({ key, value })` and
upserts whatever arrives. **The validator only exists in the browser.** Anything with a session can
write `theme_primary = banana` over the API and blank the site, and the page's own field error is
advisory. That is the trust boundary, and it is where the check belongs.

Validate on the server, in that procedure, for the keys that have a `kind`. A rejected value is an
error the client surfaces, not a row. Then the field message can stop offering to save it.

Keep the client check. It is what makes the error appear as you type. It is no longer the only one.

## 3. A failed read must not eat an unsaved edit, and a 401 must not offer a dead button

Two separate paths through the same error state at `admin.settings.tsx:320-343`.

- **`create()` at 284-292 has no `catch`.** It adds a custom setting, then calls `refresh()`. A
  failure there replaces the entire page with the error screen, headed "Site identity", and whatever
  the operator had typed into the brand fields is behind it. Retry restores it, so the draft is not
  lost, but the screen does not say so and nobody would guess. A failed re-read after the page has
  already loaded once is a banner over the form, not a replacement for it. The first load is the
  only case where there is genuinely nothing to show.
- **A real 401 shows the operator the word `UNAUTHORIZED`** and a Try again that will fail the same
  way for ever. `admin.modules.tsx:47` and `114` have the identical defect, so whatever you land
  here should be the shape both screens can use - but you own only the settings page. Note the
  match in your report; do not edit `admin.modules.tsx`.

  The admin shell already redirects an expired session before this code runs. Find out what is
  actually reaching this catch, in a browser, before you design the message for it. If the shell
  catches every real expiry then the 401 branch is unreachable and the honest fix is smaller than it
  looks - say so with evidence rather than adding a message nobody will see.

## 4. A test must be able to see this page

**No test imports any route file.** The `catch` and `finally` mutations in this component are
unkillable, and C7's claim 2 rested entirely on browser screenshots. Real evidence, but not a
regression gate: nothing stops the next agent deleting the error branch.

Land the first test that mounts `admin.settings.tsx` with a stubbed `trpcClient`. Three cases are
enough to be worth the setup:

1. The query rejects on first load. The error and a Try again are in the document; the inputs are not
   stuck pretending to load.
2. The query rejects on a re-read after a successful load. A draft value typed before the failure is
   still in its input.
3. A rejected colour renders its field error and the value is not sent.

Check what test-environment machinery already exists before you add any. If mounting a TanStack
Start route needs a testing library this repo does not have, **stop and report what it would cost**
rather than adding a dependency. That is Rithy's call, not yours.

Every assertion you write gets mutation-tested: break the line it covers, watch the named test fail,
put it back. A test that passes against the broken code is worse than no test.

## Acceptance

Each one is a demonstration. Run it, paste the output.

1. Set `theme_primary` to `transparent`, then `currentColor`, then `color-mix(in oklab, red, blue)`,
   then `lab(50% 20 -30)`, in a real browser against a running server. For each: screenshot the
   Legibility panel and the painted page, and say whether the sentence shown matches the pixels.
2. `curl` or a tRPC call sets `theme_primary = banana` with a valid admin session, bypassing the
   browser entirely. Paste the response and then the row from the database. The write must not be
   there.
3. Type into a brand field, add a custom setting with the server stopped, and screenshot what the
   operator sees. The typed value must still be visible and the page must still be a form.
4. Reproduce whatever actually produces a 401 on this page, or prove it cannot happen. Screenshot at
   t=20s either way.
5. The three route tests, each shown failing against a deliberately broken line and passing against
   the fixed one. Paste both runs.
6. `bun run test` at or above 239 over 21 files. `bunx tsc --noEmit` silent. `bun run format` clean
   over 246 files. Report the counts you started from and ended with.
7. Every KAPE fixture value still validates and `themeCss` over the fixture is byte-identical to
   before your change. `.work/c7-deliverable/evidence/` has the harness C7 used. A KAPE pixel moving
   is a stop condition, not a trade-off.

## Out of scope

- The `transparent` and `currentColor` accept/reject decision. Decided above. Implement it.
- `admin.modules.tsx`, which has the same 401 defect. Report the match, change nothing.
- The dark-mode guard test's five holes, and an invalid-but-safe CSS value swallowing its own rule
  and the next one. Both real, both recorded in `.work/LEAD.md`, neither is this job.
- `hsl(207deg 59% 30%)` works now. `rgb(from #1f4e79 r g b)` still does not. Leave it.
- The 218 `bun run check` lint errors. A separate job owns them.

## Stop conditions

- **Never run against the repo's `kape.db`.** `VACUUM INTO` a copy, `export DATABASE_PATH` to it,
  `export SSG_CACHE=off`. A dev server on the repo default migrates it and no worker can prevent
  that. Do not `cp` the file - it is WAL-mode and a bare copy silently drops the `-wal`.
- Do not commit, do not touch git, do not edit the worklog.
- Do not add a dependency. If a test needs one, stop and report the cost.
- If server-side validation turns out to reject a value KAPE itself has stored, stop and report it
  rather than widening the rule to fit.
- If `git status` shows `src/lib/site-theme.ts` already modified when you start, another agent is in
  your files. Stop and report. This has happened before and cost a full job.
