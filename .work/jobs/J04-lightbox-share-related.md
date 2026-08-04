# J04 — Lightbox, share, related content

Deltas: D05, D10, D11. Runs alongside J03 — disjoint files.

## Files you own

- `src/routes/$.tsx`
- `src/components/Lightbox.tsx` (new)
- `src/components/ShareButtons.tsx` (new)

## Do

1. **D10 — lightbox.** There is no full-screen image view anywhere: album grids
   (`src/routes/$.tsx:192-218`), article galleries (`$.tsx:174-187`) and the gallery section all
   cap out at thumbnails. Build one shared `Lightbox`: Esc to close, arrow keys for prev/next,
   caption, and an `i / N` counter. Reference behaviour is
   `feedback/src/components/PhotoAlbum.tsx` — read it, do not copy it. Photos are this site's
   primary asset, so this is the highest-value item in the job.
2. **D05 — share buttons.** Articles and impact stories have no share UI. Add Facebook and
   Telegram — that is how KAPE content actually circulates. Reference:
   `feedback/src/components/ShareButtons.tsx`.
3. **D11 — related content.** The article branch ends at the gallery (`$.tsx:163-190`), so every
   article is a dead end. Add a related-posts rail to article and story detail pages.

## Acceptance

1. `bun run test` passes, 3 of 3.
2. Lightbox works by **keyboard alone**: open, arrow through, Esc out. Screenshot it open. Focus
   must be trapped while open and returned to the trigger on close — this is an accessibility
   requirement, not a nicety, and it is not optional.
3. Lightbox is reachable from all three surfaces: album grid, article gallery, gallery section.
   Name the line in `$.tsx` for each.
4. Share links open the correct URL with the correct canonical address, including under `?lang=km`.
   Paste one generated URL per network.
5. Related rail shows real records and never shows the current article. Show the edge case of a
   post with no siblings.
6. `bunx biome check` on your three files: clean for the two new ones, no new errors in `$.tsx`.

## Out of scope

`SectionRenderer.tsx` (J03). Any server or schema change. Lightbox styling tokens — reuse what
`styles.css` already provides.

## Stop conditions

- Related posts need a query the repo layer does not expose: report it rather than writing raw SQL
  in a route.
