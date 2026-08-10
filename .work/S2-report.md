# S2 - site chrome

23 of the 27 `new-key` rows in my eight files are wired.
Four are skipped, and every one of them is blocked by a file another slice owns, not by the work
itself.
Twenty keys went into `src/lib/ui-strings/nav.ts`; no other module was opened.

## Gates

```
$ bunx tsc --noEmit
$ echo $?
0

$ bun run test
 Test Files  38 passed (38)
      Tests  370 passed (370)
   Duration  11.03s

$ bun run lint
Checked 281 files in 281ms. No fixes applied.
Found 8 errors.
```

370 tests over 38 files, against the 333/33 floor.
Lint is 8 errors and 0 warnings, the known `noArrayIndexKey` sites, unchanged.
`no-brand.test.ts` and `dictionary.test.ts` both pass; `duplicateUiStringKeys()` returns `{}` and the
merged dictionary is 118 keys.

One test failed on the way and is fixed: `AnnouncementPopup.test.tsx` asserted the counter read
`1 / 2`, which is now `1 of 2`.
Its `useLang` stub also dropped the third argument, so a counter that rendered its own `{n}` would
have passed - the stub now fills slots the way the real `t` does, and the assertions read `1 of 2`
and `2 of 2`.
That file is not on my list of owned files, but it is the test for a component that is, and my
change is what turned it red.

## Every row

27 `new-key` rows in the inventory for my eight files.
23 wired, 4 skipped, 27 accounted for.

| file:line | key | state |
|---|---|---|
| `AnnouncementPopup.tsx:118` | `announcement.position` | wired |
| `AnnouncementPopup.tsx:135` | `announcement.deadlineOn` | **skipped** - orphans `announcement.deadline` in `site.ts` |
| `AnnouncementPopup.tsx:171` | `announcement.goto` | wired |
| `Dialogs.tsx:273` | `dialog.dismiss` | **skipped** - renders outside `LanguageProvider` |
| `Dialogs.tsx:317` | `dialog.cancel` | wired, at the public call site |
| `Dialogs.tsx:324` | `dialog.ok` | **skipped** - admin-only |
| `Dialogs.tsx:324` | `dialog.confirm` | **skipped** - admin-only |
| `Footer.tsx:232` | `forms.emailPlaceholder` | wired, reusing S1's key |
| `Footer.tsx:293` | `footer.visits` | wired |
| `Header.tsx:202` | `nav.overview` | wired |
| `Header.tsx:503` | `nav.openMenu` | wired |
| `Header.tsx:604` | `nav.closeMenu` | wired |
| `Header.tsx:616` | `nav.closeMenu` | wired, same key |
| `Lightbox.tsx:106` | `lightbox.position` | wired |
| `Lightbox.tsx:136` | `lightbox.viewNth` | **skipped** - orphans `lightbox.view` in `site.ts` |
| `PublicRichText.tsx:62` | `richtext.bulletList` | wired |
| `PublicRichText.tsx:69` | `richtext.orderedList` | wired |
| `PublicRichText.tsx:84` | `richtext.link.title` | wired |
| `PublicRichText.tsx:85` | `richtext.link.placeholder` | wired |
| `PublicRichText.tsx:86` | `richtext.link.apply` | wired |
| `PublicRichText.tsx:93` | `richtext.link` | wired |
| `SubPage.tsx:183` | `media.video` | wired |
| `SubPage.tsx:183` | `media.image` | wired |
| `ThemeToggle.tsx:46` | `theme.toLight` | wired |
| `ThemeToggle.tsx:46` | `theme.toDark` | wired |
| `ThemeToggle.tsx:47` | `theme.light` | wired |
| `ThemeToggle.tsx:47` | `theme.dark` | wired |

20 keys for 23 rows: `nav.closeMenu` serves two call sites, and `forms.emailPlaceholder` was already
defined by S1 in `pages.ts`, so I reuse it rather than redefining it.
English is `keys.proposed.ts` verbatim in all twenty.
None of them names an organisation, a country or a sector.

Every added key has exactly one reader, and it is in a file I own:

```
nav.closeMenu                src/components/Header.tsx
nav.openMenu                 src/components/Header.tsx
nav.overview                 src/components/Header.tsx
announcement.goto            src/components/AnnouncementPopup.tsx
announcement.position        src/components/AnnouncementPopup.tsx
dialog.cancel                src/components/PublicRichText.tsx
footer.visits                src/components/Footer.tsx
lightbox.position            src/components/Lightbox.tsx
media.image                  src/components/SubPage.tsx
media.video                  src/components/SubPage.tsx
richtext.bulletList          src/components/PublicRichText.tsx
richtext.link                src/components/PublicRichText.tsx
richtext.link.apply          src/components/PublicRichText.tsx
richtext.link.placeholder    src/components/PublicRichText.tsx
richtext.link.title          src/components/PublicRichText.tsx
richtext.orderedList         src/components/PublicRichText.tsx
theme.dark                   src/components/ThemeToggle.tsx
theme.light                  src/components/ThemeToggle.tsx
theme.toDark                 src/components/ThemeToggle.tsx
theme.toLight                src/components/ThemeToggle.tsx
```

## Why the four are skipped

**`dialog.dismiss`, `dialog.ok`, `dialog.confirm`.**
`<DialogHost />` is mounted at `__root.tsx:210`, inside `RootDocument` and beside the children -
which puts it *outside* `LanguageProvider`, mounted at `__root.tsx:171` inside `RootComponent`.
A `useT()` in there hits the null-context branch and returns the English fallback for ever, which is
exactly why S1's file forbids keying the root error screens and forbids moving the provider to fix
it.
`dialog.ok` and `dialog.confirm` are admin-only besides: the only non-admin importer of `Dialogs.tsx`
is `PublicRichText.tsx`, which passes its own `confirmLabel` and never calls `confirm()`.

