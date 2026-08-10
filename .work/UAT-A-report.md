# UAT-A — Public site acceptance test

Tester: UAT-A (KAPE team persona)
Target: http://localhost:3020 (branch `cms-core`, fixture `.work/uat/uat.db`)
Browser: Chromium 1234 driven by playwright-core, 1440x900 desktop and 375x812 mobile
Date: 2026-08-10, roughly 13:40 to 14:30 local
Screenshots: `/home/userx/workspace/kape/.work/uat/a-shots/`

## 1. Verdict

**Not ready for sign-off.** The site is structurally sound — every nav destination resolves, all
110 sitemap URLs return 200, search works in both languages, the contact form really posts, the
lightbox and mobile drawer behave — but the Khmer half of the site is not actually in Khmer.
Zero of the 59 published page sections carry a Khmer text overlay, so `/km` serves English hero
copy, English section headings, English card text and English calls to action under a Khmer nav
bar. On top of that, three visitor-facing functions are dead ends: four published sign-up forms
swallow every submission without a request or a message, all 30 downloadable documents are either
unclickable or point at 404s on the legacy site, and the site-wide Donate button lands on an empty
campaign list. A KAPE Khmer-speaking visitor cannot read the site, and a donor cannot donate.

## 2. Coverage

| Surface | Tested | Verdict |
|---|---|---|
| Home `/en` | yes | pass |
| Home `/km` | yes | **fail** — English content under Khmer chrome (F1) |
| Mega menu, all 4 panels, EN | yes | pass — 74 unique internal links, all 200 |
| Mobile nav drawer 375x812 | yes | pass |
| SubPage template (`/who-we-are`, `/what-we-do`, `/media`, `/opportunities`, `/calendar`) | yes | pass with defects (F8, F20) |
| Page section: hero | yes (19 pages) | pass |
| Page section: cards | yes (`/opportunities/*`, `/what-we-do/*`) | pass |
| Page section: postList | yes (`/news`, `/stories`, `/careers`, home) | pass |
| Page section: publicationList | yes (`/publications`, `/media/annual-report`) | pass with F3 |
| Page section: resources | yes (`/media/policies`, `/media/e-newsletter` + 4) | **fail** (F3) |
| Page section: form | yes (`/opportunities/volunteer`, `/media/e-newsletter`) | **fail** (F2) |
| Page section: partners | yes (home, `/who-we-are/partners`) | pass |
| Page section: videoGrid | yes (home, `/videos`) | **fail** (F6) |
| Page section: stats | yes (home) | pass |
| Page section: split, cta, richtext | yes (home, `/opportunities/scholarship`) | pass |
| Page section: people | yes (`/team`) | pass with F10 |
| Page section: albumGrid | yes (`/galleries`) | pass |
| Page section: projectList | **not covered** | only on draft page `j03-preview` |
| Page section: siteMap | **not covered** | only on draft page `j03-preview` (F16) |
| Page section: certificates | **not covered** | only on draft page `j03-preview` |
| Article detail (news, story, video, publication, job, announcement) | yes | pass with F5, F6 |
| Album detail | yes | pass |
| Person detail | yes | pass |
| Project detail (ProjectView) | yes (`/projects/ngs`, `/projects/escup`) | pass |
| Language switching (9 pages, both directions) | yes | pass — same page, prefix flips, `html[lang]` correct |
| Site search — results | yes (`school`, 14 results) | pass with F9 |
| Site search — no results | yes (`zzzznotarealquery`) | pass |
| Site search — many results | yes (`e`, 71 results, first 30 shown) | pass |
| Site search — Khmer | yes (`សាលា`, 10 results) | pass with F18 |
| Site search — entry point in UI | yes | **fail** (F15) — no link anywhere |
| Contact form — validation | yes | pass |
| Contact form — real submit | yes | pass, row 1 in `contact_submissions` |
| Contact map + pins | yes | pass — Leaflet, 4 markers |
| Office listings | yes | pass with F25 |
| Footer newsletter subscribe | yes | pass, row 1 in `newsletter_subscribers` |
| FormRenderer form built in /admin/forms | **not covered** | `forms` table has 0 rows (F-fixture-1) |
| Donate index | yes | **fail** (F4) — 0 campaigns |
| Donate campaign page | **not covered** | no campaign exists |
| Donate form validation | **not covered** | no campaign exists |
| Donate success page | yes | pass with F12 |
| Real payment | deliberately not attempted | see section 5 |
| Gallery lightbox: open, arrows, wrap, buttons, focus trap, Esc, backdrop | yes | pass |
| Publications listing + PDF reader | yes | **fail** (F3, F19) |
| Publication detail / download | yes | **fail** (F5) |
| Posts listing + single post | yes | pass |
| Projects: `/projects` listing | yes | **fail** — 404 (F7) |
| Projects: single project | yes | pass |
| Staff portal `/internalsources` logged out | yes | pass — 302 to /login on all 4 sub-pages |
| Staff portal as `staff@kapekh.org` | yes | pass with F13, F14; `/admin` correctly refused |
| Staff portal as admin | yes | pass |
| Announcement popup | yes | pass — 2 slides, prev/next, Esc, localStorage dismissal |
| Share buttons | yes | pass — Facebook + Telegram, `target=_blank rel=noreferrer` |
| Theme toggle | **not covered** | `theme_dark_mode=off`, component renders nothing (F28) |
| Footer | yes | pass with F22 |
| Org chart page | **not covered** | no such public page, `org_nodes` empty (F11) |
| Sitemap page | **not covered** | draft only (F16); `/sitemap.xml` itself: pass, 110 URLs all 200 |
| Mobile 375x812: nav, tables, lightbox, forms | yes | pass — no horizontal overflow on 6 pages |
| 404 — nonexistent URL | yes | pass EN, **fail** KM (F17) |
| 404 — unpublished page (`/en/j03-preview`) | yes | pass — 404, not 200 |
| Legacy redirects | yes | **fail** for 2 of 7 (F7) |

