# C4 - An organisation only gets the features it asked for

## 1. Inventory, read from the tree

Counted on `cms-core` at the start of this job, not from the audit.

### Domain tables (10)

`schools`, `offices`, `org_nodes`, `project_locations`, `project_donors`, `projects`, `donors`, `campaigns`, `donations`, `alumni_registrations`.

`alumni_registrations` has no admin route, no router and no section.
It is read once, as a count, by the dashboard.
It is a form-submission table that outlived its form, not a feature surface, so nothing in this job touches it.

`people`, `partners` and `staff` are the three the audit called borderline.
My reading of each is in section 3.

### Admin routers behind `adminProcedure` that are domain-specific (9)

`adminProjects`, `adminSchools`, `adminOffices`, `adminPartners`, `adminDonors`, `adminCampaigns`, `adminDonations`, `adminOrg`, `adminPeople`.

### Admin route files that are domain-specific (20 of 55)

`admin.schools.*` (3), `admin.offices.*` (3), `admin.donors.*` (3), `admin.campaigns.*` (5), `admin.partners.*` (3), `admin.projects.*` (3), `admin.org-chart`, `admin.donations.index`, `admin.partner-categories`.

Two route files the audit grouped with these are **not** domain-specific and stay:

- `admin.locations` manages the `location` taxonomy, which job vacancies use through `PostForm` as well as offices and schools. Turning it off with the office register would take the province list away from a generic content type.
- `admin.publication-categories` and `admin.doc-categories` are taxonomies of the `publication` and `document` content types, which are content, not domain entities.

### Four hardcoded maps in `src/lib/permissions.ts`

`PermissionArea` (15), `PERMISSION_AREAS` (15 with grouped labels), `ROUTER_AREA` (22), `NAV_AREA` (24).
Unchanged by this job. See section 4 for why that is deliberate.

### The sidebar

`NAV` in `src/routes/admin.tsx`: 7 groups, 35 items.

### Page-builder catalogue

21 section definitions in `src/lib/sections.ts`.
`QuerySource` is a closed union of 13 literals.
The sections that bind to a domain table are `projectList` (`projects`), `partners` (`partners`), `orgChart` (`orgchart`) and `map`, which offers two sources from two different features (`locations` from projects, `offices` from the office register).

The sections the audit listed alongside those - `postList`, `videoGrid`, `albumGrid`, `publicationList` - bind to `posts` rows filtered by content type.
They are the trap the contract names and they are untouched.

`people` binds to the `people` table and `directory` binds to `staff`, `event` posts and `document` posts.
Both are discussed in section 3.

## 2. Recommendation

**Take the cheap version, with one structural condition: the flags may not become a fifth hardcoded map.**

I agree with the prior, and the condition is what stops the agreement being lazy.

A registry that the features register themselves into is the right end state, but the honest cost of it here is not a day.
Routes in this app are file-based and discovered by `tsr generate`; a module that owns its own routes needs either a code-split boundary or a generated route manifest, and neither exists.
The permission areas are a TypeScript union that `roles.ts`, `RoleForm` and the tRPC input validator all narrow against at compile time, so moving them to runtime registration loses the type checking that currently makes an unmapped area a build error.
Half of that, shipped, is worse than either end: it looks like the seam is real, and the next person builds on top of a registry that only owns two of the five things a feature is made of.

So: flags in `site_settings`, following `site-identity.ts` exactly - one key, a pure module reading it, no second mechanism.

The condition is that the flags are not a fifth flat list.
`src/lib/modules.ts` holds **one** table, `MODULES`, and every other question is *derived* from it:

- which nav paths disappear
- which tRPC routers refuse
- which permission areas the role editor still offers
- which catalogue sections, and which individual `sources` within a shared section, remain placeable

Nothing is restated.
`MODULES` points **into** `NAV_AREA`, `ROUTER_AREA`, `PERMISSION_AREAS`, `SECTION_DEFS` and `QuerySource` by key, and a test asserts every one of those pointers resolves.

