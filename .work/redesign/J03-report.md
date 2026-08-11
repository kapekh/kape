# J03 — the ten canonical lists

Ten `*.index.tsx` list routes onto `PageHeader`, `Table`, `Badge`, `Button` and `EmptyState`.
No other file opened. `list-ui.tsx` and `ActionMenu.tsx` consumed, not edited.

| | |
|---|---|
| Instance | `http://127.0.0.1:3043`, `DATABASE_PATH=.work/redesign/j03.db`, `AUTH_SECRET=redesign-audit-secret-key-0001` |
| `kape.db` before | `e9789f59cb05f9f3426b9aba88001f9a` |
| `kape.db` after | `e9789f59cb05f9f3426b9aba88001f9a` |
| Viewports | 1440x900 and 390x844 |
| Screenshots | `.work/redesign/shots/j03-*.png` |

**127.0.0.1, not localhost.** Cookies ignore the port. Signed in against `localhost:3043`, this
pane and every other pane on `localhost:30xx` share one `cms_session`, each signed with a different
`AUTH_SECRET`, and they log each other out mid-run. It cost an hour before I worked it out. Any job
still to run should use `127.0.0.1` and `vite dev --host 127.0.0.1`.

## Do, item by item

1. **`PageHeader` on all ten.** Title, description, breadcrumb, the one primary action and a
   toolbar. The `flex items-center justify-between mb-6` wrapper and the `font-display text-2xl`
   `h1` are gone from all ten. Breadcrumbs are new: `Admin > Pages`, and on a filtered posts view
   `Admin > All posts > News`, where the middle crumb is the link that replaces the old
   `← All posts`.

2. **`Table` on all ten.** Every `<table>`/`<thead>`/`<th>`/`<td>` string replaced by
   `Table/THead/TBody/TR/TH/TD`. Measured first-row height, all ten: 56px (57 where the row
   below adds its hairline). Both old heights (`py-2`, `py-2.5`) are gone.

3. **L2, one row affordance.** The bare accent-coloured `Edit` word is gone from all ten
   (`bareEditLinks: 0` in the sweep below). The row's own name cell is the link to the editor —
   it already was on seven of the ten — and the `⋯` menu holds the rest. Rows are **not**
   click targets; see "What I did not do".

4. **L3, `Badge` for status.** pages/projects `live|draft`, posts `live|draft|neutral` off
   `STATUS_TONES`, campaigns `live|draft|warning` (this deletes `bg-amber-500/15`, the admin's
   only raw Tailwind palette colour), users role `accent|neutral`, offices HQ and campaigns
   Featured as `dot={false}` tags, people Public/Internal.

5. **L5, count and filters in the toolbar.** The count rides `ListSearch`'s existing `status`
   prop, so it is one live region and not a second one: `39 pages` unfiltered, `2 of 39` while
   filtering. Filter chips are `Button size="sm"` with `aria-pressed`, inside a `<fieldset>` with
   an `sr-only` `<legend>`, on the eight routes with something to filter by — status on pages,
   posts, projects, campaigns; role on users; tier on people; category on partners; level on
   schools. **Every chip set is derived from the rows already loaded**, so no route invents a
   value and none of them adds a query. Donors and offices have nothing to filter by and get the
   count alone.

6. **L4, page hierarchy.** One 12px guide rule per level of depth (desktop only), and the parent
   title as a second line under the page title. The separate `Parent` column is gone — its value
   moved under the title rather than being dropped; see "Judgement calls".

7. **L7, stacked cards below `md`.** J01's `Table` does it. Verified, not reimplemented: every
   `TD` carries a `label` except the thumbnail and actions cells, so each card prints its column
   names. Measured on nine routes below.

8. **L9 / error state.** `ListStatus`'s error is untouched and now sits under a `PageHeader` that
   stays put. Pasted below.

9. **The four states on all ten.** Loading is `SkeletonRows` in the table's shape with the header
   in place; empty-never-had-any carries a lucide icon and the create action; filtered-away has
   its own wording and a clear action; error names itself and retries.

10. **`?type=`.** Restyled only. `validateSearch` and the in-component normalisation are byte for
    byte what they were. Not validated further, not touched.

## Acceptance

### 1. The four gates