Pages opened: home, `/who-we-are` + 5 children, `/what-we-do` + 2 children, `/media` + 5 children,
`/opportunities` + 4 children, `/calendar` + 2 children, `/news`, `/stories`, `/videos`,
`/galleries`, `/team`, `/publications`, `/careers`, `/contact`, `/donate`, `/search`,
`/internalsources` + 3 sub-pages, `/login`, plus one detail page per collection. Both language
prefixes for 22 of them.

## 3. Findings

### F1 — high — Khmer pages serve English content

- URL: `http://localhost:3020/km`, and every `/km/...` page with authored sections.
- Repro: open `/km`. Nav, footer labels and post titles are Khmer. Scroll the body.
- Observed: hero eyebrow "Three decades of impact · 1994 — 2026", H1 "Where every Cambodian child
  learns, dreams, and rises.", lead paragraph, "Explore impact stories", "Who we are", stat labels
  "Schools served / Provinces / Children", section eyebrows "CLASSROOMS OF HOPE", "STORIES FROM THE
  FIELD", "LIVES TRANSFORMED", "WATCH", "OUR REACH", "ABOUT KAPE", "STAND WITH US", the whole About
  paragraph and the donate CTA — all English. 52 of 100 text lines in `<main>` contain no Khmer
  character. Screenshot `a-shots/30-km-home.png`.
- Root cause, measured against the fixture: the renderer supports a per-language overlay at
  `section.props.i18n[lang]` (`src/server/repo/sections.ts:134-143`), and **0 of 59 published
  sections have a `km` key**. Separately, `translations` holds 39 English page titles but only 8
  Khmer ones.
- Expected: a Khmer visitor reads Khmer. At minimum every hero title, lead and section heading on a
  published page.

### F2 — high — Four published sign-up forms silently discard the submission

- URLs: `/en/opportunities/volunteer`, `/en/opportunities/alumni`,
  `/en/opportunities/scholarship`, `/en/media/e-newsletter` (and the `/km` equivalents).
- Repro: open `/en/opportunities/volunteer`, fill "Your name" = `UAT A`, email =
  `uat-a@example.org`, message = `volunteer interest test`, click **Submit**.
- Observed: nothing. No network request of any kind (I recorded every POST/PUT on the page: none).
  No success message, no error, no page change; the field values stay filled. Screenshot
  `a-shots/33-dead-form.png`.
- Root cause: `src/components/sections/SectionRenderer.tsx:1019` —
  `<form className="space-y-3" onSubmit={(e) => e.preventDefault()}>` with no handler.