That is half the anti-drift property, and round one shipped only that half.
Pointers resolving catches a renamed router; it does not catch a *new* domain feature that nobody adds to `MODULES`, which is the drift that will actually happen.
`CORE_ROUTERS` and `CORE_NAV_PATHS` name the keys no module owns, and the tests assert that those two lists and `MODULES` between them partition `ROUTER_AREA` and `NAV_AREA` exactly.
So the next domain feature cannot reach `main` without someone deciding, in the source, whether it is core or optional.
See 6b.4.

Two consequences of "derived, not restated" that matter and that a flat list would have got wrong:

**Permission areas are hidden by derivation, never by ownership.**
The `partners` area covers `adminPartners` *and* `adminDonors`, which belong to two different modules.
The `people` area covers `adminPeople`, which is core, *and* `adminOrg`, which is a module.
So an area is dropped from the role editor only when every router and every nav path that maps to it has become unreachable.
`partners` survives while either the partners register or fundraising is on.
`people` survives always, because part of it is core.
No permission mapping was rewritten to make the modules line up, which is what a flat list would have forced.

**A section can lose one source and keep another.**
`map` offers project locations and offices.
With projects off and offices on, `map` stays in the catalogue offering offices only.
With both off it leaves the catalogue.

## 3. The module boundary, and the three borderline cases

Six modules, all off on a fresh install.

| module | label | tables | routers | admin paths | catalogue |
|---|---|---|---|---|---|
| `projects` | Projects | `projects`, `project_locations`, `project_donors` | `adminProjects` | `/admin/projects` | `projectList`, `map` source `locations` |
| `schools` | Schools | `schools` | `adminSchools` | `/admin/schools` | - |
| `fundraising` | Campaigns, donations and donors | `campaigns`, `donations`, `donors` | `adminCampaigns`, `adminDonations`, `adminDonors` | `/admin/campaigns`, `/admin/donations`, `/admin/donors` | - |
| `partners` | Partners | `partners` | `adminPartners` | `/admin/partners`, `/admin/partner-categories` | `partners` section, source `partners` |
| `offices` | Offices | `offices` | `adminOffices` | `/admin/offices` | `map` source `offices` |
| `orgChart` | Organisation chart | `org_nodes` | `adminOrg` | `/admin/org-chart` | `orgChart` section, source `orgchart` |

### `people` is core, and the org chart is not

These are one permission area and one nav group today, and they are two different things.

A staff page with names, photos and titles is what every organisation has, including the law firm.
`/team` is a shipped collection prefix, the fresh install already creates a landing page for it, and `NAV_AREA` already maps it.
Switching it off would strand a URL the installer itself creates, which criterion 5 forbids.

A reporting hierarchy drawn as an interactive chart is not that.
It is a separate table, a separate route, a separate section and a separate renderer, and it is the thing the objective names by hand.
So `org_nodes` becomes the `orgChart` module and `people` stays core.

This is the split a flat "people and org chart" flag would have destroyed.

### `partners` is a module

"Some organisations have funders" is the argument for keeping it, and it is not strong enough.
A partner-and-funder logo wall is a nonprofit convention; to a law firm the word means the people who own it.
The table has no other feature depending on it, the section degrades to nothing, and turning it on is one checkbox.
Off by default.

### `staff` and the internal portal are out of scope, and stay in

The `directory` section binds to `staff`, and to `event` and `document` posts.
It is the staff portal's section, and the contract puts `internalsources` out of scope, so it is still in the catalogue on a fresh install.
This is the one place where criterion 2 is met for the ten domain tables and for partners but not for `staff`.
What making it a module would take is in section 7.

## 4. What the expensive version would still owe

Filtering is not architecture.
Everything below is untouched by this job and would still have to be done.

