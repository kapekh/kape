# C5 - The installer must not be able to wedge a database

Rounds two and three on C1.
Everything below was run on this branch against scratch databases under `/tmp/c5`; the repo's `kape.db` was never opened.

**Round three is section 8 onward.** An independent critic confirmed the atomicity work with 313 interruptions and found that the risk had moved to the guard itself: the completion marker was an ordinary settings row with a working Delete button, and two clicks in `/admin` bricked the container while the diagnostic offered to delete an intact database. Sections 1 to 7 are round two and stand, with the state check they describe superseded by section 8.

## 1. The wedge, reproduced and then removed

### Before: two ways in, one dead end

The auditor's first reproduction, repeated here.
A complete install was copied with `VACUUM INTO` and rewound to the point a crash just after the `languages` write would leave it, deleting the six tables written after it.

```
tenants 1  languages 1  ui_strings 0  content_types 0  roles 0  users 0  site_settings 0  pages 0
```

Booting the entrypoint's installer against that file, twice:

```
=== boot 2
Already installed — skipping.
exit=0
=== boot 3
Already installed — skipping.
exit=0
--- counts after two boots
tenants 1  languages 1  ui_strings 0  content_types 0  roles 0  users 0  site_settings 0  pages 0
```

Served on port 3000:

```
GET /   -> 404
GET /en -> 404
```

No administrator, no `site_settings`, no home page, exit 0, and nothing any later boot would ever change.

The second reproduction, the raw failure.
Installing over a database that already holds the configured administrator's address:

```
SQLiteError: UNIQUE constraint failed: users.tenant_id, users.email
      at #run (bun:sqlite:185:20)
      at execute (node_modules/drizzle-orm/sqlite-core/query-builders/insert.js:174:54)
```

That run left behind the five tables it had written before it hit the collision:

```
tenants 1  languages 1  ui_strings 90  content_types 10  roles 4  users 1  site_settings 0  pages 0
```

and the very next boot said `Already installed — skipping.` again.
A failed install manufactures the wedge on its way out.

### Where the failure is total, per statement

The pre-fix `install()` body was rebuilt in a scratch module and failed at each of its statements in turn.
`state` is what the file holds afterwards; `old guard` is what `alreadySeeded()` would tell the next boot.

```
stmt  state    counts                       outcome    old guard
   1  EMPTY    0,0,0,0,0,0,0,0,0            threw      next boot: would retry
   2  PARTIAL  1,0,0,0,0,0,0,0,0            threw      next boot: would retry
   3  PARTIAL  1,1,0,0,0,0,0,0,0            threw      next boot: skips forever
   4  PARTIAL  1,1,90,0,0,0,0,0,0           threw      next boot: skips forever
   5  PARTIAL  1,1,90,10,0,0,0,0,0          threw      next boot: skips forever
   6  PARTIAL  1,1,90,10,1,0,0,0,0          threw      next boot: skips forever
   7  PARTIAL  1,1,90,10,2,0,0,0,0          threw      next boot: skips forever
   8  PARTIAL  1,1,90,10,3,0,0,0,0          threw      next boot: skips forever
   9  PARTIAL  1,1,90,10,4,0,0,0,0          threw      next boot: skips forever
  10  PARTIAL  1,1,90,10,4,1,0,0,0          threw      next boot: skips forever
  11  PARTIAL  1,1,90,10,4,1,6,0,0          threw      next boot: skips forever
  12  PARTIAL  1,1,90,10,4,1,6,1,0          threw      next boot: skips forever
  13  PARTIAL  1,1,90,10,4,1,6,1,0          threw      next boot: skips forever
  14  COMPLETE 1,1,90,10,4,1,6,1,1          threw      next boot: skips forever
```

Twelve of sixteen interruption points left a half-written database.
Eleven of those twelve reported themselves finished on every later boot.

### The fix

`src/server/install.ts`, three changes, no schema change.

**One transaction on the raw connection.**
drizzle's bun-sqlite `transaction()` commits an async callback even when it throws, confirmed here before writing anything:

```
caught: boom
tenants surviving an async transaction that threw: 1
```

So the transaction is driven on `db.$client` with `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` around the writes.
Password hashing moved out of the transaction, being the one slow step that holds no lock.
This also covers the process being killed: SQLite discards an uncommitted transaction when the file is reopened.

**A guard that keys on the install having finished.**
`installState()` replaces `alreadySeeded()` and returns `empty`, `complete` or `partial` plus the list of what is missing.
`complete` means either the `install_completed_at` marker, written last inside the transaction, or - for a database installed before that marker existed - every artefact a finished install leaves: tenant, default language, UI strings, content types, roles, an administrator, a site name, a home page.
A database that passes the older evidence check has the marker backfilled on that boot, so an operator deleting their home page later can never make a working install look abandoned.
The marker lives in `site_settings` and is filtered out of `getSettings()`, which is dehydrated into every page's HTML:

```
keys sent to the browser: copyright, header_donate_label, header_donate_link,
  header_search_link, header_sitemap_link, site_name_en
install_completed_at present: false
```

**Loud refusal instead of a healthy report.**
`partial` exits 1 with a message naming the file, what is missing, that nothing was changed, and how to recover.
`set -e` in `docker-entrypoint.sh` then stops the container rather than serving the 404.

### After

The same wedged database, same installer:

```
Refusing to install: /tmp/c5/wedge.db is half-installed.
An earlier install wrote part of its tables and stopped. Missing: UI strings, content types, roles, administrator, site name, home page.
Nothing has been changed by this run. Installing over it would collide with the rows already there, and serving it would 404 on the site's own home page.
Recover either by restoring a backup, or - if this database holds nothing you need - by stopping the container, deleting /tmp/c5/wedge.db along with its -wal and -shm files, and starting again for a fresh install.
exit=1
```

A fresh install serves its own front page:

```
/ (followed) -> 200
/en          -> 200
```

## 2. An interrupted install leaves nothing

**Every statement.**
The current installer makes 47 writes.
Failing at each one in turn, the database afterwards:

```
statements 1-47 : EMPTY   (0 rows in all of tenants, languages, ui_strings,
                           content_types, roles, users, site_settings, pages, translations)
statement 48+   : nothing left to fail, install completes
```

Statement 2 is the `languages` write the old guard keyed on.
It now leaves nothing.

**Killed mid-install.**
A full install takes about 175ms.
102 runs were `SIGKILL`ed at 3ms intervals across 100-200ms, three passes over the band:

```
  52 COMPLETE
  50 EMPTY
   0 PARTIAL
```

The kills land on both sides of the write window and never between.

## 3. Second and third boots, and a taken administrator address

Repeat boots on a finished install:

```
=== boot 2
Already installed - skipping.
exit=0
=== boot 3
Already installed - skipping.
exit=0
tenants 1  languages 1  ui_strings 90  content_types 10  roles 4  users 1  site_settings 7  pages 1
```

Installing where the configured administrator already has an account:

```
Refusing to install: /tmp/c5/v3/usersonly.db is half-installed.
An earlier install wrote part of its tables and stopped. Missing: tenant, default language, UI strings, content types, roles, site name, home page.
Nothing has been changed by this run. ...
ADMIN_EMAIL=owner@test.example already has an account in this database, so re-running the install cannot claim it.
Recover either by restoring a backup, or - ...
exit=1
```

`install()` carries the same check for callers that reach it directly, so it is not only the entry point that is safe:

```
ADMIN_EMAIL=owner@test.example already has an account in /tmp/c5/v3/usersonly.db, so this is
not an empty database and there is nothing to install. Set ADMIN_EMAIL to an address that is
not already in use, or point DATABASE_PATH at a new file. Nothing has been changed.
```

Neither run wrote a row.
Both are covered in `install.test.ts`.

## 4. The test now bites

`install.test.ts` went from 8 assertions to 24.
Each of the auditor's four mutations was applied to `install.ts`, the suite run, and the file restored.
A fifth mutation removes the transaction, restoring the pre-fix installer.

```
FAILED (mutation caught)    1  deleted ...HEADER_DEFAULTS from the site_settings insert
           × writes every header default, with its default value
FAILED (mutation caught)    2  deleted await normalizeTree(db)
           × leaves the page tree normalised
FAILED (mutation caught)    3  home section type renamed to no-such-section
           × only ever writes sections the renderer knows how to draw
FAILED (mutation caught)    4  ui_strings written under en regardless of SITE_DEFAULT_LANG
           × installs
           × files the whole string dictionary under the language it configured
           × leaves no key the default-language install has and this one does not
           × marks km, and only km, as the default language
FAILED (mutation caught)    5  transaction removed, install left non-atomic
           × leaves nothing behind
           × can be installed again, because there is nothing in the way
```

What made each one catchable:

- Mutation 1 needed the settings compared by value, not counted.
- Mutation 2 was **not detectable before this job's other half**.
  On the old one-page install `normalizeTree` provably did nothing: `upsertPage` already writes `segment = "home"`, `parent_id` defaults null and `sort_order` defaults 0, which is exactly what `normalizeTree` would then set.
  Seeding the collection landings (section 6 below) gives the install nine pages, and `normalizeTree` is what assigns them `sort_order` 0-8; without it every sibling shares 0.
