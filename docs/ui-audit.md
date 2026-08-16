# Admin UI/UX audit

Phase 1 of the admin redesign.
Behaviour is out of scope for the changes this proposes: everything below is markup, styling, layout, copy, states, transitions and component composition.
Where a finding cannot be fixed without touching logic, it is marked and left for a decision rather than assumed.

## Method

| | |
|---|---|
| Tree | `cms-core` at `fa65dea`, clean |
| Instance | `http://localhost:3031`, dev server on `.work/redesign/rd.db`, a `VACUUM INTO` copy of `kape.db` |
| Client data untouched | `kape.db` checksum `e9789f59cb05f9f3426b9aba88001f9a` before and after |
| Viewports | 1440x900 and 390x844 |
| Screenshots | `.work/redesign/shots/` |
| Source census | 57 `src/routes/admin.*.tsx` (9,203 lines), 38 `src/components/admin/*`, 7 `src/components/ui/*` |
| Baseline gates | 399 tests / 43 files green, `tsc` silent, `bun run lint` 8 errors (all pre-existing `noArrayIndexKey`) |

Three code audits ran in parallel and their raw output backs every count below.
The browser pass is mine.

## Direction

Calm and spacious, guided.
Generous whitespace, one primary action per screen, progressive disclosure, inline help where a field needs it.
Rows stay around 56px; this is not a densification exercise.

The three reference products each contribute one thing, and where they disagree, calm wins.

| Reference | What we take | What we do not take |
|---|---|---|
| Sanity / Notion | Editorial calm, the document pane, live preview as a first-class half of the editor | Their block-editor complexity |
| Stripe Dashboard | Form and settings layout, section framing, empty states, table headers and filters | Their density |
| Linear | Keyboard affordances, restraint with colour, transition quality, command palette | Their 32px rows and monochrome severity |

The admin gets its own shell language, derived from the operator's brand tokens but distinct from the public site.
The public site's look is signed off by the client and does not change.

## What is already built

Half an audit's value is stopping work that does not need doing.
The prior round closed these, and they are confirmed present in the running instance.

| Already there | Evidence |
|---|---|
| List search, empty states, horizontal table scroll, retryable load errors | `src/components/admin/list-ui.tsx`, adopted by 10 list routes |
| Sidebar accordion, one group open at a time, desktop rail collapse to icons, `inert` drawer | `src/routes/admin.tsx:459-512` |
| Skip link, focus trap and focus return in dialogs, menu keyboard handling | `src/routes/admin.tsx:414-419`, `src/components/Dialogs.tsx` |
| Toasts, confirm and prompt as one primitive | `src/components/Dialogs.tsx`, 55 importing files |
| Optimistic concurrency on the page editor, segment validation server-side | `src/server/repo/admin.ts:748-770` |
| Colour discipline: every colour is a token, one `amber-500` escape | `src/styles.css:157-239` |
| Every visitor-facing string editable from `/admin/ui-strings` | 249 keys |

Do not rebuild any of it.
The redesign dresses these; it does not replace them.

---

# Part 1: cross-cutting findings

This is where the leverage is.
Twelve findings below explain most of what is wrong on all 57 screens, and fixing them once fixes them everywhere.

## F01 The admin wears the website's clothes

**Now.** The admin inherits the public site's tokens wholesale.
`h1`-`h4` are Fraunces serif at `letter-spacing: -0.02em` (`src/styles.css:253-256`), the page sits on cream paper, and `body::before` paints a fixed radial texture behind every admin screen (`src/styles.css:279-287`).

**Awkward.** A serif "Overview" over a data table reads as an article, not a tool.
The texture layer costs a composited full-viewport paint on a surface that is pure chrome.

**Proposed.** Add an admin token layer to `src/styles.css`, scoped under a root class the admin shell sets, deriving from the same `--brand-*` inputs so a configured site stays recognisable.
Sans display face for admin headings, neutral panel surface a step off the paper, hairline borders, no texture.
Public tokens are not edited.