1. **The route files still ship.** A guard is a check, not an absence: `admin.schools.index.tsx` is still compiled, still in the bundle, still generated into `routeTree.gen.ts`. Real modules need a code-split boundary or a generated route manifest, and file-based routing has neither today.
2. **The tables are still created by every migration.** A law firm's database still has a `schools` table with zero rows. Modules as configuration cannot change that, and the contract correctly forbids trying.
3. **The four maps are still authored by hand.** Adding a domain feature still means editing `permissions.ts`, `NAV` in `admin.tsx`, `SECTION_DEFS`, the renderer registry *and* `MODULES`. `MODULES` points into the others and the test proves the pointers resolve, so they cannot drift apart, but they are still five edits rather than one registration.
4. **Sections still register in two places.** The catalogue is mine, the renderer is C3's, and a section type has to appear in both. A module that owned a section would contribute the definition and the component together.
5. **Nothing external can register.** There is no way for code outside `src/lib/modules.ts` to contribute a nav item, an area, a section or a route.
6. **The public site is not module-aware.** `COLLECTIONS`, the `$` route resolver, the sitemap and `$lang/donate/*` are unchanged on purpose - see criterion 5 - but a real module would own its public URL prefix and be able to withdraw it safely.
7. **Seed data is not partitioned.** `src/server/seed/*` is one KAPE fixture. A module would bring its own demo rows.
8. **Modules have no declared dependencies.** `schools` rows carry a `projectId` and `project_donors` joins projects to donors. Enabling schools with projects off is allowed and produces a school with an unresolvable project reference in its form. A registry would declare and enforce that edge.

## 5. What was built

New:

- `src/lib/modules.ts` - `MODULES`, the settings key `enabled_modules`, the core allow-lists, and every derived selector including `disallowedSections`. Pure: no database, no React, one import of the three maps it points into. Mirrors `site-identity.ts`.
- `src/lib/modules.test.ts` - the runnable checks, 43 cases.
- `src/routes/admin.modules.tsx` - the toggle screen. It is a screen of its own because `/admin/settings` belongs to C3 this week; section 8 says where it should end up.
- `src/server/repo/modules.ts` - `MODULE_TABLES` and `backfillModules`, the legacy-upgrade path (6b.1).
- `src/components/admin/useModules.ts` - what an admin screen asks before reaching into a neighbouring module (6b.2).

Changed:

- `src/routes/admin.tsx` - the sidebar filters on `adminPathEnabled`, and `beforeLoad` redirects a disabled module's path to the dashboard during SSR.
- `src/components/admin/SectionsBuilder.tsx` - the "add a section" picker reads `sectionsFor(settings)`; `add()` takes the layout and the default source from that filtered definition, so a `map` on an install with only offices starts bound to offices rather than to project locations.
- `src/components/admin/RoleForm.tsx` - the area checkboxes read `visibleAreas(settings)`.
- `src/integrations/trpc/init.ts` - `adminProcedure` refuses a disabled module's routers before it does anything else. Only a router that belongs to a module pays for the settings read, so the core admin's hot path is untouched.
- `src/routes/admin.index.tsx` - the dashboard's KPI and its "Manage" shortcut grid stop naming schools, partners and projects when those are off.
- `src/lib/permissions.ts` - `/admin/modules` maps to the `settings` area, so the new screen is not visible to an editor; and the `people` label loses its "& org chart", which the module now contributes while it is on.
- `src/server/seed/site.ts` - the example-site fixture writes all six ids, so `seed:kape` restores the whole admin.
- `src/server/install.ts` - writes `enabled_modules` empty on a fresh install, and backfills it on the first boot of a database that predates it (6b.1).
- `src/integrations/trpc/router.ts` - the section envelope is validated at `adminPages.create` and `.update`, `adminPages.preview` resolves only sources this install has, and `adminTerms` refuses a module's taxonomy (6b.3).
- `src/server/repo/sections.ts` - `resolveSections` takes an optional `allowSource` predicate, used only by the preview.
- `src/routes/admin.schools.{index,new,$id}.tsx`, `src/routes/admin.projects.{new,$id}.tsx`, `src/components/admin/ProjectForm.tsx` - ask before reaching into a neighbouring module (6b.2).

