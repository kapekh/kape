# UI2 - admin component review, source only

Read: `src/components/admin/*.tsx` (32 components), `src/routes/admin*.tsx` (56 routes), `src/components/ui/*` (7 files).
No browser, no dev server, no edits.

Two axes are already consistent and need no further checking: **destructive confirms never use a native dialog**
(`window.confirm`/`alert`/`prompt`: 0 hits across `src/`), and **autofocus** is used exactly once, in a modal,
with a comment saying why (`admin.org-chart.tsx:100`).

---

## 1. Empty states

Majority pattern: a `<tr><td colSpan={n}>` inside the table body reading "No <things> yet.", about half of them
followed by a link to the create page.

| file:line | what is there |
|---|---|
| `admin.people.index.tsx:80` | "No people yet. Add the first person →" |
| `admin.schools.index.tsx:104` | "No schools yet. Add the first school →" |
| `admin.offices.index.tsx:78` | "No offices yet. Add the first office →" |
| `admin.partners.index.tsx:77` | "No partners yet. Add the first partner →" |
| `admin.donors.index.tsx:70` | "No donors yet. Add the first donor →" |
| `admin.campaigns.index.tsx:97` | "No campaigns yet. Create the first one →" |
| `admin.forms.index.tsx:76` | "No forms yet. Create the first one →" |
| `admin.users.index.tsx:119` | "No users yet." - no CTA |
| `admin.roles.index.tsx:80` | "No roles yet." - no CTA |
| `admin.forms.$id.submissions.tsx:155` | "No responses yet." - no CTA |
| `DonationsTable.tsx:101` | `emptyText`, default "No donations yet." - no CTA |
| `TermsManager.tsx:138` | "No items yet - add one above." |
| `admin.pages.index.tsx:63` | paragraph above the table, "No pages yet." |
| `admin.posts.index.tsx:85` | paragraph, "No <type> yet." |
| `admin.messages.tsx:54` | bordered card, "No messages yet." |
| `admin.nav.tsx:597` | "No nav items." |
| `admin.media.tsx:437` | full card with icon, and the only one that distinguishes "nothing matches your filter" from "no media yet" |
| `admin.org-chart.tsx:272` | full card with a "+ Add the first person" button |
| `admin.index.tsx:144,189,271` | per-panel empty states on the dashboard |
| **`admin.projects.index.tsx:60`** | **nothing.** Zero rows renders a header row over an empty `<tbody>` |
| **`admin.languages.tsx:159`** | **nothing.** `langs.map` runs straight off the loading branch |
| **`admin.settings.tsx:551`** | **nothing.** The custom key/value table has a loading row but no empty row |

Three pages with no empty state at all. `admin.media.tsx:437` is the only page that tells a filtered-empty result
apart from a genuinely empty collection, and every other list page with a filter (`admin.posts.index.tsx:53`,
`admin.donations.index.tsx:42`) shows the same "nothing here yet" copy whether you filtered it away or never had any.

## 2. Loading and pending

### Query in flight

Majority: an in-table `Loading…` row, in `admin.{people,schools,offices,partners,donors,campaigns,users,roles,forms}.index.tsx`,
`admin.forms.$id.submissions.tsx:146`, `DonationsTable.tsx:95`, `TermsManager.tsx:132`, `admin.languages.tsx:153`,
`admin.settings.tsx:545`.

| file:line | deviation |
|---|---|
| `admin.pages.index.tsx:61`, `admin.posts.index.tsx:83`, `admin.projects.index.tsx:46` | bare paragraph replaces the whole table, so the header disappears and comes back |
| `admin.nav.tsx:527`, `admin.footer.tsx:209`, `admin.modules.tsx:118` | bare paragraph replaces the whole page |
| `admin.messages.tsx:50`, `admin.org-chart.tsx:268` | bordered card |
| `admin.media.tsx:427` | ten pulsing skeleton tiles. The only skeleton in the admin |
| `admin.users.$id.tsx:47`, `admin.forms.$id.index.tsx:42`, `admin.campaigns.$id.index.tsx:41` | `<div className="p-6 text-muted-foreground">` where the other 11 editor routes use `<p className="text-sm text-muted-foreground">` |