**Files.** `src/styles.css`, `src/routes/admin.tsx` (one class on the shell root).
**Risk.** Medium. `src/lib/site-theme.ts` re-declares brand values in a `<style>` during SSR and `styles.test.ts` enforces the token rules, so the new layer must pass both.

## F02 Seven design-system files exist and nothing imports them

**Now.** `src/components/ui/` holds `button`, `input`, `label`, `select`, `slider`, `switch`, `textarea`.
412 lines, radix-backed, shadcn `new-york`, `components.json` configured with `"iconLibrary": "lucide"`.
Importers across the whole repo: **zero**.

**Awkward.** The project pays for the abstraction and gets none of it.
`src/components/ui/button.tsx` is used by 0 of 57 admin routes.

**Proposed.** Adopt them as the base layer rather than writing new ones, retuned to the admin tokens.
radix-ui and lucide-react are already dependencies, so this adds nothing.
Extend the folder with the pieces that are missing and are currently copy-pasted: `Card`, `Badge`, `Table`, `PageHeader`, `Toolbar`, `Skeleton`.

**Files.** `src/components/ui/*`, plus new files in the same folder.
**Risk.** Low. Nothing imports them today, so nothing can break.

## F03 Sixteen card variants for one visual object

**Now.** Distinct class strings containing `border border-border bg-card`: 16.
Three radii (`rounded-xl`, `rounded-2xl`, `rounded-3xl`) and eight paddings (`p-2 p-4 p-5 p-6 p-7 p-10`, `px-10 py-8`, none) describe the same panel.

**Proposed.** One `Card` with `padding` and `tone` props. Replace all 16 at the call sites.
**Files.** New `src/components/ui/card.tsx`; call sites across the route files, owned per job.
**Risk.** Low.

## F04 Twelve primary buttons, six sizes

**Now.** Distinct `bg-primary` button class strings: 12, in six sizes (`px-4 py-1.5` through `px-6 py-2.5`).
They differ by class ordering, by whether `transition` is present, and by whether `disabled:opacity-50` is present.
Secondary buttons: 8 variants, two of which differ only in `text-foreground/80` vs `/70` and `font-medium` vs `font-semibold`.
Icon buttons are a third family on a different radius.
`form-ui.tsx` contains two different primary sizes inside one file (`:45` and `:225`).

**Proposed.** Route everything through the existing `buttonVariants` in `src/components/ui/button.tsx`.
**Files.** `src/components/ui/button.tsx`, `src/components/admin/form-ui.tsx`, call sites per job.
**Risk.** Low, but high blast radius. Every job touches buttons, so the API must be frozen before any page job starts.

## F05 The disabled primary button reads as broken

**Now.** Save is disabled until the form is dirty, which is correct and was deliberate.
Rendered, it is a flat muted blue-grey slab: see `.work/redesign/shots/rd-03-page-editor.png` and `rd-06-nav.png`.

**Awkward.** It looks like a failed render, not a deliberate state, and on `/admin/nav` it is the most prominent thing on screen.
Cancel is currently more visually prominent than Save.

**Proposed.** A disabled primary keeps its shape and loses saturation, not identity.
Add the reason as a tooltip and an `aria-describedby` hint: "No changes to save."
**Files.** `src/components/ui/button.tsx`, `src/components/admin/form-ui.tsx`.
**Risk.** Low.

## F06 Two row heights and 27 cell styles for one table

**Now.** 15 routes hand-roll a `<table>`, plus 3 components.
`<thead>` agrees everywhere (one string, 15 uses). Nothing else does.
Distinct `<th>` strings: 9. Distinct `<td>` strings: 27.
`td` vertical padding splits `py-2` in 7 routes against `py-2.5` in 6, so the same list pattern ships at two different row heights.
Cell text colour uses six different tokens.