- Mutation 3 needed every seeded section's `type`, `layout` and query `source` checked against `SECTION_DEFS`, not just counted.
- Mutation 4 needed a second install at `SITE_DEFAULT_LANG=km` in the same run.
  It turns out `ui_strings.lang` has a foreign key to `languages.code`, so the mutation makes the km install fail outright rather than land wrong; the suite reports that as `installs` failing with the FK error, then the three shape assertions behind it.
- Mutation 5 is the interrupted-install case, driven by a harness the test writes to its own temp directory: it patches `db.insert/update/delete` to throw at the third write, one past `languages`, then asserts nine tables are empty and that a normal install afterwards succeeds.

Mutation 4's failure is loud but blunter than the rest, since the install aborts before any assertion about shape can run.
I left it that way rather than weakening the schema's foreign key to make a prettier failure.

## 5. Brand outside `src/`

| File | Was | Now |
|---|---|---|
| `drizzle.config.ts:8` | `?? "./kape.db"` | `?? "./cms.db"`, matching `src/env.ts`, with a comment saying why the two must not drift |
| `vite.config.ts:16` | `allowedHosts: ["kape.koompi.cloud"]` | read from `ALLOWED_HOSTS`, comma separated |
| `docker-compose.yml` | `/data/kape.db`, `MAIL_TO` defaulting to `kape@kapekh.org`, `kape-data` / `kape-uploads` | `DATABASE_PATH` overridable defaulting to `/data/cms.db`, `MAIL_TO` empty, `cms-data` / `cms-uploads`, plus `ALLOWED_HOSTS` passed through |
| `.env.example` 6, 14, 74 | `kapecambodia.org`, `./kape.db`, `kape@kapekh.org` | `example.org`, `./cms.db`, empty; `ALLOWED_HOSTS` documented |
| `docker-entrypoint.sh` | `/data/kape.db` | `/data/cms.db`, and a note that `set -e` is load-bearing now the installer can exit 1 |
| `scripts/check-authorable.ts:15` | `?? "./kape.db"` | `?? "./cms.db"` |

`docker compose config` validates.

### What an operator upgrading an existing deployment must do

This is written at the point of use, in `docker-compose.yml` above the `volumes:` block, because that is the file they will open.
In short: the volumes **and** the database file inside them both changed name, Compose will silently create the new empty ones, and the site will come back blank while the old data sits untouched.

Two supported paths, both stated in the file:

1. Keep what you have. Put `DATABASE_PATH=/data/kape.db` in `.env` and uncomment the two `name:` lines under `volumes:` with your Compose project prefix. Nothing moves.
2. Move to the new names, with the stack stopped, using the two `docker run ... alpine cp -a` commands given in full, including renaming `kape.db` to `cms.db` and its `-wal` / `-shm` companions. Keep the old volumes until the site is verified.

`ALLOWED_HOSTS` is a third thing they must set: `bun run start` is `vite preview`, which previously had the deployed domain hardcoded and now refuses every request with `Blocked request` until the variable is set.
Documented in `.env.example`, `docker-compose.yml` and README.

### What is left, and why

- `package.json:2` `"name": "kape"`. Private, never rendered, but it is a brand string in a shipped manifest. Renaming it needs the product name, which C2/C6 own; I did not want to invent one. `seed:kape` and `src/server/seed/kape.ts` are the KAPE fixture and are correctly named.
- `README.md` and `docs/*` describe the KAPE deployment. Not product configuration; a separate decision.
- `.gitignore`, `.dockerignore`, `tsconfig.json` mention `kapecambodia-main`, the excluded reference codebase directory. Harmless.
- `docker-compose.yml` names `kape-data` and `kape.db` inside the upgrade instructions, necessarily.

## 6. The four calendar pages, and the rest of `scripts/`

`scripts/seed-calendar-pages.ts` was wired into nothing while the fixture seeded `footer_buttons` pointing at its three URLs.

The content moved to `src/server/seed/pages-calendar.ts` exporting `seedCalendarPages()`, called from `seedKape()` **after** `applyTreeMigrations(db)`: these pages set their own parent and sibling order and `normalizeTree` would resort them by slug, and they own `footer_buttons`, which `seedSiteSettings` writes earlier.
`scripts/seed-calendar-pages.ts` is now a nine-line wrapper, so refreshing the dates against a new sub-decree still works standalone.

`bun run seed:kape` into a scratch database:

```
  created  /calendar  (id 37)
  created  /calendar/public-holidays-cambodia  (id 38)
  created  /calendar/public-holidays-kape  (id 39)
  created  /calendar/international-days  (id 40)
  footer_buttons updated
  footer_buttons_km created
```

Served:

```
200  /en/calendar
200  /en/calendar/public-holidays-cambodia
200  /en/calendar/public-holidays-kape
200  /en/calendar/international-days
200  /km/calendar/public-holidays-cambodia
200  /km/calendar/international-days
```

