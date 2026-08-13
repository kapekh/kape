# J15 — command palette

One new file, `src/components/admin/CommandPalette.tsx`. Nothing else changed.
Route search only. Content search was not built, and the reason is in acceptance item 10.

Worktree `/home/userx/workspace/kape-j15`, branch `j15-palette`, port 3073, database `./j15.db`.

## Instance

There is no `kape.db` in this worktree, so there was nothing here to open:

```
$ ls -la kape.db
ls: cannot access 'kape.db': No such file or directory
```

The shared copy was checksummed read-only at the start and again at the end, and never opened:

```
$ md5sum /home/userx/workspace/kape/kape.db
083e888e4c7bc59e36aaad8b73afdbc1  /home/userx/workspace/kape/kape.db   (start)
083e888e4c7bc59e36aaad8b73afdbc1  /home/userx/workspace/kape/kape.db   (end)
```

**That is not the `e9789f59cb05f9f3426b9aba88001f9a` COMMON states.** It was already
`083e888e…` before I ran anything, and I never opened the file, so the figure in COMMON is
stale rather than the database being disturbed. Worth correcting in COMMON before the next job
takes it as a tripwire.

`:3020` was never contacted. My server ran on 3073 and is stopped.

## What I did, per numbered item in Do

**1. Opens on a shortcut and on a visible control.** `Ctrl`/`Cmd`+`K` on a window listener,
and a search-field-shaped button at the top of the sidebar rail, above the accordion. The
button shows the shortcut so the shortcut can be learned. Collapsed to the 4.5rem rail it
becomes a 36px icon button with an `sr-only` label.

**2. What it searches.** Admin routes only. The shell hands over `visibleNav` — already
filtered — and the palette matches with `matchesQuery` from `list-ui`, per word, against the
item label and its group name. So "content" finds Pages, Projects and Media, and "don" finds
Donations and Donors. Content search: see item 10.

**3. Permissions.** The palette receives `visibleNav` and never sees `NAV`, so `canSee` is the
only filter and it is not reimplemented. Proof in item 6.

**4. Keyboard.** ARIA combobox: focus stays in the input, `aria-activedescendant` points at the
highlighted option, arrows wrap, `Enter` navigates, `Escape` closes. The trap and the focus
restore are `useModalPanel`, the same hook `Dialogs.tsx` and the account menu use.

**5. Empty and no-match.** Opened with nothing typed it lists every screen the signed-in user
can reach, grouped under the same headers as the rail. That is the answer to the dashboard
showing three links and six shut headers: 37 destinations for an administrator, one keystroke
away, without opening a single accordion. No match uses the `EmptyState` primitive.

**6. Dialog treatment.** Same structure as `Dialogs.tsx` — `fixed inset-0 grid place-items-center`,
a full-bleed backdrop button labelled for its action, `rounded-xl` panel, `mega-content-in` at
0.18s, `role="dialog"` + `aria-modal` + `tabIndex={-1}` + a name. It is on the admin tokens,
not the public ones, because unlike `Dialogs.tsx` it only ever renders inside `.admin`.

## Acceptance

### 1. The four gates

```
=== GATE 1: bun run test ===
 Test Files  50 passed (50)
      Tests  449 passed (449)
   Duration  18.29s

=== GATE 2: bunx tsc --noEmit ===
exit 0

=== GATE 3: bun run lint ===
src/components/admin/FormBuilder.tsx:315:17 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:188:17 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:300:12 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:385:21 lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:84:15 lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:379:14 lint/suspicious/noArrayIndexKey
Checked 308 files in 250ms. No fixes applied.
Found 6 errors.

=== GATE 4: bun run build ===
✓ built in 1.96s
```

Six in, six out, all `noArrayIndexKey`, none of them in my file.

The same four also run green with the mount diff applied, which is the state the lead will
land. I applied it, ran them, and reverted:

```
$ git diff --stat src/routes/admin.tsx
 src/routes/admin.tsx | 3 +++
 1 file changed, 3 insertions(+)
=== tsc with the mount applied ===   exit 0
=== lint with the mount applied ===  6
=== build with the mount applied === ✓ built in 1.77s
$ git checkout src/routes/admin.tsx
$ git status --short src/routes/admin.tsx
(empty)
```

### 2. It opens both ways

