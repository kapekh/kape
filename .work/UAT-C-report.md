# UAT-C — third full pass, public site and admin

Tester: UAT-C. Branch `cms-core` at `f1c91d6` plus the fix below.
Target: an isolated instance on `:3021` (production build) and `:3022` (dev server, current source),
both against `.work/uat-c/uat-c.db`, a `VACUUM INTO` snapshot of the handover database.
The client's instance on `:3020` was left running and untouched.
Screenshots: `.work/uat-c/shots/`. Scripts: `.work/uat-c/`.

## 1. Verdict

**Two things block the handover, and neither is content.**

The first is that **nobody at KAPE can sign in to the test site at all**. The session cookie is
marked `Secure` whenever `NODE_ENV=production`, and a browser throws away a `Secure` cookie that
arrives over plain `http://`. The instance is served over plain HTTP at `http://192.168.1.17:3020`,
so the login POST succeeds, the cookie is discarded, and the user lands back on the login screen
with no error. It was verified as working during handover because that check ran from `localhost`,
which browsers treat as a secure context. This is fixed, with a test.

The second is that **the deployed build is older than the code, and it has been serving pre-fix
HTML from cache**. The running server writes render-cache keys tagged `v2` while the source is at
`v3`. The `v3` bump exists precisely to invalidate stale entries, and it never reached the build, so
138 pages carried on being served as they rendered *before* the last round's fixes landed. This one
needs a rebuild, not a code change.

Everything else found is smaller. The structural state of the site is good: all 110 sitemap URLs
resolve, no internal link is broken, all 21 section templates render, and the two defects the last
round set out to fix are genuinely fixed.

## 2. Blocking

### C1. Session cookie is `Secure` over plain HTTP, so sign-in silently fails (fixed)

`src/server/auth.ts:143` appended `; Secure` on `NODE_ENV === "production"` regardless of the scheme
the request actually arrived on.

Same browser, same credentials, same server, one run each:

| Origin | Result |
|---|---|
| `http://192.168.1.17:3021/login` | bounced to `/login?redirect=%2Fadmin`, no session |
| `http://localhost:3021/login` | landed on `/admin`, signed in |

The only difference is that browsers treat `localhost` as a secure context and a LAN IP as not.

Fixed by deriving the flag from the request scheme, honouring `x-forwarded-proto` so TLS terminated
at a proxy still gets `Secure`. Re-verified over the LAN address on the dev server: login now
reaches `/admin` (`shots/lan-login-fixed.png`). `src/server/session-cookie.test.ts` covers all four
cases and fails if this regresses.

### C2. The deployed build predates the code, and stale cache hid a fixed defect

The publication detail page rendered no link to its own file. The resolver was returning the URL
correctly the whole time:

```
resolveRoute(db, "publications/annual-report-2025", "en")
  -> fileUrl "https://www.kapekh.org/annual-report-2025.pdf"
```

Deleting that one cache row and refetching made the link appear. Nothing else changed.

The wider fact: after clearing the cache and re-fetching all 110 URLs, the server had written 110
rows, every one of them keyed `v2`. Source `FORMAT` is `v3` (`src/server/render-cache.ts:21`).

So the artifact in `dist/` is behind `HEAD`, and because its FORMAT still matches the old rows, the
invalidation that was supposed to happen never did. KAPE has been testing a render of the site from
before the fixes.

Not fixed here: rebuilding `dist/` would change what the client's live instance serves mid-session,
which is your call to time. The commands are in section 6.

## 3. Confirmed fixed since UAT-A / UAT-B

**F1, the delete that destroyed a record it then refused to delete.** Exercised through the real
tRPC endpoint against a project with schools attached:

```
POST /api/trpc/adminProjects.delete {"id":1}
  -> 500 FOREIGN KEY constraint failed
translations for project 1:  6 before, 6 after
projects row 1:              still present
```

`deleteProject` now runs in one transaction. Before, the first three deletes had already gutted the
project by the time the fourth was refused.

**F2, forms that swallowed submissions.** A form section with no form bound now renders nothing
rather than fields that discard what is typed into them (`SectionRenderer.tsx:1001`). The trade is
described under content gaps below.

## 4. Open defects

| # | Severity | Defect |
|---|---|---|
| C3 | medium | `/projects` 404s while `current-projects` and `past-projects` both 301 to it |
| C4 | medium | No `hreflang` alternates anywhere, and the language switcher is a `<button>`, not a link |
| C5 | medium | `<link rel="canonical">` is relative (`/en`) rather than absolute |
| C6 | medium | Mobile drawer has no dialog semantics and its toggle never changes state |
| C7 | low | Mega-menu buttons carry `aria-expanded` but no `aria-controls` or `aria-haspopup` |
| C8 | low | No skip link on any page |
| C9 | low | The `events` collection is dead config: 3 published events reachable from nowhere |
| C10 | low | A person made public without a slug would emit a broken link (latent) |
| C11 | low | Refused deletes still surface as a raw `FOREIGN KEY constraint failed` 500, string-matched client-side |

