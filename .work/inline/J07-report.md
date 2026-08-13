# J07 report, the inline editor for page and post fields

Built as contracted. A page's title, brief and body, and a post's title and brief, open J06's box on the page they are printed on and save through `adminPages.updateField`.
Branch `j07-entity-editor`, worktree `/home/userx/workspace/kape-j07`, database `./j07.db`, dev server on `:3076`.
Commit `a1f11f3`.

Five files, four of them the contract's:

- `src/server/repo/content.ts`, `updatedAt` on the page and post payloads
- `src/components/InlineEditBar.tsx`, `versionOf` only
- `src/components/SubPage.tsx`, the record, the picker, the marks and the edit layer
- `src/routes/$.tsx`, which record each route kind is, and the body marker
- `src/components/SubPage.edit.test.tsx`, new, 9 cases

And one line elsewhere, which the lead should see before the detail: **J06's own test asserted the request this job was told to delete.** `SectionRenderer.edit.test.tsx` mocked `adminPages.get` and expected the version it returned. Deleting the read without touching that file leaves the suite red. The test now calls `rememberVersion("page", PAGE_ID, LOADED_AT)` in its probe, which is what a route does, and keeps asserting the same version reaches the server. Three lines in a file that is not mine; nothing else in it moved.

Two more things before the acceptance:

- **A post's body is not editable, and cannot be from this job's files.** Section "The one field this job cannot serve".
- **A page's body edits raw ProseMirror JSON.** It works, acceptance 4 shows it, but it is a footgun worth a ruling. Section "The body is JSON in a textarea".

## What a route hands the bar

```ts
export type PageRecord = {
  entity: EditableEntity;            // "page" | "post"
  entityId: number;
  fields: Record<string, string>;    // field:<name> -> the stored source
  fallback: string[];                // those showing the default language
  updatedAt: string | null;          // the version the page was loaded at
};
```

`pageRecord(page)` and `postRecord(post)` build it straight off `ResolvedPage` / `ResolvedPost`, so a payload that stops carrying a field stops compiling.
`recordFieldTarget(record, lang, target)` is the field-level twin of J06's `fieldEditTarget`: it parses `field:<name>`, refuses anything the record has no source for, and returns J06's `FieldEditTarget` unchanged.
`useRecordMark(record)` emits the marker and, on mount, tells the bar the version.
`FieldLayer` is one delegated listener, mounted only for an admin who may edit that entity, and one `<style>` scoped to that record's own addresses.

The bar itself changed in one place, as instructed:

```ts
const versions = new Map<string, string | null>();
export function rememberVersion(entity, entityId, updatedAt) { … }
const versionOf = (t) => versions.get(key(t.entity, t.entityId)) ?? null;
```

No `adminPages.get`, no promise to await, and a post is versioned because the payload says so rather than because the bar knows a procedure for it.

## 1. A page title saves

Page 40, `calendar/international-days`, `/en`, clicked in the browser as `admin@kapekh.org`.

The box on opening:

```
address   field:title
tag       INPUT
value     International Days
aria      Title (English)
hint      Saves for everyone.
```

`select id, lang, field, value from translations where entity_type='page' and entity_id=40 order by lang, field`, before:

```
627|en|body|{"type":"doc","content":[{"type":"table","cont…
625|en|excerpt|Global observances KAPE and its partners ma…
623|en|title|International Days
628|km|body|{"type":"doc","content":[{"type":"table","cont…
626|km|excerpt|ទិវាអន្តរជាតិដែលខេប និងដៃគូរបស់ខេបប្រារព្ធព…
624|km|title|ទិវាអន្តរជាតិ
```

after:

```
627|en|body|{"type":"doc","content":[{"type":"table","cont…
625|en|excerpt|Global observances KAPE and its partners ma…
623|en|title|International Days (inline)
628|km|body|{"type":"doc","content":[{"type":"table","cont…
626|km|excerpt|ទិវាអន្តរជាតិដែលខេប និងដៃគូរបស់ខេបប្រារព្ធព…
624|km|title|ទិវាអន្តរជាតិ
```

