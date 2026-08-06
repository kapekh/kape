# C5 - The installer must not be able to wedge a database

Round two on C1. An independent audit confirmed the fresh install runs and that the KAPE fixture reproduces `main`'s seed exactly, cell for cell, bar two random password salts. That half is done and is not to be redone.

It also found a ship-blocking defect and several loose ends. This job closes them.

## 1. The wedge, and it is the whole reason this job exists

`docker-entrypoint.sh` now runs the installer on **every boot**. `install()` is not wrapped in a transaction, and `alreadySeeded()` keys on the `languages` table, which is written **second of eight** steps.

The auditor reproduced this end to end, twice:

- Rewind a database to that crash point. Next boot prints `Already installed - skipping`, exits 0, changes nothing. Serve it: `/` **404s**. No administrator, no roles, no `site_settings`, no home page. **No future boot will ever repair it**, and the entrypoint starts the server anyway.
- Install over a database whose administrator email already exists: raw `SQLiteError: UNIQUE constraint failed: users.tenant_id, users.email` with a drizzle stack trace and no diagnostic, leaving exactly the wedged state above.

The pattern is inherited from the old dev seed, where the blast radius was a developer's scratch file. It is now the product's boot path, which is what makes it ship-blocking.

**Fix the root cause.** An install either completes or leaves nothing behind. The guard must key on evidence the install *finished*, not on its second write. A partial database must be detectable and either repaired or refused loudly, never reported healthy. Failure on a duplicate administrator must be a sentence an operator can act on.

Note before you design: drizzle's bun-sqlite `transaction()` **commits an async callback even when it throws**. Only a synchronous body rolls back. This cost another job a day; do not rediscover it.

## 2. The install test proves nothing

`src/server/install.test.ts` runs the real installer against a real file, which is right, and every assertion is a presence check, which is not. The auditor ran four mutations and **all four still passed 8 of 8**:

- deleting `...HEADER_DEFAULTS` from the `site_settings` insert
- deleting `await normalizeTree(db)`
- changing the home page's section `type` to `"no-such-section"`, after which the site renders `Unknown section type:` where its only content should be
- writing every `ui_strings` row under `lang: "en"` regardless of the configured language, so a `SITE_DEFAULT_LANG=km` install has no strings for its own language

It catches a table going to zero and nothing else. Make it assert the **shape** of what lands, and prove your version by running mutations against it and showing them fail. Include the interrupted-install case from item 1.

## 3. Brand outside `src/`, where the guard cannot see

The de-brand guard walks `src/` only. These ship and are yours:

| File | What |
|---|---|
| `drizzle.config.ts:8` | `?? "./kape.db"` - **the dangerous one.** With `DATABASE_PATH` unset, `db:migrate`, `db:push` and `db:studio` operate on `kape.db` while the app runs on `cms.db`. Migrations land silently on the wrong file. |
| `vite.config.ts:16` | `allowedHosts: ["kape.koompi.cloud"]` |
| `docker-compose.yml` | `/data/kape.db`, `MAIL_TO` defaulting to `kape@kapekh.org`, `kape-data` and `kape-uploads` volumes |
| `.env.example` | lines 6, 14, 74 |
| `docker-entrypoint.sh` | `/data/kape.db` default |
| `scripts/check-authorable.ts:15` | same fallback, read-only, lower risk |

Renaming a Docker volume changes where an existing deployment's data lives. Say what an operator must do, in the file they will read.

## 4. Four pages of client content the fixture drops

`scripts/seed-calendar-pages.ts` is wired into nothing, and the fixture seeds `footer_buttons` pointing at three `/calendar/*` URLs that do not exist. Confirmed live: all three footer buttons and the `/en/calendar` hub 404 on a fixture-seeded site.

Fold it into `seedKape()`. Then check the remaining unwired `scripts/seed-*.ts` yourself; the auditor believes the rest are spent one-off migrations, and "believes" is not "checked".

## 5. A blank install advertises 16 URLs that 404

`sitemap.xml` lists 20 URLs on a blank site and 16 of them 404 (`/en/news`, `/stories`, `/videos`, `/galleries`, `/team`, `/publications`, `/careers`, `/projects`, and their `/km` twins). `llms.txt` links 8 of the same. Both enumerate hardcoded `COLLECTIONS` x `LANGS` rather than what exists.

**This one is shared, so read carefully:** the *route files* `sitemap[.]xml.tsx` and `llms[.]txt.tsx` belong to C6. What is yours is whether a fresh install should seed landing pages for the collections it ships. Decide, do your half, and record the handoff. Do not edit those two route files.

## Files you own

- `src/server/install.ts`, `src/server/install.test.ts`
- `src/server/seed/` **except** `ui-strings.kape.ts`
- `src/server/page-tree.ts`, `src/server/migrate-tree.ts`
- `scripts/`, `package.json`
- `docker-entrypoint.sh`, `docker-compose.yml`, `Dockerfile`, `.env.example`
- `vite.config.ts`, `drizzle.config.ts`
- `.work/c5-report.md`

**C6 runs beside you and owns:** `src/lib/ui-strings.default.ts`, `src/server/seed/ui-strings.kape.ts`, `src/lib/site-identity.ts`, `src/routes/$.tsx`, `src/lib/structured-data.ts`, `src/routes/__root.tsx`, `src/routes/admin.settings.tsx`, `src/lib/no-brand.test.ts`, `src/routes/sitemap[.]xml.tsx`, `src/routes/llms[.]txt.tsx`.

C6 is neutralising the default string dictionary **without changing its exported shape**, so your `install.ts` should need no edit for it. If it does, that is a handoff to report, not a file to reach into.

## Acceptance

1. `.work/c5-report.md` with the reproduction of the wedge before your fix and its absence after.
2. An install interrupted at any step leaves a database that is either complete or empty. Demonstrate by interrupting at several points, including between the `languages` write and the end.
3. A second and third boot are safe no-ops. An install over an existing administrator email fails with a message an operator can act on, and leaves nothing half-written.
4. `install.test.ts` fails on all four mutations the auditor found, plus one for the interrupted install. Show each failing.
5. No brand string outside `src/` in a shipped file. State what an operator upgrading an existing deployment must do.
6. `bun run seed:kape` produces the calendar pages and the footer buttons resolve. Show them returning 200.
7. Gates: `bun run test` at or above 72, `bunx tsc --noEmit` silent, `bun run format` clean.

## Out of scope

- The content of the string dictionaries. C6.
- Page titles, meta tags, JSON-LD, the settings screen. C6.
- `LANGS = ["en","km"]` being hardcoded. Real, known, separately scoped. Note it and move on.
- Theme and modules. C3 and C4, not yet started.

## Stop conditions

- Never open the repo's `kape.db`. Temp files and `VACUUM INTO` copies only.
- Do not commit, do not touch git, do not edit the worklog.
- Do not weaken a test to make it pass.
- If fixing the wedge needs a schema change, stop and report. It should not.
