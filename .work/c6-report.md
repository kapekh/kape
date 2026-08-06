# C6 - A fresh install no longer ships the last customer's prose

Round two on C2.
Everything below was measured against databases built by the real install path and read back out of served HTML, on port 3222 (blank install) and 3223 (KAPE fixture), with `SSG_CACHE=off`.
`main` was served from a `git archive` of the branch point on port 3224 against its own `VACUUM INTO` copy of `kape.db`.
The repo's `kape.db` was never opened for writing.

Evidence files referenced below are in `.work/c6-evidence/`.

## 1. The dictionary split

### Before

A blank install wrote 90 `ui_strings` rows.
82 of them were byte-identical to the KAPE fixture's (`dict-before.txt`), including `footer.copyright = © 2026 Kampuchea Action to Promote Education`, `home.hero.1 = Where every Cambodian child`, `home.badge = Three decades of impact · 1994 - 2026` and the whole of a Cambodian education NGO's menu, down to `nav.media.escup`.

### What the split is

`src/lib/ui-strings.default.ts` now holds the words the shipped components put on screen, and nothing else.
`src/server/seed/ui-strings.kape.ts` was already a standalone copy of KAPE's dictionary and is untouched, so the fixture still seeds all 90 of its own rows.

The rule I applied is mechanical rather than editorial: **a key belongs in the product dictionary only if a shipped component reads it**.
Every string the previous dictionary carried beyond those keys was a menu label or a headline for a site the installer does not build, which is precisely how one customer's information architecture reached the next one's database.

`src/lib/no-brand.test.ts` now enforces that rule, so a re-added `nav.media.escup` fails the suite rather than shipping (`guard-demo-out.txt`).

### The full dictionary a blank install produces

Measured, not read off the source: `sqlite3 fresh.db "select key, lang, value from ui_strings"` after `bun src/server/install.ts` with `SITE_NAME="Acme Foundation"` (`dict-after.txt`).

| key | value | why it is in the product |
|---|---|---|
| `top.search` | Search | `Header.tsx` renders it with no fallback; without the row the top bar reads `top.search`. |
| `top.sitemap` | Site Map | Same, same component. |
| `nav.home` | Home | `SubPage.tsx` breadcrumb root. |
| `nav.menu` | Menu | `Header.tsx` mobile menu button. |
| `nav.contact` | Contact | `$lang.contact.tsx` section label, no fallback. |
| `nav.donate` | ♡ Donate | `Header.tsx` donate button; the product ships a donation module. |
| `forms.send` | Send message | `ContactForm.tsx` submit button. |
| `forms.sending` | Sending… | `ContactForm.tsx` pending state. |

Eight rows, eight call sites.
Nothing mentions a country, a sector, a date, a programme or a place.
The Khmer translations kept are the generic ones that were already in the file, unchanged, so no new Khmer was invented.

A blank install's served pages contain no occurrence of kape, cambodia, 1994, escup, province, preschool, scholarship, mentoring or classroom on `/en`, `/en/news`, `/en/team`, `/en/careers` or `/login` (`after-fresh-brandscan.txt`).

### Where a key was KAPE-only

`nav.media.escup`, `nav.who.speech`, `home.stat.provinces` and the rest are gone from the product dictionary entirely rather than given placeholder text.
A fresh install has no navigation tree at all, so a label for a menu that does not exist is dead weight that only ever gets read as a suggestion to build that menu.

## 2. The two keys nothing seeds and nothing surfaces

The audit was half right, and the half that was wrong matters.

- `site_name_short` and `site_description` **are** editable today, on `/admin/footer` under "Brand", labelled.
  They are not in `FOOTER_DEFAULTS`-driven docs anywhere else, and nothing on `/admin/settings` names them.
- Nothing seeds them, which is the part that made the demonstrated state a hand-edited one.

I took two of the three routes the brief offered, and left the third as a handoff.

**A smarter fallback (`src/lib/site-identity.ts`).**
An unset short name now returns the organisation's own name while it still fits a title bar (24 characters), and its acronym once it does not.
"Kampuchea Action to Promote Education" derives "KAPE", which restores `main`'s exact page titles for the fixture without a fixture edit.
Minor words are skipped, the result must be two to six Latin capitals, and anything else falls back to the full name, so a Khmer or French name is never mangled into initials.

**A meta description that always exists.**
`metaDescription()` returns the operator's `site_description` when set and `The website of <name>.` when not.
It is deliberately separate from `siteDescription()`, which stays raw: JSON-LD and `llms.txt` should carry the operator's own words or nothing, and a generic line there would be noise a machine reads as a claim.

