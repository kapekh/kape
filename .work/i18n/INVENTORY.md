# T1 - visitor-visible string inventory (public site)

Read-only pass. Nothing under `src/` was touched.

## Headline

- **52 files in scope**, all 52 walked. The step-1 list and the Files table below both count 52.
- **212 new `ui_strings` keys** proposed in `.work/i18n/keys.proposed.ts`. That is over the 150
  threshold, so the build should land in slices - order in [Slice order](#slice-order).
- **32 of those 212 are interpolated** (`{n}`, `{site}`, `{goal}`). Those are the ones that break in
  Khmer if built as concatenation; see [Interpolation](#interpolation).
- **19 hits reuse an existing key**, 0 key collisions with the bootstrap dictionary.
- Correction to the brief: `src/lib/ui-strings.default.ts` holds **41** keys, not 53. Counted with
  `Object.keys(defaultUiStrings).length`.
- Two findings that a key alone will not fix, both in [Not a key](#not-a-key-code-fixes): the root
  error and 404 screens render **outside** `LanguageProvider`, and four date/number formatters
  hardcode a locale.

## Files

Every in-scope file, its hit count, and whether it was walked. "Hits" counts rows in the Strings
table, so a file with 0 hits carries no visitor-visible literal.

Scope rule applied: every `src/routes/*` that is not `admin*` or `api.*`, plus every
`src/components/**` those routes render. `*.test.tsx` excluded as test fixtures.

| # | File | Hits | Walked |
|---|---|---|---|
| 1 | `src/routes/$.tsx` | 14 | done |
| 2 | `src/routes/$lang.contact.tsx` | 15 | done |
| 3 | `src/routes/$lang.donate.$campaign.tsx` | 2 | done |
| 4 | `src/routes/$lang.donate.index.tsx` | 22 | done |
| 5 | `src/routes/$lang.donate.success.tsx` | 11 | done |
| 6 | `src/routes/$lang.donate.tsx` | 0 | done |
| 7 | `src/routes/$lang.search.tsx` | 8 | done |
| 8 | `src/routes/index.tsx` | 0 | done |
| 9 | `src/routes/internalsources.tsx` | 7 | done |
| 10 | `src/routes/internalsources.index.tsx` | 3 | done |
| 11 | `src/routes/internalsources.calendar.tsx` | 6 | done |
| 12 | `src/routes/internalsources.directory.tsx` | 10 | done |
| 13 | `src/routes/internalsources.documents.tsx` | 6 | done |
| 14 | `src/routes/llms[.]txt.tsx` | 5 | done |
| 15 | `src/routes/login.tsx` | 12 | done |
| 16 | `src/routes/manifest[.]json.tsx` | 0 | done |
| 17 | `src/routes/robots[.]txt.tsx` | 1 | done |
| 18 | `src/routes/__root.tsx` | 6 | done |
| 19 | `src/routes/sitemap[.]xml.tsx` | 0 | done |
| 20 | `src/routes/uploads.$.tsx` | 1 | done |
| 21 | `src/components/AnnouncementPopup.tsx` | 11 | done |
| 22 | `src/components/ContactForm.tsx` | 7 | done |
| 23 | `src/components/Dialogs.tsx` | 4 | done |
| 24 | `src/components/Footer.tsx` | 11 | done |
| 25 | `src/components/FormRenderer.tsx` | 16 | done |
| 26 | `src/components/Header.tsx` | 12 | done |
| 27 | `src/components/JsonLd.tsx` | 0 | done |
| 28 | `src/components/KhmerCalendar.tsx` | 10 | done |
| 29 | `src/components/Lightbox.tsx` | 8 | done |
| 30 | `src/components/MapView.tsx` | 4 | done |
| 31 | `src/components/NavLink.tsx` | 0 | done |
| 32 | `src/components/PdfReader.tsx` | 5 | done |
| 33 | `src/components/ProjectView.tsx` | 10 | done |
| 34 | `src/components/PublicOrgChart.tsx` | 0 | done |
| 35 | `src/components/PublicRichText.tsx` | 9 | done |
| 36 | `src/components/RichBody.tsx` | 0 | done |
| 37 | `src/components/ShareButtons.tsx` | 3 | done |
| 38 | `src/components/SubPage.tsx` | 7 | done |
| 39 | `src/components/ThemeToggle.tsx` | 4 | done |
| 40 | `src/components/donate/CampaignCover.tsx` | 0 | done |
| 41 | `src/components/donate/CampaignDetail.tsx` | 9 | done |
| 42 | `src/components/donate/CampaignProgress.tsx` | 7 | done |
| 43 | `src/components/donate/DonateForm.tsx` | 30 | done |
| 44 | `src/components/donate/SupportersWall.tsx` | 3 | done |
| 45 | `src/components/sections/SectionRenderer.tsx` | 42 | done, read in full (2169 lines, no sampling) |
| 46 | `src/components/ui/button.tsx` | 0 | done |
| 47 | `src/components/ui/input.tsx` | 0 | done |
| 48 | `src/components/ui/label.tsx` | 0 | done |
| 49 | `src/components/ui/select.tsx` | 0 | done |
| 50 | `src/components/ui/slider.tsx` | 0 | done |
| 51 | `src/components/ui/switch.tsx` | 0 | done |
| 52 | `src/components/ui/textarea.tsx` | 0 | done |

`SectionRenderer.tsx` is the only file over 800 lines. It was read end to end in two passes
(1-700, 700-2169), not sampled.

The seven `src/components/ui/*` files are shadcn primitives: styling and Radix wiring only, no text
node, no `placeholder`, `title`, `alt` or `aria-label` literal. Verified by grep as well as by
reading.

## Excluded, on purpose

Per the contract, these were seen and left out of the Strings table:

- **CSS class strings, route paths, query keys, `data-*` values, icon names.** The bulk of the
  literals in every file. `src/components/donate/CampaignCover.tsx` is 100% of this: SVG path data
  and CSS gradients, which is why it has 0 hits.
- **Console messages.** `console.error("[sitemap] pages query failed", …)` and its siblings in
  `sitemap[.]xml.tsx` and `llms[.]txt.tsx`.
- **Test files.** `AnnouncementPopup.test.tsx`, `PdfReader.test.tsx`.
- **Text already coming from the database.** Page bodies, section props (`title`, `eyebrow`,
  `lead`, `items[]`), nav labels, `site_settings` values, campaign fields, form field labels. These
  are already admin-editable and are marked `content` in the rows below where they sit next to a
  hardcoded neighbour.
- **`FOOTER_DEFAULTS` / `HEADER_DEFAULTS` / `DONATE_DEFAULTS`.** English defaults in
  `src/lib/*-defaults.ts`, but they are *seeded into `site_settings`*, so an admin already edits
  them in /admin/settings. Class `content`, no key needed.

## Strings

`file:line | current text | class | proposed key | notes`. Sorted by file, then line.

Class values: `already-t`, `content`, `new-key`, `leave`.

### src/routes/$.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 264 | `Explore →` | new-key | `nav.explore` | arrow stays in markup |
| 289 | `This section is being updated. Please check back soon.` | new-key | `page.empty` | |
| 295 | `← Back to home` | new-key | `nav.backHome` | arrow stays in markup |
| 307 | `{r.label}` breadcrumb section | new-key | `collection.<prefix>` | English from `COLLECTIONS.label`, see [Collection labels](#collection-labels) |
| 326 | `{publishedAt} · {author}` | leave | - | ` · ` is a separator; both sides are data |
| 339 | `label={r.label}` (related rail) | new-key | `collection.<prefix>` | same source |
| 357 | `section={r.label}` (album) | new-key | `collection.galleries` | |
| 359 | `Click any photo to view it larger.` | new-key | `album.lead` | |
| 370 | `section={r.label}` (person) | new-key | `collection.team` | |
| 402 | `section="Not found"` | new-key | `error.notfound.section` | |
| 402 | `title="Page not found"` | new-key | `error.notfound.title` | |
| 404 | `This page doesn't exist or was moved.` | new-key | `error.notfound.body` | `__root.tsx:149` is a near-duplicate; collapse to this one |
| 410 | `← Back to home` | new-key | `nav.backHome` | reused |
| 174 | `{t("related.more", "More from")} {label}` | already-t | `related.more` | assembled, see Interpolation |

### src/routes/$lang.contact.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 28 | `Contact ${siteShortName(...)}` | new-key | `contact.metaTitle` | interpolated |
| 31 | `Reach our head office and regional teams.` | new-key | `contact.metaDescription` | meta description default |
| 53 | `section={t("nav.contact")}` | already-t | `nav.contact` | |
| 54 | `Contact Us` | new-key | `contact.title` | |
| 55 | `Get in touch with ${siteShortName} at our head office…` | new-key | `contact.lead` | interpolated |
| 56 | `badge="Say hello"` | new-key | `contact.badge` | |
| 61 | `Send us a message` | new-key | `contact.form.title` | |
| 63 | `We usually reply within a couple of working days.` | new-key | `contact.form.note` | |
| 70 | `Head office` | new-key | `contact.hq` | |
| 74 | `Address:` | new-key | `contact.address` | colon inside the value; Khmer may punctuate differently |
| 80 | `Telephone:` | new-key | `contact.phone` | reused by line 137; one key, not two |
| 91 | `Email:` | new-key | `contact.email` | |
| 118 | `Provincial offices` | new-key | `contact.provincial` | |
| 137 | `Phone: ` | new-key | `contact.phone` | reused |
| 148 | `Email: ` | new-key | `contact.email` | reused |

### src/routes/$lang.donate.$campaign.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 20 | `${detail.title} — Donate` / `"Donate"` | new-key | `donate.metaTitleCampaign`, `donate.title` | interpolated |
| 23 | `Support this campaign.` | new-key | `donate.metaDescription` | |

### src/routes/$lang.donate.index.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 28 | `Donate to ${siteShortName}` | new-key | `donate.metaTitleHub` | interpolated |
| 32 | `settings.donate_intro \|\| DONATE_DEFAULTS…` | content | - | /admin/settings |
| 63-71 | `s("donate_eyebrow"/"donate_title"/"donate_intro")` | content | - | /admin/settings |
| 77 | `campaign` / `campaigns` | new-key | `donate.stat.campaign`, `donate.stat.campaigns` | plural pair, see Interpolation |
| 82 | `raised` | new-key | `donate.raised` | |
| 88 | `supporter` / `supporters` | new-key | `donate.supporter`, `donate.supporters` | plural pair |
| 98 | `No active campaigns right now` | new-key | `donate.empty.title` | |
| 101-108 | `Please check back soon, or ` + link + `.` | new-key | `donate.empty.body`, `donate.empty.link` | link embedded mid-sentence, see Interpolation |
| 118 | `More campaigns` / `Campaigns` | new-key | `donate.more`, `donate.campaigns` | |
| 169 | `★ Featured` | new-key | `donate.featured` | star stays in markup |
| 195 | ` of {money(goalAmount)}` | new-key | `donate.ofGoal` | interpolated |
| 197 | ` raised` | new-key | `donate.raised` | reused |
| 204 | `supporter` / `supporters` | new-key | `donate.supporter`/`.supporters` | reused |
| 213 | `Be the first to give` | new-key | `donate.beFirst` | |
| 217 | `· {money} goal` | new-key | `donate.goal` | interpolated |
| 224 | `♡ Donate to this campaign →` | new-key | `donate.cta.campaign` | heart + arrow stay in markup |
| 272 | `raised` | new-key | `donate.raised` | reused |
| 277 | `${n} ${n===1?"donor":"donors"}` | new-key | `donate.donor`, `donate.donors` | plural pair |
| 278 | `Give →` | new-key | `donate.give` | |
| 288 | `${money} goal` | new-key | `donate.goal` | reused |
| 288 | `New campaign` | new-key | `donate.new` | |
| 291 | `Be the first →` | new-key | `donate.beFirstShort` | |

### src/routes/$lang.donate.success.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 20 | `Thank you for your donation` | new-key | `donate.success.metaTitle` | |
| 35 | `section="Donate"` | new-key | `donate.title` | reused |
| 36 | `title="Thank you"` | new-key | `donate.success.title` | |
| 37 | `badge="With gratitude"` | new-key | `donate.success.badge` | |
| 38 | `Your generosity helps Cambodian children learn, dream, and rise.` | new-key | `donate.success.lead` | one organisation's copy sitting in the product core; flagged below |
| 41 | `Your gift is confirmed` | new-key | `donate.success.confirmed` | |
| 41 | `We've received your donation` | new-key | `donate.success.pending` | |
| 46 | `🎉 Your donation has been confirmed. Thank you for your support.` | new-key | `donate.success.confirmedBody` | emoji stays in markup |
| 50 | `Thank you! We're finalising the confirmation…` | new-key | `donate.success.pendingBody` | |
| 61 | `Back to home` | new-key | `nav.backHome` | reused |
| 67 | `See the impact` | new-key | `donate.success.stories` | hardcoded `/stories` href is a separate concern |

### src/routes/$lang.search.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 49 | `"Search"` title fallback | already-t | `top.search` | value duplicated as a literal here |
| 63 | `t("top.search", "Search")` | already-t | `top.search` | |
| 84 | `t("search.placeholder", \`Search ${siteShortName}\`)` | new-key | `search.placeholder` | call site exists; the key was never seeded. Interpolated |
| 100 | `t("search.prompt", …)` | already-t | `search.prompt` | |
| 107 | `{t("search.none")} “{query}”.` | new-key | `search.noneFor` | assembled around the query |
| 112 | `{total} {t("search.results")}` | new-key | `search.summary` | assembled |
| 114 | `— {t("search.showingFirst")} {limit}` | new-key | `search.showingFirstN` | assembled |
| 121 | `t(r.labelKey, r.label)` | new-key | `collection.<prefix>` | `search.kind.*` call sites exist but were never seeded |

### src/routes/index.tsx, src/routes/$lang.donate.tsx

Redirect-only and layout-only. 0 hits.

### src/routes/internalsources.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 18/68 | `staffPortalTitle(settings)` | content | - | derived from `site_settings` |
| 56 | `Checking access…` | new-key | `internal.checking` | |
| 73 | `Log out` | new-key | `internal.logout` | |
| 84 | `News Feed` | new-key | `internal.news` | |
| 91 | `Calendar` | new-key | `internal.calendar` | |
| 98 | `Documents` | new-key | `internal.documents` | |
| 105 | `Directory` | new-key | `internal.directory` | |

### src/routes/internalsources.index.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 26 | `Internal News Feed` | new-key | `internal.news.title` | |
| 29 | `Loading…` | new-key | `common.loading` | shared with FormRenderer:49 |
| 31 | `No internal news.` | new-key | `internal.news.empty` | |

### src/routes/internalsources.calendar.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 26 | `Calendar of Events` | new-key | `internal.calendar.title` | |
| 29 | `Loading…` | new-key | `common.loading` | reused |
| 35 | `Program` | new-key | `internal.calendar.col.program` | |
| 36 | `Event` | new-key | `internal.calendar.col.event` | |
| 37 | `Start` | new-key | `internal.calendar.col.start` | |
| 38 | `End` | new-key | `internal.calendar.col.end` | |

### src/routes/internalsources.directory.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 28 | `Staff Directory` | new-key | `internal.directory.title` | |
| 31 | `Loading…` | new-key | `common.loading` | reused |
| 38 | `ID` | new-key | `internal.directory.col.id` | |
| 39 | `Name (KH)` | new-key | `internal.directory.col.nameKm` | |
| 40 | `Name (EN)` | new-key | `internal.directory.col.nameEn` | |
| 41 | `Sex` | new-key | `internal.directory.col.sex` | |
| 42 | `Phone` | new-key | `internal.directory.col.phone` | |
| 43 | `Email` | new-key | `internal.directory.col.email` | |
| 44 | `Program` | new-key | `internal.directory.col.program` | |
| 59 | `"?"` avatar fallback | leave | - | single placeholder glyph, not language |

### src/routes/internalsources.documents.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 34 | `Internal Documents` | new-key | `internal.documents.title` | |
| 37 | `Loading…` | new-key | `common.loading` | reused |
| 39 | `No documents.` | new-key | `internal.documents.empty` | |
| 54 | `📄` | leave | - | icon glyph |
| 65 | `Open` | new-key | `internal.documents.open` | |
| 69 | `no file` | new-key | `internal.documents.nofile` | |

### src/routes/llms[.]txt.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 32 | `This file helps language models find the key public content.` | leave | - | machine-facing; llmstxt.org convention, read by crawlers not people |
| 36 | `## Key pages` | leave | - | same |
| 52 | `c.label` | leave | - | `COLLECTIONS.label` again, but in a machine document |
| 57-58 | `Latest news`, `Impact stories` | leave | - | same |
| 79-80 | `## Full index`, `Sitemap … every public URL, in every language the site publishes` | leave | - | same |

### src/routes/login.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 12 | `Sign in — ${adminTitle(...)}` | new-key | `login.metaTitle` | interpolated |
| 39 | `Invalid email or password.` | new-key | `login.invalid` | |
| 44 | `Sign-in failed. Please try again.` | new-key | `login.failed` | `body?.error` from the API wins; the server message is not keyed |
| 47 | `Network error. Please try again.` | new-key | `error.network` | |
| 63/66 | `siteInitial`, `adminTitle` | content | - | `site_settings` |
| 69 | `Sign in to manage the website.` | new-key | `login.subtitle` | |
| 84 | `Email` | new-key | `forms.email` | |
| 91 | `you@example.org` | new-key | `forms.emailPlaceholder` | value `you@email.org` chosen; Footer:232 and SectionRenderer:1021 use that spelling, this one is the odd man out |
| 99 | `Password` | new-key | `forms.password` | |
| 106 | `••••••••` | leave | - | masking dots, not language |
| 118 | `Signing in…` / `Sign in` | new-key | `login.busy`, `login.submit` | |
| 123 | `← Back to the site` | new-key | `nav.backSite` | arrow stays in markup |

### src/routes/__root.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 118 | `Something went wrong` | leave | - | renders outside `LanguageProvider`, see [Not a key](#not-a-key-code-fixes) |
| 121 | `An unexpected error occurred. Please refresh the page, or head back home.` | leave | - | same |
| 133 | `Go home` | leave | - | same |
| 144 | `404` | leave | - | numeral |
| 146 | `Page not found` | leave | - | outside the provider; `error.notfound.title` covers the in-provider copy at `$.tsx:402` |
| 149 | `This page doesn't exist or may have moved.` | leave | - | same; near-duplicate of `$.tsx:404` |

### src/routes/robots[.]txt.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 14 | `# AI and search crawlers are welcome to index the public site.` | leave | - | robots.txt comment, machine-facing |

### src/routes/uploads.$.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 13 | `"Not found"` | leave | - | raw 404 response body for a missing upload, not a rendered page |

### src/routes/manifest[.]json.tsx, src/routes/sitemap[.]xml.tsx

Every string is a URL, a MIME type or a `site_settings` value. 0 hits.

### src/components/AnnouncementPopup.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 102 | `t("announcement.close", …)` | already-t | `announcement.close` | |
| 105 | `×` | leave | - | glyph |
| 111 | `t("announcement.label", …)` | already-t | `announcement.label` | |
| 118 | `{index + 1} / {items.length}` | new-key | `announcement.position` | assembled counter |
| 126/129 | `a.title`, `a.message` | content | - | announcements table |
| 135 | `⏳ {t("announcement.deadline")} {a.deadline}` | new-key | `announcement.deadlineOn` | assembled |
| 145 | `{t("announcement.more")} →` | already-t | `announcement.more` | |
| 153 | `t("announcement.close.label", …)` | already-t | `announcement.close.label` | |
| 163 | `← {t("announcement.prev")}` | already-t | `announcement.prev` | |
| 171 | `${t("announcement.label")} ${i + 1}` | new-key | `announcement.goto` | assembled aria-label |
| 181 | `{t("announcement.next")} →` | already-t | `announcement.next` | |

### src/components/ContactForm.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 53 | `Thank you — your message has been sent. We'll be in touch.` | new-key | `contact.form.sent` | |
| 78/85 | `Full name` | new-key | `forms.name` | placeholder and floating label are the same string; one key feeds both |
| 94/101 | `Email` | new-key | `forms.email` | reused |
| 110/116 | `Phone (optional)` | new-key | `forms.phoneOptional` | |
| 124/131 | `Message` | new-key | `forms.message` | |
| 135 | `Something went wrong. Please try again.` | new-key | `error.generic` | byte-identical to the seeded `newsletter.error`; see [Duplicates](#duplicates-worth-collapsing) |
| 143-145 | `t("forms.sending")` / `t("forms.send")` | already-t | `forms.sending`, `forms.send` | |

### src/components/Dialogs.tsx

Shared host mounted in `__root`, so its defaults reach the public site through
`PublicRichText`'s link prompt.

| line | text | class | key | notes |
|---|---|---|---|---|
| 176 | `aria-label="Cancel"` (backdrop) | new-key | `dialog.dismiss` | |
| 218 | `o.cancelLabel ?? "Cancel"` | new-key | `dialog.cancel` | caller-supplied label wins |
| 225 | `"OK"` | new-key | `dialog.ok` | |
| 225 | `"Confirm"` | new-key | `dialog.confirm` | |

### src/components/Footer.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 51-59 | `SOCIAL_BADGE` letters (`f`, `yt`, `t`, …) | leave | - | brand abbreviations |
| 147-217 | `s("site_name_km" \| "footer_blurb" \| "footer_links_title" \| "newsletter_title" \| "newsletter_text")` | content | - | `site_settings`, /admin/settings |
| 163-173 | `📞 ✉ 📍` | leave | - | `aria-hidden` icons |
| 221 | `t("newsletter.thanks", …)` | already-t | `newsletter.thanks` | |
| 231 | `t("newsletter.email", …)` | already-t | `newsletter.email` | |
| 232 | `you@email.org` | new-key | `forms.emailPlaceholder` | |
| 238 | `t("newsletter.subscribe", …)` | already-t | `newsletter.subscribe` | |
| 241 | `→` | leave | - | glyph, the button carries an `aria-label` |
| 247 | `t("newsletter.error", …)` | already-t | `newsletter.error` | |
| 290 | `© ${siteName(settings)}` | content | - | `copyright` setting; `©` is a symbol |
| 293 | `Today: {n} · Total visits: {n}` | new-key | `footer.visits` | assembled |

### src/components/FormRenderer.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 49 | `Loading…` | new-key | `common.loading` | reused |
| 58 | `This form is now closed and no longer accepting responses…` | new-key | `forms.closed` | |
| 64 | `toLocaleDateString(undefined, …)` | leave | - | month name follows the *browser* locale, not the site language; see [Not a key](#not-a-key-code-fixes) |
| 87 | `form.successMessage \|\| "Thank you — your response has been recorded."` | new-key | `forms.sent` | the message itself is admin-editable per form; only the fallback needs a key |
| 97 | `“${file.name}” is too large (max 10 MB).` | new-key | `forms.fileTooLarge` | assembled, and `10 MB` is hardcoded next to `ATTACHMENT_MAX_BYTES` |
| 125 | `Something went wrong. Please try again.` | new-key | `error.generic` | reused |
| 129 | `Network error. Please check your connection and try again.` | new-key | `error.networkConnection` | |
| 168/181/211 | ` *` required marker | leave | - | punctuation |
| 210/339 | `labelOf(f)` | content | - | form field labels, /admin/forms |
| 230 | `Up to 10 MB · {ATTACHMENT_EXTS…}` | new-key | `forms.fileHint` | assembled |
| 245/282 | `f.placeholder` | content | - | /admin/forms |
| 259 | `f.placeholder \|\| "— Select —"` | new-key | `forms.select` | |
| 300/307 | `headTitle`, `headIntro` | content | - | /admin/forms |
| 339 | `{sec.number}. {labelOf(sec.heading)}` | leave | - | the `.` is punctuation; both sides are data |
| 357-358 | `t("forms.sending")` / `form.submitLabel \|\| t("forms.submit")` | already-t | `forms.sending`, `forms.submit` | |
| 362 | `Closes {deadlineLabel}` | new-key | `forms.closesOn` | assembled |

### src/components/Header.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 42/158 | `item.label`, `item.description` | content | - | nav_items, /admin/nav |
| 202 | `Overview` | new-key | `nav.overview` | |
| 238-245 | `contact_phone`, `header_donate_label`, `header_*_link` | content | - | `site_settings`, /admin/nav |
| 336 | `[phone, email].join(" · ")` | leave | - | separator only |
| 344 | `t("top.search")` | already-t | `top.search` | |
| 351 | `t("top.sitemap")` | already-t | `top.sitemap` | |
| 356/378 | `t("top.login", "Staff login")` | already-t | `top.login` | |
| 413 | `alt={siteShortName(settings)}` | content | - | `site_settings` |
| 503 | `aria-label="Open menu"` | new-key | `nav.openMenu` | |
| 604 | `aria-label="Close menu"` (backdrop) | new-key | `nav.closeMenu` | |
| 611 | `t("nav.menu", "Menu")` | already-t | `nav.menu` | |
| 616 | `aria-label="Close menu"` (button) | new-key | `nav.closeMenu` | reused |

### src/components/KhmerCalendar.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 5 | `KM_DIGITS` | leave | - | Khmer numerals, a character map |
| 7-20 | `KM_MONTHS` (12) | leave | - | this component exists only for the Khmer calendar; its own month names are its data |
| 22-35 | `EN_MONTHS` (12) | leave | - | should come from `Intl.DateTimeFormat`, not 12 keys; see [Not a key](#not-a-key-code-fixes) |
| 37 | `KM_WEEKDAYS` (7) | leave | - | same as `KM_MONTHS` |
| 87 | `t("footer.calendar", …)` | already-t | `footer.calendar` | |
| 96 | `t("calendar.prev", …)` | already-t | `calendar.prev` | |
| 99/116 | `‹ ›` | leave | - | glyphs, the buttons carry `aria-label` |
| 103 | `ខែ{month} ឆ្នាំ {year} ព.ស.` | leave | - | assembled Khmer; the era suffix and word order are part of the calendar, not chrome |
| 107 | `{EN_MONTHS[m]} {year}` | leave | - | see above |
| 113 | `t("calendar.next", …)` | already-t | `calendar.next` | |

### src/components/Lightbox.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 48 | `t("lightbox.title", …)` | already-t | `lightbox.title` | |
| 68 | `t("lightbox.close", …)` | already-t | `lightbox.close` | |
| 71/81/89 | `× ‹ ›` | leave | - | glyphs, all three carry `aria-label` |
| 78 | `t("lightbox.prev", …)` | already-t | `lightbox.prev` | |
| 86 | `t("lightbox.next", …)` | already-t | `lightbox.next` | |
| 97/101/147 | `photo.caption` | content | - | media table |
| 106 | `{(index ?? 0) + 1} / {photos.length}` | new-key | `lightbox.position` | assembled |
| 136 | `${t("lightbox.view")} ${i + 1} / ${photos.length}` | new-key | `lightbox.viewNth` | assembled aria-label |

### src/components/MapView.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 44 | `Past` / `Current` | new-key | `map.past`, `map.current` | |
| 51/57 | `m.label`, `m.sublabel` | content | - | offices / school locations |
| 64 | `View project →` | new-key | `map.viewProject` | arrow stays in markup. Note: built with `document.createElement`, so `t()` has to be threaded in as a prop |
| 109 | `&copy; OpenStreetMap contributors` | leave | - | tile provider attribution, must not be altered |

### src/components/PdfReader.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 36 | `t("pdf.title", …)` | already-t | `pdf.title` | |
| 63/87 | `doc.title` | content | - | publication / document record |
| 71 | `t("pdf.newTab", …)` | already-t | `pdf.newTab` | |
| 76 | `t("pdf.close", …)` | already-t | `pdf.close` | |
| 79 | `×` | leave | - | glyph, button carries `aria-label` |

### src/components/ProjectView.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 8 | `toLocaleDateString("en-GB", …)` | leave | - | locale hardcoded; see [Not a key](#not-a-key-code-fixes) |
| 36 | `Project not found` | new-key | `project.notfound.title` | |
| 38 | `This project doesn't exist or was moved.` | new-key | `project.notfound.body` | |
| 47-48 | `project.name`, `project.summary` | content | - | projects table |
| 49 | `Current project` / `Past project` | new-key | `project.current`, `project.past` | |
| 56 | `Supported by` | new-key | `project.donors` | |
| 83 | `label="Start date"` | new-key | `project.startDate` | |
| 86 | `label="End date"` | new-key | `project.endDate` | |
| 94 | `Target areas` | new-key | `project.targetAreas` | |
| 108 | `Snapshots` | new-key | `project.snapshots` | |

### src/components/PublicOrgChart.tsx

Every visible string (`node.name`, `node.title`, `eyebrow`, `title`) comes from the org_chart /
people records or from section props. 0 hits.

### src/components/PublicRichText.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 48 | `B` | leave | - | typographic mark for bold |
| 55 | `I` | leave | - | same, italic |
| 62 | `• List` | new-key | `richtext.bulletList` | |
| 69 | `1. List` | new-key | `richtext.orderedList` | |
| 76 | `❝` | leave | - | glyph for blockquote |
| 84 | `title: "Add link"` | new-key | `richtext.link.title` | |
| 85 | `placeholder: "https://…"` | new-key | `richtext.link.placeholder` | |
| 86 | `confirmLabel: "Apply"` | new-key | `richtext.link.apply` | |
| 93 | `Link` | new-key | `richtext.link` | |

The three glyph buttons (`B`, `I`, `❝`) have no accessible name at all. Out of scope for T1, worth
a row on the a11y backlog.

### src/components/ShareButtons.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 29 | `Facebook` | leave | - | brand name, not translated |
| 32 | `Telegram` | leave | - | brand name |
| 38 | `t("share.label", "Share")` | already-t | `share.label` | |

### src/components/SubPage.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 53 | `t("nav.home", "Home")` | already-t | `nav.home` | |
| 55/60 | `/` crumb separators | leave | - | single separator character |
| 56/69 | `section`, `c.label` | content | - | passed by the caller |
| 182 | `📄 ▶ 🖼` | leave | - | icon glyphs |
| 183 | `PDF` | leave | - | format acronym |
| 183 | `Video` | new-key | `media.video` | |
| 183 | `Image` | new-key | `media.image` | |

### src/components/ThemeToggle.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 46 | `Switch to light mode` | new-key | `theme.toLight` | |
| 46 | `Switch to dark mode` | new-key | `theme.toDark` | |
| 47 | `Light mode` | new-key | `theme.light` | |
| 47 | `Dark mode` | new-key | `theme.dark` | |

### src/components/donate/CampaignDetail.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 46 | `Home` | new-key | `nav.home` | reuses the existing seeded key |
| 52 | `Donate` | new-key | `donate.title` | reused |
| 55/62/65 | `campaign.title`, `campaign.blurb` | content | - | campaigns table |
| 59 | `Campaign closed` / `Stand with us` | new-key | `donate.closed.badge`, `donate.badge` | |
| 84 | `Recent supporters` | new-key | `donate.recentSupporters` | |
| 96 | `This campaign has ended` | new-key | `donate.ended.title` | |
| 99 | `Thank you to everyone who gave. Explore other ways to give.` | new-key | `donate.ended.body` | |
| 105 | `See active campaigns` | new-key | `donate.ended.cta` | |
| 111 | `Make your gift` | new-key | `donate.form.title` | |

### src/components/donate/CampaignProgress.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 4 | `Intl.NumberFormat("en-US", …)` | leave | - | locale hardcoded; see [Not a key](#not-a-key-code-fixes) |
| 32 | `Be the first to give` | new-key | `donate.beFirst` | reused |
| 37-41 | `Help reach the {money} goal.` | new-key | `donate.helpReach` | assembled around a `<span>` |
| 44 | `Your gift gets this campaign moving.` | new-key | `donate.getMoving` | |
| 59-67 | `raised of {money} goal` | new-key | `donate.raisedOfGoal` | assembled across four JSX nodes |
| 77 | `supporter` / `supporters` | new-key | `donate.supporter`/`.supporters` | reused |
| 90 | `{pct}% funded` | new-key | `donate.pctFunded` | assembled |

### src/components/donate/DonateForm.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 57/60/61 | `Anonymous` | new-key | `donate.anonymous` | three call sites, one key |
| 67 | `Minimum donation is {money}.` | new-key | `donate.minimum` | assembled |
| 98 | `Something went wrong. Please try again.` | new-key | `error.generic` | reused |
| 101 | `Network error. Please check your connection and try again.` | new-key | `error.networkConnection` | reused |
| 122 | `Choose your impact` | new-key | `donate.step1` | |
| 150 | `o.label` (impact tier) | content | - | campaign impact tiers |
| 153 | `One-time gift` | new-key | `donate.oneTime` | |
| 166 | `$` / `៛` | leave | - | currency symbols |
| 175 | `Other amount` | new-key | `donate.otherAmount` | |
| 181 | `✨ Funds {impact.label}` | new-key | `donate.funds` | assembled; sparkle stays in markup |
| 195 | `Your details` | new-key | `donate.step2` | |
| 206 | `Your name` | new-key | `forms.yourName` | shared with SectionRenderer:1015 |
| 206 | `Your name (optional)` | new-key | `donate.yourNameOptional` | |
| 217 | `Email for your receipt` | new-key | `donate.receiptEmail` | |
| 225 | `Leave a message of support (optional)` | new-key | `donate.messageOptional` | |
| 231 | `Show me on the supporters wall as…` | new-key | `donate.wallAs` | |
| 240 | `My name` | new-key | `donate.wall.name` | |
| 246 | `Custom` | new-key | `donate.wall.custom` | |
| 252 | `Anonymous` | new-key | `donate.anonymous` | reused |
| 261 | `e.g. The Sok Family` | new-key | `donate.customNamePlaceholder` | a Cambodian family name as the example in the product core; flagged below |
| 279 | `♡ Donate {money}` | new-key | `donate.submit` | assembled; heart stays in markup |
| 295 | `Secured by Baray — KHQR, card, or mobile wallet` | new-key | `donate.secured` | names one payment provider in the core; proposed as `Secured by {provider} — …` |
| 304 | `aria-label="Close"` | new-key | `dialog.close` | three seeded near-duplicates already exist, see [Duplicates](#duplicates-worth-collapsing) |
| 309 | `Confirm your gift` | new-key | `donate.confirm.title` | |
| 317 | `funds {impact.label}` | new-key | `donate.funds` | reused; lowercase here, sentence case at line 181 |
| 322 | `label="Campaign"` | new-key | `donate.confirm.campaign` | |
| 323 | `label="Credited as"` | new-key | `donate.confirm.creditedAs` | |
| 324 | `label="Message"` | new-key | `forms.message` | reused |
| 338 | `Back` | new-key | `dialog.back` | |
| 346 | `Redirecting…` / `Confirm & pay` | new-key | `donate.redirecting`, `donate.confirmPay` | |

### src/components/donate/SupportersWall.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 37 | `♡` | leave | - | glyph, `aria-hidden` |
| 46 | `Be the first to support this campaign.` | new-key | `donate.wall.empty` | |
| 70 | `“{s.message}”` | leave | - | quotation marks around donor data |

### src/components/sections/SectionRenderer.tsx

| line | text | class | key | notes |
|---|---|---|---|---|
| 99-105 | `eyebrow`, `title` | content | - | section props, /admin/pages |
| 306 | `aria-label={\`Slide ${idx + 1}\`}` | new-key | `hero.slide` | assembled |
| 338 | `p.ctaLabel \|\| "Learn more"` | new-key | `cta.learnMore` | |
| 345 | `p.cta2Label \|\| "Learn more"` | new-key | `cta.learnMore` | reused |
| 497 | `{ label: "Learn more", href: it.href }` | new-key | `cta.learnMore` | reused |
| 510 | `b.label \|\| "Learn more"` | new-key | `cta.learnMore` | reused |
| 783 | `p.ctaLabel \|\| "Donate now"` | new-key | `cta.donateNow` | |
| 791 | `p.cta2Label \|\| "Learn more"` | new-key | `cta.learnMore` | reused |
| 817 | `No resources published yet.` | new-key | `empty.resources` | |
| 830 | `it.kind \|\| "file"` | new-key | `resources.kindDefault` | |
| 1015 | `placeholder="Your name"` | new-key | `forms.yourName` | reused |
| 1021 | `placeholder="you@email.org"` | new-key | `forms.emailPlaceholder` | reused |
| 1028 | `placeholder="Message"` | new-key | `forms.message` | reused |
| 1035 | `p.submitLabel \|\| t("forms.submit")` | already-t | `forms.submit` | |
| 1101 | `t("home.news.readmore", …)` | already-t | `home.news.readmore` | |
| 1138 | `t("home.news.all", …)` | already-t | `home.news.all` | |
| 1143 | `Nothing published here yet.` | new-key | `empty.posts` | |
| 1168 | `Position` | new-key | `jobs.col.position` | |
| 1171 | `Location` | new-key | `jobs.col.location` | |
| 1174 | `Deadline` | new-key | `jobs.col.deadline` | |
| 1197 | `Apply →` | new-key | `jobs.apply` | arrow stays in markup |
| 1235 | `t("home.news.readmore", …)` | already-t | `home.news.readmore` | |
| 1309 | `t("home.video.all", …)` | already-t | `home.video.all` | |
| 1314 | `No videos yet.` | new-key | `empty.videos` | |
| 1367 | `No photo albums yet.` | new-key | `empty.albums` | |
| 1385 | `{a.count} photos` | new-key | `albums.count` | assembled |
| 1417 | `No publications in this category yet.` | new-key | `empty.publications` | |
| 1462 | `{n} download{n === 1 ? "" : "s"}` | new-key | `publications.downloads(One)` | assembled + suffix pluralisation, worst case in the file |
| 1467 | `PDF` | leave | - | format acronym |
| 1496 | `No team members listed yet.` | new-key | `empty.people` | |
| 1599 | `Nothing to list yet.` | new-key | `empty.directory` | |
| 1610 | `c.replace(/([A-Z])/g, " $1")` | leave | - | column header derived from the source row's key names; see [Not a key](#not-a-key-code-fixes) |
| 1729 | `No partners listed yet.` | new-key | `empty.partners` | |
| 1739 | `r.category \|\| "Partners"` | new-key | `partners.uncategorised` | |
| 1747 | `No partners listed yet.` | new-key | `empty.partners` | reused |
| 1818 | `See all →` | new-key | `home.news.all` | reuses the existing seeded key |
| 1823 | `No projects listed yet.` | new-key | `empty.projects` | |
| 1910 | `No accreditations listed yet.` | new-key | `empty.certificates` | |
| 1942 | `PDF` | leave | - | format acronym |
| 2024 | `No navigation published yet.` | new-key | `empty.sitemap` | |
| 2082 | `No organizational chart yet.` | new-key | `empty.orgchart` | |
| 2136 | `Unknown section type: {type}` | leave | - | diagnostic for a renamed or deleted template; never renders in a healthy install |

## Interpolation

Every string assembled from parts. These are the ones a key alone does not fix: Khmer word order
puts the number, the noun and the particle in different places, so concatenating fragments produces
grammatical nonsense however well each fragment is translated.

**32 interpolated keys**, in 5 shapes.

### Site name substituted into a sentence (5)

| where | today | pattern |
|---|---|---|
| `$lang.contact.tsx:28` | `` `Contact ${siteShortName(s)}` `` | `contact.metaTitle` = `Contact {site}` |
| `$lang.contact.tsx:55` | `` `Get in touch with ${siteShortName(s)} at our head office…` `` | `contact.lead` = `Get in touch with {site} at our head office or any of our regional teams.` |
| `$lang.donate.index.tsx:28` | `` `Donate to ${siteShortName(s)}` `` | `donate.metaTitleHub` = `Donate to {site}` |
| `$lang.search.tsx:84` | `` `Search ${siteShortName(s)}` `` | `search.placeholder` = `Search {site}` |
| `login.tsx:12` | `` `Sign in — ${adminTitle(s)}` `` | `login.metaTitle` = `Sign in — {site}` |

### Counter / position (7)

| where | today | pattern |
|---|---|---|
| `AnnouncementPopup.tsx:118` | `{index + 1} / {items.length}` | `announcement.position` = `{n} of {total}` |
| `AnnouncementPopup.tsx:171` | `` `${t("announcement.label")} ${i + 1}` `` | `announcement.goto` = `Announcement {n}` |
| `Lightbox.tsx:106` | `{(index ?? 0) + 1} / {photos.length}` | `lightbox.position` = `{n} of {total}` |
| `Lightbox.tsx:136` | `` `${t("lightbox.view")} ${i + 1} / ${photos.length}` `` | `lightbox.viewNth` = `View photo {n} of {total}` |
| `SectionRenderer.tsx:306` | `` `Slide ${idx + 1}` `` | `hero.slide` = `Slide {n}` |
| `SectionRenderer.tsx:1385` | `{a.count} photos` | `albums.count` = `{n} photos` |
| `$lang.search.tsx:112` | `{total} {t("search.results")}` | `search.summary` = `{total} results` |

### Money / percentage / date (11)

| where | today | pattern |
|---|---|---|
| `$lang.donate.index.tsx:195` | `<> of {money(goal, cur)}</>` | `donate.ofGoal` = `of {goal}` |
| `$lang.donate.index.tsx:217` | `` `· ${money(goal, cur)} goal` `` | `donate.goal` = `{amount} goal` |
| `CampaignProgress.tsx:37-41` | `Help reach the <span>{money}</span> goal.` | `donate.helpReach` = `Help reach the {goal} goal.` |
| `CampaignProgress.tsx:59-67` | `raised` + ` of ` + `{money}` + ` goal` across 4 nodes | `donate.raisedOfGoal` = `raised of {goal} goal` |
| `CampaignProgress.tsx:90` | `{pct}% funded` | `donate.pctFunded` = `{pct}% funded` |
| `DonateForm.tsx:67` | `` `Minimum donation is ${money(MIN[cur], cur)}.` `` | `donate.minimum` = `Minimum donation is {amount}.` |
| `DonateForm.tsx:181` | `✨ Funds <span>{impact.label}</span>` | `donate.funds` = `Funds {tier}` |
| `DonateForm.tsx:279` | `♡ Donate {money(value, cur)}` | `donate.submit` = `Donate {amount}` |
| `FormRenderer.tsx:362` | `Closes {deadlineLabel}` | `forms.closesOn` = `Closes {date}` |
| `AnnouncementPopup.tsx:135` | `⏳ {t("announcement.deadline")} {a.deadline}` | `announcement.deadlineOn` = `Deadline {date}` |
| `Footer.tsx:293` | `Today: {today} · Total visits: {total}` | `footer.visits` = `Today: {today} · Total visits: {total}` |

### File size / type / query (4)

| where | today | pattern |
|---|---|---|
| `FormRenderer.tsx:97` | `` `“${file.name}” is too large (max 10 MB).` `` | `forms.fileTooLarge` = `“{name}” is too large (max {max}).` |
| `FormRenderer.tsx:230` | `Up to 10 MB · {ATTACHMENT_EXTS.join(", ")}` | `forms.fileHint` = `Up to {max} · {types}` |
| `$lang.search.tsx:107` | `{t("search.none")} “{query}”.` | `search.noneFor` = `Nothing matched “{query}”.` |
| `$lang.search.tsx:114` | `` ` — ${t("search.showingFirst")} ${limit}` `` | `search.showingFirstN` = `showing the first {limit}` |

### Title substituted (2)

| where | today | pattern |
|---|---|---|
| `$lang.donate.$campaign.tsx:20` | `` `${detail.title} — Donate` `` | `donate.metaTitleCampaign` = `{title} — Donate` |
| `DonateForm.tsx:295` | `Secured by Baray — …` | `donate.secured` = `Secured by {provider} — KHQR, card, or mobile wallet` |

### Sentence with an embedded link (1)

`$lang.donate.index.tsx:101-108` renders `Please check back soon, or ` + `<NavLink>learn more about
our work</NavLink>` + `.` - three sibling nodes. `donate.empty.body` = `Please check back soon, or
{link}.` with `donate.empty.link` = `learn more about our work` needs a renderer that splits on the
placeholder and drops the anchor in, not a plain `t()`.

### Pluralisation, which the current dictionary shape cannot express (5 pairs)

`{ en, km }` has no plural forms. Every one of these picks the noun in JS today:

| where | today |
|---|---|
| `$lang.donate.index.tsx:77` | `campaigns.length === 1 ? "campaign" : "campaigns"` |
| `$lang.donate.index.tsx:88`, `:204`, `CampaignProgress.tsx:77` | `n === 1 ? "supporter" : "supporters"` |
| `$lang.donate.index.tsx:277` | `n === 1 ? "donor" : "donors"` |
| `SectionRenderer.tsx:1462` | `` `download${n === 1 ? "" : "s"}` `` - suffix concatenation, the least translatable form here |

Proposed as key pairs (`donate.supporter` / `donate.supporters`, `publications.downloads` /
`publications.downloadsOne`) so nothing is lost, but **Khmer has no plural inflection**: one key
would serve it and the pair only exists for English. Worth a decision before the build: keep pairs,
or add a `one`/`other` shape to the `ui_strings` row.

## Reused vs new

**341 rows** in the Strings table, by class:

| class | rows |
|---|---|
| `new-key` | 230 |
| `leave` | 52 |
| `already-t` | 38 |
| `content` | 21 |
| **total** | **341** |

Rows do not map one-to-one onto keys: 33 of the 230 `new-key` rows are a second or third call site
of a key already proposed on an earlier row, and a handful of rows carry two keys (the plural pairs,
and either/or labels like `More campaigns` / `Campaigns`). The distinct total is what matters:

| | count |
|---|---|
| Hits mapping onto one of the **41 existing** keys | **2** - `nav.home` at `CampaignDetail.tsx:46`, `home.news.all` at `SectionRenderer.tsx:1818` |
| Hits already reading through `useT()` (38 rows, 35 distinct existing keys) | **38** |
| Distinct **new** keys needed | **212** |
| - of which interpolated | 32 |
| Distinct keys the finished dictionary would hold | **253** |

Every one of the 41 existing keys is still referenced; nothing in the bootstrap dictionary is dead.
Three of them (`search.results`, `search.showingFirst`, `related.more`) only ever appear as a
fragment of a larger sentence and are superseded by the interpolated keys proposed below.

### Collection labels

`src/lib/collections.ts` holds nine `label` strings (`News & Events`, `Impact Stories`, `Videos`,
`Photo Galleries`, `Our Team`, `Publications`, `Careers`, `Events`, `Projects`) plus `Page` in
`src/server/repo/search.ts:284`. They render as the breadcrumb section on every detail page
(`$.tsx:307/339/357/370`), the "More from" label, and the search result kind.

`$lang.search.tsx:121` **already** calls `t(r.labelKey, r.label)` with keys `search.kind.page` and
`search.kind.<prefix>` (`src/server/repo/search.ts:285/299/314`) - and **none of those ten keys has
ever been seeded**, so search silently falls back to the English literal today.

Proposed as `collection.<prefix>` and recommend pointing the three `search.kind.*` call sites at the
same namespace, so breadcrumbs and search results cannot drift into two translations of one word.
Ten keys, not twenty. This needs a one-line change in `src/server/repo/search.ts`, which is outside
T1's write scope.

### Duplicates worth collapsing

- `Close` is seeded three times (`announcement.close.label`, `lightbox.close`, `pdf.close`) and
  hardcoded a fourth (`DonateForm.tsx:304`). Proposed `dialog.close`; the three existing keys are
  referenced and should stay until their call sites move.
- `Something went wrong. Please try again.` is seeded as `newsletter.error` and hardcoded at
  `ContactForm.tsx:135`, `FormRenderer.tsx:125` and `DonateForm.tsx:98`. Proposed `error.generic`.
- `This page doesn't exist or was moved.` (`$.tsx:404`) vs `…or may have moved.`
  (`__root.tsx:149`). One sentence, two wordings.
- `you@example.org` (`login.tsx:91`) vs `you@email.org` (`Footer.tsx:232`,
  `SectionRenderer.tsx:1021`).
- `Cancel` appears as both a real button label and a backdrop `aria-label` in `Dialogs.tsx`. Kept as
  two keys (`dialog.cancel`, `dialog.dismiss`) on purpose: the backdrop's accessible name is not the
  button's label and should be free to differ.

## Not a key (code fixes)

Four things the inventory turned up that no `ui_strings` row can fix. Not T1's to fix, but the build
should know before it starts.

1. **`__root.tsx:113-160` renders outside `LanguageProvider`.** `RootError` and `RootNotFound` are
   the root route's `errorComponent`/`notFoundComponent`; the provider is mounted inside
   `RootComponent`, which does not wrap them. `useLang()` there hits the null-context branch
   (`i18n.tsx:59`) and returns `t: (k, fb) => fb ?? k` - so a key would resolve to its English
   fallback forever, in every language. Those six strings are classed `leave` for that reason. To
   make them editable the provider has to move up, or the two components need their own strings
   passed in.
2. **Four hardcoded locales.** `CampaignProgress.tsx:4` (`Intl.NumberFormat("en-US")`),
   `ProjectView.tsx:8` (`toLocaleDateString("en-GB")`), `FormRenderer.tsx:64`
   (`toLocaleDateString(undefined)` - follows the *browser*, not the site language), and
   `KhmerCalendar.tsx:22-35` (a 12-entry `EN_MONTHS` array). Money, dates and month names never
   localise, whatever the dictionary says. `Intl` with the active `lang` is the fix; twelve month
   keys is not.
3. **`SectionRenderer.tsx:1610` builds directory column headers from data.**
   `c.replace(/([A-Z])/g, " $1")` turns a source row's key names into visible English headers
   (`staffNo` → `staff No`). Generic by design, untranslatable by consequence, and the spacing is
   already wrong. Needs a per-source header map before it can be keyed.
4. **`MapView.tsx:31-70` builds its popup with `document.createElement`.** `Past`, `Current` and
   `View project →` live in a plain function with no hook access, so `t` has to be threaded in as an
   argument rather than called in place.

## Product-neutrality flags

The core is meant to carry no one organisation's copy (`ui-strings.default.ts:1-12` says so). Three
strings break that:

- `$lang.donate.success.tsx:38` - `Your generosity helps Cambodian children learn, dream, and rise.`
- `DonateForm.tsx:261` - `e.g. The Sok Family`
- `DonateForm.tsx:295` - `Secured by Baray — KHQR, card, or mobile wallet`

All three are keyed above so an admin can change them, but the shipped default should probably be
generic. `donate.secured` is proposed with a `{provider}` slot for that reason.

## Slice order

212 keys is well past the 150 threshold. Suggested order, each slice independently shippable:

| # | Slice | Areas | Keys | Why here |
|---|---|---|---|---|
| 1 | Errors, empty states, loading | `error.`, `empty.`, `common.`, `page.` | 20 | No interpolation, no plurals, highest visibility per key. Proves the pipeline. |
| 2 | Navigation + collection labels | `nav.`, `collection.` | 16 | Every page shows these. Slice 2 carries the one `search.kind.*` consolidation. |
| 3 | Forms + dialogs + rich text | `forms.`, `dialog.`, `richtext.` | 25 | Shared by contact, the form builder and public form answers. 3 interpolated. |
| 4 | Contact + login + theme + media + map | `contact.`, `login.`, `theme.`, `media.`, `map.` | 26 | Self-contained pages. |
| 5 | Section templates | `cta.`, `hero.`, `jobs.`, `albums.`, `publications.`, `partners.`, `resources.` | 12 | Touches only `SectionRenderer.tsx`. |
| 6 | Projects, search, footer, counters | `project.`, `search.`, `footer.`, `announcement.`, `lightbox.`, `album.` | 22 | Where most of the counter interpolation lives. |
| 7 | Donate | `donate.` | 66 | Largest and most interlocked; every plural pair and most money formatting is here. Land it alone. |
| 8 | Staff portal | `internal.` | 25 | Behind a login, lowest priority, easiest to drop if the scope narrows. |

## Acceptance

`.work/i18n/keys.proposed.ts` compiles:

```
$ bunx tsc --noEmit --skipLibCheck --ignoreConfig .work/i18n/keys.proposed.ts
$ echo $?
0
```

No output, exit 0. `--ignoreConfig` is required: without it `tsc` refuses with `TS5112:
tsconfig.json is present but will not be loaded if files are specified on commandline.`

Key count verified against the existing dictionary:

```
$ bun -e '…Object.keys…'
proposed new keys: 212
existing keys: 41
collisions: none
interpolated: 32
```

## Stop conditions honoured

- No file under `src/` edited. No file outside `.work/i18n/` written.
- No `git` write command run.
- Dev server not started, no browser opened.
- No file sampled. `SectionRenderer.tsx` (2169 lines) read in full.