**Proposed.** One `Table` composition (`Table`, `THead`, `TR`, `TH`, `TD`) with alignment and width as props.
Row height 56px, per the chosen direction.
**Files.** New `src/components/ui/table.tsx`; the 15 routes and 3 components, owned per job.
**Risk.** Low per call site, medium in aggregate.

## F07 Eight badge shells for one "published" state

**Now.** No badge component.
Eight template-literal pill variants and six static ones.
The same published pill appears as `px-2 py-0.5 text-xs`, `px-2 py-0.5 text-xs capitalize`, `inline-flex px-2.5 py-0.5 text-xs font-semibold capitalize` and `px-2 py-0.5 text-[11px] font-medium capitalize`.
The green token is copy-pasted in 5 routes.
`bg-amber-500/15` is the only raw Tailwind palette colour in the entire admin.

**Proposed.** One `Badge` with a `tone` prop (`live`, `draft`, `warning`, `danger`, `neutral`, `accent`).
Status becomes a dot plus a label rather than a filled pill, which reads calmer at list density.

**Files.** New `src/components/ui/badge.tsx`; call sites per job.
**Risk.** Low.

## F08 No page header component, four title treatments

**Now.** 26 routes hand-roll an `<h1>`; 31 rely on `EditorHeader` in a sticky bar.
Distinct `h1` strings: 3, plus the editor's `text-base` variant, so four unrelated title treatments.
The wrapper `flex items-center justify-between mb-6` is byte-identical in 12 routes.
The subtitle `mt-1 text-sm text-muted-foreground` appears 23 times.
`AdminHeader`, the portal that puts a title in the topbar, is used by 2 of 57 routes.

**Awkward.** There is no breadcrumb anywhere in the admin.
From `/admin/pages/1` there is no link back to Pages.

**Proposed.** One `PageHeader` taking title, description, breadcrumb and actions.
Adopt it on all 57 surfaces so the topbar slot is either used everywhere or removed.

**Files.** New `src/components/ui/page-header.tsx`, `src/components/admin/AdminHeader.tsx`, `src/components/admin/form-ui.tsx`, all route files.
**Risk.** Low.

## F09 The spacing scale exists and nothing follows one path through it

**Now.** Across the 57 routes: 10 distinct `py-*`, 9 `px-*`, 8 `p-*`, 10 `gap-*`, 8 `rounded-*`, 9 `space-y-*`, plus arbitrary `text-[10px]` and `text-[11px]`.
The routes lean `rounded-full` and `rounded-xl`; the components lean `rounded-lg` and bare `rounded`.
`admin.media.tsx` alone uses 8 `py` values, 7 `px` values and 6 radii.

The four canonical list routes are near-identical, because `list-ui` imposes a scale on them.
That is the proof the approach works: where a primitive exists, the scale holds.

**Proposed.** An 8pt rhythm expressed as the allowed subset, documented at the top of the admin token block, and a lint-adjacent check in the design-system job that counts distinct values so a later round can see drift.
**Files.** `src/styles.css`, then every job.
**Risk.** Low.

## F10 Icons are absent from 55 of 57 screens

**Now.** Three icon sources: `AdminIcon`'s 31 hand-authored SVG paths, `lucide-react`, and 10 inline `<svg>` elements.
All three converge in `src/routes/admin.tsx`, the only file importing `AdminIcon`, and one of only two importing lucide.
Two `AdminIcon` names are unused (`hero`, `stats`).

**Awkward.** 55 of 57 routes render no icons at all.
Row actions are text-only, so `Edit` and `⋯` compete as two affordances for one job.
Where glyphs do appear (`/admin/nav`, `/admin/footer`, the rich-text toolbar) they are typographic characters (`↑ ↓ ＋ ✎ ✕ ❝ ▦`), which was already flagged for naming and is also the reason those toolbars look homemade.

**Proposed.** lucide-react everywhere, already a dependency.
Keep `AdminIcon` as the nav's named-icon indirection but back it with lucide.
Replace the typographic glyphs.

