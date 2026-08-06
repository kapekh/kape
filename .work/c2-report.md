# C2 - The code stops knowing it is KAPE

Branch `cms-core`, dev server on :3222 against `/tmp/c2.db` (copied from `kape.db` with `VACUUM INTO`).
The repo's `kape.db` was never opened by this job.

## Before inventory

`grep -rni kape src/` on a clean tree, excluding `src/server/seed/`: **164 lines across 69 files**.
Repo-wide including the seed: 346 matches in 78 files.
The raw list is at `/tmp/claude-1000/.../scratchpad/before-inventory.txt`; the counts below are the ones that matter.

| Group | Lines | Where |
|---|---|---|
| Meta, titles, descriptions, JSON-LD | 34 | `__root.tsx`, `$.tsx`, `structured-data.ts`, `llms[.]txt.tsx`, `$lang.contact`, `$lang.search`, `$lang.donate.*` |
| Header / Footer organisation lockup | 4 | `Header.tsx`, `Footer.tsx` |
| Seeded defaults | 16 | `ui-strings.default.ts`, `footer-defaults.ts`, `donate-defaults.ts` |
| Admin chrome and help copy | 22 | `admin.tsx`, `login.tsx`, `internalsources.tsx`, 12 admin routes and forms |
| Markers with the customer's name in the identifier | 30 | cookie, 20 CSS declarations, 2 localStorage keys, order-id prefix, `.kape-pin` |
| Env defaults | 2 | `env.ts` |
| Tests asserting brand strings | 8 | 5 test files |
| Prototype asset stubs | 9 | `src/assets/*.jpg.asset.json` |
| Comments | 8 | `schema.ts`, `styles.css`, `Header.tsx`, `AnnouncementPopup.tsx`, `SubPage.tsx` |

## After

`grep -ri kape src/` returns nothing outside `src/server/seed/` except two categories, both deliberate:

```
$ grep -ri kape src/ | grep -v '^src/server/seed/'
src/server/page-tree.ts: * KAPE's landings, static pages and home page live in ./migrate-tree.ts.
src/server/migrate-tree.ts: * KAPE's page-tree transforms: the collection landing pages, the static section
src/server/migrate-tree.ts: * KAPE fixture (`bun run seed:kape`), and re-runnable against KAPE's live database
src/server/migrate-tree.ts:    lead: "For more than thirty years, KAPE has walked alongside teachers, ..."
src/server/migrate-tree.ts:    eyebrow: "About KAPE",
src/server/migrate-tree.ts:    "KAPE is a local non-profit working primarily in the formal education sector ..."
src/server/migrate-tree.ts:    cta2Label: "Partner with KAPE",
src/server/migrate-tree.ts:    "KAPE — Kampuchea Action to Promote Education",
src/server/install.ts: * building on. No site content — see `bun run seed:kape` for the KAPE fixture.
src/lib/no-brand.test.ts:const BRANDS = [/kape/i, /kapekh/i];
```

- **9 lines in `migrate-tree.ts`, `page-tree.ts`, `install.ts`.** C1 owns all three and they are read-only for me.
  They are the KAPE fixture, so they belong with the rest of it. See the handoff below.
- **1 line in `no-brand.test.ts`.** That is the guard itself; the pattern it hunts has to appear in it.

Everything else in the 164 is gone: **154 lines removed from the product source.**

## The rule I applied

Three buckets, decided per site, not per string.

**A string becomes a setting only if an operator must be able to change it and it appears in rendered output.**
Almost all of them already had a key. I added exactly **two**: `site_name_short` and `site_description`.
Together with the existing `site_name_en`, `site_name_km`, `contact_email`, `contact_phone`, `address` and `copyright`,
those cover every title, meta description, `og:` tag, JSON-LD field, admin title, staff portal title and login heading.
Both new keys are editable on `/admin/footer` next to the organisation name, so an operator finds them where they already set the name.

