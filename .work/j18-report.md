# J18 — Transfer the structured records: report

Worker claim, not verified state. Files touched: `src/server/seed/records.ts`,
`.work/km-review-j18.md`, `.work/j18-shots/`. Nothing else. No git, no worklog.

All verification ran against scratch databases at
`$SCRATCH/j18.db` and `$SCRATCH/j18c.db` (`DATABASE_PATH` exported, `SSG_CACHE=off`,
dev server on port 3218 with `PORT=3218` so SSR self-fetch resolves). The repo's
`kape.db` was never opened for write; read back through a connection afterwards it
still holds 7 people / 5 partners / 3 news / 2 stories and the old
`intl-ngo`/`local-ngo`/`news-agency` partner categories.

## The contract's source counts are wrong for two rows

Measured directly from the four data files:

| record | contract's Why table | actually in the file |
|---|---|---|
| leaders | ~24 | **24** ✓ |
| partners | ~34 | **26** (8 groups) |
| news | 36 | **6** |
| impact stories | 12 | **3** |

`feedback/src/routes/who-we-are.news.tsx` renders `NEWS.map(...)` with no slicing,
and `what-we-do.impact-stories.tsx` renders `STORIES.map(...)` the same way, so 6 and
3 are the client's whole lists — not a truncated export. There is no second source of
news or stories anywhere under `feedback/src`. I transferred everything present; the
"36 news + 12 stories" and "~34 partners" figures in `AUDIT.md`/`BACKLOG.md` do not
correspond to this prototype and should be corrected there.

## Acceptance

**Gates.** `bunx tsc --noEmit` → 0 errors. `bun run test` → 4 files, **10 of 10
passed**. Both run on the current working tree, which also holds J10/J16/J17 edits.

### 1. Record counts after seeding match the source files — PASS

Fresh seed of an empty database, then queried:

```
people total   : 27      (24 public + 3 pre-existing internal staff rows)
people public  : 24      board 6 · smt 6 · pm 12     ← source: 6 / 6 / 12
partners       : 26      ← source: 26
news posts     : 6       ← source: 6
story posts    : 3       ← source: 3
```

Partner group sizes match the source group for group: government 1, strategic 1,
private 1, foundation 7, international 8, local 2, implementing 5, technical 1.

**One record dropped: the partner "CTN".** It is one of our five invented partners and
appears nowhere in the client's list. Shipping a fabricated partner on an NGO's public
site is worse than a short count, so it was removed rather than carried. It is the only
drop; everything in the source landed.

### 2. No duplicates — PASS, with one intentional repeat

```
dup post slugs   : []
dup person slugs : []
dup partner names: []
dup person names : [{"name_en":"Board Member","c":3}]
```

The three "Board Member" rows are `board-4`, `board-5`, `board-6` in the source — three
board seats whose occupants were never supplied. Distinct slugs, distinct pages,
deliberately not renamed (inventing names for real directors is worse than repeating a
placeholder). Not an accidental duplicate.

### 3. `/team`, `/news`, `who-we-are/partners` render the full sets — PASS

`.work/j18-shots/team.png` — 24 people, board → smt → pm order.
`.work/j18-shots/news.png` — all 6 news cards, 2026-07-31 down to 2026-04-18.
`.work/j18-shots/partners.png` — all 26 partners under the 8 group headings.
`.work/j18-shots/team-km.png` — the Khmer team page (see the position finding below).

Link counts scraped from the served HTML: 24 distinct `/en/team/<slug>` hrefs,
6 distinct `/en/news/<slug>` hrefs, and all 26 partner names present. `/en/stories`
carries its 3 items with the pull quote rendering as a `blockquote`.

### 4. Every person page resolves at `/team/<slug>` — PASS, 24 checked, 0 404

All 24 slugs fetched: every one HTTP 200 with no "Something went wrong" / not-found
body. No public person row is missing a slug.

### 5. `bun scripts/check-authorable.ts` — PASS

`Pages checked: 36. Problems: 0.` (undeclared props 0, missing SectionDefs 0,
uneditable card keys 0).

### 6. Each record type editable in `/admin` — PASS

