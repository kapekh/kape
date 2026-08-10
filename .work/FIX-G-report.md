# FIX-G - the public site's dead ends

Branch `cms-core`. Own scratch fixture `.work/scratch/g/g.db` (copy of `.work/uat/uat.db`), own dev
server on port 3031. `.work/uat/uat.db` and `kape.db` were never opened for writing.
Screenshots in `.work/uat/g-shots/`.

Six of the six defects are closed in code. Two of them have a content half that is stated below and
not seeded.

## What changed

| File | Why |
|---|---|
| `src/components/sections/SectionRenderer.tsx` | F2: a form section with nowhere to post renders nothing. `youtubeId` exported for the article route. |
| `src/lib/sections.ts` | F2: the Form section no longer offers the two quick layouts that had no destination. |
| `src/routes/$.tsx` | F5, F6, F8: the publication file, the video player, and the breadcrumb on a top-level page. |
| `src/routes/$lang.search.tsx` | F9: a snippet that only repeats the title renders nothing. |
| `src/routes/$lang.donate.success.tsx` | F12: no order the gateway knows, no thank-you page. |
| `src/components/PdfReader.tsx` | F19: a file that will not load says so. |
| `src/components/sections/SectionRenderer.test.tsx` (new), `src/routes/-donate.success.test.ts` (new), `src/components/PdfReader.test.tsx` | the checks for F2, F12 and F19. |

## F2 - four published forms discarded every submission. Closed.

**Chosen fix: a form section with nothing behind it does not render a form, and the editor no longer
offers a way to make one.** The other two options on the menu were rejected: an admin-only "not
configured" state needs a preview/public flag threaded through `SectionRenderer` for a state nobody
would act on, and a save-time refusal alone still leaves the four live sections rendering.

`FormSection` now returns `null` unless `props.formSlug` is set or `layout === "contact"`. The
placeholder `<form onSubmit={e => e.preventDefault()}>` is deleted, not hidden. In
`src/lib/sections.ts` the Form section's layout list drops `subscribe` and `signup` - the two that
had no endpoint behind them - and keeps only `contact`, which really posts to `/api/forms/contact`.
The now-dead `submitLabel` field went with them. A section added today defaults to `contact`
(`SectionsBuilder.tsx:785`), so the editor cannot recreate the dead end.

Fixture reality: only three sections were dead, not four. `/en/opportunities/scholarship` is
`layout: "contact"` and was already posting to `contact_submissions`; UAT-A grouped it with the rest.

- Before (UAT-A `a-shots/33-dead-form.png`): `/en/opportunities/volunteer` showed name, email,
  message and Submit; clicking Submit issued no request of any kind.
- After: `/en/opportunities/volunteer`, `/en/opportunities/alumni`, `/en/media/e-newsletter` -
  `main` contains 0 `<form>` and 0 inputs, in both languages. The pages end on their real content
  with no gap. `/en/opportunities/scholarship` still renders the working contact form (5 fields).
  `g-shots/f2-volunteer-after.png`, `g-shots/f2-enewsletter-after.png`.
- Check: `src/components/sections/SectionRenderer.test.tsx` - "renders nothing when no form is
  behind it" fails the moment any form element comes back under a section with no destination.

## F5 - publication detail pages hid the publication. Closed.

The detail page now offers the file through the same `usePdfReader` the listing uses, and counts the
download through the same `posts.trackDownload` mutation.

Root cause and how far I could go: `ResolvedPost` (`src/server/repo/content.ts:492`) does not carry
`meta`, so the article route never had the file to render. **That file is inside FIX-F's
`src/server/repo/` boundary, so I did not touch it.** The route instead reads the file from
`posts.publications`, the same query `/en/publications` reads it from, warmed in the loader so it is
in the SSR html. One consequence to know: `listPublications` caps at its default 24 rows, so once
KAPE publishes a 25th publication the oldest detail pages would lose the button. The durable fix is
four lines in `content.ts` - `fileUrl: string | null` on `ResolvedPost`, filled from
`(post.meta as Record<string, unknown>).fileUrl` in `getPostBySlug` - after which
`PublicationFile` reads `post.fileUrl` and the extra query goes away.

