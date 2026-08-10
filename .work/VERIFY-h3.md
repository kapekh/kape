# VERIFY - H3 (missing h1) and the URL segment guard

Independent check. I did not write the code under test and did not read the fix before measuring.
Everything below is pasted from the browser via Playwright MCP against the dev server on
`http://localhost:3011`, signed in as `admin@kapekh.org`, viewport 1440x900, 2026-08-10 ~10:25-10:32
+07. Nothing under `src/` was changed.

Verdict up front: **all four checks pass.** One anomaly, unreproduced, recorded in section 3.

## 1. The two pages named in the task

`document.querySelectorAll('h1').length` and the h1 text, read in the browser after load.

```json
{
  "url": "http://localhost:3011/en/fix-b-h3",
  "h1Count": 1,
  "h1Text": ["FIX-B H3 page"],
  "title": "FIX-B H3 page — KAPE"
}
```

```json
{
  "url": "http://localhost:3011/en/ui1-audit-page",
  "h1Count": 1,
  "h1Text": ["UI1 Audit Page"],
  "title": "UI1 Audit Page — KAPE"
}
```

Both 1. Expected 1.

## 2. Regression - nothing gained a second h1

Home, in the browser:

```json
{
  "url": "http://localhost:3011/en",
  "h1Count": 1,
  "h1Text": ["Where every Cambodian child learns, dreams, and rises."],
  "title": "KAPE — Kampuchea Action to Promote Education"
}
```