`src/lib/sections.ts` and `src/lib/collections.ts` are unchanged.
`sectionsFor` lives in `modules.ts` rather than in `sections.ts` because the dependency has to point one way: modules know about sections, sections know nothing about modules.
The four permission maps were not rewritten either, which is the point of section 2.

## 6. Evidence

Everything below was produced against scratch databases on port 3222 with `SSG_CACHE=off`.
The repository's own `kape.db` was never opened.
Two databases: `plain.db` from `bun run db:seed` with `SITE_NAME="Riverside Legal"`, and `fixture.db` from `bun run seed:kape`.
`main` was checked out into a read-only worktree and served on 3223 from its own seeded database.

Screenshots and logs are in `.work/c4-shots/`.

### Criterion 2 - modules off

`01-admin-modules-off.png`
The whole admin for a law firm.
The sidebar holds 27 items: Dashboard, Messages, Forms, Pages, Media, the eleven post types, People, Header, Footer, Languages, Users, Roles, Settings, Modules, Locations, Publication categories, Document categories.
No Projects, Schools, Campaigns, Donations, Partners, Donors, Offices, Org Chart or Partner categories.
The Fundraising group is gone entirely, Records is down to People, and the dashboard's KPI reads Media rather than Projects.

`03-unreachable-modules-off.txt`
Unreachable, not hidden, and proven while logged in as the **super administrator**, so none of it is a permission refusal:

- eight domain paths, including `/admin/schools/1`, answer `307 -> /admin`
- six core paths answer 200
- seven domain tRPC routers answer FORBIDDEN
- four core routers answer with data

`02-catalogue-modules-off.png`
The page-builder catalogue: 11 static and 6 dynamic sections.
`map`, `partners`, `projectList` and `orgChart` are absent.
`postList`, `videoGrid`, `albumGrid`, `publicationList` and `people` are all present, which is the trap the contract named and the one I was most careful about.

`04-roles-modules-off.png`
The role editor offers 10 permission areas instead of 15.
Gone: Projects, Campaigns & donations, Partners & donors, Schools, Offices.

`05-modules-screen-off.png`
The screen an operator uses, with the six checkboxes and the setting key named on it.

### Criterion 3 - modules on, against `main`

`06-main-admin.png` (main, port 3223) and `07-branch-admin-modules-on.png` (this branch, port 3222), same fixture data.

The sidebars were also compared item by item out of the live DOM:

```
main items: 35   cms-core items: 36
only on main:    []
only on branch:  ['/admin/modules | Modules']
order identical ignoring the new item: True
```

Every one of today's 35 items is back, in today's order, with today's grouping.
The one addition is the Modules screen itself, which is the mechanism.

The section catalogue was compared the same way and is **byte-identical**: the same 21 sections in the same order on both.

Two visual differences in the side-by-side are **not mine**: the accent colour and the sidebar's active state come from C3's theme work, and "across the website" instead of "across the KAPE website" comes from C2's debranding. Both are in flight in the same worktree.

### Criterion 4 - a disabled module's data survives

`08-toggle-schools.txt`, `09-schools-off.png`, `10-schools-back.png`.

Schools was switched off through the checkbox on `/admin/modules`, then back on through the same checkbox.
Five real rows, ids 1 to 5, from `seed:kape`.

- off: sidebar loses Schools, `/admin/schools` gives `307 -> /admin`, `adminSchools.list` gives FORBIDDEN, and the table still holds all five rows
- on again: sidebar has Schools back, the route gives 200, the router returns the rows, and `10-schools-back.png` shows the same five schools with the same codes, levels and provinces

The sidebar updated without a page reload, which took a fix: the loader calls `ensureQueryData`, and that serves a stale cache entry rather than refetching it, so the settings query has to be **removed** from the cache and not merely invalidated.
The first attempt at this looked like it had saved and had not visibly changed anything, which is exactly the kind of thing that ships broken.

