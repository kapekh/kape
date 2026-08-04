# J19 — Bring the real imagery across

**Released.** The client's deployment is `https://kapecambodia.lovable.app`, and all 59 assets
were verified fetchable from it on 2026-08-04: every one returned 200 with a byte count matching
the `size` recorded in its `.asset.json`. 32 JPEG, 25 PNG, 1 WebP, 1 PDF. Re-checked at dispatch:
the root is 200 and `students.jpg` returns exactly its recorded 17029 bytes as `image/jpeg`.

## Why this is urgent rather than cosmetic

`feedback/` contains **no image binaries at all** — only 59 `.asset.json` stubs whose `url` is a
relative `/__l5e/...` path that only Lovable's own server resolves. Our 63 media rows are picsum
placeholders. So today neither side has real imagery, and that Lovable deployment is the single
place the client's actual photographs exist. If it is taken down, they are gone.

## Files you own

- `scripts/import-lovable-assets.ts` (new)
- `src/server/seed/media.ts` (post-J15)
- whatever the import writes into R2 or `public/uploads/`

## Do

1. Write a script that reads every `feedback/src/assets/**/*.asset.json`, fetches
   `https://kapecambodia.lovable.app` + its `url`, and stores it through the app's own
   `saveUpload()` so it lands in R2 when configured and `public/uploads/` when not. Do not invent
   a second storage path.
2. Verify each download against the stub's `size` and `content_type` before storing. A short read
   that gets saved anyway is worse than a failure.
3. Create a `media` row per asset, keyed so the seed can reference it by its original filename.
4. Replace the picsum placeholders in the seed with these media rows wherever the prototype used
   that asset. `createPicsumMedia` stays only where the client genuinely has no image.
5. The script must be re-runnable without duplicating media rows. `saveUpload` names every object
   with a fresh `crypto.randomUUID()`, so it gives you no idempotency — key the skip on the asset's
   `original_filename` (or `asset_id`) already being present in `media`, and check before you fetch.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing **16 of 16
across 5 files**. Do not trust an older contract's "3 of 3".

1. All 59 assets imported. Report the count, and every byte count matching its stub. Any mismatch
   is a fail, not a warning.
2. Files are served by our app, not hotlinked to `kapecambodia.lovable.app`. Grep the whole repo
   for that hostname and show it appears only in the import script.
3. Re-running the script does not create duplicate media rows. Run it twice and show the count.
4. A page that used a picsum placeholder now renders the client's real image. Screenshot before
   and after.
5. State how many picsum placeholders remain and which slots they fill.
6. The PDF is stored and downloadable, not treated as an image.
7. `bunx biome check` on your files: no new errors.

## Out of scope

Image optimisation, resizing, format conversion. Page copy (J16, J17). Deciding what a page shows.

## Stop conditions

- The deployment stops responding mid-import: stop and report how many landed. Do **not** fall
  back to placeholders silently — a half-imported set that looks complete is the worst outcome.
- An asset 404s: record it by filename and continue. Report the list.

## Traps in this repo, all paid for already

- **Never run against `kape.db`.** Copy it with `VACUUM INTO`, never `cp` — it is WAL-mode and a
  bare copy loses recent writes. Point `DATABASE_PATH` at the copy and prove `kape.db` is unchanged
  by md5 at the end.
- **`SSG_CACHE=off` for any verification run.** `resolveRouteCached` reads through a `render_cache`
  table with a 7-day TTL, so a page will keep serving picsum after your import lands and it looks
  like the change never happened. No error, no log line. This cost J14 forty minutes.
- **Export `PORT` to match `--port`.** SSR self-fetches tRPC at `http://localhost:${PORT ?? 3000}`;
  without it you either get a whole-page 500 or you silently measure another pane's database.
- Do not touch the worklog at `~/.claude/projects/.../worklog/`. Findings go in `.work/j19-report.md`;
  the orchestrator promotes them after verifying.