### A failed load never stops loading

`.catch` is absent from the initial query on 10 of 12 `.new` routes, 11 of 14 `$id` routes and 16 of 18 list routes.
The render gate is `if (!data) return <Loading/>`, so a rejected promise leaves that spinner up for good.

| handles it | file:line |
|---|---|
| yes | `admin.projects.new.tsx:37-40` (`.catch` + `.finally`, renders the reason at `:60`) |
| yes | `admin.projects.$id.tsx:71`, `admin.roles.$id.tsx:30` |
| yes | `admin.schools.index.tsx:50-54` (`finally`, with a comment saying exactly why) |
| yes | `admin.media.tsx:103,123,253,281` |
| yes | `admin.modules.tsx:47`, `admin.settings.tsx:349` (error state plus a Try again button) |
| no | everything else, e.g. `admin.people.new.tsx:23`, `admin.posts.index.tsx:41`, `admin.footer.tsx:151`, `admin.nav.tsx:325`, `admin.languages.tsx:32` |

### Double submit

Disabled while pending: `form-ui.tsx:43` and `form-ui.tsx:123` (so every entity editor), `admin.footer.tsx:266`,
`admin.nav.tsx:89`, `admin.modules.tsx:149`, `admin.account.tsx:136`, `admin.users.$id.tsx:120`,
`PageForm.tsx:389`, `admin.forms.$id.submissions.tsx:123`.

Not disabled, and every one of these fires an await-ing mutation:

| file:line | control |
|---|---|
| `admin.languages.tsx:131` | Add language |
| `admin.languages.tsx:170` | Enabled checkbox (writes on every change) |
| `admin.languages.tsx:183` | Make default |
| `admin.settings.tsx:518` | Add setting |
| `admin.settings.tsx:570` | per-row Save |
| `TermsManager.tsx:112` | Add item |
| `TermsManager.tsx:164` | per-row Save |
| `admin.nav.tsx:283` | nav item Save |
| `admin.nav.tsx:446,454` | Move up / Move down |
| `admin.nav.tsx:485` | Delete |
| `admin.org-chart.tsx:141` | node Save |
| `admin.media.tsx:415` | bulk Delete |

## 3. Errors

Surfaced by toast: all 12 `.new` routes, 11 `$id` routes, `admin.users.index.tsx:44,54,75`,
`admin.roles.index.tsx:37`, `admin.campaigns.index.tsx:52`, `admin.modules.tsx:79,81`, `admin.nav.tsx:52`,
`admin.media.tsx:218,267,296`, `admin.account.tsx:31,45`.

Surfaced inline: `admin.settings.tsx:290` (read failure, with a distinct sentence for an expired session at `:256`),
`admin.settings.tsx:527` (add failure), `admin.modules.tsx:105` (read failure + retry),
`admin.projects.new.tsx:60`, `admin.projects.$id.tsx:71`, `FormBuilder.tsx:245` (slug taken).

### Swallowed - the mutation rejects and nothing anywhere says so

