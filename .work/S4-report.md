# S4 - section templates and the project view

Done. 41 inventory rows wired, 4 left as code with the reason the inventory gives, 34 keys added to
`src/lib/ui-strings/sections.ts`, and the round trip through `/admin/ui-strings` shown on a public
page in both directions.

## Files touched

- `src/components/sections/SectionRenderer.tsx`
- `src/components/ProjectView.tsx`
- `src/lib/ui-strings/sections.ts`

Nothing else. No other slice's module was opened; `PublicOrgChart.tsx` was left alone.

## Gates

`bunx tsc --noEmit`

```
(no output)
```

`bun run test`

```
 Test Files  38 passed (38)
      Tests  370 passed (370)
   Duration  9.24s
```

Floor was 333 over 33 files. The two named guards, run again on their own:

```
$ bunx vitest run src/lib/ui-strings/dictionary.test.ts src/lib/no-brand.test.ts
 Test Files  2 passed (2)
      Tests  12 passed (12)
```

`bun run lint`

```
Checked 281 files in 317ms. No fixes applied.
Found 8 errors.
```

Same 8 as the round baseline, all `lint/suspicious/noArrayIndexKey`, none in my files:

```
src/components/admin/CampaignForm.tsx:298:22
src/components/admin/FormBuilder.tsx:280:16
src/components/admin/ProjectForm.tsx:242:20
src/components/admin/SectionsBuilder.tsx:175:17
src/components/admin/SectionsBuilder.tsx:282:16
src/components/admin/SectionsBuilder.tsx:362:21
src/routes/admin.footer.tsx:80:15
src/routes/admin.footer.tsx:373:14
```

Dictionary sanity, read through the merged index:

```
$ bun -e 'import {defaultUiStrings, duplicateUiStringKeys} from "./src/lib/ui-strings.default"; …'
total keys 152
dupes {}
```

## Every row accounted for

The inventory gives `SectionRenderer.tsx` **32** `new-key` rows and `ProjectView.tsx` **8**; the job
file says 9 for `ProjectView.tsx`, which counts line 49 twice because that one row carries two keys
(`project.current`, `project.past`). Reconciled: **40 `new-key` rows, 41 key wirings, 40 wired, 0
skipped**, plus the 4 `leave` rows below.

Line numbers are the inventory's. The files moved as I edited them; every row was confirmed against
the real line before it was touched.

### `src/components/sections/SectionRenderer.tsx`

| line | key | state |
|---|---|---|
| 306 | `hero.slide` | wired |
| 338 | `cta.learnMore` | wired |
| 345 | `cta.learnMore` | wired |
| 497 | `cta.learnMore` | wired |
| 510 | `cta.learnMore` | wired |
| 783 | `cta.donateNow` | wired |
| 791 | `cta.learnMore` | wired |
| 817 | `empty.resources` | wired |
| 830 | `resources.kindDefault` | wired |
| 1015 | `forms.yourName` | wired (defined here) |
| 1021 | `forms.emailPlaceholder` | wired (reused from `pages.ts`) |
| 1028 | `forms.message` | wired (reused from `forms.ts`) |
| 1143 | `empty.posts` | wired |
| 1168 | `jobs.col.position` | wired |
| 1171 | `jobs.col.location` | wired |
| 1174 | `jobs.col.deadline` | wired |
| 1197 | `jobs.apply` | wired |
| 1314 | `empty.videos` | wired |
| 1367 | `empty.albums` | wired |
| 1385 | `albums.count` | wired |
| 1417 | `empty.publications` | wired |
| 1462 | `publications.downloadsOne` / `publications.downloads` | wired (one row, two keys) |
| 1496 | `empty.people` | wired |
| 1599 | `empty.directory` | wired |
| 1729 | `empty.partners` | wired |
| 1739 | `partners.uncategorised` | wired |
| 1747 | `empty.partners` | wired |
| 1818 | `home.news.all` | wired (existing seeded key) |
| 1823 | `empty.projects` | wired |
| 1910 | `empty.certificates` | wired |
| 2024 | `empty.sitemap` | wired |
| 2082 | `empty.orgchart` | wired |

32 rows, 32 wired.

Left as code, the four `leave` rows the job named:

| line (now) | text | why |
|---|---|---|
| 1485 | `PDF` | format acronym |
| 1630 | `c.replace(/([A-Z])/g, " $1")` | column header derived from the source row's key names, so there is no fixed string to key |
| 1967 | `PDF` | format acronym |
| 2163 | `Unknown section type: {type}` | diagnostic for a renamed or deleted template; never renders in a healthy install |

