# C9 - The product stops being named after its first client

## Objective

`cms-core` exists because the product is not KAPE. Three things on this branch still say otherwise,
and the third is the only one that is actually hard.

You are done when a fresh clone gives no sign of who the first client was, and when a client who
wants French can have one without a code change - or when this file records exactly what that would
cost and why it was not done.

## Files you own

- `package.json`, the `name` field only
- `docs/` in full
- `src/lib/i18n-config.ts`
- `src/server/install.ts`
- `src/routes/sitemap[.]xml.tsx`
- `src/routes/$.tsx`, `src/routes/$lang.donate.tsx`, `src/routes/$lang.contact.tsx`,
  `src/routes/$lang.search.tsx` - **only** their `LANGS` import and the guard that uses it
- `scripts/gen-prerender-paths.ts`
- any new test file you add for i18n
- `.work/c9-report.md`

Nothing else. `src/routes/admin.settings.tsx`, `src/lib/site-theme.ts` and the `adminSettings.set`
procedure in `src/integrations/trpc/router.ts` belong to C8. `src/components/Header.tsx` and
`src/components/NavLink.tsx` belong to J22. Check `git status` before you start.

## 1. The package is called `kape`

`package.json:2`. **The product is `koompi-cms`.** Rithy decided it 2026-08-07; use it exactly, do
not restyle it, and do not invent a display name to go with it.

Grep the whole tree for the old name afterwards, including `README.md`, `bun.lock`, `.env.example`
and anything under `public/`. Report every hit you leave behind and why.

## 2. `docs/` is KAPE's specification

Five files: `BUILD-PLAN.md`, `CMS-CORE-REFERENCE.md`, `CONTENT-MODEL.md`,
`LOVABLE-GAP-ANALYSIS.md`, `REQUIREMENTS.md`.

Read them before you touch them. They are not all the same thing:

- Anything describing **the CMS** belongs on this branch, with KAPE's specifics generalised into the
  feature or module that serves them.
- Anything describing **KAPE's site** - their pages, their content, their organisation - belongs to
  `main`, which is frozen at `b21751a` and is where KAPE's site lives. On this branch it is dead
  weight that will be read as a requirement by the next person.
- `LOVABLE-GAP-ANALYSIS.md` is about a prototype that has been dropped. Establish whether anything
  in it is still true of the product before deciding.

Deleting is a legitimate outcome for a file whose whole content is client-specific. Moving is not
available to you: `main` is checked out in a stale worktree and you must not touch git. Where a file
should go to `main` rather than be deleted, **say so in your report and leave the file alone.** That
is Rithy's call.

These are documents a human reads, so the prose rules apply to whatever you rewrite.

## 3. A third language needs a code change

`src/lib/i18n-config.ts:10`:

```ts
export const LANGS = ["en", "km"];
```

A `languages` table already exists and `install.ts:273` writes to it, so the data model is there.
The problem is where the constant is consumed. `LANGS` is read at module scope by `$.tsx:143`,
`sitemap[.]xml.tsx:57`, three `$lang.*` route guards, `install.ts:67` and
`scripts/gen-prerender-paths.ts:33`. Route definitions are synchronous and a database read is not.

**This is the whole job.** Work out what it actually takes before writing code:

- The prerenderer and the sitemap run in a build step, so they can read the database. Those two are
  probably easy and worth doing on their own.
- The `$lang` route guards need the list at request time. Establish whether the router can be given
  it from the server context or whether it genuinely has to be a build-time constant.
- `install.ts:67` validates `SITE_DEFAULT_LANG` against `LANGS`. If languages become data, that
  check moves to the table it is really about.

If the router half turns out to need a restructure larger than this job, **land the build-time half,
leave the constant in place for the router, and write down precisely what the rest costs.** A partial
fix that is honest about its edge beats a half-finished refactor of the routing layer. Say which you
did.

Whatever you land, the comment at `i18n-config.ts:7` telling a reader to edit two places must end up
true.

## Acceptance

1. `grep -ri kape` over the tracked tree, excluding `src/server/seed/` and `.work/`. Paste the full
   output and account for every remaining hit.
2. `bun run db:seed` on a scratch database still gives a blank unbranded CMS that boots. Screenshot
   the home page.
3. `bun run seed:kape` on a scratch database still restores KAPE. Screenshot the home page. This is
   the branch's standing gate and generalising the docs must not break it.
4. For the language work: add a third language to whatever the source of truth ends up being, and
   show its URLs resolving. If you landed only the build-time half, show the sitemap and the
   prerender path list picking it up, and state plainly that the router still needs the constant.
5. `bun run test` at or above the count when you start. `bunx tsc --noEmit` silent. `bun run format`
   clean. Report both counts.
6. Every `docs/` file you changed or deleted, listed with one line on why, and every file you decided
   belongs on `main` instead, listed separately and left in place.

## Out of scope

- Anything under `src/server/seed/`. KAPE's seed is a feature of this branch, not a leftover.
- `.work/`, which is the project's own history and full of the client's name by design.
- The 218 `bun run check` lint errors, and any file owned by C8, J22 or J23.
- Actually moving anything to `main`. Report it, do not do it.

## Stop conditions

- **Never run against the repo's `kape.db`.** `VACUUM INTO` a copy, `export DATABASE_PATH`,
  `export SSG_CACHE=off`. It is WAL-mode; a bare `cp` silently drops the `-wal` file.
- Do not commit, do not touch git, do not run `git worktree` anything, do not edit the worklog.
- If the product has no chosen name, stop at step 1 and ask. Do not invent one.
- If making languages data-driven requires touching a file you do not own, stop and report the file.