### Criterion 5 - nothing that has content behind it 404s

`11-public-partners-module-off.png` is the one that matters.
With the `partners` module **off**, the fixture's `/en/who-we-are/partners` page still renders and still names MoEYS and Thun Thean Obrum.
An admin cannot place a new partners section; the page that already has one is untouched.
That is the seam with C3 working as described, on real data.

Measured on the same three pages that carry domain sections, with `projects` and `partners` both turned off through the real settings mutation:

```
                                    on        off
/en                              139989    139953
/en/who-we-are/about              91031     90995
/en/who-we-are/partners           88286     88250
```

Each is 36 bytes shorter, which is the `enabled_modules` value itself appearing twice in the dehydrated loader data.
Nothing else about those pages changed.

`13-existing-section-survives.png` shows the other half in the admin: on the fresh install, the `/projects` landing page the installer creates still shows its Project list section, editable, with a live preview, while "+ Add section" will not offer another one.

`12-public-urls.txt` covers the fresh install: `/`, `/en`, and every landing the installer writes - news, stories, videos, galleries, team, publications, careers, projects - answer 200 with every module off, and the sitemap lists exactly those.
`/en/events` 404s, which is correct and pre-existing: `event` is in `NON_PUBLIC_CONTENT_TYPES` and the sitemap does not list it.

One 404 that is **not** caused by this job: `/projects` (without a language prefix) 404s on the fixture. It does the same on `main`, verified side by side on 3223. It is a redirect bug in the flat path resolver and it predates this branch.

### Criterion 6 - the runnable checks

`src/lib/modules.test.ts`, 43 cases. The first five groups are round one:

- **the table points at things that exist** - every router key is in `ROUTER_AREA`, every nav path is in `NAV_AREA`, every source is offered by some section, and nothing is claimed by two modules. This is the anti-drift check: rename a router key and this fails rather than a module silently gating nothing.
- **a disabled module contributes nothing** - no nav entry, no permission area, no catalogue section, no tRPC router, and its child paths are gated too.
- **nothing generic is switched off with the domain** - fifteen core admin paths, ten core permission areas, every static section, and the five post-backed sections and sources all survive with every module off.
- **areas shared by two modules survive either one** - `partners` survives partners or fundraising; `people` survives always.
- **a section keeps the sources that still resolve** - `map` with both, with offices only, with neither.

Round two added four more groups, each of which fails when the thing it guards is broken:

- **every area key is claimed** - the reverse-drift partition (6b.4). Adding an unclaimed `adminAlumni` and `/admin/alumni` fails two of them by name.
- **a missing setting means legacy, not none** - the three-way distinction between no row, an empty row and an unknown id (6b.1).
- **the saved envelope, not just the picker** - `disallowedSections` refusing a disabled module, an unknown type and a source a section does not offer, while passing generic content and grandfathering what a page already carries (6b.3).
- **no admin screen calls another module's router unguarded** - a source scan of every `admin.*.tsx` (6b.2). Deleting the `useModules` import from one file fails it by name.

Both new checks were mutation-tested: I broke each and watched it fail before trusting it.

### Criterion 7 - gates

| gate | floor | observed |
|---|---|---|
| `bun run test` | 174 tests, 21 files | **199 tests, 21 files**; 193 pass |
| `bunx tsc --noEmit` | silent | 1 error, in a C3 file |
| `bun run format` | clean | **clean, whole tree** |

Honest reading of the two that are not green.

**Six tests fail and one type error stands, all of them C3's, none of them mine.**
Five failures are `src/lib/site-theme.test.ts` importing an `oklchToHex` that `src/lib/site-theme.ts` does not currently export - the same mismatch the type error reports.
The sixth is `src/styles.test.ts` on `--brand-hero-overlay` in `src/styles.css`.
`site-theme.ts`, `site-theme.test.ts`, `styles.test.ts` and `styles.css` are all four on C3's owned list for this round, and C3 is editing them in this worktree right now.

