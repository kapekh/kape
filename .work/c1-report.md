# C1 - A fresh install is an empty site, not KAPE's

Branch `cms-core`, worker pane C1.
Nothing here is committed; verification runs in the parent pane.

## Before: what `db:seed` produced when I started

Run against a genuinely empty file (`DATABASE_PATH=/tmp/c1/baseline.db`, `SSG_CACHE=off`), no existing rows.

```
bun run db:seed   ->  0.30s wall
Seed complete: 2 languages, UI strings, content types, full nav tree, page tree + collections, home page, 3 news, 2 stories.
Admin user: admin@kapekh.org (default dev password - change it before go-live)
Staff user: staff@kapekh.org
```

Row counts, empty tables omitted:

| table | fresh `db:seed` | repo `kape.db` |
| --- | --- | --- |
| content_types | 10 | 10 |
| donors | 19 | 5 |
| hero_slides | 3 | 3 |
| languages | 2 | 2 |
| media | 63 | 122 |
| nav_items | 57 | 57 |
| offices | 4 | 4 |
| pages | 36 | 39 |
| partners | 26 | 5 |
| people | 27 | 7 |
| post_media | 5 | 5 |
| posts | 30 | 26 |
| project_donors | 36 | 9 |
| project_locations | 26 | 2 |
| projects | 26 | 18 |
| roles | 4 | 4 |
| schools | 5 | 5 |
| site_settings | 20 | 21 |
| stats | 7 | 7 |
| terms | 30 | 27 |
| translations | 589 | 551 |
| ui_strings | 182 | 182 |
| users | 2 | 2 |

**The seed and `kape.db` already disagree, before I change anything.** `kape.db` has been edited through the admin and had one-off `scripts/` run against it (client asset import, calendar pages, demo content), so it carries 122 media and 39 pages against the seed's 63 and 36, and fewer donors/partners/people/projects than the seed writes.

That changes what acceptance #4 can honestly mean. "Reproduces the site we have today" has to be measured against **what `db:seed` produced on this branch when I started**, captured in `/tmp/c1/baseline.db`, not against the live `kape.db` - no code path in the repo reproduces `kape.db` today, and none did before this job either. The KAPE fixture target is therefore: byte-identical output to the pre-change `db:seed`. Anything less is a regression I caused; the pre-existing drift from `kape.db` is not.

## The design

### Three entry points instead of one

| command | what it does |
| --- | --- |
| `bun run db:seed` | fresh install: empty, working, configuration-driven |
| `bun run db:seed:dev` | same, with a fixed local-dev administrator instead of a generated password |
| `bun run seed:kape` | the KAPE fixture: exactly what `db:seed` did before this job |

### Fresh install contents, and why each is in

- `tenants` - one row, `TENANT = 1`, name and slug from `SITE_NAME`. Every query filters on it.
- `languages` - the default language only. Not English plus Khmer: a second language is a choice the installer makes, not a fact about the product.
- `ui_strings` - the default language's column of `src/lib/ui-strings.default.ts`. The header, footer and forms read chrome text from this table, so an empty table renders raw keys.
- `content_types` - the ten-row registry. The admin's post editor has no type to offer without it.
- `roles` - `seedRoles()` unchanged. Without rows the admin user form has no role to pick and a new account cannot be given one.
- One administrator, from configuration.
- `site_settings` - the site name from config plus `HEADER_DEFAULTS`. Nothing else: the footer and header components already fall back when a key is unset, so seeding KAPE's contact block would be writing data purely to have data.
- `pages` - one page, slug `home`, **with no sections**. `/` resolves the slug `home`; without the row the front page is a 404 on a working install. It carries no starter section because every section type needs content behind it (posts, videos, partners, stats) and a fresh install has none - a starter hero would render an empty band that the new administrator has to find and delete. An empty page renders its title and chrome, which is the honest state of a site nobody has written yet.

### Configuration

Read from the environment, so the Docker path works with no terminal:

| var | default | notes |
| --- | --- | --- |
| `ADMIN_EMAIL` | `admin@localhost` | |
| `ADMIN_PASSWORD` | generated, printed once | no committed default on the primary path |
| `SITE_NAME` | `My Site` | tenant name + `site_name_en` |
| `SITE_DEFAULT_LANG` | `en` | validated against `LANGS` in `src/lib/i18n-config.ts` |

`--dev` (or `INSTALL_DEV=1`) swaps the generated password for a fixed one so the local loop is repeatable. The team's existing workflow is not the fresh installer at all - it is `bun run seed:kape`, which keeps `admin@kapekh.org` / `kape-admin-2026` exactly as it was.

### `src/server/migrate-tree.ts`: split, not moved

464 lines doing five things. Two are structural transforms over whatever page rows exist; three are KAPE prose.

- **Structural, extracted to `src/server/page-tree.ts`**: `normalizeTree` (fills `segment`, `parentId`, `sortOrder`, and creates missing ancestor pages) and `flattenNav` (rewrites nav targets through `legacyRedirect`), plus the `upsertPage`/`setTitle` helpers both halves need. The installer needs `upsertPage` for the home page and needs the tree normalised - a page row with a null `segment` is not addressable.
- **KAPE, left in `migrate-tree.ts`**: `createLandings` (KAPE's seven collection landings), `migrateStaticPages` (`scripts/static-pages/group{1,2,3}.json`, pure client prose) and `buildHomePage` (KAPE's home page copy). `applyTreeMigrations` stays exported with the same five steps in the same order, because `scripts/apply-tree.ts` re-runs it against KAPE's live database and must keep doing exactly that.

Split rather than moved wholesale because the structural half is the only thing that makes the `pages` table a tree, and a CMS without it has no page hierarchy at all.

## What changed

| file | |
| --- | --- |
| `src/server/install.ts` | new. The fresh installer. |
| `src/server/install.test.ts` | new. Runs the installer against a real empty database and asserts what landed. |
| `src/server/page-tree.ts` | new. `upsertPage`, `setTitle`, `normalizeTree`, `flattenNav`, lifted out of `migrate-tree.ts` unchanged. |
| `src/server/seed/kape.ts` | new. The KAPE fixture entry point; the body of the old `src/server/seed.ts`. |
| `src/server/seed.ts` | deleted. |
| `src/server/migrate-tree.ts` | keeps the three KAPE transforms, imports the structural two. |
| `src/server/seed/ui-strings.kape.ts` | new. KAPE's own EN/KH chrome dictionary, copied out of `#/lib/ui-strings.default`. See "the fixture was reading the product's defaults" below. |
| `src/server/seed/base.ts` | reads that copy instead of `#/lib/ui-strings.default`. |
| `src/server/seed/site.ts` | KAPE's footer and header settings written out in full instead of spread from `#/lib/footer-defaults` and `#/lib/header-defaults`. |
| `scripts/regroup-media-nav.ts`, `scripts/backfill-nav-meta.ts` | now import `MEDIA_GROUPS`/`NAV_META` from `src/server/seed/nav` rather than through `src/server/seed`. |
| `package.json` | `db:seed`, `db:seed:dev`, `seed:kape`. |
| `.env.example` | the four install variables. |
| `docker-entrypoint.sh` | installs before exec when the database is empty. |

Both scripts import nothing from the old `src/server/seed` barrel now, which also fixes a latent bug: that module had a top-level `await main()`, so `bun scripts/backfill-nav-meta.ts` was running the entire KAPE seed as an import side effect before doing its own work. It only ever printed "Already seeded — skipping" because the guard caught it, but against an empty database it would have seeded the whole site.

## After: the fresh install

`bun run db:seed` on an empty file, 0.19s:

```
SITE_NAME="Riverbend Trust" ADMIN_EMAIL=ops@riverbend.example ADMIN_PASSWORD=… bun run db:seed
Installed "Riverbend Trust" (en).
Administrator: ops@riverbend.example
```

Every non-empty table:

