# J02 — shell, dashboard, login

| | |
|---|---|
| Files changed | `src/routes/admin.tsx`, `src/routes/admin.index.tsx`, `src/routes/login.tsx`. Nothing else |
| Instance | `http://localhost:3042` on `.work/redesign/j02.db` |
| `kape.db` before | `e9789f59cb05f9f3426b9aba88001f9a` |
| `kape.db` after | `e9789f59cb05f9f3426b9aba88001f9a` |
| Browser | headless Chromium driven by playwright-core, own profile. The MCP browser was already held by another pane |

**Two things the lead needs to know before reading the rest.**

1. **This working tree is shared.** J03 and J05 have uncommitted edits to fourteen files in it
   (`admin.pages.index.tsx`, `admin.posts.index.tsx`, `RichTextEditor.tsx`, and eleven more), plus a
   `j05-tmp` stash. So gates 1, 3 and 4 below ran over their in-flight work as well as mine. Gate 3
   is reported twice for that reason: once over the whole tree and once with their files stashed
   out, which is the number that measures my delta. My commit stages my three files by path and
   touches none of theirs.
2. **`theme_dark_mode` is `on` in `.work/redesign/j02.db`.** It ships `off`, which makes
   `ThemeToggle` render `null`, and the theme control in the new account menu could not be
   exercised at all. I turned it on in my own copy and left it on so the lead re-runs against the
   same state. To put it back:
   `sqlite3 .work/redesign/j02.db "update site_settings set value='off' where key='theme_dark_mode'"`.

---

## What I did

### The shell — `admin.tsx`

**1. S1, the identity cluster.** View site, theme, avatar, email, role, My account and Log out were
seven controls in the topbar. They are now three: a View site link, and an avatar button that opens
one panel holding the email, the role, My account, the theme toggle and Log out.

The panel is not a new component. It is `useModalPanel` — the same hook the drawer eight lines above
it already uses — plus the same full-screen close button the drawer already uses for outside-click.
That buys focus-in on open, Tab held inside, Escape, and focus back to the avatar, all of it code
that was already load-bearing in this file.

`logout()` is byte-for-byte the function that was there. It moved from a topbar button to a menu
button; the `fetch("/api/auth/logout")` and the `navigate({ to: "/login" })` after it did not change.

I did not reach for a radix `DropdownMenu`. `ThemeToggle` takes `settings` and `className` and
spreads nothing, so it cannot be a `DropdownMenu.Item asChild` — the `role`, `tabIndex` and key
handlers radix merges onto the child would land on a component that drops them, and the control
would be mouse-only inside the menu. A modal panel of ordinary focusable controls keeps it a real
Tab stop. Evidence in acceptance item 15.

**2. S2, the accordion.** Untouched as behaviour. `admin-nav-open`, `admin-nav-rail`, the
`useState(null)` / `useState(false)` hydration-safe starts, the `activeGroup` effect, the `inert`
drawer, `activeOptions` exact-match on Dashboard: all still exactly as they were. Only class strings
changed, plus the group header's type, which drops `text-[10px] uppercase tracking-[0.15em]` for
`text-[13px] font-medium` per the spec's "the uppercase micro-label survives in the table header and
nowhere else".

**3. S4, breadcrumbs.** The shell provides no breadcrumb and does not need to: `PageHeader` renders
in the page body, which is inside the content column, which has room. Confirmed by the no-access
screen, the first surface in this round to render a `PageHeader`.

**4. S5, per-surface width.** See "The convention for the twelve downstream jobs" at the bottom.

**5. S6, the studio branch.** The `:311` regex is untouched. A second piece of state was added:

```tsx
const [studioRailOpen, setStudioRailOpen] = useState(false);
useEffect(() => { if (studio) setStudioRailOpen(false); }, [studio]);
const railShut = studio ? !studioRailOpen : railCollapsed;
```