- Before: `/en/publications/annual-report-2025` had 0 iframes, 0 embeds, 0 download links.
- After: an "Open the document" button linking the file, opening the in-page reader on desktop and
  the file itself on touch. Proven on a scratch record re-pointed at a real PDF
  (`/uploads/f2e93886-….pdf`): the reader renders all 36 pages.
  `g-shots/f5-publication-reader.png`.

**Content half:** all four publication records still point at `https://www.kapekh.org/<slug>.pdf`,
which returns 404 (verified again this session: `HTTP/1.1 404`, `Content-Type: text/html`). See the
checklist.

## F6 - video detail pages had no player. Closed.

The article route reads `youtubeUrl` from `posts.videos` (same reasoning and same boundary as F5;
`listVideos` has no limit, so this half has no cap) and embeds
`https://www.youtube-nocookie.com/embed/<id>` using the existing `youtubeId` extractor. A record
whose URL yields no video id but is still a URL renders a "Watch the video" link rather than
nothing, so a Vimeo or Facebook URL is at least reachable.

- Before: `/en/videos/video-ict-lab` rendered 0 `<iframe>` and 0 `<video>`.
- After, on the fixture as it stands: a "Watch the video" link (the record holds the channel URL).
  After putting a real video URL on `video-ict-lab` in my scratch copy: one iframe at
  `youtube-nocookie.com/embed/…`, playable. `g-shots/f6-video-player.png`.

**Content half:** all three video records store `meta.youtube_url =
"https://www.youtube.com/@KAPECambodia"`, the channel front page. No route change can make that a
player.

## F9 - every search result printed its title twice. Closed.

`snippetAround` snippets the highest-scoring field, and for most records that field is the title, so
the description was the title again. The producer is `src/server/repo/search.ts` - FIX-F's boundary
- so the rule is enforced where it is read: a snippet identical to the title renders nothing.

- Before: "PROJECTS / Schools for Empowerment / Schools for Empowerment".
- After, `/en/search?q=school`: 14 results, none repeating its title; the two impact stories and the
  three pages that have a real excerpt still show it. Same on `/km`.
  `g-shots/f9-search-results.png`.

## F12 - the thank-you page thanked anyone who typed the URL. Closed.

The loader now looks the order up first and throws `redirect()` to `/donate` when there is no
`order` in the query or when `payments.status` does not know it. No new verification scheme: the
route already had the only evidence a real return leg carries.

- Before: `/en/donate/success` with no query string → 200, "Your gift is confirmed".
- After: `/en/donate/success` → `/en/donate`, `/km/donate/success` → `/km/donate`,
  `?order=made-up` → `/en/donate`. A row inserted into `donations` in the scratch copy with
  `order_id = g-test-order, status = paid` renders the page at
  `?order=g-test-order`. `g-shots/f12-donate-success-redirect.png`,
  `g-shots/f12-donate-success-real-order.png`.
- Check: `src/routes/-donate.success.test.ts` drives the real loader over a stubbed context and
  asserts the redirect for both empty and unknown orders, plus the paid order still loading.

## F19 - the PDF reader showed a blank frame when the file 404s. Closed.

`<iframe>` cannot tell a missing cross-origin file from a present one: a 404 that returns an HTML
error page fires `load` like any other navigation. `<object type="application/pdf">` can - it fires
`error`. Measured in Chrome on the running site before writing the fix:

| source | `<object>` event |
|---|---|
| same-origin real PDF (`/uploads/f2e93886-….pdf`) | `load` |
| cross-origin real PDF (`pdfobject.com`, `css4.pub`) | `load` |
| same-origin missing file | `error` |
| `https://www.kapekh.org/annual-report-2025.pdf` (404, text/html) | `error` |

So the embed is now an `<object>`, and its error state replaces the frame with a message. React does
not wire `onError` for `object`/`iframe`/`embed` (it registers `load` only), so the listener is
attached through a ref callback with its own cleanup - a `vi.mock`-free jsdom probe confirmed
`onError` never fires there.

- Before: the dialog opened on an empty white frame with no message.
- After: "This document could not be loaded. It may have been moved or removed.", with "Open in new
  tab" still present as the escape hatch. `g-shots/f19-pdf-failed.png`. A real PDF is unaffected:
  `g-shots/f5-publication-reader.png`.
- Check: `PdfReader.test.tsx` - "says so when the document cannot be loaded".

## F8 - the breadcrumb said "KAPE". Half closed, and it was one line.

