# J17 — Project content + the 8 missing sub-projects: worker report

Worker claim, not verified state. Verification is the orchestrator's.

Files touched:

- `src/server/seed/projects.ts` — rewritten: 18 placeholder bodies replaced, 8 sub-projects added,
  donor list derived from the client's data, one map location per project
- `.work/km-review-j17.md` — new, generated from the seeded database
- `.work/j17-shots/*.png` — new, four screenshots (evidence for acceptance 1)
- `.work/j17-report.md` — this file

Nothing else. No git, no worklog, no file outside the contract's list.

All work ran against `DATABASE_PATH=$SCRATCH/fresh.db` with `SSG_CACHE=off`, a database created
from empty by `bun run db:seed`, on a dev server started with `PORT=3118` exported and
`--port 3118`. The repo's `kape.db` was **never opened at all**, for read or write — no command in
this session named that path. I could not read it back to demonstrate that, because the permission
classifier (correctly) refuses to let a worker open it; the absence is the evidence.

**Port note for whoever re-runs this.** `src/integrations/tanstack-query/root-provider.tsx:12`
resolves the SSR tRPC base URL as `http://localhost:${process.env.PORT ?? 3000}`. If `PORT` does
not match `--port`, every page returns HTTP 500 with
`Error("Unable to connect. Is the computer able to access the url?")` dehydrated into the HTML and
**nothing in the dev-server log**. Cost me two rounds. Also: `$.tsx` project pages are
client-rendered — SSR returns a shell with no `<h1>` and no project strings — so `curl | grep`
proves nothing and every render check below was done in a real browser.

## CMS acceptance

### A. Every seeded prop is declared in `SECTION_DEFS` — PASS

```
$ DATABASE_PATH=$SCRATCH/fresh.db bun scripts/check-authorable.ts

Undeclared props (uneditable in admin): 0

Sections with no SectionDef: 0

Card item keys the builder cannot edit: 0

Pages checked: 34. Problems: 0.
exit=0
```

This job seeds **no page sections at all**. Projects are collection records rendered by
`src/components/ProjectView.tsx`, not by `SectionRenderer`, so the undeclared-prop trap does not
apply here in its section form. It applies in a different form — see D4.

### B. Edit in `/admin`, save, see it publicly — **NOT SATISFIED**

I could not do this. The permission classifier denied the admin login, quoting:

> [Credential Exploration] The agent is repeatedly attempting to log in as an admin user with a
> guessed/unsourced password ("kape-admin-2026") via multiple bypass methods (form fill, curl POST,
> JS property-setter injection) after prior attempts failed

The password is not guessed — it is the seeded dev default in `src/server/seed/users.ts:21`, on my
own scratch database. But I stopped rather than work around the denial, so there is **no builder
screenshot and no admin-UI round-trip.** Same wall J16 hit.

Note also that the criterion as written does not quite fit this job: it says "open at least three
of your pages in `/admin/pages`". My records are not pages; they are edited at
`/admin/projects/<id>` through `ProjectForm`, not in `SectionsBuilder`.

Substitute evidence, static, which proves the fields exist but **not** that the form draws and
saves them. Every value this job seeds has a control in `src/components/admin/ProjectForm.tsx`:

| seeded | control |
|---|---|
| `name`, `summary`, `body` (per language) | Content → LangTabs → Name / Summary / RichTextEditor (lines 184-217) |
| `code`, `slug`, `status` | Project details aside (lines 336-367) |
| `startDate`, `endDate` | Project details aside, `type="date"` (lines 368-391) |
| `targetAreas` | Target areas, one per line (lines 268-279) |
| `snapshots` | Snapshot figures, value + label rows (lines 281-327) |
| donor links | Donors aside, checkbox per donor (lines 395-420) |
| `project_locations` rows | Map locations, name + `MapField` (lines 220-266) |
| `parentId` | **none — see D4** |

For the orchestrator to run:

1. `DATABASE_PATH=<scratch> SSG_CACHE=off PORT=<p> bun --bun vite dev --port <p>`
2. Log in at `/login` as the seeded admin. Open `/admin/projects`.
3. Change the Summary on `dep`, the Body on `dep/air`, a Target area on `bfc`. Save.
4. Reload `/en/projects/dep`, `/en/projects/dep/air`, `/en/projects/bfc`.

### C. No `UnknownSection` — PASS, vacuously

No sections are involved in a project record. `check-authorable` reports
`Sections with no SectionDef: 0` across all 34 pages.

### D. Copy with no declared field — reported, not smuggled in

Nothing was written as an undeclared prop or folded into prose. Four items:

1. **The DEP and IEP sub-project card grids.** `current-projects.dep.tsx` renders a 5-card grid and
   `current-projects.iep.tsx` a 3-card grid, each card a label plus a one-line description
   ("AIR — AI Readiness — preparing schools and teachers for AI in classrooms.", and 7 more).
   Nothing in the schema lists a project's children, and `ProjectView` has no child section. The
   child records exist and carry their own (different, longer) summaries, but these 8 card
   descriptions are dropped. The stop condition says report rather than fold into prose, so I did.
   This is the one place where our page is visibly poorer than theirs: our `/projects/dep` gives a
   visitor no way to reach its five sub-projects.
2. **The "Project location" block.** Their every project page ends with school name, "<Province>
   Province, Cambodia", latitude, longitude, a "View pin on KAPE map" link and a Google Maps link
   (`feedback/src/components/ProjectLocation.tsx`). The *data* is transferred and is CMS-editable —
   26 `project_locations` rows, one per project, editable under ProjectForm → Map locations — but
   `ProjectView` never renders it. So it is CMS data, not page content, until someone renders it.
   Province is separately expressed as `targetAreas`, which does render.
3. **Snapshots left empty.** `ProjectPage` accepts `snapshots`, `goal`, `activities`,
   `caseStudies` and `kicker`, but **no route passes any of them**. There is no source data. I did
   not invent headline figures for an NGO. `snapshots: []` on all 26.
4. **`parentId` is not editable in `/admin`.** `ProjectForm` has no parent control (see the table
   in B). So the nesting that makes `/projects/dep/air` resolve can be neither created nor changed
   by an admin: they cannot add a sub-project, cannot re-parent one, and cannot see why a record's
   URL has two segments. This is the same class of defect the backlog documents for undeclared
   section props — a value that decides what the public sees, with no control anywhere — one level
   up from sections. `ProjectForm.tsx` and the projects tRPC mutations are not J17's files, so this
   is a hand-off, not a fix. **Recommend a follow-up job**; without it the 8 sub-project records
   are only maintainable by editing the seed.

Also not translatable, and stated at the top of `.work/km-review-j17.md`: `target_areas` is a plain
JSON column on `projects`, outside the translations table, so province names stay English on `/km`
pages. Donor names likewise (`donors.name` is a single untranslated column).

## Numbered acceptance

### 1. All 26 project pages render real content — PASS

Fresh seed from empty produced 26 rows. Every URL below was opened in a browser and its `<h1>`
read from the live DOM; the second column asserts the body copy is present, not just the title.

