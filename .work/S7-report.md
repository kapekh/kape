# S7 - the leftovers

**11 rows wired. 10 keys added, 2 deleted.** Dictionary 249 -> 257, no duplicates.
The calendar cost 1 key instead of 31; 12 of the other 30 went away entirely, 18 stay as
component data because Chrome ships no Khmer locale.

## Gates

```
$ bunx tsc --noEmit
(silent)

$ bun run test
 Test Files  42 passed (42)
      Tests  389 passed (389)

$ bun run lint
Checked 286 files in 173ms. No fixes applied.
Found 8 errors.
```

The 8 are the known `noArrayIndexKey` sites in CampaignForm, FormBuilder, ProjectForm,
SectionsBuilder and admin.footer. None of them is a file I opened.

## The calendar

`Intl.DateTimeFormat` is the right answer for half of it and cannot do the other half, and the
reason is not what the contract expected.

**Chrome carries no `km` locale data.** `Intl.DateTimeFormat.supportedLocalesOf(["km"])` returns
`[]` in Chrome 149, in the system Chromium and in Brave; a Khmer request silently resolves to
`en-US`, so `new Intl.DateTimeFormat("km", { month: "long" })` formats August as "August". The
first version of this change used Intl for the Khmer month name and the footer rendered
`ខែAugust ឆ្នាំ ២៥៦៩ ព.ស.` in both languages. Bun's JSC does have `km`, so this is invisible to a
test run and only shows up in a browser. Measured:

```
chromium --headless --dump-dom "…supportedLocalesOf(['km'])…"  ->  {"s":[],"m":"August"}
brave    --headless --dump-dom "…"                             ->  {"s":[],"m":"August"}
in-page (Chrome 149): supportedLocalesOf(['km','km-KH','th','fr','vi']) -> ["th","fr","vi"]
```

So:

| the 31 | what happened | keys |
|---|---|---|
| `EN_MONTHS` (12) | deleted, `Intl.DateTimeFormat([lang, "en"])` | 0 |
| `KM_MONTHS` (12) | stay as the component's data - Intl answers in English | 0 |
| `KM_WEEKDAYS` (7) | stay - no `km` data, and the CLDR narrow set collides three times (អ/អ, ព/ព, ស/ស) | 0 |
| `ខែ … ឆ្នាំ … ព.ស.` | one interpolated key, `calendar.buddhistDate` | 1 |

**30 keys avoided.** The era suffix did not need a key of its own: the whole Khmer headline is one
`t("calendar.buddhistDate", "ខែ{month} ឆ្នាំ {year} ព.ស.", { month, year })`, so a tenant who is not
Cambodian rewrites the particles, the word order and the era in one field instead of four.

The Gregorian sub-line asks for `[lang, "en"]` rather than `lang`: with a bare unsupported tag Intl
falls back to *the browser's* locale, so a French visitor reading the Khmer site would have got
"août 2026". With "en" behind it, an unsupported language lands on English - exactly what the
deleted `EN_MONTHS` did.

Buddhist-era arithmetic, Khmer digits, the day grid and `startDow` are untouched.

### Same dates before and after

`.work/i18n/s7-shots/calendar-{en,km}-{before,after}.png`, taken on `/en/contact` and `/km/contact`
against HEAD's file and against mine. Both languages render `ខែសីហា ឆ្នាំ ២៥៦៩ ព.ស.` over
`August 2026` over `អា ច អ ព ព្រ សុ ស`, with 10 August highlighted, before and after.

All twelve months checked in the live page, not just the current one:

```js
// in Chrome 149, on the running site
EN.every((m, i) => new Intl.DateTimeFormat([lang,"en"],{month:"long",year:"numeric"})
                    .format(new Date(2026,i,1)) === `${EN[i]} 2026`)
lang="en" -> true      lang="km" -> true
```

## Rows

