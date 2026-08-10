# UAT-B report — KAPE CMS admin, content-editor acceptance

Tester: UAT-B (content editor persona). Server: `http://localhost:3020` against `.work/uat/uat.db`.
Browser: headless Chromium driven by `playwright-core` scripts (now deleted from `.work/scratch/`).
Screenshots: `.work/uat/b-shots/` (97 files).
Everything below was observed in the running app unless a line says "from source".

## 1. Verdict

**Not UAT-ready.** The admin does its core job well — pages, sections, rich text, posts of every
type, media, forms, navigation, footer, theme, UI strings and the whole records layer all create,
edit, publish and delete correctly, and every change I made showed up on the public site. But two
classes of defect block sign-off. The blocking one: **a delete that the server refuses still
destroys part of the record first**. Deleting a project that has a school attached is correctly
refused, and by the time the refusal appears the project has already lost its English and Khmer
title, summary and body — silently, with no undo. The same non-transactional pattern sits under
`deletePost`, `deletePage` and the rest. Alongside it, **a user who has ever signed in cannot be
deleted at all**, and **adding a language puts a 404 link on every page of the public site**.

On the second question — is every visitor-facing string editable without a developer — the answer
is no. **91 hardcoded items (119 individual strings once the calendar's month and weekday arrays
are expanded)**, concentrated exactly where the brief predicted: the entire donate flow (46), the
whole staff portal (26), the Khmer calendar, the share buttons and the map. Everything else on the
public site is genuinely reachable from `/admin/ui-strings`, the page editors or the record forms.

## 2. Coverage

| Admin surface | CRUD exercised | Verdict |
|---|---|---|
| `/admin` dashboard | read only | pass (but see F6: quick-link tiles ignore permissions) |
| `/admin/pages`, `.new`, `.$id` | create, edit, publish/unpublish, sections builder (all 21 types), reorder, remove, rich text, cover image, parent/child nesting, slug rename + 301, delete | pass |
| `/admin/posts`, `.new`, `.$id` | create ×10 content types, edit, draft, archive, delete, public URL per collection | pass |
| `/admin/projects`, `.new`, `.$id` | create, read, edit, delete | **fail — F1** |
| `/admin/media` | upload (accepted + rejected), search, filter, insert into page, in-use warning, delete | pass |
| `/admin/forms`, `.new`, `.$id`, `.$id/submissions` | build 3 fields, publish on a page, submit as visitor, required validation (client + server), read submissions, CSV export, delete | pass |
| `/admin/messages` | read (contact form submission), delete | pass |
| `/admin/nav` | header settings save/revert, create menu item, verify public, delete | pass |
| `/admin/footer` | edit copyright, verify public, revert | pass |
| `/admin/locations` | create, edit, delete | pass (F11: no in-use guard) |
| `/admin/publication-categories` | render + list | partial — same `TermsManager` as locations, CRUD not separately run |
| `/admin/doc-categories` | render + list | partial — same component |
| `/admin/partner-categories` | render + list | **partial — F4: the label an admin edits is ignored publicly** |
| `/admin/languages` | add, enable, delete | **fail — F3** |
| `/admin/ui-strings` | search, edit, verify public, reset to default, verify, "only changed" filter | pass |
| `/admin/settings` | site identity save + revert, brand colours, dark mode, free-form add/delete setting | pass |
| `/admin/modules` | toggle Partners off, confirm admin route + nav disappear, toggle back | pass |
| `/admin/users`, `.new`, `.$id` | create ×3, duplicate-email error, weak-password validation, delete | **fail — F2** |
| `/admin/roles`, `.new`, `.$id` | create with 2 areas, list, delete | pass (F10: generic row-action labels) |
| `/admin/people`, `.new`, `.$id` | create, public `/en/team` + detail, delete | pass |
| `/admin/partners`, `.new`, `.$id` | create, public partners wall, delete | pass |
| `/admin/donors`, `.new`, `.$id` | create, delete | pass |
| `/admin/donations` | read (empty) | **not covered** — needs a real Baray payment |
| `/admin/campaigns`, `.new`, `.$id` | create, public `/en/donate/<slug>`, delete | pass |
| `/admin/campaigns/$id/donations` | — | **not covered** — no donations exist |
| `/admin/offices`, `.new`, `.$id` | create, public contact page, delete | pass |
| `/admin/org-chart` | add node, verify, delete node | pass |
| `/admin/schools`, `.new`, `.$id` | create, link to project, delete | pass |
| `/admin/account` | wrong current password, mismatch, real change, re-login | pass |
| `/login` | wrong password error, correct login, redirect by role | pass |
| `/internalsources` ×4 | staff login, all four tabs render | pass (all text hardcoded — §4) |

