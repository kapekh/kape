# S1 - public routes

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows: where the map
is, how keys are stored, the acceptance every slice owes, and the stop conditions. This file only
names your share.

## Files you own

- `src/routes/$.tsx`
- `src/routes/$lang.search.tsx`
- `src/routes/login.tsx`
- `src/lib/ui-strings/pages.ts` - your dictionary module. Nobody else opens it.
- `src/routes/-slice1.test.tsx` - new, if you write one. The leading `-` keeps it out of the router.

`$.tsx` was repaired earlier today - a sectioned page had lost its `h1`. Read it as it stands now.
`login.tsx` gained `role="alert"` on its error and a `?redirect=` param; leave both working.

## Your rows

`.work/i18n/INVENTORY.md`, the `### src/routes/$.tsx`, `### src/routes/$lang.search.tsx` and
`### src/routes/login.tsx` blocks. Prefixes you will mostly be adding: `nav.`, `page.`, `error.`,
`collection.`, `search.`, `login.`, `forms.`, `album.`.

Three specifics from the inventory worth knowing before you start:

- **`collection.<prefix>`** is one key per collection, sourced today from `COLLECTIONS.label`. The
  inventory has a Collection labels section; follow it rather than inventing a key per call site.
- **`search.showing`** and its neighbours are assembled from parts today. They take slots. Never
  concatenate.
- **The root error and 404 screens (`__root.tsx:113-160`) are out of your scope and stay
  hardcoded.** They render outside `LanguageProvider`, so a key there would resolve to its English
  fallback in every language, forever. The inventory classes them `leave` for that reason. Do not
  "fix" it by moving the provider - that is a separate job with its own blast radius.

## Also

Anything in your files that only ever renders inside the admin: mark the row `skipped` and say so.
The admin's own labels stay hardcoded this round.

## Acceptance

Everything in `SLICE-COMMON.md`, plus: your round-trip proof uses a key from `$.tsx` - change it in
`/admin/ui-strings`, show it on a public page, reset it, show the original back.
