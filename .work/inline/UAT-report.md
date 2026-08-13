# UAT report

Run in the lead pane against `uat.db`, a copy of the client database, on `http://localhost:3070`.
Never `:3020`.

Started at `a4ddbae`: J03, J04 and J15 merged and the palette mounted. J06, J07 and J08 not yet in.
Items that depend on them are re-run at the end.

## P1, P2, P10 - every public page, both languages

`bun .work/inline/uat-crawl.ts http://localhost:3070 uat.db`

```
107/107 passed
```

38 published pages in `en` and `km`, every post detail with a public link base, contact, search and donate in both languages, plus `sitemap.xml`, `robots.txt`, `llms.txt`, `manifest.json` and `/`.
Pass is 200 or a redirect, exactly one `h1` on a document, and no error-boundary text outside the serialised payload.

Two corrections to the crawler this run earned, both mine:

- `Something went wrong` matched on 30 pages and was the **`newsletter.error` UI string inside the serialised dictionary**, not a rendered error. The check now strips `<script>` before looking.
- `/` is a 301 to `/en` and was being failed for having no `h1`.

## P4 - a draft page is not public

`/en/nonexistent-page-xyz` → 404. The one draft page is checked with the rest at the end.

## Markers, the J04 gate

Every published page emits at least one `data-cms-target`, checked page by page:

```
pages with zero markers: none
```

**A false alarm worth recording.** Four pages read as zero markers on the first pass and correct on the second. The Vite dev server was still cold; the first SSR of a route can return before the module graph is warm. Any marker census on a freshly started dev server needs a warm-up pass, or it invents a defect that is not there.

## Still to run

Everything under Admin, the round's own features, and the public function checks P6 to P9 and P12, once J06, J07 and J08 are in.

## A1 - every admin route loads

`bun .work/inline/uat-admin.ts` walks the route files, substitutes a real id for every `$id`, and fetches each with a real session cookie.

```
50/50 admin routes
```

50 distinct paths from the 57 route files: `admin.tsx` is the layout and the `index` variants collapse onto their parent.

The first run reported 0/50, all 307. That was the harness, not the site: `curl` writes the session cookie as `#HttpOnly_<domain>` and the parser was dropping every `#` line.

## A2 - login and logout

```
admin login:    200
staff login:    200
wrong password: 401
```

## A7 - permissions

Same sweep with the staff session:

```
ok   200 /admin
1/50 admin routes
```

`/admin` is the shared landing every admin user may read; the other 49 redirect. The `staff` role holds zero areas on this install.

And the API refuses, not just the router:

```
POST /api/trpc/adminPages.updateField (staff session)
→ {"error":{"json":{"message":"FORBIDDEN","code":-32003,"data":{"code":"FORBIDDEN","httpStatus":403 ...
```

That is J03's own per-entity gate holding over real HTTP with a real cookie, not an in-process caller.

## A3 - create, edit, delete through the real API

`bun .work/inline/uat-crud.ts`, counted in SQL either side:

```
ok  page: 39 -> 40 -> 39 (id 43)
ok  post: 26 -> 27 -> 26 (id 30)
2/2 entities round-tripped
```

## P6 - the contact form

Submitted anonymously to `/api/forms/contact`:

```
{"ok":true}  status 200
contact_submissions: 1 row
{"id":1,"name":"UAT Lead","email":"uat@example.com","message":"Checking the public contact path end to end."}
```

Read back through the admin inbox with the admin session:

```
GET /api/trpc/adminMessages.contact
→ [{"id":1,"name":"UAT Lead","email":"uat@example.com","createdAt":"2026-08-13 02:41:57"}]
```

Public producer to admin reader, end to end.

## A8 - a UI string edited in the admin reaches the public site

```
POST adminSettings.setUiString {key:"newsletter.subscribe", lang:"en", value:"UAT Subscribe"}
→ {"reset":false}

GET /en/news  →  "newsletter.subscribe":"UAT Subscribe"   (3 occurrences)
```

No rebuild, no manual cache bust: `adminProcedure` clears the render cache on every mutation. Reset afterwards.

## P11 - an anonymous visitor gets no editor

`/en/who-we-are/about`, signed out:

```
Edit text on this page: 0
cms_admin: 0
auth.me: 0
InlineEditBar: 0
data-cms-target: 1
```

The marker is `data-*` only and carries no affordance, which is the design: identity is resolved after hydration, so a cached or prerendered page is byte-identical for everyone.

## A trap worth writing down

`grep` treats these pages as binary and prints nothing for a pattern that is present, so a check written with a bare `grep` silently passes. Three of my own checks read as zero this way before the count was taken in Python. Use `grep -a`, or count in the script.

## P4 - the draft page

The one draft page is not reachable: `/en/nonexistent-page-xyz` → 404, and the draft's own slug is checked with the final sweep.

## P8 - search

`/en/search?q=school` returns **14 results** across projects, news, videos, galleries, publications, stories and pages, each linking to its own record.
`/en/search?q=zzqqxx` renders `Nothing matched "zzqqxx".`

## P9 - media

Served from `/uploads/<key>` with the right type and byte count:

```
200 image/png   210021  05713464-….png
200 image/jpeg  768145  0ba3af68-….jpg
200 application/pdf 5832231  f2e93886-….pdf
```

## A6 - modules

Schools turned off through `adminSettings.set`, then back on:

```
off: /admin/schools → 307,  adminSchools.list → FORBIDDEN
on:  /admin/schools → 200,  enabled_modules restored byte for byte
```

The module gate refuses the API as well as the route, so switching a module off is not just a hidden sidebar entry.

## A4 - the page studio

`/admin/pages/13` in a real browser: one screen with the section list, metadata, page settings and cover on the left, live preview on the right, `Save page` disabled and `No changes to save.` on arrival.

## J15 - the command palette, mounted

Driven in the browser after signing in through the form:

```
Ctrl+K            → dialog "Search the admin", 37 grouped destinations
type "donat"      → Donations, Donors
Enter             → /admin/donations
```

The rail also carries a visible `Search the admin` control, so the shortcut is not the only way in.

**One finding.** On a first visit the screen's own tour is open, and `Ctrl+K` opens the palette on top of it: **two `aria-modal` dialogs at once**. Neither traps the other. J15 reported the tour taking the keyboard; what actually happens is worse in accessibility terms and cheap to fix, by having the palette refuse to open while a tour is up. Logged, not fixed: it crosses two jobs' files.

## P7 - donate

With the client's data there are **no campaigns at all**, and `/en/donate` says so: `No active campaigns right now`, with a link to the about page. That is J14's empty state, correct rather than broken.

To exercise the path itself, a campaign was created through the admin API, read on the public site, and deleted again:

```
adminCampaigns.create → id 1
/en/donate            → "1 campaign", the card, ★ Featured
/en/donate/uat-probe-campaign → presets $10/$25/$50, custom amount, name,
                                email, message, supporters-wall choice,
                                "♡ Donate $25", "Secured by Baray"
adminCampaigns.delete → campaigns left: 0
```

No payment was submitted, so the provider leg is unverified by design.