| file:line | mutation |
|---|---|
| `admin.projects.index.tsx:29` | delete project |
| `admin.pages.index.tsx:35` | delete page |
| `admin.posts.index.tsx:49` | delete post |
| `admin.people.index.tsx:37` | delete person |
| `admin.schools.index.tsx:62` | delete school |
| `admin.offices.index.tsx:36` | delete office |
| `admin.partners.index.tsx:36` | delete partner |
| `admin.donors.index.tsx:30` | delete donor |
| `admin.messages.tsx:35` | delete message |
| `admin.forms.index.tsx:35` | delete form and all its submissions |
| `admin.forms.$id.submissions.tsx:62` | delete response |
| `admin.donations.index.tsx:59` | mark donation paid |
| `admin.campaigns.$id.donations.tsx:50` | mark donation paid |
| `admin.languages.tsx:41,54,69` | create / update / delete language |
| `admin.settings.tsx:398,419` | per-row save, delete setting |
| `TermsManager.tsx:47,57,68` | update / create / delete term |
| `admin.nav.tsx:364,369,375,379` | create / update / delete / move nav item |
| `admin.org-chart.tsx:183,184,200,207,214` | create / update / delete / reparent / reposition |
| `admin.footer.tsx:195` | save the entire footer |
| `admin.media.tsx:232` | copy URL, `catch {}` |
| `admin.index.tsx:38,42` | both dashboard queries, `.catch(() => {})` |

Two of these are worse than silent.

`admin.footer.tsx:178-202` has no `try`, so a rejected `settings.set` skips `setSaving(false)` at `:200`.
The button stays disabled reading "Saving…" until the page is reloaded, and the reload discards the edits.
Every other multi-key save on the same screen shape does wrap it: `admin.nav.tsx:44-55`.

`admin.index.tsx:38,42` swallow into an empty function, and `Kpi` at `:349` prints `o?.visitsToday ?? 0`
formatted as a number, so a dead dashboard query is indistinguishable from a site with no traffic.

`admin.modules.tsx:81` calls `toast(...)` with no kind, so a failed module save renders in the neutral info
style while every other failure in the admin renders red.

## 4. Destructive actions

No native dialogs anywhere. All 24 confirm sites call the in-app `confirm()` from `Dialogs.tsx:48`.

The split is in *how* they call it. `Dialogs.tsx:223` styles the accept button red only when `danger` is passed,
and `Dialogs.tsx:225` labels it "Confirm" unless `confirmLabel` is given.

| treatment | file:line |
|---|---|
| `danger: true` + `confirmLabel: "Delete"`, red button | `admin.forms.index.tsx:27`, `admin.users.index.tsx:63`, `admin.roles.index.tsx:26`, `admin.forms.$id.submissions.tsx:55`, `SectionsBuilder.tsx:884` |
| plain string, grey "Confirm" button | `admin.partners.index.tsx:35`, `admin.donors.index.tsx:29`, `admin.offices.index.tsx:35`, `admin.projects.index.tsx:28`, `admin.people.index.tsx:36`, `admin.schools.index.tsx:61`, `admin.posts.index.tsx:48`, `admin.messages.tsx:34`, `admin.languages.tsx:67`, `admin.nav.tsx:374`, `admin.pages.index.tsx:30`, `admin.settings.tsx:418`, `TermsManager.tsx:67`, `admin.media.tsx:263,288`, `admin.campaigns.index.tsx:43`, `admin.donations.index.tsx:54`, `admin.campaigns.$id.donations.tsx:45`, `admin.org-chart.tsx:195` |

19 row deletes get the neutral treatment, 5 get the red one, and the 19 include deletions that cascade:
`admin.nav.tsx:374` takes the item's whole subtree, `admin.org-chart.tsx:195` takes the node and its reports,
`admin.media.tsx:263` knowingly leaves broken images in other records.

Fires with no confirm at all: `FormBuilder.tsx:329` (remove field), `SectionsBuilder.tsx:206` (remove table row),
`admin.footer.tsx:89,404` (remove link / social), `PostForm.tsx:580` (remove gallery image),
`MediaPicker.tsx:124`, `ProjectForm.tsx:277,338`. All of these mutate unsaved local form state, so no confirm is
correct. The one inconsistency is inside a single file: `SectionsBuilder.tsx:880` confirms before removing a
section but `SectionsBuilder.tsx:206` does not before removing a row.

## 5. Unsaved changes

