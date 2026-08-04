# J19 — Bring the real imagery across

All 59 assets are off the client's Lovable deployment and in our own storage, byte-exact.
The deployment stayed up for the whole run; nothing 404'd, nothing came up short.

Everything below ran against `VACUUM INTO` scratch copies with `SSG_CACHE=off` and `PORT` exported
to match `--port`. `kape.db` is unchanged, proved two ways.

## Acceptance

### 1. All 59 imported, every byte count matching its stub — PASS

```
59 stubs, 0 already imported
...
imported 59, skipped 0, in storage 59/59, pages relinked 4
```

Verified independently afterwards, comparing the file **on disk** against the stub rather than
trusting the importer's own check:

```
media rows: 59
verified byte+type exact: 59
no mismatches
```

Content types match the contract's census exactly:

| type | count |
|---|---|
| `image/jpeg` | 32 |
| `image/png` | 25 |
| `image/webp` | 1 |
| `application/pdf` | 1 |
| **total** | **59** |

No 404s, no byte or content-type mismatches, no halt. The script exits non-zero on either, and
never stores a file whose length or type disagrees with its stub.

### 2. Served by our app, not hotlinked — PASS

Repo-wide grep for `kapecambodia.lovable.app`, excluding `node_modules` and `.git`. In **code** it
appears on exactly one line:

```
scripts/import-lovable-assets.ts:23:const ORIGIN = "https://kapecambodia.lovable.app";
```

Every other hit is `.work/` markdown — this contract, `BACKLOG.md`, `UX-AUDIT.md`,
`J17-project-content.md`, `J20-ux-flow-audit.md`, `j17-report.md`. Documentation, not links.

Served from our own origin:

```
students.jpg -> /uploads/b3f6204d-d969-4cec-9ff2-d17963ad4da2.jpg
HTTP/1.1 200 OK   Content-Type: image/jpeg   Content-Length: 17029
```

17029 bytes, exactly the recorded size, from `localhost`.

### 3. Re-runnable without duplicate media rows — PASS

Four consecutive runs:

| run | imported | skipped | media rows | files on disk | pages relinked | slides relinked |
|---|---|---|---|---|---|---|
| 1 | 59 | 0 | 122 | 59 | 4 | — |
| 2 | 0 | 59 | 122 | 59 | 0 | — |
| 3 | 0 | 59 | 122 | 59 | 0 | 3 |
| 4 | 0 | 59 | 122 | 59 | 0 | 0 |

122 = the 63 rows already present + 59 imported. `59|59` on
`select count(*), count(distinct value) from translations where field='original_filename'` — one
name, one row, no duplicates. Runs 3 and 4 bracket the hero-slide relink added mid-job: it fires
once and is a no-op thereafter.

The skip is checked **before** the fetch, so a re-run costs no bandwidth and downloads nothing —
the on-disk file count stays at 59 rather than growing by 59 per run, which is what would happen if
idempotency keyed on anything `saveUpload` generates.

**How the key works.** `media` has no filename column and `saveUpload` names every object with a
fresh `crypto.randomUUID()`, so neither the row nor the object carries the asset's identity. The
prototype filename is recorded as a `translations` row — `entity_type='media'`,
`field='original_filename'`, `lang='en'`. That table is where the schema already keeps media
metadata (`media`'s own docstring says so, `entity_type` at `schema.ts:70` already lists `'media'`,
and 10 `caption` rows for media exist in `kape.db`). The `uq_translation` unique index on
`(entity_type, entity_id, field, lang)` makes a duplicate impossible at the database level, not just
in application logic. Nothing in `admin.ts` reads or rewrites media translations, so an editor
cannot silently clear the key. This avoided a schema change in `src/server/schema.ts`, which J19
does not own.

### 4. A page that used a placeholder now renders the client's real image — PASS

Screenshots in `.work/j19-shots/`, same viewport, same route, two databases differing only by this
import.

| page | before | after |
|---|---|---|
| `/en/what-we-do/ict-innovation` | `before-ict-innovation.png` | `after-ict-innovation.png` |
| `/en` (home hero) | `before-home.png` | `after-home.png` |

