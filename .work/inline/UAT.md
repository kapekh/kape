# UAT plan, run in the lead pane after every job lands

Runs against a copy of `kape.db` on the lead's own port. Never `:3020`.

Inventory taken from `kape.db` on 13 Aug: **38 published pages, 1 draft, 26 published posts across 10 content types, 2 languages, 57 admin routes.**

## Public site

Crawled, both languages, so 78 page URLs plus the post details and the fixed routes.

| # | Check | Pass condition |
|---|---|---|
| P1 | Every published page, `/en/<slug>` and `/km/<slug>` | 200, exactly one `h1`, no error-boundary text, no console error |
| P2 | Every post detail by content type: news, story, event, job, publication, video, album, announcement, document, internal_news | 200, title renders, back link works |
| P3 | Listing pages: news, stories, careers, publications, videos, galleries, team | items render, empty state only where the data is genuinely empty |
| P4 | The draft page | 404 to a visitor |
| P5 | Language switch on a page with no Khmer text | English shows through, `i18nFallback` marks it, no crash |
| P6 | Contact form | message stored, read back from the admin inbox |
| P7 | Donate | campaign page renders, the flow reaches its confirmation without a live charge |
| P8 | Search | a known word returns its page, a nonsense word returns the empty state |
| P9 | Media and publications | a document downloads with the right `Content-Type` and byte count |
| P10 | `sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.json` | 200 and well formed |
| P11 | Anonymous visitor, edit mode off | no editor chrome anywhere, no `auth.me` call, HTML byte-identical to before the round |
| P12 | 390 and 1440 | no horizontal scroll, no overlap, on five representative pages |

## Admin

| # | Check | Pass condition |
|---|---|---|
| A1 | All 57 routes | load signed in as admin, no error boundary |
| A2 | Login and logout | both, plus a wrong password refused |
| A3 | Create, edit, delete on each entity that has a form | round-tripped against SQL, counts before and after |
| A4 | Page studio | section add, reorder, save, draft to published, seen on the public site |
| A5 | Media library | upload, insert into a post, delete, refusals for the four bad files |
| A6 | Settings and modules | one switch off removes the sidebar entry and 404s its route, back on restores it |
| A7 | Permissions | `staff@kapekh.org` sees only its areas, and the API refuses the rest |
| A8 | Dictionary and languages | a UI string edited from the admin shows on the public site |
| A9 | Tours | each tour's steps spotlight a real element |

## This round's own features

| # | Check | Pass condition |
|---|---|---|
| R1 | Inline edit toggle | off by default, remembered, only for an admin |
| R2 | Section text edited in place on `/en` | saves, public page shows it, nothing else in the JSON moves |
| R3 | Same field on `/km` | writes a Khmer row, English untouched, box opens empty quoting the English |
| R4 | Page title and body edited in place | one translations row moves, full dump diffed |
| R5 | Two tabs, same field | second save refused with a sentence, not a stack trace |
| R6 | Static build | after an inline save, stale mode regenerates exactly the affected paths and the visitor sees the new text |

## Evidence

Every row gets pasted output or a screenshot into `.work/inline/UAT-report.md`.
A row that cannot be exercised by its real producer is recorded as not verified, with the reason, rather than reasoned about.