**Everything an operator would never think to change gets a neutral in-code default and no setting.**
That is all admin help copy, every input placeholder (`you@example.org`), `FOOTER_DEFAULTS`, `DONATE_DEFAULTS`,
`defaultUiStrings`, `MAIL_TO` and `DATABASE_PATH`. A default is not a brand: the defaults ship generic and usable,
KAPE's actual values live in the database and are unaffected.

**Identifiers get renamed, not configured.** A cookie name is not content.

The alternative was a settings screen with sixty fields describing one organisation. `site_name_short` collapsing
`"KAPE"` and `"KAPE Cambodia"` into one key is the only place this rule cost anything, and the cost is listed below.

Two sites I deliberately did **not** convert:

- `theme-color: #1f4e79` in `__root.tsx` and the manifest. That is a colour, so it is C3's, and it does not grep as a brand string.
- `logo.png` / `favicon.ico` under `public/`. Files, not code; replacing them is an operator action, not a source change.

## What changed

### Strings

New `src/lib/site-identity.ts` is the single place brand identity is resolved:
`siteName`, `siteShortName`, `siteTitle`, `pageTitle`, `siteDescription`, `adminTitle`, `staffPortalTitle`, `siteInitial`.
Unconfigured, it answers `"Your organisation"` and never blank.

`__root.tsx`, `$.tsx`, `$lang.search`, `$lang.contact`, `$lang.donate.index`, `admin.tsx`, `login.tsx`,
`internalsources.tsx`, `llms[.]txt.tsx` now read settings in their loader and build their `head()` from it.
`site.settings` is already fetched by the root loader, so each of these is a query-client cache hit, not a second round trip.

`organizationLd` and `articleLd` take settings and omit any field the operator has not filled in, rather than guessing.
`structured-data.ts` no longer knows an email, a phone number or an address.

`mail.ts` builds the contact subject from the site name, and now declines to send when `MAIL_TO` is unset
instead of calling `sendMail({ to: "" })`.

`public/manifest.json` is deleted; `/manifest.json` is now served from `src/routes/manifest[.]json.tsx`
off the same settings, so an install that renames itself renames its home-screen icon too.

