# C4 - An organisation only gets the features it asked for

## Objective

A law firm installs this CMS and does not inherit a Schools section, an Org chart, a Donor list or a project map.

You are done when the domain features are **modules an install turns on**, rather than things every install has. A fresh install shows Pages, Posts, Media, Forms, Navigation, Users and Settings. Everything KAPE-shaped is off until enabled, and enabling it restores exactly today's behaviour.

This is the largest and least mechanical of the four core jobs. It is where the real design decision is.

## What is currently unconditional

**10 domain tables:** `schools`, `offices`, `org_nodes`, `project_locations`, `project_donors`, `projects`, `donors`, `campaigns`, `donations`, `alumni_registrations`. Plus `people`, `partners` and `staff`, which sit closer to the line.

**21 of 55 admin route files** are domain routes: `admin.schools.*` (3), `admin.offices.*` (3), `admin.donors.*` (3), `admin.campaigns.*` (5), `admin.partners.*` (3), `admin.org-chart`, `admin.donations.index`, `admin.locations`, plus three category routes.

**Four hardcoded maps in `src/lib/permissions.ts`:** the `PermissionArea` union (15 values, of which `schools`, `offices`, `partners`, `campaigns`, `projects` are domain), `PERMISSION_AREAS` (grouped labels), `ROUTER_AREA` (22 entries), `NAV_AREA` (24 entries).

**A hardcoded sidebar:** `src/routes/admin.tsx` holds `NAV` as 7 groups and 35 items, including a "Records" group of Schools, People, Partners, Donors, Offices, and a "Lists" group of four category managers.

**10 of 21 page-builder sections** bind to domain tables or domain content-type keys: `postList`, `videoGrid`, `albumGrid`, `publicationList`, `people`, `map`, `directory`, `partners`, `projectList`, `orgChart`. `QuerySource` in `src/lib/sections.ts` is a closed union of 13 literals including `offices`, `staff`, `orgchart`, `locations`, `projects`.

**A second application:** `internalsources` is a 5-file staff portal reading `internal_news`, `event` and `document` posts.

## The decision you have to make, and defend

There is a cheap version and an expensive version, and I want your judgement rather than a default.

**Cheap:** a set of enabled-module flags in `site_settings`. The nav, the permission areas and the section catalogue filter against it. Tables and route files stay in the tree; they are simply unreachable and invisible. Fast, low risk, reversible, and honest as long as nobody claims the code was removed.

**Expensive:** genuine modules - a registry each feature registers itself into, so nav entries, permission areas, section definitions, query sources and routes come from the module rather than from four hardcoded maps.

The cheap version ships this week and makes the product demonstrable. The expensive version is what "a CMS core" eventually means, and doing the cheap version badly makes it harder later.

**Write your recommendation into the report before you implement**, with the reasoning, and then build it. If you pick cheap, say explicitly what the expensive version would still have to do, so nobody later mistakes filtering for architecture.

My prior, which you may argue against: cheap structure with an honest seam beats a half-finished registry. The thing that must not happen is a fifth hardcoded map.

## Things that will bite

- **`postList` sources are content types, not modules.** News, stories and jobs are hardcoded as `sources` in the catalogue. Those are generic content any org wants, so do not switch them off along with Schools. Distinguish "domain entity" from "content type" carefully.
- **`people` and `partners` are borderline.** Most organisations have a team page and some have funders. Decide, and say why.
- **`content_types` and `collections.ts` set URL prefixes** (`/news`, `/stories`, `/team`, `/galleries`, `/careers`). Turning a module off must not 404 a URL that still has content behind it, and must not leave a nav item pointing nowhere.
- **The permission system defaults to deny for unmapped router keys** (`init.ts:62`), which is a helpful property. Do not break it.
- **A disabled module's data must survive.** Turning Schools off then on again returns the schools. This is not a delete feature.

## Files you own

- `src/lib/permissions.ts`
- `src/routes/admin.tsx`
- `src/lib/sections.ts`
- `src/lib/collections.ts`
- `src/server/repo/sections.ts`
- `src/components/admin/AdminIcon.tsx`
- the domain admin route files, if your design needs them guarded
- `.work/c4-report.md`

**Do not touch** `src/styles.css`, `src/components/sections/SectionRenderer.tsx`, `src/routes/__root.tsx`, `src/routes/admin.settings.tsx` or the donate components. C3 owns those and runs beside you.

You own the section **catalogue** (`sections.ts`); C3 owns the section **renderer**. A section type that is absent from the catalogue but still present in the renderer registry is fine and is the seam between you: admins cannot place it, and pages that already use it keep rendering.

**Do not change the schema and do not add a migration.** Modules are configuration, not tables.

## Do

1. **Inventory what is genuinely domain-specific**, from the tree. The lists above are a survey's reading and the tree has moved.
2. Write the recommendation and the design into the report. Then implement it.
3. Make the fresh-install default the generic set. C1 is building that seed; coordinate through your report rather than by editing its files.
4. **Prove both directions.** A fresh install with modules off shows a clean admin. Enabling them restores today's KAPE admin exactly.
5. Leave a runnable check. The obvious one asserts that a disabled module contributes no nav entry, no permission area and no catalogue section.

## Acceptance

1. `.work/c4-report.md` with the inventory, the recommendation with reasoning, and what the expensive version would still owe if you chose cheap.
2. With domain modules off: the admin sidebar shows only the generic set, the domain routes are unreachable rather than merely hidden, and the page-builder catalogue offers no section that queries a domain table. Screenshots.
3. With them on: the admin is exactly as it is today. Side-by-side screenshots against `main`.
4. Toggling a module off and on again leaves its data intact. Demonstrate with real rows.
5. No URL that has content behind it 404s as a result of this change, and no nav item points at nothing.
6. A runnable check covering nav, permissions and catalogue for a disabled module.
7. `bun run test` at or above the count when you start. `bunx tsc --noEmit` silent. `bun run format` clean.

## Out of scope

- Deleting any domain table, route or component. Nothing gets removed in this job.
- Runtime user-defined content types. That is the headless track and is deliberately not now.
- The `internalsources` staff portal. Report what making it optional would take; do not do it here.
- Theme and colour. C3.
- Multi-tenancy. Dropped.

## Stop conditions

- Never run against the repo's `kape.db`. `VACUUM INTO` a copy, `export DATABASE_PATH`, `export SSG_CACHE=off`.
- Do not commit, do not touch git, do not edit the worklog.
- No schema changes, no migrations.
- If the design turns out larger than one job can hold, stop at a compiling, test-passing boundary and report where you stopped and what remains. A half-built registry that compiles is a fine handover; a guess about the rest is not.
