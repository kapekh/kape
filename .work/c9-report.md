# C9 - the product stops being named after its first client

Branch `cms-core`, started clean at `229f0c0`.
Nothing committed, no git command run beyond reads.

## Outcome

Sections 1 and 2 are done.
Section 3 landed the build-time half: the sitemap and the prerenderer now read the `languages` table, and the router still needs the constant.
Section 3's remaining cost is priced at the end, and it is smaller than the job file assumed, because the routing layer turns out not to be the blocker.

## 1. The package

`package.json:2` is `koompi-cms`.

`bun.lock:6` still carries `"name": "kape"` in its workspace record.
It is generated, I do not own it, and it rewrites itself on the next `bun install`.
Flagging rather than touching it, because regenerating the lockfile is a bigger change than the line it would fix.

## 2. docs/

Five files went in, three came out.

**Deleted:**

- `LOVABLE-GAP-ANALYSIS.md` - a comparison of the dropped Lovable prototype against the client's requirements.
  Nothing in it is true of the product.
  The directory it analyses, `kapecambodia-main/`, is not in the tree, is gitignored and is excluded from `tsconfig.json`.
  Its recommendations ("port the presentation layer", "make it data-driven") were carried out and are what this branch is.
  It also hardcodes `/home/brilliant/projects/kape`, a path from another machine.
- `REQUIREMENTS.md` - the client's site specification, slide by slide.
  Their information architecture, their twelve publication submenus, their contact address, their provincial offices, their YouTube channel.
  The only product-level sections, 4 and 6, are covered by `CMS-CORE-REFERENCE.md` and `CONTENT-MODEL.md`.

**Rewritten:**

- `CONTENT-MODEL.md` - was "KAPE CMS - Content Model (design proposal)", described as not yet implemented.
  It is implemented, so it now describes the schema that exists and the reasoning behind it.
  Corrected three things that had gone stale: language is a path prefix, not a `?lang=` search param; `pages` gained the tree columns and the `sections` builder column, so "no page builder" was wrong; `posts.type` is `content_type`.
  Added the module registry and the tenancy seam, and replaced the client's seeded row counts.
- `BUILD-PLAN.md` - was "KAPE CMS - Build Plan", a phase list for building one client's site, with the product track filed under "Part B, optional, post-KAPE".
  Phases 1 to 8 are done and are that client's history.
  Rewritten as the roadmap for this product, in stages: finish the core (which defers to `CMS-CORE-REFERENCE.md` rather than restating its criteria), content types become data, delivery, platform.
  The Stage C to E material is the only place that thinking is written down, which is why the file is kept rather than deleted.

**Edited:**

- `CMS-CORE-REFERENCE.md` - the product's grading standard, and the one doc that was already written for the product rather than the client.
  Two baseline lines named the client and both were out of date:
  - 2.5's baseline listed `kape_session`, `.prose-kape` and `data-kape-form` as structural.
    All three are gone; the session cookie is `cms_session`, and `no-brand.test.ts` fails the build if any of them come back.
    Recorded as a pass.
  - 3.7's baseline said "10 of 21 section types bind to KAPE tables or content-type keys".
    The count is right: `postList`, `videoGrid`, `albumGrid`, `publicationList`, `people`, `map`, `directory`, `partners`, `projectList`, `orgChart`.
    The tables are the product's now, and the module registry makes their query sources optional, so I reworded it to name the tables and marked 3.7 unresolved rather than failed.
    **This one is a claim worth re-checking.**
    `sectionsFor()` still returned all 21 templates when I passed it a settings object with every module off, so I could not demonstrate the criterion either way from outside `/admin/modules`.
    I stopped rather than dig into module code that is not mine.

**All five files are byte-identical on `main` at `b21751a`**, which I checked with `git diff b21751a 229f0c0 -- docs/`.
Nothing deleted here is the only copy, so nothing needed moving and there was no "belongs on main, leave in place" case to hand back.
Both deletions reverse with `git checkout 229f0c0 -- docs/REQUIREMENTS.md docs/LOVABLE-GAP-ANALYSIS.md` if you disagree.

## 3. Languages

### What landed

The `languages` table is now the source of truth for the two consumers that can await a query.

- `scripts/gen-prerender-paths.ts` reads enabled languages ordered by `sort`, and fails loudly if the table is empty rather than silently prerendering nothing.
- `src/routes/sitemap[.]xml.tsx` does the same, falling back to `LANGS` if the query throws, matching how the file already handles its other two queries.
- `src/lib/i18n-config.ts` gains `reportUnroutable(codes, where)`, which warns when the table holds a language the router has no prefix for.
  That warning is the only thing between a language enabled in the admin and a sitemap full of URLs that 404, so it has a test.