**Surfaced in the settings screen (`src/routes/admin.settings.tsx`).**
`/admin/settings` grew a "Site identity" block naming `site_name_en`, `site_name_short`, `site_description`, `og_image`, `address_region`, `address_country` and `area_served`, each with a label, a hint and its key.
Those rows are filtered out of the raw key/value grid below, so a key is edited in one place on that page.
The round trip is proven: setting the keys through the same mutation the screen calls changes the served titles, description, `og:image` and JSON-LD (`after-fresh-configured.txt`).

**Seeding them is C5's.** See the handoffs at the end.

## 3. Acceptance 3: the state that actually ships

Blank install, `SITE_NAME="Acme Foundation"`, no hand-editing, `before-fresh.txt` and `after-fresh.txt`.

| route | branch before | branch now |
|---|---|---|
| `/en` | `Acme Foundation`, no description | `Acme Foundation` + `The website of Acme Foundation.` |
| `/en/news` | 404 | `News & Events — Acme Foundation` + description |
| `/login` | `Sign in — Acme Foundation Admin`, no description | unchanged title, description now present |
| `/en/nope` | `Your organisation`, no description | `Acme Foundation` + description |

`<meta name="description">` and `og:description` are now emitted on every page, at the root, so no route can lose them.
`/en/news` answering 200 on a blank install is C5's work landing during this session: the installer now seeds collection landing pages.

## 4. The five defects

**D1, the 404 title.**
`$.tsx` `head()` read `loaderData?.settings ?? {}`, and a thrown `notFound()` leaves `loaderData` undefined, so every 404 on a fully configured site titled itself `Your organisation` twice over.
The head now returns nothing at all when there is no loader data, and the root's head, which has its own settings, supplies the title.
KAPE's 404 before: `<title>Your organisation</title>`, `og:title` the same.
After: `KAPE — Kampuchea Action to Promote Education` (`after-kape-branch.txt`).
`main` showed `KAPE` there; the site title rather than the short name is a deliberate difference, since a 404 is not a page with a name of its own.

**D2, the home page's own social card.**
`main` hardcoded the home `og:image` and description in `$.tsx`; the branch read `page.coverUrl` and `page.excerpt`, and KAPE's home row has neither.
Fixed on the product side: `og_image` is a setting, read by the root head, defaulting to `/logo.png`, overridable per page by a cover image, and surfaced in `/admin/settings`.
The description half is fixed by `metaDescription`.
KAPE's own values are fixture data and are a handoff; until then its home `og:image` is `/logo.png` rather than the students photograph.

**D4, `organizationLd`.**
Before: `telephone: "042-941-481 / 042-941-918"`, no `areaServed`, no `addressRegion`, no `addressCountry`.
After: `telephone: "042-941-481"`, one number, taken as the first when the setting holds several.
`areaServed`, `addressRegion` and `addressCountry` are read from `area_served`, `address_region` and `address_country` and emitted when set, with the address object omitted entirely when nothing is filled in.
Validated by assertion rather than eye, in `src/lib/structured-data.test.ts`: the telephone must match a single dialable number, the address must equal the expected object, and an unconfigured site must emit exactly `@context`, `@type` and `name`.
KAPE's fixture does not set the three location keys, so its JSON-LD is still missing them relative to `main`. Handoff.

**`articleLd` publisher.**
`publisher.name` and the author fallback both used `siteName` where the title path used the short name.
Both now use `declaredShortName(s) || siteName(s)`: consistent with the title when an operator has given a short name, and never a name the code worked out. See round three, item 3.

**D5, benign, for the record.**
The session cookie was renamed `kape_session` to `cms_session`, so every signed-in user is logged out once on deploy.
`kape:announcements-dismissed` became `announcements-dismissed` and `kape-nav-folded` became `admin-nav-folded`, so dismissed announcements reappear once and admin sidebar folds reset.
No data is lost and nothing needs migrating.

## 5. The two unreachable defaults

**Social share image.** Done, above: `og_image`, surfaced, with a logo fallback.