| table | rows |
| --- | --- |
| tenants | 1 |
| languages | 1 |
| ui_strings | 90 |
| content_types | 10 |
| roles | 4 |
| users | 1 |
| site_settings | 6 |
| pages | 1 |
| translations | 1 |

Everything else is zero: no posts, projects, nav items, media, people, offices, stats, partners, donors, schools, hero slides.

Proven in a browser, dev server on port 3000 against `/tmp/c1/fresh3.db`, `SSG_CACHE=off`:

| | |
| --- | --- |
| `/` | 301 → `/en` |
| `/en` | 200, renders the welcome page - `.work/c1-shots/01-fresh-home.png` |
| `/km` | 200 (falls back to the default language's content) |
| `/login` | 200, accepts `ops@riverbend.example` - `.work/c1-shots/02-fresh-admin.png` |
| `/admin` | 307 unauthenticated, dashboard once signed in, every counter zero |
| create a page | `/admin/pages/new` → "Our Mission", one rich-text section, published - `.work/c1-shots/03-fresh-admin-page-created.png` |
| the page live | `/en/our-mission` 200, renders the section - `.work/c1-shots/04-fresh-new-page-live.png` |
| `/en/nonexistent` | 404 |
| `/sitemap.xml` | 200 |

### The Docker path

`docker-entrypoint.sh` now runs the installer before `exec "$@"`. Demonstrated under `setsid … < /dev/null`, so there is no controlling terminal and stdin is closed - `tty` reports "not a tty":

```
--- first boot (no ADMIN_PASSWORD, no tty, stdin closed) ---
Installed "Docker Demo Org" (en).
Administrator: root@docker.example
Password: 224ccb52a98a5c07108f2e964007f9c441d9  ← shown once, not stored anywhere else. …
[app] would now exec: bun run start
--- second boot (same volume) ---
Already installed — skipping.
[app] would now exec: bun run start
```

The generated password was then checked against the stored hash with the app's own `verifyPassword`: true for the printed value, false for a wrong one. Second boot is a no-op and leaves the existing administrator alone.

## After: the KAPE fixture

`bun run seed:kape` on a separate empty file, 0.34s. Compared row by row against `/tmp/c1/baseline.db` - the database the **pre-change** `db:seed` produced - across all 37 tables, every column except `created_at`/`updated_at`/`published_at`:

```
### users: 2 vs 2
1 tables differ
```

The only difference in the entire database is the two argon2 password hashes, which carry a random salt and cannot be equal across runs. Email, name and role match. Everything else - all 36 pages, 26 projects, 30 posts, 57 nav items, 589 translations, 182 ui_strings, 63 media, 26 partners, 27 people, 19 donors, 30 terms, 7 stats, 4 offices, 3 hero slides, 5 schools, 20 site settings, 26 project locations, 36 project-donor links, 5 post-media links - is byte-identical.

Then served: dev server on the fixture database, home page renders the full KAPE site, mega-menu and all - `.work/c1-shots/05-kape-fixture-home.png`.

| route | |
| --- | --- |
| `/en` | 200 |
| `/en/who-we-are/about` | 200 |
| `/en/news` | 200 |
| `/en/stories` | 200 |
| `/en/team` | 200 |
| `/en/galleries` | 200 |
| `/en/contact` | 200 |
| `/en/projects` | 404 |

`/en/projects` 404s. Pre-existing, not caused by this job: no page row with slug `projects` exists in the pre-change seed **or** in the repo's `kape.db`. `COLLECTIONS` declares the prefix but nothing ever creates its landing page. Left alone; flagging it here.

## The fixture was reading the product's defaults, and C2 proved it

Partway through this job, C2 de-branded `src/lib/ui-strings.default.ts` and `src/lib/footer-defaults.ts`. The KAPE fixture immediately stopped reproducing KAPE:

```
### site_settings: 20 vs 22
  footer_blurb    "KAPE works at every level of formal education…"  ->  ""
  footer_links    "Annual Report|/media/annual-report, Impact Stories|…"  ->  ""
  footer_buttons  "Public Holidays in Cambodia 2026|…"  ->  ""
### ui_strings: 182 vs 177
  footer.about      "KAPE works at every level…"  ->  "A short line about the organisation…"
  home.about.kicker "About KAPE"  ->  "About us"
  (five KH rows gone)
```

`src/server/seed/base.ts` seeded `ui_strings` straight from `defaultUiStrings`, and `src/server/seed/site.ts` spread `FOOTER_DEFAULTS` and `HEADER_DEFAULTS` into `site_settings`. That coupling was invisible while the product's defaults *were* KAPE's content. The moment the product got its own neutral defaults - which is the entire point of this branch - the client's site started tracking them.

Fixed at the root: the fixture now owns its data. `src/server/seed/ui-strings.kape.ts` is a copy of the pre-change dictionary, and `seedSiteSettings` writes KAPE's footer and header keys out in full. Nothing under `src/server/seed/` imports a `*-defaults.ts` any more. After the fix the fixture is byte-identical to `/tmp/c1/baseline.db` again, and C2 can neutralise those files as far as they like without touching KAPE.

This is worth flagging beyond this job: **any future edit to `src/lib/*-defaults.ts` used to silently rewrite the client's site on the next seed.** It cannot now.

## Acceptance

| | | |
| --- | --- | --- |
| 1 | design, before, after | **met** - this document |
| 2 | fresh install runs, admin logs in, admin creates a page and sees it live | **met** - four screenshots |
| 3 | `grep -ri kape` over a fresh database returns nothing | **met** - zero cells |
| 4 | fixture reproduces the site we have today | **met** - identical to the pre-change seed but for two argon2 salts |
| 5 | non-interactive, configuration-driven, no terminal | **met** - `setsid … < /dev/null` transcript above |
| 6 | tests / tsc / format | **met** |
| 7 | anything else load-bearing | below |

### 3, measured

Zero cells in the whole database match `kape`, case-insensitive, across every text column of every table. This became true only when C2's de-branding of `src/lib/ui-strings.default.ts` landed - before that it was 9 cells, all in `ui_strings`, all verbatim from that file. The brief requires the fresh seed to take its UI strings from there, so the two halves had to land together. They have.

### 6, precisely

- `bun run test` - **72 passed**, 15 files. It was **62 passed**, 13 files when I started. 8 of the 10 new tests are mine (`src/server/install.test.ts`); the other file arrived from C2 while I was working.
- `bunx tsc --noEmit` - **silent**.
- `bun run format` - **clean**, 232 files.
- `bunx biome lint` reports 4 warnings across my files, all `noNonNullAssertion` on lines moved verbatim out of `migrate-tree.ts`. Repo-wide lint has 216 errors and was already failing; not a gate here.

The install test runs the real installer as a subprocess against a real empty database and reads the file back, rather than asserting over the module's exports. I mutation-checked it twice: disabling the `languages` insert fails the file, disabling the `site_settings` insert fails "gives the header, footer and meta tags a site name to render" specifically.

## 7 - what I found that was not in the brief

**The repo's `kape.db` is not reproducible from any code path, and was not before this job.** Documented at the top. `db:seed` and `kape.db` disagree on media (63 vs 122), pages (36 vs 39), donors (19 vs 5), partners (26 vs 5), people (27 vs 7), projects (26 vs 18), project locations (26 vs 2) and posts (30 vs 26). The live file is the seed plus one-off `scripts/` runs plus admin edits. If "being KAPE again" has to mean *that* file rather than *that seed*, the gap is real work and nobody has scoped it. Worth deciding before the fixture is trusted as a restore path.

**`src/lib/i18n-config.ts` hardcodes the routable languages.** `LANGS = ["en", "km"]` and `DEFAULT_LANG = "en"` are compile-time constants that the router, the prerenderer and every link helper read. `SITE_DEFAULT_LANG` therefore cannot be honoured on its own, so `readConfig` validates against `LANGS` and refuses an unroutable code with a message naming the file to edit. A fresh install today seeds one language, `en`, and `/km` still resolves - falling back to the English content, because the code says Khmer is servable and the data says it does not exist. Making the language set data-driven is a separate job and is not in any of C1-C4.

**A page with no sections is a bad front page.** I first seeded `home` with an empty `sections` array. `src/routes/$.tsx` sends a section-less, body-less page down the sub-page path, so a brand new install greeted its owner with a breadcrumb reading "Home / KAPE" and the text "This section is being updated. Please check back soon." One rich-text section fixes it entirely from the data side; that is why the home page ships with one.

**`applyTreeMigrations` was doing structural work nobody could reuse.** `normalizeTree` fills `segment`, `parentId` and `sortOrder`. A page row with a null `segment` is not addressable, so the installer needs it too - which is what forced the split rather than a wholesale move.

## Handoff to C2

Most of what I had queued here C2 fixed while I was working. What is left, seen on a fresh install at the end of this job:

| where | what shows |
| --- | --- |
| header and footer logo slot | still the KAPE seal image on an unbranded site |
| `src/components/Footer.tsx` | the Khmer calendar widget renders on every site, whatever language it is installed in |
| `src/components/Footer.tsx:286` | `s("copyright") \|\| "© Kampuchea Action to Promote Education"`. I seed `copyright` as `© <year> <site name>` so a fresh install is correct, but the fallback still fires on an install predating it. |
| `src/routes/$.tsx` | `page.parentTitle ?? "KAPE"` - the breadcrumb on any top-level page. Worth a re-check; it was still there last I looked. |
| `src/routes/admin.index.tsx` | "What's happening across the KAPE website." Not on your list, same fix. |

`src/lib/site-identity.ts` landed while I was working, and the two halves already meet: the installer writes `site_name_en`, which is the key `siteName()` reads. It does not write `site_name_short` or `site_description` - both optional in your module, both falling back sensibly, so I left them for the operator to fill in from `/admin/settings`.

One request, since it bit once already: **do not import `src/lib/*-defaults.ts` or `site-identity.ts` from anything under `src/server/seed/`.** That directory is now the client's data and has to stay frozen against the product's defaults.

C2's `src/lib/no-brand.test.ts` already exempts `src/server/seed/`, `migrate-tree.ts`, `page-tree.ts` and `install.ts`, which is exactly the right boundary.

## Re-verified after C2's sweep

C2 landed a large de-branding pass while I was finishing (65 files, including deleting `src/assets/*.asset.json` and rewriting `$.tsx`, `Header.tsx`, `Footer.tsx`, `admin.tsx`). Everything above was re-run against that tree, from scratch, as the last thing I did:

- fresh install on an empty file: zero cells matching `kape`
- KAPE fixture on a separate empty file: still identical to `/tmp/c1/baseline.db` bar the two argon2 salts
- KAPE fixture served: `/en`, `/en/who-we-are/about`, `/en/news`, `/en/stories`, `/en/team`, `/en/contact`, `/en/galleries`, `/en/videos` all 200; home page renders the full site
- `bunx tsc --noEmit` silent, `bun run test` 72 passed in 15 files, `bun run format` clean across 232 files

## Scratch databases, if you want to re-check without re-running

| | |
| --- | --- |
| `/tmp/c1/baseline.db` | what `db:seed` produced **before** this job. The fidelity target. |
| `/tmp/c1/kape-ref.db` | `VACUUM INTO` copy of the repo's `kape.db`, for the drift comparison. |
| `/tmp/c1/z-fresh.db` | final fresh install |
| `/tmp/c1/z-kape.db` | final KAPE fixture |
| `/tmp/c1/diffdb.ts` | the row-by-row comparator, `bun /tmp/c1/diffdb.ts <a> <b>` |

The repo's `kape.db` was never opened by a dev server and is unchanged: 675,840 bytes, same as when I started. The only thing that touched it was one `VACUUM INTO` to make the read-only copy.

## Not done

- `MAIL_TO` still defaults to `kape@kapekh.org` in `src/env.ts`. That file is C2's.
- The fresh install still shows Schools, Org chart, Donors and the rest in the admin sidebar with zero rows behind them. Expected at this stage; C4.

