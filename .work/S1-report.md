# S1 - public routes

Contracts: `.work/jobs/S1-public-routes.md` and `.work/jobs/SLICE-COMMON.md`.
Files: `src/routes/$.tsx`, `src/routes/$lang.search.tsx`, `src/routes/login.tsx`,
`src/lib/ui-strings/pages.ts`. No `-slice1.test.tsx` was needed.

**All 27 `new-key` rows are wired. 0 skipped.** The round trip works in both directions.

**One stop condition hit, not crossed: `bun run test` is red on one test, and the cause is three
now-dead keys in `src/lib/ui-strings/site.ts`, which is another slice's module.** Exact edit below.
Everything else in the suite passes.

## What changed

`src/lib/ui-strings/pages.ts` — 32 keys, English only, no Khmer. The file's docstring described a
different slice's plan (contact/theme/media/map); rewritten to describe what it now holds. Every
English string is `keys.proposed.ts` verbatim; I changed none of them.

`src/routes/$.tsx` — twelve sites through `useT()`. Two additions worth naming:

- `COLLECTION_KEYS`, a prefix → key map, and `collectionLabel(t, label)`. The route resolver
  (`src/server/repo/route.ts`, not mine) hands the component the English `label`, not the prefix, so
  the key is found back through `COLLECTIONS`. An unrecognised label renders as it arrived — a stale
  English word beats a raw key on a live page.
- The keys are spelled out rather than built as `collection.${prefix}`, because `dictionary.test.ts`
  proves a key is read by finding it quoted in the source. A template literal would have passed
  nothing.

`src/routes/$lang.search.tsx` — the three assembled sentences become slot-taking keys, and
`COLLECTION_KEY_BY_LABEL_KEY` maps the index's `search.kind.<prefix>` onto `collection.<prefix>`.
The inventory recommended pointing them at one namespace so a breadcrumb and a search result cannot
drift into two translations of one word; the index that emits `labelKey`
(`src/server/repo/search.ts`) is not mine, so the mapping lives at my call site instead. Proven
below: one key edit moved all three call sites at once.

