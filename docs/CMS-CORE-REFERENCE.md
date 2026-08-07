# CMS core - the reference

The fixed standard a critic compares real output against.
It is written before there is output to compare, so it cannot be bent to fit what a builder happened to produce.

Scope is **site-builder class**: a non-technical staffer at any organisation runs a whole website from the admin.
Runtime content-type design and a public delivery API are Stage C and are deliberately *not* graded here.

## How to use this document

A criterion passes only when it has been demonstrated **against a running application**.
Reading the source is not evidence, and neither is a repo-layer script.
This codebase has already been bitten twice by that: `render_cache` made a correct change look like it never landed, and a fixture that reproduced a bug's own symptom is how the team nearly shipped one.

Each criterion is written so the answer is yes or no, never a judgement.
Where a number appears, it is the number to measure.

## The organisation test

The single question behind every criterion below:

> Can a new organisation stand up a complete, branded, multilingual website on this core - content, navigation, media, forms, users and theme - **without a developer editing source and without a redeploy**?

Anything that forces a code edit is a finding, and *where* it forced one is the gap to report.

---

## 1. Tenancy and isolation

| # | Criterion | How to demonstrate |
|---|---|---|
| 1.1 | Two organisations coexist in one database with no cross-visibility of pages, posts, media, navigation, settings or users | Create tenant 2, author a page at the same slug as a tenant 1 page, load both |
| 1.2 | Saving a record in one organisation does not mutate another's translations | Tenant 1 page #N and tenant 2 page #N both translated; save tenant 1; tenant 2's translations intact |
| 1.3 | Two organisations with the same path serve different HTML from cache | Both author `/about`, request both twice, compare bodies |
| 1.4 | Deleting a language in one organisation leaves the other's translations alone | |
| 1.5 | The tenant is resolved from the request, in one place, not from a module constant | Grep must find no `const TENANT =` in `src/server/repo/` |
| 1.6 | No query path bypasses the tenant filter, including route files and scripts | `sitemap.xml`, `llms.txt`, prerender all scoped |

**Baseline today:** fails 1.1 through 1.6. `TENANT = 1` is 18 separate literals; `translations` is filtered nowhere; `render_cache` is keyed `${lang}::${path}`.

## 2. Branding and theme

| # | Criterion | How to demonstrate |
|---|---|---|
| 2.1 | Organisation name, logo, contact details, social links and copyright are data | Change each in admin, confirm on the public site and in JSON-LD, OG tags and `<title>` |
| 2.2 | A full re-skin needs no component edit | Swap the palette, confirm every section changes, including the CTA band and the donate landing |
| 2.3 | Dark mode is complete | No token defined in `:root` and missing from `.dark` |
| 2.4 | Fonts are configurable per organisation, including the script-specific stack | |
| 2.5 | No organisation's name appears in a CSS class, cookie name, storage key, database marker or order prefix | |
| 2.6 | Changing the primary colour changes `theme-color` | No independent hex literal |

**Baseline today:** ~105 hardcoded colour literals; the entire `Cta` section painted with 11 inline `oklch()` values that ignore `--primary`; 6 tokens absent from `.dark`; fonts a literal `@import`. 2.5 passes: the session cookie, the prose class and the form marker were all named after the first customer and are now `cms_`-prefixed.

## 3. Content and the page builder

| # | Criterion | How to demonstrate |
|---|---|---|
| 3.1 | An admin creates, nests, renames, reorders and deletes pages with no code change | |
| 3.2 | Renaming a page preserves its old URL as a redirect | |
| 3.3 | An admin composes a page from the section catalogue, reorders sections and previews before publishing | |
| 3.4 | Section props are validated server-side against the section's declared fields | Post a section with a bogus prop and an unknown layout; both rejected |
| 3.5 | An unpublished page is not reachable, and not indexable, by URL guess | |
| 3.6 | A missing page answers 404, not 200 | |
| 3.7 | The catalogue contains no organisation-specific section, or such sections are optional and removable | |

**Baseline today:** 3.1, 3.2, 3.3 and 3.6 pass. 3.4 fails - `props` is `z.record(z.string(), z.unknown())`, so nothing about props or layout is checked. 3.7 unresolved - 10 of 21 section types bind to a domain table or a content-type key (`projectList`, `partners`, `orgChart`, `map`, `directory`, `people`, `postList`, `videoGrid`, `albumGrid`, `publicationList`). The module registry makes their query sources optional, so what 3.7 now needs is a demonstration that a site with those modules off cannot place them, not another reading of the catalogue.

## 4. Media