```
rows before 6, rows after 6
same    627|en|body  (19386 chars, byte for byte)
same    625|en|excerpt  (136 chars, byte for byte)
CHANGED 623|en|title
  was: International Days
  now: International Days (inline)
same    628|km|body  (15113 chars, byte for byte)
same    626|km|excerpt  (115 chars, byte for byte)
same    624|km|title  (13 chars, byte for byte)

ids before: 627 625 623 628 626 624
ids after:  627 625 623 628 626 624
```

Row count identical, one value changed, five rows byte for byte the same, and every row id unchanged, so the row was updated in place.

On screen after the save's reload:

```
h1 count on the page: 1
h1 text:              International Days (inline)
document title:       International Days (inline) — KAPE
edit mode still on:   checked
```

## 2. A post title saves

Post 2, `news/kang-meas-21st-century-library`, `/en`, same browser, same box.

```
address   field:title
value     Kang Meas District Receives 21st-Century Library for Vulnerable Children
aria      Title (English)
```

`entity_type='post' and entity_id=2`:

```
rows before 6, rows after 6
same    194|en|body  (262 chars, byte for byte)
same    192|en|excerpt  (100 chars, byte for byte)
CHANGED 190|en|title
  was: Kang Meas District Receives 21st-Century Library for Vulnerable Children
  now: Kang Meas District Receives a 21st-Century Library
same    195|km|body  (218 chars, byte for byte)
same    193|km|excerpt  (77 chars, byte for byte)
same    191|km|title  (59 chars, byte for byte)
```

## 3. Khmer writes a Khmer row

Every published record in this database copy has a row in both languages, so the gap was made through the editor itself, which demonstrates the clearing path on the way. Post 2's brief, on `/km`.

Clearing it. The hint line changes as the box empties:

```
box on opening   TEXTAREA, "គម្រោង BMZ-EYE បានប្រគល់បណ្ណាល័យទំនើប និងសម្ភារៈសិក្សានៅសាលាបឋមសិក្សាព្រែកគយ។"
aria             Excerpt (ខ្មែរ)
hint             Saves for everyone.
after emptying   hint: Empty falls back to English.

after saving the empty value, 5 rows:
194|en|body|…   192|en|excerpt|The BMZ-EYE project handed over a modern library…
190|en|title|…  195|km|body|…  191|km|title|…            ← the km excerpt row is gone
```

Reopening the same marker on `/km`, which now falls back:

```
url            /km/news/kang-meas-21st-century-library
text on screen  The BMZ-EYE project handed over a modern library and learning materials at Preak Koy Primary School.
box value       ""          ← empty
box is empty    true
placeholder     ខ្មែរ…
note            No ខ្មែរ text stored, so the page is showing “The BMZ-EYE project handed over a modern
                library and learning materials at Preak Koy Primary School.”. What you save here becomes
                the ខ្មែរ version.
hint            Empty falls back to English.
```

Typing Khmer and saving:

```
rows before 5, rows after 6
same    194|en|body  (262 chars, byte for byte)
same    192|en|excerpt  (100 chars, byte for byte)
same    190|en|title  (50 chars, byte for byte)
same    195|km|body  (218 chars, byte for byte)
same    191|km|title  (59 chars, byte for byte)
NEW     745|km|excerpt  គម្រោង BMZ-EYE បានប្រគល់បណ្ណាល័យទំនើបនៅសាលាបឋមសិក្សាព្រែកគយ។
```

Exactly one row gained, `lang='km'`. The English row through all three stages, unchanged:

```
192|en|excerpt|The BMZ-EYE project handed over a modern library and learning materials at Preak Koy Primary School.
192|en|excerpt|The BMZ-EYE project handed over a modern library and learning materials at Preak Koy Primary School.
192|en|excerpt|The BMZ-EYE project handed over a modern library and learning materials at Preak Koy Primary School.
```

