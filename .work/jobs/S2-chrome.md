# S2 - site chrome

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows. This file only
names your share.

## Files you own

- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/SubPage.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/Dialogs.tsx`
- `src/components/AnnouncementPopup.tsx`
- `src/components/Lightbox.tsx`
- `src/components/PublicRichText.tsx`
- `src/lib/ui-strings/nav.ts` - your dictionary module. Nobody else opens it.

`Dialogs.tsx` was changed earlier today: focus now returns to whatever opened a dialog, and the
toast ordering was fixed. **Read it as it stands and do not disturb either.** Your change there is
the words only.

## Your rows

`.work/i18n/INVENTORY.md`, the `###` block for each of your eight files. Prefixes: `nav.`, `top.`,
`footer.`, `theme.`, `dialog.`, `announcement.`, `lightbox.`, `media.`, `richtext.`.

Some of these keys already exist - `top.search`, `top.sitemap`, `nav.home`, `nav.menu`,
`nav.contact`, `nav.donate`, `top.login`, `newsletter.*`, `footer.calendar`, `announcement.*`. Those
are already in `nav.ts` or another module. **Reuse them, do not redefine them** - a key defined in
two modules fails `dictionary.test.ts` by design.

## Two specifics

- **`Dialogs.tsx` is shared with the admin.** A string there that only ever appears on an admin
  screen is out of scope this round: mark the row `skipped` with that reason rather than keying it.
  Check where each one actually renders before you decide; do not guess from the file's name.
- **`Footer.tsx` carries the newsletter strings**, which already have keys. The footer's *content* -
  blurb, links, copyright - comes from `site_settings` and is already editable at `/admin/footer`.
  Do not turn content into keys. If you cannot tell which a string is, the inventory row says.

## Acceptance

Everything in `SLICE-COMMON.md`, plus: your round-trip proof uses a `Header.tsx` key, because the
header renders on every page - change it in `/admin/ui-strings`, show it on the public home page,
reset it, show the original back.
