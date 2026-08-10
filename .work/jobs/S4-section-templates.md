# S4 - section templates and the project view

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows. This file only
names your share.

## Files you own

- `src/components/sections/SectionRenderer.tsx` - 2169 lines, the bulk of the job
- `src/components/ProjectView.tsx`
- `src/lib/ui-strings/sections.ts` - your dictionary module. Nobody else opens it.

`sections.ts` already holds `home.news.all`, `home.news.readmore`, `home.video.all` and
`related.more`. They are read today and stay as they are.

## Your rows

`.work/i18n/INVENTORY.md`: the `SectionRenderer.tsx` block (32 `new-key` rows, several of them the
same key reused) and the `ProjectView.tsx` block (9 `new-key` rows). Confirm each against the real
line - this file is long and has moved this round.

Prefixes: `hero.`, `cta.`, `empty.`, `jobs.`, `albums.`, `publications.`, `partners.`,
`resources.`, `project.`. All in `sections.ts`.

`PublicOrgChart.tsx` is in your area of the tree and has **zero** rows - every string it shows is a
record. Do not open it.

## Four specifics

- **Three form placeholders, three different owners. Check each before you type.**
  `SectionRenderer.tsx:1015/1021/1028` render a name, an email and a message field.
  `forms.emailPlaceholder` is already defined in `pages.ts` (S1) and `forms.message` in `forms.ts`
  (S3): **reuse both, define neither** - a key defined twice fails `dictionary.test.ts` by design.
  `forms.yourName` has no definition and no other reader, so that one **is yours**: put it in
  `sections.ts` despite the prefix, which is what SLICE-COMMON means by the module being storage.
  Grep `src/lib/ui-strings/` for each of the three before you add it.

- **`cta.learnMore` has five call sites** (338, 345, 497, 510, 791) and `empty.partners` two (1729,
  1747). One key each, not one per site. The count of keys you add will be well under the count of
  rows you wire; state both.

- **Two pluralisations, handled differently.** `albums.count` is `{n} photos` and takes the number
  in a slot. `publications.downloads` at 1462 is `{n} download{n === 1 ? "" : "s"}` - a suffix
  built in JSX, which Khmer cannot express. Ship two keys, `publications.downloadsOne` and
  `publications.downloads`, and pick between them at the call site. The inventory's
  "Pluralisation, which the current dictionary shape cannot express" section lists the other four
  pairs; only this one is in your files.

- **Three rows stay code and the inventory says why**: `1610` derives a column header from a row
  key, `1467`/`1942` are the `PDF` acronym, `2136` is a diagnostic that never renders in a healthy
  install. Mark them `skipped` with that reason; do not key them.

## Out of scope

Everything in SLICE-COMMON, plus `src/lib/ui-strings/forms.ts` (S3) and every other file under
`src/components/` that is not named above. `ProjectView.tsx:8` hardcodes `en-GB` in a date format -
a real bug, on the "Not a key" list, and not yours this round.

## Acceptance

Everything in `SLICE-COMMON.md`. Your round-trip proof uses one of **your own** keys, not one of
S3's - `empty.posts` or `cta.learnMore` are the easiest to see. Change it at `/admin/ui-strings`,
show it on a public page that renders that template, reset it, show the original back. Two
screenshots into `.work/i18n/s4-shots/`.

Report to `.work/S4-report.md`.