## 4. Body saves

Page 40's English body, the longest field in this database at 19,386 characters.

```
address   field:body
tag       TEXTAREA
aria      Body (English)
chars     19386
head      {"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader"…
tail      …ុស្ស"}]}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1,"colwidth":null},"content":[{"type":"paragraph"}]}]}]}]}
```

One cell edited in the box, `"World Cancer Day"` → `"World Cancer Day (edited inline)"`, then Save.

```
body chars now 19402 | valid JSON: true
the edited cell: "text":"World Cancer Day (edited inline)"
```

The rendered page, served to `curl`:

```
$ curl -s http://localhost:3076/en/calendar/international-days | grep -o '…World Cancer Day (edited inline)…'
 rowspan="1"><p>4 February 2026</p></td><td class="border border-border px-4 py-3 align-top"
 colspan="1" rowspan="1"><p>World Cancer Day (edited inline)</p></td><td class="border border-border

h1 count: 1
```

19,386 characters into the box and 19,402 back out, through `updateField`, re-rendered by the same `renderBody` the page always used.

## 5. Nothing else died

Page 40's whole translations dump, before acceptance 1 and after acceptance 4, so both this job's page saves are inside the window:

```
rows before 6, rows after 6
CHANGED 627|en|body
  was: {"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type": … (19386 chars)
  now: {"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type": … (19402 chars)
same    625|en|excerpt  (136 chars, byte for byte)
CHANGED 623|en|title
  was: International Days
  now: International Days (inline)
same    628|km|body  (15113 chars, byte for byte)
same    626|km|excerpt  (115 chars, byte for byte)
same    624|km|title  (13 chars, byte for byte)
```

Two rows moved, the two that were edited. The Khmer body, 15,113 characters of it, is byte for byte what it was: the wholesale path would have rewritten all six rows.

The post's dump across acceptance 2, 3 and 11 is pasted under each of those; nothing outside the edited row ever moves.

## 6. Stale write refused

Two tabs on `/en/calendar/international-days`, both loaded before either saved, both with the title box open.

```
first tab  -> value "International Days (first tab)"
sqlite> select value from translations where id=623;   International Days (first tab)
sqlite> select updated_at from pages where id=40;      2026-08-13T03:29:42.110Z

second tab -> Save
box still open:  true
box still holds: "International Days (second tab)…"
on screen:       Someone else changed this record. Reload the page and try again.

sqlite> select value from translations where id=623;   International Days (first tab)
```

The refusal is J03's `CONFLICT` through `saveErrorMessage`, the same sentence the section editor and the wholesale editor show. The typed text stays in the box.

## 7. `h1` count unchanged

Fifteen public pages across every route kind this job touches and several it does not, captured with the change stashed and with it applied. Both captures were taken against a cleared `render_cache` and a restarted dev server, because the first attempt was served the previous code's cached HTML.

```
/en/who-we-are/vision-mission                    1 1
/en/who-we-are/about                             1 1
/en/what-we-do/ict-innovation                    1 1
/en/calendar/international-days                  1 1
/en/media/policies                               1 1
/en/news                                         1 1
/en/news/kang-meas-21st-century-library          1 1
/en/stories/yary-happy-cambodian-children        1 1
/en/publications/annual-report-2025              1 1
/en/galleries/album-library-launch               1 1
/en/team/person-heang-koy                        1 1
/en/projects/bfc                                 1 1
/en/opportunities/volunteer                      1 1
/km/news                                         1 1
/km/news/kang-meas-21st-century-library          1 1
TOTAL                                            15 15
```

The same two captures compared as documents rather than counted:

```
rendered text identical on 15 of 15 | []
markup identical once data-cms-*/tabindex/dev refs are stripped on 15 of 15 | []
```