Every one of the 40 admin URLs also passed a plain load smoke test with zero console errors
(`.work/scratch/uat-b-05.ts` output).

## 3. Functional findings

### F1 — high — A refused delete destroys the record's translations first

`/admin/projects` → ⋯ → Delete on a project that has a school linked.

- **Steps.** Create project "UAT B Guard Project" (code `UATBG`, slug `uat-b-guard`). Create school
  "UAT B Guard School" and set its Project to that project. Go to `/admin/projects`, open the row
  menu for the project, Delete, Confirm.
- **Observed.** Toast: *"Something else still points at this record. Remove those links first, then
  try again."* The project row survives — but its list entry now reads `UATBG UATBG` instead of
  `UATBG UAT B Guard Project`. `select * from translations where entity_type='project' and
  entity_id=21` returns 0 rows. The English **and** Khmer name, summary and body are gone, plus any
  `project_donors` and `project_locations` links.
- **Expected.** The delete is refused and nothing changes.
- **Root cause (from source).** `deleteProject` in `src/server/repo/admin.ts:2182` deletes
  `translations`, then `project_donors`, then `project_locations`, then `projects` — four separate
  statements, no transaction. The last one fails on the `schools.project_id` foreign key, and the
  first three have already committed. `db.transaction` appears once in the whole file
  (`grep -c "db.transaction" src/server/repo/admin.ts` → 1), so `deletePost`, `deletePage`,
  `deleteMedia`, `deleteNavItem`, `deleteSchool` and the rest share the shape. I only reproduced it
  on projects.
- **I hit this on real fixture data before I isolated it**: project 3 (HCC) lost all 23 of its
  translation rows this way and now displays as `HCC` on `/admin/projects` and `/en/projects/hcc`.
  Not recoverable from the admin.
- Screenshot: `b-shots/104-guard.png`.

### F2 — high — A user who has ever signed in can never be deleted

`/admin/users` → ⋯ → Delete user.

- **Steps.** Create `uatb-staff@kapekh.org` (role Staff). Sign in as that user once. Return to
  `/admin/users` as admin, ⋯ → Delete user → Delete.
- **Observed.** Toast: *"Something else still points at this record. Remove those links first, then
  try again."* The row stays. Repeated six times in a loop, never removed. Their sessions **are**
  revoked, so the account is locked out but permanently listed.
- **Control.** A user created and never signed in as (`uatb-neverlogin@kapekh.org`) deletes cleanly
  on the first try. That isolates the cause to the session rows.
- **Expected.** The account is removed.
- **Root cause (from source).** `deleteUser` in `src/server/repo/users.ts:144` *updates*
  `sessions.revokedAt` rather than deleting the rows, then deletes from `users`, which trips the
  `sessions.user_id` foreign key.
- **Consequence for launch:** `staff@kapekh.org` (1 session in the fixture) is already in this
  state. Two accounts I created — `uatb-staff@kapekh.org` and `uatb-editor@kapekh.org` — are stuck
  in `uat.db` because of this bug; I could not clean them up.
- Screenshot: `b-shots/106-user-delete.png`.

### F3 — high — Adding a language puts a 404 link on every public page

