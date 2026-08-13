# J06 report, the inline editor for section text

Built as contracted. A marked section field opens a box in `InlineEditBar`, saves through J03's `adminPages.updateField`, and touches nothing else.
Branch `j06-section-editor`, worktree `/home/userx/workspace/kape-j06`, database `./j06.db`, dev server on `:3074`.

Four files, three of them the contract's:

- `src/lib/inline-edit.tsx`, `EditTarget` widened
- `src/components/InlineEditBar.tsx`, the field editor beside `StringEditor`
- `src/components/sections/SectionRenderer.tsx`, the picker and the edit layer
- `src/components/sections/SectionRenderer.edit.test.tsx`, new, 9 cases

Two things the lead needs before the detail:

- **An integration defect between J03 and J04.** J04 marks `props.items[n].kind` on a `resources` section. `kind` is the pdf/video/image select, not text, and `updateField` refuses it. Four such markers on the probe, six on the published page `/en/media/policies`. Section "The marker J03 refuses" below.
- **The page payload carries no version.** The contract says to pass `expectedUpdatedAt` "from the payload the page already has", and there is no such field on it: `ResolvedPage` in `content.ts` has no `updatedAt`. Section "Where the version comes from" below.

## The widened target, which J07 builds on

```ts
export type EditTarget = UiStringTarget | FieldEditTarget;

export type FieldEditTarget = {
  kind: "field";
  entity: EditableEntity;   // "page" | "post" | "person" | "project"
  entityId: number;
  lang: string;             // the language in the URL, which is the one written
  target: string;           // field:<name> | section:<id>:props.<field> | …props.<items>[<n>].<field>
  shown: string;            // the stored source: a title keeps its *accent* asterisks
  fellBack: boolean;        // shown is the default language's text, so the box opens empty
  multiline: boolean;       // textarea rather than a one-line box
  label: string;            // "Lead", for the box's accessible name
};

export const targetKey = (t: EditTarget): string;          // remounts the box per field
export const isEditableEntity = (v: string) => v is EditableEntity;
```

`FieldEditor` in the bar reads nothing but this object plus `useLang()`. It has no idea a section exists, so J07 can point it at a page or post field by handing it the same shape.
`SectionRenderer` exports `fieldEditTarget(sections, identity, target)`, which is the section-shaped producer of one.

**The box reads the section props, not the DOM.** `data-cms-accent` turned out not to be needed: the resolved section props are on the client already, so `props.title` is the stored source, asterisks and all, while the DOM has been split into accent spans. That is one less serializer and no round-trip risk. J07 addressing `field:` targets has no such luxury and will need the DOM path J04 left, or the loader payload.

## 1. A section title saves on `/en`

Page 13, `what-we-do/ict-innovation`, hero title, clicked on `http://localhost:3074/en/what-we-do/ict-innovation`.

Box, on opening:

```
address   section:hero:props.title
tag       INPUT              (kind "text")
value     ICT Innovation
aria      Title (English)
hint      Saves for everyone.
```

`pages.sections` `$[0].props`, before:

```json
{ "eyebrow": "What We Do",
  "title": "ICT Innovation",
  "lead": "From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.",
  "image": "/uploads/6bae6f26-d084-486a-bd8d-41eb6dd31416.jpg",
  "i18n": { "km": { "eyebrow": "សកម្មភាពយើង", "title": "បច្ចេកវិទ្យាព័ត៌មាន", "lead": "ចាប់ពីបន្ទប់កុំព្យូទ័រដំបូងរហូតដល់…" } } }
```

after:

```
sqlite> select json_extract(sections,'$[0].props.title'),
               json_extract(sections,'$[0].props.i18n.km.title'), updated_at from pages where id=13;
ICT Innovation & Digital Learning|បច្ចេកវិទ្យាព័ត៌មាន|2026-08-13T02:38:19.624Z
```

The page after the save, reloaded, and the same page served to `curl`:

```
h1 on screen: 'ICT Innovation & Digital Learning'
edit mode still on: true

$ curl -s http://localhost:3074/en/what-we-do/ict-innovation | grep -ao '<h1[^>]*props.title[^>]*>.\{0,120\}'
<h1 data-cms-entity="page" data-cms-entity-id="13" data-cms-lang="en"
    data-cms-target="section:hero:props.title" class="mx-auto mt-4 max-w-4xl t-page-title …">
  <span>ICT Innovation &amp; Digital Learning</span>
```

## 2. The same field on `/km`, English untouched

Same page, `http://localhost:3074/km/what-we-do/ict-innovation`, same marker. The marker says `data-cms-lang="km"`, so that is the row written.