By shortcut, from the topbar Tour button:

```
{ "step": "before shortcut",
  "activeElement": "BUTTON[text=\"Tour\"]",
  "paletteOpen": false }

--- page.keyboard.press('Control+k') ---

{ "step": "after Control+K",
  "paletteOpen": true,
  "activeElement": "INPUT[aria-label=\"Search admin screens\"]",
  "dialogRole": "dialog",
  "ariaModal": "true",
  "optionCount": 37 }
```

By the visible control in the rail:

```
--- page.locator('button[aria-label="Search the admin"]').click() ---

{ "step": "after clicking the sidebar control",
  "paletteOpen": true,
  "activeElement": "INPUT[aria-label=\"Search admin screens\"]",
  "triggerAriaExpanded": "true",
  "optionCount": 37 }
```

The control at 1440, measured: `x 12, y 80, width 231, height 36` — top of the rail, directly
under the logo block, 36px on the scale.

### 3. It closes and returns focus

Escape, opened from the Tour button:

```
before opening : BUTTON[text="Tour"]
after Escape   : { "paletteOpen": false, "activeElement": "BUTTON[text=\"Tour\"]" }
```

Clicking outside, opened from the rail control. Clicked at viewport `120,780`, which is
backdrop and well clear of the panel:

```
{ "clickedPoint": "120,780 (backdrop, well outside the panel)",
  "beforeClick_activeElement": "INPUT[aria-label=\"Search admin screens\"]",
  "paletteOpen": false,
  "activeElement": "BUTTON[aria-label=\"Search the admin\"]",
  "triggerAriaExpanded": "false" }
```

Both return focus to the element that opened it. Neither lands on `BODY`.

Navigation is the third case, and the one that can dump focus, because the opener may belong to
the screen you just left. Every navigation below returned focus to `MAIN#admin-main`, never
`BODY` — see item 5.

### 4. Focus is trapped while open

Five Tab presses, palette open, 37 options rendered:

```
{ "tab": 1, "activeElement": "INPUT[aria-label=\"Search admin screens\"]", "insideDialog": true }
{ "tab": 2, "activeElement": "INPUT[aria-label=\"Search admin screens\"]", "insideDialog": true }
{ "tab": 3, "activeElement": "INPUT[aria-label=\"Search admin screens\"]", "insideDialog": true }
{ "tab": 4, "activeElement": "INPUT[aria-label=\"Search admin screens\"]", "insideDialog": true }
{ "tab": 5, "activeElement": "INPUT[aria-label=\"Search admin screens\"]", "insideDialog": true }
```

All five inside. The input is the only tab stop by design: options are `role="option"` with
`tabIndex={-1}`, which is the combobox pattern, and it also means Tab does not walk 37 rows.

### 5. It navigates

Three routes, each typed from scratch, `Enter` on the highlighted option:

```
[
 { "typed": "media",
   "urlBefore": "http://localhost:3073/admin",
   "hits": ["Media"], "enterOpened": "Media",
   "urlAfter": "http://localhost:3073/admin/media",
   "paletteClosed": true,
   "focusBeforeOpen": "MAIN#admin-main[text=\"OverviewWhat's happening acr\"]",
   "focusAfterNavigate": "MAIN#admin-main[text=\"AdminMediaMedia libraryEvery\"]",
   "h1": "Media library" },

 { "typed": "roles",
   "urlBefore": "http://localhost:3073/admin/media",
   "hits": ["Roles"], "enterOpened": "Roles",
   "urlAfter": "http://localhost:3073/admin/roles",
   "paletteClosed": true,
   "focusBeforeOpen": "MAIN#admin-main[text=\"AdminMediaMedia libraryEvery\"]",
   "focusAfterNavigate": "MAIN#admin-main[text=\"AdminRolesRolesWhat each rol\"]",
   "h1": "Roles" },

 { "typed": "news",
   "urlBefore": "http://localhost:3073/admin/roles",
   "hits": ["News", "Internal news"], "enterOpened": "News",
   "urlAfter": "http://localhost:3073/admin/posts?type=news",
   "paletteClosed": true,
   "focusBeforeOpen": "MAIN#admin-main[text=\"AdminRolesRolesWhat each rol\"]",
   "focusAfterNavigate": "MAIN#admin-main[text=\"AdminRolesRolesWhat each rol\"]",
   "h1": "Roles" }
]
```

