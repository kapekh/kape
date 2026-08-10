# FIX-G - the public site's dead ends

Six defects UAT-A found by walking the site as a KAPE visitor. Each one is a place where the site
promises something and delivers nothing. `.work/UAT-A-report.md` has the full repro for every one;
read it before you start.

## Files you own

- `src/components/sections/SectionRenderer.tsx`
- the public article route that renders a post detail (find it; it is what `/en/publications/…` and
  `/en/videos/…` land on)
- `src/routes/$lang.search.tsx`
- `src/routes/$lang.donate.success.tsx`
- `src/components/PdfReader.tsx`
- `src/components/SubPage.tsx` for the breadcrumb

Do not open `src/server/repo/` - FIX-F is there. Do not open any `src/lib/ui-strings/*.ts` module
or add dictionary keys; S5, S6 and S7 own the whole dictionary and a key defined twice fails
`dictionary.test.ts` by design. Where a string is genuinely new, use `t("some.key", "English")` with
the fallback and say in your report which keys you introduced call sites for, so the slice that owns
that module can define them.

## F2 - four published forms discard every submission. HIGH.

`SectionRenderer.tsx:1019` renders `<form onSubmit={(e) => e.preventDefault()}>` with no handler, no
state and no names on the inputs. It is a mock-up. It is live on `/en/opportunities/volunteer`,
`/opportunities/alumni`, `/opportunities/scholarship` and `/media/e-newsletter`, and a volunteer or
scholarship applicant who fills it in believes they have applied.

The section type already supports the real thing: when `props.formSlug` is set it renders
`FormRenderer`, and when `layout === "contact"` it renders `ContactForm`. The placeholder is the
third branch, for a section configured with neither.

**Root cause, not band-aid.** A form section with nothing behind it should not render a form. Decide
between rendering nothing, rendering a clearly non-interactive "not yet configured" state visible
only to an admin, and refusing to save such a section in the first place. Whichever you pick, the
public site must never show a visitor a text field that goes nowhere. Say which you chose and why.

Then check the four pages: each one wants a real form. Creating those forms is content work and not
yours - report what each page needs so it lands on the content checklist.

## F5 - publication detail pages hide the publication. HIGH.

`/en/publications/annual-report-2025` shows a title, a date, share buttons and a related rail. The
record carries `meta.fileUrl` and the page never renders it: no reader, no download, no file size.
`meta.fileUrl` is read on the listing sections only.

The listing already knows how to open a file in `PdfReader`. Give the detail route the same.

## F6 - video detail pages have no player. HIGH.

`/en/videos/video-ict-lab` renders 0 `<iframe>` and 0 `<video>`. The record carries
`meta.youtube_url` and the article route never reads it. `SectionRenderer.tsx:1292` has the ID
extractor already.

The fixture's three videos all store the channel URL rather than a video URL, so the extractor will
find nothing even after you fix the route - that half is content. Your half is that a record with a
real video URL renders a player. Prove it by putting a real video URL on one fixture record in your
own scratch copy, showing the player, and saying plainly that the fixture data is the other half.

## F9 - every search result prints its title twice. MED.

`/en/search?q=school` renders "Schools for Empowerment / Schools for Empowerment" - title, then the
same string again as the description. Records with a real excerpt render correctly, so this is the
fallback path firing for everything else. A missing excerpt should render nothing, not the title.

## F12 - the thank-you page thanks anyone who types the URL. MED.

`/en/donate/success` with no query string returns 200 and "Your gift is confirmed / We've received
your donation". A donor who bookmarks or reloads it gets a false confirmation of a payment that may
never have happened.

Without a valid order reference, redirect to `/donate`. Do not invent a verification scheme; the
route already knows what a real return leg carries.

## F19 - the PDF reader shows a blank frame when the file 404s. MED.

The dialog opens, the iframe is empty, and there is no message. The visitor waits. Give it a failed
state. This is the honest fix for a fixture whose PDFs point at 404s on the legacy site, and it
holds for any file that goes missing later.

## F8, if it is cheap - the breadcrumb says "KAPE". MED.

`/en/what-we-do` renders `Home / KAPE` instead of `Home / What We Do`, and on `/km` the parent
title stays English. If it turns out to be one line, take it. If it opens up the page-tree code,
leave it and report it - it is cosmetic next to the five above.

## Acceptance

Every fix gets a browser repro at the URL UAT-A named: what it did before, what it does now.
Screenshots into `.work/uat/g-shots/`.

Run against your **own** copy of the database under `.work/scratch/` on your **own** port. Do not
touch `.work/uat/uat.db` - that is the instance KAPE will use - and never open `kape.db`.

Gates before you report: `bunx tsc --noEmit` silent, `bun run test` at or above 370 tests over 38
files, `bun run lint` at 8 errors and 0 warnings. F2 and F12 both need a test that fails if the fix
is reverted - a visitor-facing dead end that comes back silently is exactly the kind of regression
this round exists to stop.

Report to `.work/FIX-G-report.md`.
