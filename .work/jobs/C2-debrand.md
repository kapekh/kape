# C2 - The code stops knowing it is KAPE

## Objective

Remove KAPE's identity from the shipped source, so a fresh install is a blank CMS rather than KAPE's website with the words changed.

Two halves, and they are different kinds of work:

- **~62 strings** that should be read from `site_settings` / `ui_strings` at runtime instead of being compiled in.
- **~23 markers** with a customer's name inside an identifier: a cookie name, CSS classes, storage keys, an order-id prefix.

You are done when `grep -ri kape src/` returns nothing outside `src/server/seed/` (which is C1's KAPE fixture and stays), and the site still renders identically when the settings hold KAPE's values.

## The tell that this is real

`src/components/Footer.tsx:146-151` reads the organisation name from settings via `s("site_name_km")` and `s("site_name_en")`.
`src/components/Header.tsx:413-417` has the same two names typed into the JSX as literal text, Khmer and English.

Same values, same page, one right and one wrong. The mechanism already exists and is already used. Most of this job is pointing the rest of the code at it.

## Half one: strings that should be settings

Known sites, from a survey. Verify rather than trust the line numbers; the tree has moved.

- `src/routes/__root.tsx:51-77` - title, description, `og:site_name`, `og:title`, `og:description`, `og:image`, `theme-color`, favicon, apple-touch, manifest
- `src/lib/structured-data.ts:18-64` - `name`, `alternateName`, `description`, `email`, `telephone`, `areaServed`, the full `PostalAddress`, publisher name, and post author defaulting to "KAPE Cambodia"
- `src/components/Header.tsx:408-417` - `alt`, and both organisation names
- `src/components/Footer.tsx:142,286` - `alt`, and the copyright fallback
- `src/routes/$.tsx` - 12 sites: every page title suffixed `KAPE`, two meta descriptions as literals, breadcrumb section defaulting to "KAPE", post author defaulting to "KAPE Cambodia"
- `src/routes/admin.tsx` - "KAPE Admin", logo alt
- `src/routes/login.tsx` - "Back to kapekh.org"
- `src/routes/internalsources.tsx` - "KAPE Staff Portal"
- `src/server/mail.ts:29` - the contact email subject
- `src/lib/ui-strings.default.ts` - 11 occurrences, plus `Tel: 042-941-481 · kape@kapekh.org` in both languages
- `src/lib/footer-defaults.ts`, `src/lib/donate-defaults.ts`, `src/lib/header-defaults.ts`
- `src/env.ts` - `MAIL_TO` defaulting to a KAPE address
- Admin help copy and placeholders across roughly 19 files: `admin.offices.index`, `admin.schools.index`, `admin.partners.index`, `admin.donors.index`, `admin.index`, `admin.messages`, `OfficeForm`, `SchoolForm`, `DonorForm`, `PartnerForm`, `PostForm`, `FormBuilder`, `PeopleForm`, `UserForm`, `admin.settings`, and others you find

**A default is not a brand.** `FOOTER_DEFAULTS` and friends should ship something generic and usable, so an unconfigured install renders sensibly. Neutral placeholder text is right; KAPE's phone number is not.

**Do not turn everything into a setting.** Some of these want a neutral default in code and no setting at all. Use judgement and say what you decided. A settings screen with 60 fields is its own failure.

## Half two: markers with a customer's name in them

| What | Where | Note |
|---|---|---|
| `kape_session` cookie | `src/server/auth.ts:17` | renaming logs everyone out once; fine, say so |
| `.prose-kape` | `src/styles.css:273-319`, used in 9 files | ~20 declarations |
| `.kape-form-embed`, `data-kape-form` | `src/lib/richtext/form-node.ts`, `RichBody.tsx`, `FormEmbeds.tsx`, `styles.css:406` | **see below** |
| `.kape-pin` | `src/components/MapView.tsx:105` | |
| `kape-nav-folded` | `src/routes/admin.tsx:175,184` | localStorage |
| `kape:announcements-dismissed` | `src/components/AnnouncementPopup.tsx:11` and its test | localStorage |
| `KAPE-${uuid}` order id | `src/routes/api.pay.$.tsx:95` | live payment records carry this prefix |
| `./kape.db` default | `src/env.ts:14` | |

**`data-kape-form` is the one that can break existing content.** That attribute is serialised inside authored HTML already stored in the database. Renaming the attribute without migrating stored rich text silently breaks every embedded form on every existing page.

So: either migrate the stored content as part of this job, or make the renderer accept both the old and the new attribute. Migrating is cleaner; accepting both is safer. Pick one, justify it, and **prove embedded forms still render on a database seeded before your change**.

The order-id prefix has a similar shape. Existing donation rows carry `KAPE-`; anything that parses that prefix must keep working.

## Files you own

Everything listed above, plus `src/styles.css`.

**Read-only, and another pane owns them right now:** all of `src/server/seed/`, `src/server/seed.ts`, `src/server/migrate-tree.ts`, `scripts/apply-tree.ts`, `docker-entrypoint.sh`, `package.json`.

C1 is rebuilding the seed. You will want to change KAPE strings in there. Do not: that content is deliberately being preserved as a loadable KAPE fixture. Your job is the source, not the fixture.

If you need a settings key that only C1 can seed, define the key and its default in code so it works unseeded, and note the handoff in your report.

## Do

1. **Inventory first, from the tree, not from this document.** `grep -rn` for `KAPE`, `kape`, `kapekh`, the Khmer organisation name, the phone number, and the social URLs. Record the real count before you start so the after number means something.
2. Decide, per site, whether it becomes a setting, a neutral in-code default, or a rename. Write the rule you used.
3. Implement. Strings first, markers second, `data-kape-form` last and carefully.
4. **Prove nothing regressed for KAPE.** Put KAPE's values into settings, load the site, and confirm it looks and reads exactly as it does today. This branch goes back to being KAPE later; a de-brand that quietly changes the client's site has failed.
5. Leave a runnable check that fails if a brand string comes back. A test asserting the source is free of the pattern is cheap and will catch the next person.

## Acceptance

1. `.work/c2-report.md` with the before inventory, the rule you applied, and the after count.
2. `grep -ri kape src/` returns nothing outside `src/server/seed/`. Show the command and its output.
3. With KAPE's values in settings, the public site is unchanged: home, a content page, an article, the footer, the admin shell, the login page. Before and after screenshots side by side.
4. With settings empty, the site still renders without crashing and shows neutral text, no blank titles and no `undefined`. Screenshots.
5. Embedded forms still render on a database seeded before your change. This is the one that can silently break content; show it working.
6. A runnable check that fails if a brand string returns.
7. `bun run test` at or above the count when you start, plus yours. `bunx tsc --noEmit` silent. `bun run format` clean.

## Out of scope

- Colours, fonts, the theme. C3, and it will contend with you on `src/styles.css` - which is why C3 runs after you, not beside you.
- Making Schools, Org chart, Donors optional. C4.
- The KAPE seed content. C1.
- `KhmerCalendar.tsx` and the Khmer font stack. They are Khmer, not KAPE, and belong to the i18n work. Leave them.
- Lint. Red repo-wide.

## Stop conditions

- Never run against the repo's `kape.db`. Copy with `VACUUM INTO`, never `cp`, and `export DATABASE_PATH` to the copy.
- Do not commit, do not touch git, do not edit the worklog.
- Do not rename anything in `drizzle/` or change a column name. Schema is not in this job.
- If migrating stored rich text looks risky, stop and report rather than running a migration you are unsure of. Authored content is the one thing here we cannot regenerate.
