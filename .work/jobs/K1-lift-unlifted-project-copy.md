# K1 - Lift the project copy the seed left behind

## Objective

24 of KAPE's 26 projects ship a placeholder body. For 8 of them the real copy has been sitting on
the client's prototype the whole time and was never brought across. This job extracts those 8 and
leaves them ready to seed.

`src/server/seed/projects.ts:33` defines `TAIL`, the placeholder, and its comment says the summary
and meta description are the same sentence "on every source route but dep and iep". That is true of
the two parent projects. It is not true of their children, and that is the gap.

You are done when the real copy for all 8 is extracted, verified against the rendered page, and
written to `.work/kape-copy/projects.json` in a shape the seed can consume.

## Files you own

- `.work/kape-copy/` in full, yours to create
- `.work/k1-report.md`

**Nothing under `src/`.** J12 is live and the linter touches every source file. You extract only;
applying to `src/server/seed/projects.ts` is a follow-up job after J12 lands. If you believe the
extraction cannot be verified without editing the seed, stop and report that.

## The 8, with the chunk each one's copy lives in

The prototype is a client-rendered SPA at `https://kapecambodia.lovable.app`. Page HTML is a shell;
the copy is bundled in a per-route JS chunk. Both routes below are confirmed reachable.

| project | route | prose in chunk |
|---|---|---|
| DWD | `/current-projects/iep/dwd` | 1977 |
| AIR | `/current-projects/dep/air` | 1707 |
| IDEAL | `/current-projects/dep/ideal` | 1642 |
| Lotus Outreach | `/current-projects/iep/lotus-outreach` | 1572 |
| CTSP | `/current-projects/iep/ctsp` | 1491 |
| MIDL | `/current-projects/dep/midl` | 1461 |
| CamScam | `/current-projects/dep/camscam` | 1439 |
| DViTSA | `/current-projects/dep/dvitsa` | 1365 |

Chunks are already downloaded to `/tmp/kaudit/chunks/`, and the chunk list comes from
`assets/index-Cc67oJRE.js`. Re-download if that directory is gone.

## Do

1. **Extract from the chunk, then verify against the rendered page.** The chunk gives you the
   strings; only the rendered DOM tells you which heading each belongs under and what order they go
   in. A chunk literal sitting next to a CSS class string is not evidence of where it appears.
   Use `chrome-devtools-axi` for the render.
2. **Keep the structure, not just the sentences.** DWD's page carries an objective, an activities
   list, results, target groups and expected outcomes as distinct blocks. Flattening that into one
   paragraph throws away the thing that makes it better than the placeholder.
3. **Write `.work/kape-copy/projects.json`** keyed by project code, matching the `ProjectSeed` shape
   in `src/server/seed/projects.ts:13-31` closely enough that applying it is mechanical. Read that
   type first and say in your report where your shape departs from it.
4. **English only.** Khmer is a separate track and a native reviewer's job. Do not machine-translate
   anything.

## Acceptance

1. All 8 extracted, each with its rendered page as evidence. For each, the character count of what
   you lifted against the 152-character placeholder it replaces.
2. Spot-check three against the live rendered page, quoting the page and your JSON side by side.
3. `.work/kape-copy/projects.json` parses: `bun -e 'JSON.parse(require("fs").readFileSync("...","utf8"))'`.
4. State plainly which of the 8, if any, turned out to be placeholder after all.
5. Confirm `git status` shows no source file modified by you.

## Out of scope

- The other 16 placeholder projects. Their copy does not exist on the prototype either - I measured
  150 to 290 characters per chunk, all of it the same `TAIL` sentence. They need KAPE to write them.
  Do not invent copy for them.
- **Images.** Rithy's call: the admin team uploads those later. Record a `photo` URL if the page
  gives you one, but do not download an image.
- Khmer, any `src/` file, the seed itself, and anything J12 is touching.

## Stop conditions

- Never run against the repo's `kape.db`. You should not need a database at all.
- Do not commit, do not touch git, do not edit the worklog.
- Fetch the prototype politely: it is the client's deployment. Space requests out, do not crawl it
  in a loop, and stop if it starts erroring.
- If a route 404s, report it rather than substituting a sibling's copy.
