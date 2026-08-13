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
