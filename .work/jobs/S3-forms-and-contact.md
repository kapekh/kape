# S3 - forms, contact and the map

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows. This file only
names your share.

## Files you own

- `src/routes/$lang.contact.tsx`
- `src/components/ContactForm.tsx`
- `src/components/FormRenderer.tsx`
- `src/components/MapView.tsx`
- `src/lib/ui-strings/forms.ts` - your dictionary module. Nobody else opens it.

`forms.ts` already holds three keys - `forms.send`, `forms.sending`, `forms.submit`. They are read
today and stay as they are.

## Your rows

`.work/i18n/INVENTORY.md`, the `###` block for each of your four files. 31 `new-key` rows by the
inventory's count; confirm each against the real line before you trust it.

Prefixes you will be adding: `contact.`, `forms.`, `error.`, `common.`, `map.`. All of them live in
`forms.ts` whatever they are called - the module is storage, not a namespace.

## Four specifics

- **`error.generic` and `common.loading` are yours to define.** `ContactForm.tsx:135` and
  `FormRenderer.tsx:125` render the same "Something went wrong. Please try again." that
  `newsletter.error` already carries in `site.ts`. Do not reuse `newsletter.error` and do not touch
  `site.ts`: define `error.generic` in your module. The duplicate is a known collapse
  (INVENTORY "Duplicates worth collapsing") and belongs to a later sweep, not to you.

- **Three of your keys have a second reader you must not wire.** `SectionRenderer.tsx:1015/1021/1028`
  renders `forms.yourName`, `forms.emailPlaceholder` and `forms.message`. That file belongs to S4.
  Define all three in `forms.ts` and wire only your own call sites; S4 wires its own against your
  definitions. `forms.message` is yours through `ContactForm.tsx:124/131` either way, so all three
  have a reader inside your files the day you land - `no-brand.test.ts` stays green without S4.

- **`MapView.tsx` builds its popup with `document.createElement`,** so no hook runs there. Thread
  `t` in as an argument, as SLICE-COMMON step 5 says. Do not move the popup into a component.
  `&copy; OpenStreetMap contributors` at line 109 is tile attribution: leave it, it must not change.

- **Interpolation, four sites.** `contact.metaTitle` and `contact.lead` take `{site}`;
  `forms.fileTooLarge` takes the file name; `forms.closesOn` takes `{date}`; `forms.fileHint`
  assembles a size and an extension list. `10 MB` is hardcoded beside `ATTACHMENT_MAX_BYTES` in
  `FormRenderer.tsx` - derive the number from the constant rather than freezing it into English.

## Out of scope

Everything in SLICE-COMMON, plus `src/components/sections/SectionRenderer.tsx` (S4),
`src/lib/ui-strings/site.ts` and `src/lib/ui-strings/sections.ts`.

## Acceptance

Everything in `SLICE-COMMON.md`. Your round-trip proof uses a `$lang.contact.tsx` key - change it at
`/admin/ui-strings`, show it on `/en/contact`, reset it, show the original back. Two screenshots
into `.work/i18n/s3-shots/`.

Report to `.work/S3-report.md`.