ICT Innovation went from a picsum stock seascape to the client's photograph of a student at a
computer. The home hero went from a stock coastline to a real KAPE conference room.

Source of truth behind the pixels:

```
BEFORE /en/what-we-do/ict-innovation:  4 picsum.photos/seed/kape-computerlab
AFTER  /en/what-we-do/ict-innovation:  4 /uploads/6bae6f26-d084-486a-bd8d-41eb6dd31416.jpg

BEFORE /en (home):  6 kape-hero-0, 7 kape-hero-1, 7 kape-hero-2
AFTER  /en (home):  7 + 7 + 6 /uploads/*.jpg
```

**How the mapping was derived, rather than guessed.** `src/assets/` holds nine of our own
`.asset.json` stubs that mirror the prototype's but substitute a picsum URL — e.g.
`src/assets/students.jpg.asset.json` carries `url: https://picsum.photos/seed/kape-students/...`.
That is an authoritative in-repo record of which placeholder stands in for which real photograph,
so the relink reads it instead of inventing correspondences. The three hero slots come from
`HERO_ASSETS` in `src/server/seed/media.ts`.

Four pages relinked: `home`, `what-we-do/ict-innovation`, `media/ai-digital`,
`opportunities/scholarship`. `renderCache` is cleared whenever anything is relinked, so
`resolveRouteCached` cannot keep serving the placeholder off a 7-day TTL.

### 5. Placeholders remaining — 63 media rows, all in slots with no client image

| slot | count | why it stays |
|---|---|---|
| nav mega-menu card images | 55 | the prototype's navigation carried no photographs at all |
| photo-album images (`post_media`) | 5 | `lib-a/b/c`, `ngs-a/b` — synthetic albums, no client counterpart |
| orphaned ex-hero rows | 3 | superseded by the relink; nothing references them, safe to delete in admin |

Plus one page: `j03-preview` still holds `kape-cert-1/2` and `kape-icon-a/b/c`. That is J03's
synthetic preview page, and those seeds have no prototype asset behind them.

`createPicsumMedia` stays exactly where the client genuinely has no image, as the contract asks.

### 6. The PDF is stored and downloadable, not treated as an image — PASS

```
media row: uploads/f2e93886-1119-4cfc-befd-23c85d60514f.pdf | application/pdf | 5832231
served:    HTTP/1.1 200 OK   Content-Type: application/pdf   Content-Length: 5832231
on disk:   PDF document, version 1.7, 36 page(s)
```

Stored with a `.pdf` extension and `application/pdf`, downloaded back through the running app, and
the 5832231 bytes re-open as a valid 36-page PDF. It is not in any image slot and no image row
claims it.

### 7. Gates

| gate | result |
|---|---|
| `bunx tsc --noEmit` | **0 errors** |
| `bunx biome check` on both owned files | **clean** (one formatting error found and fixed with `biome format --write`, scoped to my two files, linter off) |
| `bun run test` | **23 passed (23), 6 files** |

**The contract's "16 of 16 across 5 files" is itself stale.** J11 is running concurrently in another
pane and has added an untracked `src/server/repo/search.test.ts`. Excluding just that file:

```
Test Files  5 passed (5)
Tests  16 passed (16)
```

So the contract's figure is met exactly; the extra 7 tests in a 6th file are J11's, not mine.

## kape.db is unchanged

Baseline at start and at end are the same hash:

```
06fc0ac5897fd593cf0e319cdb29d69b  kape.db
```

`BACKLOG.md` is right that md5 proves nothing on a WAL database, so the state was also read back
**through a connection**, which reads through the WAL:

```
media rows: 63          (unchanged — the import added 59 to the scratch copy, none here)
picsum media: 63        (unchanged)
uploads media: 0        (nothing from this import leaked in)
original_filename translations: 0
pages with picsum sections: 5   (unchanged — the 4 relinks landed only on the scratch copy)
```

Every run used `DATABASE_PATH` pointed at a `VACUUM INTO` copy, including `bun run test`, which
would otherwise migrate `./kape.db` by default through `src/server/db.ts`.

`kape.db-wal` and `kape.db-shm` exist now and did not at the start. They are a side effect of
opening the read-only connection above on a WAL database; the connection read confirms the logical
contents are the pre-import state.