**Files.** `src/components/admin/AdminIcon.tsx`, `src/components/admin/RichTextEditor.tsx`, `src/routes/admin.nav.tsx`, `src/routes/admin.footer.tsx`.
**Risk.** Low. Accessible names already exist on these controls and must be preserved exactly.

## F11 Native selects break the language wherever a form appears

**Now.** `Parent page` and `Status` in the page editor are unstyled OS `<select>` elements (`.work/redesign/shots/rd-03-page-editor.png`).
`src/components/ui/select.tsx` is a complete radix select and is one of the seven dead files.

**Awkward.** It is the single loudest visual tell that this is not a designed product.
A `SearchableSelect` already exists and is used in exactly 2 routes.

**Proposed.** Adopt `src/components/ui/select.tsx`.
**Risk.** Medium, and the one place I would go slowly. A native select is keyboard- and screen-reader-correct for free; a radix one has to earn it. Each conversion carries a keyboard check in its acceptance.

## F12 Loading is a word, not a shape

**Now.** The dominant pattern is an in-table row reading `Loading…`.
`admin.media.tsx:427` has the only skeleton in the entire admin.
Six routes replace the whole page or the whole table with a bare paragraph, so the header disappears and returns.
Three editor routes use a different wrapper than the other 11.

**Proposed.** A `Skeleton` primitive, and the rule that a loading state preserves the layout it is loading into.
**Files.** New `src/components/ui/skeleton.tsx`, `src/components/admin/list-ui.tsx`, route files per job.
**Risk.** Low.

---

# Part 2: per-surface findings

Risk is the risk of breaking existing behaviour, not the difficulty of the design work.

## The shell

`src/routes/admin.tsx`, 617 lines. Screenshots `rd-01`, `rd-07`.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| S1 | Topbar carries View site, theme toggle, avatar, email, role, My account, Log out | Two text buttons where a menu belongs. At 390px all three wrap to two lines each and the bar eats 64px+ (`rd-07`) | Collapse identity into one avatar menu holding email, role, My account, theme, Log out. View site keeps its own control | Low |
| S2 | Sidebar groups are one-at-a-time, and opening one shuts the others | Deliberate, and Rithy's call, so it stays. The cost is that from the dashboard a user sees 3 links and 6 shut headers | Keep the accordion. Add a persistent search/command entry at the top of the rail so nothing is more than one keystroke away | Low |
| S3 | No global search, no command palette | The only way to reach a screen is the accordion | Command palette over routes, pages, posts and records, built from data already loaded. Keyboard entry plus a visible control, since a hidden shortcut helps nobody occasional | Medium. Needs its own data reads; must not add a query on every screen |
| S4 | No breadcrumbs anywhere | `/admin/pages/1` has no path back to Pages | Breadcrumb slot in `PageHeader` | Low |
| S5 | Content column is `max-w-[1600px]`, most pages render a ~768px card left-aligned | At 1440 roughly 400px sits empty on settings-shaped screens (`rd-04`) | Per-surface max width: prose-width for settings forms, full width for tables | Low |
| S6 | Studio branch is a regex on the pathname (`:311`) | Fine, but the 256px rail stays open inside the page builder and eats the preview | Auto-collapse the rail on studio routes, restore on exit | Low |

## Dashboard

`src/routes/admin.index.tsx`, 380 lines, zero admin-component imports. Screenshot `rd-01`.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| D1 | Four stat cards | ~130px tall each for one number. First card carries a coral left edge the others lack | One stat row, consistent treatment, trend where a comparison exists | Low |
| D2 | Website traffic bar chart | No axis, no gridline, no hover, no value. Reads as decoration. 511 total with most bars at zero | Real chart: y-axis, hover value, and a stated range. Follow the `dataviz` skill for palette and form | Low |
| D3 | Content by type, bar per type | The bars misencode. 4 and 2 render as roughly 90% and 75% of the track, because the bar is not zero-based on a shared scale | Zero-based shared scale, or drop the bars for a plain count list. Misleading is worse than plain | Low |
| D4 | Manage panel, 7 buttons | Duplicates the sidebar with an arbitrary subset, in no order | Replace with recent activity, or with the drafts and unanswered messages that actually need the operator | Low |
| D5 | Needs attention says "All clear" | The best panel on the page and the least prominent | Promote it. It is the one thing a returning operator wants first | Low |

