# KAPE Website & CMS

A CMS-driven, bilingual (English + ខ្មែរ) website and internal staff portal for
**KAPE** — Kampuchea Action to Promote Education (អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា),
the largest local education NGO in Cambodia.

The defining goal: **non-technical admins compose the whole site themselves** —
menus, nested pages, and each page's content from a catalogue of sections (rich
text, images, videos, stats, maps, card grids, embedded forms, …). It's a page
builder, not a fixed-template site.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — full-stack React 19 with SSR + file-based routing
- **[tRPC v11](https://trpc.io/)** — end-to-end typed API (`src/integrations/trpc`)
- **[Drizzle ORM](https://orm.drizzle.team/)** over **SQLite** (Bun's built-in SQL engine)
- **[Bun](https://bun.sh/)** — runtime, package manager, and test/script runner
- **[Tailwind CSS v4](https://tailwindcss.com/)** + Radix UI + [Tiptap](https://tiptap.dev/) rich-text
- **[Biome](https://biomejs.dev/)** — lint + format
- Runtime **i18n** (en/km) via a `?lang=` param — one content model, translated at render

## Getting started

```bash
bun install
cp .env.example .env      # then fill in AUTH_SECRET + DATABASE_PATH (see below)
bun run db:migrate        # apply Drizzle migrations
bun run db:seed           # seed nav, pages, demo content
bun run dev               # http://localhost:3000
```

The admin portal lives at **`/admin`** (log in via the "For Staff Only" link).

### Environment

See [`.env.example`](.env.example) for the full list. The two that matter most in
any deploy:

- **`AUTH_SECRET`** — signs session JWTs. Generate **once** and keep it constant;
  changing it invalidates every existing login. In production the app refuses to
  boot with the insecure default.
- **`DATABASE_PATH`** — use an **absolute** path in production so the DB file (and
  login sessions) survive restarts.

Optional integrations, each degrades gracefully when unset:

| Vars | Enables | Fallback when unset |
| --- | --- | --- |
| `R2_*` (Cloudflare R2) | Media/upload storage | Local `public/uploads/` |
| `SMTP_*` / `MAIL_*` | Contact-form email | Submission stored, body logged |
| `BARAY_*` ([Baray](https://baray.io)) | Real donation payments | `/donate` shows "not configured" |
| `VITE_SITE_URL` | Canonical + hreflang + absolute OG URLs | Relative URLs |

## Scripts

```bash
bun run dev          # dev server (port 3000)
bun run build        # generate prerender paths + production build
bun run prerender    # build, then statically prerender pages (incremental SSG)
bun run start        # serve the production build
bun run test         # Vitest
bun run check        # Biome lint + format check
bun run db:generate  # generate a migration from schema changes
bun run db:migrate   # apply migrations
bun run db:seed      # seed the database
bun run db:studio    # Drizzle Studio
```

## Architecture

### Routing — one page tree, one splat

Rather than a route file per page, the public site is a **Notion-style page tree**
(rows with `parentId` + `segment`) plus a few flat content collections (news,
projects, …). A single `resolveRoute` splat route (`src/routes/$.tsx`) resolves
every public URL against that tree, so admins can create / rename / nest pages with
no code changes.

### Page builder

A page is an ordered list of **section nodes** (`src/lib/sections.ts`). Each names
a section template + layout variant and carries authored `props`; dynamic sections
(post lists, maps, people directories, …) additionally declare a `query` resolved
server-side so SSR + SEO stay intact. Editors compose pages in `/admin/pages`, and
`SectionRenderer` renders them.

### Rich text & forms

Content is stored as **Tiptap JSON** and rendered server-side
(`@tiptap/static-renderer`, fail-closed on unknown nodes). Two extension sets:
`richTextExtensions` (trusted admin content, incl. images + embedded forms) and
`basicRichTextExtensions` (untrusted public input — StarterKit only).

The **form builder** (`/admin/forms`) defines data-driven forms (JSON fields:
text, select, file upload, rich-text answer, content blocks). Forms embed on any
page via a `form` section or inside any rich text, submit to `/api/forms/<slug>`,
and land in a submissions inbox with CSV export.

### Auth & RBAC

Session JWTs (`jose`) signed by `AUTH_SECRET`. Access is governed by **DB-backed
custom roles** with per-area permissions, enforced once in `adminProcedure` (tRPC
middleware keyed by router area) and mirrored in the admin nav. `admin` is a
code-level super-role. Managed at `/admin/roles` and `/admin/users`.

### Incremental SSG / render cache

`resolveRouteCached` is a read-through cache (keyed `lang::path`) in the
`render_cache` table, busted on any admin mutation via the `adminProcedure`
middleware. Warm it with `bun scripts/prerender.ts`; disable with `SSG_CACHE=off`.

### Storage & payments

- **Media** — `saveUpload()` writes to Cloudflare R2 when configured, else to
  local `public/uploads/` served by `uploads.$.tsx`.
- **Donations** — `/donate` takes real payments through the Baray gateway
  (redirect + `/api/pay/webhook`).

## Project layout

```
src/
  routes/            file-based routes (public + /admin/* + /api/*)
  server/            db, schema, auth, storage, mail, render-cache, richtext
    repo/            data-access modules (content, nav, forms, roles, …)
  integrations/trpc  router + procedures (init.ts, router.ts)
  components/        UI — admin/ (builders, editors), sections/, public
  lib/               shared schema/helpers (sections, forms, i18n, richtext)
drizzle/             SQL migrations + snapshots
scripts/             seed + one-off migration/prerender scripts
docs/                REQUIREMENTS, CONTENT-MODEL, BUILD-PLAN, gap analysis
```

## Docs

Deeper specs live in [`docs/`](docs/): [REQUIREMENTS](docs/REQUIREMENTS.md) (the
source spec), [CONTENT-MODEL](docs/CONTENT-MODEL.md), [BUILD-PLAN](docs/BUILD-PLAN.md),
and [LOVABLE-GAP-ANALYSIS](docs/LOVABLE-GAP-ANALYSIS.md).