| # | Criterion | How to demonstrate |
|---|---|---|
| 4.1 | Upload accepts image, video and document, and rejects by **content**, not extension | Rename a `.sh` to `.png` and upload; must be refused |
| 4.2 | An oversize file is refused before it is transferred in full | |
| 4.3 | Every asset carries alt text, editable, translatable, and rendered | |
| 4.4 | Uploaded video plays on the public site | |
| 4.5 | Media is findable by its original filename | |
| 4.6 | Deleting an asset in use is either refused with the list of usages, or succeeds and leaves no broken reference | Not "refused with a foreign-key error the user cannot read" |
| 4.7 | Images are served at a size appropriate to their slot | |

**Baseline today:** fails 4.1 through 4.7. No alt-text writer exists; `width`/`height` are declared and never written; no `<video>` element exists anywhere; filenames are discarded for UUIDs, so search cannot work; a referenced asset cannot be deleted at all.

## 5. Editorial safety

| # | Criterion | How to demonstrate |
|---|---|---|
| 5.1 | Any content change can be reverted to a previous version | |
| 5.2 | Who changed what, and when, is recorded for every mutation | |
| 5.3 | A deletion is recoverable | |
| 5.4 | A future publish date publishes in the future | Set tomorrow, confirm not live; not merely sorted differently |
| 5.5 | An editor previews a draft as it will appear, shareably | |
| 5.6 | Two editors on one record do not silently overwrite each other | |

**Baseline today:** fails all six. No revisions, no audit columns anywhere, no soft delete, no `publishedAt <= now()` predicate in any query, preview is builder-only and English-only, last write wins silently.

## 6. Access control

| # | Criterion | How to demonstrate |
|---|---|---|
| 6.1 | Every write path enforces the permission system, with no literal role-string checks | A role holding only `media` can upload |
| 6.2 | Authenticated surfaces are guarded server-side, not by a client redirect | `curl` the admin unauthenticated |
| 6.3 | A delegated role cannot escalate to the super-role | |
| 6.4 | Credential guessing is throttled | |
| 6.5 | A user can recover an account without an administrator | |
| 6.6 | An inbound webhook proves who sent it | |

**Baseline today:** 6.3 passes as of `e187089`. 6.1, 6.2, 6.4, 6.5, 6.6 fail.

## 7. Admin usability

Graded as a product a non-technical staffer uses daily, not as a set of forms that submit.

| # | Criterion | How to demonstrate |
|---|---|---|
| 7.1 | A rejected save leaves the form usable with the typed content intact | Save a duplicate slug |
| 7.2 | Navigating away from unsaved work warns, including on create forms | |
| 7.3 | A save confirms it saved | |
| 7.4 | Validation errors appear next to the field that caused them | |
| 7.5 | Every list supports search, sort and pagination, server-side | |
| 7.6 | The admin is usable on a tablet | |
| 7.7 | Interactive controls are reachable and operable by keyboard, and labelled | Reorder, row menus, the builder's split handle |

**Baseline today:** 7.1, 7.2, 7.3, 7.4, 7.5, 7.6 fail; 7.7 fails except in the sidebar. Only `/admin/media` has search or pagination of any kind. 75 of 86 admin files contain no `aria-` attribute.

## 8. Internationalisation

| # | Criterion | How to demonstrate |
|---|---|---|
| 8.1 | A third language is added entirely through the admin, and gets working URLs | |
| 8.2 | Every translatable field is translatable, with no per-language columns | |
| 8.3 | An RTL language renders right to left | `dir` set, logical properties used |
| 8.4 | Untranslated content falls back to the default language, visibly marked in admin | |
| 8.5 | Page-builder section text is translatable through the same mechanism as everything else, and is searchable | |

**Baseline today:** 8.1 fails on `LANGS = ["en","km"]`. 8.2 fails on six `*_km` columns. 8.3 fails completely - `rtl` is stored, edited, validated and dropped before it reaches the client. 8.5 fails - section text lives in a `props.i18n` overlay invisible to the translations table and to search.

## 9. Operations

| # | Criterion | How to demonstrate |
|---|---|---|
| 9.1 | A self-hoster deploys with a documented command and no source checkout | |
| 9.2 | The built image contains no source, no `.env`, no database | `docker history`, and a shell in the image |
| 9.3 | Content exports and re-imports into a fresh instance | |
| 9.4 | Concurrent writes do not fail or corrupt | Two editors saving simultaneously |
| 9.5 | A failure leaves a diagnosable trace | |
| 9.6 | An admin edit invalidates only what it changed | |

**Baseline today:** 9.1 partially passes. 9.2, 9.3, 9.4, 9.5, 9.6 fail. No `busy_timeout`, so a colliding write returns `SQLITE_BUSY` immediately; no transactions around multi-statement deletes; every mutation wipes the entire render cache.

---

## The exit test

Stage B is done when a second organisation is provisioned from nothing - its own tenant, theme, fonts, languages, navigation, users, content and media - **with zero edits to `src/`**.

That run is the acceptance test.
Every code edit it requires is a gap, and the largest one is what goes back to the builder.