`railCollapsed` is still the only thing that reaches `localStorage`, and `toggleRail` returns early
inside the studio without persisting. So the page builder collapses the rail on arrival, the
operator can widen it for that visit, and the stored preference is untouched throughout. Acceptance
item 8 walks all nine steps.

**6. X4, the no-access screen.** `PageHeader` for the `h1` and the "signed in as" line, `EmptyState`
for the icon, the reason and the actions. `.admin` on its root, so it gets the admin tokens and
loses the `body::before` texture like every other admin screen. Both controls kept their exact
labels: `Go to Internal Sources` and `Log out`.

### The dashboard — `admin.index.tsx`

**7. D1, the stat row.** Four `Card`s, one treatment. The coral left edge on the first card is gone.
`font-display` and the uppercase micro-label are gone. The numbers, the labels and the sub-notes are
the same expressions they were.

**8. D2, the traffic chart.** Read the `dataviz` skill first; it is a single series, so no
categorical palette and nothing for the validator to check. What it got:

- a y-axis, rounded up to a printable top (295 peak → a 300 axis, ticks 300 / 150 / 0)
- hairline gridlines on the same scale, and a `--admin-border-strong` baseline
- a hover tooltip per bar carrying the value and the date
- the range stated in words: `Last 14 days · 511 total · peak 295 a day`
- an `sr-only` table of all fourteen rows, so the data is not hover-only
- 24px bar cap with the leftover as air, 4px rounded data-end, square at the baseline

The old chart floored every bar at `Math.max(2, …)`, so a zero-visit day drew a visible stub. A zero
is now zero and sits on the baseline rule.

**9. D3, Content by type.** **The audit's number did not reproduce.** F/D3 says 4 and 2 render at
"roughly 90% and 75%". Measured on the running instance before I changed anything, the old bars were
`n / max`, and 4 → 100%, 3 → 75%, 2 → 50% — the ratio was already right. Pasted in acceptance item 12.

What was actually wrong is that the scale was never stated, so a full-width bar for "Publication"
implies a large number when it means "the largest of ten small ones". The bars keep the zero-based
shared scale and now print it: **"26 posts. A full bar is 4, the largest group."**

**10. D4, the Manage panel.** Deleted. Seven links duplicating the sidebar in no order. Its slot went
to the work: Needs attention now lists the individual drafts, each linking to its editor, under the
count. No new query — `drafts` was already computed on line 45 of the old file and only its length
was used.

**11. D5, promoting Needs attention.** It is now the first card under the stat row, at the top of the
two-thirds column instead of the bottom of the one-third column, and it takes `tone="warning"` when
there is something waiting and `tone="neutral"` when there is not.

Also, per F12: the two bare `Loading…` paragraphs (old file `:186` and `:260`) are gone. The loading
state is now 18 skeleton blocks in the shape of the content with three `sr-only` "Loading…"
announcements, and the page header stays put.

### Login — `login.tsx`

**12. X3.** New geometry, new scale, new type, public tokens. Login renders outside `.admin`, where
every `--admin-*` token is undefined — the same reason `Dialogs.tsx` was left on public tokens, and
I followed that precedent rather than putting a second `.admin` root on a screen the spec says the
shell owns. So: `rounded-xl` card, `rounded-lg` 40px fields, 13px medium labels, sentence case, a
40px submit button that loses saturation rather than opacity when busy, and the `←` glyph replaced
by a lucide `ArrowLeft`. The site name is now the page's `h1`; it was a `<div>` and the screen had
no `h1` at all.

**13. The two known defects.**

- The 429 rate-limit response is still reported as "Invalid email or password" (`:65`, the
  `res.status === 401` branch answers, and 429 falls to the generic `else`). **Logic. Not touched.**
- **`role="alert"` was already there.** The audit (X3) and the contract both say the error `<div>`
  has none. On `cms-core` at `7d6591d` it has `role="alert"`, `id="login-error"`, and both inputs
  carry `aria-invalid` and `aria-describedby` pointing at it. The lead pre-approved adding it; there
  was nothing to add. Pasted live in acceptance item 13. The audit finding is stale — worth
  correcting in `docs/ui-audit.md`, which I do not own.