## Findings the orchestrator should act on

**1. The photographs are still not preserved. `public/uploads/` is gitignored.** This is the one
that matters, because it is the whole point of the job. R2 is not configured — no `R2_*` variable in
`.env` or the environment — so `saveUpload` took the local fallback and wrote 24MB across 59 files
into `public/uploads/`, which `.gitignore:22` excludes. The orchestrator commits the script but not
the bytes. If this machine is wiped and the Lovable deployment goes down, the client's photographs
are gone exactly as before. The script did what the contract specified and I did not invent a second
storage path, but **someone needs to either configure R2 and re-run, or archive
`public/uploads/` out of band, before this can be called done.** Re-running against a real R2 is
cheap: the skip keys on the database, so a fresh database plus R2 credentials re-imports all 59.

**2. One hotlinked placeholder remains in source, in a file I do not own.**
`src/routes/$.tsx:4` imports `@/assets/students.jpg.asset.json` and uses it at line 86 as the home
page's `og:image`, so every share card for the homepage still points at picsum. It is the only
source file importing those stubs. `src/routes/$.tsx` belongs to J21, so I left it. One-line fix
once an import has run.

**3. Step 4 is only partly satisfiable within J19's ownership, and I did not reach across.**
Picsum placeholders are also written by `seed/pages-who-we-are.ts` (J16), `seed/pages-what-we-do.ts`
(J16), `seed/records.ts` (J18), `seed/helpers.ts` and `seed/nav.ts`. `src/server/seed/media.ts` is
the only seed file J19 owns. Rather than edit five files belonging to finished jobs, the substitution
runs against the **database**, which has the advantage of fixing databases that were already seeded —
including `kape.db` — where a seed-source edit would have done nothing at all. A fresh install still
self-heals as long as the import runs after `db:seed`. If the orchestrator would rather the seed
sources also stop emitting picsum for those four pages, that is a small follow-up in J16/J18's files.

**4. `hero_slides` is not rendered on any public route.** `site.ts:listHeroSlides` is exposed over
tRPC as `heroSlides`, but nothing under `src/routes/` or `src/components/` calls it — the home hero
comes from page section props instead. The table is relinked and correct either way, but the slides
themselves are currently dead data. Worth a look from whoever owns the home page.

**5. A dev server on port 3141 was up at 18:04 and was down by 18:09.** It was not mine and I did
not target it — my kills matched `--port 3111` and `--port 3112` by PID. Flagging it only so the
pane that owned it is not surprised. One `pkill -f` early on did kill my own shell by self-match;
after that I killed by PID.

## Files changed

| file | state |
|---|---|
| `scripts/import-lovable-assets.ts` | new |
| `src/server/seed/media.ts` | modified, +77 −12 |
| `.work/j19-shots/` | new, 4 screenshots |
| `public/uploads/` | 59 files, 24MB, gitignored |

`src/components/Header.tsx`, `src/lib/header-defaults.ts`, `src/routes/$lang.search.tsx`,
`src/server/repo/search.ts` and `search.test.ts` are also dirty in the tree. Those are **J11's**,
not mine — no overlap with anything J19 touched.

Nothing committed, as instructed.

## What the script does

1. Reads all 59 `feedback/src/assets/**/*.asset.json` stubs, validating each is a v1 stub.
2. Skips any whose `original_filename` is already recorded against a media row — before fetching.
3. Fetches `https://kapecambodia.lovable.app` + the stub's `url`. 404 is recorded and skipped; a
   network failure halts the run and reports how many landed, rather than quietly finishing short.
4. Rejects any response whose byte length or content type disagrees with the stub. Nothing that
   fails verification is stored, and the run exits non-zero.
5. Stores through the app's own `saveUpload()` — R2 when configured, `public/uploads/` when not.
6. Inserts the `media` row plus its `original_filename` translation.
7. Relinks page section props and hero slides off placeholders, then clears `render_cache`.

The verification in steps 3-4 is the runnable check this logic leaves behind: run it against a
deployment serving a truncated or wrong-typed file and it fails loudly instead of storing it.

DONE J19
