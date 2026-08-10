# How a slice works

Shared rules for S1-S6. Your own job file names your files, your dictionary module and your rows.

## The goal

An admin must be able to change any text a visitor sees, without a developer. Page bodies and
records are already editable. What is not is the chrome hardcoded in components. You move your
files' hardcoded strings into the `ui_strings` dictionary, where `/admin/ui-strings` can edit them.

## The map

`.work/i18n/INVENTORY.md` - the Strings section has one `### <file>` block per file with a row per
string: line, current text, class, proposed key, notes. Work from your files' blocks.
`.work/i18n/keys.proposed.ts` holds the proposed English for every key.

Only `new-key` rows are yours to wire. `already-t` is done, `content` comes from the database,
`leave` stays in code and the row says why.

## The rule that keeps panes apart

**Your keys go in your module, whatever their prefix.** The module is storage; the key name is the
organising principle. A key called `common.retry` living in `donate.ts` is correct if the donate
slice is the one that renders it. Never open another slice's module - the index merges them all and
`dictionary.test.ts` fails loudly if two modules define the same key.

**A key arrives in the same change as the component that renders it.** `no-brand.test.ts` refuses a
seeded string nothing reads. Do not add a key you are not wiring in this job.

## Doing it

1. Read your files' blocks in the inventory. Confirm each row against the real line before you
   trust it - the file may have moved since.
2. Add your keys to your module, English only, in the file's existing style, sorted within a group.
   **No Khmer.** A key with no `km` falls back to English, which is honest; invented Khmer is not.
   Where a key exists in `keys.proposed.ts`, use that English verbatim unless it is wrong, and say
   so in your report if you changed it.
3. Wire each site through `useT()` (`src/lib/i18n.tsx:63`). `t(key)` returns the key itself when
   missing, so a typo shows on screen rather than blanking the page.
4. Interpolated keys take a third argument: `t("search.showing", undefined, { n, total })`. Never
   build a sentence by concatenation - it cannot be reordered in Khmer, which is the whole reason
   the slots exist.
5. Some strings sit where a hook cannot run - a plain function, a module-level constant, a
   `document.createElement` popup. Thread `t` in as an argument rather than moving the call site
   into a component. Your job file names yours.
6. Product neutrality: `src/lib/ui-strings.default.ts` says the shipped defaults carry no one
   organisation's copy. If a string you are keying names a country, a sector or a client, the
   default you ship is generic and you say so in your report.

## Acceptance, every slice

Paste real output. A claim with no output is not evidence.

1. `bunx tsc --noEmit` - silent.
2. `bun run test` - fully green, no failures, and **at least 333 passing over 33 files**, the count
   when your slice started. `no-brand.test.ts` and `dictionary.test.ts` both pass.
3. `bun run lint` - 8 errors, 0 warnings or fewer. You may not add the ninth.
4. **Every row accounted for.** A table: each `new-key` row in your files, and `wired`, or `skipped`
   with the reason. The count must equal the row count in the inventory for your files. State both.
5. **The round trip, in a browser.** The dev server is already on `http://localhost:3011` - do not
   start another. Log in at `/login` as `admin@kapekh.org` / `kape-admin-2026`, go to
   `/admin/ui-strings`, change one key your slice wired, load the public page that renders it, and
   show the new text. Then reset it and show the original back. Two screenshots into your shots
   directory. **This is the only proof that matters** - a key in a file that no editor can reach is
   not the feature.
6. Grep your files for what you left behind: no string literal remains in JSX text position, a
   `placeholder`, a `title`, an `alt` or an `aria-label` in your files except the ones your table
   marks `skipped`.

## Out of scope, every slice

- Any file another slice owns. If you need one, stop and report; never reach across.
- `src/lib/i18n.tsx`, `src/lib/ui-strings.default.ts`, the other modules in `src/lib/ui-strings/`.
- `src/routes/admin*` and `src/components/admin/*` - the admin's own labels stay hardcoded this
  round. Rithy's call.
- Khmer translation.
- Restyling. You are changing where text comes from, not what the page looks like. A visual diff
  beyond the words themselves means you went too far.

## Stop conditions

- A string you cannot key without changing another slice's file: leave it, mark the row `skipped`
  with the reason, report it. Do not reach.
- `bun run test` goes red and you cannot make it green inside your own files: stop and report.
- The dev server dies: report it, do not restart it. Another pane owns it.
- Never touch `kape.db` in the repo root. The server runs on `.work/scratch/uitest.db`.
- Never run `git` commands that write: no commit, checkout, reset, stash.