The third row reads `h1: "Roles"` because the probe fired before the posts list finished
rendering. Read again once it settled:

```
{ "url": "http://localhost:3073/admin/posts?type=news", "h1": "News", "rows": 4 }
```

That third case is the one worth noting: the type items all point at `/admin/posts` and are
told apart by `?type=`, and the palette carries the search param through, so "News" lands on
the News list and not on All posts.

### 6. It respects permissions

`staff@kapekh.org` as the database ships it holds the `staff` role, whose permissions are `[]`.
`resolveAdminAccess` answers `forbidden` for an account with no areas, so the shell never
renders and there is no palette to open:

```
{ "url": "http://localhost:3073/admin",
  "h1": "You do not have access to the admin",
  "main": "You do not have access to the adminYou are signed in as staff@kapekh.org, and that
           account has no admin areas.Ask an administrator to grant one…",
  "paletteTrigger": false,
  "sidebar": false,
  "shortcutOpensAnything": false }
```

That is a correct answer but not a useful one — an empty list is a subset of anything. So I
gave that account the existing `editor` role in **my copy of the database only**
(`permissions: ["pages","posts","projects","media"]`), signed in again, and listed every entry
the palette offers:

```
{ "signedInAs": "staff@kapekh.org",
  "optionCount": 15,
  "entries": ["Dashboard","Pages","Projects","Media","All posts","News","Stories","Videos",
              "Galleries","Publications","Careers","Events","Documents","Announcements",
              "Internal news"] }
```

What the administrator sees, same palette, same build — 37 entries:

```
  option: Dashboard  [aria-selected=true]
  option: Messages
  option: Forms
GROUP: Content
  option: Pages
  option: Projects
  option: Media
GROUP: Posts
  option: All posts
  option: News
  option: Stories
  option: Videos
  option: Galleries
  option: Publications
  option: Careers
  option: Events
  option: Documents
  option: Announcements
  option: Internal news
GROUP: Fundraising
  option: Campaigns
  option: Donations
GROUP: Records
  option: Schools
  option: People
  option: Partners
  option: Donors
  option: Offices
GROUP: Site
  option: Header
  option: Footer
  option: Org Chart
  option: Languages
  option: UI Strings
  option: Users
  option: Roles
  option: Settings
  option: Modules
GROUP: Lists
  option: Locations
  option: Publication categories
  option: Document categories
  option: Partner categories
```

15 of 37, strictly contained. Messages, Forms, Fundraising, Records, Site and Lists are all
absent, matching `editor`'s four areas exactly.

Every entry it does offer, opened: `/admin/media` → `Media library`, `/admin/pages` → `Pages`.
Neither refused.

The role was set back to `staff` afterwards:

```
[ { email: "staff@kapekh.org", role: "staff" },
  { email: "admin@kapekh.org", role: "admin" } ]
```

**One finding the lead should know about, which is not mine and which I did not touch.** The
acceptance wording is "must contain nothing that route would refuse", and the palette satisfies
the half it controls. But the routes it withholds are not themselves refused — as the editor,
typing the URL directly renders the screen:

```
"/admin/users":     { "landedOn": "…/admin/users",     "h1": "Users" }
"/admin/settings":  { "landedOn": "…/admin/settings",  "h1": "Site settings" }
"/admin/donations": { "landedOn": "…/admin/donations", "h1": "Donations" }
```

The refusal happens one layer down, at the data, and it is clear when it does:

```
"main": "AdminDonationsDonationsEvery gift received through Baray, across all campaigns.
         This list could not be loaded.Your account does not have permission to do this.
         Ask an administrator to grant it.Try again"
```

So `canSee` is chrome and `adminProcedure` is the enforcement. That is pre-existing and it is
the same for the sidebar, which hides exactly the same routes. The palette adds no exposure. I
am reporting it, not fixing it — it is a logic question and this job has no permission for one.

### 7. No-match state

Typed `zzqq`:

```
{ "query": "zzqq",
  "listboxPresent": false,
  "inputAriaExpanded": "false",
  "inputAriaActivedescendant": null,
  "renderedText": [
    "No screen matches that",
    "The palette searches admin screens by name. Page, post and record titles are not in it yet.",
    "Arrows to move, Enter to open, Esc to close" ] }
```