| file | row | key | state |
|---|---|---|---|
| KhmerCalendar.tsx | `EN_MONTHS` 22-35 | - | code fix, `Intl` |
| KhmerCalendar.tsx | `ខែ… ឆ្នាំ… ព.ស.` 103 | `calendar.buddhistDate` | wired |
| KhmerCalendar.tsx | `KM_MONTHS`, `KM_WEEKDAYS` | - | left as data, reason above |
| ShareButtons.tsx | `Facebook` 29 | `share.facebook` | wired |
| ShareButtons.tsx | `Telegram` 32 | `share.telegram` | wired |
| MapView.tsx | Leaflet `Zoom in` (title + aria-label) | `map.zoomIn` | wired |
| MapView.tsx | Leaflet `Zoom out` (title + aria-label) | `map.zoomOut` | wired |
| MapView.tsx | OpenStreetMap attribution | - | leave, legal notice |
| Dialogs.tsx | backdrop `aria-label="Cancel"` 273 | `dialog.dismiss` | wired, **not yet editable - see below** |
| Dialogs.tsx | `cancelLabel ?? "Cancel"` 317 | `dialog.cancel` (nav.ts) | wired, same caveat |
| Dialogs.tsx | `"OK"` 325 | `dialog.ok` | wired, same caveat |
| Dialogs.tsx | `"Confirm"` 325 | `dialog.confirm` | wired, same caveat |
| AnnouncementPopup.tsx | 135 | `announcement.deadlineOn` | wired, `announcement.deadline` deleted |
| Lightbox.tsx | 136 | `lightbox.viewNth` | wired, `lightbox.view` deleted |
| $.tsx | 404 branch | `error.notfound.*`, `nav.backHome` | already wired by S1 |
| $.tsx | 404 `<title>` | - | skipped, reason below |
| $lang.search.tsx | category labels, count, empty state | `collection.*`, `search.*` | already wired by FIX-G |

11 rows wired, 11 of 11 accounted for. `dialog.cancel` was already defined in `nav.ts`, so it is
reused rather than redefined - 10 new keys in `site.ts`, which now holds 33.

## What I saw in the browser

Own dev server on **:3031** against `.work/scratch/s7.db` (a `VACUUM INTO` copy). `kape.db` and
`.work/uat/uat.db` untouched, no writing git command run.

**Round trip** - `/admin/ui-strings`, `calendar.buddhistDate` English set to
`ខែ{month} ឆ្នាំ {year} ព.ស. ★S7`, then reset:

- `.work/i18n/s7-shots/roundtrip-1-edited.png` - `/km/contact` footer reads
  `ខែសីហា ឆ្នាំ ២៥៦៩ ព.ស. ★S7`
- `.work/i18n/s7-shots/roundtrip-2-reset.png` - same footer back to `ខែសីហា ឆ្នាំ ២៥៦៩ ព.ស.`
- `select count(*) from ui_strings where key='calendar.buddhistDate'` -> 0 afterwards

Everything else exercised on the real page:

- **Map** - `map.zoomIn` set to `Zoom in ★S7` in the admin; `/en/contact` then reported
  `["Zoom in ★S7 / Zoom in ★S7", "Zoom out / Zoom out"]` for `title / aria-label` on the two
  Leaflet buttons. Reset afterwards. Leaflet writes both attributes from one option, so the four
  call sites are two keys.
- **Announcement** - the live popup on `/km` renders `⏳ Deadline 2026-12-15`, one string with the
  date in a slot.
- **Lightbox** - every seeded photo has a caption, so I deleted one photo's caption rows in my
  scratch DB and `/km/galleries/album-library-launch` then reported
  `aria-label="View photo 2 of 3"`. Both slots fill.
- **Share** - `Facebook` / `Telegram` render from the dictionary on `/km/news/ngs-ict-lab-opens`.
- **404** - `/km/this-page-does-not-exist` returns 404 and renders `Not found / Page not found /
  This page doesn't exist or was moved.` from `error.notfound.*`. Nothing hardcoded left; the
  English on `/km` is a missing translation, not a missing key.