The nine `src/assets/*.jpg.asset.json` prototype stubs are deleted. Only `students.jpg` was imported anywhere
(as the home page's hardcoded `og:image`); the other eight were orphaned. Restore with `git checkout src/assets` if wanted.

`src/components/FormEmbeds.tsx` is deleted. It was a deprecated no-op with no importers.

### Markers

| Before | After | Note |
|---|---|---|
| `kape_session` cookie | `cms_session` | logs everyone out once; verified, I had to sign in again mid-run |
| `.prose-kape` | `.prose-body` | 20 declarations in `styles.css` plus 9 call sites, renamed in lockstep |
| `.kape-form-embed` | `.form-embed` | |
| `data-kape-form` | `data-form-embed` | see below |
| `.kape-pin` | `.map-pin` | |
| `kape-nav-folded` | `admin-nav-folded` | localStorage; admin sidebar reopens expanded once |
| `kape:announcements-dismissed` | `announcements-dismissed` | localStorage; one popup reappears per visitor |
| `KAPE-${uuid}` order id | `ORD-${uuid}` | safe: nothing parses the prefix |
| `./kape.db` default | `./cms.db` | see handoff |

On the order id: I checked every reader. `getDonationByOrderId`, `setDonationIntent` and the Baray webhook all
match the stored string with `eq`, and nothing anywhere splits on `-` or tests the prefix. Existing `KAPE-` rows
keep resolving unchanged; only new rows carry `ORD-`.

### `data-kape-form`, and why nothing needed migrating

The contract's premise was that the attribute is serialised inside authored HTML in the database. **It is not.**
I checked by dumping the whole database and grepping it:

```
$ sqlite3 /tmp/c2.db .dump | grep -c 'data-kape-form'
0
$ sqlite3 /tmp/c2.db .dump | grep -c 'formEmbed'
1
```

Rich text is stored as ProseMirror JSON (`{"type":"formEmbed","attrs":{"slug":"newsletter_signup"}}`) and rendered
to HTML at read time by `renderBody` / `renderToHTMLString`. The attribute is a render-time artefact. The node name
and the `slug` attribute are untouched, so every stored document is unaffected by the rename. There is nothing to migrate.

There **was** a real break, in a place the contract did not name: `render_cache` stores the rendered route payload,
`bodyHtml` included, under a 7-day TTL that a deploy does not clear. A production instance would have served
pre-rename HTML to a post-rename `RichBody` for up to a week, and every embedded form on every cached page would
have degraded to a bare `▤ Form: slug` placeholder.

I fixed that at the root rather than teaching the renderer two dialects: `cacheKey` now carries a format version
(`v2::en::slug`). Stale rows become unreachable and age out. I chose this over accepting both attributes because
a compatibility alias for a derived cache is permanent cruft for a transient problem, and because the alias would
have had to name the customer in the shipped source forever.

Demonstrated both directions, live, against a warmed cache (`SSG_CACHE` on):

| Scenario | Result |
|---|---|
| Pre-rename entry under the old `en::who-we-are/about` key | ignored; a fresh `v2::` entry is written; page renders through `RichBody.tsx:58` and mounts `<FormRenderer/>`. **Form renders.** |
| Same old-marker payload forced under the current `v2::` key (what a rename with no version bump looks like) | `RichBody.tsx:30` fast path; raw `<div data-kape-form="newsletter_signup" class="form-embed">▤ Form: ...` dumped into the page. **Form broken.** |

The second row is the failure this job was warned about, reproduced deliberately to show the mitigation is load-bearing.

## Acceptance

### 1. Report with before inventory, rule, after count

Above. 164 before, 154 removed, 10 remaining and all accounted for.

### 2. `grep -ri kape src/` clean outside `src/server/seed/`

Command and output above. **Partially met.** Nine lines survive in `migrate-tree.ts`, `page-tree.ts` and
`install.ts` because C1 owns those files and I was told not to touch them. They are fixture, not product.
Handoff below.

### 3. KAPE's site unchanged with KAPE's values in settings

I put KAPE's values in (`site_name_short = "KAPE"`, `site_description = "Kampuchea Action to Promote
Education (KAPE) advances equitable, transformative education for children across Cambodia."`) and fetched
the same five URLs before and after, then diffed the rendered HTML with the SSR serialisation payload and
the visit counter normalised out.

**Visible body text is byte-identical on all five pages**: `/en`, `/en/what-we-do`,
`/en/news/ngs-ict-lab-opens`, `/en/who-we-are/about`, `/km`. Zero changed lines of rendered text.

Screenshots in `.work/c2-shots/before/` and `.work/c2-shots/after/`, 1440x1000 viewport, full page:
home, a content page, an article, the embedded-form page (footer visible in each), the admin shell,
the login page, the staff portal.

Two caveats on the screenshots, so nobody reads more into them than they carry:

- `before/01-home.png` captured only the hero fold; the capture ran before the lazy sections settled.
  Its `after` counterpart is the whole page. The hero matches line for line, and the byte-level text
  diff above covers the rest of the page properly. The other six pairs are matched.
- The announcement popup is open in the first `after` home capture and absent from the `before` one.
  That is the `kape:announcements-dismissed` to `announcements-dismissed` rename doing exactly what the
  table says it does, observed live rather than reasoned about. `after/01-home.png` was retaken with both
  announcements dismissed so the pair is comparable. The hero image differs between the two because the
  hero is a rotating slideshow, not because anything changed.

The head does differ, in six places, all invisible to a reader. This is the honest list:

| Tag | Before | After | Why |
|---|---|---|---|
| `og:site_name` | `KAPE Cambodia` | `KAPE` | one `site_name_short` key instead of two near-identical literals |
| `description` / `og:description` on pages with no excerpt | `KAPE — access, quality and equity in education across Cambodia.` | the `site_description` setting | one source for the site blurb |
| `description` / `og:description` on **home** | the hardcoded 385-schools sentence | the `site_description` setting | home had a route-level special case; SEO copy for a page now lives on the page |
| `og:image` on **home** | `picsum.photos/seed/kape-students/...` | `/logo.png` | the KAPE photo was a source import; home has no cover image set |
| JSON-LD `telephone` | `+855-42-941-481` | `042-941-481 / 042-941-918` | now the `contact_phone` setting, which is what the footer already shows |
| JSON-LD `areaServed`, `addressRegion`, `addressCountry` | present | dropped | no setting holds them; `address` is one free-text field and `streetAddress` carries it |

Two are restorable by C1 as content, with no code change: set the home page's **excerpt** to the old
sentence, and set a **cover image** on the home page. Both are more correct there than in a route file.
The rest are judgement calls I would make the same way again; if the client wants the granular
`PostalAddress` back it needs `address_region` / `address_country` settings, which I judged not worth two
more fields for two JSON-LD keys.

The JSON-LD script is still emitted **inside `<head>`**, in the same position. It moved from a React element
in `RootDocument` to the root route's `head().scripts`, because `RootDocument` is the shell and cannot safely
read loader data. Verified in the served HTML.

### 4. Empty settings renders without crashing, neutral, no `undefined`

Ran against a copy with `DELETE FROM site_settings` (0 rows). All routes 200. Screenshots in
`.work/c2-shots/blank-settings/`.

| URL | `<title>` |
|---|---|
| `/en` | `Your organisation` |
| `/en/what-we-do` | `What We Do — Your organisation` |
| `/en/news/ngs-ict-lab-opens` | `New ICT Lab Opens at a New Generation School — Your organisation` |
| `/login` | `Sign in — Your organisation Admin` |
| `/en/contact` | `Contact Your organisation` |
| `/en/donate` | `Donate to Your organisation` |

No blank titles. `undefined`, `null` and `NaN` absent from the rendered body of every one. The login mark
falls back to the site's first letter (`Y`) instead of the hardcoded `K`.

### 5. Embedded forms still render on a pre-change database

This is the one I was told to prove, so I built the evidence **before writing any code**.

On the unmodified tree I signed into the admin, created a form through the real form builder
(`newsletter_signup`), opened `/admin/pages/1`, added a rich-text section, and inserted a form embed with
the editor's own `▤ Form` control. The live editor DOM confirmed what it produced:

```
<div data-kape-form="newsletter_signup" class="kape-form-embed" ...>▤ Form: newsletter_signup</div>
```

I saved the page, confirmed the form rendered publicly, then froze that database to `/tmp/c2-prechange.db`
before touching a single source file. It is a real producer: TipTap, the real editor UI, a real save.

After the change, `/en/who-we-are/about` on that same database still renders the Newsletter signup form -
heading, intro, Email address field, Submit button - identical to the before shot. Compare
`.work/c2-shots/before/07-embedded-form.png` with `.work/c2-shots/after/07-embedded-form.png`.

Plus the cache experiment in the section above, which covers the failure mode the stored-JSON finding does not.

### 6. Runnable check that fails if a brand string returns

`src/lib/no-brand.test.ts`. Walks `src/`, skips the fixture, and fails with file and line for every hit of
`/kape/i` or `/kapekh/i`. I confirmed it actually catches things: on first run it failed with the exact nine
C1-owned lines, which is how I found `page-tree.ts` and `install.ts` in the first place. The exemption list
names those three files explicitly with a comment, so shrinking it back to the `seed/` directory is a
one-line change once C1 moves the fixture.

Add the next customer's name to `BRANDS` at onboarding and this catches it before it ships.

### 7. Gates

| Gate | Start | End |
|---|---|---|
| `bun run test` | 70 tests, 14 files, pass | **72 tests, 15 files, pass** |
| `bunx tsc --noEmit` | silent | **silent** |
| `bun run format` | clean | **clean** |

Two tests added by `no-brand.test.ts`. No existing test was weakened; `storage.test.ts` was strengthened -
it used to prove a path-traversal delete was refused by asserting `kape.db` still existed in the repo root,
which is both a brand string and a test that passes for the wrong reason on a machine that happens to have
the file. It now writes its own sentinel and asserts on that.

## Handoffs

**To C1 (seed):**

1. **Already handled, checked at the end of my run, no action needed.** `FOOTER_DEFAULTS`, `DONATE_DEFAULTS` and
   `defaultUiStrings` are now neutral placeholders, which would have blanked the fixture had it still inherited
   from them. It does not: C1 had by then spelt the settings out in `seed/site.ts` and forked the dictionary into
   `seed/ui-strings.kape.ts`, with `seed/base.ts` reading that instead of `defaultUiStrings`. The two changes
   landed independently and happen to fit. Worth a glance on merge, since it was luck rather than coordination.
2. **Two new settings keys to seed for KAPE**, in `seedSiteSettings()` in `src/server/seed/site.ts`:
   `site_name_short = "KAPE"` and
   `site_description = "Kampuchea Action to Promote Education (KAPE) advances equitable, transformative education for children across Cambodia."`
   Both work unseeded (neutral fallback), so nothing breaks if this is late.
3. **Two content values to seed to close the head diff in acceptance 3:** the home page's **excerpt**
   (the "For more than three decades ... over 160,000 lives." sentence) and a **cover image** on the home page.
4. **`top.contact` is gone from `defaultUiStrings`** (it still exists in your `ui-strings.kape.ts`, harmlessly).
   The header top bar reads `contact_phone` / `contact_email` from settings and renders nothing when both are
   empty; it used to fall back to the `top.contact` string, which meant an unconfigured install printed the
   literal key. The row can stay seeded, it is simply no longer read.
5. **Nine KAPE lines live in `migrate-tree.ts`, `page-tree.ts` and `install.ts`,** which you own. Moving that
   fixture copy under `src/server/seed/` finishes acceptance 2 and lets `no-brand.test.ts` drop its
   three-file exemption back to a directory.

**To whoever owns `.env.example` (C1):**

6. `DATABASE_PATH` default changed from `./kape.db` to `./cms.db`, and `MAIL_TO` default from
   `kape@kapekh.org` to empty. `.env.example` still documents the old values and needs updating.
   **This one has teeth:** any deployment relying on the default now opens a different, empty file.
   The repo's own `.env` pins `DATABASE_PATH=./kape.db`, so local work including C1's server on :3000 is
   unaffected, but `docker-entrypoint.sh` and the deploy need checking before this ships.

**To C3 (theme):** I renamed `.prose-kape` to `.prose-body` and `.kape-form-embed` to `.form-embed`
in `src/styles.css`, and removed the `/* Deep navy blue — KAPE trust */` comment. `theme-color: #1f4e79`
is untouched in `__root.tsx` and `src/routes/manifest[.]json.tsx`; both are yours to make configurable.

## Not done

- The nine fixture lines in C1's files. Blocked, not skipped.
- `public/logo.png` and `public/favicon.ico` are still KAPE's marks. Out of scope as source, but a fresh
  install ships them, so someone should decide whether the CMS wants a generic placeholder logo.
- The em dash in `siteTitle` and `pageTitle` (`Short — Full`, `Page — Brand`) is deliberate. The house rule
  bans em dashes in prose I write; changing this separator would alter every page title in the browser tab
  and break acceptance 3. It reproduces the existing rendered output rather than being new copy.