`useDirty.ts:51` disables the navigation blocker when `savedSignal === undefined`. Passing a snapshot alone
buys you a disabled Save button and nothing else - and the button never re-disables after a save either,
because the baseline only resets on a signal change (`useDirty.ts:26`).

| state | file:line |
|---|---|
| guarded (snapshot + `savedAt`) | `PostForm.tsx:236`, `PageForm.tsx:156`, `ProjectForm.tsx:158`, `PeopleForm.tsx:115`, `SchoolForm.tsx:100`, `OfficeForm.tsx:87`, `PartnerForm.tsx:66`, `DonorForm.tsx:57`, `admin.footer.tsx:204`, `admin.nav.tsx:58` |
| **called but not armed** | `CampaignForm.tsx:157`, `FormBuilder.tsx:170`, `UserForm.tsx:67`, `RoleForm.tsx:79`, `admin.account.tsx:54` |
| no dirty tracking at all | `admin.settings.tsx:318` (drafts), `admin.settings.tsx:560` (row edits), `TermsManager.tsx:41` (row edits), `admin.languages.tsx:24` (add form), `admin.nav.tsx:177-192` (nav item form), `admin.org-chart.tsx:55-66` (node form), `admin.modules.tsx:33` (toggles) |

The four unarmed editors are the four that navigate away on save instead of staying put, so they were never
given a `savedAt` to pass. The cost is that Edit campaign, Edit form, Edit user and Edit role are the only four
entity editors you can walk out of, with a full page of edits, in silence.

`admin.settings.tsx` is the loudest of the untracked group: it keeps a `draft` map apart from the server copy
specifically so a background refresh cannot eat an edit (`:98-103`), and then lets a sidebar click discard the
whole thing without a word.

## 6. Labels and icon-only buttons

Three conventions, in the same admin.

| convention | file:line |
|---|---|
| `aria-label` | `ActionMenu.tsx:63`, `admin.footer.tsx:92,390,399,409`, `admin.media.tsx:481,514,537,594,627`, `PostForm.tsx:562,571,580`, `MediaLibraryDialog.tsx:174,214`, `PageSwitcher.tsx:192`, `admin.nav.tsx:400`, `MapField.tsx:53`, `admin.org-chart.tsx:301`, `PageForm.tsx:342` |
| `title` only, so the accessible name is the glyph | `admin.nav.tsx:446,454,462,477,485` (↑ ↓ ＋ ✎ ✕), `OrgCanvas.tsx:124,132,140` (＋ ✎ ✕), `MediaThumb.tsx:26,39` |
| nothing at all | `FormBuilder.tsx:313,321,329` (↑ ↓ ✕), `SectionsBuilder.tsx:190,198,206` (↑ ↓ ✕), `SectionsBuilder.tsx:864,872` (↑ ↓) |

`admin.nav.tsx:446-492` is the sharpest case: five controls per menu row, on a tree that routinely holds
30+ rows, announcing as "↑" "↓" "＋" "✎" "✕".

Other unnamed controls:

| file:line | control |
|---|---|
| `admin.media.tsx:373` | media search box, placeholder only |
| `SearchableSelect.tsx:104` | combobox search box, placeholder only |
| `PageSwitcher.tsx:123` | page search box, placeholder only |
| `admin.donations.index.tsx:78` | campaign filter `<select>`, no label |
| `admin.nav.tsx:230` | target-kind `<select>`, no label, options read "page"/"post"/"url" |
| `FormBuilder.tsx:284` | field label input, no label |
| `FormBuilder.tsx:300` | field type `<select>`, no label |
| `admin.media.tsx:381,388,395` | All / Images / Files filter, buttons with no `aria-pressed` |
| `admin.media.tsx:460` | grid tile for a non-image file; the button's only content is `📄` at `:473` |
| `MediaPicker.tsx:106` | same, `📄` is the whole accessible name of the picker trigger |

`ActionMenu.tsx:18` takes a `label` prop defaulting to "Row actions". All 18 call sites leave it at the default,
so a 50-row table exposes 50 identically named buttons.