The three footer button targets come from `site.settings` over tRPC, which the footer reads:

```
footer_buttons = Public Holidays in Cambodia 2026|/calendar/public-holidays-cambodia,
                 Public Holidays in KAPE 2026|/calendar/public-holidays-kape,
                 International Days|/calendar/international-days
```

All 40 pages of a fixture-seeded site were crawled; every one returns 200.

### The remaining unwired scripts

Twenty-three files in `scripts/`; four are referenced (`gen-prerender-paths`, `prerender-static`, `prerender`, `apply-tree`), the rest are not.
Rather than take the auditor's word, I listed the tables each writes and counted those tables in a fixture-seeded database.
Three come out empty:

| Table | Script | Does the fixture need it |
|---|---|---|
| `forms` | `seed-alumni-form.ts` | No. The four seeded `form` sections carry no `formSlug`, so they render the built-in quick layouts. The script is labelled a proof of concept and would attach a built form to `/opportunities/alumni`, which serves 200 without it. |
| `campaigns` | `seed-campaigns.ts` | No. Nothing in the fixture's pages, nav or settings references a campaign. |
| `org_nodes` | `seed-who-we-are.ts`, `migrate-people.ts` | No. No `orgChart` section is seeded, so nothing links to it. A fixture site simply has no org chart. |

Everything else those scripts write is already covered by `src/server/seed/` at equal or greater volume.
So: spent one-off migrations, now checked rather than believed.
`scripts/collection-landings.ts` is superseded by `src/server/seed/landings.ts` and `migrate-tree.ts`; I left it in place rather than delete another job's file.

## 7. The sitemap, and the handoff

**My half: yes, a fresh install should seed a landing page for each collection it ships.**

The reason is not the sitemap.
`resolveRoute` serves `/news/my-post` from the record table but `/news` only from a page row, and there is no fallback.
So a fresh install that ships ten content types 404s on the listing page for every one of them, and the breadcrumb on a newly published post points at that 404.
The listing page is structure, not content: it is what makes a shipped content type reachable.

`src/server/seed/landings.ts` derives one landing per public collection straight from `COLLECTIONS`, skipping anything in `NON_PUBLIC_CONTENT_TYPES`, each with a single listing section bound to that collection and titled from the collection's own `label`.
Eight pages: news, stories, videos, galleries, team, publications, careers, projects.
No editorial copy.
The mapping from collection to section type is checked against `SECTION_DEFS` by `install.test.ts`, layout and query source included, so a typo fails the suite rather than rendering `Unknown section type:`.

`migrate-tree.ts`'s own `LANDINGS` was left alone: it carries KAPE editorial titles (`From the classroom`, `Join the team`) and the audit confirmed the fixture reproduces `main` cell for cell.

**C6's half is already done.**
Serving a fresh install made before this change, the sitemap now lists 2 URLs and 404s on none, so `sitemap[.]xml.tsx` already enumerates what exists rather than `COLLECTIONS` x `LANGS`.
With the landings seeded:

```
sitemap urls: 18
non-200: 0
```

The eighteen are `/en` and `/km` plus both languages of the eight landings.
`llms.txt` lists nine links on a fresh install, all 200.

Nothing further is owed on either side, but it is worth one line in C6's report that the two halves were verified composed, not just separately.

## Gates

| Gate | Required | Observed |
|---|---|---|
| `bun run test` | >= 72 | **104 passed (104), 17 files.** Baseline at the start of this job was 72 across 15 files; `install.test.ts` went 8 -> 24 |
| `bunx tsc --noEmit` | silent | **silent** |
| `bun run format` | clean | **Checked 237 files. No fixes applied.** |

## Files changed

- `src/server/install.ts` - transaction, `installState()`, refusal messages, landings
- `src/server/install.test.ts` - 8 assertions to 24
- `src/server/seed/landings.ts` - new, one landing per public collection
- `src/server/seed/pages-calendar.ts` - new, the calendar content moved out of `scripts/`
- `src/server/seed/kape.ts` - calls `seedCalendarPages()` after the tree pass
- `src/server/repo/site.ts` - one line, keeps `install_completed_at` out of the client payload
- `scripts/seed-calendar-pages.ts` - now a wrapper
- `scripts/check-authorable.ts`, `drizzle.config.ts`, `vite.config.ts`, `docker-compose.yml`, `docker-entrypoint.sh`, `.env.example`, `README.md`

`src/server/repo/site.ts` is outside my file list and outside C6's.
It is a one-line filter and the only alternative was shipping the installer's timestamp to every visitor.
Flagging it in case it collides.

## Known and left alone

