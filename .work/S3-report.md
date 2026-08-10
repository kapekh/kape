# S3 - forms, contact and the map

31 of 31 `new-key` rows wired, none skipped. 28 new keys in `src/lib/ui-strings/forms.ts` (31 total
with the three that were already there). Gates green. The round trip works in a browser, twice: the
page heading and, separately, the `<title>`, which needed a different route through the loader.

## Gates

```
$ bunx tsc --noEmit
(silent)

$ bun run lint
Found 8 errors.          # the known noArrayIndexKey sites; no warnings

$ bun run test
 Test Files  38 passed (38)
      Tests  370 passed (370)
```

The bar was 333 over 33 files. The tree was already at 370/38 when I started, and it still is.
`no-brand.test.ts` and all three `dictionary.test.ts` cases pass.

## Every row

| file | line | key | |
|---|---|---|---|
| `$lang.contact.tsx` | 28 | `contact.metaTitle` | wired |
| | 31 | `contact.metaDescription` | wired |
| | 54 | `contact.title` | wired |
| | 55 | `contact.lead` | wired |
| | 56 | `contact.badge` | wired |
| | 61 | `contact.form.title` | wired |
| | 63 | `contact.form.note` | wired |
| | 70 | `contact.hq` | wired |
| | 74 | `contact.address` | wired |
| | 80 | `contact.phone` | wired |
| | 91 | `contact.email` | wired |
| | 118 | `contact.provincial` | wired |
| | 137 | `contact.phone` | wired (reuse) |
| | 148 | `contact.email` | wired (reuse) |
| `ContactForm.tsx` | 53 | `contact.form.sent` | wired |
| | 78/85 | `forms.name` | wired |
| | 94/101 | `forms.email` | wired |
| | 110/116 | `forms.phoneOptional` | wired |
| | 124/131 | `forms.message` | wired |
| | 135 | `error.generic` | wired |
| `FormRenderer.tsx` | 49 | `common.loading` | wired |
| | 58 | `forms.closed` | wired |
| | 87 | `forms.sent` | wired |
| | 97 | `forms.fileTooLarge` | wired |
| | 125 | `error.generic` | wired |
| | 129 | `error.networkConnection` | wired |
| | 230 | `forms.fileHint` | wired |
| | 259 | `forms.select` | wired |
| | 362 | `forms.closesOn` | wired |
| `MapView.tsx` | 44 | `map.past`, `map.current` | wired |
| | 64 | `map.viewProject` | wired |

31 rows in the inventory for my four files, 31 wired, 0 skipped.

The `leave` and `content` rows stayed as the inventory classified them: the `toLocaleDateString`
month name, the ` *` required marker, `{sec.number}.`, every `labelOf(f)` and `f.placeholder`, and
the OpenStreetMap attribution at `MapView.tsx:109`.

## Two decisions worth naming

**`forms.email` belongs to slice 1, not to me.** By the time I wired `ContactForm.tsx`, `pages.ts`
had landed with `forms.email`, `forms.emailPlaceholder` and `forms.password` for the sign-in form.
Defining it again failed the dictionary test:

```
AssertionError: expected { 'forms.email': [ 'forms', 'pages' ] } to deeply equal {}
```

So the contact form reads slice 1's definition and my module does not carry the key. Same shape as
`forms.message` running the other way, and I did not open `pages.ts` to check anything but that.

**`forms.yourName` and `forms.emailPlaceholder` are not in my module.** The job file says all three
of the keys `SectionRenderer.tsx` shares with me have a reader inside my files the day I land. Only
`forms.message` does - the other two are read at `SectionRenderer.tsx:1015/1021`, which is S4's file
and still hardcoded. Seeding either one fails the same test that guards a key nothing renders:

```
$ # forms.yourName temporarily added to forms.ts
AssertionError: expected [ 'forms.yourName' ] to deeply equal []
```

`forms.emailPlaceholder` is moot in any case - slice 1 defines it. `forms.yourName` is S4's to add
in the change that wires it.

## The meta title needed a different route

`head()` runs outside the `LanguageProvider`, so there is no `t()` to call there. Rather than reach
into `src/lib/i18n.tsx`, the contact route's loader pulls `i18n.bootstrap` (already in the query
cache from the root loader, so no extra request) and hands `head()` the two resolved strings. The
`{site}` slot is filled there against `siteShortName(settings)`.

The loader's three `ensureQueryData` calls now run in parallel rather than chained, which is what
made room for the third without another await level.

## English I changed, and why

One, from `keys.proposed.ts`: the head office block rendered **`Telephone:`** and the provincial
cards rendered **`Phone:`**. The inventory's row for line 80 says "reused by line 137; one key, not
two", and `keys.proposed.ts` gives `contact.phone` as `Phone:`. So the head office block now says
`Phone:`. That is a visible copy change on the contact page - the only one in this slice.

`10 MB` is no longer written into English. `forms.fileHint` and `forms.fileTooLarge` take `{max}`,
which `FormRenderer.tsx` derives from `ATTACHMENT_MAX_BYTES`; raising the constant now moves both
strings.

