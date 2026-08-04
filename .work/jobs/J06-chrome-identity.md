# J06 — Chrome and Khmer identity

Deltas: D22, D23, D24, D25. Small, entirely visual, high client visibility. Good first job.

## Scope

Four things the client changed by hand in their prototype, which says they care about them.

## Files you own

- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/styles.css`
- `src/components/KhmerCalendar.tsx` (new)

## Do

1. **D23 — Khmer font.** They moved to Battambang: `feedback/src/styles.css:62-64` puts it first in
   the display, sans and khmer stacks. Ours is `--font-khmer: "Noto Serif Khmer", serif`
   (`src/styles.css:111`). Match their stacks. Confirm the webfont is actually loaded, not just
   named — a font that falls back silently is a fail.
2. **D24 — staff entry and wordmark.** Their top bar carries a Login pill and a full-width
   wordmark lockup. Ours (`src/components/Header.tsx:319-330`) has contact, search, sitemap, lang
   and theme, and no way in for staff. Add a staff login entry pointing at the existing admin
   login. Do not invent a new auth route.
3. **D25 — month visit counter.** Footer shows Today and Total (`src/components/Footer.tsx:166`);
   they show Today, This Month, Total. The `visitor_daily` table already holds what you need —
   read it, do not add a column. If a month figure genuinely cannot be derived, stop and report.
4. **D22 — Khmer calendar.** Port `feedback/src/components/KhmerCalendar.tsx` (Buddhist-era year,
   Khmer numerals) into the footer. Rewrite it to our conventions; do not copy the file across.

## Acceptance

1. `bun run test` passes, 3 of 3.
2. `bun run dev` renders, and you have looked at the header and footer in both `?lang=en` and
   `?lang=km`. Screenshot both.
3. The Khmer font visibly changes on a Khmer page. A diff in `styles.css` alone is not evidence.
4. Month counter matches a figure you computed by hand from `visitor_daily`. Show both numbers.
5. Login entry reaches the real admin login and does not 404.
6. `bunx biome check` on your four files: no new errors.
7. Dark theme still correct — `src/styles.css` carries a real dark theme the prototype lacks, so
   check you did not regress it.

## Out of scope

The search input's behaviour (that is J11 — the entry point may exist, it just need not work).
Nav structure. Any server or schema change.

## Stop conditions

- Battambang is not available as a self-hosted or linked webfont: report before adding a new
  network dependency.
- The month figure needs a schema change: stop, that is J09's territory.