- `LANGS = ["en","km"]` hardcoded in `src/lib/i18n-config.ts`. Out of scope, noted.
- `seedKape()` is not atomic and `kape.ts` still guards on `alreadySeeded()`. Same pattern, but its blast radius is a developer's fixture database, which is where this pattern was survivable. Not changed.
- `deletePage` has no guard on the home page. An admin can delete the page `/` resolves. The marker means that no longer stops the container booting, but the site still 404s on its front page with no warning anywhere.
- `ui_strings` counted 90 rows early in this session and 8 later; C6 is neutralising the default dictionary concurrently. No `install.ts` edit was needed for it, and the tests assert the key set matches between languages rather than any count, so they are indifferent to the size C6 settles on.

---

# Round three

The critic confirmed the atomicity work and then showed that the guard protecting it had become the new failure. Everything below is that.

## 8. The state check no longer keys on anything an operator can touch

### What was wrong

`installState()` keyed `complete` on the `install_completed_at` settings row, falling back to a full evidence check that included a page at `home` and the `site_name_en` setting.
Three consequences, all reproduced:

- `install_completed_at` was an ordinary row in a raw key/value grid with a Delete button. Deleting it and then the home page left an intact database that the entrypoint refused to boot, exit 1, with a message that blamed a half-finished install and offered deleting the file as the cure.
- A pre-marker database from `main`'s installer with its home page renamed to `welcome` was refused on its first boot under this build. Renaming the front page is an ordinary thing to do.
- `if (marker.length) return complete` ran before any evidence, so a database holding nothing but that row would report itself installed for ever. The original wedge, re-keyed onto a different row.

### The change

The check now keys only on rows the site cannot run without **and** an administrator cannot remove through the admin:

```
tenant, default language, UI strings, content types, roles, administrator
```

Deliberately not the site name, and not a page at `home`. Both are things an operator edits or renames on purpose, and a site missing them is wrong but reachable, so refusing to boot over one destroys more than it protects. They are reported as warnings on a boot that succeeds.

The marker is now a diagnostic only. It is never consulted for the verdict, in either direction: a database holding nothing but that row is `empty`, and a database an operator has deleted it from is still `complete`. What it buys is a better sentence, because the refusal can distinguish "these rows were never written" from "these rows were removed on 2026-03-04".

### Verified

All three scenarios, run through `docker-entrypoint.sh` itself:

```
=== 1. marker + home page + site name all deleted
Already installed - skipping.
Warning: no site name is set, so the header and page titles fall back to a placeholder. Set site_name_en in /admin/settings.
Warning: no page answers at the slug "home", so / will 404. Create one in /admin/pages.
exit=0

=== 2. pre-marker database from main's installer, home renamed to welcome
Already installed - skipping.
Warning: no page answers at the slug "home", so / will 404. Create one in /admin/pages.
exit=0

=== 3. schema-only database holding nothing but the marker row
Installed "Test Org" (en).
Administrator: owner@test.example
exit=0
```

The real wedge is still refused, and the message now diagnoses before it prescribes. A disposable file:

```
Refusing to install: /tmp/c5/r3/wedge.db is missing rows this site cannot run without.
Missing: UI strings, content types, roles, administrator.
Present: tenant, default language.
Nothing has been changed by this run.
This file holds no pages, posts or media. If there is nothing in it you need, stop the container, delete /tmp/c5/r3/wedge.db along with its -wal and -shm files, and start again for a fresh install.
```

The same fault on a database that holds a real site, which is where the old copy did damage:

```
Refusing to install: /tmp/c5/r3/lost-admin.db is missing rows this site cannot run without.
Missing: administrator.
Present: tenant, default language, UI strings, content types, roles.
It records a finished install on 2026-03-04T10:00:00.000Z, so these rows were removed after that, rather than never written.
It also holds 40 pages, 30 posts, 63 media items.
Nothing has been changed by this run.
Recover by restoring the most recent backup, or by putting the missing rows back by hand. Do NOT delete /tmp/c5/r3/lost-admin.db: the content listed above is in it and this installer cannot rebuild it.
```

Deleting the file is offered only when the file demonstrably holds no pages, posts or media, and the counts that decide it are printed.

## 9. The two clicks, closed server-side

Both guards are in `src/server/repo/admin.ts`, so the admin screen, the tRPC procedures and any future caller inherit them. Nothing was hidden in the UI, and `src/routes/admin.settings.tsx` was not touched.

- `INTERNAL_SETTINGS` holds `install_completed_at`. `adminListSettings` filters it out, and `upsertSetting` and `deleteSetting` refuse it.
- `deletePage`, `updatePage` and `movePage` refuse to delete, rename or reparent the page at `home`, because `resolveRoute` serves `/` from that exact slug with no fallback. Its content, sections and status stay fully editable; only its address is fixed.

Exercised through the running app's own API, logged in as the administrator:

```
adminSettings.list  ->  ['copyright', 'header_donate_label', 'header_donate_link',
                         'header_search_link', 'header_sitemap_link']
adminSettings.delete install_completed_at
  -> "install_completed_at" is written by the installer, not site configuration, and cannot be changed here.
adminSettings.set install_completed_at
  -> "install_completed_at" is written by the installer, not site configuration, and cannot be changed here.
adminPages.delete   (front page)
  -> This is the site's front page: / is served from the page at "home", and deleting it would
     leave / with nothing to answer with. Edit its content freely, or point / somewhere else
     first by giving another page the "home" address.
adminPages.move     (front page under /news)
  -> ... and moving it under another page would leave / with nothing to answer with. ...

front page afterwards: { id: 1, slug: "home", parent_id: null }
```

Editing the front page in place still works, checked separately and in the suite: sections rewritten, status changed to draft, both allowed.

`site_name_en` is still deletable. It no longer blocks a boot, and clearing the site's own name is a legitimate thing to do; the boot warns instead.

## 10. Smaller items

**A read-only database now gets a sentence.** The raw stack came from `db.ts` at import time, on its `PRAGMA journal_mode = WAL`, before any of `install.ts` runs, so it cannot be caught there without restructuring a file outside this job. `docker-entrypoint.sh` probes the file and its directory first:

```
=== read-only database file
Cannot write to /tmp/c5/r3/ro.db.
The installer and the running site both need write access; a read-only file or a read-only mount will not do. Check the file's ownership and mode, and that the volume is not mounted :ro.
exit=1

=== writable file in a read-only directory
Cannot write to /tmp/c5/r3/rodir.
SQLite keeps /tmp/c5/r3/rodir/x.db's -wal and -shm files beside it, so the directory has to be writable too, not just the database file.
exit=1
```

This covers the container, which is the shipped path. A direct `bun run db:seed` against a read-only file on a developer's machine still produces the `bun:sqlite` stack, because the throw happens inside `src/server/db.ts`, which is not mine this round. Stated rather than papered over.

**README.** The title is now `# Website & CMS`, and the lead says a fresh install carries no organisation's name, logo or copy, with KAPE named as the first deployment and its content as a fixture. A new **"Upgrading an existing deployment"** section carries the whole procedure, in the file an operator reads whatever they deploy with: the `kape.db` to `cms.db` rename, the volume rename, and `ALLOWED_HOSTS` now being mandatory. It also says what a boot of the new installer should look like, so an operator can tell a warning from a refusal.

**The compose upgrade note stopped asking for edits to a tracked file.** Option 1 is now `DATABASE_PATH` and `ALLOWED_HOSTS` in `.env` plus the volume names in an untracked `docker-compose.override.yml`, so the next `git pull` has nothing to conflict with. The copy step says `docker compose down` first. `docker-compose.yml` keeps a short pointer to the README rather than the full procedure, since it is the wrong place for it.

## 11. The three surviving mutations, closed

The critic wrote three that survived 24 of 24. All three now fail, and I added two more covering round three's own guards. Each was applied to the source, the suite run, and the file restored.

```
FAILED (mutation caught)    6  every landing bound to the wrong contentType
         × points each landing at its own collection
FAILED (mutation caught)    7  home page body emptied
         × gives every page it writes a title and something to say
FAILED (mutation caught)    8  landing page titles emptied
         × gives every page it writes a title and something to say
FAILED (mutation caught)    9  front-page delete guard removed
         × cannot be deleted
         × cannot be renamed out from under /
         × cannot be moved under another page
FAILED (mutation caught)   10  installer bookkeeping left writable
         × cannot be deleted
         × cannot be overwritten
```

Mutation 6 needed the binding compared against `COLLECTIONS`, not just validated against `SECTION_DEFS`: a landing renders and validates identically whichever content type it points at, so nothing else catches `/news` listing the job vacancies. Only posts-backed listings carry the discriminator; the rest bind by source, and the assertion checks both cases.

Mutation 7 and 8 needed the page titles compared to the collection labels, and the home page's tiptap body walked for actual text rather than checked for existence.

The five round-two mutations were re-run against the round-three code and still fail.

New tests this round, all in the suite:

- `install.test.ts`: an operator-edited database boots with warnings and keeps its content; the marker alone is not a verdict; a partial database that holds content is never told to delete the file.
- `src/server/repo/admin-guards.test.ts`: the bookkeeping row is not listed, not deletable, not writable, and does not obstruct ordinary settings; the front page cannot be deleted, renamed or moved, is still editable in place, and survives every refusal.

## 12. Gates, round three

| Gate | Required | Observed |
|---|---|---|
| `bun run test` | >= 104 | **126 passed (126), 18 files** |
| `bunx tsc --noEmit` | silent | **silent** |
| `bun run format` | clean | **Checked 238 files. No fixes applied.** |