This fixed a real defect rather than only enabling a future one.
A blank install has exactly one language row, because `install.ts` writes only the default.
`LANGS` has two.
So before this change, every blank install advertised a `/km/` URL for every page it owned, to a site with no Khmer.
Measured on a scratch install: the sitemap went from 18 URLs to 9, and the prerender list from 18 paths to 9.

`src/server/install.ts:67` is unchanged, deliberately.
The check validates `SITE_DEFAULT_LANG` against `LANGS`, and the job file expected it to move to the table.
It cannot yet, for two reasons: the table is empty at install time, since the installer is what writes the first row; and while the router matches `LANGS`, a default language outside that list produces a site whose every URL redirects to nothing.
The check is load-bearing and its message is accurate, so I left it and am reporting it instead.

### What the rest costs

I did not land the router half.
The job file predicted a restructure of the routing layer, and that part is wrong in a way worth correcting: **the routing layer is already dynamic.**
Every route is `/$lang/...` with a param, not a literal `/en/...`, so TanStack Router matches any first segment today.
No route definition needs to change.

What actually blocks it is language *resolution*, in three pieces.

**1. The bootstrap chicken-and-egg. Blocked on a file I do not own.**
`__root.tsx:43` calls `detectLang(location.pathname)` to choose which language to fetch the i18n bootstrap in.
Parsing the path needs the list; the list arrives with the query that needs the parse.
The fix is for `i18n.bootstrap` to take the raw first path segment and resolve it server-side against `languages`, returning the resolved language alongside the list it already returns.
That is a change to `src/integrations/trpc/router.ts`, which pane c10 is live in and which I was told not to open.
**This is the stop-condition file.**
Half a day once c10 is out, most of it re-checking SSR hydration.

**2. The sync helpers read the list at module scope.**
`detectLang`, `stripLang` and `localizedHref` close over `LANGS`, and they are called during render, where nothing can be awaited.
The list has to come from context instead, which `LanguageProvider` already carries as `languages`.
Counted call sites:

| helper | call sites | files |
| --- | --- | --- |
| `localizedHref` | 30 | 13 |
| `detectLang` | 4 | 3 |
| `stripLang` | 4 | 3 |
| `DEFAULT_LANG` | - | 10 |

Mechanical, wide, and it touches nine component files plus `src/lib/i18n.tsx`, none of which are mine and two of which (`Header.tsx`, `NavLink.tsx`) belong to J22.
Call it a day and a half, and it wants its own job with the component files partitioned, not a tail bolted onto this one.

`DEFAULT_LANG` is the same problem wearing a different hat: `languages.is_default` is the data and the constant is what ten files actually read.
Fix both in one pass or the second pass repeats the first.

**3. The three `$lang` guards are the easy part and are not worth doing alone.**
`$lang.donate.tsx`, `$lang.contact.tsx` and `$lang.search.tsx` have async loaders that already receive `context`, so each could await the language list and test membership in about five lines.
But their only job is to decide whether the first segment is a language or content, and until piece 1 lands they would be deciding it from a list the root route has already contradicted.
Doing these three first buys nothing.

Total for the router half: roughly two to three days, gated on c10 releasing `router.ts`, and best split as one job for pieces 1 and 3 and a separate one for piece 2.

The comment at `i18n-config.ts:7` still tells the reader to edit two places, and it is still true.
I extended it to say which half reads the table and why the other half cannot.

## Acceptance

### 1. `grep -ri kape` over the tracked tree, excluding `src/server/seed/` and `.work/`

166 hits in 24 files.
Grouped, with every one accounted for.

**The fixture's content (145 hits, 10 files).** This is the client's site as data, reachable only from `bun run seed:kape`, and the job file puts the fixture out of scope.

```
   84  scripts/seed-demo-content.ts
   28  scripts/seed-who-we-are.ts
    8  src/server/migrate-tree.ts
    7  scripts/static-pages/group3.json
    6  scripts/static-pages/group2.json
    5  scripts/home-page-sections.ts
    3  scripts/seed-alumni-form.ts
    2  scripts/static-pages/group1.json
    1  scripts/seed-calendar-pages.ts
    1  src/server/page-tree.ts
```

