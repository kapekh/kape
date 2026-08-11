# J05 — shared editor controls

Port 3045, `.work/redesign/j05.db`, signed in as `admin@kapekh.org`.
`kape.db` checksum `e9789f59cb05f9f3426b9aba88001f9a` at the start and `e9789f59cb05f9f3426b9aba88001f9a` at the end.

Files touched, and no others:

```
src/components/admin/RichTextEditor.tsx
src/components/admin/LangTabs.tsx
src/components/admin/SearchableSelect.tsx
src/components/admin/MapField.tsx
src/components/admin/MapPicker.tsx
```

## The exported signatures, frozen

Six jobs land on top of these. Nothing in the public shape of any of the five moved:

| Export | Props |
|---|---|
| `RichTextEditor` | `ariaLabelledBy?: string`, `value: string`, `onChange: (json: string) => void` |
| `LangTabs<L extends { code, name, nativeName? }>` | `languages: L[]`, `children: (lang: L) => React.ReactNode` |
| `SearchableSelect` | `id?`, `value`, `onChange`, `options: SelectOption[]`, `placeholder?`, `emptyOption?`, `disabled?`, `className?` |
| `SelectOption` | `{ value: string; label: string }` |
| `MapField` | `lat: string`, `lng: string`, `onChange: (lat, lng) => void`, `label?: string` (default `"location"`) |
| `MapPicker` | `lat: string`, `lng: string`, `onPick: (lat, lng) => void` |

No prop added, none removed, none renamed, no default changed. `bunx tsc --noEmit` is silent across all
eleven call sites (`PostForm`, `PageForm`, `PeopleForm`, `ProjectForm`, `PartnerForm`, `OfficeForm`,
`SchoolForm`, `FormBuilder`, `SectionsBuilder`, `admin.nav.tsx`, `admin.org-chart.tsx`).

## Do

### 1. `RichTextEditor` toolbar (F10)

All thirteen buttons are lucide icons: `Bold` `Italic` `Heading2` `Heading3` `List` `Quote` `Link2`
`Image` `Table` `ListTree` `FormInput` `Undo2` `Redo2`. Every icon carries `aria-hidden="true"` and every
button carries an explicit `aria-label` holding **the exact string that used to be its text content**,
glyphs included — `"❝"` is still `"❝"`, `"🖼 Image"` is still `"🖼 Image"`. Acceptance 4 shows the
computed names byte for byte identical.

Grouped, with a hairline divider between groups: text style (`B` `I`) · blocks (`H2` `H3` `• List` `❝`) ·
inserts (`Link` `🖼 Image` `▦ Table` `⁝⁝ Terms` `▤ Form`), then history pushed right. **DOM order is
untouched** — the group wrappers sit around the existing sequence rather than reordering it, so tab order
is what it was (acceptance 10).

Active state comes from one `useEditorState` selector over `bold`, `italic`, `heading 2`, `heading 3`,
`bulletList`, `blockquote`, `link` and `table`. The active button gets `bg-admin-accent-soft` **and**
`aria-pressed`, so the state is not carried by colour alone. `▤ Form` gets `aria-expanded` instead, since
it discloses a menu rather than toggling a mark. Both are additions; neither replaces anything.

The six contextual table buttons keep their names (`"+ Row"` … `"✕ Table"`) and gain `Plus` / `Minus` /
`X` icons beside a shortened visible label (`Row`, `Col`, `Table`). The visible text is a substring of
the accessible name, which is what WCAG 2.5.3 asks for.

The old `▾`-era chrome went with it: `rounded` → `rounded-xl` on the shell, `p-1.5` → `p-2`,
`border-border`/`bg-background` → `border-admin-border`/`bg-admin-panel`, and the form menu onto
`bg-admin-panel-raised` with 40px-scale rows.

### 2. `LangTabs` (E5) — the missing-translation signal is **reported, not built**

The inactive tab now has real affordance: a hover fill, a focus ring, and a chip that inverts to the
accent when the tab is selected. `text-[10px]` (banned by the scale) became `text-xs`.

**The per-language state could not be built and I did not add a prop.** `LangTabs` receives exactly two
things, `languages: L[]` and `children: (lang) => ReactNode`. `L` is constrained to `{ code, name,
nativeName? }`. The field values live in the parent form's state and are only ever read inside the
`children` render function, which is the design that makes tab switching lossless. Nothing the component
holds can answer "does this language have a value". Telling it would mean a new prop every one of the
five callers has to pass, which the contract lists as a stop condition. **Reported to the lead; not
decided here.**

