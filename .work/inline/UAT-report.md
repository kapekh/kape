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