The description does double duty: it says why nothing matched, and it tells an operator who
typed a page title why the palette could not help. The listbox is removed rather than emptied,
so `aria-expanded` goes false and `aria-activedescendant` is dropped rather than left pointing
at an id that no longer exists.

Shots: `j15-1440-nomatch.png`, `j15-390-nomatch.png`.

### 8. Opened empty

With no query it suggests every screen the user can reach, in the rail's own grouping and
order. For the administrator that is the 37-entry list pasted in item 6, headed `Content`,
`Posts`, `Fundraising`, `Records`, `Site`, `Lists`, with Dashboard, Messages and Forms ungrouped
at the top and Dashboard pre-highlighted so `Enter` immediately does something sensible.

For the restricted account it is that account's 15. It never sits blank, and it never suggests
something the user cannot open.

Shots: `j15-1440-open.png`, `j15-390-open.png`.

### 9. Announced correctly

```
{ "role": "dialog",
  "ariaModal": "true",
  "ariaLabelledby": "_r_5_",
  "accessibleName": "Search the admin",
  "inputAccessibleName": "Search admin screens",
  "inputPlaceholder": "Search admin screens",
  "ariaActivedescendant": "_r_6_-option-0",
  "listboxLabel": "Admin screens",
  "footer": "Arrows to move, Enter to open, Esc to close",
  "optionCount": 37 }
```

Role `dialog`, accessible name "Search the admin" from a visually hidden `h2` the panel points
at with `aria-labelledby`, `aria-modal="true"`. The trigger carries `aria-haspopup="dialog"` and
an `aria-expanded` that tracks the panel — `false` → `true` → `false` across items 2 and 3.

### 10. Content search — an honest no

**Not built. It needs a query the shell does not make, and this job may not add one.**

The shell prefetches exactly one thing, and it is site settings:

```
$ grep -rn "queryOptions\|ensureQueryData" src/routes/admin*.tsx
src/routes/admin.modules.tsx:97:  // ensureQueryData serves a stale entry, so the cached copy has to be dropped, not invalidated
src/routes/admin.tsx:98:      context.queryClient.ensureQueryData(
src/routes/admin.tsx:99:        context.trpc.site.settings.queryOptions(),
```

That is the whole of what "data the shell has already loaded" amounts to, and it holds no page,
post or record titles.

There is no shared cache to borrow from either. All 14 admin lists hold their rows in component
state through `useListQuery`, not in the query client:

```
export function useListQuery<T>(load: () => Promise<T[]>) {
    const [rows, setRows] = useState<T[]>([]);
```

So titles exist only inside the route that fetched them and die with it. A palette that searched
them would have to call the server itself, which is a new procedure or at minimum a new call,
and Out of scope forbids both. Route-only search shipped, per the contract's own "acceptable
outcome". The no-match copy says so to the operator rather than leaving them guessing.

### 11. The mount diff for `admin.tsx` — not applied

Exactly three lines. `git diff --stat` confirms `1 file changed, 3 insertions(+)`.

```diff
--- a/src/routes/admin.tsx
+++ b/src/routes/admin.tsx
@@ -20,6 +20,7 @@ import { useEffect, useState } from "react";
 
 import { AdminHeaderProvider } from "#/components/admin/AdminHeader";
 import { AdminIcon } from "#/components/admin/AdminIcon";
+import { CommandPalette } from "#/components/admin/CommandPalette";
 import { startTour, startTourOnce, TourHost } from "#/components/admin/Tour";
 import { tourForPath } from "#/components/admin/tours";
 import { ThemeToggle } from "#/components/ThemeToggle";
@@ -499,6 +500,8 @@ function AdminLayout({ access }: { access: OkAccess }) {
 					)}
 				</div>
 
+				<CommandPalette nav={visibleNav} narrow={railNarrow} />
+
 				<nav className="hide-scroll flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
 					{visibleNav.map((section) => {
 						const open =
```

Placement matters in two ways. It is a sibling of `<nav>`, not a child, so it stays pinned while
the nav scrolls. And it is after the logo block, which is what puts it at the top of the rail.

`nav` is `visibleNav` — already through `canSee` — and `narrow` is `railShut && isDesktop`, the
same flag the rail uses to drop to icons. Both already exist at that point in `AdminLayout`;
nothing new is computed.