## List routes

19 surfaces. 10 canonical on `list-ui`; 5 hand-rolled; 4 are 13-line `TermsManager` wrappers. Screenshots `rd-02`, `rd-07`.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| L1 | 10 routes share `list-ui`; `forms.index`, `roles.index`, `messages`, `donations.index`, `forms.$id.submissions` do not | Five lists miss the search, empty state and scroll behaviour the other ten have | Move all five onto `list-ui`. This is composition, not logic | Medium. `donations.index` has its own filter state that must survive |
| L2 | Row shows `Edit` plus a `⋯` menu | Two affordances for one job, and `Edit` is a bare accent-coloured word | One `⋯` menu with Edit first, or a whole-row target plus the menu. Pick one and apply to all 19 | Low |
| L3 | Status pills, 8 variants (F07) | | `Badge` with a `tone` | Low |
| L4 | Page hierarchy shown by a ~16px indent | On 39 pages the tree is unreadable (`rd-02`) | Indent guides, and the parent shown as breadcrumb text under the title | Low |
| L5 | No row count, no status filter | The header says `Pages` where it could say what is there | Count and filter chips in the `PageHeader` toolbar | Low. Filtering is client-side over data already loaded |
| L6 | Column headers are not sortable | `pages.index` is hard-sorted by slug (`:40`) | Sortable headers on the columns that already have a comparable value | Medium. Sort state is new logic; if that crosses the line, ship the header affordance disabled and flag it |
| L7 | At 390px the table scrolls horizontally, clipping the status column mid-word (`rd-07`) | A horizontal scroll is the fallback, not the answer | Below `md`, tables become a stacked card list: title, then meta line, then the action menu | Low |
| L8 | The 4 `TermsManager` wrappers are 13 lines each; all UI is in the component | Nothing wrong. Noted so no job opens them by mistake | Redesign `TermsManager` once | Low |
| L9 | `/admin/pages/43` for a missing id renders a bare `Page not found.` at the top-left, no chrome, no way back (`rd-03` first capture) | Every `$id` route has this hole | A real not-found state inside the shell, with a link back to the list | Low |

## Entity editors

11 `*Form` components, each with a `.new` and a `.$id` route. 3,000+ lines.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| E1 | `EditorHeader` sticky bar with title, Cancel, Save | The one genuinely good pattern here. Keep it | Restyle only | Low |
| E2 | Fields stack in one column at prose width | Related fields are far apart; long forms are a scroll | `FormSection` with a description column on the left and fields on the right, Stripe-style, at wide widths | Low |
| E3 | Field errors arrive as a corner toast that vanishes in 4.5s | Already flagged. The field gets no `aria-invalid` and focus never moves to it | Errors sit under their field, referenced by `aria-describedby`, and the first invalid field takes focus | Medium. Error placement is markup, but routing the error to the right field may cross into logic. Flag per form |
| E4 | Successful saves are silent on several routes | The only cue is the button re-disabling | A consistent save confirmation | Low |
| E5 | `LangTabs` English/Khmer with EN/KM chips | Good idea. The inactive tab has almost no affordance, and there is no signal that a translation is missing | Show a per-tab state: translated, empty, falls back to English | Medium. Knowing "falls back" needs data the form may not have. Flag it |
| E6 | Native selects throughout (F11) | | `Select` | Medium |
| E7 | `MediaPicker` and `MediaLibraryDialog` announce items as `#136 · image/png` | Already flagged. No alt-text field exists | Restyle the picker; show filenames. Alt text is a data change, so it stays out and moves to the phase 2 doc | Low for the restyle |

