# C6 - A fresh install must not ship the last customer's prose

Round two on C2. An independent audit confirmed the markers were renamed cleanly, that the visible body text of 16 routes is unchanged, that embedded forms survive on pre-change databases, and that the `render_cache` versioning was both a real hazard and a correct fix with contained blast radius. That work stands and is not to be redone.

Two things it found are the job.

## 1. The fresh install is KAPE's dictionary with one word deleted

**82 of the 90 `ui_strings` rows a blank install writes are byte-identical to the KAPE fixture's.** A brand-new install for "Acme Foundation" ships:

- `footer.copyright` = `© 2026 Kampuchea Action to Promote Education`
- `home.hero.1` = `Where every Cambodian child`
- `home.badge` = `Three decades of impact · 1994 - 2026`
- `nav.media.escup` = `ESCUP Sources`, alongside `nav.who.speech`, `nav.media.life`, `home.stat.provinces` and the rest of a Cambodian education NGO's information architecture

The database passes `grep -ri kape` because the *word* was removed. The customer's prose was not. This is the objective of the whole branch, and the criterion I wrote was satisfied while the point was missed. That is my error in the brief, not yours to defend.

**Split the dictionary.** `src/lib/ui-strings.default.ts` becomes a neutral product dictionary: the chrome a CMS needs in any language for any organisation, with no Cambodia, no education sector, no dates, no programme names, no invented history. `src/server/seed/ui-strings.kape.ts` keeps KAPE's, and the fixture keeps shipping it.

**Keep the exported shape of the default dictionary unchanged.** C5 owns `install.ts`, which imports it, and a shape change becomes a cross-job edit neither of us should make.

Where a key is genuinely KAPE-only, such as `nav.media.escup`, decide whether it belongs in the product dictionary at all. A neutral install with a smaller dictionary is better than one with placeholder text for navigation it does not have.

## 2. The whole de-brand hangs on two keys nothing seeds and nothing surfaces

`site-identity.ts` reads `site_name_short` and `site_description`. C5's KAPE fixture sets `site_name_en` and `site_name_km` but **neither of these**, and `/admin/settings` is a bare key/value grid that names neither. So the state the builder demonstrated was a hand-edited database, and the state that actually ships is:

| route | `main` today | branch as it ships |
|---|---|---|
| `/en` | `KAPE — Kampuchea Action to Promote Education` | `Kampuchea Action to Promote Education` |
| `/en/news` | `News & Events — KAPE` | `News & Events — Kampuchea Action to Promote Education` |
| `/login` | `Sign in — KAPE Admin` | `Sign in — Kampuchea Action to Promote Education Admin` |
| `/en/nope` | `KAPE` | `Your organisation` |

and `<meta name="description">` is emitted on **no page at all**.

Fix it so the shipping state is correct. Three routes are open and you should pick and justify: a smarter fallback in `site-identity.ts` so an unset short name derives sensibly rather than pasting a 37-character legal name into every title; surfacing both keys in the settings screen so an operator can find them; or asking C5 to seed them, which is a handoff and not an edit you make. More than one may be right.

## The five defects the audit named

- **D1, worst.** Every 404 renders `<title>Your organisation</title>` and the same `og:title`, on a fully configured site. `$.tsx` `head()` reads `loaderData?.settings ?? {}` and `notFound()` leaves `loaderData` undefined. Two visible occurrences per page. `main` showed the organisation's name.
- **D2.** The home page lost its own `og:image` and its own meta description. `main` hardcoded them in `$.tsx`; the branch reads `page.coverUrl` and `page.excerpt`, and KAPE's home row has neither. Every Facebook share of the homepage goes from a photograph of students to the logo. Recoverable by editing the page in admin, but nobody has been told, so decide whether the fallback should be better or the fixture should carry the values.
- **D4.** `organizationLd` now emits `telephone: "042-941-481 / 042-941-918"`, two numbers in a field schema.org expects to hold one, and dropped `areaServed`, `addressRegion` and `addressCountry`. Structured data is machine-read; a malformed field is worse than an absent one.
- **`articleLd` publisher inconsistency.** It calls `siteName` where the title path calls `siteShortName`, so the publisher on an article is the full legal name while the page title uses the short one.
- **D5, benign, needs a line in the report only.** The cookie and localStorage renames log everyone out once and reset dismissed announcements and admin sidebar folds.