```
$ bunx tsc --noEmit
(silent, exit 0)

$ bun run lint
src/components/admin/CampaignForm.tsx:298:22   lint/suspicious/noArrayIndexKey
src/components/admin/FormBuilder.tsx:280:16    lint/suspicious/noArrayIndexKey
src/components/admin/ProjectForm.tsx:242:20    lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:175:17 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:282:16 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:362:21 lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:80:15              lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:373:14             lint/suspicious/noArrayIndexKey
8 errors — the baseline eight, none in my files, none added.

$ bun run test
 Test Files  47 passed (47)
      Tests  429 passed (429)
   Duration  10.84s

$ bun run build
✓ built in 1.40s
```

The indent guides are rendered per depth level; their keys are the slug prefix, not the array
index, so no ninth `noArrayIndexKey`.

### 2. Search still filters — `/admin/pages`

```
before                 39 rows,  count reads "39 pages"
type "Photo Galleries"  1 row,   count reads "1 of 39"
type "Careers"          2 rows,  count reads "2 of 39"
cleared                39 rows,  count reads "39 pages"
```

Status chip, same route: `draft` → 1 row, `aria-pressed="true"`, count `1 of 39`
(the DB holds exactly 1 draft page and 38 published).

### 3. Delete end to end — `/admin/users`

Probe user created through the real form at `/admin/users/new`
(`j03-probe@kapekh.org`, id 5), then:

```
rows before                                    3
⋯ → "Delete user" → dialog:
   "Delete this user? They'll be signed out and lose access immediately. | Cancel | Delete"
Cancel                                         3   (probe row still present: true)
⋯ → "Delete user" → Escape key                 3   (probe row still present: true, dialog closed)
⋯ → "Delete user" → Delete                     2   (probe row present: false)
sqlite3 j03.db "select count(*) from users"    2
```

Second run on `/admin/campaigns`, on a campaign created through `/admin/campaigns/new`:
1 row → confirm → 0 rows, and the never-had-any empty state comes back.

### 4. A refused delete still explains itself

`/admin/projects`, deleting `NGS`, which two schools point at. Run **before** my change
(`git stash push` of my ten files only) and **after**:

```
before my change:  rows 18 → 18, toast:
  "Something else still points at this record. Remove those links first, then try again."
after my change:   rows 18 → 18, toast:
  "Something else still points at this record. Remove those links first, then try again."
```

Identical, because nothing on that path is mine: the message comes from `saveErrorMessage` and the
rollback from `removeWithRollback`, and `git diff -U0` over all ten files matches **zero** lines
containing `removeWithRollback`, `.delete.mutate`, `confirm(`, `prompt(` or `resetPassword`. The
mutation bodies are byte for byte the ones that were there.

Flag for the lead, not a regression: the message says *something* points at the record, it does not
name *what*. SQLite's `FOREIGN KEY constraint failed` carries no table name, and `save-error.ts`
already has the branch that would print one if it did. Pre-existing, not mine to change.

### 5. Row count before and after, all ten

Read off the live DOM, `document.querySelectorAll("tbody tr").length`, same instance, same data.

| Route | Before | After | DB |
|---|---|---|---|
| campaigns | 0 (empty state) | 0 (empty state) | 0 |
| donors | 5 | 5 | 5 |
| offices | 4 | 4 | 4 |
| pages | 39 | 39 | 39 |
| partners | 5 | 5 | 5 |
| people | 7 | 7 | 7 |
| posts | 26 | 26 | 26 |
| projects | 18 | 18 | 18 |
| schools | 5 | 5 | 5 |
| users | 2 | 2 | 2 |

Structural sweep of the same ten after the change:

```
route      h1          breadcrumb              Table  rowH  menus  bare "Edit"  count
campaigns  Campaigns   Admin > Campaigns       (empty state)
donors     Donors      Admin > Donors          true   57    5      0            "5 donors"
offices    Offices     Admin > Offices         true   57    4      0            "4 offices"
pages      Pages       Admin > Pages           true   56    39     0            "39 pages"
partners   Partners    Admin > Partners        true   57    5      0            "5 partners"
people     People      Admin > People          true   56    7      0            "7 people"
posts      All posts   Admin > All posts       true   56    26     0            "26 posts"
projects   Projects    Admin > Projects        true   56    18     0            "18 projects"
schools    Schools     Admin > Schools         true   57    5      0            "5 schools"
users      Users       Admin > Users           true   56    2      0            "2 users"
```