## The studio

`admin.pages.new.tsx`, `admin.pages.$id.tsx`, `PageForm.tsx` (514), `SectionsBuilder.tsx` (954), `PagePreview.tsx`, `PageSwitcher.tsx`. 2,881 lines. Screenshot `rd-03`.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| P1 | Two panes, inspector left and live preview right, with a drag handle | Good bones, and the closest thing here to the Sanity reference | Keep the structure, restyle | Low |
| P2 | Empty preview is a centred sentence in a ~760px void | The largest area on screen does the least work | A real empty state that shows what adding a section will do | Low |
| P3 | Save and Cancel sit in the preview pane's header | They act on the left pane and live on the right | Move to the inspector's own sticky footer | Low |
| P4 | Sections, Metadata, Page settings, Cover stack in one 410px scroll | Four unrelated jobs in one column, headings in serif at three weights | Tabs or an accordion in the inspector, with Sections as the default | Low |
| P5 | `SectionsBuilder` at 954 lines is the largest file in the tree | Every section type's editor is inline | Restyle in place. Do not refactor; the risk is not worth it in a design round | High. This file owns the section editing behaviour, and three of the eight lint errors live in it |
| P6 | Status is a native select buried mid-form | Publish state is the most consequential control on the screen | Promote to the header as an explicit control | Medium. Same control, new position |

## Media

`src/routes/admin.media.tsx`, 790 lines, no admin-component imports, fully isolated. Screenshot `rd-05`.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| M1 | Grid, upload, usage drawer, the only skeleton in the admin | The best-built screen here and its own design system: 8 `py` values, 7 `px`, 6 radii | Bring onto the shared scale. The skeleton pattern graduates into `list-ui` | Low |
| M2 | Filters are All / Images / Files | Video is a file, gets the generic tile, and the counter calls it one | Video as its own filter with a poster tile | Medium. The kind test is logic; if it needs more than a mime prefix check, flag it |
| M3 | Item accessible name is `#136 · image/png` | | Filename in the name | Low |

## Singleton config screens

8 surfaces, 2,600+ lines. Screenshots `rd-04`, `rd-06`.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| G1 | `settings` is one endless single-column scroll, 628 lines, 7 fields visible per screen (`rd-04`) | No section nav, no anchors, no sticky save | Section nav rail plus sticky save. The clearest single win in the admin | Low |
| G2 | Help text ends with the raw key: `site_name_en`, `logo_url` (`rd-04`) | Implementation leaking into the label | Move to a hover affordance, or drop | Low |
| G3 | `nav` reorders with ↑↓ glyph buttons and teaches itself in a paragraph (`rd-06`) | If the UI needs a paragraph, the UI is the problem | Restyle to real icon buttons with labels; keep the paragraph until the affordance is self-evident. Drag-and-drop is new logic and is not proposed here | Low as scoped |
| G4 | `nav` has a save for header settings and a separate model for the menu | Two save semantics on one screen with no visual distinction | Make the two scopes visually separate | Low |
| G5 | `footer` reports itself dirty on load, so Save is armed before any edit | Known, in `useDirty`'s baseline | Out of scope: this is logic. Listed so it is not lost | Not proposed |
| G6 | `ui-strings`, 361 lines | **The file contains non-UTF8 bytes and `file` reports it as `data`, so plain `grep` skips it silently** | Whoever owns it must use `grep -a`. Worth fixing the encoding as its own thing | Low, but a trap |
| G7 | `org-chart` uses `@xyflow/react` | Its own visual language again | Bring the surrounding chrome onto the scale; leave the canvas | Low |
| G8 | `modules`, `languages`, `account` | Consistent with the rest, which is to say inconsistent | Standard treatment | Low |

## Sub-views and auth screens