`/admin/languages`.

- **Steps.** Add code `fr`, English name `French`, native name `Français`, click Add.
- **Observed.** Toast "French added.", the row appears with Enabled ticked, and the public language
  switcher immediately shows `Français` in the top bar of every page. `GET /fr` → **404**;
  `GET /fr/contact` → **404**. Opening `/fr` in a browser renders the site chrome around
  *"Page not found — This page doesn't exist"*.
- **Expected.** The screen's own copy says *"A new language appears in the site switcher
  immediately; untranslated content falls back to the default language"*, so `/fr` should serve the
  English content under a French prefix.
- **Root cause (from source).** `src/lib/i18n-config.ts:14` — `export const LANGS = ["en", "km"]`,
  the list the router matches, is a hand-maintained code constant. The file's own comment says
  *"Adding a language: enable it in the admin AND add its code to LANGS"*. So this admin feature
  cannot be completed without a developer, and using it half-way breaks the live site.
- Screenshot: `b-shots/79-fr-page.png`.

### F4 — med — Partner category labels edited in the admin never reach the public page

`/admin/partner-categories` vs `/en/who-we-are/partners`.

- **Observed.** The terms are `local-ngo → "Local NGOs"`, `intl-ngo → "International NGOs"`,
  `news-agency → "News Agencies"`. The public partners wall renders the headings
  `LOCAL NGO`, `INTL NGO`, `NEWS AGENCY` — the slug with hyphens swapped for spaces.
- **Expected.** The label the admin typed.
- **Root cause (from source).** `SectionRenderer.tsx:1778` renders `{cat.replace(/-/g, " ")}`,
  the group key, instead of looking up the term's label.
- Screenshot: `b-shots/112-partners.png`.

### F5 — med — Two admin screens are a permanent "Loading…" for a role that lacks the area

Signed in as a custom Editor role (areas: pages, posts, projects, media).

- `/admin/nav` renders nothing but the word `Loading…` forever, with an uncaught `FORBIDDEN` thrown
  to the console.
- `/admin/forms` renders the page heading, *"Data-collection forms for the public site — 0 total"*
  and a table stuck on `Loading…`, again with an uncaught `FORBIDDEN`. "0 total" is actively wrong:
  a form exists, the account just can't see it.
- Contrast: `/admin/settings`, `/admin/users`, `/admin/modules`, `/admin/ui-strings`,
  `/admin/people`, `/admin/campaigns` all show a proper refusal — *"Your account does not have
  permission to do this. Ask an administrator to grant it."* with a Try again button. Those are
  right; nav and forms are not.
- Screenshots: `b-shots/61-editor-_admin_nav.png`, `b-shots/61-editor-_admin_forms.png`.

### F6 — med — The dashboard's "Manage" tiles ignore permissions

Signed in as the Editor role, the `/admin` dashboard offers quick links to `/admin/schools`,
`/admin/nav`, `/admin/languages` and `/admin/settings`. Every one of them lands on a refusal or on
F5's dead "Loading…". The left sidebar filters correctly; only the dashboard tiles do not.
Repro: log in as an editor-role user, load `/admin`, read the "Manage" row.

### F7 — med — The donate hub's headline is only editable if you already know the setting key

`/en/donate` renders "Support our work / Give to what moves you / Choose a campaign below…". These
come from `site_settings.donate_eyebrow`, `donate_title`, `donate_intro`, whose file comment
(`src/lib/donate-defaults.ts`) says they are *"seeded into site_settings so it's editable in
/admin/settings"*. They are **not** seeded and `/admin/settings` lists no donate field.

I did get them working: `/admin/settings` → Add setting → key `donate_title`, value
`UAT B Donate Heading` → Add. `/en/donate` picked it up immediately. But an editor has no way to
discover the key name, and the value is not language-aware — the same English string then rendered
on `/km/donate` too. Counted in §4 as hardcoded-in-practice.

### F8 — low — The pages list shows a stale path after a parent is deleted