**C3.** `LEGACY_REDIRECTS` (`src/lib/collections.ts:107`) maps both old project paths to `projects`,
but no page is authored at that slug, so the redirect lands on a 404. Sub-paths are fine:
`/en/current-projects/ngs` redirects to `/en/projects/ngs` and resolves. Nothing on the site links
to the bare path, so this only bites inbound links from the old site, which is the entire reason the
redirect table exists. Authoring a `projects` page with a `projectList` section closes it and gives
that template its first published home.

**C4.** On a two-language site there is currently no machine-discoverable path from an English page
to its Khmer twin. The switcher renders as two `<button>` elements with no `href`, no `aria-label`
and no `aria-current`, so it cannot be crawled, bookmarked or opened in a new tab, and a screen
reader hears two unlabelled language names with no indication of which is active. The sitemap lists
both URLs but nothing pairs them.

**C6.** Opening the drawer at 375px locks body scroll and exposes 36 links, but the document
contains **zero elements carrying any `role` attribute**, no `aria-modal`, and the trigger keeps its
`Open menu` label with no `aria-expanded`.

**C10.** Three people rows have an empty slug. All three are `is_public = 0` today, so nothing
breaks. Flipping one to public in the admin would put a link to `/en/team/` on the team page.

## 5. Content gaps — KAPE's to fill

Unchanged from `.work/UAT-CONTENT-CHECKLIST.md` unless noted.

- **The Khmer site is still English.** Zero of the 59 published sections carry a Khmer overlay. On
  `/km`, 85 of 151 text lines contain no Khmer character. Worst after that: `/km/calendar/international-days` (49/138), `/km/media` (43/80).
- **Four pages promise a form and now show nothing.** `opportunities/volunteer`, `opportunities/alumni`, `opportunities/scholarship` and `media/e-newsletter` each carry a published `form` section with no `formId`, and the `forms` table is empty. Since the F2 fix these sections render as blank space rather than a broken form. `/en/opportunities/volunteer` ends at the fourth volunteer role with no way to express interest. Building one form in `/admin/forms` and binding it fixes all four.
- **Documents link to `#`.** All six on `media/policies`, including the Child Safeguarding Policy, plus the newsletter issues, carry `href: "#"` in their section props.
- **Four publications point at `kapekh.org` PDFs** that need uploading into the media library.
- **Three videos all point at the channel front page**, `youtube.com/@KAPECambodia`, not at individual videos.
- **Three of the four public people have a job title where the name goes.** Three real named staff exist but are private.
- **Donate has no campaigns**, so the site's most prominent call to action still dead-ends.
- **`media/program-report` lists nothing.** No publication carries that category. The page degrades correctly to "No publications in this category yet."
- **Search still has no link anywhere on the site.**

## 6. What was verified working

- **110 of 110 sitemap URLs** return 200, with the right `html[lang]`, exactly one `<h1>`, a title, a canonical, and no image missing an `alt`.
- **155 distinct internal link targets**, zero broken, zero unexpected redirects.
- **All 21 section templates render.** The seven with no published instance (`pills`, `certificates`, `siteMap`, `projectList`, `map`, `directory`, `orgChart`) were exercised on a purpose-built page. Empty states are graceful: "Nothing to list yet.", "No organizational chart yet."
- **47 detail routes**: every post, person, project and album resolves, except events (C9) and the slug-less private people (C10).
- **All 54 admin routes** render for an admin session.
- **Contact form** stores the submission and rejects a malformed email with a 400.
- **Stats sections** pair an `aria-hidden` animated figure with an `sr-only` real one, which is correct; it only looks duplicated to a naive text scrape.

## 7. Gates

```
bunx tsc --noEmit     silent
bun run test          399 passed, 43 files   (was 395 / 42; +4 mine)
bunx biome check src  18 errors, none in the three files this pass touched
```

The new test tripped `no-brand.test.ts` on first run for using a `kapekh.org` domain in a fixture.
That guard is right, the CMS core has to stay tenant-neutral, and the fixture now uses `example.org`.

## 8. To finish C2, when it suits the client's session

```
bun run build
sqlite3 .work/uat/uat.db "delete from render_cache;"
# restart the :3020 instance
```

Clearing the cache alone repairs the served HTML. The rebuild is what stops it recurring, by getting
the `v3` FORMAT into the artifact.
