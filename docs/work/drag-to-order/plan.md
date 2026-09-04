# Drag to order, and more editing on the page itself

## Context

Two gaps, both reported from the Team page.

**Nothing in the CMS can set the order of a list of records.** `/team` renders one `people`
section listing every public person `orderBy(asc(people.sort))` (`src/server/repo/people.ts:37`).
No screen writes that column: `PeopleForm` carries `sort` through its state and submits it
(`src/components/admin/PeopleForm.tsx:42,59,123`) but renders no control for it, and the People
list has no reorder affordance. The order on the live site is whatever the seed inserted. An
audit found the same for **partners, projects, offices, schools, donors, campaigns, languages
and all four category screens** — every one reads `asc(sort)` and offers no arrows, no number
box, no drag. Nine `*Form.tsx` files carry a `sort` nobody can change. Eighteen projects
currently share one `sort` value, so their public order is undefined.

**Where order *is* editable, it moves one step per click.** Nav items, page sections, repeater
rows, cards, form fields, gallery images and footer socials all use an ArrowUp/ArrowDown pair
(`SectionsBuilder.tsx:213,320,976`, `FormBuilder.tsx:359`, `PostForm.tsx:595`,
`admin.footer.tsx:424`, `admin.nav.tsx:524`). Moving a section from the bottom of a long page
to the top is a dozen clicks — and a dozen server round trips in the nav.

