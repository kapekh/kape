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

Access is areas on roles (`src/lib/permissions.ts`), and the one rule is reach: a caller hands
out, and touches, only areas they hold. Every users-and-roles write checks both the target's
current role and the role being handed out (`withinReach`); `admin` is reachable by `admin` only.
The staff portal is the `portal` area, not a role string. A page-builder source is public the
moment it exists, so nothing internal (directory, documents) is ever a `QuerySource`.
