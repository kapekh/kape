# K1 - Lift the project copy the seed left behind

All 8 extracted, verified against the rendered page, written to `.work/kape-copy/projects.json`.
None of the 8 turned out to be placeholder. Each replaces the 152-character `TAIL` with 1,289 to
1,721 characters of real copy in six structured blocks.

Nothing under `src/` was touched.

## What was actually missing

The job brief says these 8 ship a placeholder body. Reading the seed sharpened that: the **summary**
is already correct for all 8, character for character. `bodyOf()` at `src/server/seed/projects.ts:605`
falls back to `TAIL` alone whenever `body` is absent, and it is absent for all 8. So the gap is the
body and only the body.

The prototype carries far more than a body. Each page is one `ProjectPage` component
(`ProjectPage-C62HdA0a.js`) fed a props object, and the props include a project goal, a project
update, key activities, a target group, an impact list, case studies and numeric snapshots. Six of
those are prose and belong in the body. Snapshots are not prose and have a column of their own.

## The 8

| code | route | body chars | vs 152 | snapshots | page target areas |
|---|---|---|---|---|---|
| DWD | `/current-projects/iep/dwd` | 1,721 | 11.3x | 4 | 4 |
| AIR | `/current-projects/dep/air` | 1,571 | 10.3x | 4 | 4 |
| IDEAL | `/current-projects/dep/ideal` | 1,488 | 9.8x | 4 | 4 |
| LOTUS | `/current-projects/iep/lotus-outreach` | 1,361 | 9.0x | 4 | 4 |
| MIDL | `/current-projects/dep/midl` | 1,328 | 8.7x | 4 | 4 |
| CTSP | `/current-projects/iep/ctsp` | 1,325 | 8.7x | 4 | 3 |
| CAMSCAM | `/current-projects/dep/camscam` | 1,319 | 8.7x | 4 | 4 |
| DVITSA | `/current-projects/dep/dvitsa` | 1,289 | 8.5x | 4 | 4 |

Body chars counts the visible text in `bodyDoc.en`, headings included. No route 404d; all 8 rendered.

## How it was verified

Strings came out of the eight route chunks in `/tmp/kaudit/chunks/`, parsed as object literals rather
than regex-scraped, so quoting and punctuation survive exactly. Every one of the eight pages was then
loaded in Chrome through `chrome-devtools-axi` and its `<main>` walked for text.

The check that matters: for each project, every string in the extracted props appears in that page's
rendered DOM. 274 strings across the 8, zero missing. Rendered captures are in `/tmp/kaudit/rendered/`.

The render also settled the ordering question, and the chunk would have got it wrong. Props are
declared `body, goal, activities, targetAreas, caseStudies, snapshots, update, targetGroup, impact`.
The component renders `goal, update, activities, targetAreas, targetGroup, impact, caseStudies,
snapshots`. Update jumps from seventh to second, case studies from fifth to seventh. All 8 pages
render that same H2 sequence. `blocks` follows the rendered order.

### Spot checks

**DWD**, third block. Page:

> H2 | Key activities
> SPAN | Train teachers in Cambodian Sign Language and inclusive classroom practice
> SPAN | Provide assistive devices, learning aids and accessible materials

JSON:

```json
{ "heading": "Key activities", "kind": "list",
  "items": ["Train teachers in Cambodian Sign Language and inclusive classroom practice",
            "Provide assistive devices, learning aids and accessible materials", ...] }
```

**CTSP**, project goal. Page:

> H2 | Project goal
> P | Keep vulnerable girls and at-risk children in school through targeted scholarships, mentoring and family support.

JSON:

```json
{ "heading": "Project goal", "kind": "paragraphs",
  "items": ["Keep vulnerable girls and at-risk children in school through targeted scholarships, mentoring and family support."] }
```

**CamScam**, first case study. Page:

> H3 | A scam stopped in the classroom
> P | After a session on job-offer scams, a Grade 12 student recognised a fraudulent recruitment message and warned her whole class.

JSON:

```json
{ "title": "A scam stopped in the classroom",
  "text": "After a session on job-offer scams, a Grade 12 student recognised a fraudulent recruitment message and warned her whole class." }
```

## Shape, and where it departs from ProjectSeed

`projects.json` is keyed by project code. `code`, `slug`, `parent` and `summary.en` match `ProjectSeed`
(`src/server/seed/projects.ts:13-31`) and are there so the applier can match records without guessing.
`snapshots` matches `ProjectSnapshot` (`src/server/schema.ts:661`) field for field. Three departures:

**1. `blocks` instead of `body: string[]`.** `richText()` at line 609 turns each string into a bare
paragraph, so a flat `string[]` cannot hold a heading or a bullet. Handing over one flattened blob
would throw away the objective / activities / target group / outcomes separation, which is most of
what makes this copy better than `TAIL`. `blocks` keeps it: `{ heading, kind, items }` in rendered
order, `kind` being `paragraphs`, `list` or `cards`.

**2. `bodyDoc.en` alongside it.** A ready ProseMirror doc built from `blocks`, using `heading` level
2 and 3, `paragraph` and `bulletList`. All four node types come from StarterKit, already in
`richTextExtensions` (`src/lib/richtext/extensions.ts:49`), and `renderBody()` puts stored JSON
through that same allow-list. So the follow-up can seed `bodyDoc.en` directly, no new node type and
no dependency. `bodyDoc` is derived from `blocks`; if they ever disagree, `blocks` is the source.

**3. No `km`.** English only, as instructed. This is the one thing the follow-up cannot do
mechanically, and it needs a decision rather than a translation: if `body.en` gets the rich content
and `body.km` keeps `TAIL`, the Khmer page holds exactly what it has today while English pulls ahead.
That is a defensible interim, but it should be somebody's call, not a side effect. Do not
machine-translate it.

`snapshots` also needs a one-line type change to apply. `ProjectSeed` has no snapshots field and
`seedProjects()` hardcodes `snapshots: []` at line 648, even though the column and the type exist.

## Flagged, not fixed

**Target areas are wider on the page than in the seed.** The seed gives each of the 8 a single
province, taken from its map pin. The page lists three or four. Nothing on the page contradicts the
pin, so this reads as the seed conflating "where the map dot goes" with "where the project works".
Page values are in `targetAreas`. Applying them is a judgement call about which is authoritative, so
I have not made it.

| code | seed | page |
|---|---|---|
| DWD | Phnom Penh | Kampong Cham, Tboung Khmum, Phnom Penh, Kratie |
| AIR | Phnom Penh | Phnom Penh, Kampong Cham, Tboung Khmum, Kandal |
| IDEAL | Kandal | Phnom Penh, Kampong Cham, Tboung Khmum, Kratie |
| LOTUS | Battambang | Kampong Cham, Tboung Khmum, Kandal, Phnom Penh |
| CTSP | Kampong Cham | Kampong Cham, Tboung Khmum, Kratie |
| MIDL | Phnom Penh | Phnom Penh, Kampong Cham, Battambang, Siem Reap |
| CAMSCAM | Phnom Penh | Phnom Penh, Kandal, Sihanoukville, Banteay Meanchey |
| DVITSA | Phnom Penh | Kampong Cham, Tboung Khmum, Phnom Penh, Kratie |

LOTUS is the sharpest: the seed puts it in Battambang, matching its map pin, and the page names four
provinces that do not include Battambang.

**Two projects contradict themselves on the prototype.** The summary describes one project and every
block below it describes another. This is the prototype's own inconsistency, faithfully carried
across, not something extraction introduced.

- **CTSP** summarises as individualised support for children with disabilities, assistive devices and
  specialist teachers. Its goal, activities, target group, impact and both case studies are all about
  scholarships and mentoring for vulnerable girls and out-of-school children. Its listed donor is
  Lotus Outreach, which fits the scholarship reading, so the summary looks like the wrong half.
- **CamScam** summarises as STEM, computing and maker spaces. Everything below it is anti-scam and
  online fraud awareness, which is also what the name suggests.

Both summaries are already live in the seed. Applying this job's bodies underneath them makes the
contradiction visible on the KAPE site, so KAPE should settle which half is right before it ships.

**CamScam renders as a past project.** The prototype derives status from the end date, and CamScam
ended 2026-05-31. The seed hardcodes `status: "current"` with that same end date, so the seed
currently calls a finished project current. Same trap applies to anything else whose end date has
passed.

**DViTSA's kicker is abbreviated.** `DEP · Sub-project` where the other four DEP children say
`Digital Education Program · Sub-project`. Cosmetic, no bearing on the body.

## Acceptance

1. All 8 extracted, each rendered as evidence, character counts in the table above.
2. Three spot-checked side by side above; the automated check covers all 274 strings across all 8.
3. `bun -e 'JSON.parse(require("fs").readFileSync(".work/kape-copy/projects.json","utf8"))'` parses,
   8 keys.
4. None of the 8 was placeholder after all.
5. `git status` shows no source file modified by me. My only additions are `.work/kape-copy/` and this
   report. The modified files under `src/` and `.work/LEAD.md` are J12 and the lead pane.

No images downloaded. No commit, no git, no worklog edit, no dependency. Bun throughout.

Next: apply the 8 to `src/server/seed/projects.ts` once J12 lands, after KAPE rules on the CTSP and
CamScam summary conflicts and on whose target areas win.