- Expected: the submission is stored (as the contact form's is) and the visitor sees a confirmation.
  A volunteer or scholarship applicant currently believes they have applied and has not.

### F3 — high — Every document on the site is undownloadable

Two separate causes, same visitor outcome.

(a) 26 documents render as dead cards.
- URLs: `/en/media/policies` (6), `/en/media/other-publications` (6), `/en/media/e-newsletter` (4),
  `/en/media/escup-sources` (4), `/en/media/ai-digital` (3), `/en/media/life-skills` (3).
- Repro: open `/en/media/policies`, try to click "Child Safeguarding Policy".
- Observed: not clickable. `main` contains zero `<a>` elements. Each item still shows a red document
  icon and a "PDF" kind label, so it reads as a downloadable file. Screenshot
  `a-shots/34-policies-nolinks.png`. Fixture: all 26 items store `href: "#"`;
  `SectionRenderer.tsx:830` deliberately downgrades `"#"` to a plain `<div>`.
- Expected: either a working file, or a visible "coming soon" state. Today the page promises the
  organisation's safeguarding policy and delivers nothing.

(b) The 4 real publications point at 404s.
- URL: `/en/media/annual-report`, `/en/publications`.
- Repro: click "KAPE Annual Report 2025".
- Observed: an in-page reader dialog opens with an iframe at
  `https://www.kapekh.org/annual-report-2025.pdf`, which returns **HTTP 404** (verified from the
  browser network log and independently with curl; `https://www.kapekh.org/` itself returns 200, so
  the host is up and the files are simply not there). Same for `annual-report-2024.pdf`,
  `program-brochure-ngs.pdf`, `research-early-literacy.pdf`. Screenshot `a-shots/12-pdf-reader.png`.
- Expected: the PDF loads, or the file is hosted in the CMS media library rather than on the
  outgoing site.

### F4 — high (fixture) — Donate is a dead end from every page

- URL: `/en/donate`, `/km/donate`, reached from the "♡ Donate" button in the header of all 39 pages.
- Repro: click "♡ Donate" from anywhere.
- Observed: "Give to what moves you / Choose a campaign below" then a "0 CAMPAIGNS" badge and
  "No active campaigns right now". `campaigns` table: 0 rows. Screenshot `a-shots/08-donate-en.png`.
- Expected: at least one published campaign, so the site's single most prominent call to action
  goes somewhere. As a consequence the campaign page, the donate form and its validation could not
  be tested at all (section 5).

### F5 — high — Publication detail pages have no document and no download

- URL: `/en/publications/annual-report-2025` (same for the other three).
- Repro: from `/en/publications`, open a publication's detail page.
- Observed: title, date, "KAPE CAMBODIA", Facebook/Telegram share, and a "More from Publications"
  rail. No PDF, no reader, no download link, no file size — even though the record carries
  `meta.fileUrl`. `main` contains 0 iframes, 0 embeds, 0 download links. Screenshot
  `a-shots/11-publication-detail.png`. `meta.fileUrl` is read on the *listing* sections only; the
  article route never renders it.
- Expected: the detail page of a publication offers the publication.

### F6 — high — The video gallery has no video

- URLs: `/en/videos`, `/en/videos/video-ict-lab` (all 3 videos).
- Repro: open `/en/videos`, click "ICT Lab at a New Generation School".
- Observed on the listing: all three cards link to `https://www.youtube.com/@KAPECambodia` — the
  channel front page, not the video. A visitor clicking any of three different videos is sent to
  the same off-site page and has to find it themselves. Screenshot `a-shots/31-videos-en.png`.
- Observed on the detail page: title, one-line caption, share buttons, related rail. **0 `<iframe>`,
  0 `<video>`** — no player at all. Screenshot `a-shots/29-video-detail.png`.
- Fixture: all 3 records store `meta.youtube_url = "https://www.youtube.com/@KAPECambodia"`, so the
  ID extractor at `SectionRenderer.tsx:1292` finds nothing and falls back to the channel link.
  The article route never renders `youtubeUrl` under any data.
- Expected: per-video URLs in the fixture, and an embedded player on the detail page.

### F7 — med — Two legacy URLs redirect onto the 404 page

- URLs: `/en/current-projects`, `/en/past-projects`.
- Repro: `curl -i http://localhost:3020/en/current-projects`.
- Observed: `301 → /en/projects`, and `/en/projects` returns **404** with "Page not found".
  `/en/current-projects/ngs` correctly reaches `/en/projects/ngs`, so only the two landing paths
  break. The other five legacy rules (`who-we-are/news`, `what-we-do/impact-stories`,
  `who-we-are/leadership`, `media/photo-gallery`, `media/video-gallery`) all end on a 200.
- Expected: a `projects` landing page, or the two rules pointing at `/what-we-do`. These are the
  paths the current live site uses, so inbound links and bookmarks will hit this.
- Note: no link on the site points at `/en/projects`, and the project detail breadcrumb renders
  "Projects" as plain text, not a link — so this is reachable only from outside.

### F8 — med — Breadcrumb says "KAPE" instead of the page name

- URLs: `/en/who-we-are`, `/en/what-we-do`, `/en/media`, `/en/opportunities`, `/en/calendar`.
- Repro: open `/en/what-we-do`, read the breadcrumb under the header.
- Observed: `Home / KAPE`, then the H1 "What We Do". On `/km` the same slot shows the *English*
  parent title, e.g. `/km/who-we-are/about` renders `ទំព័រដើម / Who We Are`.
- Expected: `Home / What We Do`, and the Khmer parent title on `/km`.

### F9 — med — Every search result prints its title twice

- URL: `/en/search?q=school`.
- Repro: search for `school`.
- Observed: each card renders the title, then the same string again as the description —
  "PROJECTS / Schools for Empowerment / Schools for Empowerment". Records that have a real excerpt
  (the two impact stories) show it correctly, so this is the fallback path firing for everything
  else. Same on `/km`. Screenshot `a-shots/32-search-results.png`.
- Expected: either an excerpt or nothing under the title, never a repeat of it.

### F10 — med — Three of four leadership entries have a role where the name should be

- URL: `/en/team`, `/km/team`.
- Repro: open `/en/team`.
- Observed: "Mr. Heang Koy / Chairman of the Board" is correct. The other three render
  "Executive Director / Executive Director", "NGS Program Manager / NGS Program Manager",
  "M&E Manager / M&E Manager", each with initials-only avatars. Fixture: `people.name_en` equals
  `people.position` for ids 2, 3, 4. The three real named staff (ids 5-7) are `is_public = 0`.
- Expected: real names, or those rows unpublished until the names exist. Right now the leadership
  page reads as placeholder content.

### F11 — med — The nav promises an organizational chart that does not exist

- URL: mega menu "Who We Are" → "Leadership Team & Organizational Chart" → `/en/team`.
- Repro: open the "Who We Are" panel, follow that item.
- Observed: `/en/team` is a four-card people grid. There is no org chart on it, and no published
  page anywhere uses the `orgChart` section. `org_nodes` table: 0 rows.
- Expected: either the chart on `/en/team`, or the menu label trimmed to "Leadership Team".

### F12 — med — The donation thank-you page congratulates anyone who types the URL

- URL: `http://localhost:3020/en/donate/success`.
- Repro: paste the URL with no query string.
- Observed: 200, "WITH GRATITUDE / Thank you / We've received your donation / Thank you! We're
  finalising the confirmation of your payment."
- Expected: without a valid order reference, redirect to `/donate` or show a neutral page. A donor
  who bookmarks or reloads this gets a false confirmation.

### F13 — med — Every internal document in the staff portal says "no file"

- URL: `/internalsources/documents`, signed in as `staff@kapekh.org`.
- Repro: log in at `/login`, go to Documents.
- Observed: "FINANCE & PROCUREMENT / 📄 Procurement Guidelines / no file" and
  "ADMIN & HR / 📄 5-Year Strategic Plan / no file". Both of the fixture's two documents.
  Screenshot `a-shots/20-internalsources-staff.png`.
- Expected: at least one document with a real file, otherwise the portal's Documents tab cannot be
  accepted.

### F14 — med — The staff directory mixes public leadership rows into the staff table

- URL: `/internalsources/directory`.
- Repro: log in, go to Directory.
- Observed: the first four rows (Mr. Heang Koy, Executive Director, NGS Program Manager, M&E
  Manager) appear with empty ID, SEX, PHONE, EMAIL and PROGRAM cells, above the three real staff
  rows (K001-K003) that have full data.
- Expected: one list, either the directory rows only or the public rows populated.

### F15 — med — The search page has no entry point

- URL: `/en/search` works, but nothing links to it.
- Repro: open `/en`, inspect the top bar and header. Then check every page.
- Observed: the top bar has only Staff login, the language switcher and (suppressed) theme toggle.
  No search icon, no search field, desktop or mobile. Header source shows the guard at
  `Header.tsx:250-256`: `header_search_link` is set to `/sitemap.xml`, which fails the
  "must be a page, not a machine file" test, so the link is hidden. A visitor can only reach search
  by typing the URL.
- Expected: `header_search_link` set to `/search`, or a search control in the header.

### F16 — med — No public sitemap page

- Repro: look for a sitemap link; open `/en/sitemap`.
- Observed: `/en/sitemap` returns 404. The only page carrying a `siteMap` section is
  `j03-preview`, which is a **draft** and correctly 404s. `header_sitemap_link` is `/sitemap.xml`,
  also suppressed by the same guard, so no sitemap link appears anywhere.
- Expected: a published human-readable sitemap page linked from the top bar or footer.
- Note: `/sitemap.xml` itself is healthy — 110 URLs, and I checked every one of them: all 200.

### F17 — med — The Khmer 404 page is entirely English

- URL: `http://localhost:3020/km/nope-not-here`.
- Repro: request any nonexistent Khmer URL.
- Observed: `ទំព័រដើម / Not found` then "Page not found", "This page doesn't exist or was moved.",
  "← Back to home". Only the first breadcrumb word is Khmer. Screenshot `a-shots/27-404.png` (EN).
- Expected: Khmer copy. Also, both language 404s carry the generic site `<title>`
  "KAPE — Kampuchea Action to Promote Education" rather than a "Page not found" title.

### F18 — med — Khmer search results are labelled in English

- URL: `/km/search?q=សាលា`.
- Repro: search `សាលា` on the Khmer search page.
- Observed: the page shell and result titles are Khmer, but every category label is English —
  "PROJECTS", "NEWS & EVENTS", "PHOTO GALLERIES", "PUBLICATIONS", "VIDEOS", "IMPACT STORIES",
  "PAGE". The result count reads "10 results"; the empty state reads "Nothing matched “qqqqqq”."
  Screenshot `a-shots/28-km-search.png`.
- Expected: Khmer category labels, count and empty state.

### F19 — med — The PDF reader shows a blank frame when the file fails

- URL: `/en/media/annual-report` → click "KAPE Annual Report 2025".
- Repro: as F3(b).
- Observed: the dialog opens with the title, an "Open in new tab" link and a close button; the
  iframe area is blank because the source 404s. No error message, no fallback.
- Expected: a "this file could not be loaded" state, so the visitor knows to stop waiting.

### F20 — med — Section landing pages show far less than the mega menu

- URLs: `/en/what-we-do`, `/en/who-we-are`.
- Repro: open the "What We Do" mega panel (20 destinations: Impact Stories, ICT Innovation,
  Learning Applications and 18 projects), then click through to `/en/what-we-do`.
- Observed: the landing page lists 2 cards — ICT Innovation and Learning Applications. No projects,
  no impact stories. `/en/who-we-are` lists 5 of the 7 items its panel offers (News and Events and
  Leadership Team are missing).
- Expected: the landing page covers what the menu covers, or the menu is narrowed to match.

### F21 — med — Form fields have placeholders where labels should be

- URLs: `/en/contact`, `/en/opportunities/volunteer`, `/en/media/e-newsletter`, footer newsletter.
- Repro: open `/en/contact` and inspect the four fields.
- Observed: no `<label>` and no `aria-label` on `name`, `email`, `phone` or `message`; the only text
  is the placeholder ("Full name", "Email", "Phone (optional)", "Message"), which disappears the
  moment the visitor types. Same on the section forms.
- Expected: a persistent visible label per field.

### F22 — low — Footer social links render as bare letters

- URL: any page, footer.
- Observed: "f", "yt", "t" as text, because `footer_socials` entries have `logoUrl: ""`.
- Expected: icons, or the full network name.

### F23 — low — Sub-page heroes are a large empty dark band

- URL: `/en/media/policies` and every page without a cover image.
- Observed: roughly 600px of dark gradient holding an eyebrow, an H1 and a lead, with the lower
  half empty before the content starts. Screenshot `a-shots/34-policies-nolinks.png`.
- Expected: the hero shrinks when there is no image.

### F24 — low — Head office and two provincial offices are unevenly filled in

- URL: `/en/contact`.
- Observed: Phnom Penh Sub-Office has a street address; Siem Reap and Kratie show only a city
  heading, phone and email, all three sharing the same phone `011 222 222` and the same email.
- Expected: real per-office details before launch.

### F25 — low — Khmer newsletter field keeps an English placeholder

- URL: `/km`, footer.
- Observed: `aria-label` is Khmer ("អាសយដ្ឋានអ៊ីមែល") but `placeholder` stays `you@email.org`.

### F26 — low — Dev tooling is visible on the page

- URL: every page.
- Observed: the TanStack devtools badge sits in the bottom-right corner (visible in
  `a-shots/30-km-home.png`). Expected in a dev server; flagging only so it is confirmed absent from
  the production build.

## 4. Untranslated text and leaked keys

### Leaked dictionary keys

**None found.** I stripped scripts and tags from the served HTML of `/en`, `/km`, `/en|km/contact`,
`/en|km/donate`, `/en/search`, `/km/media/policies`, `/km/team`, `/km/opportunities/volunteer` and
matched `[a-z]+\.[a-z]+(\.[a-z0-9]+)?` against the visible text, excluding domains and file
extensions. Zero hits on every page. I also read `<main>` in the browser on 22 Khmer pages with the
same pattern: zero hits. Every `t()` call in the fixture resolves to a string or to its English
fallback — never to the key.

### English text on Khmer pages

Collected by reading `<main>` in the browser on each `/km` URL and keeping every line with no Khmer
character. Counts are "Latin-only lines / total lines".

| URL | ratio | English seen |
|---|---|---|
| `/km` | 52/100 | "Three decades of impact · 1994 — 2026", "Where every Cambodian child learns, dreams, and rises.", the whole hero lead, "Explore impact stories", "Who we are", "Schools served", "Provinces", "Children", "CLASSROOMS OF HOPE", "Every child, every classroom", "KAPE across 15 provinces" (x3), "DIGITAL FUTURES", "ICT labs that open new worlds", "PARTNERS FOR CHANGE", "Leaders aligning on equity", "STORIES FROM THE FIELD", "Latest news & events", "LIVES TRANSFORMED", "Impact stories", "WATCH", "From the classroom", "OUR REACH", "Three decades.", "Countless beginnings.", all 7 stat labels, "15 PROVINCES OF CAMBODIA", "ABOUT KAPE", the About paragraph, "STAND WITH US", the donate paragraph, "♡ Donate now", "Partner with KAPE", "WORKING TOGETHER", "Partners for change" |
| `/km/contact` | 30/36 | "SAY HELLO", "Contact Us", "Get in touch with KAPE at our head office or any of our regional teams.", "Send us a message", "We usually reply within a couple of working days.", "Full name", "Email", "Phone (optional)", "Message", "Head office", "Address:", "Phone:", "Email:", "Provincial offices", "Phnom Penh Sub-Office", "Siem Reap", "Kratie" |
| `/km/media` | 22/24 | "Media" plus all 10 child titles ("AI and Digital Education", "Annual Reports", "E-Newsletter", "ESCUP Sources", "Life Skills Education", "Other Publications", "Paper Research", "Policies and Regulations", "Program Brochures", "Program Reports") and 10x "Explore →" |
| `/km/opportunities/volunteer` | 13/18 | "OPPORTUNITIES", "Volunteer with KAPE", the lead, "Volunteer roles", and all four role cards with their descriptions, "Express interest" |
| `/km/opportunities` | 12/14 | "Opportunities" and all 5 child titles, 5x "Explore →" |
| `/km/media/policies` | 10/16 | "MEDIA & PUBLICATIONS", "Policies and Regulations", the lead, "Key documents", and all 6 policy names |
| `/km/team` | 7/15 | "Our Team", "Chairman of the Board", "Executive Director", "NGS Program Manager", "M&E Manager" |
| `/km/who-we-are` | 7/14 | "Our Partners", 5x "Explore →" |
| `/km/what-we-do` | 6/8 | "What We Do", "ICT Innovation", "Learning Applications", 2x "Explore →" |
| `/km/donate` | 8/9 | "SUPPORT OUR WORK", "Give to what moves you", "Choose a campaign below. Every gift goes directly to the work it names.", "CAMPAIGN", "No active campaigns right now" |
| `/km/media/annual-report` | 5/11 | "MEDIA & PUBLICATIONS", "Annual Reports", the lead, "131 downloads", "0 downloads" |
| `/km/projects/ngs` | 5/10 | "Projects" (breadcrumb), "CURRENT PROJECT", "Supported by" |
| `/km/publications` | 5/17 | "Publications", "0 downloads", "1 download" |
| `/km/news/…` | 5/17 | "News & Events" (breadcrumb), "Facebook", "Telegram", "More from News & Events" |
| `/km/galleries` | 3/5 | "Photo Galleries", "2 photos", "3 photos" |
| `/km/calendar` | 4/14 | 3x "Explore →" |
| `/km/news` | 1/13 | "News & Events" |
| `/km/stories` | 1/9 | "Impact Stories" |
| `/km/videos` | 1/4 | "From the classroom" |
| `/km/careers` | 1/3 | "Join the team" |
| `/km/nope-not-here` | — | "Not found", "Page not found", "This page doesn't exist or was moved.", "← Back to home" |
| `/km/search?q=…` | — | "PROJECTS", "NEWS & EVENTS", "PHOTO GALLERIES", "PUBLICATIONS", "VIDEOS", "IMPACT STORIES", "PAGE", "10 results", "Nothing matched “…”." |

Clean on `/km`: `/km/who-we-are/about` (0/5) and the `/km/search` shell (0/7) — proof that the
machinery works where the translation was authored.

Site-wide, in both languages: the header **"♡ Donate"** button never translates
(`site_settings.header_donate_label`, no `_km` variant), and the footer newsletter placeholder
stays `you@email.org`.

## 5. Not tested, and what it would take

| Item | Why | What unblocks it |
|---|---|---|
| Donate campaign page, amount picker, donate form validation | `campaigns` table has 0 rows, so `/en/donate` shows an empty state and `/en/donate/<anything>` 404s | Seed one published campaign into `.work/uat/uat.db`. I would then have driven the form to the point where `DonateForm` POSTs to `/api/pay/…` and the handler returns `redirectUrl` (`src/components/donate/DonateForm.tsx:94`), stopped there, and never followed the gateway redirect. |
| A FormRenderer form built in `/admin/forms` | `forms` table has 0 rows. The four `form` sections on published pages use the inline placeholder layout instead (see F2), not FormRenderer | Build one form in `/admin/forms` and reference its slug from a page section. |
| `projectList`, `siteMap`, `certificates` section types | All three appear only on `j03-preview`, which is a draft and correctly 404s to the public | Publish a page carrying them, or publish `j03-preview`. |
| Org chart | `org_nodes` empty and no published page uses the `orgChart` section | Seed org nodes and add the section to `/team` or a new page. |
| Theme toggle | `site_settings.theme_dark_mode = "off"`, so `ThemeToggle` renders nothing by design | Set `theme_dark_mode` to `auto`/`on` in `/admin/settings`. |
| Real payment | Out of scope by instruction | n/a |
| Non-admin staff role beyond `staff@kapekh.org` | Only two users exist (admin, staff) | n/a — both were exercised. |

## 6. Environment notes

- The dev server on 3020 stayed up for the whole session; final check `GET /en` → 200.
- **The fixture is being written by another pane while I tested.** I saw "UAT B Story", "UAT B
  Album", "UAT B Person", "UAT B Office" and "UAT B Campaign" appear in listings mid-run, and
  `/en/stories/uat-b-story` and `/en/galleries/uat-b-album` 404'd while still linked from the home
  rail and the mega menu. I have excluded all of it from the findings above; the campaign was
  created and deleted again, which is why F4 stands. My own writes to the fixture: one row in
  `contact_submissions` and two in `newsletter_subscribers`, all deliberate.
- `.work/uat/dev.log` contains ~34k React hydration-mismatch warnings. I traced the payload: the
  mismatched attribute is `style={{caret-color:"transparent"}}` on the footer newsletter input —
  that is Playwright's own screenshot injection, not a product bug. Ignore it.
- 145k `AbortError: Transition was skipped` rejections in the same log come from view transitions
  being interrupted by rapid scripted navigation. I could not reproduce a visible symptom from
  ordinary clicking, so I have not raised it as a finding.
- Zero browser console errors on every page I opened except the expected 404s (the missing PDFs,
  the deliberate not-found URLs, and UAT-B's disappearing content).
