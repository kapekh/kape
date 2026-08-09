# SEED-COPY - the real project copy, and what turned out not to exist

Six projects now carry the client's sectioned copy in `src/server/seed/projects.ts`.
Two are held back on a content conflict KAPE has to settle.
The other sixteen have no copy to lift: the prototype ships them with the same 152-character `TAIL`
the seed already has.

The job brief assumed 24 projects were waiting for real copy.
Only the 8 K1 extracted ever had any.

## What landed

`blocks` and `snapshots` on `ProjectSeed`, and `richBlocks()` turning blocks into a ProseMirror doc
with `heading`, `paragraph` and `bulletList`.
All three node types were already in `richTextExtensions`, so no new node type and no dependency.

| code | body chars | h2 | h3 | bullets | snapshots |
|---|---|---|---|---|---|
| AIR | 1,594 | 6 | 2 | 11 | 4 |
| IDEAL | 1,511 | 6 | 2 | 11 | 4 |
| MIDL | 1,351 | 6 | 2 | 11 | 4 |
| DVITSA | 1,312 | 6 | 2 | 11 | 4 |
| DWD | 1,746 | 6 | 2 | 13 | 4 |
| LOTUS | 1,384 | 6 | 2 | 11 | 4 |

`snapshots` also went in.
`seedProjects()` hardcoded `snapshots: []` while the column and the `ProjectSnapshot` type both
existed, so the figures K1 extracted had nowhere to go until now.
Khmer is untouched, as instructed: `body.km` stays on `TAIL` for all 26.

The builder was checked against K1's own `bodyDoc.en`.
For all 8 projects, including the two held back, `richBlocks(blocks)` reproduces K1's document
byte for byte. Script: `.work/kape-copy/gen.ts`.

## The other 16 have nothing to lift

Every one of the sixteen route chunks passes `ProjectPage` a two-element `body` and nothing else.
Element one is the summary the seed already carries, element two is `TAIL`, word for word.
NGS in full:

```js
body:["New Generation School project by KAPE.","Full project details, target areas, partners,
results and downloadable resources are published on this page and updated by the KAPE
communications team."]
```

Checked against the live pages rather than the chunks, as the brief asks.
All sixteen were loaded through Chrome and their `<main>` walked: two paragraphs each, second one
`TAIL`, one `<h2>` each and that one is the partner school in the location card, zero `<h3>`.
No content sections at all.
Script and captures: `.work/kape-copy/verify16.ts`, `.work/kape-copy/rendered-16/`.

The shared `projects-cQuBlQL0.js` module carries only map data for these: province, school, lat, lng.
No prose lives there either.

So "no project still shows `TAIL`" is not reachable without writing copy KAPE has not written.
The 16 keep `TAIL` and that is the accurate state.

## CTSP and CamScam: both versions, no decision

K1 flagged these and I have not touched them. Both keep `TAIL`.

### CTSP

Summary now live in the seed and on the prototype:

> CTSP (Children Targeted Support Program) provides individualised support for children with
> disabilities, including assistive devices and specialist teachers.

Every block under it on the same page:

> **Project goal**
> Keep vulnerable girls and at-risk children in school through targeted scholarships, mentoring and
> family support.
>
> **Key activities**
> Award scholarships covering school materials, transport and living support
> Provide case management and mentoring for each scholar
> Run life-skills and study-skills sessions for scholarship recipients
> Engage parents and guardians to protect school attendance
> Track retention, transition and completion for every scholar
>
> **Target group**
> Out-of-school and at-risk children
> Children from poor and migrant families
> Community volunteers and local teachers
> Commune councils and school support committees
>
> **Case studies**
> *Staying in Grade 9* - A scholarship and monthly mentoring kept a student in school after her
> family's harvest failed.

Not one of the six blocks mentions disability, assistive devices or specialist teachers.
The listed donor is Lotus Outreach, which fits the scholarship reading and not the disability one.
Applying the body under the current summary puts both claims on one page.

### CamScam

Summary now live in the seed and on the prototype:

> CamScam supports STEM, computing and maker-space initiatives in Cambodian secondary schools.

Every block under it:

> **Project goal**
> Protect Cambodian internet users, especially students and young workers, from online scams and
> digital financial fraud through awareness, skills and community reporting.
>
> **Key activities**
> Develop anti-scam awareness materials in Khmer for schools and communities
> Train students, teachers and parents to recognise and report common scams
> Partner with local authorities on referral and reporting pathways
> Run school and social-media anti-scam campaigns
> Collect and publish anonymised case data to inform prevention
>
> **Case studies**
> *A scam stopped in the classroom* - After a session on job-offer scams, a Grade 12 student
> recognised a fraudulent recruitment message and warned her whole class.

Nothing in the six blocks mentions STEM, computing or maker spaces.
The project name points the same way the blocks do.
The summary looks like it belongs to a different project.

Both summaries are already live in the seed, so the contradiction exists today at half strength.
Adding the bodies would make it visible on the page.

## Target areas: still open, still not applied

K1's table stands and the seed is unchanged.
The seed gives each of the 8 a single province taken from its map pin, the pages list three or four.
LOTUS is the sharp one: seeded as Battambang, and its page names Kampong Cham, Tboung Khmum, Kandal
and Phnom Penh, none of which is Battambang.

## Blocker: the public project page does not render the projects table

This one is not mine to fix and it is bigger than the copy.

`/en/projects/ngs` renders "New Generation Schools" with the body "New Generation Schools overview
and outcomes." and a donor list including Franks Family Foundation.
None of that is in the seeded database, and none of it is anywhere in `src/`.
The seeded record is "New Generation School", body `TAIL`, donors MoEYS and ADB.
The DOM attributes the markup to `src/components/SubPage.tsx`, not `ProjectView.tsx`.

Ruled out along the way: `render_cache` is empty, `SSG_CACHE=off` changes nothing, a full delete and
reseed changes nothing, a server restart changes nothing, no service worker, no browser cache, and
`VACUUM INTO` a scratch database that provably contains only the new records changes nothing.
The server has exactly one database file open and it is the right one.
Calling the app's own resolver in process returns the correct record every time:

```
resolveRoute(db, "projects/ngs", "en")
  -> name "New Generation School", donors MoEYS + ADB, bodyHtml 159 chars
resolveRoute(db, "projects/iep/dwd", "en")
  -> DWD, bodyHtml 2,063 chars
```

Second symptom, same area: all 8 sub-projects 404 over HTTP, at both `/projects/<slug>` and
`/projects/<parent>/<slug>`, while `resolveRoute` resolves every one of them.
Reproduced on the untouched baseline database as well, so it predates this job.

Rendering lives in `src/routes/$.tsx` and `src/components/*.tsx`, which this job must not open.
Reporting it rather than touching it, per the brief.

## What was verified instead

The seeded rows, and the app's own `renderBody` output for them.

```
26 projects: 8 rich, 18 still TAIL
AIR/IDEAL/MIDL/DVITSA/DWD/LOTUS  8 headings, 3 bullet lists, 4 snapshots each
DEP/IEP                          their existing two paragraphs, unchanged
```

`.work/seed-copy-shots/rendered-bodies.html` is the six bodies put through `renderBody` with
`resolveRoute` supplying the record, plus NGS underneath as the `TAIL` contrast.
Screenshots alongside it. Headings, bullets and case-study subheadings all render as structure, not
as a wall of text.

`src/server/seed/projects.test.ts` is the check that survives: it runs the seed module in a Bun
subprocess against a throwaway database and asserts each sectioned body comes back through
`renderBody` with 6 `<h2>`, 2 `<h3>`, 3 bullet lists, no `TAIL`, and Khmer still on the placeholder.
Drop `heading` or `bulletList` from `richTextExtensions` and it fails.

## Gates

```
bunx tsc --noEmit                       silent
bun run test                            272 passed, 25 files   (was 269 / 24; +3 mine)
bunx biome format src                   clean over 248         (was 247; +1 mine)
bunx biome check src                    142 errors, 30 warnings (baseline, unchanged)
DATABASE_PATH=./seed-copy.db bun run seed:kape   clean run from an empty file
```

No repo database was touched; this worktree has no `kape.db`.
`.env` already pinned `DATABASE_PATH=./seed-copy.db`, so the app and drizzle-kit read the same file.

## Next

KAPE rules on the CTSP and CamScam summaries and on whose target areas win, then those two get their
bodies the same way the six did.
The project page not reading the projects table needs an owner before any of this copy is visible on
the site.