`admin.tsx` in this commit is byte-identical to HEAD.

### 12. Screenshots

`.work/redesign/shots/`:

| File | |
|---|---|
| `j15-1440-open.png` | 1440, open, no query, 37 grouped destinations |
| `j15-1440-query.png` | 1440, `don` typed → Donations, Donors |
| `j15-1440-nomatch.png` | 1440, `zzqq` typed |
| `j15-390-open.png` | 390, opened from the rail control |
| `j15-390-query.png` | 390, `don` typed |
| `j15-390-nomatch.png` | 390, `zzqq` typed |
| `j15-390-rail-control.png` | extra: the control in the drawer at 390 |
| `j15-1440-staff-editor.png` | extra: the 15-entry palette for the restricted account |

At 390 the panel measures `x 16, width 343` in a 390 viewport — 16px clear either side, which
is the `p-4` on the overlay.

## The flex-wrap centre-line check

Run at 1440 and at 390, palette open:

```
{ "at390": [], "at1440": [ [0, 31.5, 31.5] ] }
```

The one row at 1440 is not mine and is not a real misalignment. Resolved:

```
{ "centres": [0, 31.5, 31.5],
  "src": "/src/routes/admin.tsx:559:5",
  "cls": "sticky top-0 z-20 h-16 shrink-0 border-b border-admin-border bg-admin-panel/85 b…",
  "children": [
    { "tag": "BUTTON", "src": "/src/routes/admin.tsx:563:6", "rect": { …width 0, height 0 } },
    { "tag": "DIV",    "src": "/src/routes/admin.tsx:573:6", "rect": { …height 0, top 31.5 } },
    { "tag": "DIV",    "src": "/src/routes/admin.tsx:577:6", "rect": { …height 36, top 13.5 } } ] }
```

It is J02's topbar. The first child is the `lg:hidden` menu button, `display: none` at 1440 and
so a zero rect the probe reads as centre 0; the second is the empty `AdminHeader` portal slot,
which has no height on the dashboard. Same result with the palette closed, so it predates me:

```
{ "src": "/src/routes/admin.tsx:559:5", "m": [0, 31.5, 31.5] }
```

Nothing from `CommandPalette.tsx` appears at either width.

## What I could not do, and why

**Content search.** Item 10. It needs a server call the job may not add. Ship route-only was the
contract's own stated acceptable outcome and that is what this is.

**The visible control is behind the menu button below `lg`.** The contract says put it at the top
of the sidebar rail, and below `lg` that rail is a drawer, so on a phone the palette costs two
taps and the keyboard shortcut is not available at all. `j15-390-rail-control.png` shows it. A
second entry point in the topbar would fix it, but the topbar is `admin.tsx` and that is J02's,
and the contract placed the control deliberately. Lead's call.

**The staff account could not demonstrate a subset as shipped**, because its role holds zero
areas and the shell refuses it outright. I proved that first, then borrowed the existing
`editor` role for the real subset proof and put the account back. Both results are in item 6.

## Found and deliberately left alone

- **`canSee` hides routes it does not refuse.** Item 6. Nav visibility and data permission are
  different layers here. Pre-existing, identical for the sidebar, and a logic question.
- **`Org Chart` and `UI Strings` are not sentence case** in the `NAV` array
  (`admin.tsx:261,263`), against the DESIGN copy rule. The palette prints the labels it is
  given, so it inherits them. That array is J02's file.
- **`/uploads/*` 404s across the admin in this worktree.** Dozens of them on Media and on the
  posts lists. The database rows reference files the worktree does not have. Local artefact of
  the copy, not a defect.
- **Every screen runs a once-per-screen tour on first visit**, which takes the keyboard while it
  is up, so a first-visit `Ctrl+K` on a new screen opens nothing until it is dismissed. I seeded
  `admin-tour-seen:*` to get through the acceptance run. This is existing behaviour between two
  existing features and is worth a decision, not a patch.

## Note for whoever re-runs this

The palette is not mounted in this commit, so `bun run dev` shows nothing. Apply the item 11
diff first. Sign in as `admin@kapekh.org` / `redesign-dev-pw`; `staff@kapekh.org` has the same
password and no admin areas.