`SearchableSelect.tsx:90` claims `aria-haspopup="listbox"` but the popup at `:102-144` is plain divs and buttons
with no `role="listbox"`, no `role="option"` and no `aria-activedescendant`, so the arrow-key highlight tracked at
`:73-76` is invisible to a screen reader. `PageSwitcher.tsx:132-152` implements the same widget correctly.
Two comboboxes, two answers.

`LangTabs.tsx:36-53` sets `role="tab"`/`tabpanel` with no `aria-controls`, no id linkage and no roving tabindex,
so it announces as tabs but does not behave as them.

## 7. Form field patterns

Majority: `<label className="block"><span className={fieldLabel}>…</span><input className={fieldInput}/></label>`,
from `form-ui.tsx:3-6`. Help text is always `<p className="mt-1 text-xs text-muted-foreground">` below the field.
Both are followed everywhere. The outliers:

| file:line | what |
|---|---|
| `PostForm.tsx:276` | title has no `required`, while `slug` at `:366` does. A post can be saved untitled. Every other form marks its primary name required: `PeopleForm.tsx:163`, `PartnerForm.tsx:98`, `DonorForm.tsx:89`, `OfficeForm.tsx:130`, `SchoolForm.tsx:143`, `CampaignForm.tsx:204`, `RoleForm.tsx:149`, `UserForm.tsx:96`, `PageForm.tsx:300`, `FormBuilder.tsx:213`, `ProjectForm.tsx:374`, `admin.org-chart.tsx:101` |
| all forms | no required field is marked visually. Zero asterisks, zero `aria-required`, so the only way to find out is to submit |
| `admin.settings.tsx:154` | the only `aria-invalid` in the admin |
| all forms | no `aria-describedby` links a hint to its field, though hints exist at `admin.settings.tsx:169`, `PeopleForm.tsx:316`, `PageForm.tsx:303`, `FormBuilder.tsx:235` |
| `admin.languages.tsx:40`, `TermsManager.tsx:56`, `admin.settings.tsx:401` | empty-input guard is a bare `return`. Clicking Add with a blank field does nothing and says nothing |
| `admin.account.tsx:98-133` | three `required` fields, the only form with more than one, and the only one using `autoComplete` |

## 8. Table patterns

14 tables. Majority: `thead` with `bg-muted/50 text-left text-xs uppercase tracking-wide`, `tbody` with
`divide-y divide-border`, a right-aligned `Actions` header, then an inline `Edit` link followed by an `ActionMenu`.

| axis | majority | deviates |
|---|---|---|
| actions header | `<th …>Actions</th>` (11 tables) | empty `<th/>`: `admin.projects.index.tsx:57`, `admin.pages.index.tsx:74`, `admin.posts.index.tsx:99` |
| row separator | `divide-y divide-border` on tbody | `border-t border-border` per row: `admin.projects.index.tsx:62`, `admin.pages.index.tsx:83`, `admin.posts.index.tsx:82` |
| row hover | `hover:bg-muted/20` | `hover:bg-muted/30`: `admin.pages.index.tsx:83`, `admin.posts.index.tsx:106`. None at all: `admin.projects.index.tsx:62` |
| numeric cells | `text-right tabular-nums` | `admin.languages.tsx:169,177` centres its cells under left-aligned headers at `:147,148` |
| dates | - | five implementations: `admin.messages.tsx:16`, `admin.forms.$id.submissions.tsx:17` and `DonationsTable.tsx:26` are byte-identical `toLocaleString()`; `admin.users.index.tsx:12` and `admin.media.tsx:57` are `toLocaleDateString(day/month/year)`. `admin.index.tsx:214` prints the raw `publishedAt` string unformatted |
| money | - | `admin.campaigns.index.tsx:17` rounds to whole units, `DonationsTable.tsx:20` keeps 2 decimals for USD. The same campaign total reads differently on the two screens |
| truncation | none | only `DonationsTable.tsx:124` and `admin.media.tsx:504` truncate with a `title` fallback. Long values elsewhere wrap the row |
| URL columns | - | `admin.partners.index.tsx:116` renders a clickable link, `admin.donors.index.tsx:105` renders the same field as plain text |
| row actions | inline `Edit` + `ActionMenu` | `admin.settings.tsx:570` and `TermsManager.tsx:164` put a bare `Save` button in the row instead |