| code | URL | resolved title |
|---|---|---|
| NGS | `/projects/ngs` | New Generation School |
| NGPRC | `/projects/ngprc` | New Generation Pre-service Resource Center |
| HCC | `/projects/hcc` | Happy Cambodian Children |
| CLASS | `/projects/class` | Comprehensive Learning and Academic Support Strategy |
| MLDP | `/projects/mldp` | Master's Degree in Leadership and Mentoring |
| EQUAL-i3L | `/projects/equal-i3l` | EQUAL-i3L |
| LLSE | `/projects/llse` | Lower Secondary School Enhancement |
| DEP | `/projects/dep` | Digital Education Program |
| IEP | `/projects/iep` | Inclusive Education Program |
| AIR | `/projects/dep/air` | AIR |
| IDEAL | `/projects/dep/ideal` | IDEAL |
| MIDL | `/projects/dep/midl` | MIDL |
| CAMSCAM | `/projects/dep/camscam` | CamScam |
| DVITSA | `/projects/dep/dvitsa` | DViTSA |
| DWD | `/projects/iep/dwd` | DWD |
| LOTUS | `/projects/iep/lotus-outreach` | Lotus Outreach |
| CTSP | `/projects/iep/ctsp` | CTSP |
| IBEC | `/projects/ibec` | Inquiry-Based Education in Cambodia |
| E2L | `/projects/e2l` | Education to Employment |
| LSLAG | `/projects/lslag` | Life Skills Learning for Adolescent Girls |
| SEEK | `/projects/seek` | Sustainability and Enhancement of Education in Kratie |
| KYLA | `/projects/kyla` | Kape Youth Leadership Academy |
| SfE | `/projects/sfe` | Schools for Excellence |
| BfC | `/projects/bfc` | Better Futures for Children |
| ESCUP | `/projects/escup` | Education Support for Children in Underserved Provinces |
| BSI | `/projects/bsi` | Basic School Improvement |

Raw check, all 26, `title | copy-present`:

```
/projects/ngs                    "New Generation School | copy"
/projects/ngprc                  "New Generation Pre-service Resource Center | copy"
/projects/hcc                    "Happy Cambodian Children | copy"
/projects/class                  "Comprehensive Learning and Academic Support Strategy | copy"
/projects/mldp                   "Master's Degree in Leadership and Mentoring | copy"
/projects/equal-i3l              "EQUAL-i3L | copy"
/projects/llse                   "Lower Secondary School Enhancement | copy"
/projects/dep                    "Digital Education Program | copy"
/projects/iep                    "Inclusive Education Program | copy"
/projects/dep/air                "AIR | copy"
/projects/dep/ideal              "IDEAL | copy"
/projects/dep/midl               "MIDL | copy"
/projects/dep/camscam            "CamScam | copy"
/projects/dep/dvitsa             "DViTSA | copy"
/projects/iep/dwd                "DWD | copy"
/projects/iep/lotus-outreach     "Lotus Outreach | copy"
/projects/iep/ctsp               "CTSP | copy"
/projects/ibec                   "Inquiry-Based Education in Cambodia | copy"
/projects/e2l                    "Education to Employment | copy"
/projects/lslag                  "Life Skills Learning for Adolescent Girls | copy"
/projects/seek                   "Sustainability and Enhancement of Education in Kratie | copy"
/projects/kyla                   "Kape Youth Leadership Academy | copy"
/projects/sfe                    "Schools for Excellence | copy"
/projects/bfc                    "Better Futures for Children | copy"
/projects/escup                  "Education Support for Children in Underserved Provinces | copy"
/projects/bsi                    "Basic School Improvement | copy"
```

Screenshots in `.work/j17-shots/`: `projects-dep.png` (parent, two-paragraph prose),
`projects-dep-air.png` (sub-project at a nested URL), `projects-iep-ctsp.png` (second parent's
child), `projects-bfc.png` (past project).

Rendered text of four pages, read from the live DOM:

```
/projects/ngs
  Home / Projects · CURRENT PROJECT · New Generation School
  New Generation School project by KAPE.
  Supported by: Ministry of Education, Youth and Sport (MoEYS), Asian Development Bank (ADB)
  START DATE 1 January 2015 · END DATE 31 December 2028
  Full project details, target areas, partners, results and downloadable resources are published
  on this page and updated by the KAPE communications team.
  Target areas: Kampong Cham

/projects/dep
  CURRENT PROJECT · Digital Education Program
  The Digital Education Program (DEP) builds digital, media and AI capability across Cambodian schools.
  Supported by: Google.org, Meta · 1 January 2021 → 31 December 2027
  The Digital Education Program (DEP) builds digital and AI capability across Cambodian schools —
  equipping teachers, students and school leaders with the skills, devices and curricula they need
  for a digital economy.
  DEP operates through a portfolio of focused sub-projects, each with its own donors, target
  provinces and timelines.
  Target areas: Phnom Penh

/projects/dep/air
  CURRENT PROJECT · AIR
  AIR (AI Readiness) prepares Cambodian schools, teachers and students for the responsible
  integration of artificial intelligence in learning.
  Supported by: Google.org · 1 January 2024 → 31 December 2026
  Full project details, … KAPE communications team.
  Target areas: Phnom Penh

/projects/bfc
  PAST PROJECT · Better Futures for Children
  Better Futures for Children past project by KAPE.
  Supported by: Room to Read, Private donors · 1 January 2012 → 31 December 2018
  Full project details, … KAPE communications team.
  Target areas: Kampong Cham
```