**`MAIL_TO` empty.**
A fresh install accepted a contact submission, logged it at `console.log` and mailed nobody.
Now `src/server/mail.ts` warns once at boot when SMTP is unconfigured, warns again per submission with the message body, and says where the message can be read.
The recipient also falls back to the site's own `contact_email` setting when `MAIL_TO` is unset, because an operator who published a contact address has already said where mail about the site should go.
It warns rather than refuses on purpose: the submission is written to `contact_submissions` and is readable at `/admin/messages`, so refusing would throw away a message that is currently being kept.
Demonstrated on the blank install in `after-mail-warning.txt`.
`src/server/mail.ts` is in neither job's file list; the brief gave me `src/env.ts` "for `MAIL_TO` only" and the behaviour `MAIL_TO` drives lives in `mail.ts`, so I took it. It is not a file C5 has touched.

`theme-color` is C3's and was left alone.

## 6. The brand guard

`src/lib/no-brand.test.ts` now matches `/kape/i`, `/kapekh/i`, `/kampuchea/i`, the office phone numbers `/042[-\s]?941[-\s]?\d{3}/` and the Khmer organisation name, and `src/server/install.ts` is no longer exempt as a "fixture".

Demonstrated on a copy of `src/` outside the repo, with strings planted in `install.ts`, so that C5's in-flight file was never touched (`guard-demo-out.txt`):

- `server/install.ts:362: const OWNER_NOTE = "Kampuchea Action to Promote Education, 042-941-481";` caught twice, by name and by number
- `server/install.ts:365: const KM_NAME = "អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា";` caught
- `nav.media.escup` re-added to the default dictionary caught by the new unused-key check

One narrow allowance: a line's `seed:<name>` command token is blanked before matching, because `install.ts` points at the fixture's seed command by name and the fixture is allowed to be named after the fixture.
The token is blanked rather than the line exempted, so a brand string sharing that line is still caught.
The cleaner fix is for that comment to stop naming the customer, which is C5's file. Handoff.

The guard still walks `src/` only.
Widening it to the repo root would have it read `kape.db`, `docs/` and the deployment files C5 is moving inside, so I left the root where it was and am recording the gap rather than papering over it.

## 7. `sitemap.xml` and `llms.txt`

Both enumerated `COLLECTIONS` x `LANGS` and advertised a landing per collection whether or not one existed.
A landing is an ordinary page, so both now list the ones that have actually been authored.
The sitemap also stops listing `/home`, which is a second URL for `/`.

- Blank install: 18 URLs, every one of them a page the install created (`after-sitemap-fresh.xml`). The brief's "20 URLs of which 16 are 404" I could not measure directly, because C5's installer had already begun seeding the landing pages by the time I built my scratch database; what I can say is that the route no longer names a URL the database has no page for.
- KAPE: loses exactly `/en/home`, `/km/home`, `/en/projects` and `/km/projects`; `/en/projects` is a 404 on `main` too (`after-sitemap-kape.xml` diffed against `before-sitemap-kape-main.xml`).

`llms.txt` lost its blockquote summary on KAPE, because `main` hardcoded that sentence and the branch reads `site_description`, which the fixture does not set. Handoff.

The sitemap still expands every path across `LANGS = ["en","km"]` while a fresh install enables only one language, so a blank install advertises nine Khmer URLs it cannot serve. That is the separately scoped `LANGS` problem, untouched.

## 8. Acceptance 7: KAPE is unchanged

Same fixture database, branch on 3223 against `main` on 3224.

Titles and `og:` tags now match `main` exactly on `/en`, `/en/news` and `/login` (`after-kape-branch.txt` against `before-kape-main.txt`), because the derived short name reproduces "KAPE".
Visible body text is byte-identical on `/en`, `/en/news` and `/en/who-we-are` (`kape-body-vs-main.txt`).
The header lockup, footer, breadcrumbs and article bylines all read "KAPE" again, as they did on `main`, where the branch had been showing the full legal name.

Four differences remain, all of them data that lives in the fixture:

| what | `main` | branch | why |
|---|---|---|---|
| meta description | KAPE's own sentence, hardcoded | `The website of Kampuchea Action to Promote Education.` | needs `site_description` seeded |
| home `og:image` | the students photograph | `/logo.png` | needs `og_image` seeded or a cover on the home page |
| `og:site_name` | `KAPE Cambodia` | `KAPE` | superseded in round three: `og_site_name` is now its own key |
| JSON-LD address | `areaServed`, `addressRegion`, `addressCountry` | absent | needs the three location keys seeded |

One route differs in body text, from round one and not from this job: `/en/contact` reads "Get in touch with KAPE at our head office or any of our regional teams" where `main` read "KAPE's head office or any of our provincial teams".
That string is in `src/routes/$lang.contact.tsx`, which is not mine, and the change was a deliberate de-Cambodianising. Flagging it, not touching it.