| # | Surface | Now | Proposed | Risk |
|---|---|---|---|---|
| X1 | `forms.$id.submissions` | Hand-rolled table, no `list-ui` | Onto `list-ui` | Medium |
| X2 | `campaigns.$id.donations` | Shares `DonationsTable` with the donations list | Restyle the shared component once | Low |
| X3 | `login.tsx` | The first screen anyone sees, and it is outside the admin shell | Deserves the new language. Note the error is a plain `<div>` with no `role="alert"`, already flagged | Low |
| X4 | No-access screen, `admin.tsx:121-157` | A centred card, and one of only three `h1` treatments | Standard empty-state treatment | Low |

---

# Part 3: the public frontend

Inline editing is deferred to its own round and is planned in `docs/inline-editing-plan.md`.
What remains here fits the hard constraints: how CMS-driven content renders, and what it does when there is nothing to render.

| # | Now | Awkward | Proposed | Risk |
|---|---|---|---|---|
| W1 | 21 section templates in `SectionRenderer.tsx`, 2,166 lines | The public look is signed off and does not change | Only the states below. No visual redesign of a signed-off surface | Low |
| W2 | Dynamic sections render whatever their query returns | A `postList` with no posts, a `people` section with nobody, a `map` with no locations: each renders a heading over nothing | A per-template empty state, so a half-built page never looks broken to a visitor | Low |
| W3 | Media that fails to load | No fallback | Placeholder consistent with `src/lib/placeholder.ts` | Low |
| W4 | Rich text is `.prose-body` (`src/styles.css:316-362`) | Solid. Tables and embedded form placeholders are the weak spots | Table and `form-embed` styling to match | Low |
| W5 | Visitor-facing forms, `FormRenderer.tsx` and `ContactForm.tsx` | Validation, pending and success states are thin | Field-level errors, pending on submit, a real success state | Medium. Error display may cross into logic; flag per form |

---

# Part 4: risk register

Nothing below is a reason not to proceed. Each is a thing a worker must be told.

| Risk | Why | Control |
|---|---|---|
| `form-ui.tsx` has 15 component consumers and 8 route consumers | A change there hits the singleton job, both editor jobs and the studio at once | It lands in the foundation job and its API is frozen before any page job starts |
| `list-ui.tsx` has 10 consumers, `ActionMenu.tsx` has 17 | Same shape | Same: foundation job owns them |
| `PostForm.tsx` is imported by 9 routes, 7 for `type LangOpt` only | Couples the studio and the nav screen to the post editor | Extract `LangOpt` into a types module in the foundation job. That is a move, not a behaviour change |
| `SectionsBuilder.tsx`, 954 lines | Largest file, owns section editing | Restyle in place, no refactor, and it gets a job to itself |
| The 8 lint errors are all `noArrayIndexKey` | 3 in `SectionsBuilder`, 2 in `admin.footer` | Gate on delta, not on zero. A job may not add a ninth |
| `admin.ui-strings.tsx` is not valid UTF-8 | `grep` skips it and reports nothing | Its job is told to use `grep -a` |
| A dirty-form guard is armed on `/admin/footer` before any edit | Pre-existing | Not this round. Workers must not "fix" it and call it design |
| The deployed `dist/` predates HEAD | From the last round's UAT | Unrelated to this work, but any visual verification must run against a fresh dev server, never the deployed build |
| `:3020` is KAPE's own instance | Client data | Every job runs on its own port against its own `VACUUM INTO` copy. Never `kape.db` |

## What I am not proposing, and why

| Item | Reason |
|---|---|
| Drag-and-drop menu ordering | New interaction logic. Worth doing; belongs in a round where logic is in scope |
| Sort state on list columns | Same |
| Alt text on inserted images | Needs a data shape change |
| The dirty-baseline fix on `/admin/footer` | Logic |
| Any change to the public site's signed-off look | Client approved it |
| Refactoring `SectionsBuilder` | Risk with no design payoff |
| New dependencies | radix-ui, lucide-react, tailwind v4 and tanstack-table cover everything above |