`src/routes/login.tsx` — ten sites. `role="alert"`, `aria-describedby`, `aria-invalid` and the
`?redirect=` param are all untouched and still working (the round-trip screenshots go through this
page's sign-in). One structural change: `head` runs outside React and cannot reach the provider, so
the loader now also `ensureQueryData`s `i18n.bootstrap` — the same query key the root already uses,
so it is a cache hit, not a second round trip — and `head` reads `login.metaTitle` from it and fills
the one `{site}` slot with `.replace`. One slot, not a concatenation.

### Visible text changes

Two, both from `keys.proposed.ts`:

- The email placeholder on `/login` was `you@example.org`; the shipped default is now
  `you@email.org`. The inventory called this one "the odd man out" against `Footer:232` and
  `SectionRenderer:1021`.
- Search's "13 results" and "showing the first 10" are now single strings with slots rather than
  three fragments each. Same words in English; reorderable in Khmer, which was the point.

### Product neutrality

Nothing I seeded names an organisation, a country or a sector. `search.placeholder` is
`Search {site}` with the name in a slot; the `collection.*` values are content-type names
(`News & Events`, `Our Team`, …) that ship with the product. `no-brand.test.ts` passes — 9 tests.

## Acceptance

### 1. `bunx tsc --noEmit` — silent

```
=== TSC ===
0
```

Zero lines of output.

### 2. `bun run test` — red, on one test, for a reason outside my files

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/lib/ui-strings/dictionary.test.ts > the split dictionary > seeds no UI string the product does not render
 Test Files  1 failed | 37 passed (38)
      Tests  1 failed | 369 passed (370)
```

```
AssertionError: expected [ 'search.none', …(2) ] to deeply equal []
- Expected
+ Received
- []
+ [
+   "search.none",
+   "search.results",
+   "search.showingFirst",
+ ]
```

369 passing over 38 files, against the floor of 333 over 33. The baseline when I started was 370
over 38 — the one that changed is this test.

**Why.** The inventory told me to replace three assembled sentences with slot-taking keys:

| inventory row | was | now |
|---|---|---|
| `$lang.search.tsx:107` | `{t("search.none")} “{query}”.` | `search.noneFor` |
| `$lang.search.tsx:112` | `{total} {t("search.results")}` | `search.summary` |
| `$lang.search.tsx:114` | `— {t("search.showingFirst")} {limit}` | `search.showingFirstN` |

`$lang.search.tsx` was the only reader of the three old keys. They are defined in
`src/lib/ui-strings/site.ts:52,57,58`, which SLICE-COMMON puts out of scope ("the other modules in
`src/lib/ui-strings/`", "Never open another slice's module"). So my change orphaned three keys I am
not allowed to delete.

`no-brand.test.ts` and the other two `dictionary.test.ts` cases pass; only "seeds no UI string the
product does not render" fails.

**The exact edit, for whoever owns `site.ts`** — delete these three lines:

```
src/lib/ui-strings/site.ts:52:	"search.none": { en: "Nothing matched", km: "រកមិនឃើញ" },
src/lib/ui-strings/site.ts:57:	"search.results": { en: "results" },
src/lib/ui-strings/site.ts:58:	"search.showingFirst": { en: "showing the first" },
```

One thing to carry rather than drop: `search.none` has a real Khmer value, `រកមិនឃើញ`. It should
move into `search.noneFor`'s `km` as `រកមិនឃើញ “{query}”។` or whatever a Khmer speaker prefers — my
module ships English only by contract, so I did not write it. `src/server/seed/ui-strings.kape.ts`
carries the same three keys at lines 217/222/223; that file is the example-site fixture and is
exempt from the test, but it will go stale the same way.

Confirmed no other reader anywhere in `src/`:

```
$ grep -rn "search.none\|search.results\|search.showingFirst" src/ --include=*.tsx --include=*.ts \
  | grep -v ui-strings/site.ts | grep -v '\.test\.'
src/server/seed/ui-strings.kape.ts:217:	"search.none": …
src/server/seed/ui-strings.kape.ts:222:	"search.results": …
src/server/seed/ui-strings.kape.ts:223:	"search.showingFirst": …
```

### 3. `bun run lint` — 8 errors, 0 warnings

```
Checked 281 files in 253ms. No fixes applied.
Found 8 errors.
```

Unchanged from the baseline. I added no ninth.

### 4. Every row accounted for

The inventory lists **34 rows** across my three files, of which **27 are `new-key`**. All 27 wired,
0 skipped. 32 keys added (some rows share a key; one row carries two).

**`src/routes/$.tsx` — 14 rows, 12 `new-key`**

| line | text | class | key | status |
|---|---|---|---|---|
| 264 | `Explore →` | new-key | `nav.explore` | wired — arrow left in markup |
| 289 | `This section is being updated…` | new-key | `page.empty` | wired |
| 295 | `← Back to home` | new-key | `nav.backHome` | wired — arrow left in markup |
| 307 | `{r.label}` breadcrumb | new-key | `collection.<prefix>` | wired via `collectionLabel` |
| 326 | `{publishedAt} · {author}` | leave | — | left; separator plus two data fields |
| 339 | `label={r.label}` related rail | new-key | `collection.<prefix>` | wired via `collectionLabel` |
| 357 | `section={r.label}` album | new-key | `collection.galleries` | wired via `collectionLabel` |
| 359 | `Click any photo to view it larger.` | new-key | `album.lead` | wired |
| 370 | `section={r.label}` person | new-key | `collection.team` | wired via `collectionLabel` |
| 402 | `section="Not found"` | new-key | `error.notfound.section` | wired |
| 402 | `title="Page not found"` | new-key | `error.notfound.title` | wired |
| 404 | `This page doesn't exist or was moved.` | new-key | `error.notfound.body` | wired |
| 410 | `← Back to home` | new-key | `nav.backHome` | wired — same key as 295 |
| 174 | `{t("related.more", …)} {label}` | already-t | `related.more` | untouched; its `{label}` now arrives translated |

The `project` branch (`ProjectView section={r.label}`) was not a numbered row but is the same
`r.label`, so it goes through `collectionLabel` too — otherwise `collection.projects` would have had
no reader and the dictionary test would have failed on my own key.

**`src/routes/$lang.search.tsx` — 8 rows, 5 `new-key`**

| line | text | class | key | status |
|---|---|---|---|---|
| 49 | `"Search"` title fallback | already-t | `top.search` | left; a `head` fallback, not a render site |
| 63 | `t("top.search", "Search")` | already-t | `top.search` | untouched |
| 84 | `search.placeholder` | new-key | `search.placeholder` | wired — now `"Search {site}"` with the name in a slot |
| 100 | `t("search.prompt", …)` | already-t | `search.prompt` | untouched |
| 107 | `{t("search.none")} “{query}”.` | new-key | `search.noneFor` | wired — one sentence, `{query}` slot |
| 112 | `{total} {t("search.results")}` | new-key | `search.summary` | wired — `{total}` slot |
| 114 | `— {t("search.showingFirst")} {limit}` | new-key | `search.showingFirstN` | wired — `{limit}` slot; the `—` stays in markup |
| 121 | `t(r.labelKey, r.label)` | new-key | `collection.<prefix>` | wired — `search.kind.*` mapped onto `collection.*` at the call site |

**`src/routes/login.tsx` — 12 rows, 10 `new-key`**

| line | text | class | key | status |
|---|---|---|---|---|
| 12 | `Sign in — ${adminTitle(…)}` | new-key | `login.metaTitle` | wired in `head` from loader data; `{site}` slot |
| 39 | `Invalid email or password.` | new-key | `login.invalid` | wired |
| 44 | `Sign-in failed. Please try again.` | new-key | `login.failed` | wired; `body?.error` from the API still wins |
| 47 | `Network error. Please try again.` | new-key | `error.network` | wired |
| 63/66 | `siteInitial`, `adminTitle` | content | — | left; `site_settings` |
| 69 | `Sign in to manage the website.` | new-key | `login.subtitle` | wired |
| 84 | `Email` | new-key | `forms.email` | wired |
| 91 | `you@example.org` | new-key | `forms.emailPlaceholder` | wired; default is now `you@email.org` |
| 99 | `Password` | new-key | `forms.password` | wired |
| 106 | `••••••••` | leave | — | left; masking dots, not language |
| 118 | `Signing in…` / `Sign in` | new-key | `login.busy`, `login.submit` | wired — one row, two keys |
| 123 | `← Back to the site` | new-key | `nav.backSite` | wired — arrow left in markup |

Nothing in these three files renders only inside the admin, so there is no `skipped` row of that
kind. The root error and 404 screens (`__root.tsx:113-160`) were out of scope and are untouched.

### 5. The round trip, in a browser

Dev server already on `http://localhost:3011`; I started nothing. Key used: `error.notfound.title`,
from `$.tsx`, as the job file requires. Public page: `/en/s1-round-trip-does-not-exist`, which the
`$` route answers with a real 404 status.

**Before** — `.work/i18n/s1-shots/01-before-original.png`

```json
{ "url": "/en/s1-round-trip-does-not-exist", "h1": "Page not found",
  "body": "Home | / | Not found | Page not found | This page doesn't exist or was moved. | ← Back to home" }
```

**Changed in `/admin/ui-strings`** — the row exists without seeding, because the editor lists the
union of shipped defaults and stored rows:

```json
{ "newValue": "We could not find that page (S1 round trip)",
  "toasts": ["Saved error.notfound.title."] }
```

**After** — `.work/i18n/s1-shots/02-after-edit.png`

```json
{ "h1": "We could not find that page (S1 round trip)",
  "body": "Home | / | Not found | We could not find that page (S1 round trip) | This page doesn't exist or was moved. | ← Back to home" }
```

**Reset** — clearing the field returns it to the shipped default:

```json
{ "valueBeforeReset": "We could not find that page (S1 round trip)", "valueNow": "",
  "placeholderShowsDefault": "Page not found",
  "toasts": ["error.notfound.title in English is back to its default."] }
```

**Back to the original** — `.work/i18n/s1-shots/03-after-reset.png`

```json
{ "h1": "Page not found",
  "body": "Home | / | Not found | Page not found | This page doesn't exist or was moved. | ← Back to home" }
```

#### A second round trip, because the collection keys needed one

`collection.*` resolves to the same English as the fallback, so identical output proves nothing about
the wiring. Editing `collection.news` to `NEWSROOM (S1 probe)` and reloading:

```json
{ "crumb": "Home / / / NEWSROOM (S1 probe)",
  "relatedHeading": ["More from NEWSROOM (S1 probe)"],
  "searchPageShowsProbe": true }
```

One key, three call sites — the article breadcrumb, the "More from" rail and the search result kind —
which is what pointing `search.kind.*` at `collection.*` was for. Reset:

```json
{ "valueNow": "", "toasts": ["collection.news in English is back to its default."],
  "probeGoneFromPublic": true, "newsLabelBack": true }
```

Both keys are back to their defaults; the scratch DB carries no leftover override from this job.

#### The other wired surfaces, checked

```
/login          status=200  title: Sign in — KAPE Admin
                found: Sign in to manage the website
                found: Back to the site
/en/team        status=200  title: Our Team — KAPE
/en/search?q=school   placeholder "Search KAPE", "13 results",
                kinds: Projects, News & Events, Videos, Photo Galleries, Publications, Impact Stories, Page
/en/search?q=zzzznothing   "Nothing matched “zzzznothing”."
```

`Sign in — KAPE Admin` is `login.metaTitle` with its slot filled, rendered server-side from the
loader — the `head` path works.

### 6. What is left in my files

```
$ grep -nE 'placeholder="|title="|alt="|aria-label="' <my three files>
src/routes/$.tsx:216:									alt=""
src/routes/login.tsx:141:								placeholder="••••••••"
```

`alt=""` is a decorative image, correctly empty. The masking dots are the inventory's `leave` row.
A grep for JSX text literals across all three files returns nothing.

## Stop conditions

- **Hit and not crossed:** the three dead keys in `src/lib/ui-strings/site.ts`. I did not open it.
  Exact edit in section 2.
- No other slice's file was touched. `src/lib/i18n.tsx` and `src/lib/ui-strings.default.ts` are
  unchanged; `src/server/repo/route.ts` and `src/server/repo/search.ts` are unchanged, which is why
  both label mappings live at my call sites.
- The dev server stayed up; I started none.
- `kape.db` in the repo root is `e9789f59cb05f9f3426b9aba88001f9a`, unchanged. Everything ran against
  `.work/scratch/uitest.db` through the server on 3011.
- No `git` command that writes was run.

Next: `site.ts`'s owner deletes those three keys and the suite is green; a Khmer speaker carries
`រកមិនឃើញ` into `search.noneFor`.
