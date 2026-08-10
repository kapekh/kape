# FIX-A - the admin shell

Contract: `.work/jobs/FIX-A-admin-shell.md`, plus the M15 addition given mid-run (carry the intended
path through the sign-in boundary). Evidence rows: `.work/ui-audit/R1.md` H2, M06, M13, M15.

## What changed

One file: **`src/routes/admin.tsx`**. `git diff --stat`:

```
 src/routes/admin.tsx | 158 +++++++++++++++++++++++++++++++++++++++++++++++----
 1 file changed, 146 insertions(+), 12 deletions(-)
```

One of those lines is not mine: `{ to: "/admin/ui-strings", label: "UI Strings", icon: "languages" }`
was already in the working tree from another pane when I picked the file up, so it shows in a diff
against HEAD. Everything else below is.

**H2 - the drawer.** Below `lg` (1024px) the rail leaves the layout and becomes an off-canvas drawer;
from `lg` up nothing about it changes.

- The `<aside>` is `fixed lg:sticky`, translated `-translate-x-full` when closed and `translate-x-0`
  when open, with `lg:translate-x-0` pinning the desktop case. It keeps `w-64 shrink-0 h-screen`, its
  `viewTransitionName`, and the nav keeps `hide-scroll`.
- It gained `id="admin-sidebar"`, `aria-label="Admin navigation"` and `tabIndex={-1}` so it can hold
  focus.
- A `Menu` toggle in the header, `lg:hidden`, with `aria-expanded` and `aria-controls="admin-sidebar"`.
- The trap is the codebase's own `useModalPanel(closeDrawer, drawerOpen)` - the same hook the dialogs,
  the media preview and the org chart use. It focuses the panel, cycles Tab inside it, closes on
  Escape and restores focus to whatever opened it. Inactive while `drawerOpen` is false, so the
  desktop rail is never trapped.
- A full-screen backdrop button (`aria-label="Close navigation"`, `lg:hidden`) dismisses on an outside
  click, and every sidebar link calls `closeDrawer` so navigating does not leave the drawer over the
  page.
- A `matchMedia("(min-width: 1024px)")` listener closes the drawer when the viewport widens, so a trap
  armed at 375 cannot survive a resize onto the desktop layout.

**M06 - `activeOptions={it.exact ? { exact: true } : undefined}`** on the sidebar `Link`, the shape the
contract asked for. Dashboard no longer matches on the `/admin` prefix.

**M13 - the two refusals answered apart.** `resolveAdminAccess` used to return `null` for both "no
session" and "a session with no admin areas". It now returns a discriminated
`{ kind: "anon" } | { kind: "forbidden"; email } | { kind: "ok"; … }`. `beforeLoad` sends `anon` to
`/login` as before and `forbidden` to a `NoAccess` screen that names the account and offers Internal
Sources and Log out. `component` is now `AdminShell`, which picks the branch before either sub-tree's
hooks run, so the no-access case does not render a sidebar with nothing in it.

**M15 - the sending half of the return path.** `throw redirect({ to: "/login", search: returnTo(location.href) })`,
where `returnTo` admits only a same-site absolute path (`/^\/(?![/\\])/`). The receiving half was
already in `src/routes/login.tsx` from the pane that owns it.

### Deviation: no `src/routes/admin.forbidden.tsx`

The contract offered that file "if you take that route for M13". I created it, then removed it. A new
`admin.*.tsx` route file trips `every admin route file maps to an area` in `src/lib/modules.test.ts`,
whose `UNMAPPED` allowlist - the shell, the dashboard and the account page - is where a screen like
this belongs, and that file is not mine:

```
 FAIL  src/lib/modules.test.ts > every admin screen has a permission area > every admin route file maps to an area
AssertionError: add to NAV_AREA in permissions.ts, and to MODULES or CORE_NAV_PATHS: expected [ '/admin/forbidden' ] to deeply equal []
```

Rather than stop for a one-line edit in someone else's file, I render the notice from `admin.tsx` and
answer it at `/admin`. That is safe because `admin.index.tsx` is `createFileRoute("/admin/")({ component: Dashboard })`
with no loader - it fetches in an effect - so a refused user never reaches a screen's data. The one
coupling to know about: if the dashboard ever gains a route loader, a forbidden user would hit its 403
in that loader. It would fail loudly, not silently.