- **Search** - `/km/search?q=ICT` shows `6 results` and `VIDEOS` from `search.summary` and
  `collection.videos`. FIX-G finished this file; I changed nothing in it.

## Handbacks

**1. `Dialogs.tsx`'s four keys do not reach the dictionary yet, and it is a one-line fix I did not
make because the file is not mine.** `<DialogHost />` is mounted in `RootDocument`
(`src/routes/__root.tsx:210`), which is the router's `shellComponent`. `LanguageProvider` is
mounted in `RootComponent`, which is the `{children}` that shell renders. DialogHost is therefore a
*sibling* of the provider, `useT()` inside it hits the null-context branch (`i18n.tsx:80`) and every
key resolves to its English fallback for ever. Measured: with `dialog.confirm` overridden to
`Confirm ★S7` in the DB, a confirm dialog still renders `Confirm`.

The wiring is in and harmless (identical English on screen today), but an admin editing those four
keys sees nothing change until this moves:

```diff
--- a/src/routes/__root.tsx
@@ RootComponent
 			{!chromeless && <Footer settings={settings} />}
+			<DialogHost />
 		</LanguageProvider>
@@ RootDocument
 				{children}
-				<DialogHost />
```

Nothing in `RootError` / `RootNotFound` opens a dialog or raises a toast, so the shell loses
nothing. This is the same defect the inventory records for `RootError`/`RootNotFound`
(`INVENTORY.md`, "Not a key", item 1); it just was not noticed that DialogHost sits there too.

**2. Two keys' Khmer is carried, not invented, and it is in `site.ts` where the rule says English
only.** `announcement.deadlineOn` ships `km: "ថ្ងៃផុតកំណត់ {date}"` and `lightbox.viewNth` ships
`km: "មើលរូបភាព {n} / {total}"`. Both are the exact Khmer of the keys they replace, with the number
moved into a slot - byte-identical output to what the Khmer site renders today. Without them,
renaming the key silently drops a Khmer site back to English. Nothing was translated; if you would
rather the rule held literally, delete the two `km` lines and the strings fall back to English.
Every genuinely new key (`calendar.buddhistDate`, `dialog.*`, `map.zoom*`, `share.*`) is English
only. `calendar.buddhistDate`'s English *is* Khmer, for the same reason `footer.calendar`'s is: the
default has to render what the widget renders today.

**3. Two dead keys left in the example fixture.** `src/server/seed/ui-strings.kape.ts:202` and
`:208` still seed `announcement.deadline` and `lightbox.view`, which no component reads any more.
The fixture is exempt from both dictionary tests so nothing fails; the rows are simply inert in the
KAPE database. That file is not in my list, so I left it. Deleting those two lines finishes it.

**4. A 404's `<title>` still carries the site name.** `$.tsx`'s `head()` returns `{}` when
`loaderData` is undefined, and the comment there explains why: a thrown `notFound()` leaves no
`settings` to build a title from. `head()` also runs outside the language provider, so there is no
`t` to reach. Naming a 404 needs the provider to move up or the strings to be passed in - the same
architectural change as handback 1, not a key. Left as it stands.

## Notes for the round

- A new key reaches an *existing* site only once someone edits it: `bootstrapI18n` builds the
  runtime dictionary from `ui_strings` rows alone, and shipped defaults enter that table through
  `install.ts`. So on the UAT database every key added this round renders its in-code English
  fallback until an admin types a value, while a fresh install seeds the Khmer. That is true of
  every slice, not just this one, and it is worth saying to whoever runs acceptance.
- `ShareButtons` is keyed but an admin still cannot add, remove or reorder a network - the two
  links are an array in the component. That is a data-model change, not this round.
- `PDF` at `SectionRenderer.tsx:1484` untouched, as instructed. S4's call stands.