Excluding those two files: **19 files, 172 tests, all passing**, and `tsc` silent.
C4 added 43 tests in `src/lib/modules.test.ts`, up from 21 in round one.
`bun run format` now passes across the whole tree, which it did not at the end of round one.

## 6b. Round two

An independent critic audited the round-one build without seeing this report.
It validated the design decision by mutation-testing `MODULES` and confirmed it restates nothing.
It also found four things, two of them serious, and all four are fixed below.

### 1. Every existing operator lost half their admin on the first deploy

The worst of the four, and the one I had half-seen and under-weighted.
I wrote in the round-one handover that a live database "needs the row written once" and treated that as a deploy note.
It is not a deploy note.
The person who has to act on it is the person staring at an admin with nine screens missing and every record still in the database, and nothing anywhere tells them why.

**Absence now means legacy, not none.**
A database with no `enabled_modules` row predates the setting, so it keeps everything.
Nobody loses a screen for having upgraded.

That is safe but too generous on its own - a site that never kept a donor list should not inherit a Fundraising group - so two more things settle it:

- **The installer writes the row explicitly**, empty, on a fresh install. On a database this product created, the absence of a row is never ambiguous.
- **`backfillModules`** runs on the first boot that finds no row, derives the answer from the only evidence that cannot be wrong - whether each module's own tables hold anything - writes it, and says so on the console. The Docker entrypoint runs `db:seed` on every boot, so this is the deploy path, not an extra step. It is idempotent: a database that already answers the question is left alone.

`MODULE_TABLES` is typed `Record<ModuleId, SQLiteTable[]>`, so adding a module is a compile error until its tables are named.

Evidence: `18-legacy-upgrade.txt`.
A real `main`-seeded database with 26 projects, 5 schools, 19 donors, 26 partners, 4 offices, no campaigns and no org nodes.
Served on this branch before any backfill: 36 sidebar items, 15 of 15 permission areas, nine domain routes all 200, seven domain routers all returning data.
Then the first `db:seed`:

```
Already installed - skipping.
Modules: this database predates the module setting. Enabled Projects, Schools,
Campaigns, donations and donors, Partners, Offices, because it holds records for
them. Change this at /admin/modules.
```

`orgChart` correctly stayed off, because `org_nodes` is empty.
`fundraising` correctly came on, because although `campaigns` is empty its `donors` table holds 19 rows.

### 2. The mixed configurations hung, and they are the ones modules exist for

The critic is exactly right about why my acceptance criteria missed this: all-on and all-off are the two configurations in which modules do nothing.

`admin.schools.{index,new,$id}.tsx` each fetch `adminProjects.list` inside a `Promise.all`, and `admin.projects.{new,$id}.tsx` each fetch `adminDonors.list`.
Those are two independent checkboxes.
With Schools on and Projects off the gate returns FORBIDDEN, the whole `Promise.all` rejects, and the screen never leaves "Loading…".

I considered declaring module dependencies and rejected it: a school's project link is nullable and one of the fixture's five schools has no project, so projects is not a dependency of schools.
The right answer is that the screen has to work when its neighbour is absent.

- `useModules()` reads the enabled set out of the root loader. `modules.list("projects", () => …)` runs the query where the module exists and resolves to `[]` where it does not, so the disabled case makes no request at all rather than swallowing a rejection.
- The `ready` and `loading` flags moved into `finally`, so a query that fails for any *other* reason leaves a usable screen instead of a permanent spinner. That was the actual mechanism of "hangs for ever" and it was one word.
- The donor panel's empty state used to read "add some under Admin → Donors" on a site with no such screen. It now names the Modules page instead.

Evidence: `14-mixed-schools-on-projects-off.png` (Schools list, all five rows, Projects column reading "—", no spinner), `15-school-form-projects-off.png` (New School renders, Project dropdown empty), `16-project-form-fundraising-off.png` (project editor renders with the module-aware donor message).