The first three rows of that table are the same three files every time: `projects.index`, `pages.index`,
`posts.index` are an older generation of the list page and the other 11 are a newer one.

## 9. Copy

| axis | majority | deviates |
|---|---|---|
| h1 case | sentence case | `admin.settings.tsx:433` "Site Settings"; `admin.org-chart.tsx:248` "Organizational Chart"; `admin.locations.tsx:9` "Locations / Provinces"; `admin.doc-categories.tsx:9` "Document Categories"; `admin.partner-categories.tsx:9` "Partner Categories"; `admin.publication-categories.tsx:9` "Publication Categories" |
| h1 size | `text-2xl` | `admin.index.tsx:74` is `text-3xl` |
| sidebar vs page | same word | `admin.tsx:157` "Header" / `admin.nav.tsx:534` "Header" / `admin.index.tsx:305` "Navigation" - three names, one screen. `admin.tsx:159` "Org Chart" vs `admin.org-chart.tsx:248` "Organizational Chart". `admin.tsx:83` "Dashboard" vs `admin.index.tsx:75` "Overview". `admin.tsx:172-185` sentence case vs the four Title Case page headings above |
| spelling | British: `admin.settings.tsx:41` "Organisation name", `admin.donors.index.tsx:42` "Organisations", `admin.partners.index.tsx:48` "organisations", `admin.footer.tsx:287` "Organisation name" | American: `admin.org-chart.tsx:248` "Organizational", `:110` "Programs" |
| delete menu item | "Delete <noun>": `admin.people.index.tsx:151`, `admin.schools.index.tsx:165`, `admin.offices.index.tsx:138`, `admin.partners.index.tsx:141`, `admin.donors.index.tsx:120`, `admin.campaigns.index.tsx:175`, `admin.forms.index.tsx:147`, `admin.users.index.tsx:166`, `admin.roles.index.tsx:126`, `admin.messages.tsx:98`, `admin.forms.$id.submissions.tsx:218` | bare "Delete": `admin.projects.index.tsx:87`, `admin.pages.index.tsx:118`, `admin.languages.tsx:196`, `admin.settings.tsx:581`, `TermsManager.tsx:175` |
| Delete vs Remove | Remove detaches, Delete destroys - held consistently at `MediaPicker.tsx:129`, `MediaThumb.tsx:46`, `admin.footer.tsx:92,409`, `PostForm.tsx:580` | - |
| one concept, four words | - | `admin.forms.index.tsx:65` column "Submissions", `:134` link "Responses", `admin.forms.$id.submissions.tsx:106` h1 "responses", `:109` body "submission", `admin.index.tsx:121` KPI "Form submissions", `admin.messages.tsx:46` "Contact-form submissions" |
| post type labels | - | `admin.index.tsx:15-27` singular ("Impact story", "Job", "Photo album") vs `admin.posts.index.tsx:17-28` plural ("Stories", "Careers", "Galleries") for the same `contentType` keys |
| empty-state CTA | "Add the first <noun> →" (people, schools, offices, partners, donors) | "Create the first one →" `admin.campaigns.index.tsx:105`, `admin.forms.index.tsx:84`; "Create the first post →" `admin.index.tsx:196`; "+ Add the first person" as a button, `admin.org-chart.tsx:282` |
| create button | "+ New <noun>" on 12 list pages | "New post"/"New page" with no plus, `admin.index.tsx:86,92`; "+ Add person" `admin.org-chart.tsx:264`; "+ Top-level item" `admin.nav.tsx:554`; bare "Add" `admin.languages.tsx:136`, `admin.settings.tsx:523`, `TermsManager.tsx:117` |
| save feedback | stay on the page, "Saved <time>" chip (`form-ui.tsx:38`): 8 editor routes | toast then navigate: `admin.users.$id.tsx:34`, `admin.roles.$id.tsx:41`, `admin.forms.$id.index.tsx:32`. Navigate with no message at all: `admin.campaigns.$id.index.tsx:32` |
| toast kind | `"error"` / `"success"` passed explicitly | `admin.modules.tsx:79,81` pass neither, so a failed save is styled as neutral info |

