# C10 - Deleting a picture stops breaking the page that shows it

## Objective

Two things that are really one thing: a check at the server that nobody can see, and no way for a
test to reach the server to look.

J23 drove this against a real admin and a real server. Confirmed again in the lead pane by reading
the query, so do not re-litigate it:

`adminMediaUsage` (`src/server/repo/admin.ts:1204`) iterates `MEDIA_REFS` and nothing else, and
`MEDIA_REFS` (`admin.ts:1045`) is a list of foreign-key columns - post cover, post gallery, page
hero and the rest. An image referenced only as a URL inside a rich text body or inside the
`pages.sections` JSON is invisible to it.

So: the confirm dialog says nothing is using the image, `deleteMedia` clears the refs, drops the
row and unlinks the file, and the live page keeps a URL that now 404s. The bytes are gone. J23's own
control proves the boundary - the same image as a post cover produced the full "still used in 1
place" warning from the same dialog.

You are done when an image an editor embedded in a page cannot be deleted without being told, and
when a test can call a tRPC procedure at all.

## Files you own

- `src/server/repo/admin.ts`
- `src/integrations/trpc/router.ts`
- new test files, yours to name
- `.work/c10-report.md`, `.work/c10-shots/`

Nothing else. C9 is live in `package.json`, `docs/`, `src/lib/i18n-config.ts`, `src/server/install.ts`,
`src/routes/sitemap[.]xml.tsx`, `scripts/gen-prerender-paths.ts` and the `LANGS` import lines of four
route files. Do not open any of them.

`router.ts` is 1200+ lines and shared by every admin screen. You own it outright this time, but a
diff that wanders outside the two procedures below and whatever the tests need is still wrong.

## 1. Usage has to look where editors actually put images

Establish first, by query rather than by assumption, every place a media URL can end up:

- `pages.sections` JSON. Section props hold raw URLs; `SECTION_DEFS` will tell you which keys.
- Rich text bodies. Find every column that stores editor HTML, not just the one you think of.
- Anything else the seed or the admin writes. `translations` is worth a look.

Then make `adminMediaUsage` report those alongside the foreign-key hits, with the same shape the
dialog already renders: a kind, a label an operator recognises, and a link to the thing.

**Match on the URL, and be honest about the match.** A `LIKE '%<url>%'` over JSON will have false
positives if one URL is a prefix of another, and the uploads are uuid-named so that is unlikely
rather than impossible. Say which you chose and what it can get wrong. A usage check that
occasionally over-reports is safe; one that under-reports is this defect again.

**Decide what `deleteMedia` does about the new references and say why.** Clearing a foreign key is
well defined. Editing an editor's HTML to remove an `<img>` is not, and doing it silently inside a
delete transaction would be a worse defect than the one you are fixing. Refusing the delete, or
deleting only after the operator has seen the list and confirmed, are both defensible. Rewriting
someone's content is not.

## 2. A test has to be able to call a procedure

`checkSettingValue` was added to `adminSettings.set` (`router.ts:919`) precisely because the browser
is not a trust boundary. **Gutting that check leaves the whole suite green** - verified in the lead
pane by mutation. The same will be true of your usage fix unless this is solved.

Land an in-process caller: build the tRPC caller against a scratch database, call the procedure,
assert on what it returns and on what the database then holds. Then cover both:

1. `adminSettings.set` with `theme_primary = banana` rejects and writes no row. Removing
   `checkSettingValue` from the procedure must fail this test by name.
2. `adminMediaUsage` reports an image embedded in a page section and in a rich text body. Reverting
   your change to `MEDIA_REFS`-only must fail this test by name.

Check what already exists before building anything. `src/routes/-admin.settings.test.tsx` shows how
the last job mounted something previously untestable. **Do not add a dependency** - if this needs
one, stop and report what it would cost.

Every assertion gets mutation-tested: break the line it covers, watch the named test fail, restore
it. Paste both runs.

## Acceptance

1. The inventory of every place a media URL can be stored, as a query and its output, not a list you
   wrote from memory.
2. In a real browser against a running server: embed an image in a page section, embed another in a
   rich text body, then try to delete each. Screenshot the dialog. It must name where the image is
   used and link to it.
3. The control still works: an image used as a post cover still reports exactly that, and an image
   used nowhere still deletes cleanly with no false warning.
4. Whatever you decided `deleteMedia` does, demonstrated. If it refuses, show the refusal and show
   the file still on disk afterwards. If it deletes after confirmation, show the page afterwards and
   say plainly what the operator is left with.
5. Both tRPC tests, each shown failing against the deliberately broken line and passing against the
   fixed one. Paste both runs.
6. `bun run test` at or above 256 over 22 files. `bunx tsc --noEmit` silent. `bun run format` clean.
   Report the counts you started from and ended with.
7. `package.json` and `bun.lock` unchanged, proving no dependency was added.

## Out of scope

- `src/routes/admin.media.tsx` and the `Media*` components. J23 owns that surface and exercised it;
  if the dialog needs a change to render your new usage kinds, that is a finding to report.
- The settings page and the theme validator. C8 shipped; you are only adding the gate under it.
- Anything C9 owns, listed above.
- The 219 lint errors.

## Stop conditions

- **Never run against the repo's `kape.db`.** `VACUUM INTO` a copy, `export DATABASE_PATH`,
  `export SSG_CACHE=off`. It is WAL-mode; a bare `cp` drops the `-wal`. J23 verified the repo
  database is currently untouched - keep it that way.
- **Never leave a dev server writing to an unbounded log.** One did that here on 2026-08-06 and
  reached 31.7 GiB in three hours. Cap it.
- Do not commit, do not touch git, do not edit the worklog.
- Do not add a dependency. Stop and report the cost instead.
- If making usage complete means editing stored content, stop. That is a decision, not an
  implementation detail.