End to end after the changes: a fresh install boots through `docker-entrypoint.sh`, `bun run seed:kape` completes, all **40 fixture pages return 200**, all **8 calendar URLs return 200** in both languages, and the fixture's sitemap lists **122** URLs.

## 13. Files changed this round

- `src/server/install.ts` - foundations-only state check, warnings that do not block a boot, marker demoted to a diagnostic, refusal copy that diagnoses before prescribing
- `src/server/install.test.ts` - three new describes, plus the landing-binding and title/body assertions
- `src/server/repo/admin.ts` - internal-settings denylist, front-page delete/rename/move guards
- `src/server/repo/admin-guards.test.ts` - new
- `docker-entrypoint.sh` - writability probes for the file and its directory
- `docker-compose.yml` - upgrade note points at the README, no tracked-file edits asked for
- `README.md` - neutral title and lead, full upgrade section

## 14. Still open, stated rather than fixed

- `bun run db:seed` against a read-only file still throws from `src/server/db.ts` on import. Fixing it means moving the WAL pragma behind a writability check in `db.ts`, which is outside this job's files.
- The losing installer in a `--scale web=2` race exits with a raw drizzle stack. Recorded by the critic as not for this round; data is safe because the winner holds the transaction.
- `package.json:2` is still `"name": "kape"`. Private and never rendered; renaming needs the product name, which C2 and C6 own.
- `docs/*` still describe the KAPE build.
- `seedKape()` is not atomic and still guards on `alreadySeeded()`. Fixture tooling, developer blast radius.
- `LANGS = ["en","km"]` hardcoded. Separately scoped.

---

# Closure: the KAPE fixture carries its own identity again

C6 moved identity out of code and into `site_settings` after this brief was written, and the fixture seeded none of it, so `seed:kape` produced KAPE's site wearing the product's neutral mark with no description. Values were read off `main` in a detached worktree at `b21751a`, not invented.

## 15. What was seeded, and where each value came from

`src/server/seed/site.ts`:

| Setting | Value | Read from |
|---|---|---|
| `site_name_short` | `KAPE` | `structured-data.ts` `alternateName` |
| `og_site_name` | `KAPE Cambodia` | `__root.tsx` `og:site_name` |
| `site_description` | `KAPE advances equitable, transformative education for children across Cambodia.` | `structured-data.ts` `description` |
| `logo_url` | `/fixture/kape-logo.png` | the crest C6 preserved byte for byte |
| `og_image` | `/fixture/kape-logo.png` | `__root.tsx` `og:image` was `/logo.png`, which on `main` was that crest |
| `address_region` | `Kampong Cham` | `structured-data.ts` |
| `address_country` | `KH` | `structured-data.ts` |
| `area_served` | `Cambodia` | `structured-data.ts` `areaServed.name` |
| `contact_phone` | `+855-42-941-481 / +855-42-941-918` | `structured-data.ts` `telephone` |

`src/server/migrate-tree.ts` also gives the home page the excerpt `main` hardcoded for it, so the front page keeps its own description instead of sharing every other page's.

Two of these need saying out loud.

**The telephone changed on screen, not just in JSON-LD.** `main` displayed `042-941-481 / 042-941-918` and separately hardcoded `+855-42-941-481` for schema.org. There is one setting now, and C6 was right to refuse to have the product invent a dialling code, so the fixture carries the international form and the site displays it. Both numbers were converted, not just the first.

**`site_description` is one knob where `main` had four hardcoded strings** for the same idea: a root meta description, a root `og:description`, a splat-route default, and a schema.org description, all differently worded. I gave it the schema.org one. It is a complete sentence, so it reads correctly in a meta tag, and it makes the machine-read field match `main` exactly. The cost is section 17's fourth item.

## 16. How it was verified

Both trees served at once against separate scratch databases, `main` from a detached worktree on port 3010, this branch on 3000, both with `VITE_SITE_URL=https://www.kapecambodia.org` so canonical URLs and absolute JSON-LD are exercised.

- Page sets first: **40 pages in common, none on `main` that this branch lacks**, and four this branch adds, which are the calendar pages `main` drops. That is section 6's fix, not a regression.
- **89 routes** compared for `<title>` and visible body text: all 40 shared pages in both languages, four article detail pages, and the five route-file pages (`/contact` in both languages, `/donate`, `/search`, `/login`).
- Ten of those routes also compared field by field on every `og:` and `description` meta tag, `link rel=canonical`, `apple-touch-icon`, and every leaf of every JSON-LD blob, flattened so a nested shape change cannot hide.

Visible text is extracted with a real HTML parser that skips `script`, `style`, `template` and `noscript`. My first pass used a regular expression, which let chunks of the dehydrated query payload through and would have reported false matches; the numbers below are from the parser.