`section={page.parentTitle ?? siteShortName(settings)}` became
`section={page.parentTitle ?? page.title}` at all three `SubPage` call sites in `$.tsx`.

- Before: `/en/what-we-do` → `Home / KAPE`.
- After: `Home / What We Do`, `Home / Who We Are`, `Home / Media`, `Home / Opportunities`.
  `g-shots/f8-breadcrumb.png`.
- **Not fixed:** `/km/who-we-are/about` still renders `ទំព័រដើម / Who We Are`. `parentTitle` is
  resolved English-only in `src/server/repo/` and the fixture holds Khmer titles for only 8 of 39
  pages. Both halves are outside this job.

## Gates

| gate | result |
|---|---|
| `bunx tsc --noEmit` | silent |
| `bun run lint` | 8 errors, 0 warnings - the same 8 as the baseline, none in a file I touched |
| `bun run test` | 41 files, 382 tests: **380 pass, 2 fail**. Baseline before this job: 39 files, 375 tests, all green. |

The two failures are dictionary bookkeeping and neither can be fixed from this job - see below. Both
are in files owned by the i18n slices; every other test, including the three added here, passes.

## Dictionary keys - for whichever slice owns these modules

I defined nothing under `src/lib/ui-strings/`. Three keys need defining and one needs deleting, and
until then `no-brand.test.ts > seeds every UI string the product renders` and
`dictionary.test.ts > seeds no UI string the product does not render` stay red.

**Add** (call sites already carry the English fallback shown):

| key | English | suggested module, by existing family |
|---|---|---|
| `pdf.failed` | This document could not be loaded. It may have been moved or removed. | `site.ts` (holds `pdf.title`, `pdf.newTab`, `pdf.close`) |
| `publications.open` | Open the document | `sections.ts` (holds `publications.downloads`) |
| `videos.watch` | Watch the video | `sections.ts` |

**Delete**: `"forms.yourName"` at `src/lib/ui-strings/sections.ts:34`. Its only call site was the
placeholder form F2 removed; `ContactForm` uses `forms.name`. It is the whole of the
`dictionary.test.ts` failure.

## Content checklist - not code, not seeded here

1. **Three pages need a real form** built at `/admin/forms` and picked in the section's "Built form"
   field. Until then those sections render nothing.
   - `/en/opportunities/volunteer` - the page offers four roles (Field volunteer, Reading coach,
     Digital mentor, Translation & content), so: name, email, phone, province, availability, role
     pick, message, optional CV attachment.
   - `/en/opportunities/alumni` - name, programme and year, current occupation, email, phone,
     message.
   - `/en/media/e-newsletter` - email only; or drop the section, since the footer already subscribes
     to the same list.
   - `/en/opportunities/scholarship` posts to the general contact inbox today. It works, but a
     scholarship application wants its own form and its own fields.
   - Note for whoever does it: those three sections carry a stale `layout` of `subscribe`/`signup`,
     which the catalogue no longer offers, so the layout selector is hidden. Picking a built form is
     the way to restore them; deleting and re-adding the section gives the contact layout.
2. **The four publication PDFs 404.** `annual-report-2025`, `annual-report-2024`,
   `program-brochure-ngs`, `research-early-literacy` all point at `www.kapekh.org/<slug>.pdf`, which
   the host answers 404. Upload the files to the media library and re-point `meta.fileUrl`. The
   reader now says so plainly instead of hanging, but that is a message, not a document.
3. **The three video records point at the channel.** `video-ict-lab`, `video-digital-literacy`,
   `video-ai-training` all store `meta.youtube_url = https://www.youtube.com/@KAPECambodia`. Put the
   per-video watch URL in each and the player appears with no further code change.
4. **Khmer page titles.** 8 of 39 pages have one, which is why a `/km` breadcrumb still shows the
   English parent.

## Left for someone else

- `ResolvedPost` carrying `fileUrl` and `youtubeUrl`, which would drop the two extra listing queries
  the article route makes and remove the 24-publication cap on the detail page's file. Four lines in
  `src/server/repo/content.ts`; inside FIX-F's boundary this round.
- The search snippet preferring a non-title field, in `src/server/repo/search.ts`. Same boundary.
  The rule is enforced at the render layer meanwhile.
- The Khmer half of F8.