### Found but not fixed: the same defect on the Posts group

Filed as **M06b** in `.work/ui-audit/R1.md`. On `/admin/posts?type=news` three elements announce
`aria-current="page"` while only one is highlighted:

```json
{
  "path": "/admin/posts?type=news",
  "documentCount": 3,
  "items": [
    "\"All posts\" href=/admin/posts in=sidebar src=/src/routes/admin.tsx:426:12",
    "\"News\" href=/admin/posts?type=news in=sidebar src=/src/routes/admin.tsx:426:12",
    "\"← All posts\" href=/admin/posts in=main src=/src/routes/admin.posts.index.tsx:64:7"
  ],
  "visuallyActiveInSidebar": ["News"]
}
```

I tried two fixes and reverted both. Passing `aria-current` explicitly does nothing: `Link` overwrites
it whenever its own matcher says active - with `aria-current={isActive(it) ? "page" : "false"}` the 35
inactive links took my value and "All posts" still came back `page`. And
`activeOptions={{ exact: true, explicitUndefined: true }}` fixes `?type=news` but breaks the bare list,
swinging `/admin/posts` from two current to none:

```json
{ "path": "/admin/posts", "sidebarAriaCurrent": [], "visuallyActive": ["All posts"] }
```

It needs the link layer to accept an explicit active state, or those items to stop being search-param
variants of one route. Both are outside this file.

## Acceptance

### 1. Gates

`bunx tsc --noEmit` - silent, exit 0, no output:

```
--- admin.tsx errors: 0
```

`bun run test` - 351 over 36 files, against a floor of 333 over 33:

```
 Test Files  36 passed (36)
      Tests  351 passed (351)
   Start at  10:14:32
   Duration  3.83s (transform 4.78s, setup 0ms, import 10.24s, tests 6.61s, environment 3.63s)
```

`bun run lint` - 8 errors, 0 warnings, all in other panes' files; my file is clean:

```
Checked 278 files in 175ms. No fixes applied.
Found 8 errors.
--- my files ---
Checked 1 file in 9ms. No fixes applied.
```

### 2. H2 in a browser

375x812 on `/admin/users`, drawer closed. `scrollWidth` equals `innerWidth`, where the audit measured
530 against 360, and `main` has the whole viewport where it had 104px:

```json
{
  "scrollWidth": 375,
  "innerWidth": 375,
  "equal": true,
  "mainWidth": 375,
  "asideX": -256,
  "asidePosition": "fixed",
  "toggleVisible": true,
  "toggleExpanded": "false",
  "toggleName": "Menu",
  "asideName": "Admin navigation"
}
```

Re-measured against the final code after the M06b experiments were reverted:

```json
{
  "finalCheck375": {
    "scrollWidth": 375,
    "innerWidth": 375,
    "equal": true,
    "mainWidth": 375,
    "drawerOffCanvas": true
  }
}
```

- Closed: `.work/ui-audit/shots/FIXA-375-drawer-closed.png`
- Open: `.work/ui-audit/shots/FIXA-375-drawer-open.png`

1440x900 on `/admin/pages`, desktop untouched - still `sticky`, still 256px at x=0, content still
starts at 256, toggle gone:

```json
{
  "ariaCurrentCount": 1,
  "ariaCurrentItems": ["\"Pages\" href=/admin/pages"],
  "asideX": 0,
  "asideWidth": 256,
  "asidePosition": "sticky",
  "toggleHiddenOnDesktop": true,
  "mainX": 256,
  "scrollWidth": 1425,
  "innerWidth": 1440
}
```

### 3. H2 keyboard

Focused element at each step, all at 375x812 on `/admin/users`.

Focus the toggle:

```json
{ "focused": "BUTTON \"Menu\" aria-expanded=false" }
```

Enter - the drawer slides in and focus moves into it:

```json
{
  "step": "after Enter",
  "asideX": 0,
  "toggleExpanded": "true",
  "focused": "ASIDE#admin-sidebar \"Admin navigation\"",
  "focusInsideDrawer": true
}
```

Tab, first stop:

```json
{ "step": "Tab 1", "focused": "A \"Dashboard\"", "inside": true }
```

Tab twice more - measured at the third, focus still inside and the drawer still open (the second was
pressed but not sampled):

```json
{ "step": "Tab 3", "focused": "A \"Forms\"", "inside": true, "drawerStillOpen": true }
```

Escape - closes, and focus is back on the toggle:

```json
{
  "step": "after Escape",
  "asideX": -256,
  "toggleExpanded": "false",
  "focused": "BUTTON \"Menu\"",
  "focusIsToggle": true
}
```

Click outside, at x=320 which is past the 256px drawer:

```json
{
  "elementUnderPoint320x400": "BUTTON aria-label=Close navigation",
  "isBackdrop": true,
  "asideXAfterOutsideClick": -256,
  "toggleExpanded": "false",
  "focusIsToggle": true
}
```

### 4. M06

`document.querySelectorAll('[aria-current="page"]').length` on `/admin/pages`, was 2:

```json
{
  "path": "/admin/pages",
  "ariaCurrentCount": 1,
  "items": ["\"Pages\" href=/admin/pages"]
}
```

### 5. M13

Signed in as `staff@kapekh.org`, opened `/admin/pages`. Screenshot:
`.work/ui-audit/shots/FIXA-staff-no-access.png`. No login form, no sidebar, the session still live and
the procedure still refusing:

```json
{
  "url": "/admin",
  "heading": "You do not have access to the admin",
  "screenText": "You do not have access to the admin | You are signed in as staff@kapekh.org, and that account has no admin areas. Ask an administrator to grant one. | Go to Internal Sources | Log out",
  "sidebarPresent": false,
  "loginFormPresent": false,
  "authMe": { "user": { "id": 1, "email": "staff@kapekh.org", "name": "KAPE Staff", "role": "staff" } },
  "adminPagesListStatus": 403,
  "adminPagesListBody": "[{\"error\":{\"json\":{\"message\":\"FORBIDDEN\",\"code\":-32003,\"data\":{\"code\":\"FORBIDDEN\",\"httpSta"
}
```

The gate is not weakened. All 27 admin routes still refuse that user, and five procedures still 403 -
the same sweep the audit ran, with the same result:

```json
{
  "routeOutcomes": { "200 /admin": 27 },
  "totalRoutes": 27,
  "trpcStatuses": {
    "adminPages.list": 403,
    "adminUsers.list": 403,
    "adminMedia.list": 403,
    "adminRoles.list": 403,
    "admin.overview": 403
  }
}
```

### 6. Nothing above 1024px moved

1440x900, both retaken against the final code:

- `.work/ui-audit/shots/FIXA-1440-pages.png`
- `.work/ui-audit/shots/FIXA-1440-settings.png`

Measured on `/admin/pages` in section 2 above: aside `sticky` at x=0, 256px wide, `main` at x=256,
toggle not rendered.

### 7. M15 (the addition)

Logged out, opened `/admin/media`. The browser landed on:

```
http://localhost:3011/login?redirect=%2Fadmin%2Fmedia
```

Signed in as `admin@kapekh.org`, and the page after submit:

```
http://localhost:3011/admin/media
```

The guard, run against the shipped predicate:

```
"/admin/media"             -> {"redirect":"/admin/media"}
"/admin/pages?type=news"   -> {"redirect":"/admin/pages?type=news"}
"//evil.tld/x"             -> {}
"/\\evil.tld"              -> {}
"https://evil.tld"         -> {}
"javascript:alert(1)"      -> {}
"admin/media"              -> {}
""                         -> {}
```

## Stop conditions

None were hit. The dev server stayed up throughout. No `git` command that writes was run. `kape.db` in
the repo root is `e9789f59cb05f9f3426b9aba88001f9a` before and after, unchanged; all testing used
`.work/scratch/uitest.db` via `http://localhost:3011`.

Two things happened that were not mine and are worth knowing when reading the timestamps: `tsc` was
briefly red on `src/integrations/trpc/router.ts` and then on `src/components/Dialogs.tsx` while other
panes were mid-edit, and `lint` briefly showed 2 warnings from `src/components/admin/PageForm.tsx`.
All three cleared on their own before the final run above.