`no-brand.test.ts` exempts `migrate-tree.ts` and `page-tree.ts` by name as fixture.
**It does not cover `scripts/` at all** - it walks `src/` only - so the eight fixture files under `scripts/` are unguarded by anything.
That is a hole, not a leftover: nothing stops a customer's name being typed into a new `scripts/` file. Worth its own small job.

**The fixture's command name (3 hits).** `package.json:19` `"seed:kape"`, plus `src/server/install.ts:4` and `scripts/seed-calendar-pages.ts:4` pointing at it in prose.
Allowed by design; `no-brand.test.ts` rewrites `seed:*` to `seed:fixture` before matching so that the product may name its own fixture.

**The guard itself (2 hits).** `src/lib/no-brand.test.ts:18-19`, the `/kape/i` and `/kapekh/i` patterns.
These have to stay; they are what makes the rest of this hold.

**The dropped prototype (4 hits).** All `kapecambodia-main`, a directory that does not exist:

```
.gitignore:24, .gitignore:34, .dockerignore:30, tsconfig.json:3
```

Dead references to the Lovable build. Not my files. Recommend deleting all four lines.

**Scaffold and generated (2 hits).** `.cta.json:2` `"projectName": "kape"`, the one-time create-tanstack-app record, which also claims `"packageManager": "npm"`.
`bun.lock:6`, which regenerates.
Recommend deleting `.cta.json` outright; it records how the repo was scaffolded two years of commits ago and nothing reads it.

**Deployment migration notes (11 hits).** `README.md:90-126` and `docker-compose.yml:53-54` tell an existing operator how to move from `kape.db` and the `kape-data` volumes to `cms.db` and `cms-data`.
These are instructions for a migration that has to name the old thing to be followable.
Leave until the migration is behind us, then delete both blocks together.

**Filenames, which a content grep does not see.** The job file asked specifically about `public/`, so I checked names as well with `git ls-files | grep -i kape`.
Outside `src/server/seed/` and `.work/` there are exactly two:

```
public/fixture/kape-favicon.ico
public/fixture/kape-logo.png
```

The client's logo and favicon, sitting under `public/fixture/` where the fixture's assets belong, next to a generic `public/logo.png` and `public/favicon.ico` that a blank install actually serves.
Correctly quarantined; out of scope. Leaving them.

`.env.example` is clean.
It was de-branded in an uncommitted change that is not mine, along with `MAIL_TO`, which used to default to the client's address.

**The positioning paragraph (2 hits).** `README.md:8-10`:

> The first deployment is KAPE (Kampuchea Action to Promote Education, ...), the largest local education NGO in Cambodia; that site's content is a fixture, `bun run seed:kape`, not the product.

This is the one that is a decision rather than a leftover, and it is not my file.
It is honest and it explains what `seed:kape` is for.
It is also the first paragraph of the front door of a product called `koompi-cms`, naming a customer.
**Your call.**

### 2. `bun run db:seed` on a scratch database

`DATABASE_PATH=/tmp/c9/blank.db SSG_CACHE=off bun run db:seed` then `bun --bun vite dev --port 3000`.

Boots. `/en` returns 200.
Screenshot `/tmp/c9/blank-home.png`: header reading "My Site" with a generic document-icon logo, the language switcher showing English alone, one heading "Welcome to My Site" over "This is your new site. Sign in at /admin to edit this page, build your menu and publish your first content.", an empty EXPLORE column, the newsletter form, and "© 2026 My Site".
No organisation's name, logo or copy anywhere.

### 3. `bun run seed:kape` on a scratch database

`bun run seed:kape` runs against a fresh empty file, not a `db:seed`-ed one; `alreadySeeded()` checks for any `languages` row, so the two are alternatives rather than a sequence.
Seeded 2 languages, full nav tree, page tree, 40 published pages and 30 published posts.

Screenshot `/tmp/c9/fixture-home.png`: the client's site restored whole.
Hero with the tagline, the bidding-invitation announcement popup with its deadline, latest news with one featured post and two in the rail, three impact stories, three videos, the seven animated stat counters, the About band, the donate CTA, the partner grid across eight categories, and the bilingual footer with the Khmer calendar.
The standing gate holds; generalising the docs did not touch it.

Both screenshots are in `/tmp`, which is tmpfs and will not survive a reboot.

### 4. A third language

Inserted into the source of truth on the fixture database:

```sql
insert into languages (code,name,native_name,is_default,enabled,rtl,sort)
values ('fr','French','Français',0,1,0,2);
```

