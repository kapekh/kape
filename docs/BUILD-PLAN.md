# KAPE CMS — Build Plan

Sequenced implementation roadmap. Companion to `docs/REQUIREMENTS.md` (what),
`docs/CONTENT-MODEL.md` (data model + resolved decisions), and `docs/LOVABLE-GAP-ANALYSIS.md`
(what the ported UI already covers).

> Stack: Bun + TanStack Start (SSR) + Drizzle/`bun:sqlite` + tRPC + R2 (`Bun.S3Client`) + shadcn/ui.
> (A Rust/Axum backend pivot was considered and dropped — we build on this stack.)

## Status

**Done & verified (Phases 1–7 + integrations):**
- Bun + Drizzle/`bun:sqlite` + tRPC + R2; TanStack Start SSR.
- Content schema (posts/pages/nav/translations/ui_strings/languages/media/staff/forms + tenant seam) + migration + seed + translation resolver.
- Rich text: Tiptap JSON stored, server-rendered to HTML (`@tiptap/static-renderer`).
- i18n: `?lang=` search param, DB-backed UI strings, runtime-addable languages, default fallback.
- Public site data-driven: DB nav tree (Header), generic page route, news + impact-story list/detail, leadership + bios, homepage news/stories — all bilingual SSR.
- Auth: JWT + revocable sessions (argon2), `protectedProcedure`/`adminProcedure`/`staffProcedure`.
- Admin CMS (`/admin`): Posts, Pages, Navigation builder, Media (R2 + local fallback), Languages, Staff — all admin-gated.
- Staff portal (`/internalsources`): news feed, calendar, documents, directory — auth-gated; internal content blocked from public APIs.
- Integrations: contact form → SMTP email (+ stores), newsletter subscribe, keyless Leaflet maps.

**Remaining (incremental / content-population):**
- Static placeholder pages not yet converted: project sub-pages, media galleries (photo/video), document & job public listings, fact/vision/ED already DB. Admins can create real pages/posts for these via the CMS now.
- Admin niceties: cover/gallery picker, meta editor for event/document/person, ui-strings editor.
- Polish: SSR `<html lang>` + hreflang (currently set client-side on hydration).

Original plan below for reference.

## Resolved architecture decisions (see `docs/CONTENT-MODEL.md`)
- Mostly **blog posts + rich pages + custom nav builder** (no JSON block-tree page builder).
- One `posts` table (`type` + `meta` JSON) + `pages` + `nav_items` tree; staff directory + form submissions are dedicated tables.
- **Runtime-extensible i18n**: `languages` + `translations` (EAV) + `ui_strings`; add languages with no migration/redeploy; fallback to default language.
- **Language via `?lang=` search param**, read on the server for SSR.
- **One canonical, editable slug** + `slug_redirects` (301 old links).
- **Rich text = Tiptap/ProseMirror JSON**, rendered to HTML **server-side via `@tiptap/static-renderer`**; shared extension list between editor and renderer.

---

## Phase 1 — Data foundation
1. Drizzle schema (`src/server/schema.ts`): `languages`, `translations`, `ui_strings`, `posts`,
   `pages`, `nav_items`, `media`, `post_media`, `slug_redirects`, `staff`, `contact_submissions`,
   `newsletter_subscribers`, `alumni_registrations`, visitor/counter table.
2. First migration (`bun run db:generate`) + seed: default language `en` + `km`, a starter nav tree,
   and a couple of sample posts/pages for development.
3. **Translation resolver** in the data layer: hydrate an entity set's translations in one query;
   resolve `requestedLang → defaultLang`. Helpers for posts/pages/nav.

### Seams to leave now (cheap future-proofing toward Part B)
Adding these now costs almost nothing and avoids a painful retrofit if we go platform later:
- **`tenant_id` column** on every content/config table (default a single `tenant` row). Lets us
  move to multi-tenant without reshaping every table.
- **Content-type indirection**: instead of a hardcoded `type` *enum* on `posts`, make `type` a
  string FK to a `content_types` seed table (rows for news/story/job/…). The full meta-schema
  (user-defined fields) comes in Part B, but the FK seam lets types become data later.
- **Status as a small workflow enum** (`draft|published|archived`) ready to extend to review states.
- Keep the data layer behind repository functions (not raw queries in routes) so a delivery API /
  versioning / tenancy can wrap them later.

## Phase 2 — Rich-text pipeline
4. Shared Tiptap extension list (one module) used by both editor and server renderer.
5. Server `renderBody(json)` → HTML via `@tiptap/static-renderer`; **verify it runs clean under the
   Bun server** (no DOM) before wiring. Sanitize output.

## Phase 3 — i18n wiring (search param)
6. Root route `validateSearch` for `lang`; server-aware language context.
7. Refactor `lib/i18n.tsx` to read `?lang=`, back `ui_strings` from the DB (fallback to default);
   `LanguageSwitcher` navigates by updating the param. Render `<html lang>` + hreflang from data.