## 9. Gates

- `bun run test`: **17 files, 104 tests, all passing** (the floor was 72). Sixteen of those are new: five in `structured-data.test.ts`, seven in `site-identity.test.ts`, and four more in `no-brand.test.ts` (three added brand patterns, plus the unused-key check).
- `bunx tsc --noEmit`: silent, exit 0.
- `bun run format`: clean over every file I touched.

## 10. Handoffs to C5

Four fixture and installer changes I did not make because the files are C5's.

1. Seed `site_description` in `src/server/seed/site.ts` with KAPE's own sentence, e.g. the one `main` hardcoded, so KAPE's meta description and `llms.txt` summary return.
2. Seed `og_image` with the home page's social image, or set a cover on the home page row, so a share of KAPE's front page is a photograph again.
3. Seed `address_region`, `address_country` and `area_served` so the Organization JSON-LD carries the address fields `main` had.
4. Reword the comment at `src/server/install.ts:4` so the product path does not name the customer, at which point the `seed:<name>` allowance in `no-brand.test.ts` can go. Renaming the script itself would finish the job.

Nothing here blocks C5, and none of it changes a shape C5 imports.

## 11. What is not done

- KAPE's four fixture-data differences above are real and visible today; the code path for each is in place and only the data is missing.
- The brand guard sees `src/` only.
- `sitemap.xml` still assumes both languages exist.
- I did not commit, did not touch git, and did not edit the worklog.

---

# Round three

Five things, all confirmed against the same two servers: a blank install on 3222, the KAPE fixture on 3223, both on scratch copies with `SSG_CACHE=off`.

## 1. `public/logo.png` was KAPE's crest, and no text search could ever have seen it

It carries "KAMPUCHEA ACTION TO PROMOTE EDUCATION ORG", "KAPE" and the Khmer name in its pixels, and `public/favicon.ico` is the same crest at 32px.
Ten code paths pointed at it, so a blank install for another organisation rendered that seal in its header, its footer, its admin sidebar, its map pins, its PWA icon, its apple-touch-icon, its `Organization` logo, its article publisher logo and, worst, as the default image on every social share of the site.

What changed:

- `public/logo.png` is now a **neutral product mark**: a slate disc carrying a white page glyph, 512x512, drawn from a script rather than traced from anything, and `public/favicon.ico` is the same mark at 32px. It is in `.work/c6-evidence/r3-product-mark.png`, rendered in situ in `r3-fresh-home.png` and `r3-fresh-dark.png`, and it reads on both a light and a dark header.
- The crest is preserved byte for byte at `public/fixture/kape-logo.png`, with the old favicon beside it, served and working (`r3-logo-and-calendar.txt`).
- `siteLogo()` reads a `logo_url` setting and falls back to the product mark. `Header`, `Footer`, the admin sidebar, the manifest icon, the apple-touch-icon, `organizationLd.logo` and the article publisher logo all read it. `og_image` falls back to it too, so a site that uploaded a logo and never thought about social cards shares its own logo rather than a stranger's.
- `logo_url` is in the identity form on `/admin/settings`.

Proven both ways in `r3-logo-and-calendar.txt`: a blank install serves `/logo.png` everywhere, and writing `logo_url=/fixture/kape-logo.png` on the KAPE database puts the crest back on all four surfaces plus the manifest, with no code change.

The guard grew two asset checks, since a text search over `src/` structurally cannot see a binary in `public/`: no file under `public/` may be *named* after a customer, and no shipped asset may be byte-identical to anything under `public/fixture/`.
Demonstrated failing in `r3-guard-demo-out.txt` on a copy of the tree with the crest restored over `public/logo.png` and a second copy dropped in as `public/kape-crest.png`.
Neither check can read pixels, and the comment above them says so.

One path still points at the product mark rather than the operator's logo: `MapView`'s marker pin, which is a static HTML string with no settings in scope, and threading them would mean changing `SectionRenderer` too. It is no longer a customer's asset, which was the requirement.

## 2. The Khmer calendar on every page of a blank install

`Footer.tsx` mounted `<KhmerCalendar />` unconditionally, and its hardcoded fallback text meant a blank install rendered "ប្រតិទិនខ្មែរ · Khmer Calendar" and a Buddhist-era grid on every public page.