### 3. `SearchableSelect` (F11)

Trigger is now `inputClass` from `#/components/ui/input.tsx` plus `h-10`, so it is the same 40px object as
an `<Input>` and stops being a bespoke field. `▾` became a `ChevronDown` that rotates 180° on open
(`duration-200 ease-out`). Popover onto `bg-admin-panel-raised` / `rounded-xl`; the search box is a real
40px field with a `Search` icon; option rows are `rounded-lg px-3 py-2`; the selected option carries a
`Check` and accent text while the keyboard cursor carries the background — the two used to share
`bg-[var(--accent)]/10` and were indistinguishable.

One behaviour-adjacent change, called out because the lead should see it: **focus now returns to the
trigger when the listbox closes by keyboard.** Before, Escape and Enter both unmounted the search field
under the caret and focus fell to `<body>`, which ended the keyboard path entirely — acceptance 5 has the
before and after side by side. Acceptance item 5 asks me to show focus returning to the trigger, so I
built it; it is six lines and reverting it is a one-line change if you disagree.

### 4. `MapField` and `MapPicker`

Chrome only, canvas untouched. `MapField`: trigger is a `<Button variant="secondary" size="sm">` with a
`MapPin` replacing the 📍 emoji (both `aria-hidden`, so the accessible name is still the coordinates or
"Pick on map"); dialog `rounded-2xl` → `rounded-xl`, `p-5` → `p-6`, `bg-card` → `bg-admin-panel-raised`,
`font-display text-lg text-primary` heading → `text-base font-semibold text-admin-ink`; the two coordinate
inputs are `<Input>` so they land on 40px, now with `htmlFor`/`id` rather than a wrapping label; Clear and
Done are `Button`. The backdrop moved from `bg-foreground/40` to the `bg-black/50 backdrop-blur-sm` that
`Dialogs.tsx` uses — `foreground` inverts by colour scheme, so the old overlay went *pale* in dark mode.

`MapPicker`: container `rounded-lg border-border` → `rounded-xl border-admin-border`, and the map div is
now absolutely positioned inside it so a state layer can sit on top. `z-0` survives.

### 5. The four states

| Control | Loading | Empty | Error | Disabled |
|---|---|---|---|---|
| `RichTextEditor` | skeleton toolbar in the toolbar's shape + `sr-only` "Loading the editor…" (acceptance below) | form menu: "No forms yet. Create one under Forms, then embed it here." | tiptap owns its own | n/a, no button disables |
| `LangTabs` | see the stop above | `languages.length === 0` still returns `null`, unchanged | n/a | n/a |
| `SearchableSelect` | n/a, options arrive with the parent | two wordings: `No matches for "q"` when a filter excluded everything, `Nothing to choose from yet` when the list is empty | n/a | trigger keeps `disabled:opacity-60` from `inputClass` |
| `MapPicker` | "Loading the map…" over the panel until leaflet resolves | n/a | "The map could not load. Enter the coordinates by hand instead." | n/a |
| `MapField` | delegated to `MapPicker` | trigger reads "Pick on map" when there is no pin | delegated | n/a |

---

## Acceptance

### 1. The four gates

```
$ bun run test
$ vitest run
 RUN  v4.1.9 /home/userx/workspace/kape
Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  47 passed (47)
      Tests  429 passed (429)
   Start at  10:21:31
   Duration  20.25s (transform 25.67s, setup 0ms, import 59.00s, tests 23.18s, environment 25.90s)
```

```
$ bunx tsc --noEmit
tsc exit: 0
```
(no output — silent)

```
$ bun run lint
src/components/admin/CampaignForm.tsx:298:22    lint/suspicious/noArrayIndexKey
src/components/admin/FormBuilder.tsx:280:16     lint/suspicious/noArrayIndexKey
src/components/admin/ProjectForm.tsx:242:20     lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:175:17 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:282:16 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:362:21 lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:80:15               lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:373:14              lint/suspicious/noArrayIndexKey
Checked 296 files in 243ms. No fixes applied.
Found 8 errors.
```
Eight, all pre-existing `noArrayIndexKey`, none of them mine. En route I did briefly add two
`lint/a11y/noLabelWithoutControl` in `MapField` by wrapping an `<Input>` component in a `<label>`; biome
cannot see through a component, so those two labels now use `htmlFor`/`id`. Back to 8.

