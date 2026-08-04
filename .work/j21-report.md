# J21 — five visitor-visible defects from the UX audit

Run in-parent on 2026-08-04. No worker pane; J21 never had a job file.

| finding | state |
|---|---|
| F04 announcement 1 buries the rest | fixed with J05, committed `1fdf941` |
| F14 keyboard focus leaves a mega panel before its links | fixed, demonstrated below |
| F23 chrome "Site Map" sends a human to raw XML | fixed, demonstrated below |
| F27 the same document reports two download counts | fixed, demonstrated below |
| F40 Contact/Donate revert the site to English | fixed, demonstrated below |

Every demonstration ran against a `VACUUM INTO` copy of `kape.db` at `DATABASE_PATH`, with `PORT`
exported to match the dev port. `kape.db` is unchanged: md5 `06fc0ac5…` before and after, 14 stale
`render_cache` rows and `annual-report-2025` at 128 downloads, as they were.

## F40 — the language prefix now covers contact and donate

The audit's correction had this as `needs-capability`, and it was right: prefixing the two hrefs
changes nothing while `$.tsx` 301s any prefixed functional path back to the bare one. The fix is the
routing change it asked for.

`contact` and `donate` were in the `FUNCTIONAL` regex in `lib/i18n-config.ts` alongside `admin`,
`login`, `api` and `uploads`. They do not belong there. They are public pages that happen to have
their own route file rather than a `pages` row; the staff app and the API genuinely have no
language. Dropping them from the regex and moving the five route files under a `$lang` segment makes
them behave like every other public URL.

- `routes/contact.tsx` → `routes/$lang.contact.tsx`
- `routes/donate{,.index,.success,.$campaign}.tsx` → `routes/$lang.donate*.tsx`

`$lang.donate.index.tsx` and `$lang.donate.$campaign.tsx` already called
`detectLang(location.pathname)` and were always getting `"en"` back — they were written expecting a
prefix that did not exist yet.

Two guards were needed:

- **A non-language first segment.** `/$lang/contact` also matches `/foo/contact`. The loaders on
  `$lang.contact.tsx` and `$lang.donate.tsx` (the layout, so it covers all three children) 301 to
  `/en/foo/contact` when `params.lang` is not in `LANGS` — the same rule `$.tsx` already applies to
  every unprefixed path. Verified: `/foo/contact` → 301 → `/en/foo/contact`.
- **The query string on the unprefixed 301.** The payment provider returns the donor to
  `/donate/success?order=…`, which now 301s to `/en/donate/success`. `$.tsx` was redirecting with
  `{to, params}`, which drops search. It now builds the href and appends `location.searchStr`.
  Verified: `/donate/success?order=abc` → 301 → `/en/donate/success?order=abc`.

Sweep, all on the scratch copy:

```
/km/contact                      200
/en/contact                      200
/contact                         301 -> /en/contact
/km/donate                       200
/en/donate                       200
/donate                          301 -> /en/donate
/donate/success?order=abc        301 -> /en/donate/success?order=abc
/km/donate/success?order=abc     200
/foo/contact                     301 -> /en/foo/contact
/en/admin                        301 -> /admin
/login                           200
/sitemap.xml                     200
/km/who-we-are/about             200
```

In a real browser, from `/km/who-we-are/about`: the two chrome links read `/km/contact` and
`/km/donate`; clicking Contact lands on `/km/contact` with `<html lang="km">`; the language switcher
there is live and moves to `/en/contact` and back. Same on `/km/donate`. With the mobile menu open
on a Khmer page, the only unprefixed internal href left anywhere in the document is `/login`.

`localizedHref` and `LanguageSwitcher.switchTo` needed no change — both consult `isFunctional`, so
they followed the regex.