**The runnable check is the part that matters.**
A test scans every `src/routes/admin.*.tsx`, works out which module owns that screen, extracts every `trpcClient.<router>` it calls, and fails if a screen calls a router belonging to a *different* module without importing `useModules`.
Removing the guard from one file fails it by name.
That found exactly the five files the critic found, and nothing else, and it is what catches the sixth.

### 3. The gate was not a boundary at the data layer

`sectionNodeSchema` types `type` and `query.source` as bare `z.string()`.
The picker filtering the catalogue was a convenience, not a gate.

- `disallowedSections` now validates the envelope at `adminPages.create` and `adminPages.update`: the type must be in the catalogue, the source must be one the section offers, and the module behind it must be on.
- Sections **already stored on that page** pass unchanged, so the seam holds: a page authored while a module was on stays editable and keeps rendering, and only a *new* binding is refused. This matters - without it, a KAPE admin with partners switched off could not save the partners page at all.
- `adminPages.preview` was the read half of the same hole. `resolveSections` takes an `allowSource` predicate, and preview passes the enabled set, so a posted section bound to a disabled module resolves to `null` instead of dumping the table. Stored pages resolve unfiltered.

Evidence: `17-envelope-gate.txt`, all as the super administrator with every module off, called directly against the API.
`projectList`, `partners`, `orgChart` and `map` refused with a message naming the module; an invented section type refused; `cards` bound to `projects` refused because that section does not offer that source; `postList` and `richtext` saved.
Then on the partners page specifically: saving its own stored sections back is allowed, and adding a new `projectList` to that same page is refused.
Preview of a `projectList` returns `data: null`; preview of a `postList` returns its 6 news rows.

This is criterion 3.4 in `docs/CMS-CORE-REFERENCE.md`, which was failing before this job.
It is now closed for the module case and for unknown section types.

### 4. The anti-drift test missed the drift that will actually happen

Right, and it was the more embarrassing of the four, because I wrote that test believing it was the anti-drift check.
It only checked that `MODULES` points at things that exist.
It never checked the reverse, so a new `alumni` area with an `adminAlumni` router and an `/admin/alumni` screen and no `MODULES` entry left all 21 tests green and shipped enabled on every install.

`CORE_ROUTERS` and `CORE_NAV_PATHS` now name the keys no module owns, and four tests assert that those lists and `MODULES` between them partition `ROUTER_AREA` and `NAV_AREA` exactly: nothing orphaned, nothing claimed twice, and nothing named that has gone away.
Adding the critic's `adminAlumni` and `/admin/alumni` fails two of them by name.
So the next domain feature cannot ship without someone deciding, in writing, whether it is core or a module.

Keyed on `ROUTER_AREA` rather than on the tRPC router object, because importing the router into a unit test drags the database in.
A router in neither map is already denied to everyone but a super administrator by `adminProcedure`'s deny-by-default, which is the pre-existing property the contract asked me not to break.

### The smaller ones

- **`people` label.** `PERMISSION_AREAS` now reads "People", and the `orgChart` module contributes "& org chart" through a general `areaSuffix` field while it is on. So the tick says "People & org chart" on an install that has one and "People" on an install that does not, and with all modules on the label is identical to today's. A test asserts both.
- **The counter.** "N of M areas selected" now counts only the boxes on screen. A role may still hold an area whose module is off, and that grant is deliberately kept on save so turning the module back on restores it, but the counter should not speak for it.
- **`partner_category`.** `ModuleDef` gained a `taxonomies` field and the partners module owns that one. `adminTerms.create/update/delete` check it, so a `lists` role can no longer write partner categories on a site whose partner register is switched off. `location`, `publication_category` and `doc_category` stay core, because job vacancies and the publication and document content types use them.

### Recorded, not fixed: the public surfaces

Deliberately left for the next job, and the critic's framing of it is right - a stated seam, not a leak, but a law firm still ships a donate page.