## 10. Duplication worth collapsing

| file:line | what |
|---|---|
| `src/components/ui/*` | **zero importers.** 7 files, 412 lines. Also the only consumers of `radix-ui` (`package.json:59`) and `class-variance-authority` (`package.json:51`), and of `lib/utils.ts`'s `cn`. The admin builds every button from raw Tailwind strings instead |
| `MediaThumb.tsx` | not imported anywhere |
| `admin.messages.tsx:16`, `admin.forms.$id.submissions.tsx:17`, `DonationsTable.tsx:26`, `admin.users.index.tsx:12`, `admin.media.tsx:57` | five `fmtDate`, three of them byte-identical. `DonationsTable.tsx:26` is already exported |
| `admin.settings.tsx:29` `ci`, `TermsManager.tsx:15` `cellInput` | the same class string, twice |
| `admin.index.tsx:15`, `admin.posts.index.tsx:17` | two `TYPE_LABELS` maps over the same keys, disagreeing |
| `admin.settings.tsx:397,570` and `TermsManager.tsx:46,164` | the same per-row inline Save, both with no feedback and no error handling |
| `admin.account.tsx:90-96`, `admin.users.$id.tsx:93-102` | hand-rolled copies of the card `FormSection` already draws at `form-ui.tsx:74-96` |
| `admin.{people,schools,offices,partners,donors,campaigns,forms,users,roles}.index.tsx` | **the list page itself.** Nine files, ~60 near-identical lines each: h1 + count subtitle + "+ New X" link + card-wrapped table + loading row + empty row + Edit link + ActionMenu. A `<ListPage columns rows onDelete/>` taking a column spec and a row renderer would absorb all nine, and would fix axes 1, 2, 3 and 8 in one place instead of nine. This is the only L-sized collapse here and the only one that pays for itself |

Not worth collapsing: the entity forms already share `EditorHeader`/`EditorGrid`/`FormSection`/`FormActions` and
differ only in their fields. `admin.footer.tsx:60-108` `LinkRows` is already the shared version of its own pattern.

---

## Prioritised