## Three unreachable defaults an operator will actually want

Named by the audit, and I agree with all three: the social share image (`og:image` hardcoded `/logo.png`, no setting, no per-page override), and `MAIL_TO` now defaulting to empty so a fresh install's contact form accepts submissions and mails nobody while logging instead of warning. `theme-color` is the third and is C3's, so leave it.

Fix the first two or say why not. "Accepts the message and silently mails no one" is the kind of failure a small NGO discovers three months later.

## The guard is narrower than it looks

`src/lib/no-brand.test.ts` walks `src/` only and matches two words, so it cannot see the phone number, the Khmer organisation name, or anything outside `src/`. It also exempts `src/server/install.ts` as a "fixture" when it is the product path, so a brand string written there would never be caught. Widen the patterns, and remove that exemption.

## Files you own

- `src/lib/ui-strings.default.ts`, `src/server/seed/ui-strings.kape.ts`
- `src/lib/site-identity.ts`, `src/lib/structured-data.ts`
- `src/routes/$.tsx`, `src/routes/__root.tsx`, `src/routes/admin.settings.tsx`
- `src/routes/sitemap[.]xml.tsx`, `src/routes/llms[.]txt.tsx`
- `src/lib/no-brand.test.ts`
- `src/env.ts` for `MAIL_TO` only
- `.work/c6-report.md`

**C5 runs beside you** and owns `install.ts`, the rest of `src/server/seed/`, `scripts/`, `package.json`, `docker-entrypoint.sh`, `docker-compose.yml`, `Dockerfile`, `.env.example`, `vite.config.ts`, `drizzle.config.ts`. Do not edit those; C5 is fixing an installer defect that can wedge a database and will be moving inside them.

On `sitemap.xml` and `llms.txt`: a blank install advertises 20 URLs of which 16 are 404, because both enumerate hardcoded `COLLECTIONS` x `LANGS` rather than what exists. The route files are yours. Whether a fresh install should seed collection landing pages is C5's. Do your half and record the handoff.

## Acceptance

1. `.work/c6-report.md` with the dictionary split, the reasoning on the two keys, and each defect before and after.
2. A fresh install's `ui_strings` contains no sentence traceable to KAPE: no Cambodia, no education-sector vocabulary, no 1994, no programme names. Show the full dictionary a blank install produces and defend every row that mentions anything specific.
3. **In the state that actually ships**, with no hand-editing: `/en`, `/en/news`, `/login` and a 404 all carry a correct title, and every page emits a meta description. Show the served HTML.
4. A 404 on a configured site shows the organisation's name, not "Your organisation".
5. `organizationLd` emits one telephone number and restores the address fields. Validate the output rather than eyeballing it.
6. The contact form on a fresh install either warns loudly that mail is unconfigured or refuses; it must not silently accept and discard.
7. KAPE's own site is unchanged with the fixture's settings, including page titles and `og:` tags. Diff against `main`.
8. The brand guard sees the phone number, the Khmer name, and `src/server/install.ts`. Show it failing on a planted string in that file.
9. Gates: `bun run test` at or above 72, `bunx tsc --noEmit` silent, `bun run format` clean.

## Out of scope

- The installer, the seed mechanics, config files outside `src/`. C5.
- Colours, fonts, `theme-color`. C3.
- `LANGS = ["en","km"]`. Separately scoped.

## Stop conditions

- Never open the repo's `kape.db`. `VACUUM INTO` copies and temp files only.
- Do not commit, do not touch git, do not edit the worklog.
- No em dashes, including in the user-facing copy you are writing. This is where new copy enters the product, so it matters here more than anywhere.
- If neutralising a string would change KAPE's rendered site, stop: the fixture must keep KAPE's wording exactly.