So no heading level, no wrapper and no text node moved. The only difference this job makes to a served page is the marker attributes J04's form already defined, and `updatedAt` in the loader payload:

```
before: i18nFallback:$R[138]=[]}},settings:…
after : i18nFallback:$R[138]=[],updatedAt:"2026-08-04 04:43:13"}},settings:…

bytes, /en/who-we-are/vision-mission:                67464 -> 67569
bytes, /en/news/kang-meas-21st-century-library:      73051 -> 73063
```

105 bytes on a page whose payload gained the field twice over, against the request per record it replaces.

## 8. Anonymous sees nothing

Signed out, cookies and `localStorage` cleared, `/en/calendar/international-days`.

Network, everything but static:

```
304. [GET] /api/trpc/site.visits?batch=1&input=… => [200] OK

Note: 306 static requests not shown.
```

One tRPC call, the visit counter that was already there. No `auth.me`: without the `cms_admin` hint cookie the provider never asks.

In the page:

```
cookies:            ""
editor bar:         false        (no "Edit text on this page" in the DOM)
markers:            3            (J04's form, inert)
tabbable markers:   0
edit styles:        0
outline on the h1:  none
clicking the h1 opens a box: false
```

And in the served HTML, which is what a cached or prerendered page hands every visitor:

```
bytes: 163994
tabindex anywhere in the document: 0
"Edit text on this page" in the html: 0
data-cms-target attributes: 3
<style> elements mentioning data-cms: 0
```

The `tabindex` and the `<style>` are rendered from `useInlineEdit()`, which is off during SSR and during the first client render, so nothing this job added reaches the served bytes.

## 9. Permission gated

Signed in as `staff@kapekh.org`, on `/en/calendar/international-days`, switch on:

```
auth.me  { id: 1, email: staff@kapekh.org, role: staff, permissions: [], isSuperAdmin: false }

the bar  "Edit text on this page
          Click any outlined text to edit it."
tabbable markers:   0
edit styles:        0
outline on the h1:  none
clicking the h1 -> box open: false
```

The switch and its label are J05's, shown to anyone signed in. Nothing on the page is outlined or focusable, because the layer is gated on `may("pages")` for a page and `may("posts")` for a post, and never mounts.

The server does not take their word for it either:

```
POST /api/trpc/adminPages.updateField   as staff, entity page, field:title
  http 403  code FORBIDDEN  message FORBIDDEN

sqlite> select value from translations where id=623;
International Days (first tab)         ← unchanged
```

## 10. No extra request per record

One page load in edit mode, admin, hero title clicked, on `/en/what-we-do/ict-innovation`. Before, with this job's commit stashed:

```
305. [GET] /api/trpc/site.visits,auth.me?batch=1&input=… => [200] OK
310. [GET] /api/trpc/adminPages.get?batch=1&input={"0":{"json":{"id":13}}} => [200] OK
```

After:

```
305. [GET] /api/trpc/site.visits,auth.me?batch=1&input=… => [200] OK
```

The `adminPages.get` is gone and nothing replaced it. The version still travels: the request body of a section save on that same page, which is J06's path reading this job's registry, on a page that renders no `field:` marker at all.

```
POST /api/trpc/adminPages.updateField?batch=1
{"0":{"json":{"entity":"page","entityId":13,"lang":"en","target":"section:hero:props.eyebrow",
              "value":"What We Do (versioned)","expectedUpdatedAt":"2026-08-12 16:58:14"}}}

sqlite> select json_extract(sections,'$[0].props.eyebrow'), updated_at from pages where id=13;
What We Do (versioned)|2026-08-13T03:36:13.886Z
```

`2026-08-12 16:58:14` is the row's stored `updated_at`, handed over by the payload. J06's compare-and-swap is intact and now costs nothing.

## 11. A post refuses a stale write too

The hole J06 named. Two tabs on `/en/news/kang-meas-21st-century-library`, both with the title box open.