```
$ bun run build
dist/server/assets/PageForm-UVJMEGJl.js         51.27 kB │ gzip: 11.91 kB
dist/server/server.js                           67.78 kB │ gzip: 17.34 kB
dist/server/assets/SectionRenderer-Sen5qhZU.js  83.32 kB │ gzip: 18.51 kB
dist/server/assets/router-BEmijSUH.js          258.12 kB │ gzip: 63.42 kB

✓ built in 2.92s
```

### 2. Rich text still edits, under real key presses

Driven with Playwright keyboard events, not DOM calls. The word is selected with a real double-click
because ProseMirror ignores a synthesised range. Identical before and after — `diff` of the two runs is
empty except for the visible-text suffix on the six table buttons, which is covered in item 4.

```
--- typed a paragraph
<p>Bold this word please</p>

--- clicked H2
<h2>Bold this word please</h2><p><br class="ProseMirror-trailingBreak"></p>

--- Ctrl+B on the selection
<h2><strong>Bold this word please</strong></h2><p><br class="ProseMirror-trailingBreak"></p>

--- Ctrl+Z once
<h2>Bold this word please</h2><p><br class="ProseMirror-trailingBreak"></p>

--- Ctrl+Shift+Z once
<h2><strong>Bold this word please</strong></h2><p><br class="ProseMirror-trailingBreak"></p>

--- inserted a table
<h2><br class="ProseMirror-trailingBreak"></h2><div class="tableWrapper"><table class="w-full
min-w-[32rem] border-collapse text-sm" style="min-width: 75px;"><colgroup><col style="min-width:
25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th
class="border border-border bg-secondary/10 px-4 py-3 text-left align-top font-semibold
text-secondary" colspan="1" rowspan="1"><p><br class="ProseMirror-trailingBreak"></p></th>… (3×3,
header row present) …</tbody></table></div><p><br class="ProseMirror-trailingBreak"></p>
```

Undo took the bold off and left the heading; redo put it back. Undo granularity, mark toggling and the
table extension's output are all unchanged.

### 3. The saved body survives a reload and renders publicly

`/admin/pages/27` (`opportunities/partner`), its Rich text section, through `SectionsBuilder` →
`RichTextEditor` → save → reload → the public page.

```
1 typed into the editor      : present -> "J05 round trip 1786417664267"
2 save button                : "Save page" disabled: false
3 after save, toasts         : []
4 after reload of the editor : present -> "J05 round trip 1786417664267"
5 public /opportunities/partner: present -> "J05 round trip 1786417664267"
```

Line 3 is empty because a toast lives 4.5s and the poll ran after it; lines 4 and 5 are the proof that
matters — the string came back out of SQLite through `renderBody` onto the public page.

### 4. Every toolbar button has an accessible name, and none changed

Chromium's own computed names, via CDP `Accessibility.queryAXTree` per node, in DOM order. Left column is
`git stash`ed HEAD, right column is this branch. `diff` of the two files is empty.

```
BEFORE                                    AFTER
### caret in a paragraph (26 buttons)     ### caret in a paragraph (26 buttons)
 0  role=button  name="B"                  0  role=button  name="B"
 1  role=button  name="I"                  1  role=button  name="I"
 2  role=button  name="H2"                 2  role=button  name="H2"
 3  role=button  name="H3"                 3  role=button  name="H3"
 4  role=button  name="• List"             4  role=button  name="• List"
 5  role=button  name="❝"                  5  role=button  name="❝"
 6  role=button  name="Link"               6  role=button  name="Link"
 7  role=button  name="🖼 Image"           7  role=button  name="🖼 Image"
 8  role=button  name="▦ Table"            8  role=button  name="▦ Table"
 9  role=button  name="⁝⁝ Terms"           9  role=button  name="⁝⁝ Terms"
10  role=button  name="▤ Form"            10  role=button  name="▤ Form"
11  role=button  name="Undo"              11  role=button  name="Undo"
12  role=button  name="Redo"              12  role=button  name="Redo"

### caret inside a table (32 buttons)     ### caret inside a table (32 buttons)
 0-9 as above                              0-9 as above
10  role=button  name="+ Row"             10  role=button  name="+ Row"
11  role=button  name="− Row"             11  role=button  name="− Row"
12  role=button  name="+ Col"             12  role=button  name="+ Col"
13  role=button  name="− Col"             13  role=button  name="− Col"
14  role=button  name="Header"            14  role=button  name="Header"
15  role=button  name="✕ Table"           15  role=button  name="✕ Table"
16  role=button  name="▤ Form"            16  role=button  name="▤ Form"
17  role=button  name="Undo"              17  role=button  name="Undo"
18  role=button  name="Redo"              18  role=button  name="Redo"
```