## Phase 4 — Public site goes data-driven
8. Replace hardcoded `NAV` in `Header` with the `nav_items` tree (+ Khmer labels from translations).
9. Convert ported routes to load from tRPC/DB instead of mock arrays: news list + **article detail**,
   impact/success stories, leadership + **bio pages**, projects, document libraries (PDF + counts),
   **photo album lightbox**, video gallery, job table (deadline auto-hide), pages (About, Fact Sheet…).
10. Homepage sections from DB (latest news, stories, videos, announcements, stat counters).
11. Cross-cutting: pagination, search, time-bound visibility (deadline/published_at), per-doc
    read/download counts, visitor counter, contact form → email, newsletter + alumni → DB, map pins.
12. Make footer global; wire all `#` links.

## Phase 5 — Auth & roles (separate track; can start in parallel after Phase 1)
13. Design + implement auth: public / staff / CMS admin. Sessions for Bun + TanStack Start.

## Phase 6 — Admin CMS
14. Admin shell (auth-gated): CRUD for posts, pages, nav builder (drag/reorder/bind), media library
    (R2 upload), languages + translations editor, `ui_strings` editor, staff directory, forms inbox.

## Phase 7 — Internal Staff Portal (`/internalsources`, auth-gated)
15. Internal news feed, calendar of events, internal documents by category, staff directory (PDF export).

## Phase 8 — Hardening & deploy
16. Media on our R2 (replace placeholder image URLs), SEO/sitemap, search indexing, counters,
    backups, deployment target (persistent Bun server — SQLite is on-disk, not edge).

> Note: `bun:sqlite` is a local file, so the app server must be a persistent host (VPS/container),
> not Cloudflare Workers/edge. R2 is fine (HTTP object storage).

---

# Part B — CMS Provider / Platform track (optional, post-KAPE)

Turns the opinionated KAPE site-CMS into a **reusable, multi-site CMS platform** (Strapi/Payload/
Sanity-style). This is several times the size of Part A; pursue only if reuse across other
NGO/sites is an actual goal. **Recommendation:** ship Part A for KAPE first; if the platform goal
is firm, also seriously evaluate adopting an existing headless CMS (Payload/Strapi/Directus)
instead of building one. The phases below assume we build.

The load-bearing additions are the first three (P9–P11); the rest make it production-grade.

## P9 — Dynamic content modeling (the core of "being a provider")
- **Meta-schema**: `content_types` (already seeded as an FK in Phase 1) gains user-defined
  **fields** — `field_defs(content_type_id, key, label, kind, required, localized, config JSON,
  relation_target, sort)`. Field kinds: text, richtext(JSON), number, boolean, date, media,
  relation, select, json.
- Content rows store typed field values (per-field rows or a values JSON), with translatable
  fields flowing through the existing `translations` table.
- **Generic admin** that auto-generates create/edit forms and list views from `field_defs`
  (replaces hand-built per-type admin from P14).
- Validation derived from field definitions (Zod generated at runtime).

## P10 — Multi-tenancy
- Tenant model + isolation. Given `bun:sqlite`, prefer **DB-per-tenant via libSQL/Turso**
  (one SQLite file per tenant) over row-level `tenant_id` for clean isolation + scale; keep the
  `tenant_id` seam as the fallback. Per-tenant domains, config, theme, languages, media bucket/prefix.
- Tenant onboarding/provisioning flow.

## P11 — AuthZ / RBAC (beyond Part A's 3 tiers)
- Users, roles, **granular permissions** per content-type / field / action (read/create/update/
  delete/publish). API tokens (scoped). Optional SSO/OAuth. Per-tenant user directories.

## P12 — Content delivery API
- Stable public **REST + GraphQL** content API (read), generated from content types.
- **Webhooks** on content events; **draft preview** tokens/URLs; cache/CDN + invalidation.
- Keep tRPC for the admin/internal surface.

## P13 — Versioning, workflow & audit
- Revision history per record; restore/diff; **scheduled publishing**; review/approval workflow
  states; full **audit log** of who-changed-what.

## P14 — Digital Asset Management
- Image transforms/resizing/variants, focal point, format negotiation, CDN delivery — on top of R2.

## P15 — Runtime schema evolution
- Safe data migrations when users change content types/fields (add/rename/retype/delete) — generate
  and apply per-tenant migrations without downtime.

## P16 — Extensibility
- Plugin system, lifecycle hooks (before/after CRUD/publish), custom field types, custom admin views,
  webhook subscribers.

## P17 — Platform ops
- Quotas & rate limits, import/export & content portability (JSON/zip), per-tenant backups &
  restore, observability, and a datastore strategy that scales past a single on-disk file
  (libSQL/Turso fleet, or Postgres if we outgrow SQLite).

> Reality check: P9–P17 is a product, not a feature. If we commit, revisit the datastore (SQLite →
> libSQL/Turso DB-per-tenant) and whether buy-vs-build favors an existing headless CMS.