Signed in as `admin@kapekh.org`, edited one of each, saved, confirmed publicly:

| record | edit | shows publicly |
|---|---|---|
| person 7 (`person-sambath`) | position → "Executive Director (J18 edit check)" | `/en/team/person-sambath` and the `/en/team` grid |
| partner 26 (`Koompi`) | name → "Koompi (J18 edit check)" | `/en/who-we-are/partners` |
| post 5 (`ngs-new-ict-lab`) | title → "… (J18 edit check)" | `/en/news` list and `/en/news/ngs-new-ict-lab` |

Every field I seed is a declared control in `PeopleForm` / `PartnerForm` / `PostForm`:
person name en+km, position, tier, email, slug, isPublic, sort, bio (rich text, both
langs); partner name, category (a `SearchableSelect` over the `partner_category` terms
this file seeds), url; post type, slug, status, author, publishedAt, title/excerpt/body
in both langs. **I seeded no `posts.meta` key on news or story** — see the `kicker`
finding.

The clean scratch DB was re-seeded afterwards, so the three markers exist only in the
throwaway `j18.db`.

### 7. `.work/km-review-j18.md` row count matches the Khmer generated — PASS

**75 data rows = 75 Khmer fields**: 24 person names + 24 person bios + 9 post titles +
9 excerpts + 9 bodies. Generated by reading the seeded database back, so the file cannot
drift from what the seed writes.

Names are flagged in their own section: **7 real personal names marked
NATIVE REVIEWER REQUIRED**, separated from the 17 entries whose "name" is really a job
title. Bodies carry a further warning — the news prose quotes five named officials whose
Khmer spelling has the same risk.

I chose to supply Khmer for all 7 personal names rather than leaving them in English.
The contract's "keep the English" branch is for names with no reliable Khmer form; these
are romanised Khmer names, so a Khmer form exists and only the spelling is uncertain,
which is exactly what the reviewer sweep resolves. Leaving 6 in Latin script beside
`person-heang-koy`'s already-shipping Khmer would also read as broken on the Khmer page.
**This is a judgement call and cheap to reverse** — one `nameKm` per row.

### 8. `bun run db:seed` on a fresh empty database produces all of it — PASS

Run twice from nothing (`j18.db`, `j18c.db`); both produced the counts in §1.

### 9. `bunx biome check` on my file — PASS

`Checked 1 file. No fixes applied.` No new errors, no format drift.

## Reconciliations

**People — 4 existing public rows, all 4 matched onto source records. None dropped.**