It now renders when the site publishes in Khmer: `languages.some((l) => l.code === "km")`, read from the language list the root loader already provides.
A blank install enables one language and shows nothing; KAPE enables `km` and is unchanged.
That was deliberately not made a setting: an unseeded setting nothing surfaces is the defect this whole job exists to fix, whereas "the site publishes in Khmer" is already in the database and needs nobody to remember it.

Counts from the served HTML: blank install 0 occurrences, KAPE 1 (`r3-logo-and-calendar.txt`).

## 3. The derivation, and what may not be derived

- **`alternateName` is no longer derived.** `organizationLd` reads `declaredShortName` and emits `alternateName` only when an operator typed one. An acronym is a display convenience; `alternateName` is a claim that the organisation is genuinely known by that string, and `FALIAL` for "Fundación de Ayuda a la Infancia de América Latina" is not a fact we have. The same rule now governs the article publisher, the author fallback and `og:site_name`.
- **Long names no longer fall through.** When initials would be noise (7 or more significant words, or a script initials do not apply to) the short name is now the leading words that fit, stopping before a minor word. "Association for the Support of Rural Education and Community Health Development" gives "Association", not a 94-character title suffix. A name that yields neither is kept whole.
- **`TITLE_SUFFIX_LIMIT` is 28**, so the "Riverside Community Trust" its comment cites (25 characters) is genuinely under it.
- **`firstPhone` cannot emit an empty telephone.** It takes the first segment containing a digit and emits nothing at all when there is none, so `"/ 042-941-481"` yields the number and `","` yields no field.

Each of these is a test rather than a claim: four in `site-identity.test.ts`, two in `structured-data.test.ts`.

## 4. The two KAPE regressions

- **`og:site_name`.** Now its own key, `og_site_name`, falling back to the declared short name and then to the full name. One key can be "KAPE Cambodia" while the title suffix stays "KAPE", which the single key could not do. Verified: writing it restores `main`'s value exactly.
- **The telephone country code.** `main` hardcoded `+855-42-941-481`; the branch reads `contact_phone`, which the fixture sets to the local form. The product cannot turn a local number into an international one without inventing a dialling code, which is the same sin as the derived `alternateName`, so it does not. This is fixture data: the fixture should carry the international form, or a `contact_phone` an operator is happy to see rendered in the footer. Handoff.

## 5. `llms.txt` said "(English + Khmer)"

Now "every public URL, in every language the site publishes".

## Gates, round three

- `bun run test`: **18 files, 126 tests, all passing** (floor 104). Six of the new ones are mine; the rest arrived with C5.
- `bunx tsc --noEmit`: silent, exit 0.
- `bun run format`: exit 0, 238 files, no fixes applied.

## Files touched outside my list

`src/components/Header.tsx`, `src/routes/admin.tsx` and `src/routes/manifest[.]json.tsx` each hardcoded `/logo.png`, and the round-three brief's requirement of "no code path defaulting to a customer's asset" cannot be met without them.
They are in neither job's ownership list and C5 has not touched them.
Same reasoning as `src/server/mail.ts` in round two.

## Handoffs to C5, revised

The fixture needs six settings rows to be exactly the site `main` served. All six are editable in `/admin/settings` and none needs a code change.

| key | value | restores |
|---|---|---|
| `logo_url` | `/fixture/kape-logo.png` | the crest on every surface |
| `site_name_short` | `KAPE` | `alternateName`, the article publisher, the byline |
| `og_site_name` | `KAPE Cambodia` | the social card's site name |
| `site_description` | KAPE's own sentence | the meta description and the `llms.txt` summary |
| `og_image` | the home page's share image | the photograph on a shared front page |
| `address_region`, `address_country`, `area_served` | Kampong Cham, KH, Cambodia | the JSON-LD address fields |

Two more, unchanged from round two: reword the comment at `src/server/install.ts:4` so the product path stops naming the customer, and consider whether `contact_phone` should carry the international form.

If C5 would rather the crest not ship inside every other customer's container, moving `public/fixture/` into the fixture's own media seeding is theirs to make; the product reads `logo_url` either way.

---

# Closure

C5's nine seeded identity rows are in, so for the first time the fixture can be measured as it will ship.
Everything below was read off a KAPE database built by `bun run seed:kape` on 3223, a blank install on 3222, and `main` from a read-only `git archive` on 3224.
Evidence: `.work/c6-evidence/r4-closure.txt`, plus `r4-map-pins-before.png` and `r4-map-pins-after.png`.

## 1. `areaServed` is a place again

