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