---

## Acceptance

### 1. The four gates

```
### 1. bun run test
 Test Files  47 passed (47)
      Tests  429 passed (429)
   Start at  09:56:15
   Duration  65.61s

### 2. bunx tsc --noEmit
(silent)

### 3. bun run lint  — whole tree, including J03's and J05's uncommitted work
src/components/admin/CampaignForm.tsx:298:22   lint/suspicious/noArrayIndexKey
src/components/admin/FormBuilder.tsx:280:16    lint/suspicious/noArrayIndexKey
src/components/admin/ProjectForm.tsx:242:20    lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:175:17 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:282:16 lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:362:21 lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:80:15              lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:373:14             lint/suspicious/noArrayIndexKey
Found 16 errors.        <- 8 baseline + 8 lint/a11y/useSemanticElements in list routes I do not own

### 3b. the same run with the other panes' fourteen files stashed out
Checked 296 files in 696ms. No fixes applied.
Found 8 errors.         <- the baseline, unchanged. My three files add none.

### 3c. my three files alone
$ bunx biome lint src/routes/admin.tsx src/routes/admin.index.tsx src/routes/login.tsx
Checked 3 files in 14ms. No fixes applied.

### 4. bun run build
dist/server/assets/router-CZ2MXiGA.js   258.12 kB │ gzip: 63.42 kB
✓ built in 1.89s
```

### 2. The sidebar still behaves — hydration on five full loads

`admin-nav-open` set to `Posts`, then a full document load of each path.

```
/admin/media      hydration errors: 0  | all console errors: 0 [] | open group: ["Content"] | stored: Posts
/admin/users      hydration errors: 0  | all console errors: 0 [] | open group: ["Site"]    | stored: Site
/admin/posts      hydration errors: 0  | all console errors: 0 [] | open group: ["Posts"]   | stored: Posts
/admin/pages      hydration errors: 0  | all console errors: 0 [] | open group: ["Content"] | stored: Content
/admin/settings   hydration errors: 0  | all console errors: 0 [] | open group: ["Site"]    | stored: Site
```

**0 on all five**, and zero console errors of any kind. The `stored` column shows the pre-existing
behaviour intact: the landed-on group overwrites the stored one.

### 3. One group open at a time

Every group header clicked in order, `aria-expanded="true"` counted after each.

```
initial: Content=false  Posts=false  Fundraising=false  Records=false  Site=true  Lists=false
click #0 "Content"     -> count = 1  [Content=true]
click #1 "Posts"       -> count = 1  [Posts=true]
click #2 "Fundraising" -> count = 1  [Fundraising=true]
click #3 "Records"     -> count = 1  [Records=true]
click #4 "Site"        -> count = 1  [Site=true]
click #5 "Lists"       -> count = 1  [Lists=true]
```

**Never above 1.** Clicking an open group shuts it and the count goes to 0, which is the deliberate
`""` all-shut state:

```
clicked Content (already open) -> count = 0  Content=false Posts=false … Lists=false
```

### 4. Landing in a shut group opens it

```
stored before: Lists
after landing on /admin/settings:
  Content=false  Posts=false  Fundraising=false  Records=false  Site=true  Lists=false
  aria-current: [ "Settings" ]
after reload:
  Content=false  Posts=false  Fundraising=false  Records=false  Site=true  Lists=false
  aria-current: [ "Settings" ]
```

`Site` open, `Settings` carrying `aria-current="page"`, and it survives the reload.

### 5. Exactly one `aria-current="page"`

```
/admin         count=1 ["<a> \"Dashboard\""]
/admin/pages   count=1 ["<a> \"Pages\""]
/admin/media   count=1 ["<a> \"Media\""]
```

Not fixed and not touched, as instructed: `/admin/posts?type=…` still announces three. Recorded, not
repaired.

### 6. The drawer is still inert when shut — 390x844