**Residual, not fixed:** `/km/contact` and `/km/donate` render Khmer chrome around **English body
copy**. Those two pages hardcode their strings ("Contact Us", "Send us a message", "Give to what
moves you", …) instead of reading `ui_strings`. That is the same class of gap as J16's 48
untranslated card strings and it needs a native speaker, not a routing change. F40 as written — the
site silently reverting to English and stranding the visitor with an inert switcher — is closed.

**Also noticed, not fixed:** `sitemap[.]xml.tsx` builds from the `pages` and `posts` tables plus the
collection landings, so it has never listed `/contact` or `/donate`. Now that both have a URL per
language they are worth two `paths.add` lines. Nobody owns that file.

## F14 — focus no longer swaps the panel

The fix already in the tree removes `onFocus={() => setOpenId(...)}` from the mega-menu triggers.
Demonstrated by walking the tab order from an opened panel, and confirmed to discriminate by
temporarily putting `onFocus` back and walking it again.

With the fix — open "Who We Are" with Space, then Tab:

```
1 What We Do            open=Who We Are
2 Media & Publications  open=Who We Are
3 Opportunities         open=Who We Are
4 Contact               open=Who We Are
5 ♡ Donate              open=Who We Are
6 [PANEL] About KAPE    open=Who We Are
7 [PANEL] News and Events
8 [PANEL] Fact Sheet
```

With `onFocus` restored, same sequence:

```
1 What We Do            open=What We Do
2 Media & Publications  open=Media & Publications
3 Opportunities         open=Opportunities
4 Contact               open=Opportunities
5 ♡ Donate              open=Opportunities
6 [PANEL] Partner with KAPE   open=Opportunities
7 [PANEL] Job Vacancies & Careers
8 [PANEL] Alumni Network
```

That is F14 exactly: the panel a keyboard user opened is gone by the third Tab, and the links they
eventually reach belong to a different menu. Also verified that focusing a trigger no longer opens
anything — all four `aria-expanded` stay `false` until Space.

**Residual, not fixed:** the audit's phrasing was "panel links must follow their own trigger in the
tab order". They do not — the panel is a fixed overlay rendered outside `<header>` so its backdrop
frosts the page, so five stops separate a trigger from its own links. Every panel is now reachable
and stays open, which is the defect; the ordering is a second, smaller job (move focus into the
panel on open, and return it to the trigger on Escape, which would also close F15).

Note for the next keyboard run: the announcement modal opens on load and traps focus, so press
Escape before testing the header.

## F23 — the Site Map link is a predicate, not a deletion

`isPageHref` hides the top-bar Search and Site Map links when the setting points at a file rather
than a page. Both settings are `/sitemap.xml` in the seed, so both links are gone: zero `<a>`
elements matching `sitemap` on `/en`. The two remaining occurrences of the string "Site Map" in the
response are the dehydrated `ui_strings` dictionary, not markup.

Proved it is a predicate rather than a removal by setting `header_sitemap_link` to `/sitemap` and
`header_search_link` to `/search` on the scratch copy — both links reappear, language-prefixed:

```html
<a href="/en/search" …>Search</a>
<a href="/en/sitemap" …>Site Map</a>
```

Reverted both settings; anchors back to zero.

**Still true:** no `/sitemap` page exists. The link is correctly hidden rather than correctly aimed.
Authoring one is a single `pages` row — J03 registered a `siteMap` section for it.

## F27 — a public mutation now busts the cache it invalidates

`trackDownload` is a `publicProcedure`, so it never passed through `adminProcedure`'s blanket cache
bust. It now drops the `q:publications` tag itself.

Run with the render cache **on** (this defect is invisible with `SSG_CACHE=off`). Warm both pages,
then click the real download link on `/en/publications` in a browser:

| | DB | `/en/media/annual-report` | `/en/publications` |
|---|---|---|---|
| warm | 128 | 128 | 128 |
| after one download, with the fix | 129 | **129** | **129** |
| after one download, invalidation removed | 130 | **129** | **129** |
| after one download, fix restored | 131 | **131** | **131** |

Both cache rows carry `\|page:…\|q:publications\|`, and both are deleted by the mutation. The middle
row is F27 reproduced: the count moves in the database and neither page notices.

## Also in this commit

- **`getActiveAnnouncement` alias deleted.** J05 left
  `export const getActiveAnnouncement = listActiveAnnouncements` in `repo/site.ts` so that
  `trpc/router.ts` — not J05's file — kept compiling. J21 owns `router.ts`, so the call site now
  uses the real name and the alias is gone.
- **`src/lib/i18n-config.test.ts`** is new: six cases over `localizedHref`, `isFunctional` and
  `stripLang`, pinning that contact and donate are prefixed and that admin/login/api/uploads/static
  files are not. It fails on the old regex by construction. Suite is now **16 of 16 across 5 files**.

## Verification

`bunx tsc --noEmit` 0 errors. `bun run test` 16 passed. `bunx biome format` clean on all 11 touched
files. `routeTree.gen.ts` regenerated with `bunx tsr generate`. Lint was not run and not fixed — that
is J12.

**J11 (site search) is unblocked.** `Header.tsx` is committed.