Menu accessible names survived: `Actions for Calendar`, `Actions for staff@kapekh.org`,
`Actions for Hun Sen Rolea B'ier High School`, `Actions for Ministry of Education, Youth and
Sport (MoEYS)` — the row's own name, exactly as before.

### 6 and 7. Keyboard — `/admin/pages`, real key presses

```
start                    INPUT (search)
Tab ->                   BUTTON "All"       [aria-pressed=true]
Tab ->                   BUTTON "draft"     [aria-pressed=false]
Tab ->                   BUTTON "published" [aria-pressed=false]
Tab ->                   SECTION "Pages"    (TableScroll's tabIndex=0, J01's, still there)
Tab ->                   A "Calendar"       (the row's link to the editor)
Tab ->                   BUTTON "Actions for Calendar"
Enter ->                 BUTTON "Delete" {menuitem}   menuOpen=true   url unchanged=true
Escape ->                BUTTON "Actions for Calendar"  menuOpen=false
```

Focus returns to the trigger. Opening the menu does not navigate. Same sequence on `/admin/users`
reaches `Reset password` then `Delete user` with ArrowDown and returns to
`Actions for admin@kapekh.org` on Escape.

Row navigation: the row link is reachable by keyboard and `Enter` on it goes to
`/admin/users/2` ("Edit user"). Both the row target and the menu are reachable, and neither
triggers the other.

### 8. 390px is stacked cards, not a scroll

`clientWidth` and `scrollWidth` of the table wrapper at 390x844. Baseline on `/admin/users` before
the change: **358 / 444**. After:

```
donors    343 / 343    partners  343 / 343    projects  343 / 343
offices   343 / 343    people    343 / 343    schools   343 / 343
pages     343 / 343    posts     343 / 343    users     358 / 358
```

Equal on all nine that have rows (campaigns is empty in this copy). The 343 vs 358 is the page
scrollbar, not the table. Each cell prints its column name from `data-label`:

```
[{label:"Email", ::before:"Email"}, {label:"Name", ::before:"Name"},
 {label:"Role", ::before:"Role"}, {label:"Added", ::before:"Added"},
 {label:null, ::before:"none"}]   ← the actions cell, deliberately unlabelled
```

`j03-users-390.png`, `j03-pages-390.png`, `j03-posts-390.png`.

### 9. Two distinct empty states, one route

`/admin/campaigns`, which holds nothing in this copy:

```
never had any   "No campaigns yet"
                "A campaign is a fundraising goal with its own page on /donate and its own
                 donation record."
                → New campaign                        j03-campaigns-empty-never.png

filtered away   "No campaigns match your filters"
                "Nothing here contains “zzz nothing”."
                → Clear search        count reads "0 of 1"
                                                      j03-campaigns-empty-filtered.png
```

Captured by creating one campaign through the real form, searching for something it does not
match, then deleting it again — which is also the second delete proof in item 3.

The filtered wording adapts: with a chip active and no search term it reads "No campaign carries
that status yet." and the action becomes "Clear filters".

### 10. Loading preserves layout

`window.fetch` delayed 12s, then a client-side navigation to `/admin/users`:

```
h1 "Users", PageHeader present: true
aria-busy container: true, sr-only text "Loading…", 15 skeleton shapes in five 56px rows
```

`j03-users-loading.png` — breadcrumb, title, description and **New user** all still in place.

### 11. `?type=` still filters

```
/admin/posts             26 rows, h1 "All posts", count "26 posts",  columns Title|Type|Status|Slug|Actions
/admin/posts?type=news    3 rows, h1 "News",      count "3 news",    columns Title|Status|Slug|Actions
sqlite3 j03.db "select count(*) from posts where content_type='news'"  →  3
```

The Type column still drops when a type is selected, exactly as before. Breadcrumb
`Admin > All posts > News` carries the way back that `← All posts` used to.

### 12. Screenshots

`j03-pages-1440.png` `j03-pages-390.png` `j03-posts-1440.png` `j03-posts-390.png`
`j03-users-1440.png` `j03-users-390.png`, plus `j03-schools-1440.png` (the thumbnail-and-chips
shape shared by donors, offices, partners, schools), `j03-users-loading.png`,
`j03-pages-error.png`, `j03-campaigns-empty-never.png`, `j03-campaigns-empty-filtered.png`.

### Error state, for completeness

`/admin/pages` with every `/api/trpc/**` request aborted:

