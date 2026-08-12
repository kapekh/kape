# Inline editing on the live site

A plan, not a task list. Jobs 1, 2 and 5 have landed; jobs 3, 4, 6, 7 and 8 are unstarted.
This round runs **after** the admin redesign lands, because it needs logic changes that the redesign round explicitly forbids.

## What it is

A signed-in admin browsing the public site sees edit affordances in place.
Click a heading, a section field or a UI string, edit it where it lives, save, and the page updates.

## Why it is a separate round

Three of the four pieces cannot be built inside "markup, styling, copy and states only".

| Piece | Why it is logic |
|---|---|
| Knowing the visitor is an admin | The public site resolves no session at all today |
| Addressing a field from the DOM | No `data-*` marker exists anywhere in the public output |
| Saving a page field | The write path deletes and reinserts every translation row |

## What exists to build on

| Asset | Where |
|---|---|
| Session validation | `src/server/auth.ts:98-124`, `validateToken(db, token)` |
| The only pattern that sees a cookie during SSR | `src/routes/admin.tsx:55-72`, `createServerFn` + `getCookie(SESSION_COOKIE)` |
| Section identity in the DOM | `src/components/sections/SectionRenderer.tsx:2156`, `id={s.id}` on the wrapper |
| A clean single-field mutation | `adminSettings.setUiString`, `src/integrations/trpc/router.ts:947-954` |
| Optimistic concurrency | `expectedUpdatedAt` compare-and-swap, `src/server/repo/admin.ts:748-770` |
| Cache invalidation, free | `src/integrations/trpc/init.ts:77` clears the whole render cache on any admin mutation |
| Section translation writer to copy | `src/components/admin/SectionsBuilder.tsx:574-584` |

## The four problems, in the order they must be solved

### 1. SSR does not know who you are

The tRPC client is a module-level singleton whose SSR base URL is `http://localhost:${PORT}/api/trpc` with no `headers` function (`src/integrations/tanstack-query/root-provider.tsx:9-24`).
A server-rendered loader call is an outbound HTTP request carrying no browser cookies, so `auth.me` during SSR returns `null`, always.

**Approach.** One `createServerFn` in the root loader, modelled on `admin.tsx:55-72`, threading an `isAdmin` flag into a context beside `LanguageProvider` (`src/routes/__root.tsx:171`).
Cost per anonymous request is near zero: `validateToken` short-circuits on the missing cookie.

**The trap.** Today every public response for a given `(lang, path)` is byte-identical, and two things depend on that.
`scripts/prerender-static.ts` writes `dist/static/<path>/index.html` for CDN serving, and the render cache key is `FORMAT::lang::path` with no user dimension (`src/server/render-cache.ts:23-24`).
Editor chrome baked into SSR output would ship to the public.

**Therefore.** Resolve the flag server-side, render edit affordances client-only after hydration.

### 2. Nothing in the DOM points back at a row

Zero `data-*` attributes exist across `SectionRenderer.tsx`, `SubPage.tsx`, `$.tsx` and `Header.tsx`.

The addressing tuple that has to be injected:

```
{ entity: "page" | "post" | "album" | "person" | "project",
  entityId: number,
  lang: string,
  target: "field:title"
        | "section:<sectionId>:props.title"
        | "section:<sectionId>:props.items[3].title" }
```

`entityId` is already in loader data for every kind.
It is simply never passed down: `SectionRenderer` takes only `{sections}` (`:2138`), and templates receive `{...s.props}` spread flat (`:2149`), losing `s.id`, `s.type` and the index.

**Scope.** Thread `entityId` and `lang` into `SectionRenderer`, then emit markers in 21 templates across 2,166 lines.
This is the bulk of the work.

**Two complications on headings specifically.**
`renderTitle` (`:56-72`) splits a title into spans and turns `*text*` into an italic accent span, so a contenteditable must serialize back to the asterisk form.
`Heading` (`:78-109`) renders eyebrow and title as siblings and decides `h1` vs `h2` from context, so the tag name is not a field marker.

### 3. Three kinds of content, three different saves

| Kind | Source | Write | Difficulty |
|---|---|---|---|
| UI strings | `ui_strings` table | `setUiString(key, lang, value)`, upsert, empty value means reset | **Usable as-is** |
| Section fields | `pages.sections` JSON, translations at `props.i18n[lang][field]` | Only through `adminPages.update` | Medium |
| Page/post fields | `translations` table, EAV | Only through `adminPages.update` | **Hardest** |

**The page-field hazard, stated plainly.**
`pageInput` (`router.ts:684-699`) requires the entire `sections` array and the entire `translations` array for every language.
`updatePage` deletes every translation row for the page (`admin.ts:775-779`) and reinserts from the payload (`:780-781`).
Any language or field omitted from the payload is destroyed.

So an inline save of one heading must first read the whole record back through `getPageForEdit` (`admin.ts:607-640`), merge one field, and send everything, exactly as `admin.pages.$id.tsx:36-45` does.
Two admins editing different fields of the same page will collide; `expectedUpdatedAt` turns that into a refusal rather than a silent loss, which is the correct outcome and must be surfaced in the inline UI.