### `src/components/ProjectView.tsx`

| line | key | state |
|---|---|---|
| 36 | `project.notfound.title` | wired |
| 38 | `project.notfound.body` | wired |
| 49 | `project.current`, `project.past` | wired (one row, two keys) |
| 56 | `project.donors` | wired |
| 83 | `project.startDate` | wired |
| 86 | `project.endDate` | wired |
| 94 | `project.targetAreas` | wired |
| 108 | `project.snapshots` | wired |

8 rows, 9 keys, all wired. `ProjectView.tsx:8`'s hardcoded `en-GB` is untouched: it is on the
inventory's "Not a key" list and not this round's work.

## Keys added

**34 keys wired across 41 sites.** The gap is the reuse the job called out: `cta.learnMore` is one
key behind five call sites and `empty.partners` one behind two.

`sections.ts` now holds 38 keys, the 4 it already had plus these 34. Every English string is
`keys.proposed.ts` verbatim; nothing was reworded.

The three form placeholders each went a different way, as instructed. `forms.emailPlaceholder` was
already in `pages.ts` and `forms.message` in `forms.ts`, so both are read, not defined -
`duplicateUiStringKeys()` returns `{}`, which is the check that would have caught a second
definition. `forms.yourName` had no definition and no other reader, so it is defined in `sections.ts`
despite the prefix.

`publications.downloads` shipped as two keys. The old code built the plural as a JSX suffix
(`download{n === 1 ? "" : "s"}`), which Khmer cannot express; the call site now picks
`publications.downloadsOne` or `publications.downloads` and passes the count into the slot.

No Khmer was invented. The 34 new keys carry `en` only and fall back to English until a Khmer
speaker words them. The 3 pre-existing `home.*` keys keep the `km` they already had.

Product neutrality: none of the 34 defaults names an organisation, a country or a sector. The
closest is `empty.certificates` ("No accreditations listed yet."), which is generic.

## Round trip, in a browser

Driven headless against the running dev server on `:3011` with `playwright-core`, logged in as
`admin@kapekh.org`. `albums.count` was the key: it is one of mine, it renders on `/en/galleries`
today, and it has an interpolation slot, so it proves the slot survives an admin edit rather than
just the words.

`empty.posts` and `cta.learnMore` were the job's suggestions, but neither renders against the
current `uitest.db`: every content type has published posts, and no card or hero in the seeded pages
leaves its CTA label blank. Showing either would have meant authoring content first, which changes
what the proof is of.

```
logged in: http://localhost:3011/admin
BEFORE: "Photo Galleries\nNew Generation School Classrooms\n2 photos\n21st-Century Library Launch\n3 photos"
default placeholder: {n} photos
row status: albums.count / Saved albums.count.
AFTER: "Photo Galleries\nNew Generation School Classrooms\n2 pictures in this album\n21st-Century Library Launch\n3 pictures in this album"
reset status: albums.count / albums.count in English is back to its default.
RESTORED: "Photo Galleries\nNew Generation School Classrooms\n2 photos\n21st-Century Library Launch\n3 photos"
```

The count changes with the album (2 and 3), so the slot is filled per row, not baked into the string.

Screenshots:

- `.work/i18n/s4-shots/1-changed.png` - `/en/galleries` reading "2 pictures in this album"
- `.work/i18n/s4-shots/2-restored.png` - the same page back to "2 photos" after Reset to default

The Playwright MCP browser was already held by another pane, so this ran as a throwaway script under
`.work/scratch/`, since deleted. Nothing in `kape.db` was touched; the server's `uitest.db` ends the
run with no `albums.count` override, the state it started in.

## Leftover literals

```
$ grep -nE 'placeholder="|title="|alt="|aria-label="' <my two components>
SectionRenderer.tsx:435   alt=""
SectionRenderer.tsx:622   alt=""
SectionRenderer.tsx:690   alt=""
```

Three empty `alt`s on decorative images, correct as they are. No `placeholder`, `title` or
`aria-label` literal remains. A scan for bare JSX text nodes returns only destructured props and
boolean attributes - the four skipped rows above are the only text left in code.

## Nothing to hand back

No stop condition hit. No string needed another slice's file, the suite never went red, the dev
server stayed up, and no writing `git` command was run.
