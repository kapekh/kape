# J05 — Announcement modal

Delta: D09.

## Files you own

- `src/components/AnnouncementPopup.tsx`
- `src/server/repo/site.ts`

## Do

Ours is a small toast, gated on scroll, showing one announcement — `site.ts:57-80` picks a single
row. Theirs (`feedback/src/routes/index.tsx:271-349`) is a centred modal that cycles every active
notice with a deadline chip, prev/next and an `N / M` counter.

This matters because KAPE routinely has several job and bidding deadlines open at once, and today
only the soonest one is ever seen.

1. Return all active announcements from `site.ts`, not one. Keep the existing deadline filter
   (`site.ts:62-69`) — auto-hide at deadline already works and must keep working.
2. Rebuild the popup as a modal with prev/next and a counter.
3. Keep a dismissal that survives a reload, and keep whatever the current show/hide trigger is
   unless the client's version clearly contradicts it.

## Acceptance

1. `bun run test` passes, 3 of 3.
2. With three active announcements seeded, all three are reachable and the counter reads `1 / 3`.
   Screenshot.
3. With one, no prev/next chrome appears. With zero, nothing renders at all. Show both.
4. An announcement past its deadline never appears. Show it — this is existing behaviour you must
   not regress.
5. Modal is dismissable by Esc and by an explicit close control, focus is trapped while open and
   restored on close. Accessibility requirement, not optional.
6. Dismissal persists across a reload.
7. `bunx biome check` on both files: no new errors.

## Out of scope

The homepage layout. Announcement authoring UI in admin. Any schema change.

## Stop conditions

- `site.ts`'s single-pick is depended on by another caller: find them first, and if changing the
  return shape breaks one, report before proceeding.