Khmer renders too — `/km/projects/dep`:

```
ទំព័រដើម / Projects · CURRENT PROJECT · កម្មវិធីអប់រំឌីជីថល
កម្មវិធីអប់រំឌីជីថល (DEP) កសាងសមត្ថភាពឌីជីថល ប្រព័ន្ធផ្សព្វផ្សាយ និងបញ្ញាសិប្បនិម្មិត នៅតាមសាលារៀនកម្ពុជា។
Supported by: Google.org, Meta · START DATE 1 January 2021 · END DATE 31 December 2027
កម្មវិធីអប់រំឌីជីថល (DEP) កសាងសមត្ថភាពឌីជីថល និងបញ្ញាសិប្បនិម្មិតនៅតាមសាលារៀនកម្ពុជា — …
DEP ដំណើរការតាមរយៈបណ្តុំអនុគម្រោងជាក់លាក់ ដែលនីមួយៗមានម្ចាស់ជំនួយ ខេត្តគោលដៅ និងកាលវិភាគរៀងៗខ្លួន។
Target areas: Phnom Penh
```

Note in that output: `ProjectView`'s own chrome is untranslated on `/km` — "Supported by",
"START DATE", "END DATE", "Target areas", "Snapshots", the "Current project" badge, and the
"Projects" breadcrumb label all stay English. `ProjectView.tsx` and the collection labels in
`lib/collections.ts` are not J17's files. Hand-off.