**On-page editing stops short of what the page shows.** The surface handles section text and UI
strings well, and a person's photo can be replaced from the team grid. But the `row(...)`
markers a listing emits for records it pulled in (`useRowMark`, `SectionRenderer.tsx:96`) are
claimed by no resolver — `fieldEditTarget` only parses `section:…` addresses — so at 13 call
sites (post titles and excerpts, project names, and the person's name and position on `/team`)
the DOM carries edit attributes that do nothing. And `fieldEditTarget` gates on
`TEXT_KINDS`, so **no image on any page can be replaced in place** except a person's photo in
the team grid — not even on the person's own profile.

Outcome: an editor drags to order things wherever order matters, with the keyboard as a
first-class path, and far more of what a page shows is editable on the page.

## Stage 1 — one reorder primitive

`src/lib/reorder.ts` — pure, unit-tested:

- `moveItem(list, from, to)` — the list with one entry lifted out and dropped.
- `applyOrder(all, ids)` — the full id order after a **subset** was reordered: the slots that
  subset occupied take the new order, everything else keeps its place. This is what lets a
  tier-filtered grid reorder four people without disturbing the other thirty-five.

`src/components/ui/sortable.tsx` — `useSortable({ ids, onReorder, axis, describe, disabled })`
returning `{ order, dragging, itemProps(id), handleProps(id), status }`, plus a `<DragHandle>`
grip button and `<SortableStatus>` (visually-hidden `aria-live`).

- Pointer Events, not HTML5 drag-and-drop: one path for mouse, touch and pen. iOS Safari has
  no HTML5 DnD and the admin is used on phones — every list already carries `max-md:` handling.
  `touch-action: none` on the handle only, so the page still scrolls everywhere else.
- Live preview by reordering local state as the pointer crosses a neighbour's midpoint, rects
  re-measured after each swap. Items visibly move aside, with no transform bookkeeping.
- Escape and `pointercancel` revert; `pointerup` commits once.
- Keyboard on the handle: Up/Left earlier, Down/Right later, Home/End to the ends, announced
  as "Heang Koy, 2 of 9". Keyboard commits are debounced ~400 ms so holding a key is one write,
  not eight (every admin mutation clears the whole render cache — `trpc/init.ts:69`).
- `onReorder` may be async; a rejection rolls the order back and reports through the existing
  `toast` (`Dialogs.tsx:99`) in the admin, or `setStatus({kind:"error"})` on the public site.
- Honours `prefers-reduced-motion`.

Only the handle drags, so a card wrapped in a link still navigates on click.

## Stage 2 — one server reorder

`src/server/repo/reorder.ts`: read the scope ordered by `(sort, id)`, run `applyOrder`, write
`sort = index` across the whole scope in one sync `db.transaction` — the pattern `deletePage`
already uses (`repo/admin.ts:1370`). Renumbering the whole scope also cleans up the duplicate
`sort` values the seeds left behind. Ids outside the scope are ignored rather than throwing, so
a stale page cannot corrupt an order.

Wrappers, each scoping the read: `reorderPeople`, `reorderPartners`, `reorderProjects`,
`reorderOffices`, `reorderSchools`, `reorderDonors`, `reorderCampaigns`, `reorderTerms(taxonomy)`,
`reorderLanguages`, `reorderNavItems(parentId)`.

tRPC: `reorder: adminProcedure.input(z.object({ ids: z.array(z.number().int()).max(500) }))` on
the matching routers (`adminLanguages` keys on the language `code`, not an id). Permissions come
free from `adminProcedure` + `ROUTER_AREA`, and the cache bust is automatic.

## Stage 3 — the Team page (the ask)

In the `People` renderer (`SectionRenderer.tsx:2150`), when `useMayEditPeople()` is true the grid
becomes a `useSortable` list keyed on person id, each card growing a grip on hover/focus beside
the existing photo button. Drop calls `adminPeople.reorder` with the ids that section shows, then
the established refresh pair (`queryClient.removeQueries()` + `router.invalidate()`, as in
`PersonPhotoEdit.tsx:47`). Because the payload is a subset, `applyOrder` leaves anyone the
section filtered out exactly where they were.

The same for the `projects` grid, and for `partners` within a category row (the page groups
partner logos by category — `SectionRenderer.tsx:2436`), behind `may("projects")` / `may("partners")`.

## Stage 4 — the admin lists

Drag rows in People, Partners, Projects, Offices, Schools, Donors, Campaigns, the four
`TermsManager` screens and Languages, through one `<SortableTableBody>` wrapper over the
existing `Table` primitives (`ui/table.tsx` spreads arbitrary props onto `TR`, so nothing is
rewritten). A grip cell goes first; the rest of each row is untouched.

People is ordered `(tier, sort)`. Rather than pretend the table is one list, the body is split
into a `<tbody>` per tier with a subheader row, and each group is its own sortable — dragging
inside Board reorders Board. That also makes the tiers legible, which the flat table does not.

Every list keeps a keyboard path through the handle; nothing becomes drag-only. While a filter
or search narrows a list, dragging is disabled with a one-line reason, because a reorder of a
filtered view is a lie about where the row lands.

## Stage 5 — the builders

The same primitive over plain arrays, no server: page sections, repeater rows and cards
(`SectionsBuilder`), form fields (`FormBuilder`), footer links **and** socials — links have no
reorder at all today (`admin.footer.tsx:84`) — gallery images (`PostForm`, `axis: "grid"`),
and project map locations (`ProjectForm`, add/remove only today). The ArrowUp/ArrowDown pairs
come out; the handle's arrow keys replace them at one control instead of two.

The nav tree drags among a parent's children and trades its per-click `adminNav.move` round trip
for one `adminNav.reorder`. Reparenting by drag stays out: the tree already has "add child
under", and dragging across depths is its own job.

`ItemsTable` rows are keyed by array index (`SectionsBuilder.tsx:186`); they get a stable key so
a dragged row keeps its identity and focus stays on the handle.

## Stage 6 — more editing on the page

1. **Listed records become editable.** A `RowLayer` resolver in `SectionRenderer` claims
   `field:<name>` markers naming another record: it reads entity, id and lang off the node,
   checks `may()` for that entity's area, and allows only fields the server accepts
   (`PERSON_COLUMN_FIELDS`, `ENTITY_FIELDS`, `repo/admin.ts:902`). `useRowMark` starts emitting
   the source text, label and multiline hint the way a UI string does (`data-cms-source`), so no
   second lookup table appears. This lights up all 13 existing markers: **a person's name and
   position are typed straight into the Team grid**, post titles and excerpts in every listing,
   project names and summaries. `PostListItem` and `ProjectCard` already carry `i18nFallback`
   (`content.ts:63`, `projects.ts:30`); `PersonItem` gains the same flag so a Khmer edit cannot
   silently save the English name — the rule `startValue` enforces everywhere else. A row edit
   has no compare-and-swap (the listing carries no `updatedAt`), which is already true of every
   project edit.
2. **Images are replaced on the page.** `PersonPhotoEdit` generalises into `InlineImageEdit`:
   any section image — hero, band background, card and item images, covers — gets a hover/focus
   camera button opening the existing `MediaLibraryDialog`, saving through
   `adminPages.updateField`. That needs a server-side path: `writeSectionProp` /
   `writeSectionItem` today accept colour, choice and translatable text only, so an `image`
   field is refused (`repo/admin.ts:1049`). They gain an image branch — written as a shared
   prop, never per-language, and validated as a media path rather than free text. Also mount the
   existing `PersonPhotoEdit` on the profile portrait (`PersonView.tsx:136`), which the audit
   found has no photo edit at all.
3. **Sections move on the page.** The edit chip beside `SectionBackground` gains Move up / Move
   down, saving through a new `adminPages.reorderSections` (reorders the base `pages.sections`
   array; per-language overlays live inside each node, so they travel with it). Buttons, not
   drag: a section is a full-viewport band, and dragging one past three others means dragging
   through three screens of autoscroll. Drag for sections lives in the builder, where the rows
   are small.

## Deliberately out, so it is not mistaken for an oversight

- **Page-tree order.** `movePage` exists and is exposed (`router.ts:875`) but no UI calls it, and
  the pages index is an alphabetical finder, not a tree. Making that order draggable means
  turning the index into a tree first — a separate job.
- **Org-chart sibling `sort`**: that screen positions nodes on a canvas; two orderings would fight.
- **Stats and hero slides**: they have `sort` but no admin screen at all. A missing screen, not
  a missing drag.
- **Campaign, Header and Footer text inline**: `site_settings` and campaigns are a different
  write path with no `entity` in the edit model. Worth doing, not here. This is the largest
  remaining block of public text nobody can edit on the page: `footer_blurb`, the contact phone,
  email and address, button and link labels, social names, `site_name_km`, `header_donate_label`.
- **Album pages**: `$.tsx:353` builds the record with an empty `fields` object, so nothing on an
  album page is addressable and none of it is editable.
- **The text sitting next to editable text**: post dates, a job's location and deadline, a
  publication's year, a project's code, status, dates, target areas and snapshots, a person's
  program and group label, map marker labels, the whole `Directory` table, `SiteMap` labels and
  descriptions, org-chart node names, `Pills` labels (parsed out of a comma string) and card
  footer button labels. Each is a marker and a resolver entry, now that the row path exists.
- **Rich bodies** (`RichText`, `Split`, a person's bio, a project's body) stay studio-only. That
  was a decision before this work and it still holds, but it is the bulk of a page and worth
  revisiting on its own.
- **Listing covers** (a post's, a project's, an album's): the image belongs to the other record,
  so each needs a `setCover` path of its own rather than the page's `updateField`.

Two residual risks, both stated rather than fixed:

- A **project** row edited from a listing has no compare-and-swap — `projects` carries no
  `updatedAt` column, so two editors can still overwrite each other there. `page`, `post` and
  `person` do carry one and are checked.
- A reorder busts the database render cache, as every admin mutation does, but **`dist/static` is
  only regenerated by a build**. That is how every inline edit has always behaved; it is not new
  here.

## Verification

- `bun run test` — new: unit tests for `moveItem`/`applyOrder` (the subset rule is the check that
  fails if this breaks), a jsdom test for `useSortable` keyboard reordering and rollback on a
  rejected `onReorder`, a `reorder.ts` repo test that a subset renumber leaves non-members in
  place, and a `SectionRenderer.edit.test.tsx`-style test that a name in the team grid resolves
  to a `person` / `field:name` save.
- `bun run check` (biome) clean.
- `bun dev` on `kape.db`, signed in as `admin@kapekh.org`, driven with Playwright: reorder
  `/team` by drag and by keyboard, reload and confirm it held; `sqlite3 kape.db "select id,sort
  from people order by sort"` renumbered densely; reorder a tier group in `/admin/people`; drag
  sections in a page's builder and save; drag a gallery; type a new position into a Team card;
  replace a hero image from the page. Before/after screenshots of `/team`.
  (If the local admin password is not the dev default I will reset it with a one-off script
  against `kape.db`; nothing touches the live database, and no deploy is part of this.)
- Commits are one per stage, so any stage can be dropped without unpicking the others.

## Notes

- No new dependency: ~180 lines of Pointer Events against ~30 kB for dnd-kit, and the repo has
  no DnD library today.
- Order stays stored, not derived, so the public pages remain prerenderable exactly as now, and
  every reorder busts the render cache through `adminProcedure`.
