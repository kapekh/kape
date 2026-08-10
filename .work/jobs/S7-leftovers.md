# S7 - the leftovers

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows.

This contract is written from UAT-B's census in `.work/UAT-A-report.md` and `.work/UAT-B-report.md`,
not from `.work/i18n/INVENTORY.md` alone. The inventory missed the largest item here entirely, so
where the two disagree, trust the census - it was measured in a browser.

## Files you own

- `src/components/KhmerCalendar.tsx` - the big one, and read the section below before you touch it
- `src/components/ShareButtons.tsx`
- `src/components/MapView.tsx` - the Leaflet controls only; S3 owns the rest and has finished
- `src/components/Dialogs.tsx`
- `src/components/AnnouncementPopup.tsx` and `src/components/Lightbox.tsx` - one skipped key each
- `src/routes/$.tsx` - the 404 branch only
- `src/routes/$lang.search.tsx` - the category labels only. **Check with the lead before opening
  this**: FIX-G is in this file for a different defect and may still be running.
- `src/lib/ui-strings/site.ts` - your dictionary module

## The Khmer calendar is 31 of your strings, and the answer is probably not 31 keys

`KhmerCalendar.tsx` sits in the footer of **every page** and hardcodes: `EN_MONTHS` (12, lines
22-34), `KM_MONTHS` (12, lines 3-14), `KM_WEEKDAYS` (7, line 37) and the Buddhist-era suffix `ព.ស.`
(line 104). Its heading and arrows are already wired.

**Try the stdlib before the dictionary.** `Intl.DateTimeFormat` with the page's language gives month
and weekday names in Khmer and English without a single key, and it gets the other languages a
future tenant adds for free - which 31 hand-typed keys never will. Look at what the component
actually needs before you decide.

Keys are the right answer only for what `Intl` genuinely cannot produce. `ព.ស.` is one candidate:
it is an era label, not a date part. The Buddhist-era **arithmetic** stays exactly as it is either
way - you are changing how a name is spelled, not how a date is computed. If `Intl` turns out not to
cover a case, say which case and fall back to keys for that one.

Whichever way you go, the footer calendar must render the same dates before and after. Show one
month in both languages, before and after, in the report.

## The rest

- **`ShareButtons.tsx`** - `Facebook` (29) and `Telegram` (32) are object literals in the `links`
  array. Two keys. Note in your report that an admin still cannot add, remove or reorder a network;
  that is a data-model change and not this round.
- **`MapView.tsx:142`** - Leaflet's own `Zoom in` / `Zoom out` on both `aria-label` and `title`,
  four call sites, two keys. The OpenStreetMap attribution stays in English: it is a legal notice
  with a required form, and the inventory already classifies it `leave`.
- **`Dialogs.tsx`** - the four defaults S2 skipped. The backdrop `aria-label="Cancel"` at 271 is
  **unconditional and reaches the public site today** through the rich-text answer field at
  `PublicRichText.tsx:84`; that one is a real leak, not a hypothetical. `cancelLabel ?? "Cancel"`
  (317) and `confirmLabel ?? (isPrompt ? "OK" : "Confirm")` (325) only fire when a caller passes no
  label. S2 skipped the last two as "admin-only" - they are defaults on a shared component, so key
  them.
- **`AnnouncementPopup.tsx:135`** - `announcement.deadlineOn`, which S2 skipped because wiring it
  orphans `announcement.deadline` in `site.ts`. You own `site.ts`, so you can do both halves: add
  the new key, wire it, delete the orphan. Same shape for **`Lightbox.tsx:136`**, `lightbox.viewNth`
  orphaning `lightbox.view`.
- **`$.tsx` 404 branch** - the Khmer 404 page is entirely English: "Page not found", "This page
  doesn't exist or was moved.", "← Back to home". Both languages also carry the generic site title
  rather than a not-found one. S1 owned this file and finished; the 404 branch is yours.
- **`$lang.search.tsx` category labels** - `PROJECTS`, `NEWS & EVENTS`, `PHOTO GALLERIES`,
  `PUBLICATIONS`, `VIDEOS`, `IMPACT STORIES`, `PAGE` render in English on `/km`, along with the
  result count and the empty state. Coordinate with the lead first; FIX-G may still hold this file.

## Not yours

`PDF` at `SectionRenderer.tsx:1484`. UAT-B lists it as hardcoded and S4 deliberately left it as a
format acronym. S4's call stands - `PDF` is the same in both languages. Do not re-litigate it, and
do not open `SectionRenderer.tsx`.

`AnnouncementPopup`, `Lightbox` and `PdfReader` are otherwise **fully wired already** - UAT-B
confirmed every string in all three resolves to a key. Do not re-do them; you have one skipped key
in each of the first two and nothing in the third.

## Acceptance

Everything in `SLICE-COMMON.md`. Round trip one of your own keys through `/admin/ui-strings` onto a
public page and back, screenshots into `.work/i18n/s7-shots/`. If you took the `Intl` route for the
calendar, that part has no key to round-trip: show the two languages rendering correctly instead,
and say so.

Report to `.work/S7-report.md`, with both counts - rows wired and keys added - and, for the
calendar, how many keys you avoided.
