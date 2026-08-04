# J10 — Map pin richness

Delta: D20. **Queued behind J02 and J09** — shares `src/server/schema.ts` and `drizzle/`.

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

1. `bun run test` passes, 3 of 3.
2. One additive migration, applied clean on a scratch DB copy. Paste the SQL.
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

- J02 or J09 has not landed: do not start.
- The project reference wants to be many-to-many: report it, do not decide alone.
