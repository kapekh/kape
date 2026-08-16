# Open work, audited against the tree on 2026-08-16

Every row below was checked in the tree at `cbfab12`, not read out of a report. The source column
says which round left it open.

Baseline measured here: `bun run test` **496 / 54 files**, `bunx tsc --noEmit` **exit 0**,
`bunx biome lint src/` **6 errors** (all `noArrayIndexKey`, carried since the redesign round).

## Done

Gates after all six, run here: `bun run test` **506 / 55 files**, `tsc` exit 0,
`bun run lint` **6 errors over 313 files**, `bun run build` green.

Browser evidence came from `:3081` on `.work/audit/audit.db`, a `VACUUM INTO` copy.
`kape.db` was read once, for the copy, and never written to.

| # | item | commit | how it was proved | source |
|---|---|---|---|---|
| 1 | Lint gate counted built output. `**/index.html` and `**/src/**/*` matched `dist/`, so `bun run lint` read 48,880 on a built tree and 6 on a clean one | `e7110bc` | `bun run lint` now checks 313 files and reports 6 | new |
| 2 | `pageBuilder` step 2 spotlighted nothing. The picker took the first selector that **existed**, and `#page-segment` exists at zero size inside a collapsed group, so naming an alternative behind it would have changed nothing | `d71ffe2` | On the real page builder: `#page-segment` measures 0 high, `[data-tour=page-settings]` sits at top 388 / height 49, and the ring lands at 382 / 61, which is that box plus `PAD`. Guarded by a case that stubs both rects | redesign J09 |
| 3 | A reset UI string dropped out of the public dictionary, so a Khmer reader got the call site's English and `t("nav.contact")` got the bare key | `5b2fdc6` | Every `nav.contact` row deleted, `/km/contact` still renders ទំនាក់ទំនង once and no bare key. Two repo cases cover the reset and a language with no rows of its own | redesign J13 |
| 4 | Sign-in sent every non-admin to `/internalsources`, which admits staff and admin only and bounces back to `/login` silently. The seeded `editor` role holds pages, posts, projects and media and could reach none of them | `d20de5d` | `editor@test.example` signs in and lands on `/admin` with Dashboard, Pages, Projects and Media in the sidebar and nothing else | redesign J08 |
| 5 | `deleteTerm` was a bare delete, so a term went and left the rows holding its key dangling | `43dcf6f` | Deleting Kampong Cham on `/admin/locations` now raises `"Kampong Cham" is still used by 1 office and 2 schools.` on screen and the term stays in the table. Four repo cases including the term nothing points at | redesign J04 |
| 6 | Media had no Video tab and no video count | `ba938e8` | Videos lists the one `video/mp4` row on its own; Files still lists it beside the PDF, so that tab's meaning did not move; the header reads `123 items · 121 images · 1 video · 1 file` | redesign J10 |

## Deploy, dry-run on this machine

No DigitalOcean credentials here, so the droplet is not stood up. Everything the runbook can be
held to without one was run.

| step | result |
|---|---|
| 4, `docker compose up -d --build` | **Failed, now fixed** (`dcd15ce`). The build stage ran `bun run build`, whose first half reads prerender paths out of a database; the image's throwaway db is migrated and never seeded, so `languages` is empty and `gen-prerender-paths.ts` threw. Split out `build:app` and dropped the dead `prerender-paths.json` from the runtime image |
| 4, first boot | Image builds (983MB). On an empty volume the entrypoint installs, prints the generated password once, and serves. `docker restart` prints `Already installed - skipping.` |
| 3, `ALLOWED_HOSTS` | A request for `evil.example` comes back 403 `Blocked request`; `www.example.org` serves |
| 3, `VITE_SITE_URL` | Passed as a build arg it reaches the html: `og:url`, `rel=canonical` and all three `hreflang` links are absolute |
| 1, `BIND_ADDR` | `docker compose config` renders `host_ip: 127.0.0.1`, so the app does not bypass `ufw` |
| 5, `deploy/Caddyfile` | `caddy validate` says `Valid configuration`. Ran in `caddy:2`, since there is no caddy binary here |
| 4, bringing the content across | Ran verbatim on the real `kape.db` and `public/uploads`. The container boots on the imported volumes saying `Already installed - skipping.`, serves the KAPE home page, renders Khmer, serves an upload as `image/png`, answers `/sitemap.xml` and `/search`, and 404s the deleted `j03-preview`. The header carries `/search` and `/sitemap.xml` as two separate links now, not the same one twice |

**The prerender catch-up does not apply to this deployment.** `scripts/prerender-static.ts` writes
`dist/static/` for a CDN or static host to serve. The container serves `dist/client` through
`vite preview` and never looks at `dist/static`, and `scripts/` is not in the runtime image at all.
Under docker + Caddy the runtime SSG is the `render_cache` table, which warms itself. Drop the step,
or add a Caddy route serving `dist/static` if the static tier is actually wanted.

Left for the droplet itself, and only for it: DNS, the certificate, Cloudflare's proxy and the
origin lockdown in step 6, and step 7's contact-form check. Rithy's call: no droplet yet.
When there is one, the content goes across rather than a fresh install.

## Found while photographing the admin for the guide

Both were data in `kape.db`, not code. **Both fixed on 16 Aug** by
`DATABASE_PATH=kape.db bun .work/deploy/datafix.ts`, which goes through `upsertSetting` and
`deletePage` rather than raw SQL. Backup first:
`.work/backups/kape-pre-datafix-2026-08-16T03-43-11.db`.

- **The top-bar Search link pointed at the sitemap.** `header_search_link` was `/sitemap.xml`, the
  same value as `header_sitemap_link`, so anyone who followed it got the XML index rather than the
  search page. Now `/search`.
- **A test page from the redesign round was still in the tree.** Page 35, slug `j03-preview`, draft,
  no children and no nav item pointing at it. Deleted, and its translation rows with it: the orphan
  count is 0.

Nothing needed busting. `render_cache` holds route content only, not header settings, and all three
rows are `v4` page/record entries that never mentioned the setting. That also retires the stray
`v3::en::home` row listed below: the cache version has moved on and the row is gone.

## Rithy's, not mine

Named with what it would cost, so the decision is one line rather than a re-audit.

- **The operator's filename on a media item.** `media` has no filename column, so an upload is
  announced as its UUID. Needs a column, a migration and an endpoint change, and belongs with alt
  text.
- **Roles, users and forms have no navigation guard.** All three `navigate()` to the list on save, so
  arming the blocker without a baseline reset would stop their own post-save navigation. One
  decision: should they stay put after saving, the way donors and posts do?
- **J02's `toggleRail` deviation** at `admin.tsx:354-374`. Collapsing the rail on arrival at the page
  builder is a new side effect. Keep, or revert to the plain toggle.
- **A post's body is not inline-editable.** The public payload carries rendered HTML, not the source,
  so there is nothing an editor could save back.
- **`LANGS` is hardcoded** at `lib/i18n-config.ts:3`. A client who wants a third language needs a code
  change.
- **38 commits on `main` are unpushed**, and the deploy the inline round ended on has not run:
  `bun run build && PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale`