For "a collection landing whose first section carries a title" I took the two strongest candidates I
could find by dumping heading outlines across fifteen public pages. `/en/videos` is the sharpest case
in the dataset: it is a collection landing whose **h1 is itself a section title** ("From the
classroom", not the page title "Videos"), so it is exactly where a second h1 would appear if the fix
promoted a section heading.

```json
{
  "url": "http://localhost:3011/en/videos",
  "h1Count": 1,
  "h1Text": ["From the classroom"],
  "title": "Videos — KAPE",
  "firstFiveHeadings": [
    "H1: From the classroom",
    "H2: Teachers Attend AI Literacy Training",
    "H2: ICT Lab at a New Generation School",
    "H2: Training Digital Literacy to Students"
  ]
}
```

```json
{
  "url": "http://localhost:3011/en/what-we-do/ict-innovation",
  "h1Count": 1,
  "h1Text": ["ICT Innovation"],
  "title": "ICT Innovation — KAPE",
  "firstFiveHeadings": [
    "H1: ICT Innovation",
    "H2: Our digital pillars",
    "H3: ICT labs in every NGS",
    "H3: Teacher digital literacy",
    "H3: AI literacy"
  ]
}
```

Wider sweep, fifteen pages fetched and parsed, `h1Count` for each — every one is 1, and the first
heading in `main` is the h1 in every case:

| url | h1Count | h1 |
|---|---|---|
| `/en/who-we-are` | 1 | Who We Are |
| `/en/what-we-do` | 1 | What We Do |
| `/en/media` | 1 | Media |
| `/en/opportunities` | 1 | Opportunities |
| `/en/news` | 1 | News & Events |
| `/en/stories` | 1 | Impact Stories |
| `/en/publications` | 1 | Publications |
| `/en/team` | 1 | Our Team |
| `/en/videos` | 1 | From the classroom |
| `/en/galleries` | 1 | Photo Galleries |
| `/en/careers` | 1 | Join the team |
| `/en/who-we-are/about` | 1 | About KAPE |
| `/en/who-we-are/vision-mission` | 1 | Vision, Mission & Core Values |
| `/en/what-we-do/ict-innovation` | 1 | ICT Innovation |
| `/en/media/annual-report` | 1 | Annual Reports |

No page gained a second h1.

## 3. A page I created myself

Not reused from another pane. Created in `/admin/pages/new` in this session: title
`Verify H3 Fresh Page`, URL segment `verify-h3-fresh`, Status `Published`, saved — the admin reported
it and moved to the new record:

```json
{
  "before": "/admin/pages/new",
  "after": "/admin/pages/49",
  "toasts": ["Page created."],
  "statusValue": "published",
  "segValue": "verify-h3-fresh"
}
```

Then one **Rich text** section added, body typed, saved:

```json
{
  "editorHTML": "<p>Body text added by the independent verification run.</p>",
  "toasts": ["Saved 10:28:24 AM"],
  "saveDisabledAfter": true,
  "url": "/admin/pages/49"
}
```

Loaded publicly. Measured immediately on load and again after polling for four seconds:

```json
{
  "first": {
    "at": "immediate",
    "url": "/en/verify-h3-fresh",
    "h1Count": 1,
    "h1Text": ["Verify H3 Fresh Page"]
  },
  "urlsOver4s": ["/en/verify-h3-fresh"],
  "final": {
    "url": "/en/verify-h3-fresh",
    "h1Count": 1,
    "h1Text": ["Verify H3 Fresh Page"],
    "title": "Verify H3 Fresh Page — KAPE"
  }
}
```

The accessibility snapshot captured at load agrees - one `heading … [level=1]`, then the body:

```
- main:
  - navigation: Home / KAPE
  - heading "Verify H3 Fresh Page" [level=1]
  - paragraph: Body text added by the independent verification run.
```

Server-side too, no redirects, body present:

```
status=200 url=http://localhost:3011/en/verify-h3-fresh redirects=0
title: ['Verify H3 Fresh Page — KAPE']
h1 count: 1
h1s: ['Verify H3 Fresh Page']
has body text: True
```

This is the case that matters and it is **1**.

### The one anomaly

My first read of `/en/verify-h3-fresh` came back reporting `location.href` as `http://localhost:3011/en`
with the home page's h1, one second after a navigation whose own result line said
`Page URL: http://localhost:3011/en/verify-h3-fresh` with the right title. I could not reproduce it:
two further loads, the load-time accessibility snapshot, a four-second URL poll and a server-side
`curl -L` all stayed on `/en/verify-h3-fresh` with one h1. Other panes were pushing HMR reloads
through the dev server during this run, which is the most likely explanation, but I am recording it
rather than explaining it away. It does not change the h1 result.

## 4. The URL segment guard

Both attempted in `/admin/pages/new`. Verbatim, exactly what the UI put on screen.

**`lead check spaces`** — the field is marked invalid, the save is refused, and the message names the
fix:

```
The URL segment cannot contain spaces. Try "lead-check-spaces".
```

```json
{
  "typed": {
    "segValueAfterTyping": "lead check spaces",
    "urlHint": ["URL: /lead check spaces"],
    "segAriaInvalid": null,
    "segDescribedBy": "page-segment-url"
  },
  "saveDisabledBeforeClick": false,
  "before": "/admin/pages/new",
  "after": "/admin/pages/new",
  "toasts": [],
  "segAriaInvalidAfter": "true"
}
```

Screenshot: `.work/ui-audit/shots/VERIFY-slug-spaces.png`

**`../lead-check`**:

```
The URL segment cannot contain a slash. Try "lead-check".
```

```json
{
  "typed": {
    "segValueAfterTyping": "../lead-check",
    "urlHint": ["URL: /../lead-check"],
    "segAriaInvalid": null
  },
  "saveDisabledBeforeClick": false,
  "before": "/admin/pages/new",
  "after": "/admin/pages/new",
  "toasts": [],
  "segAriaInvalidAfter": "true"
}
```

Screenshot: `.work/ui-audit/shots/VERIFY-slug-dotdot.png`

Three things worth noting about how it refuses, all measured:

- The error is **inline and tied to the field**, not a toast. `toasts` is empty for both; the field
  carries `aria-invalid="true"` after the attempt and `aria-describedby="page-segment-url"`. That is
  the shape R1 asked for in M11.
- `aria-invalid` is `null` while typing and only becomes `"true"` on submit, so the field does not
  shout at you mid-keystroke.
- Nothing was written for either. Both URLs 404 and neither is in the sitemap:

```
/en/lead%20check%20spaces -> 404
/en/lead-check -> 404
/en/verify-h3-fresh -> 200
```

The sitemap also no longer carries the malformed entries R1 recorded under H5 - no `<loc>` containing
a raw space or `/../` remains; only `ui1-audit-page` and the page I made this run.

## What I left behind

Page 49, `Verify H3 Fresh Page` at `/en/verify-h3-fresh`, published, one Rich text section. Delete it
when the scratch DB is next reset. Two screenshots in `.work/ui-audit/shots/`. No source file touched.
