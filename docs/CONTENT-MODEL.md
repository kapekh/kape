# KAPE CMS — Content Model (design proposal)

Derived from `docs/REQUIREMENTS.md` + customer conversation. Reviewable design; not yet implemented.

## Guiding decisions
1. **The CMS is mostly blog posts + rich pages + a custom navigation builder bound to pages.**
   Page bodies are **rich text (HTML)**, not a JSON block tree — no heavyweight page-builder.
2. **One `posts` table with a `type` + `meta` JSON** absorbs all listable content kinds
   (news, stories, announcements, jobs, documents, albums, videos, people/bios, events).
   Only genuinely tabular data (staff directory) and form submissions get dedicated tables.
3. **Languages are data, not schema.** New languages must be addable at runtime with **no
   migration and no redeploy** → language set + all translations are stored as rows.

## i18n model (runtime-extensible)

```
languages(
  code        TEXT PRIMARY KEY,   -- BCP-47: 'en','km','fr','th'
  name        TEXT NOT NULL,      -- 'English'
  native_name TEXT NOT NULL,      -- 'ខ្មែរ'
  is_default  INTEGER NOT NULL,   -- exactly one; the fallback language
  enabled     INTEGER NOT NULL,   -- show in switcher
  rtl         INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0
)

-- Every translatable TEXT field of every entity lives here (EAV).
translations(
  id          INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,      -- 'post' | 'page' | 'nav_item' | 'media'
  entity_id   INTEGER NOT NULL,
  field       TEXT NOT NULL,      -- 'title' | 'body' | 'excerpt' | 'label' | 'caption' | 'slug'
  lang        TEXT NOT NULL REFERENCES languages(code),
  value       TEXT NOT NULL,
  UNIQUE(entity_type, entity_id, field, lang)
)
-- index (entity_type, entity_id) for one-query hydrate.

-- UI chrome strings (replaces hardcoded i18n.tsx dictionary).
ui_strings(
  key   TEXT NOT NULL,            -- 'nav.home', 'footer.newsletter'
  lang  TEXT NOT NULL REFERENCES languages(code),
  value TEXT NOT NULL,
  PRIMARY KEY(key, lang)
)
```

**Adding a language** = insert into `languages` + provide `translations`/`ui_strings` rows (via the
admin UI). No schema change, no code change. Untranslated fields fall back to `is_default`.

**Resolver:** a data-layer helper hydrates all translation rows for an entity set in one query and
resolves `requestedLang → defaultLang`. The language switcher renders from `languages`.

## Core content

```
posts(
  id            INTEGER PRIMARY KEY,
  type          TEXT NOT NULL,     -- news|story|announcement|job|document|album|video|person|event|internal_news
  slug          TEXT NOT NULL UNIQUE,   -- language-neutral canonical; localized slug optional via translations.field='slug'
  status        TEXT NOT NULL,     -- draft|published|archived
  cover_media_id INTEGER REFERENCES media(id),
  author        TEXT,
  published_at  TEXT,
  deadline      TEXT,              -- nullable; jobs/announcements auto-hide past this
  meta          TEXT,              -- JSON: type-specific non-text fields
                                   --   job: {location, employment_type}
                                   --   document: {pdf_media_id, read_count, download_count}
                                   --   video: {youtube_url, duration}
                                   --   person: {section: board|smt|pm, order}
                                   --   event: {start, end, program}
  created_at    TEXT, updated_at  TEXT
)
-- translatable: title, excerpt, body (+ optional slug) -> translations(entity_type='post')

pages(
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL,     -- draft|published
  hero_media_id INTEGER REFERENCES media(id),
  created_at    TEXT, updated_at  TEXT
)
-- translatable: title, body -> translations(entity_type='page')

nav_items(
  id          INTEGER PRIMARY KEY,
  parent_id   INTEGER REFERENCES nav_items(id),  -- arbitrary nesting
  sort        INTEGER NOT NULL DEFAULT 0,
  target_kind TEXT NOT NULL,       -- page | post_list | post | url | view
  target_ref  TEXT NOT NULL,       -- page slug | post type | post slug | URL | system-view key
  visible     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT, updated_at  TEXT
)
-- translatable: label -> translations(entity_type='nav_item')
-- "custom navigation bound to pages": each node points at a page, a post-listing, a URL, or a
--    built-in view (gallery, document library, contact form, staff directory...).

media(
  id           INTEGER PRIMARY KEY,
  r2_key       TEXT NOT NULL,      -- object key in Cloudflare R2
  url          TEXT,               -- public URL (if public bucket / custom domain)
  content_type TEXT, size INTEGER, width INTEGER, height INTEGER,
  created_at   TEXT
)
-- translatable: alt, caption -> translations(entity_type='media')

post_media(post_id, media_id, sort)   -- galleries/albums, ordered attachments
```

