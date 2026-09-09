# AGENT.md

## Check

`bun run check` — types, lint/format, tests. One command; `deploy/ship.sh` runs the same one.

## Conventions

Editor-authored text that a visitor reads goes in `translations`
(`entity_type`,`entity_id`,`field`,`lang`), resolved with `resolveTranslations` /
`resolveOneWithFallback` in `src/server/repo/i18n.ts`. Never a column per language
(`name_km`, `title_km`) and never one column shared by every language: the first
cannot hold a third language, the second lets a Khmer editor overwrite what an
English reader sees.

Package manager is `bun`. `bunx`, never `npx`.

`bun run start` is `server.ts` over `dist/`, never `vite preview`: the preview server stamps
html `content-encoding: identity` and the proxy then ships 200 KB pages uncompressed. Compression
is the proxy's job (Caddy `encode`, Cloudflare).

React preloads every eager `<img>` in the SSR shell, so a public image below the fold carries
`loading="lazy"`. Only a hero, the active slide and a single portrait stay eager.

Access is areas on roles (`src/lib/permissions.ts`), and the one rule is reach: a caller hands
out, and touches, only areas they hold. Every users-and-roles write checks both the target's
current role and the role being handed out (`withinReach`); `admin` is reachable by `admin` only.
The staff portal is the `portal` area, not a role string. A page-builder source is public the
moment it exists, so nothing internal (directory, documents) is ever a `QuerySource`.