```
$ diff before-ax.txt after-ax.txt && echo "== AX names still identical after the final edits =="
== AX names still identical after the final edits ==
```

26 and 32 rather than 13 and 19 because `/admin/posts/new` mounts one `RichTextEditor` per language and
the hidden Khmer panel's buttons are in the DOM. They are `hidden`, so they have no AX node and were
filtered out; the counts match exactly 2×.

Zero unnamed, zero changed. The `aria-pressed` and `aria-expanded` I added change neither role nor name.

### 5. `SearchableSelect` by keyboard

`/admin/posts/new`, the Content type field. Accessible name `"Content type"`, from the caption's
`htmlFor` landing on the trigger button — unchanged, and `field-naming.test.tsx` is the guard.

**Before** (HEAD, same script):

```
accessible name : "Content type"  role: button
1 Tab to it            -> BUTTON#_r_0_-content-type  text="News & Events▾"
2 Enter opens          -> INPUT[placeholder="Search…"] | aria-expanded: true
4 typed "even"         -> News & Events / Calendar Event
8 Enter selects        -> trigger reads: "Calendar Event\n▾" | focus: BODY  "Skip to main content…"
9 Enter reopens        -> BODY  "Skip to main content…" | aria-expanded: false
10 Escape closes       -> BODY  "Skip to main content…" | aria-expanded: false
```

Focus fell to `<body>` on select, so step 9 could not reopen it: the keyboard path dead-ended.

**After**:

```
accessible name : "Content type"  role: button
expanded        : false

1 Tab to it            -> BUTTON#_r_0_-content-type  text="News & Events"
2 Enter opens          -> INPUT[placeholder="Search…"]  text="" | aria-expanded: true
3 options before typing:
     News & Events / Impact / Success Story / Announcement / Job Vacancy / Document /
     Photo Album / Video / Calendar Event / Internal News / Publication
4 typed "even", filtered:
     News & Events
     Calendar Event
5 ArrowDown            -> 0:News & Events (selected)  |  1:Calendar Event <- keyboard cursor
6 ArrowDown            -> 0:News & Events (selected)  |  1:Calendar Event <- keyboard cursor   (clamps at the end)
7 ArrowUp              -> 0:News & Events (selected) <- keyboard cursor  |  1:Calendar Event
7b ArrowDown again     -> 0:News & Events (selected)  |  1:Calendar Event <- keyboard cursor
8 Enter selects        -> trigger reads: "Calendar Event" | focus: BUTTON#_r_0_-content-type
9 Enter reopens        -> INPUT[placeholder="Search…"] | aria-expanded: true
10 Escape closes       -> BUTTON#_r_0_-content-type | aria-expanded: false
11 value after Escape  -> "Calendar Event"
12 no matches          -> "No matches for “zzzz”"
```

Escape closes without changing the value (11), and focus is on the trigger after both exits.
`(selected)` and `<- keyboard cursor` are read off the rendered classes, which is the point of splitting
them: selection is the check plus accent text, the cursor is the background.

Note the trigger's *text content* lost the `▾` (step 1: `"News & Events▾"` → `"News & Events"`). At the
ten call sites with a caption this is invisible, because the name comes from `<label for>`. At the one
call site without a caption — `src/routes/admin.nav.tsx:251`, which J12 owns — the name is computed from
text content and therefore loses a trailing `▾`, e.g. `"Select a post… ▾"` → `"Select a post…"`. A
disclosure glyph does not belong in an accessible name and the icon is `aria-hidden`, but it is a name
delta and it is J12's file, so it is flagged here rather than assumed.

### 6. `LangTabs` still switches

```
--- on load
  tabs   : "Englishen" selected=true tabindex=0  |  "Khmerkm" selected=false tabindex=-1
  panels : en: hidden=false title=""  |  km: hidden=true title=""

--- typed an English title
  tabs   : "Englishen" selected=true tabindex=0  |  "Khmerkm" selected=false tabindex=-1
  panels : en: hidden=false title="An English title"  |  km: hidden=true title=""

--- switched to Khmer, typed a Khmer title
  tabs   : "Englishen" selected=false tabindex=-1  |  "Khmerkm" selected=true tabindex=0
  panels : en: hidden=true title="An English title"  |  km: hidden=false title="ចំណងជើងខ្មែរ"

--- switched back to English
  tabs   : "Englishen" selected=true tabindex=0  |  "Khmerkm" selected=false tabindex=-1
  panels : en: hidden=false title="An English title"  |  km: hidden=true title="ចំណងជើងខ្មែរ"
```