```
first tab  -> value "Kang Meas library (first tab)"
sqlite> select value from translations where id=190;   Kang Meas library (first tab)
sqlite> select updated_at from posts where id=2;       2026-08-13T03:30:49.500Z

second tab -> Save
box still open:  true
box still holds: "Kang Meas library (second tab)"
on screen:       Someone else changed this record. Reload the page and try again.

sqlite> select value from translations where id=190;   Kang Meas library (first tab)
```

The post's dump either side of it, so the refusal cost nothing:

```
rows before 6, rows after 6
same    194|en|body  (262 chars, byte for byte)
same    192|en|excerpt  (100 chars, byte for byte)
CHANGED 190|en|title
  was: Kang Meas District Receives a 21st-Century Library
  now: Kang Meas library (first tab)
same    195|km|body  (218 chars, byte for byte)
same    745|km|excerpt  (60 chars, byte for byte)
same    191|km|title  (59 chars, byte for byte)
```

Before this job the second save would have gone through unversioned and quietly overwritten the first.

## 12. Gates

```
$ bun run test
 Test Files  54 passed (54)
      Tests  496 passed (496)
   Duration  16.80s

$ bunx tsc --noEmit
tsc exit=0            (no output)

$ bun run lint
Checked 312 files in 325ms. No fixes applied.
Found 6 errors.

$ bun run build
✓ built in 1.88s
```

496 against this worktree's baseline of 487, the 9 new ones all in `SubPage.edit.test.tsx`.
Lint holds at 6, all `lint/suspicious/noArrayIndexKey`, none in a file this job touched:

```
src/components/admin/FormBuilder.tsx:315:17
src/components/admin/SectionsBuilder.tsx:188:17
src/components/admin/SectionsBuilder.tsx:300:12
src/components/admin/SectionsBuilder.tsx:385:21
src/routes/admin.footer.tsx:84:15
src/routes/admin.footer.tsx:379:14
```

## The runnable guard

`src/components/SubPage.edit.test.tsx`, built the way J06's probe was: the record comes from `pageRecord` / `postRecord` typed against `ResolvedPage` and `ResolvedPost`, the markers come from the real `SubPage` and the real `useRecordMark`, and every address goes through J03's real `parseFieldTarget`.