| ours | theirs | resolution |
|---|---|---|
| `person-heang-koy` "Mr. Heang Koy" | `heang-koy` "Mr. Heang Koy" | same person, slug kept. Position "Chairman of the Board" → the source's "Chairman, Board of Directors"; invented one-line bio → the source's two paragraphs; existing `nameKm` kept |
| `person-exec-director` "Executive Director" | `sambath` "Mr. Sambath", Executive Director | our row was an unnamed placeholder for this seat; replaced with the real person. Slug → `person-sambath`, email `sambath@kapekh.org` added |
| `person-ngs-pm` "NGS Program Manager" | `phal-sovanthy` "Mr. Phal Sovanthy", NGSI Program Manager | same seat, same placeholder pattern. Slug → `person-phal-sovanthy` |
| `person-me-manager` "M&E Manager" | `me-manager` "M&E Manager" | exact name match, slug kept. Position "M&E Manager" → "Manager" (the source's `role`) |

Nothing was lost: in all four cases the existing text was invented filler and the source
text is real and longer. Slugs are uniformly `person-<source slug>`, which keeps the two
matched slugs byte-identical; nothing in `src/` or `scripts/` referenced the two renamed
slugs.

**Partners — 4 of 5 reconciled, 1 dropped.** MoEYS, NEP, UNICEF and ASEAN Foundation all
appear in the source and were matched by name; three of them had a placeholder `"#"` url
that the source replaces with a real one. CTN dropped, as above.

**Tier mapping is read, not inferred.** The source's `group` maps one-to-one onto
`PeopleForm`'s own tier labels: "Board of Directors" → `board`, "Senior Management Team"
→ `smt`, "Program Managers, Team Leaders & Supervisors" → `pm`. The only thing I inferred
is that the fourth tier, `team`, goes unused — the client's data has no fourth group.

**Taxonomy replaced.** `partner_category` was 5 keys; the source has 8 groups and 4 of
them had no term. New set: `government`, `strategic`, `private`, `foundation`,
`international`, `local`, `implementing`, `technical`. `intl-ngo` was also simply wrong
for ADB, UNESCO and BMZ. Dropped keys: `local-ngo`, `intl-ngo`, `news-agency` (the last
had only CTN on it).

## Stop conditions hit — reported, not worked around

**1. `people.position` has no Khmer column.** `listPeople` and `getPersonBySlug` read
`people.position` directly; there is no `position_km` and no `translations` row for it.
So every job title ships in English on the Khmer site — visible in `team-km.png`, where
Khmer names sit above "Chairman, Board of Directors". The contract asked for positions to
be machine-translated; there is nowhere to put the result, and writing translations rows
nothing queries is the failure mode the contract forbids. **Not done. Needs
`src/server/schema.ts` + `src/server/repo/people.ts` + `PeopleForm.tsx`.**

**2. `partners.name` has no Khmer column.** One `name` column, no translations entry.
Partner names are English-only by schema. Recorded in the review file.

**3. The impact story's `kicker` has nowhere to live.** `PostForm.META_FIELDS` has **no
entry for `news` or `story`**, and its submit handler spreads `{...initial.meta}` — so a
seeded `meta.kicker` would survive every save while rendering no control. That is exactly
the invisible-uneditable trap `BACKLOG.md` describes. **`kicker` was not transferred**
("HCC Project · Kratie", "FFF · Siem Reap", "ChildFund · Sophorn Kiri"). Needs a `story`
entry in `PostForm.tsx`.

The story's other extra fields did find real homes: `name` + `role` went into `excerpt`
(a bilingual translated field, and the story source has no excerpt of its own so nothing
was displaced), and `quote` opens the body as a `blockquote` — a StarterKit node with a
toolbar button in `RichTextEditor`, so an editor can see and change it.

## Findings for other jobs

- **Partners band prints the category key, not the term label.**
  `SectionRenderer.tsx:1509-1515` groups by `r.category` and renders
  `cat.replace(/-/g, " ")`. `terms.label` never reaches the public page, so the client's
  group titles ("Royal Government of Cambodia", "Implemented Partners", "Technical
  Supportive Partner") cannot be displayed — the page shows GOVERNMENT / IMPLEMENTING /
  TECHNICAL. I kept the keys short and readable and put the client's wording in the term
  label, which is what admins pick from. Fix belongs in `SectionRenderer.tsx` (J03).
- **The people grid ignores tier.** `People` in `SectionRenderer.tsx` renders one flat
  grid and never reads `person.section`. The client's page has three headed groups. Tier
  is stored correctly and `sort` keeps board → smt → pm order, so the fix is presentation
  only. `SectionRenderer.tsx` (J03).
- **Three internal staff rows collide with transferred people.** `seed/internal.ts`
  `seedStaffRoster` seeds "Heang Koy" (K001) — near-certainly the same human as board
  chairman "Mr. Heang Koy" — plus "Sum Bopha" (K002, program NGS) and "Chhim Phallak"
  (K003, program Library), who are the two impact-story subjects: a physics teacher at a
  partner school and a school librarian, neither of them KAPE staff. They are
  `isPublic=false` so they never reach `/team`, but they inflate `people` to 27 and
  misfile two outsiders as employees. `internal.ts` is not mine; not touched.
- **48 photo captions are still only in `feedback/`.** Every news item and story carries
  a `photos[]` array of `{src, caption}` plus a cover `img`. Images are out of scope until
  J19 and `seed/media.ts` is J19's file, so I seeded no `postMedia` and no captions.
  **J19 must pull the captions from `feedback/src/data/{news,stories}.ts` alongside the
  binaries** or they are lost — they are content, not imagery.
- **`src/server/seed.ts`'s completion line is stale**: it still prints "3 news, 2
  stories". Cosmetic, and not my file.
