# T2 - admin editor for UI strings

Build the page that makes `ui_strings` editable. Today the table has a reader and no writer: an
admin cannot change a single one of the 53 chrome strings without a deploy.

## Files you own

Nobody else opens these while you are live.

- `src/server/repo/ui-strings.ts` - new
- `src/integrations/trpc/router.ts` - the router; add your procedures, touch nothing else in it
- `src/routes/admin.ui-strings.tsx` - new
- `src/routes/admin.tsx` - **one line only**, the sidebar entry. Any other change to this file is
  out of bounds; another pane has fixes queued for it.
- `src/server/repo/ui-strings.test.ts` - new

Read freely, write nowhere else. In particular `src/lib/ui-strings.default.ts` and every public
component belong to another pane - do not touch them.

## What exists

- Table: `uiStrings` in `src/server/schema.ts:85`. Primary key `(tenantId, key, lang)`, `value`
  not null, `lang` FKs `languages.code`.
- Reader: `getUiStrings` and `bootstrapI18n` in `src/server/repo/i18n.ts`.
- Bootstrap dictionary: `src/lib/ui-strings.default.ts`, 53 keys with `en` and mostly `km`.
- Consumer: `useT()` in `src/lib/i18n.tsx:63`.
- Languages are data: `src/routes/admin.languages.tsx`, and deleting a language already deletes
  its rows (`src/server/repo/admin.ts:2238`).
- Permissions are a string list on a role; `settings` is the one that fits. Do not add a new
  permission key and do not migrate the schema.

Read `src/routes/admin.settings.tsx` before you write any UI. It is the closest sibling page and
the one your work has to look like it belongs beside.

## Do

1. **Repo layer**, `src/server/repo/ui-strings.ts`:
   - list every key with its value in every active language, plus the default from
     `defaultUiStrings` so the page can show what a blank field falls back to
   - upsert one `(key, lang)` value
   - reset one `(key, lang)` back to its default, which means deleting the row, not writing the
     default string into it. A stored copy of the default stops tracking the default.
   - reject a key that is not in `defaultUiStrings` and not already in the table. An editor that
     can invent keys produces rows no component reads.
   - trim, and treat an empty value as a reset.
2. **Router**: expose those as admin procedures, guarded the same way the neighbouring admin
   procedures are guarded. Match the existing guard exactly; do not invent a second pattern.
3. **Page**, `/admin/ui-strings`:
   - every key, grouped by its area prefix (`nav.`, `forms.`, `footer.`…), group headings from the
     prefix
   - a field per active language on each row, with the default shown as the placeholder
   - a search box filtering on key and on value, in any language
   - a filter for "overridden only", so an admin can see what the site has actually changed
   - save per row. Show the pending state, show failure inline on the row, and do not silently
     drop a value
   - a reset control per row per language, only where a row is overridden
   - keyboard reachable throughout, every field labelled, and the save result announced
4. **Sidebar**: one item in the `Site` group of `src/routes/admin.tsx`, near `Languages`. Follow the
   shape of the entries already there.
5. **Cache**: find how the public site gets its strings and make sure a save is visible to a
   visitor without a restart. If a render cache or a bootstrap payload holds them, invalidate it.
   Say in your report exactly what you invalidated and how you proved it.

## Acceptance

Each numbered item is a demonstration. Paste real output, not a description.

1. `bunx tsc --noEmit` - silent.
2. `bun run test` - the whole suite, and it must be **at least 313 passing over 30 files**, the
   count at round start. Fewer means you broke something.
3. Your own tests in `src/server/repo/ui-strings.test.ts` cover: upsert writes, reset deletes the
   row rather than storing the default, an unknown key is refused, an empty value resets.
   **Mutation-test one of them**: break the guard on purpose, show the named test failing, put it
   back. Paste both runs.
4. Against the running dev server on `http://localhost:3011` (already up, do not start another),
   logged in as `admin@kapekh.org` / `kape-admin-2026`: change `nav.home` to a word of your choice,
   then load the public home page and show the new word in the header. Screenshot both into
   `.work/i18n/t2-shots/`. Then reset it and show the original back.
5. `bun run lint` - **8 errors, 0 warnings** or fewer. That is the round's baseline; you may not add
   the ninth.

## Out of scope

- Editing `src/lib/ui-strings.default.ts` or adding new keys to it. Another pane owns the keys.
- Editing any public component or route.
- Translating anything. You are building the editor, not filling it in.
- Bulk import/export, CSV, or a translation-memory feature. Not asked for.
- Any schema migration.

## Stop conditions

- You need a file you do not own: stop and report. Do not reach across.
- The dev server dies: report it, do not restart it. Another pane owns it.
- `bun run test` drops below 313: stop, that is a regression, report it before doing anything else.
- Never touch `kape.db` in the repo root. The dev server runs on `.work/scratch/uitest.db`.
- Never run `git` commands that write: no commit, checkout, reset, stash.