- `site.offices` and `site.partners` are `publicProcedure` and are not gated by their modules. They return empty on a fresh install because the tables are empty, so nothing is exposed that the operator has not entered, but the procedures answer.
- `/[lang]/donate`, `/donate/success`, `/donate/$campaign` and the whole `payments` router ship regardless of the fundraising module. `/donate` renders with no campaigns; the payments API answers.
- Nothing links to any of it on a fresh install, because the header's donate button comes from `header_donate_link` in settings and the public nav is data.

Gating these means the module reaching a public route, which is the one thing this design deliberately does not do (section 4, item 6), because withdrawing a public URL is how you 404 something that has content behind it.
The honest fix is the module owning its URL prefix, which is the same piece of work as item 6 and as making `internalsources` optional.
They should be one job.

## 7. Making `internalsources` optional

Not done here. What it would take:

- A seventh module owning the `staff` table, the `internal_news`, `event` and `document` content types, the `staffProcedure` gate, the `staff` tRPC router and the five `internalsources.*` route files.
- The `directory` section and its three `QuerySource` values leave the catalogue with it, which the per-source filtering already built here would handle unchanged.
- The hard part is not the admin, it is the public boundary: `/internalsources` is a real URL served to a logged-in staff user, and `staffProcedure` is a second authorisation axis that does not run through `PermissionArea` at all. Turning the module off has to make the route stop answering rather than answer emptily, which is the one place in this design where a flag would have to reach a public route.
- `NON_PUBLIC_CONTENT_TYPES` in `collections.ts` already carries `internal_news`, `document`, `event` and `announcement`. Three of those four are the portal's. Whoever does this should decide whether that set becomes the module's declaration or stays a separate list, because those are two of the maps that could drift.

## 8. Handover notes, and what I know is imperfect

**~~An existing live database needs the row written once.~~** Fixed in round two - see 6b.1. Absence now means legacy, the installer writes the row explicitly, and `backfillModules` settles it from the rows the database holds. Left here because getting this wrong first, and calling it a deploy note, is the mistake worth remembering.

**~~The `people` permission area is still labelled "People & org chart".~~** Fixed in round two.

**`/admin/modules` should end up inside `/admin/settings`.**
It is a separate screen only because C3 owns that file this week. It is the one item in the sidebar that is not in today's admin, and folding it into Settings as a section would remove that difference. Whoever does it should keep the route, because a bookmark to it is cheap to honour.

**The source dropdown on an already-placed section is not filtered.**
If a page has a `map` bound to project locations and the projects module is then turned off, the editor still offers "Project locations" in that section's dropdown. That is on purpose: filtering it would silently rewrite somebody's page the first time they saved it. Only the "add a section" picker is filtered, which is what "the catalogue offers no section that queries a domain table" asks for.

**A fresh install still gets a `/projects` landing page.**
`LANDINGS` in `src/server/seed/landings.ts` derives from `COLLECTIONS`, so the installer writes one. With the projects module off it renders an empty list and there is no way to add a project. I left it: dropping it would strand `/projects/<slug>` breadcrumbs the moment somebody enabled the module, which is the failure criterion 5 exists to prevent, and it is C1's file. The honest fix is for the module to own its collection prefix, which is item 6 in section 4.

**`directory` is still in the catalogue.**
It binds to `staff`, and to `event` and `document` posts. It belongs to the staff-portal module the contract put out of scope. Section 7 has what moving it would take.

**`src/routeTree.gen.ts` moved.**
The router plugin regenerated it when `admin.modules.tsx` appeared. The diff is 21 added lines, all of them the new route, and nothing else in the file changed.

**Two files outside the list in the contract were changed**, both deliberately and both reported above: `src/integrations/trpc/init.ts`, because a route guard alone leaves the API answering and "unreachable rather than merely hidden" has to mean the data too; and `src/server/seed/site.ts`, because without it `seed:kape` no longer restores the admin it used to. Neither is C3's. `src/routes/admin.index.tsx` and the two admin components are the ordinary consumers of what this job added.