Delete a parent page that has a child (`/admin/pages` → ⋯ → Delete → Confirm). The confirm text is
right — *"Delete this page? Its child pages move up to its parent."* — and the database is right:
the child's slug is rewritten from `uat-b-renamed/child` to `child` and a 301 is recorded. But the
list still prints the old path `/uat-b-renamed/child` until the page is reloaded.

### F9 — low — Deleting a term that records point at is allowed with no warning

`/admin/locations` → ⋯ → Delete on "Kampong Cham", which is the province of office 1 (Head Office).
Confirm reads only *"Delete this item?"*; the term is removed; the office keeps the orphaned string
`Kampong Cham` and the contact page still renders it, but the office's province picker no longer
has a matching option. Compare `/admin/media`, which does this properly — its confirm reads
*"⚠ This image is still used in 1 place: • Page hero: uat-b-media. Deleting it will leave that
record with a broken/missing image. Delete anyway?"*

### F10 — low — Three lists give every row the same action-menu name

`/admin/messages`, `/admin/roles` and `/admin/forms` render `aria-label="Row actions"` on every
row's ⋯ button. Pages, posts, projects, people, partners, donors, offices, schools, campaigns,
languages and locations all name the row (`aria-label="Actions for UAT B Draft Page"`). A screen
reader on the three odd ones out cannot tell the rows apart.

### F11 — low — The searchable dropdown claims a listbox it does not build

`SearchableSelect` (content type, province, project, partner category, org-chart parent) puts
`aria-haspopup="listbox"` on the trigger, but the popup it opens is a plain `<div>` of `<button>`s:
no `role="listbox"`, no `role="option"`, no `aria-controls`, no `aria-activedescendant`. From
source, `src/components/admin/SearchableSelect.tsx:90-140`. Keyboard arrow/Enter selection does
work; only the semantics are missing.

### Error and save-failure paths — all good

| Path | Result |
|---|---|
| Wrong login password | *"Invalid email or password."* inline, `role="alert"` |
| Duplicate page URL segment (`team`) | *"A page already exists at \"team\". Choose a different URL."*; title and segment both kept in the form |
| Duplicate user email | *"A user with that email already exists."*; every typed field kept |
| Password under 8 characters | Native `minLength` blocks submit with a browser message |
| Rejected upload (`.txt`) | *"uat-b-doc.txt: File type \".txt\" is not allowed"* — server returns 415 with that message and the toast prints it |
| Empty submit of a form with required fields | Blocked client-side; a direct `POST /api/forms/uat_b_form` with `{}` returns 400 *"“Your name” is required."*, so the server enforces it too |
| Wrong current password on `/admin/account` | *"Your current password is incorrect."* |
| Mismatched new passwords | *"The new passwords don't match."* |