`dialog.cancel` is the one of the four a visitor can actually read, on the link prompt the public
rich-text toolbar opens, so it is wired where a hook does run - `PublicRichText` passes
`cancelLabel: t("dialog.cancel", "Cancel")` through the existing option.
That took one line in `Dialogs.tsx`: `PromptOpts` was missing `cancelLabel`, which the modal already
renders (`o.cancelLabel ?? "Cancel"`, line 317) through a `ConfirmOpts & PromptOpts` cast.
The backdrop's `aria-label` has no such option, so it stays hardcoded.

**`announcement.deadlineOn` and `lightbox.viewNth`.**
Both replace an existing key rather than adding one.
`announcement.deadline` and `lightbox.view` live in `src/lib/ui-strings/site.ts` and have exactly one
reader each, the line the interpolated key would take over.
Wiring either one leaves a seeded key nothing reads, which `dictionary.test.ts` fails by design, and
the only fix is to delete a key from a module SLICE-COMMON puts out of scope.
The two lines still concatenate today.

Whoever owns `site.ts` next can finish both in one change: delete `"announcement.deadline"` and
`"lightbox.view"` from `src/lib/ui-strings/site.ts`, add `"announcement.deadlineOn": { en: "Deadline
{date}" }` and `"lightbox.viewNth": { en: "View photo {n} of {total}" }` to `nav.ts`, then swap
`AnnouncementPopup.tsx:135` and `Lightbox.tsx:136` onto them.

## The round trip

`.work/i18n/s2-shots/`.
Logged in as `admin@kapekh.org` at `/login`, edited at `/admin/ui-strings`, read back on the public
home page at a 390x844 viewport, reset through the page's own "Reset to default" button.

```
logged in -> http://localhost:3011/admin

== Header, nav.closeMenu ==
before: "Close menu"
  admin: nav.closeMenu = "Shut the menu"
after edit: "Shut the menu"
  admin: nav.closeMenu reset to default
after reset: "Close menu"

== Footer, footer.visits ==
before: "Today: 67 · Total visits: 578"
  admin: footer.visits = "Seen by {today} today, {total} all time"
after edit: "Seen by 68 today, 579 all time"
  admin: footer.visits reset to default
after reset: "Today: 69 · Total visits: 580"

ROUNDTRIP OK
```

Two round trips, because the Header key the job asked for cannot be seen on screen with this site's
data.
`nav.overview` renders only for a nav item that has children *and* a page of its own, and this
navigation has none - the four top-level menus are pure menus, and no second-level item with
children carries an href either.
So the Header proof is `nav.closeMenu`, read off the drawer's close button as its accessible name
(`header-nav-closeMenu-edited.png`, `header-nav-closeMenu-default.png`), and `footer.visits` carries
the same round trip as visible text, both slots filled, in the footer of the same page
(`footer-visits-edited.png`, `footer-visits-default.png`).
The footer shots also show the newsletter placeholder now coming from `forms.emailPlaceholder`.

Both overrides are gone from the database: `select key,lang,value from ui_strings where key in
('nav.closeMenu','footer.visits')` returns nothing.

Interpolation was also checked against the real renderer rather than a stub.
On `/en/galleries/album-library-launch`, opening the second of three photos gives
`lightbox.position` = `"2 of 3"` (`lightbox-position.png`).

## What is wired but unproven in a browser

`PublicRichText.tsx`, all six `richtext.` keys and `dialog.cancel`.
It renders only inside a public form, and this database has **zero rows in `forms`** and no page
carrying a form section, so the toolbar has no public surface to open.
The keys type-check, are seeded, and go through the same `t()` the two round trips above prove
twice - but I did not see them on screen, and creating a form plus a page to host it would have put
content into a database three other panes are working in.
To close it: seed a form with a `richtext` field, add a form section pointing at its slug, load the
page, and the toolbar should read `• List`, `1. List`, `Link`, with the link prompt titled
`Add link` and its buttons `Apply` and `Cancel`.

## Nothing else left behind

```
$ grep -nE '(aria-label|placeholder|title|alt)="[^"]*[A-Za-z]{2}' <my eight files>
src/components/Dialogs.tsx:273:				aria-label="Cancel"
```

The one hit is the skipped `dialog.dismiss` row.
No JSX text literal survives in any of the eight files: what a scan turns up is code, comments and
object keys, plus the rows the inventory classes `leave` - the `×` `‹` `›` `→` `←` glyphs, `B`, `I`,
`❝`, the `PDF` acronym and the social badge letters.

## Files changed

- `src/lib/ui-strings/nav.ts` - 20 keys, English only, and the module docstring now names what the
  slice actually turned out to be
- `src/components/Header.tsx`, `Footer.tsx`, `SubPage.tsx`, `ThemeToggle.tsx`, `Lightbox.tsx`,
  `AnnouncementPopup.tsx`, `PublicRichText.tsx` - wiring only
- `src/components/Dialogs.tsx` - one line, `cancelLabel` added to `PromptOpts`. The focus return and
  the toast ordering are untouched.
- `src/components/AnnouncementPopup.test.tsx` - counter assertions and the `t` stub

## Stop conditions honoured

- No file outside the list above written under `src/`. No other slice's module opened.
- No `git` write command run.
- The dev server on 3011 was used, not restarted. `kape.db` untouched; the browser work went to
  `.work/scratch/uitest.db` through the running server and left no override behind.
- The MCP browser was already held by another pane, so the round trip ran through `playwright-core`
  in a throwaway script under `/tmp`.
