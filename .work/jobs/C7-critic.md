# C7's critic - break the closed list and the retry

## Your position

You are auditing C7 in a fresh context. **Do not read `.work/c7-report.md`.** Given the builder's account first, a critic confirms it; given only the contract, it attacks. That rule has caught a defect in every round of this project and the builders' own self-checks have caught none.

Read `.work/jobs/C7-validator-and-settings-load.md` for what was asked, and `.work/c3-critic-r2.md` sections 1 and 2 for the measured evidence of the two defects it was sent to fix. Then audit the working tree and the running app yourself.

You are read-only on `src/`. A defect you find is a finding, not a fix.

## The two claims to disprove

**1. "A typo can no longer blank the theme."**

The old validator accepted any three-to-twenty letter word. The fix is meant to be a closed list of the 148 CSS named colours, with `COMPOSITE` anchored at both ends.

The failure mode to hunt is the mirror of the original: a list that is now too narrow. Try every named colour, not a sample. Try `REBECCAPURPLE`, `RebeccaPurple`, `AliceBlue`, leading and trailing whitespace, `currentColor` in both casings, `transparent`. A validator that rejects a colour KAPE or any real operator would type is a worse bug than the one it fixes, and the contract says so.

Then try to get past it anyway:

- the original bypass list: `banana`, `notacolour`, `lorem`, `unset`, `initial`, `none`, `var(--brand-primary)`, `var(--primary)`, `color-mix(in oklab, red, blue) 0 0 0 red`, `var(--x) !important`
- nesting the junk one level down, where a prefix check will not look: `light-dark(banana, red)`, `color-mix(in oklab, banana, red)`, `var(--primary, banana)`
- self-reference: `theme_primary = var(--primary)`, and any cycle you can build across two settings
- syntax the browser accepts that the list may not: `color(display-p3 1 0 0)`, `rgb(from #1f4e79 r g b)`, `hsl(207deg 59% 30%)`. The last one was rejected before while `colourToHex` handled it, so check whether that gap closed or widened.

**The measurement that settles it is the painted page, not the return value.** For anything the validator accepts, check that the browser actually paints it: `getComputedStyle` on `--primary`, `--primary-foreground`, `--warm-foreground`, `--gradient-hero` and `--shadow-lift`. A value that passes validation and computes to `rgba(0,0,0,0)` is the original defect wearing a different word. Check that `themeContrast` reports a ratio for everything the validator now accepts, and that the Legibility panel's message matches what the page actually did.

**2. "A failed load no longer bricks the settings page."**

The shape being copied from `admin.modules.tsx` is: null until read, failure shown, retry offered, Save absent before a successful read.

Abort `adminSettings.list` the way the previous critic did, and then push on the parts a builder testing the happy path would not:

- fail the retry itself, twice, and check the page still offers a way forward
- succeed after a failure, and check the error clears rather than sitting under a loaded form
- a 401 from an expired session, not just a network abort. Does the operator learn they are signed out?
- fail the load on one field group and not another, if the page issues more than one query
- type into the form during the pre-ready window, which was already lossy and is the thing most likely to have regressed

Then check the fix did not cost anything: the previous critic proved that 1, 2 and 5 field edits, across Identity and Brand, each produced exactly N `adminSettings.set` mutations with correct payloads and "Saved N fields". Re-run that. A page that is now safe on failure and drops an edit on success is a worse trade.

## The tests

Read the assertions C7 added and judge whether they prove the property or exercise the fix. This project has three cases on record where a test passed on exactly the bug it was written to catch.

Mutate the code yourself, in a scratch copy: put `KEYWORD = /^[a-z]{3,20}$/i` back, unanchor `COMPOSITE`, remove the `catch`, remove the `finally`. Each one must fail a test **by name**. Anything that survives a mutation is an assertion nobody has ever seen fail.

## KAPE still installs

Seed KAPE and check every theme value in its fixture passes the new validator, and that the site paints as it did. The contract's stop condition was that a closed list rejecting a value KAPE itself uses must be reported, not worked around by widening the list. Verify which happened.

## Gates, observed rather than reported

Run them: `bun run test` (floor 225 tests over 21 files), `bunx tsc --noEmit`, `bun run format`. Report what you observe, not what you are told.

## Deliverable

Your findings, per claim, with the evidence inline. For each defect: what you did, what the app did, and the severity. Screenshots for anything visual. Say plainly which of the two claims hold and which do not.

If both hold, say so and name what you tried that failed to break them. A critic that finds nothing has still done the job, but only if it says where it looked.

## Stop conditions

- Never run against the repo's `kape.db`. `VACUUM INTO` a copy, `export DATABASE_PATH`, `export SSG_CACHE=off`.
- Do not edit anything under `src/`. Do not commit, do not touch git, do not edit the worklog.
- Do not read `.work/c7-report.md` at any point, including after you have formed your own view.