```
shut: {"inert":true,  "focusable":13, "tabbable":0}
open: {"inert":false, "focusable":13, "tabbable":13}
```

Shut is **0**; open restores all 13. (13 rather than 43 because only one accordion group is open;
`inert` covers whatever is rendered.)

### 7. Escape closes the drawer and returns focus to the toggle

```
before open,  focus: BUTTON "Menu"
drawer open,  focus: ASIDE#admin-sidebar "Admin navigation"   aria-expanded=true
after Escape, focus: BUTTON "Menu"                            aria-expanded=false  inert=true
```

### 8. The rail collapses, remembers, and the studio does not overwrite the preference

```
1. /admin, no stored preference               {"railPx":256,"ariaExpanded":"true", "srLabel":"Collapse sidebar","stored":null}
2. after collapsing                           {"railPx":72, "ariaExpanded":"false","srLabel":"Expand sidebar",  "stored":"collapsed"}
3. after reload, still collapsed              {"railPx":72, "ariaExpanded":"false","srLabel":"Expand sidebar",  "stored":"collapsed"}
4. expanded again (the preference to keep)    {"railPx":256,"ariaExpanded":"true", "srLabel":"Collapse sidebar","stored":"open"}
5. /admin/pages/1 auto-collapses              {"railPx":72, "ariaExpanded":"false","srLabel":"Expand sidebar",  "stored":"open"}
6. widened by hand inside the studio          {"railPx":256,"ariaExpanded":"true", "srLabel":"Collapse sidebar","stored":"open"}
7. back out: stored preference is back        {"railPx":256,"ariaExpanded":"true", "srLabel":"Collapse sidebar","stored":"open"}
8. studio again: collapsed, override forgotten{"railPx":72, "ariaExpanded":"false","srLabel":"Expand sidebar",  "stored":"open"}
9. dashboard, preference intact               {"railPx":256,"ariaExpanded":"true", "srLabel":"Collapse sidebar","stored":"open"}
```

Step 5 is the auto-collapse. Step 6 is the operator overriding it. Step 7 is the point of the whole
exercise: `stored` reads `open` at every step from 4 onward, and the wide rail is back on the way
out. Step 8 shows the override is a per-visit thing, not a second preference.

### 9. Log out still works

```
after Log out (clicked inside the new account panel), url = http://localhost:3042/login
then /admin/pages   -> url = http://localhost:3042/login?redirect=%2Fadmin%2Fpages
```

### 10. The skip link is still the first tab stop

```
Tab 1      -> A "Skip to main content" href=#admin-main
after Enter-> MAIN#admin-main
Tab 2      -> A "New post"  insideMain=true
```

### 11. The dashboard's numbers are unchanged

Same database, same instance, the old file and the new one.

| | before | after |
|---|---|---|
| Visitors today | `0` · Same as yesterday | `0` · Same as yesterday |
| Published content | `26` · 0 in draft | `26` · 0 in draft |
| Projects | `18` · 5 schools · 5 partners | `18` · 5 schools · 5 partners |
| Form submissions | `0` · 0 subscribers | `0` · 0 subscribers |
| Traffic | `Last 14 days · 511 total` | `Last 14 days · 511 total · peak 295 a day` |