Both values survive the round trip, both panels stay mounted, and the roving tabindex still has exactly
one tab stop.

### 7. `LangTabs` keyboard

```
  ArrowRight  selected="Khmerkm"    focus="Khmerkm"
  ArrowRight  selected="Englishen"  focus="Englishen"   (wraps)
  ArrowLeft   selected="Khmerkm"    focus="Khmerkm"     (wraps the other way)
  End         selected="Khmerkm"    focus="Khmerkm"
  Home        selected="Englishen"  focus="Englishen"
```

The pattern is **APG tabs with automatic activation**: selection and focus move together on arrow, Home
and End, with wrapping at both ends, and a roving `tabIndex` so the tablist is one stop. **Unchanged** —
`onKeyDown`, `go()` and the `tabIndex` expression are byte-for-byte what they were; I edited only the two
`className` strings and `mb-4` → `mb-6`. `LangTabs.test.tsx` covers all of it and passes.

### 8. The map still picks

`MapPicker` bare, on `/admin/offices/new`:

```
=== MapPicker on /admin/offices/new ===
  before the click             lat="" lng="" pins=0
  loading overlay present?  0  | map box: {"x":354,"y":501,"width":644,"height":286}
  after clicking the map       lat="12.350734" lng="104.534912" pins=1
  after a second click         lat="12.961736" lng="105.743408" pins=1
```

`MapField`, the modal, on `/admin/projects/new`:

```
=== MapField on /admin/projects/new ===
  trigger name before      : "Pick on map"
  dialog heading           : "Set site location"
  dialog fields before     : "" ""
  dialog fields after click: "12.500940" "104.897461"
  trigger name after       : "12.5009, 104.8975"
```

Fixed-6 on the way in, fixed-4 on the trigger, one marker reused rather than added — all as before. The
`label` prop still reaches the heading ("Set site location") and the backdrop's
`aria-label="Close site location picker"`.

Loading and error states, with leaflet's requests aborted:

```
map error state visible    : 1 "The map could not load. Enter the coordinates by hand instead."
  wrote j05-map-error-1440.png
```

The rich text loading state, captured by a `MutationObserver` installed before navigation, because the
window between the first render and tiptap mounting is one commit:

```
the toolbar the editor renders before tiptap mounts:

<div class="flex items-center gap-1 border-b border-admin-border p-2">
<span class="sr-only">Loading the editor…</span>
<div data-slot="skeleton" aria-hidden="true" class="rounded-lg bg-admin-border/70 motion-safe:animate-pulse size-9"></div>
<div data-slot="skeleton" aria-hidden="true" class="rounded-lg bg-admin-border/70 motion-safe:animate-pulse size-9"></div>
<span aria-hidden="true" class="mx-1 h-6 w-px bg-admin-border"></span>
<div data-slot="skeleton" aria-hidden="true" class="rounded-lg bg-admin-border/70 motion-safe:animate-pulse size-9"></div>
<div data-slot="skeleton" aria-hidden="true" class="rounded-lg bg-admin-border/70 motion-safe:animate-pulse size-9"></div>
<div data-slot="skeleton" aria-hidden="true" class="rounded-lg bg-admin-border/70 motion-safe:animate-pulse size-9"></div>
</div>
```

The shapes are `aria-hidden` and the `sr-only` span owns the announcement, per the `Skeleton` contract.

### 9. `LangTabs.test.tsx` and `field-naming.test.tsx`

```
$ bunx vitest run src/components/admin/LangTabs.test.tsx src/components/admin/field-naming.test.tsx
 RUN  v4.1.9 /home/userx/workspace/kape

 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  10:21:59
   Duration  4.32s (transform 2.40s, setup 0ms, import 3.51s, tests 607ms, environment 2.73s)
```

### 10. Screenshots, and the tab walk

```
.work/redesign/shots/
  j05-richtext-langtabs-1440.png        j05-richtext-langtabs-390.png
  j05-richtext-table-actions-1440.png   j05-richtext-table-actions-390.png
  j05-langtabs-khmer-1440.png           j05-langtabs-khmer-390.png
  j05-searchableselect-open-1440.png    j05-searchableselect-open-390.png
  j05-searchableselect-no-matches-1440.png  j05-searchableselect-no-matches-390.png
  j05-mappicker-1440.png                j05-mappicker-390.png
  j05-mapfield-trigger-1440.png         j05-mapfield-trigger-390.png
  j05-mapfield-dialog-1440.png          j05-mapfield-dialog-390.png
  j05-richtext-loading-1440.png         j05-map-error-1440.png
```