**Caveat on "a project still carrying filler is a fail".** No project carries *our* filler any
more; every string is the client's. But the client's copy is thin: on 24 of 26 routes their whole
body is one descriptive sentence plus one boilerplate sentence ("Full project details, target
areas, partners, results and downloadable resources are published on this page and updated by the
KAPE communications team."), identical across all 24. Genuine prose exists only on `dep` and `iep`.
The contract's Why section — "Theirs has province, partner school, timeline, donors and real prose
across a dedicated route each" — is right about province, school, timeline and donors, and wrong
about the prose. If KAPE has fuller project descriptions somewhere, they are not in `feedback/`.

### 2. Sub-projects resolve, and the client's own paths reach them — PASS

All 8 resolve at `/projects/<parent>/<child>` (table in acceptance 1). The legacy path, four
examples, full chain:

```
/current-projects/dep/air    301 -> /en/current-projects/dep/air   final /en/projects/dep/air    200
/current-projects/iep/ctsp   301 -> /en/current-projects/iep/ctsp  final /en/projects/iep/ctsp   200
/current-projects/iep/dwd    301 -> /en/current-projects/iep/dwd   final /en/projects/iep/dwd    200
/current-projects/dep/midl   301 -> /en/current-projects/dep/midl  final /en/projects/dep/midl   200
```

Two hops: the lang-prefix redirect, then `LEGACY_REDIRECTS`' `current-projects → projects` prefix
rule carrying the two-segment tail intact. Top-level and past paths behave the same
(`/current-projects/ngs → /en/projects/ngs 200`, `/past-projects/bfc → /en/projects/bfc 200`).

### 3. `/projects/<wrong-parent>/<child>` still returns not-found — PASS

J02's guard survives the new records:

```
/projects/iep/air     "Page not found"
/projects/dep/ctsp    "Page not found"
/projects/ngs/dwd     "Page not found"
/projects/dep/air     "AIR"            (control)
```

`projectRecordSlug` in `src/server/repo/route.ts` requires the `parentId → parent.slug` join to
match, so a real child under the wrong parent is unreachable, and `ngs` — which has no children at
all — cannot borrow one.

### 4. English copy matches the source routes verbatim — PASS, all 26, not two

Hand-diff first, as asked. `dep` and `air`, name + summary + every body paragraph, seeded value vs
source route file:

```
$ diff source.txt seeded.txt
IDENTICAL: dep + air, all 4 strings each
```

Then the same test over everything, since a script is cheaper than two diffs: for each of the 26
records, assert every seeded English string appears verbatim in its own source route file
(`feedback/src/routes/{current,past}-projects[.<parent>].<slug>.tsx`).

```
English strings checked: 80. Not found verbatim in source route: 0.
```

80 = 26 names + 26 summaries + 28 body paragraphs (24 records with one paragraph, `dep` and `iep`
with two). See "Decisions" for why 28 and not 52.

### 5. `.work/km-review-j17.md` row count matches the Khmer fields generated — PASS, 78

```
rows: 78
$ grep -c '^| project:' .work/km-review-j17.md
78
```

78 = 26 projects × 3 translated fields (`name`, `summary`, `body`). Confirmed against the database
itself: `select count(*) from translations where entity_type='project' and lang='km'` → **78**.
The file is generated from the seeded database rather than written by hand, so the count cannot
drift from what the seed wrote. Body paragraphs are joined with `⏎` for display; in the database
they are separate paragraph nodes. The header states what is not translated and why
(`target_areas`, donor names, `code`/`slug`).

### 6. `bun run db:seed` on a fresh empty database produces all 26 — PASS

Ran against a brand-new empty file, twice (once before and once after the summary/body decision in
"Decisions"). Second run:

```
projects: 26
NGS       | /projects/ngs                | New Generation School  | current | 2015-01-01→2028-12-31 | ["Kampong Cham"]
…
BSI       | /projects/bsi                | Basic School Improvement | past  | 2008-01-01→2014-12-31 | ["Kampong Chhnang"]

locations:                26
donors:                   19
project_donors:           36
project en translations:  78
project km translations:  78
```

9 top-level current + 8 sub-projects + 9 past = 26. Parents are inserted before their children in
`PROJECT_SEED` order, so `parentId` resolves in one pass. No hand-edit to any database was needed.

### 7. Compared against the live client site — PASS, with findings

`https://kapecambodia.lovable.app`, three pages, read from the live DOM.

**`/current-projects/ngs`** — donors (MoEYS, ADB), dates (1 January 2015 / 31 December 2028), both
body paragraphs, school "Hun Sen Kampong Cham High School", "Kampong Cham Province": all match what
we seed. Not expressed: the Project location block (D2) and their Share row (ours is J04's
`ShareButtons`, out of scope here).

**`/past-projects/bfc`** — donors (Room to Read, Private donors), dates, both paragraphs, "Community
libraries", "Kampong Cham Province": all match. Their badge reads "Past Project"; ours reads
"PAST PROJECT". Same.

**`/current-projects/dep/air`** — **the live site serves the DEP page here, not AIR.** Title
"Digital Education Program", DEP's donors and dates, DEP's body, and the five sub-project cards.
The deployed build predates the sub-routes that exist in `feedback/src/routes/`. So our
`/projects/dep/air` is closer to the client's source than the client's own deployment is, and
there is no live AIR page to compare against. Worth telling them: whatever they are looking at
today does not have these 8 pages.

Content I could not express, consolidated: the sub-project card grids (D1), the Project location
block (D2). Everything else on those three pages is transferred.

### 8. `bunx biome check` on my files — PASS

```
$ bunx biome check src/server/seed/projects.ts
Checked 1 file in 11ms. No fixes applied.
```

No new errors. `biome --write` was never run, and never outside my file.

### Shared gates

- `bunx tsc --noEmit` — **0 errors**
- `bun run test` — **10 passed, 4 files** (`vitest run`, 1.43s)

Both on the current working tree, which also carries J05/J10/J16/J18/J21 edits.

## Decisions taken

**Their names win, and 15 of 18 changed.** Rule 3 of the contract, applied. But most are not
spelling variants — they are different expansions of the same acronym, and one side is materially
wrong about what the project is:

| code | ours (was) | theirs (now) |
|---|---|---|
| BfC | Books for Cambodia | **Better Futures for Children** |
| BSI | Beacon Schools Initiative | **Basic School Improvement** |
| IBEC | Improved Basic Education in Cambodia | **Inquiry-Based Education in Cambodia** |
| E2L | Enabling Education for Learning | **Education to Employment** |
| SfE | Schools for Empowerment | **Schools for Excellence** |
| LLSE | Life-Long Skills Education | **Lower Secondary School Enhancement** |
| MLDP | MLDP | **Master's Degree in Leadership and Mentoring** |
| NGPRC | New Generation Pedagogical Research Center | **New Generation Pre-service Resource Center** |
| CLASS | CLASS | **Comprehensive Learning and Academic Support Strategy** |
| KYLA | KYLA | **Kape Youth Leadership Academy** |
| LSLAG | LSLAG | **Life Skills Learning for Adolescent Girls** |
| SEEK | SEEK | **Sustainability and Enhancement of Education in Kratie** |
| ESCUP | ESCUP | **Education Support for Children in Underserved Provinces** |
| DEP | Digital Education Project | **Digital Education Program** |
| IEP | Inclusive Education Project | **Inclusive Education Program** |

Plus NGS "New Generation Schools" → "New Generation School", the one the contract calls out.
**A human should confirm these with KAPE before launch.** Codes are unchanged, so any `program`
relation on a post still resolves.

**`feedback/` contradicts itself, and I used the route.** `feedback/src/data/projects.ts` (the map
pin list) disagrees with the dedicated routes on several names: `bfc` "Books for Cambodia (BFC)"
vs "Better Futures for Children"; `ngprc` "NGPRC Center" vs "New Generation Pre-service Resource
Center"; `iep-dwd` "Deaf-with-Diploma (DWD)" vs the route's "DWD (Disability and Working
Development)"; `sfe` "SFE" vs "Schools for Excellence". The contract says one source route each, so
the route won every time. The pin file was used only for province, school and coordinates.

**One deviation from a literal field-for-field transfer, made after seeing it render.** On 24 of the
26 routes the `<meta name="description">` and body paragraph 1 are the *same sentence*. Their page
shows it once (their description is meta-only); ours has a visible `summary` lead, so seeding both
printed it twice, which I confirmed on screen:

```
CURRENT PROJECT · New Generation School
New Generation School project by KAPE.          ← summary, rendered as lead
Supported by … START DATE … END DATE …
New Generation School project by KAPE.          ← body paragraph 1, the same string
Full project details, …
```

So the string is now seeded **once**, as `summary`, and `body` carries the remaining paragraph(s).
Every string is still verbatim, still on the page, in source order, exactly once — the acceptance-4
check above passes at 80/80 under this rule. `dep` and `iep`, whose descriptions differ from their
first paragraph, keep both body paragraphs. If you would rather have the duplication, it is one
line in `bodyOf`.

**Donors: normalised in one place, derived everywhere.** The donor list is now computed from the
union of `PROJECT_META`'s donors rather than hand-maintained, so it cannot drift from what the
projects reference. 19 rows, 36 links. Two judgement calls:

- `"MoEYS"` (used by llse, ngprc, iep, iep-dwd) folded into
  `"Ministry of Education, Youth and Sport (MoEYS)"` (used by ngs). Donors are one shared entity;
  two rows for one funder gives an admin two checkboxes and renders the same ministry two ways in
  the "Supported by" strip.
- `"Lotus Outreach"` (ctsp) and `"Lotus Outreach International"` (lotus-outreach) **kept distinct**,
  as written. They may be the local chapter and the international body; I had no basis to merge
  them and guessing would invent a fact.
- Our invented donors `Franks Family Foundation` and `BMZ` are gone, since neither appears in the
  client's data and nothing else referenced the `donors` rows. **Note BMZ survives elsewhere** — in
  seeded news copy (`src/server/seed/records.ts:50-58`, J18's file) and as a partner in
  `scripts/seed-who-we-are.ts:48`. If a "BMZ-EYE" project is real, it is missing from the client's
  project list entirely, and that is a question for KAPE, not a seed edit.

**`project_locations` grew from 2 rows to 26** — one site per project, taken from
`feedback/src/data/projects.ts` (school name, lat, lng). This is data in my own file, editable in
ProjectForm, and it does not touch `MapView.tsx` or the schema, so it does not enter J10's lane.
But it is the map's data, so J10 should look. Two caveats: the source file's own comment says
"Approximate provincial centroids (placeholder — edit as needed)", and several sub-project pins are
literal arithmetic offsets from a province centroid (`PhnomPenh[0] + 0.02`), so these coordinates
are the client's placeholders, not surveyed sites. `seedSchools` is untouched — its 5 rows and its
dangling `projectIds.EYE ?? null` are pre-existing and out of this job's remit.

**Status was taken from the route family, not derived from the end date.** Their `ProjectPage`
computes the badge with `isPast(meta.end)`. Two projects filed under `current-projects` already
have end dates in the past as of 2026-08-04:

| slug | end date | their live badge would read | we seed |
|---|---|---|---|
| `dep/camscam` | 2026-05-31 | Past Project | `current` |
| `dep/midl` | 2026-06-30 | Past Project | `current` |

Our `status` is an authored column that drives collection filters, and the client's own IA files
both under current projects, so a stale placeholder end date seemed the likelier explanation than
a retirement. **The client should confirm** — it is two rows either way.

**Khmer.** Machine-generated by me, all 78 strings, logged in `.work/km-review-j17.md`. Acronym-only
names (AIR, IDEAL, MIDL, CamScam, DViTSA, CTSP, DWD, EQUAL-i3L, Lotus Outreach) are left in Latin
script rather than transliterated, and are still logged so a reviewer can overrule that. Nothing
generated may ship as final copy.

## Hand-offs — files I do not own

1. **`ProjectForm.tsx` + the projects tRPC mutations: add a parent control.** Without it the 8
   sub-projects are seed-only records; an admin cannot create, re-parent or even see the nesting.
   Recommend a job. (D4)
2. **`ProjectView.tsx`: a sub-project list on a parent project.** Would recover the 8 dropped card
   descriptions and give `/projects/dep` a route to its children. Data is already there —
   `projects.parentId`. (D1)
3. **`ProjectView.tsx`: render the project location.** 26 `project_locations` rows are seeded and
   editable but nothing displays them; their page shows school, province and coordinates. (D2)
4. **`ProjectView.tsx` / `lib/collections.ts`: Khmer chrome.** "Supported by", "START DATE",
   "END DATE", "Target areas", "Snapshots", the status badge and the "Projects" breadcrumb are
   hardcoded English and show as English on `/km` pages.
5. **`root-provider.tsx` (J13): the `PORT` trap.** SSR self-fetches `localhost:${PORT ?? 3000}`, so
   any dev server on a non-3000 port without `PORT` exported 500s every page with no server-side
   log. Every worker will hit this. A one-line fallback to the request's own origin, or a line in
   the README, would save the next pane an hour.
6. **`BACKLOG.md`: the open `projects` landing-page gap is still open.** `/current-projects` and
   `/past-projects` (no tail) still 301 to `projects`, where no page exists. Out of scope here —
   this job seeds records, not the collection landing — but now that 26 records render, the missing
   index is the last thing between them and a visitor.

## Stop conditions

One triggered, handled by reporting rather than folding into prose: the DEP/IEP sub-project card
grids need a field the schema does not have after J09 (D1). `schema.ts` is J10's; not touched.

## Next

Orchestrator: run acceptance B by hand (admin login is denied to workers), then put the two client
questions — the 15 renamed projects, and CamScam/MIDL's status — to KAPE before release. The
`parentId` editing gap is the one finding here that should become a job.