Nothing I seeded names an organisation, a country or a sector. `contact.metaDescription` ("Reach our
head office and regional teams.") is the most specific string in the set and holds for any site with
more than one office.

## No Khmer

The 28 new keys ship English only. The three that were already in the module keep their Khmer.

## Every call site carries its English fallback

`t("contact.title", "Contact Us")`, not `t("contact.title")`. This matches every existing call site
in the repo and slice 1's `$.tsx`, and it is load-bearing: UI strings are read from the `ui_strings`
table at runtime, and `install.ts` only ever writes the defaults on a **fresh** install. There is no
upgrade path that inserts newly shipped keys into an existing database. Wired without fallbacks, the
contact page renders the raw key names on any site installed before this release - which is exactly
what it did here before I added them:

```
$ curl -s http://localhost:3011/en/contact | grep -ao 'contact\.[a-z.]*' | sort -u
contact.address  contact.badge  contact.email  contact.form.note  contact.form.title
contact.hq  contact.lead  contact.phone  contact.provincial  contact.title
```

**That gap is the round's, not this slice's, and somebody should own it.** Every key any slice adds
this round is invisible on an upgraded site until something seeds it. The fallbacks make the page
correct meanwhile; they do not make the key editable on a site whose table lacks the row. The editor
does, because `listUiStrings` lists the union of shipped defaults and stored rows - which is why the
round trip below works against a database that has never seen these keys.

## The round trip

Dev server already on `http://localhost:3011`; I started nothing. Logged in at `/login` as
`admin@kapekh.org`.

**Before** - `.work/i18n/s3-shots/01-before-original.png`

```json
{ "url": "/en/contact", "title": "Contact KAPE", "h1": "Contact Us",
  "h2s": ["Send us a message", "Head office", "Provincial offices"],
  "labels": ["Full name", "Email", "Phone (optional)", "Message"],
  "lead": "Get in touch with KAPE at our head office or any of our regional teams.",
  "hq": ["Address: National Road 7, Kampong Cham Town", "Phone: 042-941-481", "Email: kape@kapekh.org"] }
```

**Changed** `contact.title` in `/admin/ui-strings` to `Talk to us (S3 round trip)`, reloaded
`/en/contact` - `.work/i18n/s3-shots/02-after-edit.png`

```json
{ "h1": "Talk to us (S3 round trip)" }
```

**Reset** it from the same row, reloaded - `.work/i18n/s3-shots/03-after-reset.png`

```json
{ "toast": "contact.title in English is back to its default.", "h1": "Contact Us" }
```

### A second one, because the `<title>` takes the other path

The heading proves `useT()`. It does not prove the loader route the meta strings take, so
`contact.metaTitle` got its own trip: set to `Reach {site} (S3 meta probe)`, which is also the only
check that the `{site}` slot survives the trip through the loader.

```
$ curl -s http://localhost:3011/en/contact | grep -ao '<title>[^<]*'
<title>Reach KAPE (S3 meta probe)
```

Server-rendered, so this is the loader's value and not a client patch. Reset:

```json
{ "toast": "contact.metaTitle in English is back to its default.", "title": "Contact KAPE" }
```

Neither probe survives in the database:

```
$ sqlite3 .work/scratch/uitest.db \
  "select key,lang,value from ui_strings where key like 'contact.%' or key like 'map.%' \
   or key like 'forms.%' or key='common.loading' or key like 'error.%';"
forms.send|en|Send message
forms.send|km|ផ្ញើសារ
forms.sending|en|Sending…
forms.sending|km|កំពុងផ្ញើ…
forms.submit|en|Submit
forms.submit|km|ដាក់ស្នើ
```

Those three rows predate this job. `kape.db` in the repo root was never opened.

## What I could not put on screen

Wired, type-checked and reachable from the editor, but not rendered during this session because the
fixture has no data that reaches them:

- **`map.past`, `map.current`, `map.viewProject`.** The popup builds - I clicked a pin on
  `/en/contact` and got `"Head Office (PTTC)"` back from `.leaflet-popup-content`, which is the
  threaded `t` running inside a `document.createElement` tree with no hook in scope. But office
  markers carry no `status` and no `href`, so those three branches never execute. The fixture's
  `project_locations` table is empty, which is the only source of a marker that has them.
- **Every `FormRenderer.tsx` key.** The `forms` table in the scratch database has no rows, so no
  public page mounts the component at all. Creating one would have written shared fixture data that
  three panes are reading right now.

Both need a fixture row rather than a code change. Worth a line in whatever pass seeds the example
site.

## Grep, for what was left behind

```
$ grep -nE 'placeholder="|title="|alt="|aria-label="' <my four files>
src/components/MapView.tsx:26:  <img src="${logo}" alt="" …/>     # decorative pin image, empty alt

$ grep -nE '>[A-Za-z][A-Za-z ,.!?'"'"'—…:()-]{2,}<|"[A-Z][a-z]+ [a-z]' <my four files>
src/components/ContactForm.tsx:143:   : t("forms.send", "Send message")}
src/routes/$lang.contact.tsx:51:      "Reach our head office and regional teams.",
```

Both hits are fallback arguments, not strings in a text position. Nothing else remains.

## Files

```
 src/components/ContactForm.tsx  | 23 ++++++-----
 src/components/FormRenderer.tsx | 43 ++++++++++++-----
 src/components/MapView.tsx      | 17 ++++---
 src/routes/$lang.contact.tsx    | 85 ++++++++++++++++++++++++++-----------
 src/lib/ui-strings/forms.ts     | (rewritten, 3 keys -> 31)
```

I opened nothing else. `Header.tsx`, `Footer.tsx`, `Dialogs.tsx`, `nav.ts`, `site.ts`, `sections.ts`
and `SectionRenderer.tsx` were never touched, and no `git` command that writes was run.

Next: S4 adds `forms.yourName` in the change that wires `SectionRenderer.tsx:1015`, and reads
`forms.message` and `forms.emailPlaceholder` where they already live.