```
h1 "Pages", PageHeader present: true
[role=alert]: "This list could not be loaded. | Could not reach the server. Check your
connection and try again. | Try again"
```

## Judgement calls, so the lead can overrule them

- **The `Parent` column on `/admin/pages` moved rather than stayed.** L4 asks for the parent as
  breadcrumb text under the title; leaving the column as well prints the same value twice in the
  row and, once stacked at 390px, twice in the card. No data is lost and no query changed. Say the
  word and it comes back as a column.
- **`Public` became `Visibility` as the people column header.** A column called Public whose values
  are Public and Internal reads as a question. The values are untouched.
- **Descriptions lost their `— N total.` tail** on the seven routes that had it, because the count
  now lives in the toolbar and updates as you filter. The header no longer changes text between
  loading and ready, which is what let the skeleton keep the layout.
- **Campaigns keeps a second row control.** `Donations` is a link to
  `/admin/campaigns/$id/donations` and cannot go in the menu; it is now a `ghost sm` Button rather
  than a bare accent word. See the primitive gap below.

## The primitive gap

**`ActionMenu` cannot hold a link.** `ActionItem` is `{ label, onClick, danger?, disabled? }`, so
"the `⋯` menu holds everything including Edit" — the contract's own recommendation — would mean
turning Edit from an `<a href>` into a button that calls `navigate()`. That loses middle-click,
open-in-new-tab and the status-bar URL, and it is a handler rewire. I did not do it, and I did not
fork the menu. That is why the row's name cell is the editor link and the menu holds the rest.

If the lead wants Edit in the menu, `ActionItem` needs an optional `to`/`href` and `ActionMenu`
needs to render an `<a role="menuitem">` for those items. That is J01's file.

Second, smaller: **`ListSearch` takes no `className`**, so its `mb-4` lands inside `PageHeader`'s
toolbar and adds 16px under the toolbar row. Cosmetic, consistent across all ten, not worth a
primitive change on its own — worth knowing if J01 ever reopens the file.

## What I did not do

- **Rows are not click targets.** The contract's recommendation was a whole-row target plus the
  menu; the stop condition says keep two affordances rather than ship a keyboard regression. A
  clickable `<tr>` needs its own `tabIndex`, `role` and key handler, and the menu button then lives
  inside that target and has to stop its own activation from bubbling into a navigation. The name
  cell being the link gets the same reach with none of that risk, and the tab order above shows
  both the row target and the menu reachable. Overrule me and it is a contained change.
- **Sortable headers.** Out of scope, and inert affordances were not shipped.
- **`?type=` validation.** Out of scope. Untouched.
- **`+ New new`.** On `/admin/posts?type=news` the primary action reads "New new" and always has:
  `singular` is `label.replace(/s$/, "")` and "News" minus its s is "New". Pre-existing, unchanged
  by me, and a real copy bug on my surface. Fixing it properly needs a singular-noun map for all
  ten content types, which is more copy than I should invent unasked. I did remove my own
  description from the blast radius: it reads "Dated content. Each one gets its own public page."
  rather than using `singular`.
- **`/admin/campaigns` at 390px** was measured with one row present, not the five a real deployment
  would have. The route holds nothing in this copy.

## Found and left alone

- `pages.index` is still hard-sorted by slug (`sorted` by `localeCompare`). Untouched — that is L6
  and it is sort logic.
- Page id 35, slug `j03-preview`, status draft, was **already in `j03.db` before I started**. It is
  in the 39 both before and after. Not mine; the lead may want to know where it came from.
- Cover thumbnails on `/admin/schools` render as broken-image placeholders in this copy — the media
  files are not on disk. Pre-existing, unrelated to the markup.
- `bun run build` rewrites `dist/` from the working tree, which right now holds other panes'
  uncommitted work. Whatever deploys must rebuild from a clean tree; the gate run here is not a
  deployable artefact.

## Two environment traps that cost real time

1. **The cookie collision described at the top.** `127.0.0.1`, always.
2. **Six vite dev servers share one `node_modules/.vite`.** Another pane re-optimising deps
   invalidates this one's module URLs mid-session: `Failed to fetch dynamically imported module`,
   then a login form that silently full-page-submits because the client never hydrated. A restart
   of the dev server clears it. Giving the server its own `cacheDir` does **not** work — the page
   then loads React from both caches and dies on "Invalid hook call". Restart, do not isolate.