Delete confirmations name the thing being deleted almost everywhere — *"Delete the "Organization
chart" section? This can't be undone."*, *"Delete language "fr" and its translations?"*, *"Delete
this campaign? Pending/failed donation attempts are removed with it. (Campaigns with confirmed
gifts can't be deleted.)"*. The two refusals I hit (F1, F2) are the exception: *"Something else
still points at this record. Remove those links first, then try again."* never says what.

## 4. The hardcoded-text list

91 items. Every one was seen rendered in a browser and then confirmed against source. Classification
method: every visible text node and `aria-label`/`placeholder`/`title`/`alt` on each public page was
captured with the React source line that produced it, then matched against (a) the 152 keys in
`src/lib/ui-strings/*`, (b) the 134 `t()` defaults in the codebase, (c) every string value in
`uat.db`. Anything matching none of the three is below. Of 840 unique strings across 55 public URLs,
306 resolved to a `ui_strings` key and 510 to a content or record field.

The three empty slices in `src/lib/ui-strings/` — `common`, `donate`, `internal` — explain the
shape of this list exactly: they are declared and exported as `{}`.

### Donate hub — `/en/donate`, `/km/donate` — `src/routes/$lang.donate.index.tsx`

| String | Line | Note |
|---|---|---|
| `Support our work` | 62 | via `DONATE_DEFAULTS.donate_eyebrow`; see F7 |
| `Give to what moves you` | 65 | `donate_title`; see F7 |
| `Choose a campaign below. Every gift goes directly to the work it names.` | 69 | `donate_intro`; see F7 |
| `No active campaigns right now` | 97 | |
| `Please check back soon, or` | 100 | |
| `learn more about our work` | 102 | link text |
| `★ Featured` | 168 | |
| `raised` | 197 | |
| `of {amount}` | 195 | |
| `supporter` / `supporters` | 205 | English pluralisation in code |
| `Be the first to give` | 213 | |
| `goal` | 215 | |
| `♡ Donate to this campaign →` | ~250 | |
| `Be the first →` | 291 | |

### Campaign page — `/en/donate/<slug>` — `src/components/donate/CampaignDetail.tsx`

`Home` (45), `Donate` (52) — breadcrumb; `Recent supporters` (84); `This campaign has ended` (96);
`Thank you to everyone who gave. Explore other ways to give.` (99); `See active campaigns` (105);
`Make your gift` (111).

`src/components/donate/CampaignProgress.tsx`: `Be the first to give` (32);
`Help reach the {amount} goal.` (34); `Your gift gets this campaign moving.` (44).

### Donate form — `src/components/donate/DonateForm.tsx`

`Choose your impact` (121); `One-time gift` (152); placeholder `Other amount` (168);
`Your details` (194); placeholder `Email for your receipt` (210); placeholder
`Leave a message of support (optional)` (220); `Show me on the supporters wall as…` (230);
`My name` (234); `Custom` (241); `Anonymous` (248); placeholder `e.g. The Sok Family` (261);
`Secured by Baray — KHQR, card, or mobile wallet` (281); aria-label `Close` (303);
`Confirm your gift` (309); `Back` (338).

All fifteen render identically on `/km/donate/<slug>` — the donate flow has no Khmer at all.

### Donation receipt — `/en/donate/success` — `src/routes/$lang.donate.success.tsx`

meta title `Thank you for your donation` (21); `Donate` (35); `Thank you` (36);
`With gratitude` (37); `Your generosity helps Cambodian children learn, dream, and rise.` (38);
`Your gift is confirmed` / `We've received your donation` (41);
`🎉 Your donation has been confirmed. Thank you for your support.` (45);
`Thank you! We're finalising the confirmation of your payment. If it was completed, it will be
confirmed shortly — no further action is needed.` (49); `Back to home` (61); `See the impact` (67).
Plus `Support this campaign.` — the campaign meta-description default,
`src/routes/$lang.donate.$campaign.tsx:22`.

### Staff portal — `/internalsources/*`

`src/routes/internalsources.tsx`: `Checking access…` (56); `Log out` (73); `News Feed` (84);
`Calendar` (91); `Documents` (98); `Directory` (105).
`internalsources.index.tsx`: `Internal News Feed` (26); `Loading…` (29); `No internal news.` (31).
`internalsources.directory.tsx`: `Staff Directory` (28); `Loading…` (31); and the table headers
`ID` (38), `Name (KH)` (39), `Name (EN)` (40), `Sex` (41), `Phone` (42), `Email` (43),
`Program` (44).
`internalsources.documents.tsx`: `Internal Documents` (34); `Loading…` (37); `No documents.` (39);
`Open` (65); `no file` (68).
`internalsources.calendar.tsx`: `Calendar of Events` (26); `Loading…` (29); and headers
`Program` (35), `Event` (36), `Start` (37), `End` (38).

Only the portal's own title comes from data (`staffPortalTitle(settings)`). Twenty-six strings, all
English, on a screen whose audience is Khmer-speaking staff.

### Khmer calendar — in the footer of **every** page — `src/components/KhmerCalendar.tsx`

- `ព.ស.` — the Buddhist-era suffix, line 104.
- `EN_MONTHS` — `January` … `December`, lines 22-34 (12 strings).
- `KM_MONTHS` — `មករា` … `ធ្នូ`, lines 3-14 (12 strings).
- `KM_WEEKDAYS` — `អា ច អ ព ព្រ សុ ស`, line 37 (7 strings).

The heading (`footer.calendar`) and the prev/next arrows (`calendar.prev`, `calendar.next`) *are*
wired to keys — it is only the date vocabulary that is not.

### Share buttons — every post, story, video and publication detail — `src/components/ShareButtons.tsx`

`Facebook` (29) and `Telegram` (32), as object literals in the `links` array. The `Share` label
above them is correctly `t("share.label", …)`. An admin cannot rename, reorder or add a network.

### Map — contact page — `src/components/MapView.tsx:142`

Leaflet's own controls, never translated: aria-label + title `Zoom in`, aria-label + title
`Zoom out`, the `Leaflet` attribution and `© OpenStreetMap contributors`.

### Section renderer — `src/components/sections/SectionRenderer.tsx`

- `PDF` — the badge on every resource/publication card, line 1484. Appears on `/en/publications`,
  `/en/media/annual-report`, `/en/media/paper-research`, `/en/media/program-brochure`.
- Partner category headings render the slug rather than the label, line 1778 — see F4.

### Dialogs — `src/components/Dialogs.tsx`

Four defaults, exactly as the brief expected. The backdrop's `aria-label="Cancel"` (271) is
unconditional; `cancelLabel ?? "Cancel"` (317) and `confirmLabel ?? (isPrompt ? "OK" : "Confirm")`
(325) apply whenever a caller passes no label. Reachable by a visitor through
`src/components/PublicRichText.tsx:84` (the rich-text answer field on a builder form), which does
pass `t()` values for title, placeholder and both button labels — so on today's public site only
the backdrop label leaks. Any future public `confirm()` would leak all three.

### Checked and clean

`AnnouncementPopup.tsx` and `Lightbox.tsx` are fully wired — every string goes through `t()`
(`announcement.close`, `announcement.label`, `announcement.deadline`, `announcement.more`,
`announcement.close.label`, `announcement.prev`, `announcement.next`, `announcement.goto`;
`lightbox.title`, `lightbox.close`, `lightbox.prev`, `lightbox.next`, `lightbox.view`). Same for
`PdfReader.tsx` (`pdf.title`, `pdf.newTab`, `pdf.close`). I opened the announcement popup, the
lightbox and the PDF reader in the browser and every rendered string resolved to a key. So of the
areas the brief flagged, three are already done and five are not.

`/admin/ui-strings` itself works end to end: searched `top.login`, changed English to
"UAT B Sign-in", saved, confirmed on `GET /en` within a second, clicked Reset to default,
confirmed "Staff login" was back and the Khmer value untouched. The "only strings this site has
changed" filter reported 84 of 235 keys. Screenshots `b-shots/65-*`, `b-shots/66-*`.

## 5. What the roles could reach

### `staff` — clean refusal everywhere, no crashes

`staff@kapekh.org` **does not accept `kape-admin-2026`** — `POST /api/auth/login` returns 401
*"Invalid credentials"*. I could not obtain its password, so I created `uatb-staff@kapekh.org` with
role Staff and tested with that.

All 28 admin URLs redirect to `/admin`, which renders:

> **You do not have access to the admin.** You are signed in as uatb-staff@kapekh.org, and that
> account has no admin permissions.

No blank screen, no crash, no console error, on any of them. The four staff-portal routes
(`/internalsources`, `/directory`, `/documents`, `/calendar`) all render correctly for this account.
Route-by-route log: `.work/uat/b-shots` + the transcript of `uat-b-60.ts`.

### `editor` (custom role: pages, posts, projects, media) — mostly clean, two broken screens

| Reached | `/admin`, `/admin/pages`, `/admin/posts`, `/admin/projects`, `/admin/media`, `/admin/account` |
|---|---|
| Refused with a clear screen | `/admin/settings`, `/admin/users`, `/admin/roles`, `/admin/modules`, `/admin/ui-strings`, `/admin/people`, `/admin/partners`, `/admin/donors`, `/admin/donations`, `/admin/campaigns`, `/admin/offices`, `/admin/org-chart`, `/admin/schools`, `/admin/messages`, `/admin/footer`, `/admin/locations`, `/admin/publication-categories`, `/admin/doc-categories`, `/admin/partner-categories`, `/admin/languages` |
| Refused badly | `/admin/nav` (blank "Loading…"), `/admin/forms` (fake "0 total" + stuck table) — F5 |
| Staff portal | All four `/internalsources` URLs bounce to `/login`, which then shows the **admin** sign-in page ("KAPE Admin — Sign in to manage the website") to someone who is already signed in. Confusing, but not a crash. |

Server-side enforcement is sound: every refused screen corresponds to a real `FORBIDDEN` from tRPC,
so nothing leaked. The problems are all presentation (F5) and discoverability (F6).

## 6. Not covered, and what it would take

- **Donations and the payment flow.** `/admin/donations` and `/admin/campaigns/$id/donations` are
  empty and I could not create a donation: the donate form posts to Baray and there is no gateway
  in this environment. The same gap blocks the one referential guard whose message I could not
  read — *"Campaigns with confirmed gifts can't be deleted"*. **To close it:** a Baray sandbox key
  in `.env`, or a seeded `donations` row with `status='paid'` in `uat.db`.
- **`/admin/publication-categories` and `/admin/doc-categories` CRUD.** Both render and list
  correctly. They use the same `TermsManager` component as `/admin/locations`, whose add/edit/delete
  I did exercise, so I have inferred rather than observed them. **To close it:** ten minutes of the
  same clicks on each.
- **Section-level configuration.** I added all 21 section types to a page, saved, and confirmed
  every one renders publicly without a console error, but I only configured the ones the tests
  needed (rich text, form, cover image). Per-section options — hero slides, stats band values,
  query filters and limits on the dynamic sections — were left at their defaults. **To close it:**
  a pass that opens each section's editor panel and drives its own fields.
- **Post galleries.** The "+ Add images" gallery field on the post editor was not exercised.
- **Prerendered/production build.** Everything here is the Vite dev server. `bun run prerender`
  and the static output were not run, so anything specific to the prerender path — notably how
  `/fr` and the render cache behave — is untested.
- **SMTP.** The dev log warns SMTP is unconfigured, so contact-form and form notification email was
  not exercised; the submission itself reached `/admin/messages` correctly.
- **Concurrency.** UAT-A is working in the same database. Their records show up in my
  `/admin/messages` screenshots. No conflict was observed, but I did not test two editors saving
  the same record.

## 7. Damage to `uat.db` (disclosure)

The database is a disposable copy, and I created, edited and deleted freely as instructed. Three
changes are not recoverable from the admin and are worth knowing about before anyone reads this
data as ground truth:

- Projects **Books for Cambodia** (`bfc`) and **Schools for Empowerment** (`sfe`) were deleted
  while probing the delete guard. Project count went 18 → 16.
- Project **HCC** (id 3) lost all 23 of its translation rows to F1 and now shows as `HCC` with no
  name, summary or body, in both languages. `/en/projects/hcc` still returns 200 but is blank.
- Users `uatb-staff@kapekh.org` and `uatb-editor@kapekh.org` remain because F2 prevents deleting
  them. Both are non-admin.

Everything else I created — pages, posts of all ten types, the form and its submissions, the
campaign, the school, the org-chart node, the extra project, the extra language, the custom role,
the uploaded image, the custom `donate_title` setting — was deleted, and the header, footer, site
name, accent colour, dark-mode flag and the `top.login` UI string were all reverted to their
original values.
