# T1 - inventory every visitor-visible string on the public site

Read-only. You produce the map another pane builds from. Edit nothing under `src/`.

## Why

The goal for the round: **an admin can change any text a visitor sees, without a developer.**

Three mechanisms already exist and most text is already covered by one of them:

- **Page content** - body HTML, section fields, titles. Already editable in the admin.
- **Records** - a person's name, a project's summary. Already editable.
- **`ui_strings`** - the chrome around content: button verbs, empty states, form labels, error
  messages. Table in `src/server/schema.ts:85`, bootstrap dictionary in
  `src/lib/ui-strings.default.ts` (53 keys), read through `useT()` in `src/lib/i18n.tsx:63`.

What is missing is the fourth category: **strings hardcoded in a component**, which no admin can
touch. Only 6 files out of roughly 42 currently call `useT()`. Your job is to find every one of the
rest and say what should happen to it.

## Files you own

- `.work/i18n/INVENTORY.md`
- `.work/i18n/keys.proposed.ts` - the proposed new entries, in the exact shape of
  `src/lib/ui-strings.default.ts`, so the next pane can paste it. English only; leave `km` out
  entirely rather than inventing Khmer.

Read-only everywhere else. Do not edit `src/`.

## Scope

The public site. Every file under `src/routes/` that is not `admin*` or `api.*`, and every file
under `src/components/` that those routes render, including `src/components/sections/`.

**Out of scope: the admin dashboard's own labels.** Decided by the user. Do not inventory
`src/routes/admin*.tsx` or `src/components/admin/*`.

## Do

1. List the files in scope first, so "every page" is a checklist you tick, not a feeling.
2. In each file, find every string literal that reaches a visitor's screen. Include:
   - visible text nodes and template literals rendered as text
   - `placeholder`, `title`, `alt`, `aria-label`, `aria-description`
   - button and link labels, tab labels, table column headers
   - empty states, loading text, error and success messages, toasts
   - validation messages, confirm dialog copy
   - `<title>` and meta description defaults
   - date and number formatting words - "min read", "ago", month names if hardcoded
3. Exclude, and say in the report that you excluded them:
   - CSS class strings, route paths, query keys, `data-*` values, icon names
   - developer-facing strings that never render: console messages, thrown `Error` text that is
     caught and replaced, test fixtures
   - text already coming from the database
4. Classify every hit into exactly one:
   - `already-t` - already read through `useT()`. Give the key.
   - `content` - comes from page or record data, and the admin can already change it. Say where.
   - `new-key` - hardcoded and should become a `ui_strings` key. **Propose the key**, following the
     naming already in `ui-strings.default.ts`: lowercase, dot-separated, area first
     (`nav.`, `forms.`, `footer.`, `search.`, `error.`). Reuse an existing key rather than adding a
     near-duplicate; say which you reused.
   - `leave` - genuinely should stay in code. A `leave` needs a reason in the row. Punctuation,
     a single separator character, a brand name that must not be translated.
5. Flag every string that is **assembled from parts** - `"Showing " + n + " of " + total`. Those
   break in Khmer and cannot be fixed by a key alone. Give each one a row of its own with the
   interpolation it needs (`search.showing` = `"Showing {n} of {total}"`), and count them.
6. Count the distinct new keys. If it is over 150, say so plainly and group them by area with a
   suggested order, so the build can land in slices instead of one unreviewable diff.

## Acceptance

`.work/i18n/INVENTORY.md`:

1. A **Files** table: every in-scope file, its hit count, and `done` once you have walked it.
   The count of files here must equal the count from step 1. State both numbers.
2. A **Strings** table: `file:line | current text | class | proposed key | notes`. Every row cites a
   real line. Sorted by file.
3. An **Interpolation** section: every assembled string, with its proposed pattern.
4. A **Reused vs new** count: how many hits map onto the 53 existing keys, how many need new ones.
5. `.work/i18n/keys.proposed.ts` compiles as TypeScript. Prove it:
   `bunx tsc --noEmit --skipLibCheck .work/i18n/keys.proposed.ts` and paste the output.

## Out of scope

- Editing any file under `src/`.
- Building the admin editor. Another pane owns that.
- Translating anything into Khmer.
- The admin dashboard's own strings.

## Stop conditions

- A file is over 800 lines and mostly markup: still walk it, but say so in the Files table if you
  sampled rather than read every line. A silent sample is worse than an admitted one.
- Never run `git` commands that write: no commit, checkout, reset, stash.
- Do not start the dev server or open a browser. Two other panes are using them.