## 17. Result

**0 title differences across 89 routes. 0 visible body differences except the three deliberate de-brandings named below.**

The home page and an article match on every field except one:

```
=== /en
  [SAME] title           KAPE — Kampuchea Action to Promote Education
  [SAME] description     For more than three decades, KAPE has championed ... over 160,000 lives.
  [SAME] og:description  (same)
  [SAME] og:site_name    KAPE Cambodia
  [SAME] og:title        KAPE — Kampuchea Action to Promote Education
  [SAME] og:url          https://www.kapecambodia.org/en
  [DIFF] og:image        main: https://picsum.photos/seed/kape-students/1600/1000
                         cms : /fixture/kape-logo.png
```

The article's JSON-LD matches on `headline`, `description`, `datePublished`, `author`, `publisher.name` and the organisation blob's `name`, `alternateName`, `description`, `email` and `telephone`.

### What still differs, and why

**1. The logo path.** `/logo.png` on `main`, `/fixture/kape-logo.png` here, across `og:image`, `apple-touch-icon`, `Organization.logo` and `publisher.logo.url`. The image is the same crest, byte for byte; `/logo.png` is now the product's own neutral mark and belongs to nobody. Correct, and the largest single class in the raw count.

**2. `areaServed` is a string, not a `Country` object.** `main` emitted `{"@type":"Country","name":"Cambodia"}`; `organizationLd` emits `s.area_served.trim()`, so this branch emits `"Cambodia"`. Valid schema.org either way, less specific here. **Handoff to C6**: `src/lib/structured-data.ts` is theirs, and the fix is to wrap the setting as a `Country` when it names one.

**3. `address.streetAddress` carries the province twice.** `main` put `PTTC, National Road 7, Kampong Cham Town` in `streetAddress` and `Kampong Cham` in `addressRegion`. This branch reads `streetAddress` from the `address` setting, which is also what the footer and contact page display, and that string ends `, Kampong Cham Province`. Trimming it to match the JSON-LD would delete the province from the visible address on every page, so I left the display right and the structured data redundant. Closing it properly means `structured-data.ts` deriving `streetAddress` from `address` minus `address_region`, which is C6's file.

**4. Meta description on pages with no excerpt of their own.** Five of ten sampled routes: `main` said `KAPE — access, quality and equity in education across Cambodia.`, this branch says the schema.org sentence. Unavoidable with one setting behind four hardcoded strings, and explained in section 15. Pages that have their own excerpt, including the home page and every article, match exactly.

**5. The home page's `og:image`.** `main` hotlinked `picsum.photos/seed/kape-students`. An earlier round removed picsum hotlinks from this repo deliberately, and there is no students photograph in `public/fixture/`, so I did not reintroduce one. The home page falls back to the crest, which every page already carries. **Not closed, and I would not close it this way**: it wants a real photograph from the client, set as the home page's cover.

**6. The byline on posts with no author.** Three publication detail pages read `KAPE` where `main` read `KAPE Cambodia`. `main` hardcoded `post.author ?? "KAPE Cambodia"`; `src/routes/$.tsx` now uses `post.author ?? siteShortName(settings)`, which is `KAPE`. **Handoff to C6, one word**: the fallback wants `socialSiteName(settings)`, which is already `og_site_name` and already `KAPE Cambodia`. I did not close it from the fixture, because giving those posts an author would change fixture rows the earlier audit verified against `main` cell for cell, and the difference is in the product's fallback, not the data.

### The deliberate de-brandings, confirmed and not chased

Two were named to me and both are present exactly as described: `/contact` says `regional teams` where `main` said `KAPE's provincial teams`, and `/login` says `Back to the site` where `main` said `Back to kapekh.org`.

A third of the same kind turned up on `/donate`, which was not on the list: `Support KAPE` became `Support our work`, `Choose a campaign below — scholarships, libraries, teacher training, and more.` became `Choose a campaign below.`, and `Every gift goes directly to KAPE's work across 15 provinces of Cambodia` became `Every gift goes directly to the work it names`. Same category as the two known ones, so I left it alone and am reporting it rather than assuming it was noticed.

## 18. Gates, closure

| Gate | Required | Observed |
|---|---|---|
| `bun run test` | >= 126 | **126 passed (126), 18 files** |
| `bunx tsc --noEmit` | silent | **silent** |
| `bun run format` | clean | **Checked 238 files. No fixes applied.** |

The worktree was detached, read only, and removed; `git worktree list` shows only the main checkout.

## 19. Files changed for closure

- `src/server/seed/site.ts` - nine identity settings, and the telephone in international form
- `src/server/migrate-tree.ts` - the home page's own excerpt