Prerenderer picks it up:

```
[prerender] fr enabled in the languages table but absent from LANGS in src/lib/i18n-config.ts, so the router will not serve /fr/
Wrote prerender-paths.json with 270 paths (90 content × 3 langs).
by prefix: {"en":90,"fr":90,"km":90}
```

Sitemap picks it up, 183 URLs, 60 per language, and logs the same warning:

```
<url><loc>http://localhost:3000/fr</loc></url>
<url><loc>http://localhost:3000/fr/who-we-are/about</loc></url>
```

**The router still needs the constant, and here is what that costs today:**

```
/en           200
/km           200
/fr           301 -> /en/fr
/fr/calendar  301 -> /en/fr/calendar
```

`/fr` is read as content, not a language, and redirects into a path that does not exist.
So enabling a language in the admin without adding its code to `LANGS` now produces a sitemap and a prerender list full of dead URLs.
That is worse than before for anyone who tries it, and it is why `reportUnroutable` warns on every sitemap request rather than once at startup.
Until piece 1 above lands, the two-place rule in the `i18n-config.ts` comment is the whole protection.

I did not add `fr` to `LANGS`. Doing so would have made the demo pass and hidden the exact thing being reported.

### 5. Tests, types, format

| | at start (`229f0c0`) | now |
| --- | --- | --- |
| `bun run test` | 256 tests, 22 files | 266 tests, 24 files, all passing |
| `bunx tsc --noEmit` | silent | silent |
| `bun run format` | - | clean, 250 files, no fixes applied |

Of the 10 new tests, 3 are mine in `src/lib/i18n-langs.test.ts`; the other 7 arrived in pane c10's `router.test.ts` while I was working.
Excluding c10's file entirely: 259 tests over 23 files.

The suite went red twice mid-job, both times in c10's `router.test.ts`, once on a `bun:sqlite` import and once on a single assertion, alongside two `tsc` errors in `router.ts`.
Each cleared on its own within minutes.
That is what running a suite against a file another pane is editing looks like, not a defect I found.
Final state confirmed over three consecutive runs: 266 passed, 24 files, no failures.

`HEAD` moved from `229f0c0` to `c13038c` while I worked.
That commit is the lead's and touches `.work/LEAD.md` and my own job file only, nothing I own.

### 6. Files changed or deleted

Owned:

- `package.json` - name field only
- `docs/CONTENT-MODEL.md`, `docs/BUILD-PLAN.md` - rewritten
- `docs/CMS-CORE-REFERENCE.md` - two baseline lines
- `docs/REQUIREMENTS.md`, `docs/LOVABLE-GAP-ANALYSIS.md` - deleted
- `src/lib/i18n-config.ts` - `reportUnroutable`, and the header comment
- `src/routes/sitemap[.]xml.tsx` - reads `languages`
- `scripts/gen-prerender-paths.ts` - reads `languages`
- `src/lib/i18n-langs.test.ts` - new

Untouched though owned: `src/server/install.ts`, `src/routes/$.tsx`, `$lang.donate.tsx`, `$lang.contact.tsx`, `$lang.search.tsx`.
All five still import `LANGS`, and the reasons are in section 3.

**Outside my set, and you should know about it: `README.md`, four lines.**
Deleting two docs broke two links and a directory listing in the README's `## Docs` section.
I repaired only that: the file tree line and the three-doc link list.
Nothing else in the README changed, including the positioning paragraph and the migration notes, both of which are flagged above for you.
I judged leaving knowingly broken links worse than the ownership line, but it is your call whether that was the right trade.

## Stop conditions

Never ran against the repo's `kape.db`; its mtime is unchanged at 20:58 and its `-wal` is still 0 bytes.
Scratch databases in `/tmp/c9`, `DATABASE_PATH` exported per command, `SSG_CACHE=off` throughout.
`VACUUM INTO` turned out not to be needed: every run built its database from an empty file, so nothing was copied out of the repo's.

Two dev servers, both on port 3000 under `timeout`, both explicitly killed, port confirmed free after each.
Logs redirected to `/tmp/c9`, final sizes 390 B and 770 B.
The `vite dev --port 3141` still running is pane c10's, logging to `/tmp/c10/dev.log` under its own cap.

No commit, no git write, no worktree command, no worklog edit.

## Next

Router half of the language work is blocked on `router.ts` (c10); price and split is in section 3, and the README's first paragraph naming the client is Rithy's call.