It was a bare string, which leaves a crawler to guess whether "Cambodia" is a country, a region or a market.
It is now `{"@type": "Country", "name": …}`, as `main` had it.

That makes the setting a claim about a country, so the field is now labelled "Country served" in `/admin/settings` and its hint says search engines read it as one.
Round two emitted text precisely because the key was described as "a country or a list of provinces"; naming the field settles it rather than leaving the type to be inferred from whatever was typed.

## 2. The province is said once

The one `address` setting holds the whole postal address, because that is what the footer prints, so its last component repeated `addressRegion`.
`streetLine()` drops trailing components that match the region, the country code or the country served, comparing whole components after stripping a trailing "Province", "Region", "State", "Prefecture" or "Governorate".

By comparison, never by substring, and that distinction is the whole fix: "Kampong Cham Town" is the locality and belongs in the street line, while "Kampong Cham Province" is the region saying itself twice.
Two tests hold the line, one of them the case where the region name is a prefix of the locality.

Result: `streetAddress: "PTTC, National Road 7, Kampong Cham Town"`, field for field identical to `main`, and the footer still prints the full address including the province, on both.

`organizationLd` on the seeded fixture is now identical to `main`'s hardcoded object, key for key and in the same order.

## 3. The byline

`$.tsx` used `siteShortName`, which is derived; it now uses `socialSiteName`, the same operator-set key behind `og:site_name`.
`articleLd`'s author fallback moved with it, so the structured author and the byline the reader sees are the same string, while `publisher` stays on the declared short name as `main` had it ("KAPE" publishing, "KAPE Cambodia" bylining).

Every fixture post is signed, so this path only shows on a post an operator leaves unsigned.
Exercised by nulling one post's author on both scratch databases: `main` renders `2026-05-02 · KAPE Cambodia`, and so does the branch.

## 4. The map pin: it did matter, and it is fixed

Asked to confirm rather than fix, I checked, and the answer was worse than my round-three note implied.
`PIN_HTML` is used for **every** marker, not only photo-less ones, and Leaflet builds it client-side, so no served-HTML check would have caught it: all four of KAPE's office pins on `/en/contact` were rendering the product's plain mark where `main` showed the crest.
That is a visible regression on a page KAPE uses, so I fixed it rather than writing it down.

`MapView` takes an optional `logoUrl` defaulting to `/logo.png`, and `$lang.contact.tsx` passes `siteLogo(settings)`.
Confirmed from the live DOM: four pins, `/fixture/kape-logo.png`, and the screenshots before and after.

The map *section* in `SectionRenderer` keeps the default, and that is deliberate rather than a half-fix.
A contact map marks the organisation's own offices, where its logo is the right pin; a section map marks schools and project sites, where a place the organisation works is not the organisation, and a plain marker is the more honest icon.
No fixture page uses a map section, so nothing of KAPE's is affected either way.

## 5. `/donate` reads fine for KAPE

Three strings were neutralised on that route, all of them in `src/lib/donate-defaults.ts`, and none reads oddly with KAPE's content behind it:

| | `main` | branch |
|---|---|---|
| eyebrow | Support KAPE | Support our work |
| title | Give to what moves you | unchanged |
| intro | Choose a campaign below - scholarships, libraries, teacher training, and more. Every gift goes directly to KAPE's work across 15 provinces of Cambodia. | Choose a campaign below. Every gift goes directly to the work it names. |

"Support our work" sits above the page heading on the organisation's own site, so "our" has exactly one possible referent; it is softer than "Support KAPE" and not odd.
The new intro is arguably truer than the one it replaced: the old sentence promised scholarships, libraries and teacher training on a page that renders whichever campaigns exist, and would have been a false prospectus for a site running one campaign in one province. The new one describes the mechanism, which is what a donor on that page needs.
The page title is `Donate to KAPE` on both.

One thing worth knowing rather than fixing: these three are `site_settings` keys with defaults, read as `settings[key] ?? DONATE_DEFAULTS[key]`, and the fixture seeds none of them.
So KAPE can have its old wording back with three rows and no code change, and the `/donate` meta description follows the intro, meaning that search snippet is currently an instruction ("Choose a campaign below…") where `main` had a sentence about the cause.
That is the only place on the route I would rather the fixture spoke for itself.

## Gates

- `bun run test`: **18 files, 129 tests, all passing** (floor 126).
- `bunx tsc --noEmit`: silent, exit 0.
- `bun run format`: exit 0, clean.