```
$ bunx vitest run src/components/SubPage.edit.test.tsx --reporter=verbose

 ✓ the fields a page and a post carry > marks every field the payload holds the source of, and only those 67ms
 ✓ the fields a page and a post carry > opens a box on each of them and on nothing else 304ms
 ✓ the fields a page and a post carry > marks an album's title without offering to edit it 14ms
 ✓ editing a page's own text on the page it is printed on > offers nothing to a visitor, and nothing to an admin without the entity 15ms
 ✓ editing a page's own text on the page it is printed on > saves a page title against the version the payload carried 59ms
 ✓ editing a page's own text on the page it is printed on > saves a post title against the post's own version 52ms
 ✓ editing a page's own text on the page it is printed on > edits the stored body, not the html on screen 27ms
 ✓ editing a page's own text on the page it is printed on > opens empty and quotes English where the field fell back 52ms
 ✓ editing a page's own text on the page it is printed on > says so when someone else changed the post first 40ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

The two that matter most:

- **opens == carries.** For a page and for a post, the set of addresses that open a box equals the set of fields the payload carries the source of, and a listing row's `field:title` on the same page opens nothing. A marker that promises a save the record cannot make fails the suite.
- **the post's version.** `expectedUpdatedAt` in the saved payload is the post's own `updatedAt`, not null and not the page's. That is the regression guard on the hole this job closed.

## The one field this job cannot serve

**A post's body is marked nowhere, and cannot be from the files this job owns.**

- `ResolvedPost` carries `bodyHtml`, the rendered output, and not `body`, the ProseMirror source. `ResolvedPage` carries both, which is why a page's body works.
- Opening the box on the html and saving it would write html into a field `renderBody` parses as JSON, which renders to `""`. The body would vanish.
- The fix is one line, `body: f.body ?? null` on `ResolvedPost` plus the field on the type, in `content.ts`. That file is this job's *for `updatedAt`*, so it is the lead's call rather than a stretch of the contract. Say the word.
- A second line would be needed in `$.tsx`: the post body renders through `RichBody`, which takes no pass-through props, so the marker needs a wrapper `<div>` around it. J04 reverted a change of that shape once already, so it wants the same 47-page text diff before it lands.

Until then the post body is unmarked rather than marked and dead, which is the state J04 left it in.

## The body is JSON in a textarea

Acceptance 4 passes and the round trip is real, but an admin clicking a page's body gets 19,000 characters of ProseMirror JSON in a textarea. Two consequences the lead should rule on:

- **A save that is not valid JSON blanks the body.** `renderBody` returns `""` for anything it cannot parse. `updateField` writes whatever string it is handed; it has no opinion about the shape of a `body`.
- **A blanked body cannot be clicked again.** With no body, `$.tsx` renders the empty-state card instead of the marked `<div>`, so the recovery is the studio's editor, not this one.

The guard is four lines in `FieldEditor`: refuse a save when the target ends in `body` and `JSON.parse` throws. `InlineEditBar.tsx` is this job's for `versionOf` only, so it is not in this commit.

The alternative ruling is to stop marking the body and leave rich text to the studio, which costs one line in `$.tsx`.

## Decisions worth a second look

- **The version comes from the payload, not from a read.** `rememberVersion` is called by `useRecordMark` on mount, for every route kind that has a record, including a page whose sections own the whole screen. A page loaded by client-side navigation registers the version its loader data carried, so a stale cached loader can only produce a spurious refusal, never a silent overwrite.
- **The listener only opens this record's own fields.** A `field:title` marker inside a listing names another post, and the only version on hand is this page's, so opening it would be the very unversioned save this job removed. It stays inert, as J06 left it.
- **An album is marked and not editable.** Its rows are a post's, so J04's marker is correct addressing, but its fields are a later job. `fields: {}` means no outline, no `tabindex` and no box, and the test pins that.
- **A person and a project are not marked at all**, unchanged from J04: a person's name and position are columns, and a project renders through `ProjectView.tsx`, which is nobody's file this round.
- **`AREA` maps entity to permission area locally**, `page → pages`, `post → posts`, mirroring `assertEntityAllowed` in `router.ts`. A pages-only admin gets nothing on a post, which is what the server would tell them anyway.
- **The affordance is one `<style>` per record**, scoped by `data-cms-entity` and `data-cms-entity-id` and listing only the addresses that open. It cannot outline a listing row by accident.

## One cosmetic bleed, in J06's file

While a `field:` box is open on a page that also renders a `postList`, J06's `EditLayer` highlights every listed title as well as the selected one: its selected rule is `[data-cms-target="field:title"]` with no entity or id in the selector, so it matches other records' markers with the same address.

```
src/components/sections/SectionRenderer.tsx:214-217
```

The fix is to scope that rule the way this job's is, by adding the two attribute selectors. One line in a file this job does not own, and cosmetic only: nothing extra is clickable and nothing extra can be saved.

## Reproducing

```
cd /home/userx/workspace/kape-j07
PORT=3076 bun run dev
# admin@kapekh.org / j07-probe-pass, staff@kapekh.org / j07-probe-pass in ./j07.db only
open http://localhost:3076/en/calendar/international-days
```

`./j07.db` is a gitignored copy carrying the demo edits above on page 40, page 13 and post 2, and two local password hashes set for the browser runs. Nothing was written to `:3020` or to the real database at any point.

Next: J07 is done and committed on `j07-entity-editor`; the lead has three calls to make, a post's body source, the body-JSON guard, and J06's selected-outline selector.
