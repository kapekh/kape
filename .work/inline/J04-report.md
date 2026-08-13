# J04 - addressing, report

Closes D4, D5, D6. Branch `j04-addressing`, worktree `/home/userx/workspace/kape-j04`, database `./j04.db`, dev server on `:3072`.

Three files changed, the three the contract names:

- `src/components/sections/SectionRenderer.tsx`
- `src/components/SubPage.tsx`
- `src/routes/$.tsx`

## What was built

`SectionRenderer` now takes `entity`, `entityId` and `lang` beside `sections`, all three optional so `admin/PagePreview.tsx` (not this job's file) keeps working unmarked.
Identity travels in two React contexts rather than in the props object, because `{...s.props}` is a flat spread and anything put in it would collide with an authored prop name.
Each section wrapper also carries `data-cms-section`, `data-cms-section-type` and `data-cms-section-index`, so `s.id`, `s.type` and the index survive the spread in the DOM as well as in context.

Two hooks emit the tuple:

- `useMark(path)` for the section's own props, producing `section:<sectionId>:props.<path>`.
- `useRowMark(entity, entityId, field)` for text a listing pulled from another record, producing `field:<name>` against that record's own id.

The attribute names are `data-cms-entity`, `data-cms-entity-id`, `data-cms-lang`, `data-cms-target`. Nothing else in the tree used a `data-cms-` prefix before this job.

## Acceptance

### 1. All 21 templates, counted

Probe page `j04-probe` (`pages.id = 43`) in `./j04.db` carries all 21 types across 25 section instances, including the alternate layouts that render different markup: `stats` plain, and `postList` in grid, list, featured and table.

Rendered at `http://localhost:3072/en/j04-probe`, counted out of the served HTML:

```
type               instances  section: fields  field: rows  total
hero                       1               15            0     15
richtext                   1                2            0      2
cards                      1                6            0      6
stats                      2               10            0     10
cta                        1                5            0      5
resources                  1                8            0      8
split                      1                4            0      4
pills                      1                4            0      4
form                       1                3            0      3
certificates               1                4            0      4
siteMap                    1                2            0      2
postList                   4                8           15     23
projectList                1                2            8     10
videoGrid                  1                2            3      5
albumGrid                  1                2            2      4
publicationList            1                2            4      6
people                     1                2            0      2
map                        1                2            0      2
directory                  1                2            0      2
partners                   1                2            0      2
orgChart                   1                2            0      2
TOTAL                     25               89           32    121
```

No type has zero. Seven types stop at their own `eyebrow` and `title`, which is the whole of their authored text; the rest of what they draw belongs to another record or another file:

- **siteMap** draws the published nav tree, whose rows are `nav_item` translations. `nav_item` is not one of the five entities in the plan's tuple, so marking them would emit an entity J03 cannot resolve.
- **people** draws `people` rows. `name` is a column pair (`pickName`, `people.ts:97`) and `position` is a plain column, not translations rows. A `field:name` marker here would tell J03 to write a translations row nothing reads.
- **map** draws into `MapView`, **orgChart** into `PublicOrgChart`. Neither file is this job's.
- **directory** prints whatever keys its source rows carry (`Object.keys(rows[0])`, staff/events/documents). The entity type and field name are not knowable at the call site.
- **partners** draws `listPartners(db)`, which takes no `lang`: partner names are columns, not translations.
- **certificates** marks `items[n].title` but not `issuer` or `year`. See "the one thing that moved" below.

`richtext` and `split` mark `eyebrow` and `title` but not `body`. `body` is rich text: the server renders it to `bodyHtml` (`sections.ts:137`) and it reaches the DOM through `RichBody`, which is not this job's file and takes no pass-through props. Marking it would need a wrapper `<div>` around `RichBody`, and J06's text editor cannot serialize HTML back to a ProseMirror body anyway.

### 2. Targets parse

93 distinct target strings on the probe page. Every one matches one of J03's three forms.

```
field:excerpt
field:name
field:summary
field:title
section:s-albumgrid:props.eyebrow
section:s-albumgrid:props.title
section:s-cards:props.eyebrow
section:s-cards:props.items[0].body
section:s-cards:props.items[0].title
section:s-cards:props.items[1].body
section:s-cards:props.items[1].title
section:s-cards:props.title
section:s-certificates:props.eyebrow
section:s-certificates:props.items[0].title
section:s-certificates:props.items[1].title
section:s-certificates:props.title
section:s-cta:props.body
section:s-cta:props.cta2Label
section:s-cta:props.ctaLabel
section:s-cta:props.eyebrow
section:s-cta:props.title
section:s-directory:props.eyebrow
section:s-directory:props.title
section:s-form:props.body
section:s-form:props.eyebrow
section:s-form:props.title
section:s-hero:props.cta2Label
section:s-hero:props.ctaLabel
section:s-hero:props.eyebrow
section:s-hero:props.lead
section:s-hero:props.slides[0].caption
section:s-hero:props.slides[0].kicker
section:s-hero:props.slides[0].title
section:s-hero:props.slides[1].caption
section:s-hero:props.slides[1].kicker
section:s-hero:props.slides[1].title
section:s-hero:props.stats[0].label
section:s-hero:props.stats[0].value
section:s-hero:props.stats[1].label
section:s-hero:props.stats[1].value
section:s-hero:props.title
section:s-map:props.eyebrow
section:s-map:props.title
section:s-orgchart:props.eyebrow
section:s-orgchart:props.title
section:s-partners:props.eyebrow
section:s-partners:props.title
section:s-people:props.eyebrow
section:s-people:props.title
section:s-pills:props.eyebrow
section:s-pills:props.groups[0].heading
section:s-pills:props.groups[1].heading
section:s-pills:props.title
section:s-postlist-feat:props.eyebrow
section:s-postlist-feat:props.title
section:s-postlist-table:props.eyebrow
section:s-postlist-table:props.title
section:s-postlist:props.eyebrow
section:s-postlist:props.title
section:s-projectlist:props.eyebrow
section:s-projectlist:props.title
section:s-publicationlist:props.eyebrow
section:s-publicationlist:props.title
section:s-resources:props.eyebrow
section:s-resources:props.items[0].kind
section:s-resources:props.items[0].meta
section:s-resources:props.items[0].title
section:s-resources:props.items[1].kind
section:s-resources:props.items[1].meta
section:s-resources:props.items[1].title
section:s-resources:props.title
section:s-richtext:props.eyebrow
section:s-richtext:props.title
section:s-sitemap:props.eyebrow
section:s-sitemap:props.title
section:s-split:props.eyebrow
section:s-split:props.statLabel
section:s-split:props.statValue
section:s-split:props.title
section:s-stats-plain:props.eyebrow
section:s-stats-plain:props.items[0].label
section:s-stats-plain:props.items[0].value
section:s-stats-plain:props.title
section:s-stats:props.eyebrow
section:s-stats:props.items[0].label
section:s-stats:props.items[0].value
section:s-stats:props.items[1].label
section:s-stats:props.items[1].value
section:s-stats:props.title
section:s-unknown:props.eyebrow
section:s-unknown:props.title
section:s-videogrid:props.eyebrow
section:s-videogrid:props.title
```

**One thing J03 has to know.** The plan's third form is written with a literal `items`, but `items` is not the only array a section stores. `hero` holds `slides` and `stats`, `pills` holds `groups`. The target names the array the value actually lives in - `props.slides[1].title`, `props.groups[0].heading` - because inventing `props.items[1].title` for a `slides` array would tell J03 to write to a path that does not exist. J03's parser has to take the array name from the target rather than hardcode `items`. If it hardcodes `items`, 11 of the 93 targets above are refused and the fix belongs in J03, not here.

The four `field:` targets are the listing rows. Their entity is `post` or `project` and their `entityId` is the row's own id, not the page's.

**Entity naming.** The plan's tuple lists `album` as an entity value. This job does not emit it. An album is a `posts` row with `content_type = 'album'` and its title lives in `translations` under `entity_type = 'post'` (`content.ts:495`). The marker names the real `entity_type`, so an album's title marks as `post`. Same reasoning would apply to any other route kind whose rows are stored under a different type.

### 3. Identity is right, not just present

Five marked fields, five different section types. Marker on the left, the row actually holding that text on the right.

```
target      section:s-hero:props.title
marker      entity=page  entityId=43  lang=en   on <h1>
DOM text    'Every section type'

target      section:s-cards:props.items[0].title
marker      entity=page  entityId=43  lang=en   on <h3>
DOM text    'Card one'

target      section:s-stats:props.items[1].label
marker      entity=page  entityId=43  lang=en   on <div>
DOM text    'Band label two'

target      field:title
marker      entity=post  entityId=2  lang=en   on <h3>
DOM text    'Kang Meas District Receives 21st-Century Library for Vulnerable Children'

target      field:name
marker      entity=project  entityId=16  lang=en   on <h3>
DOM text    'Books for Cambodia'
```

The same five in SQL:

```
pages.id=43 $[0].props.title             "Every *section* type"
pages.id=43 $[2].props.items[0].title    "Card one"
pages.id=43 $[3].props.items[1].label    "Band label two"

{"id":190,"entity_type":"post","entity_id":2,"field":"title","lang":"en","value":"Kang Meas District Receives 21st-Century Library for Vulnerable Children"}
{"id":394,"entity_type":"project","entity_id":16,"field":"name","lang":"en","value":"Books for Cambodia"}
```

The hero title differs by the asterisks, which is the point of acceptance 4 below. The other four agree byte for byte.

`lang` follows the URL, not the resolved text. On `/km/j04-probe` the probe has no Khmer overlay, so the screen shows English while the marker says `km`:

```
entity=page entityId=43 lang=km target=section:s-hero:props.eyebrow  text='Probe eyebrow'
entity=page entityId=43 lang=km target=section:s-hero:props.title  text='Every section type'
entity=page entityId=43 lang=km target=section:s-hero:props.lead  text='Hero lead line.'
entity=page entityId=43 lang=km target=section:s-hero:props.ctaLabel  text='Hero CTA'
entity=page entityId=43 lang=km target=section:s-hero:props.cta2Label  text='Hero CTA two'
entity=page entityId=43 lang=km target=section:s-hero:props.stats[0].value  text='1,200'
```

That is the plan's ruling at `LEAD.md`: the URL's language is what gets written. The payload's `i18nFallback` is what tells the editor the text on screen is not the row it is about to write.

### 4. The accent form survives

Probe title stored as `Every *section* type`. Rendered:

```html
<h1 data-cms-entity="page" data-cms-entity-id="43" data-cms-lang="en"
    data-cms-target="section:s-hero:props.title" class="mt-6 t-display text-primary">
  <span>Every </span>
  <span data-cms-accent="" class="italic text-[var(--accent)]">section</span>
  <span> type</span>
</h1>
```

The marker sits on the `<h1>`, which is the whole field. The accent span carries `data-cms-accent` so the marked region reconstructs without guessing: a text span is its text, a `data-cms-accent` span is `*` + its text + `*`, a `<br>` is a newline. Run over the DOM above:

```
serialized back from the marked region: 'Every *section* type'
stored source in SQL:                   'Every *section* type'
round trip identical: True
```

Without `data-cms-accent` the same DOM serializes to `Every section type` and the asterisks are gone on the first save. The serializer itself belongs to J06; this job's job was to leave a DOM it can be written against.

### 5. `h1` count unchanged

47 pages captured before and after, 46 of them with a body (`/en/` is a 301 stub in both captures, hence 0/0). Every page has exactly one `h1`, before and after.

```
en_                                                  0  0
en_calendar                                          1  1
en_calendar_international-days                       1  1
en_calendar_public-holidays-cambodia                 1  1
en_calendar_public-holidays-kape                     1  1
en_careers                                           1  1
en_galleries                                         1  1
en_galleries_album-library-launch                    1  1
en_j04-probe                                         1  1
en_media                                             1  1
en_media_ai-digital                                  1  1
en_media_annual-report                               1  1
en_media_e-newsletter                                1  1
en_media_escup-sources                               1  1
en_media_life-skills                                 1  1
en_media_other-publications                          1  1
en_media_paper-research                              1  1
en_media_policies                                    1  1
en_media_program-brochure                            1  1
en_media_program-report                              1  1
en_news                                              1  1
en_news_school-enrollment-campaign-2025-2026         1  1
en_opportunities                                     1  1
en_opportunities_alumni                              1  1
en_opportunities_careers                             1  1
en_opportunities_partner                             1  1
en_opportunities_scholarship                         1  1
en_opportunities_volunteer                           1  1
en_projects_bfc                                      1  1
en_publications                                      1  1
en_stories                                           1  1
en_team                                              1  1
en_team_person-heang-koy                             1  1
en_videos                                            1  1
en_what-we-do                                        1  1
en_what-we-do_ict-innovation                         1  1
en_what-we-do_learning-applications                  1  1
en_who-we-are                                        1  1
en_who-we-are_about                                  1  1
en_who-we-are_director-speech                        1  1
en_who-we-are_fact-sheet                             1  1
en_who-we-are_partners                               1  1
en_who-we-are_vision-mission                         1  1
km                                                   1  1
km_j04-probe                                         1  1
km_news                                              1  1
km_team                                              1  1
TOTAL                                                46  46
```

`Heading` still decides `h1` versus `h2` from `OwnsPageTitle`. The marker goes on whatever tag that produced, and `data-cms-target` names the field, so the tag is not carrying identity.

### 6. The signed-off look does not move

The `j14-sections-{before,after}.json` probe the contract points at is **not in `.work/redesign/`** in this worktree - that directory holds four report markdowns, `PRIMITIVES.md` and `shots/`, nothing else. It is presumably in the redesign round's uncommitted working tree. Built the equivalent instead: capture the served HTML of all 47 pages with the change stashed, then with it applied, strip every tag and compare the remaining text nodes in order.

```
47 pages compared, 0 with changed rendered text
```

That covers all 21 section types (through the probe page) plus every published page, both languages, and the four detail-page kinds.

### 7. Anonymous visitors see nothing new

Same 47 captures, compared as raw HTML rather than as text. Normalising the dev-only `data-tsd-source` attribute and the SSR dehydration timestamps, then deleting every `data-cms-*` attribute from the after capture:

```
47 pages: after-html with data-cms-* stripped is byte-identical to before on 44
differing: ['en_j04-probe.html', 'km.html', 'km_j04-probe.html']
```

The three that differ are the one wrapper element, below. No page has any other difference.

Requests are unchanged. On `/en/who-we-are/vision-mission`:

```
bytes before/after: 66437 66535
resource URLs (src/href) before: 32  after: 32  identical: True

the added attributes on this page:
    data-cms-entity-id="3"
    data-cms-entity="page"
    data-cms-lang="en"
    data-cms-target="field:title"
```

98 bytes for one page-title marker, four `data-*` attributes, no script, no fetch, no style.

### 8. Gates

```
$ bun run test
 Test Files  50 passed (50)
      Tests  449 passed (449)
   Duration  21.59s
exit 0

$ bunx tsc --noEmit
(no output)
exit 0

$ bun run lint
Checked 307 files in 275ms. No fixes applied.
Found 6 errors.
exit 1
```

All six are `lint/suspicious/noArrayIndexKey`, the same six carried in from the baseline. Six in, six out.

```
$ bun run build
dist/server/assets/SectionRenderer-SEH1LZwk.js   98.91 kB │ gzip: 21.81 kB
dist/server/server.js                            67.78 kB │ gzip: 17.34 kB
✓ built in 2.29s
exit 0
```

## The one thing that moved

The contract asks for a marker that forces a wrapper element to be reported rather than restyled around. There is exactly one.

Hero's showcase layout renders a stat's label as a bare text node with no element of its own:

```jsx
<div>
  <div className="font-display …">{s.value}</div>
  {s.label}
</div>
```

There is nothing to hang `data-cms-target` on, so `{s.label}` is now `<span {...mark(...)}>{s.label}</span>`. The span is inline inside a block container and is the last child, so it lays out where the text node did; acceptance 6 shows the rendered text unchanged, and this is the only structural difference in the 47-page HTML diff:

```
before: <div class="font-display …">385+</div>សាលារៀនដែលបានគាំទ្រ</div>
after : <div class="font-display …">385+</div><span>សាលារៀនដែលបានគាំទ្រ</span></div>
```

It shows on the Khmer home page and both probe captures because those are the pages carrying a showcase hero with stats.

**One marker was written and then taken back out.** `certificates` renders `issuer` and `year` joined into a single string (`[it.issuer, it.year].filter(Boolean).join(" · ")`), so marking them separately needs the paragraph split into two spans. That version rendered the identical visible string but changed the text-node boundaries, and acceptance 6 caught it as a diff. Reverted: the contract's stop condition is that no rendered text moves, and two extra markers are not worth arguing with it. `issuer` and `year` are unmarked and belong to whoever is willing to split that paragraph.

## For J03

- The target's array name is not always `items`. See acceptance 2.
- `entity` is the `translations.entity_type` value, so an album marks as `post`. `album` never appears in a marker.
- `entity=person` never appears either: a person's `name` and `position` are columns, not translations rows.
- The three section-scoped forms all address `pages.sections` JSON; the `field:` form addresses `translations`. On the default language a section field is in `props.<path>` directly, on any other language in `props.i18n.<lang>.<path>` - the resolver deletes the overlay before it reaches the client (`sections.ts:125`), so the DOM cannot tell you which, and only the target plus `data-cms-lang` can.

## For J06 and J07

- `data-cms-accent=""` on an accent span is the whole of the round trip contract. Text span → its text, accent span → `*text*`, `<br>` → `\n`.
- Section wrappers carry `data-cms-section`, `data-cms-section-type` and `data-cms-section-index`, so an editor can find the section a marked node belongs to by walking up rather than re-parsing the target.
- A marker inside a listing points at another record. `data-cms-entity-id` on a post title inside `postList` is the post's id, not the page's; the affordance for it is J07's call, not this job's.
- `SectionRenderer`'s three new props are optional. `admin/PagePreview.tsx` passes none, so the preview renders unmarked, which is correct: a preview has no saved row to write to.

## Not done, and why

- `project` detail pages are unmarked. They render through `ProjectView.tsx`, which this job does not own. `projectList` rows on a page do carry `entity=project` markers.
- `person` detail pages are unmarked for the reason above: no translations row behind `name` or `position`.
- Album captions, post `bodyHtml`, and every `t()` UI string are untouched. The UI-string path shipped in job 5 and has its own marker.

## Reproducing

```
cd /home/userx/workspace/kape-j04
PORT=3072 bun run dev
curl -s http://localhost:3072/en/j04-probe | grep -o 'data-cms-target="[^"]*"' | sort -u
```

The probe page lives in `./j04.db` as `pages.id = 43`, slug `j04-probe`, published. It is a fixture of this worktree's database copy, not of the repo; nothing was written to `:3020` or to the real database at any point.