```
lang on the marker   km
address              section:hero:props.title
value in the box     បច្ចេកវិទ្យាព័ត៌មាន
aria                 Title (ខ្មែរ)
```

`$[0].props` after, and the delta against the before above:

```json
{ "eyebrow": "What We Do",
  "title": "ICT Innovation & Digital Learning",
  "lead": "From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.",
  "image": "/uploads/6bae6f26-d084-486a-bd8d-41eb6dd31416.jpg",
  "i18n": { "km": { "eyebrow": "សកម្មភាពយើង",
                    "title": "បច្ចេកវិទ្យាព័ត៌មាន និងការរៀនឌីជីថល",
                    "lead": "ចាប់ពីបន្ទប់កុំព្យូទ័រដំបូងរហូតដល់…" } } }
```

```
base props byte for byte identical: True
km keys before: ['eyebrow', 'lead', 'title']
km keys after:  ['eyebrow', 'lead', 'title']
changed km.title
  was: បច្ចេកវិទ្យាព័ត៌មាន
  now: បច្ចេកវិទ្យាព័ត៌មាន និងការរៀនឌីជីថល
```

One key of one overlay changed. No key was added or dropped, and the base props, including the shared `image`, are the same bytes.

## 3. Fallback is not overwritten

The seeded content had no fallen-back section field to point at, so this run made one through the editor itself, which demonstrates the clearing path on the way.

Clearing the Khmer hero lead. The hint line changes as the box empties:

```
box on opening      TEXTAREA, "ចាប់ពីបន្ទប់កុំព្យូទ័រដំបូងរហូតដល់ចំណេះដឹង AI — នាំជំនាញសតវត្សរ៍ទី ២១ …"
hint                Saves for everyone.
after emptying it   hint: Empty falls back to English.

km overlay after saving the empty value:
{ "eyebrow": "សកម្មភាពយើង", "title": "បច្ចេកវិទ្យាព័ត៌មាន និងការរៀនឌីជីថល" }      ← lead is gone
```

Reopening the same marker on `/km`, which now falls back:

```
url                /km/what-we-do/ict-innovation
text on screen     From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.
box value          ""            ← empty
box is empty       true
placeholder        ខ្មែរ…
note               No ខ្មែរ text stored, so the page is showing “From the first computer labs to AI
                   literacy — bringing 21st-century skills into every classroom.”. What you save here
                   becomes the ខ្មែរ version.
hint               Empty falls back to English.
```

Same wording and same rule as `StringEditor` for a key with no row. Typing Khmer in and saving writes Khmer, never the quoted English:

```
sqlite> select json_extract(sections,'$[0].props.i18n.km.lead'), json_extract(sections,'$[0].props.lead') from pages where id=13;
ចាប់ពីបន្ទប់កុំព្យូទ័រដល់ចំណេះដឹង AI។|From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.
```

## 4. A repeater item saves

The `cards` section `b0` on the same page, item 3's body, on `/en`.

```
address   section:b0:props.items[3].body
tag       TEXTAREA          (the cards editor draws a box for a body)
value     Helping students protect their accounts and recognize digital risks.
aria      Body (English)
```

`$[1].props`, item by item, before against after:

```
0 same
1 same
2 same
3 CHANGED
  was: {"title": "Online safety", "body": "Helping students protect their accounts and recognize digital risks."}
  now: {"title": "Online safety", "body": "Helping students protect their accounts, recognise digital risks and report abuse."}
km overlay items identical: True
title prop identical: True | Our digital pillars
```

One item field, one write. The Khmer overlay array, which is a full copy of the array by J03's design, is untouched because this was a default-language write.

Rendered:

```
$ curl -s http://localhost:3074/en/what-we-do/ict-innovation | grep -ao 'items\[3\].body"[^>]*>.\{0,110\}'
data-cms-target="section:b0:props.items[3].body" class="mt-2 t-body text-foreground/75">Helping
students protect their accounts, recognise digital risks and report abuse.</p>
```

## 5. Stale write refused

Two tabs on `/en/what-we-do/ict-innovation`, both with the hero eyebrow open, so both hold the version the page was loaded at. First tab saves, then second tab saves.

```
first tab  -> value "What We Do (first tab)"
sqlite> select json_extract(sections,'$[0].props.eyebrow'), updated_at from pages where id=13;
What We Do (first tab)|2026-08-13T02:43:41.655Z

second tab -> Save
box still open:  true
box still holds: "What We Do (second tab)"
on screen:       Someone else changed this record. Reload the page and try again.

sqlite> select json_extract(sections,'$[0].props.eyebrow') from pages where id=13;
What We Do (first tab)
```