Fourteen daily values, before (from the old bars' `title`) and after (from the new `sr-only` table):

```
before: 07-29:0  07-30:0  07-31:0  08-01:0  08-02:0  08-03:0  08-04:111
        08-05:0  08-06:105 08-07:0 08-08:0  08-09:295 08-10:0 08-11:0
after:  07-29:0  07-30:0  07-31:0  08-01:0  08-02:0  08-03:0  08-04:111
        08-05:0  08-06:105 08-07:0 08-08:0  08-09:295 08-10:0 08-11:0
```

Content by type, before and after: Publication 4, Event 3, Video 3, Job 3, News 3, Announcement 2,
Document 2, Internal news 2, Photo album 2, Impact story 2. Ten rows, same order, same counts.

**The drafts branch, exercised.** Three posts were flipped to `draft` in `.work/redesign/j02.db`
(never `kape.db`) and the real tRPC query served them:

```
[warning] Needs attention · Drafts awaiting review · 3
  /admin/posts   :: Drafts awaiting review 3
  /admin/posts/3 :: New ICT Lab Opens at a New Generation School — News
  /admin/posts/2 :: Kang Meas District Receives 21st-Century Library… — News
  /admin/posts/1 :: Provincial Campaign to Boost School Enrollment… — News
KPIs: Published content 23 · 3 in draft
```

Then flipped back, and the dashboard returned to the baseline exactly:

```
Published content 26 · 0 in draft   |   [neutral] Needs attention · All clear — nothing needs review.
```

Shot: `j02-needs-attention-drafts.png`.

### 12. Content by type is honest

Rendered pixel widths, measured with `getBoundingClientRect()` on the fill element.

**Before** (old file, same data, same viewport):

```
Publication   n=4  track 155.3px  fill 155.3px  (100%)
Event         n=3  track 155.3px  fill 116.5px  (75%)
Announcement  n=2  track 155.3px  fill  77.7px  (50%)
```

**After:**

```
Publication   n=4  track 144.7px  fill 144.7px  (100%)
Event         n=3  track 144.7px  fill 108.5px  (75%)
Announcement  n=2  track 144.7px  fill  72.3px  (50%)
```

4 : 2 = 144.7 : 72.3 = **2.00 : 1**, and 3 : 2 = 108.5 : 72.3 = **1.50 : 1**. Both match the data.
The audit's "roughly 90% and 75%" is not what the old code did — see item 9 above. What the surface
gained is the printed scale: **"26 posts. A full bar is 4, the largest group."**

### 13. Login works

Wrong password:

```json
{
  "role": "alert",
  "text": "Invalid email or password.",
  "emailAriaInvalid": "true",
  "emailDescribedBy": "login-error"
}
```

Right password:

```
right password -> url = http://localhost:3042/admin
  h1 on the landing page: [ "Overview" ]
```

Shots: `j02-login-error-1440.png`, `j02-login-1440-light.png`, `j02-login-1440-dark.png`,
`j02-login-390-light.png`.

### 14. Screenshots

Eighteen in `.work/redesign/shots/`, all at deviceScaleFactor 1:

```
j02-dashboard-1440-light.png   j02-dashboard-1440-dark.png
j02-dashboard-390-light.png    j02-dashboard-390-dark.png
j02-shell-1440-light.png       j02-shell-1440-dark.png
j02-shell-390-light.png        j02-shell-390-dark.png
j02-login-1440-light.png       j02-login-1440-dark.png       j02-login-390-light.png
j02-login-error-1440.png       j02-no-access-1440.png
j02-account-menu-1440.png      j02-account-menu-390.png
j02-traffic-hover-1440.png     j02-dashboard-loading-1440.png
j02-needs-attention-drafts.png
```

At 390 the topbar is one row — hamburger, View site, avatar — with nothing wrapping. That is the
whole of S1 in one picture (`j02-dashboard-390-dark.png`, compare `rd-07-posts-mobile.png`).

### 15. Extra — the account panel's keyboard, and the theme control inside it

Not asked for, but the panel is the one genuinely new interaction in this job.

```
topbar controls now: [ A:"View site", BUTTON:"Account" ]

before open, focus: BUTTON "Account"
menu open,   focus: DIV "Account"                    (role="dialog" aria-modal="true")
panel text:  admin@kapekh.org · Administrator · My account · Theme · Log out
controls:    [ A:"My account", BUTTON:"Switch to dark mode", BUTTON:"Log out" ]
Tab cycle:   ["A \"My account\"", "BUTTON \"Switch to dark mode\"", "BUTTON \"Log out\"", "A \"My account\""]
after Escape, focus: BUTTON "Account"
```

All three controls are real Tab stops, the cycle is held inside the panel, and focus goes back to
the avatar. The theme toggle still does what it always did:

```
before: {"html":"",      "stored":null}
after:  {"html":"dark",  "stored":"dark"}
back:   {"html":"light", "stored":"light"}
```

### 16. Extra — the loading state (F12)

Server-rendered `/admin`, which is the loading state by construction:

```
h1 in SSR:              [ "Overview" ]
skeleton elements:      18
sr-only "Loading…":     3
bare <p>Loading…</p>:   0     (was 2: old file :186 and :260)
KPI placeholders (—):   3
```

Shot: `j02-dashboard-loading-1440.png`. The header stays put and the skeletons hold the shape of
what is coming.

---

## The convention for the twelve downstream jobs — S5

The content column stays `max-w-[1600px]` and full width by default, because tables want it. A
surface that is a column of fields opts into prose width by putting **one attribute on its own root
element**:

```tsx
<div data-admin-width="prose">
  <PageHeader title="Settings" … />
  …
</div>
```

The shell picks it up with a `has-[]` variant and narrows around it. Nothing is imported, no prop is
threaded, and the shell does not need to know which route is rendering:

```tsx
<div className="mx-auto w-full max-w-[1600px] has-[[data-admin-width='prose']]:max-w-3xl">
  <Outlet />
</div>
```

Verified live, computed style on the wrapper:

```json
{"before":"1600px", "afterProseChild":"768px", "restored":"1600px"}
```

No route sets the attribute today, so the default is byte-identical to what shipped. `768px` is
`max-w-3xl`; if a surface needs a second width the lead should add the token here rather than have
thirteen jobs invent their own.

---

## What I could not do

- **The theme control could not be tested as the client's install ships it.** `theme_dark_mode` is
  `off` in `kape.db`, so `ThemeToggle` returns `null` and there is no theme control in the account
  menu at all — before my change or after it. I turned it on in my own DB copy to prove the control
  works inside the panel. Flagged at the top; the flip-back command is there.
- **The 429 message on login.** Logic, explicitly out of scope. Untouched at `login.tsx:65-74`.
- **`role="alert"` on login.** Nothing to do — it was already present. The audit's X3 and the
  contract's item 13 are both stale on this point.
- **The `?type=` triple `aria-current`.** Recorded in item 5, not repaired, as instructed.
- **A real error state on the dashboard.** Both `trpcClient` calls end in `.catch(() => {})`, so a
  failed query is indistinguishable from a slow one and the skeleton pulses forever. Giving it the
  "Error — names what failed and offers a retry" state from the spec's four-states table needs the
  rejection tracked in state, which is logic. **Reporting, not deciding.**
- **`Published content` reads `0` while loading, not `—`.** `published` counts over `posts ?? []`,
  so it is a number before the data arrives, and only `o?.…` values get the em dash. Pre-existing;
  making it honest means changing what the expression computes. Same call as above.

## What I found and deliberately left alone

- **The tree is shared with two other panes.** Fourteen files carry J03's and J05's uncommitted
  work, and one `j05-tmp` stash sits in the stash list. I staged by path. But `bun run test`,
  `bunx tsc` and `bun run build` cannot be isolated that way, so those three gates certify my
  changes *plus* whatever theirs were at 09:56 — all green, but the lead should know the number is
  not mine alone.
- **`admin.pages.index.tsx` and eight sibling list routes** grew `lint/a11y/useSemanticElements`
  errors during my session and had lost them again forty minutes later. Another pane's work in
  progress. Not mine, not touched.
- **`AdminHeader`, the topbar portal slot**, is still used by 2 of 57 routes. The slot is preserved
  exactly and now sits between the rail toggle and the identity cluster. F08 proposes retiring it
  once every surface is on `PageHeader`; that call belongs to the last job, not the first.
- **The dashboard's tone toggling.** `Needs attention` flips `Card`'s `tone` between `warning` and
  `neutral`. If the lead would rather it never shout, one word changes it.