## Structured / non-post tables

```
staff(            -- Staff Directory (genuinely tabular; bilingual handled by explicit columns per spec)
  id, staff_no, name_km, name_en, sex, phone, email, program, photo_media_id, sort )

-- Form capture
contact_submissions(id, name, email, phone, message, created_at)
newsletter_subscribers(id, email, created_at)
alumni_registrations(id, ...fields..., created_at)

-- Counters
page_views(...) / visitor_daily(date, count)   -- visitor stats; doc read/download counts live in posts.meta
```

## Structured entities vs taxonomies (audited)

Not everything is a post/page. Classification:

- **Entity tables** (rich attributes + relationships): `projects` (the "programs" — code, status current/past, donors, logo, map locations), `donors` (+ `project_donors` M:N), `partners` (category via term), `offices` (province via term, lat/lng), `project_locations` (About map pins), `hero_slides`, `stats`, `site_settings` (kv: contact/socials/copyright/youtube).
- **Announcements are NOT a separate table** — they're `posts` of type `announcement` (full title/body/translations/publish state) with `meta.deadline` (hides the floating homepage card after that date) and optional `meta.link`. The public read is `site.announcement` → soonest active, else newest evergreen.
- **Taxonomies** (flat `terms` rows): `publication_category`, `doc_category`, `partner_category`, `person_section`, `tag`, plus `location` (provinces). NOT `program` — that's the `projects` entity; `event.program`/story should be a **relation to projects**, not a term.
- **Relations to fix**: document/publication file → `media` FK (not a URL string); post `coverMediaId`.
- **Existing tables to wire**: `visitor_daily` (page-view tracker), `slug_redirects` (301 on old slug).

Seeded: 6 projects, 5 donors, 5 partners, 4 offices, 7 stats, 3 hero slides, 2 announcement posts,
2 project locations, 7 site settings, terms across 6 taxonomies.

## Auth (separate concern, not designed here)
Three tiers — public / staff (internal portal) / CMS admin. To be designed next; affects `posts`
(internal_news), `staff`, and the whole admin surface.

## Resolved decisions

### 1. Language via search query param (`?lang=`)
Language is a **search/query param** (e.g. `/who-we-are/about?lang=km`), not a path prefix or cookie.
- Validated at the root route (TanStack Router `validateSearch`, e.g. `{ lang?: string }`); falls
  back to the `is_default` language when absent or not `enabled`.
- **Read on the server** so SSR renders the correct language on first byte (replaces the current
  client-only/localStorage approach in `i18n.tsx`).
- The `LanguageSwitcher` navigates by updating the `lang` search param (preserving the path), so
  links are shareable.

### 2. One canonical, editable slug
- `posts.slug` / `pages.slug` are single, language-neutral, and **editable** in the admin.
- Because editing a slug would break existing links, add a redirect table so old URLs keep working:
  ```
  slug_redirects(id, entity_type, from_slug, to_entity_id, created_at)
  ```
  Public route loader: resolve slug → entity; on miss, check `slug_redirects` → 301 to current slug.

### 3. Rich text stored as editor JSON, rendered to HTML on the server
- Editor produces **structured JSON** (ProseMirror/Tiptap document); the JSON is what's saved.
- The translatable `body` field stores this JSON string in `translations.value`
  (`field='body'`) — `value` is TEXT, so JSON lives there fine.
- **Server-side render JSON → HTML** for SSR. Use `@tiptap/static-renderer` (renders a ProseMirror
  doc to an HTML string from the extension set **without a DOM/jsdom**, so it works under the Bun
  server) rather than `@tiptap/html`'s `generateHTML` (which needs a DOM polyfill).
- Editor (client/admin only): `@tiptap/react` + StarterKit + the extensions we enable (image, link,
  heading, lists, table, etc.). The **same extension list** must be shared between editor and
  server renderer so JSON ↔ HTML stays consistent.
- Trusted-admin content + a fixed extension allow-list keeps XSS surface small; still sanitize the
  rendered HTML output.

> Implication: `posts.body` / `pages.body` are ProseMirror JSON, not HTML. Plain non-rich fields
> (title, excerpt, nav label) remain plain text.
```