The sentence is `saveErrorMessage`'s `CONFLICT` line, the same one the wholesale editor shows. The typed text stays in the box, so nothing is lost by the refusal.

## 6. Anonymous sees nothing

Signed out, cookies cleared, `http://localhost:3074/en/who-we-are/vision-mission`.

Network, everything but static:

```
304. [GET] /api/trpc/site.visits?batch=1&input=… => [200] OK

Note: 306 static requests not shown.
```

One tRPC call, the visit counter that was already there. No `auth.me`: `hasAdminHint()` reads no `cms_admin` cookie, so `InlineEditProvider` never asks.

In the page:

```
cookies:      ""
editor bar:   false          (no "Edit text on this page" anywhere in the DOM)
markers:      1              (J04's page-title marker, inert)
tabbable:     0              (no marker is focusable)
edit styles:  0              (no stylesheet mentioning data-cms-target)
```

And in the server-rendered HTML, which is what a prerendered page hands every visitor:

```
$ curl -s http://localhost:3074/en/who-we-are/vision-mission -o anon.html
bytes: 67400
tabindex anywhere in the document: 0
"Edit text on this page" in the html: 0
data-cms-target attributes: 1
```

Both of this job's additions to the DOM, the `tabindex` on a marked node and the one `<style>` element, are rendered from `useInlineEdit()`, which is off during SSR and during the first client render. Nothing this job added reaches the served bytes.

## 7. Permission gated

Signed in as `staff@kapekh.org`, whose role carries `permissions: []`, on `/en/what-we-do/ict-innovation`:

```
auth.me   { email: staff@kapekh.org, role: staff, permissions: [], isSuperAdmin: false }

the bar   "Edit text on this page
           Click any outlined text to edit it."
switch    on (carried in localStorage from the admin session in this browser)
tabbable markers: 0
edit styles:      0
clicking the hero title -> box open: false
```

The switch and its label are J05's, shown to anyone signed in. Nothing on the page is outlined, nothing is focusable, and clicking a marked heading does nothing, because the listener is gated on `may("pages")` and never mounts.

The server does not take their word for it either:

```
POST /api/trpc/adminPages.updateField  as staff
  http 403  code FORBIDDEN  message FORBIDDEN

sqlite> select json_extract(sections,'$[0].props.title') from pages where id=13;
ICT Innovation & Digital Learning         ← unchanged
```

## 8. Keyboard

The marked node takes `tabindex="0"` in edit mode, so it is reachable, and Enter opens the box.

```
before          <h2 data-cms-entity="page" data-cms-entity-id="13" data-cms-lang="en"
                    data-cms-target="section:b0:props.title" class="mt…      ← document.activeElement
                tabindex="0"

Enter           box open: true, address section:b0:props.title, value "Our digital pillars"
                document.activeElement: <input data-slot="input" …>

Escape          box open: false
after           <h2 data-cms-entity="page" data-cms-entity-id="13" data-cms-lang="en"
                    data-cms-target="section:b0:props.title" class="mt…
                activeElement === the node it opened from: true
```

The box records `document.activeElement` during its first render, before `autoFocus` moves it, and returns the focus there on Escape and on the close button.

## 9. Cache cleared

