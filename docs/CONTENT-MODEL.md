# Content model

What the schema is and why it is shaped that way.
`src/server/schema.ts` is the authority; this explains the decisions behind it, which the column list cannot.

## Guiding decisions

1. **A page is an ordered list of sections; a post is a row with a type.**
   Free-form pages are composed in the builder from a catalogue of section templates.
   Listable content - news, stories, jobs, documents, albums, videos, events - is one `posts` table keyed by `content_type`, because a list of them is the same query with a different filter.
2. **Languages are data.**
   A new language is an INSERT, with no migration and no redeploy.
   The one exception is the router's prefix list, which is a constant because route definitions are synchronous - see `src/lib/i18n-config.ts` and the note at the end of this file.
3. **Domain entities are modules.**
   Projects, schools, partners, offices, fundraising and the org chart are entities some organisations keep and most do not.
   Their tables ship with every install and an operator turns each one on in `/admin/modules`; turning one off hides its admin, refuses its router and withdraws its query sources, and deletes nothing.
4. **Every table carries `tenant_id`.**
   One database can hold more than one site.

## i18n

```
languages(code PK, name, native_name, is_default, enabled, rtl, sort)

translations(id, tenant_id, entity_type, entity_id, field, lang -> languages.code, value)
  UNIQUE(entity_type, entity_id, field, lang), INDEX(entity_type, entity_id)

ui_strings(tenant_id, key, lang, value)
```

Every translatable TEXT field of every entity is a `translations` row: `title`, `body`, `excerpt`, `label`, `caption`, `alt`, and optionally `slug`.
No entity gets a per-language column.
A resolver hydrates an entity set's translations in one query and falls back from the requested language to the `is_default` one.

`ui_strings` is the site chrome - button labels, section headings, form errors - so the words around the content are editable too.
`src/lib/ui-strings.default.ts` is what a fresh install writes, and `no-brand.test.ts` fails if it seeds a key nothing renders.

**URLs are language-prefixed**, every language including the default: `/en/who-we-are/about`, `/km/who-we-are/about`.
An unprefixed path redirects to the default language.
The prefix is read on the server, so SSR emits the right language on the first byte.
This replaced an earlier `?lang=` search param, which could not be cached per language and gave every language the same URL.

## Content

```
posts(id, tenant_id, content_type -> content_types.key, slug, status,
      cover_media_id, author, published_at, deadline, meta JSON)
  translatable: title, excerpt, body, slug

pages(id, tenant_id, slug, parent_id, segment, sort_order, status,
      hero_media_id, sections JSON)
  translatable: title, body
  UNIQUE(tenant_id, slug)

nav_items(id, tenant_id, parent_id, sort, target_kind, target_ref, visible, image_media_id)
  translatable: label

media(id, tenant_id, r2_key, url, content_type, size, width, height)
  translatable: alt, caption

post_media(post_id, media_id, sort)
slug_redirects(id, tenant_id, entity_type, from_slug, to_entity_id)
render_cache(key, tags, ...)
```

`pages.slug` is the full path and the lookup key; `parent_id` and `segment` are the tree the admin reorders, and the slug is recomputed from them.
Renaming a page writes the old path into `slug_redirects`, so an existing link 301s instead of 404ing.

`posts.meta` holds the non-text fields a type needs and nothing else does: a job's location, a document's file and counters, a video's URL, an event's dates.
Anything with real relationships is an entity table instead, not a JSON blob.

`content_types` is a table rather than an enum so that types can become user-defined without reshaping `posts`.

### Sections

`pages.sections` is a `SectionNode[]`: an id, a template `type`, a `layout` variant, authored `props`, and for dynamic sections a `query`.
The route loader resolves each `query` server-side into `props.data`, which is what keeps a data-driven page server-rendered and indexable.
`src/lib/sections.ts` declares the catalogue - the template list, each one's fields and layouts, and which query sources it accepts.

Rich text is Tiptap/ProseMirror JSON, stored as the `translations.value` of the `body` field and rendered to HTML on the server with `@tiptap/static-renderer`, which needs no DOM.
Editor and renderer share one extension list, so what is stored and what is shown cannot drift.

## Entities, taxonomies and the rest

**Entity tables** have attributes and relationships of their own: `projects` (+ `project_donors`, `project_locations`), `donors`, `partners`, `offices`, `schools`, `people`, `org_nodes`, `campaigns` (+ `donations`), `hero_slides`, `stats`.
Each belongs to a module.

**Taxonomies** are flat `terms` rows with a `taxonomy` column - categories, sections, tags, locations.
A term is a label to group by.
When the thing being grouped by has its own attributes, it is an entity, not a term.

**Configuration** is `site_settings`, a key-value table: name, logo, contact details, socials, copyright, theme, enabled modules.
Nothing the site says about itself is in the source.

**Users** are `users`, `roles` and `sessions`; permissions are areas, not role-string checks.

**Capture** is `forms` + `form_submissions` for admin-built forms, plus the fixed `contact_submissions`, `newsletter_subscribers` and `alumni_registrations`.
`visitor_daily` is the page-view counter.

## The open edge

Adding a language is a row everywhere except the router.
`LANGS` in `src/lib/i18n-config.ts` is the set of path prefixes routes match, and TanStack Router builds those definitions synchronously, so it cannot await the table.
The sitemap and the prerenderer do read the table.
Until the router can be handed the list from the server context, a new language is one INSERT and one constant.