| # | finding | axis | size |
|---|---|---|---|
| 1 | A failed initial query leaves a permanent "Loading…" on ~30 screens. Add `.catch` + an error branch, or hoist the list/get queries into the route loader so the router's error boundary catches them | 2 | M |
| 2 | `admin.footer.tsx:178` has no `try`, so one rejected `settings.set` pins the button on "Saving…" and the only way out discards the edits. Wrap it the way `admin.nav.tsx:44` already does | 3 | S |
| 3 | 40+ mutations swallow failure, including every list-page delete and both dashboard queries. Row deletes optimistically drop the row, so a refused delete looks like a successful one until reload | 3 | M |
| 4 | Edit campaign, Edit form, Edit user and Edit role have no unsaved-changes guard, because they pass no `savedSignal` (`CampaignForm.tsx:157`, `FormBuilder.tsx:170`, `UserForm.tsx:67`, `RoleForm.tsx:79`). `admin.settings.tsx` has none either, despite going to lengths to protect drafts from a refresh | 5 | S |
| 5 | 19 of 24 deletes get a grey "Confirm" and 5 get a red "Delete", including three that cascade (`admin.nav.tsx:374`, `admin.org-chart.tsx:195`, `admin.media.tsx:263`). Pass `danger: true, confirmLabel: "Delete"` at all 24 sites | 4 | S |
| 6 | Icon buttons whose accessible name is a glyph: `admin.nav.tsx:446-492`, `OrgCanvas.tsx:124-147`, `FormBuilder.tsx:313-337`, `SectionsBuilder.tsx:190-212,864-878`, `MediaThumb.tsx:26,39`. Swap `title` for `aria-label`, add one where there is none | 6 | M |
| 7 | `PostForm.tsx:276` lets a post save with no title while requiring its slug. Add `required` | 7 | S |
| 8 | `admin.projects.index.tsx:60`, `admin.languages.tsx:159` and `admin.settings.tsx:551` render an empty table with no empty state | 1 | S |
| 9 | All 18 `ActionMenu` call sites use the default "Row actions", so every row in a table shares one name. Pass `label={\`Actions for ${r.name}\`}` | 6 | S |
| 10 | Two date formats and two money formats for the same values across screens. Export one `fmtDate` and one `fmtMoney`, delete the other four and two | 8 | S |
| 11 | Copy drift a user hits inside one session: Header/Navigation, Dashboard/Overview, Submissions/Responses, six Title Case h1s among 20 sentence-case ones, "Organisation" beside "Organizational" | 9 | S |
| 12 | `admin.index.tsx:38,42` swallow both dashboard queries and `Kpi` renders `?? 0`, so a broken dashboard reads as a quiet site | 3 | S |
| 13 | Delete `src/components/ui/*` and `MediaThumb.tsx`, and drop `radix-ui` + `class-variance-authority` from `package.json`. Nothing imports any of it | 10 | S |
| 14 | Collapse the nine copies of the list page into one component. Doing this after 1, 3, 8 and 10 means fixing each of those once rather than nine times, so it should land last of that group | 10 | L |
| 15 | 12 Add/Save/Move controls fire a mutation with no `disabled` while it is in flight (table in axis 2) | 2 | M |
| 16 | `SearchableSelect.tsx:90-144` announces a listbox it does not build. `PageSwitcher.tsx:132-152` is the working version to copy | 6 | M |
| 17 | `LangTabs.tsx:36-53` announces tabs with no `aria-controls` and no arrow-key movement | 6 | S |
| 18 | No required field is marked visually anywhere, and no hint is tied to its field with `aria-describedby`. Both belong in `form-ui.tsx` so they land once | 7 | M |
| 19 | `admin.donors.index.tsx:105` prints a URL as text where `admin.partners.index.tsx:116` links it | 8 | S |
| 20 | `admin.settings.tsx:570` and `TermsManager.tsx:164` save a row with no confirmation, no error and no visible change | 3 | S |

## needs-browser

Rows that cannot be settled from source. Left for the other pane.

- Whether the sticky `EditorHeader` (`form-ui.tsx:32`) keeps Save on screen on a short viewport, given `<main>`
  clips overflow (the comment at `admin.footer.tsx:251` says sticky is unusable there and routes around it via a
  portal, but only `admin.footer.tsx` and `PageForm.tsx` do so).
- Whether `admin.media.tsx:564` (the infinite-scroll sentinel, `rootMargin: 600px`) fires immediately on a list
  shorter than the viewport and pulls page 2 unprompted.
- Whether `ActionMenu.tsx:68` positions off-screen for a row near the right edge or the bottom of the window;
  `:51` computes `left: r.right - 144` with no clamping.
- Whether the toast region (`Dialogs.tsx:110`, an `<output>`) is actually announced, and whether a toast fired
  while a confirm dialog is open at `Dialogs.tsx:172` is reachable behind it.
- Whether `admin.settings.tsx:455`'s non-blocking read-error banner is noticed at all when it appears above a
  form the operator is already typing into.