**Alternative worth costing first:** a narrow `adminPages.updateField` procedure that writes one translation row.
It must be an `adminProcedure` so cache invalidation stays automatic.
This is more work up front and removes the destructive read-modify-write from every inline save. My recommendation is to build it.

### 4. UI string keys are not knowable in the DOM

`t()` returns a bare `string` (`src/lib/i18n.tsx:35-38`) interpolated into JSX text.
No wrapper, no marker.
Call sites also pass it to `alt=`, `aria-label=` and `title=`, so `t()` cannot start returning a node.

Compounding it, `src/lib/ui-strings/dictionary.test.ts:61-69` asserts every seeded key appears as a quoted literal in source, so any refactor must keep keys literal at the call site.

**Approach.** A separate marked variant used only where the string renders as visible text, leaving `t()` alone.
This one is worth prototyping before committing.

## The language trap, which affects all three kinds

Resolution layers the default language first, then overrides with the requested one (`src/server/repo/i18n.ts:65-77`).
For sections, the overlay map is deleted before it reaches the client (`src/server/repo/sections.ts:141`).

So on `/km/about` with no Khmer title, the screen shows **English** while the correct edit target is a **new Khmer row**, and nothing in the payload distinguishes "translated" from "fell back".

An inline editor that does not solve this will silently overwrite English text when an admin thinks they are writing Khmer.
**The fallback signal has to be added to the resolved payload before any inline editing ships.**
This is the single highest-risk item in the round.

**Job 1 closed it.** Every resolved payload now carries `i18nFallback: string[]`, the fields showing the default language because the requested one has no row: on the five entity payloads, on section props, per photo caption as `captionFallback`, and on the UI dictionary as `stringsFallback` (read through `useLang()`).
A person's `name` is in there too, though it lives in a column pair rather than a translations row.
The list only names fields the page is actually showing, so a field that is empty in every language is absent from it.

Also: the language switcher does a hard `window.location.assign` (`src/lib/i18n.tsx:99-105`), so unsaved inline state is lost across a language change.

## Suggested sequence

| # | Job | Depends on |
|---|---|---|
| 1 | ~~Fallback signal in the resolved payload, both for translations and for section `i18n` overlays~~ **done** | - |
| 2 | ~~Admin identity, client-only affordance gating, prerender safety~~ **done** | - |
| 3 | Narrow `updateField` procedure, or a documented decision to use the wholesale path | 1 |
| 4 | Addressing: thread `entityId` and `lang` into `SectionRenderer`, markers in 21 templates | 2 |
| 5 | ~~Inline editor for UI strings, the easiest, shipped first as the proving ground~~ **done** | 2 |
| 6 | Inline editor for section text fields | 3, 4 |
| 7 | Inline editor for page and post fields | 3, 4 |
| 8 | Static prerender invalidation, the second cache the DB bust does not reach (`scripts/prerender-static.ts:20-25`) | 3 |

Job 5 before 6 and 7 is deliberate.
UI strings already have a clean single-field mutation, so it proves the identity, addressing and affordance layers with none of the save risk.

## Jobs 2 and 5, as built

Identity is resolved **in the browser, never during SSR**, which is what keeps a cached or prerendered page identical for everyone.
Login sets a second cookie, `cms_admin=1`, readable by JS and granting nothing; the session cookie stays `HttpOnly`.
`InlineEditProvider` calls `auth.me` after hydration only when that hint is present, so an anonymous visitor makes no extra request and a forged hint costs one refused lookup.
Every affordance is gated on the answer, and every save on `adminProcedure`, so the cookie is a hint and not a permission.

`InlineEditBar` is the only chrome: a switch, off until asked, remembered in `localStorage`, plus the box for whatever is selected.
`<T k="…" />` (`src/components/T.tsx`) is the marked variant of `t()`; `t()` itself is untouched, because half its call sites are `alt`, `title` and `aria-label`.
It renders bare text unless edit mode is on and the user holds `settings`, and it is a `span[role=button]` rather than a `<button>` because these strings sit inside links.

Two things the browser caught that the plan did not predict:

- A key with **no row in any language** shows its built-in default, so it is absent from `stringsFallback` and the box would have opened empty with nothing said. The editor now quotes whatever the page is showing whenever the row for this language is missing, either way.
- The quote has to be the **unfilled** string. `footer.visits` reads `Today: {today} · Total visits: {total}`, and quoting the rendered line would have taught the translator to drop the slots.

Converted so far: the header and footer's visible strings. The rest of the site's `t()` call sites still render plain text.

## Open questions for that round

1. Does an inline edit publish immediately, or does it draft? **Immediately**, as job 5 shipped: `setUiString` writes the row and `adminProcedure` clears the render cache.
2. What does an editor see on a page whose content falls back to English? **Always the language in the URL.** On `/km` the box writes a `km` row, starts empty, and quotes the English beside it as reference. Editing the English means going to `/en`.
3. Does the affordance appear always, or behind a mode toggle? **A mode toggle**, off by default.
4. Do we build `updateField`, or accept read-modify-write on every save?