`updateField` is an `adminProcedure`, so `clearCache` runs after it (J03's acceptance 5). What that means for a reader is below. Both language variants of page 13 cached first:

```
sqlite> select key, created_at from render_cache;
v4::en::what-we-do/ict-innovation|2026-08-13 02:44:31
v4::km::what-we-do/ict-innovation|2026-08-13 02:44:31
```

A save made in the browser on `/km` only. The editor's own tab reloads `/km`, and never touches `/en`:

```
sqlite> select key, created_at from render_cache;              ← immediately after the save
v4::km::what-we-do/ict-innovation|2026-08-13 02:45:10

$ curl -s http://localhost:3074/en/what-we-do/ict-innovation | grep -ao 'b0:props.title"[^>]*>.\{0,80\}'
… data-cms-target="section:b0:props.title" …><span>Our …            ← English, served fresh

sqlite> select key, created_at from render_cache;              ← after that anonymous request
v4::km::what-we-do/ict-innovation|2026-08-13 02:45:10
v4::en::what-we-do/ict-innovation|2026-08-13 02:45:18
```

The `en` row was deleted by the save even though the editor was on `km`, and the next reader repopulated it. No manual bust anywhere. The Khmer page shows the new text at once:

```
url            /km/what-we-do/ict-innovation
cards title    សសរស្តម្ភឌីជីថល (ធ្វើបច្ចុប្បន្នភាព)
```

The prerendered HTML cache is the second one and is J08's, untouched here.

## 10. The runnable guard on the addressing

`src/components/sections/SectionRenderer.edit.test.tsx`. The probe is built from `SECTION_DEFS` rather than from a database copy: every section type, in every layout it declares, with every field filled, 40 sections, 164 markers, 151 distinct addresses. Layout matters because several draw different markup and so different markers, which is why J04's probe carried `postList` four times.

The guard is stronger than the contract asked for. Parsing is the first half:

- every emitted `data-cms-target` goes through J03's real `parseFieldTarget`, imported from `src/server/repo/admin.ts`
- every section type on the probe emits at least one marker, so a template cannot go dark unnoticed

The second half is that the address survives a write. For each marked address the test runs J03's real `applySectionValue`, then reads the value back through `fieldEditTarget` at the same address, and asserts the two sets agree:

```ts
expect(opens).toEqual(writes);   // no box opens on a field the write path refuses, and
                                 // none is withheld from a field it takes
```

So a marker whose path does not resolve, a picker that reads the wrong item, or an off-by-one in the array index fails the suite rather than a save in production.

```
$ bunx vitest run src/components/sections/SectionRenderer.edit.test.tsx --reporter=verbose

 ✓ the markers J04 emits and the address J03 parses > agrees on every field of every section type 175ms
 ✓ the markers J04 emits and the address J03 parses > writes each marked address back to the field the marker sat on 69ms
 ✓ the markers J04 emits and the address J03 parses > edits the stored source of a title, not the accent spans on screen 60ms
 ✓ editing a section field on the public page > offers nothing to a visitor, and nothing to an admin without pages 215ms
 ✓ editing a section field on the public page > opens the box on the field that was clicked and saves that one address 391ms
 ✓ editing a section field on the public page > saves one repeater item field 219ms
 ✓ editing a section field on the public page > opens empty and quotes the default language where the text fell back 233ms
 ✓ editing a section field on the public page > closes on Escape and puts the focus back where it was 139ms
 ✓ editing a section field on the public page > says so when someone else changed the page first 171ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

The accent case is its own test, because it is the one place where the DOM and the row disagree on purpose:

```
DOM text under the marker:  'Every section type'
what the box opens with:    'Every *section* type'
```

## 11. Gates

```
$ bun run test
 Test Files  52 passed (52)
      Tests  476 passed (476)
   Duration  27.62s

$ bunx tsc --noEmit
exit 0  (no output)

$ bun run lint
Checked 309 files in 344ms. No fixes applied.
Found 6 errors.

$ bun run build
✓ built in 1.97s
```

476 against a baseline of 467, the 9 new ones all in `SectionRenderer.edit.test.tsx`.
Lint holds at 6, the same six `noArrayIndexKey` errors, none of them in a file this job touched.

## The marker J03 refuses

The guard above found it, and it is the contract's stop condition rather than something to work around.

```
section:<id>:props.items[0].kind -> "kind" is not translatable text on a items item. It offers title, meta.
```

- **Section type:** `resources`
- **Target string:** `section:<sectionId>:props.items[<n>].kind`
- **Why J03 is right:** `resources.items[].kind` is declared `kind: "select"` at `src/lib/sections.ts:252-256`, the pdf/video/image chooser. `updateField` only accepts `text`, `textarea` and `richtext` item fields, so writing free text there would put an unrenderable value in a select.
- **Why J04 marked it:** the resources template prints the kind as a badge next to the title, and the marker went on with the rest of the item's text.
- **Where it bites:** six live markers on `/en/media/policies` alone, and the same on `media/ai-digital`, `media/e-newsletter`, `media/escup-sources`, `media/life-skills`, `media/other-publications`.
- **The fix is one marker, in `SectionRenderer.tsx`'s resources template**, which is this job's file, but removing a marker is J04's decision about what is addressable, not this job's about what is editable. Say the word and it is a one-line deletion.

What this job did instead, at its own boundary: `fieldEditTarget` checks the same declared fields `updateField` checks, and returns null for anything else, so no box ever opens promising a save the server will refuse. Verified against the live page:

```
/en/media/policies, admin, edit mode on

click section:b0:props.items[0].kind   -> box open: false
                                          bar still reads "Click any outlined text to edit it."
click section:b0:props.items[0].title  -> address section:b0:props.items[0].title
                                          value   "Child Safeguarding Policy"
```

The cost, and it is the reason this is reported rather than closed: those six `kind` badges still carry the dashed outline that says "editable" and do nothing when clicked. The outline is one attribute selector over `[data-cms-target^="section:"]`, and narrowing it to the writable subset would mean emitting a selector per address. Not worth it while the real fix is deleting a marker.

## Where the version comes from

The contract says to pass `expectedUpdatedAt` "from the payload the page already has". There is no such value on it. `ResolvedPage` in `src/server/repo/content.ts:49` carries `id`, `slug`, `title`, `sections`, `i18nFallback` and no timestamp, and `pages.updatedAt` is not exposed on any public read.

Sending nothing would have been the shortest diff and would have silently disabled the compare-and-swap J03 built for exactly this: two editors on one page, the second one's save quietly overwriting the first.

So the box reads the version once, when it opens, through the admin procedure the same person is already allowed to call:

```
310. [GET] /api/trpc/adminPages.get?batch=1&input={"0":{"json":{"id":13}}} => [200] OK
```

- One request per record per page load, cached in a module-level map and shared by every field on that page. It is not per save and not per keystroke, so D3's objection does not apply.
- The first save awaits the in-flight read rather than racing it, so a fast typist cannot slip a save out unversioned.
- Every save's returned `updatedAt` replaces the cached one, which is what makes acceptance 5 refuse the second tab rather than the third.
- If the read fails, the save proceeds unversioned rather than blocking the edit. That is the one case where the conflict guard degrades.

**The cheaper fix belongs to whoever owns `content.ts`:** add `updatedAt: page.updatedAt` to `ResolvedPage` and the extra request disappears, for this job and for J07. One line in `getPageBySlug`, one in the type. Out of scope here.

## Decisions worth a second look

- **A save reloads the page.** The section text comes from the route loader, and this component has no honest way to update it in place: the value on screen is a rendered `renderTitle` split, and the loader's copy is what the next navigation would restore. `window.location.reload()` after a successful save is a hundred lines less than an optimistic patch and cannot drift. Edit mode survives it in `localStorage`, so the bar comes back on.
- **One delegated listener per renderer, not one per marked node.** Mounted only while `editing && may("pages")`, on `document` in capture, filtered by `closest("[data-cms-target]")` and by whether this renderer owns the section. A page with two renderers therefore hands each marker to the one that has it. A staff user and a visitor get no listener at all.
- **Only `section:` targets open.** A `field:` marker inside a listing points at another record and is J07's call, exactly as J04 wrote it. This job's picker returns null for them.
- **The affordance is CSS on an attribute selector**, injected as one `<style>` while editing, rather than classes on 21 templates: the templates spread the marker before their own `className`, so a class in the marker object would be overwritten. Selecting the current field by its address also avoids mutating nodes React owns.
- **The `cards` repeater has no `itemFields`,** so this job names `title` and `body` locally, the same two J03 names and the same two the card editor draws. If `itemFields` is ever added to the `cards` def, both lists should go.
- **Clearing says what it does.** A repeater item field reads "Empty leaves this blank", a non-default language reads "Empty falls back to English", the default language reads "Empty clears this text". That is J03's report's "offer clear to fall back on plain fields but not on repeater items", in the hint line rather than in a disabled button.

## Notes for J07

- `FieldEditor` takes `FieldEditTarget` and nothing else. To edit a page or post field, build one with `target: "field:excerpt"` and the record's own entity and id; the bar needs no change.
- `fellBack` is yours to compute. For section props it is `props.i18nFallback` from J01; for a page or post it is the payload's own `i18nFallback` array.
- `versionOf` in `InlineEditBar.tsx` only knows how to read a page's version. A post or person target currently saves unversioned. Give it the matching `adminPosts.get` when you wire those up, or push `updatedAt` onto the public payload and delete the read.
- A person's `name` and a project's timestamps are the two holes J03 already named. Do not emit `field:name` on a person.
- The picker refuses any field the section def does not declare as text. If J07 marks something new, add it to the def rather than to the picker.

## Reproducing

```
cd /home/userx/workspace/kape-j06
PORT=3074 bun run dev
# admin@kapekh.org / j06-probe-pass, staff@kapekh.org / j06-probe-pass in ./j06.db only
open http://localhost:3074/en/what-we-do/ict-innovation
```

`./j06.db` is a gitignored copy carrying the demo edits above on page 13, and two local password hashes set for the browser runs. Nothing was written to `:3020` or to the real database at any point.

Next: J06 is done and committed on `j06-section-editor`; J07 can build page and post fields on `FieldEditTarget`, and the lead has one marker to rule on, `resources.items[].kind`.