Tab walk from the language tablist through `/admin/posts/new`, after the change:

```
 0 button[role=tab]  "Englishen"
 1 input  (Title)
 2 textarea  (Excerpt)
 3 button  "B"
 4 button  "I"
 5 button  "H2"
 6 button  "H3"
 7 button  "• List"
 8 button  "❝"
 9 button  "Link"
10 button  "🖼 Image"
11 button  "▦ Table"
12 button  "⁝⁝ Terms"
13 button  "▤ Form"
14 button  "Undo"
15 button  "Redo"
16 div[role=textbox]  (the editor)
17 button  "+ Add images"
18 button  "+ Choose image"
19 button  "News & Events"   (the SearchableSelect trigger)
20 select  (Status, native, J06/J07's to convert)
21 input  "my-post-slug"
…
```

One tab stop for the tablist, thirteen toolbar buttons in their original order, then the editor. That
order is the DOM order the CDP dump in item 4 prints, and that dump is identical before and after.

---

## What I could not do

**The `LangTabs` missing-translation state (Do 2, E5).** Detailed above. The component is given
`languages` and a render function and holds no values, by design. Showing "translated / empty / falls back
to English" needs the caller to tell it, which is a new prop on five call sites. Stop condition; reported.

**A browser capture of the `SearchableSelect` never-had-any empty state.** The
`Nothing to choose from yet` branch fires only when `options` is `[]`, and every live call site on this
database returns rows. The filtered-empty wording is proven above; the other branch is code-read only.

## What I found and left alone

- **`SearchableSelect`'s combobox ARIA is incomplete.** The trigger says `aria-haspopup="listbox"` but
  nothing in the popover has `role="listbox"` or `role="option"`, and there is no `aria-activedescendant`,
  so the keyboard cursor I made visible is still invisible to a screen reader. Fixing it properly means
  moving the option buttons to `role="option"` and wiring `aria-activedescendant` from the search input —
  that is a rebuild of the widget's semantics, not a restyle, and it would regress before it improved.
  Worth its own job.
- **Inside a table, the toolbar wraps to four rows in a narrow editor** (see
  `j05-richtext-table-actions-1440.png`): the six contextual buttons push History onto a line of its own.
  I replaced the `flex-1` spacer with `ml-auto` to reduce it, but tightening it further means either
  icon-only table buttons (two near-identical lucide row/column glyphs, worse) or moving the contextual
  group after `▤ Form`, which changes tab order. Left as is. At 390px it is two clean rows.
- **`MapField`'s dialog is hand-rolled**, not `Dialogs.tsx`. It has `role="dialog"`, `aria-modal`,
  `aria-labelledby`, `tabIndex={-1}` and `useModalPanel` for focus trap and Escape, so it is correct — but
  it is a second modal implementation. Consolidating is behaviour, not design.
- **`OfficeForm` and `SchoolForm` label their lat/lng inputs with `text-[11px]`**, which the scale bans.
  Those files belong to J07/J08.
- **`admin.nav.tsx:251` is the only `SearchableSelect` with no caption.** J12 should give it one; see
  acceptance 5.

## Two things that cost time, so the next pane does not repeat them

1. **Vite served a stale transform of my own file for about half an hour.** `curl
   http://localhost:3045/src/components/admin/SearchableSelect.tsx | grep …` showed HEAD's class strings
   while the file on disk had mine, and screenshots silently captured the old build. Restarting the dev
   server fixed it every time. If a change does not appear, curl the module before you debug the CSS. I
   suspect the watcher lost the file during a `git stash`, which brings me to:
2. **The tree is shared and other panes are editing it live.** Mid-job, `git status` picked up J02's
   `admin.tsx`, `admin.index.tsx` and `login.tsx` and J03's ten `admin.*.index.tsx` files. `git stash
   push <paths>` for a before/after capture is safe only because it names paths — a bare `git stash`
   would have taken another pane's work with it. My commit names its five files explicitly. The box also
   ran out of memory repeatedly (30 GiB, ~600 MiB free at the worst point) and Chromium crashed on
   launch, hence the retry loops.
