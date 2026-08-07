# Website & CMS

A CMS-driven, bilingual (English + ខ្មែរ) website and internal staff portal.
A fresh install carries no organisation's name, logo or copy: `bun run db:seed`
creates one administrator, one home page and nothing else, and everything the
site says about itself is edited from `/admin`.

The first deployment is KAPE (Kampuchea Action to Promote Education,
អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា), the largest local education NGO in
Cambodia; that site's content is a fixture, `bun run seed:kape`, not the product.

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
  login sessions) survive restarts. Read by the app **and** by drizzle-kit, so a
  shell where it is unset runs `db:migrate` against a different file.
- **`ALLOWED_HOSTS`** — required by `bun run start`. See below.

#### Running behind a proxy

Login and form rate limits key on the client address.
By default that is the socket peer address, which a caller cannot forge, and every proxy header is ignored.

If you put a reverse proxy or CDN in front, set **`TRUSTED_PROXY_HEADER`** to the header it sets (`cf-connecting-ip` for Cloudflare, `x-forwarded-for` for nginx, Caddy or Traefik).
Otherwise every request looks like it comes from the proxy and your whole user base shares one rate-limit bucket, which shows up as logins and contact-form posts failing for everyone at once.
In production the app logs a warning when it sees this.

The value is read as the **rightmost** entry in the header.
`x-forwarded-for` is a chain, and appending proxies - Caddy, Traefik, and nginx's usual `$proxy_add_x_forwarded_for` - produce `<what the caller sent>, <real client>`.
The rightmost entry is the one your nearest proxy appended and the only one a caller cannot forge; single-value headers like `cf-connecting-ip` are unaffected.

The one condition: the app must not be reachable around the proxy.
If it is, an attacker can hit it directly and set the header themselves, which buys unlimited password guesses or lets them throttle someone else's address.
Bind the app to localhost or an internal network and let only the proxy reach it.

Leave the variable empty for the default `docker compose up` deployment, which publishes the port directly with nothing in front.

`bun run start` is `vite preview`, which refuses any Host header it does not recognise.
Set `ALLOWED_HOSTS` to your domain, comma separated for more than one, or every request comes back `Blocked request`.
`bun run dev` ignores it.

Optional integrations, each degrades gracefully when unset:

| Vars | Enables | Fallback when unset |
| --- | --- | --- |
| `R2_*` (Cloudflare R2) | Media/upload storage | Local `public/uploads/` |
| `SMTP_*` / `MAIL_*` | Contact-form email | Submission stored, body logged |
| `BARAY_*` ([Baray](https://baray.io)) | Real donation payments | `/donate` shows "not configured" |
| `VITE_SITE_URL` | Canonical + hreflang + absolute OG URLs | Relative URLs |

## Upgrading an existing deployment

Read this before deploying this version over one that is already running.
Three things changed, none of them announce themselves, and two of them make a live site look wiped.
This applies whichever way you run the app: the shipped `docker-compose.yml`, your own compose file, a bare `docker run`, or `bun run start` on a host.

**1. The database file is now `cms.db`, not `kape.db`.**
`DATABASE_PATH`'s default moved from `/data/kape.db` to `/data/cms.db`, in the app, in the entrypoint and in `drizzle.config.ts`.
Point `DATABASE_PATH` at the file you already have and nothing moves:

```bash
# .env
DATABASE_PATH=/data/kape.db
```

Do this rather than renaming the file, at least until the upgrade is verified.
If you do rename it, stop the app first and take its `-wal` and `-shm` companions with it.

**2. The Compose volumes are now `cms-data` and `cms-uploads`.**
Only relevant if you use the shipped `docker-compose.yml`.
Compose will not warn you: it creates the new, empty volumes and the site comes back blank while your data sits untouched in the old ones.

Keep the old volumes by name, in an **untracked** `docker-compose.override.yml` beside the compose file, so the next `git pull` has nothing to conflict with:

```yaml
volumes:
  cms-data:
    name: <project>_kape-data
  cms-uploads:
    name: <project>_kape-uploads
```

`<project>` is the Compose project name, which defaults to the directory's name.
`docker volume ls` shows the full names.

Or copy the data across instead, **with the stack stopped** (`docker compose down`):

```bash
docker volume create <project>_cms-data
docker volume create <project>_cms-uploads
docker run --rm -v <project>_kape-data:/from -v <project>_cms-data:/to \
  alpine sh -c 'cp -a /from/. /to/'
docker run --rm -v <project>_kape-uploads:/from -v <project>_cms-uploads:/to \
  alpine cp -a /from/. /to/
```

Keep the old volumes until the site is verified.

**3. `ALLOWED_HOSTS` is new and required by `bun run start`.**
The deployed domain used to be hardcoded in `vite.config.ts`.
It now comes from the environment, and `vite preview` rejects any Host header it does not recognise, so with the variable unset **every request 403s with `Blocked request`** — including the ones from your health check.

```bash
# .env
ALLOWED_HOSTS=www.example.org,example.org
```

`bun run dev` ignores it.

**Verifying.**
The installer runs on every boot and is a no-op on a database that is already installed.
It prints `Already installed - skipping.`, plus a warning for anything an administrator can put back from `/admin` (a missing site name, no page at `home`).
It exits non-zero, changing nothing, only when the database is missing rows the site cannot run without, such as an administrator; the message names what is missing, what is present, and how much content the file holds.
It will never tell you to delete a database that holds pages, posts or media.

## Scripts

```bash
bun run dev          # dev server (port 3000)
bun run build        # generate prerender paths + production build
bun run prerender    # build, then statically prerender pages (incremental SSG)
bun run start        # serve the production build (set ALLOWED_HOSTS to your domain)
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
docs/                CMS-CORE-REFERENCE, CONTENT-MODEL, BUILD-PLAN
```

## Docs

Deeper specs live in [`docs/`](docs/):
[CMS-CORE-REFERENCE](docs/CMS-CORE-REFERENCE.md) is the standard the core is graded against,
[CONTENT-MODEL](docs/CONTENT-MODEL.md) explains the schema,
and [BUILD-PLAN](docs/BUILD-PLAN.md) is what is left to build.
