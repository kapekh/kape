# J10 — Map pin richness

Delta: D20. J02 (`60ac37f`) and J09 (`4566c2b`) have both landed, so the `schema.ts` + `drizzle/`
lane is yours and you are the only job in it. Yours is migration `0016`.

Read `.work/BACKLOG.md`'s **Rules** section first. Two matter more for you than for anyone else:
**a dev server migrates whatever database it points at, by itself** — `db.ts` runs `migrate()` on
boot and vite restarts the SSR module on any file change, so the mere existence of your new
`drizzle/*.sql` is enough. Export `DATABASE_PATH` to a `VACUUM INTO` scratch copy before you
generate anything. Three content jobs are running beside you on their own scratch copies; your
migration is additive, so it will not break them, but `kape.db` must come through untouched. Also
export `SSG_CACHE=off` or `render_cache` will replay stale HTML at you. Do not touch git, and do
not touch the shared worklog.

## Files you own

- `src/components/MapView.tsx`
- `src/server/schema.ts`
- `drizzle/` (one migration)
- the project-locations repo module

## Do

Our pins are default Leaflet markers with a text popup (`MapView.tsx:44-57`), and
`project_locations` (`schema.ts:643-651`) carries no photo and no link to the project. The
"where we work" map is the About page's centrepiece and is currently a dead end — you can see a
dot, you cannot get anywhere from it.

Theirs (`feedback/src/components/KapeMap.tsx`) has a branded pin, a photo card, a current/past
status tag, and a link through to the project.

1. Add photo and a project reference to the location record.
2. Branded pin marker instead of the Leaflet default.
3. Popup becomes a card: photo, status tag, link to the project page.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors.** It passes clean on `main` as of
`ba0c534`, so any type error during your run is yours.

1. `bun run test` passes, 10 of 10.
2. One additive migration, applied clean on a scratch copy made with `VACUUM INTO` — `kape.db` is
   in WAL mode and a bare `cp` silently loses recent writes. Paste the SQL. `bun run db:migrate`
   works as of `0784475`, contrary to an earlier version of this contract.
3. Every pin's link resolves to a real project page — click through all of them and report the
   count. A pin linking to a 404 is a fail.
4. A location with no photo and no project still renders a working pin. Show it.
5. Map still works with JavaScript-heavy SSR intact — the page must not blank out. Check the About
   page loads server-side.
6. Marker assets are self-hosted, not hotlinked from the prototype's Lovable bucket.
7. `bunx biome check` on your files: no new errors.

## Out of scope

Project metadata fields (J09). Adding new offices or locations as content.

## Stop conditions

- The project reference wants to be many-to-many: report it, do not decide alone.
