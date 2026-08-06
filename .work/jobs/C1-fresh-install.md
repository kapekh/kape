# C1 - A fresh install is an empty site, not KAPE's

## Objective

`bun run db:seed` against an empty database must produce a **working, empty, unbranded site** that an administrator can log into and start building.
Today it produces KAPE's website: 3,869 lines across `src/server/seed/`, plus 464 more in `src/server/migrate-tree.ts` that run on any new database.

KAPE's content must stay runnable. This is the CMS core branch, and we go back to being KAPE later, so the KAPE seed becomes a **fixture you can still load on demand**, not something you delete.

You are done when someone can clone this repo, run one command, and get a blank CMS with no mention of KAPE anywhere in it - and run a second command to get KAPE's full site back exactly as it is today.

## Why this one first

Every other core job is cosmetic until this exists.
De-branding the source does nothing if `db:seed` immediately writes "Kampuchea Action to Promote Education" into `site_settings` and 26 project pages into `pages`.
This job is what turns the repo from "KAPE's website" into "a CMS you install".

## What "empty but working" has to mean

An empty site is not an empty database. A new administrator logging in must find something coherent, not a stack of errors. At minimum the fresh seed has to establish:

- `languages` - at least the default language. Do not assume English plus Khmer.
- `roles` - the seeded role set (`src/server/seed/roles.ts` already does this correctly; reuse it).
- One administrator account, from configuration, not a committed default.
- `ui_strings` for the default language, from `src/lib/ui-strings.default.ts`.
- `site_settings` with neutral defaults, so the header, footer and meta tags render without crashing.
- `content_types` - the registry at `src/server/seed/base.ts:41-54`.
- Enough of a page tree that the site answers on `/`. A single home page is enough. Decide whether it carries a starter section or nothing, and say why.
- Whatever else you discover is load-bearing. Find this by running it, not by reading.

The test of "working" is a running server: home page renders, `/admin` logs in, an admin can create a page and see it live. Not "the seed script exits 0".

## Configuration, not committed defaults

`src/server/seed/users.ts:20-21` hardcodes `admin@kapekh.org` / `kape-admin-2026`. That is fine for a local dev seed and is not fine for a product someone installs.

The fresh install needs the administrator's email and password, the site name, and the default language to come from configuration. It must work **non-interactively**, because the Docker path (`docker-entrypoint.sh`) has no terminal. An interactive prompt on top of that is welcome but is not the primary path.

Keep the existing dev-default behaviour available behind an explicit flag, or the whole team's local workflow breaks.

## KAPE as a fixture

Everything currently in `src/server/seed/` that is KAPE *content* - pages, projects, records, nav, media, internal - moves behind one command. Name it clearly. `bun run seed:kape` or similar.

Two constraints:

- It must still work. Run it on a fresh database and get the site we have today. If something breaks in the move, fix it; do not leave a broken fixture and a note.
- `src/server/migrate-tree.ts` is the difficult one. It is 464 lines of KAPE prose, it is imported by `src/server/seed.ts` **and** by `scripts/apply-tree.ts`, and its docstring says it runs so a fresh DB matches production. Work out what it is actually for now, and either move it into the fixture or split the structural half from the KAPE half. Say which you did and why.

## Files you own

- `src/server/seed.ts` and all of `src/server/seed/`
- `src/server/migrate-tree.ts`
- `scripts/apply-tree.ts` and any other seed-adjacent script you must follow
- `package.json` - the script entries only
- `docker-entrypoint.sh`, `.env.example`
- new files under `src/server/install/` or `scripts/`, your choice of shape
- `.work/c1-report.md`

**Read-only, and another pane owns them right now:** `src/routes/__root.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/lib/structured-data.ts`, `src/lib/ui-strings.default.ts`, `src/lib/footer-defaults.ts`, `src/lib/header-defaults.ts`, `src/lib/donate-defaults.ts`, `src/routes/$.tsx`, `src/routes/admin.tsx`, `src/routes/login.tsx`, `src/server/auth.ts`, `src/server/mail.ts`, `src/styles.css`.

C2 is de-branding those. You will see KAPE strings in them. Leave them alone. If your empty site renders "KAPE" because a component has it hardcoded, that is C2's to fix - record it in your report as a handoff note and move on.

## Do

1. **Establish the real starting point.** Create an empty database, run the current seed, and record what it produces: row counts per table, what the home page looks like, how long it takes. You cannot tell what "empty" should contain until you know what "full" contains.
2. Design the split. Write it into the report before implementing, so it can be argued with before there is a large diff.
3. Implement. Fresh seed first, then the KAPE fixture, then prove both.
4. **Prove both paths on genuinely empty databases**, not on a copy of `kape.db`. Fresh install, then separately the KAPE fixture.
5. Leave a runnable check. The cheapest useful one asserts the fresh seed establishes the rows the app needs to render, so a future edit that drops languages or `site_settings` fails the suite rather than the site.

## Acceptance

1. `.work/c1-report.md` with the design, the before inventory, and the after for both paths.
2. On an empty database, the fresh install command produces a site where: the home page returns 200 and renders, `/admin` accepts the configured administrator, and that administrator can create a page and see it on the public site. Screenshots.
3. `grep -ri kape` over the **database** produced by a fresh install returns nothing. Not the source, the data. Source de-branding is C2's.
4. The KAPE fixture, run on a separate empty database, reproduces the site we have today. Show the page count, project count and record counts matching the current `kape.db`.
5. The fresh install works non-interactively, driven by configuration, with no terminal. Demonstrate it the way Docker would run it.
6. `bun run test` at or above the count on this branch when you start, plus yours. `bunx tsc --noEmit` silent. `bun run format` clean.
7. State plainly anything you found load-bearing that is not in the list above.

## Out of scope

- De-branding source files. C2 owns it and is live.
- Theme, colours, fonts. C3.
- Making Schools, Org chart, Donors and the rest optional. C4, and the biggest of the four. A fresh install may still show those admin sections; that is expected at this stage.
- A setup wizard UI in the admin. Configuration-driven is the requirement; a screen on top is a later nicety.
- Multi-tenancy. Dropped: one install per organisation, so `TENANT = 1` is correct.

## Stop conditions

- Never run against the repo's `kape.db`. Copy with `VACUUM INTO`, never `cp`, and `export DATABASE_PATH` to the copy. `src/server/db.ts:33` migrates on import.
- Do not commit, do not touch git, do not edit the worklog. Verification runs in the parent pane.
- `feedback/` is read-only reference and must never ship.
- If the fixture cannot be made to reproduce today's site, stop and report which part and why. A broken KAPE is worse than a delayed one, because the client's site is the thing we go back to.
