# Cross-verification: admin shell (H2, M06, M13, M15, M09, L16, M10)

Measured in a browser against `http://localhost:3011`, the running dev server on
`.work/scratch/uitest.db`. Nothing under `src/` was changed, and the fixes were not read before
measuring. Screenshots in `.work/verify-shots/`.

**Tooling note.** The Playwright MCP browser refused to start: `Browser is already in use for
/home/userx/.cache/ms-playwright-mcp/mcp-chrome-186757f`, another pane holds that profile. I drove
Playwright directly instead, headless Chromium from the same engine, isolated profile. Every number
below is read out of the live DOM.

**Verdict: 6 of 7 pass. One defect found, in H2.**

| item | verdict |
|---|---|
| 1 H2 responsive | **fails in part** - no overflow, drawer and desktop correct, but the closed drawer keeps 43 controls in the tab ring |
| 2 M06 | pass |
| 3 M13 | pass |
| 4 M15 | pass |
| 5 M09 | pass |
| 6 L16 | pass, but the case is untestable as built (every row menu has one item) |
| 7 M10 | pass |

---

## 1. H2 responsive

### 375x812, `/admin/users`

```
document.documentElement.scrollWidth : 375
window.innerWidth                    : 375
document.body.scrollWidth            : 375
```

Equal. The users table clips inside its own scroll container rather than pushing the document wide;
`h2-375-closed.png` shows the `ADDED` column cut at the card edge, which is the container scrolling,
not the page.

Screenshots: `h2-375-closed.png` (hamburger, no sidebar, full-width content),
`h2-375-open.png` (drawer over a scrim).

The toggle is `role=button`, accessible name `Menu`, `aria-controls="admin-sidebar"`, no
`aria-label` (its text carries the name), `aria-expanded="false"` before and `"true"` after.

### Opening it by keyboard, then Tab x3, then Escape

```
focused element before Enter : BUTTON [Menu]
after Enter                  : aria-expanded = "true", drawer left = 0px
document.activeElement       : ASIDE [Admin navigation]
Tab 1                        : A [Dashboard]
Tab 2                        : A [Messages]
Tab 3                        : A [Forms]
after Escape                 : BUTTON [Menu]     <- focus returns to the trigger
                               aria-expanded = "false", drawer left = -256px
```

Enter opens it, focus moves into the drawer, the next three tabs stay inside it, and Escape both
closes it and returns focus to the button that opened it. That part is right.

### The defect: the closed drawer is still keyboard reachable

At 375x812 with the drawer shut, the sidebar is only moved off-screen:

```
#admin-sidebar getBoundingClientRect().left : -256
aria-hidden                                 : null
inert attribute                             : false
links and buttons inside                    : 43
of those, keyboard reachable (tabIndex >= 0, no inert ancestor) : 43
```

Tabbing from the top of a freshly loaded `/admin/users` at that width walks straight into it:

```
Tab 1  : A [Skip to main content]
Tab 2  : A [Dashboard]
Tab 3  : A [Messages]
Tab 4  : A [Forms]
Tab 5  : BUTTON [Content]
Tab 6  : A [Pages]
Tab 7  : A [Projects]
Tab 8  : A [Media]
Tab 9  : BUTTON [Posts]
Tab 10 : A [All posts]
Tab 11 : A [News]
Tab 12 : A [Stories]
```

A keyboard or screen-reader user on a phone lands in an invisible menu on the second Tab and has to
walk 43 stops that are not on screen before reaching the page. The skip link does not help: it is
Tab 1, and tabbing past it goes into the hidden drawer rather than to the content. This is the same
class of bug as the "45 tabs to reach admin main content" fix from the earlier round, and it is the
one item here that is not fixed. `inert` on the aside while `aria-expanded` is false would close it.

### 1440x900, desktop unchanged

```
/admin/pages     scrollWidth 1440  innerWidth 1440  sidebar width 256px  Menu button visible: false
/admin/settings  scrollWidth 1440  innerWidth 1440  sidebar width 256px  Menu button visible: false
```

Screenshots `h2-1440-admin-pages.png`, `h2-1440-admin-settings.png`: the 256px rail, the topbar and
the page bodies are the ordinary desktop layout, and the hamburger is not rendered.

---

## 2. M06 - one current-page marker

`/admin/pages`:

```
document.querySelectorAll('[aria-current="page"]').length : 1
the element                                              : "Pages"
```

Exactly 1, and it is the sidebar item for the screen being viewed.

---

## 3. M13 - a staff account on an admin screen

Signing in as `staff@kapekh.org` lands on `/internalsources`. Asking for `/admin/pages` directly:

```
URL after the request : http://localhost:3011/admin
heading               : "You do not have access to the admin"
body                  : "You do not have access to the admin You are signed in as staff@kapekh.org,
                         and that account has no admin areas. Ask an administrator to grant one.
                         Go to Internal Sources  Log out"
```

Screenshot `m13-staff-admin-pages.png`. The account is named, the reason is given, and there are two
ways out. It is not a blank screen and not a forced sign-out - the session survives:

```
GET /api/auth/me
status 200
{"user":{"id":1,"email":"staff@kapekh.org","name":"KAPE Staff","role":"staff"}}
```

And the same session is still refused by the API:

```
GET /api/trpc/adminPages.list?input=%7B%7D
HTTP status              : 403
tRPC data.httpStatus     : 403
body                     : {"error":{"json":{"message":"FORBIDDEN","code":-32003,
                            "data":{"code":"FORBIDDEN","httpStatus":403, ...
```

Server enforcement and the friendly screen agree.

---

## 4. M15 - a deep admin URL while logged out

```
logged out, requested : /admin/media
redirected to         : http://localhost:3011/login?redirect=%2Fadmin%2Fmedia
after signing in      : http://localhost:3011/admin/media
```

Lands on `/admin/media`, not on the dashboard. Screenshot `m15-landed.png`.

---

## 5. M09 - focus return from the delete confirmation

On `/admin/pages`, the row menu opened from the keyboard (focus the `Row actions` button, Enter),
`Delete` chosen with Enter. The dialog exposes `role=dialog` with `Cancel` and `Confirm`, and takes
focus on its own container:

```
dialog opened          : true
activeElement in dialog: DIV [Delete this page? Its child pages move u…]
buttons                : ["Cancel", "Confirm"]

document.activeElement after Escape  : BUTTON [Row actions]
document.activeElement after Cancel  : BUTTON [Row actions]
document.activeElement after Confirm : MAIN [admin-main]
```

None is `BODY`. Escape and Cancel both return focus to the trigger that opened the menu. After
Confirm the trigger no longer exists, because its row was deleted, and focus falls back to the main
region rather than to the document - which is the correct behaviour for a control that has gone.

The row is gone (`rowGone: true`). The confirm was run on `fix-b-h3`, a disposable page created by
an earlier job for its own evidence, not on KAPE content. Screenshots `m09-confirm-dialog.png`,
`m09-after-confirm.png`.

---

## 6. L16 - arrow keys in an open row menu

`/admin/pages`, menu open, focus starting on the only item:

```
on open    : BUTTON [Delete]
ArrowDown  : BUTTON [Delete]
ArrowDown  : BUTTON [Delete]
ArrowUp    : BUTTON [Delete]
End        : BUTTON [Delete]
Home       : BUTTON [Delete]
```

Focus never escapes the menu and never falls to `BODY`, which is the pass condition. But the test
cannot say more than that, because **no row menu in this admin has more than one item**. Swept:

```
/admin/pages     : ["Delete"]
/admin/posts     : ["Delete"]
/admin/donors    : ["Delete donor"]
/admin/people    : ["Delete person"]
/admin/media     : no row menu
/admin/campaigns : no row menu
```

Same five keys on `/admin/posts` give the same single answer. Wrapping, `End` to last and `Home` to
first are therefore unverifiable from the UI as it stands; they would need a menu with two or more
items before anyone can claim them.

---

## 7. M10 - the unsaved-changes prompt

### `/admin/footer`

```
untouched, Save button      : "Save footer", disabled = true
clicked sidebar link "Media": no prompt, URL after = http://localhost:3011/admin/media
```

Then reloaded, typed `ZZ` into the first field (`footer-site_name_en`):

```
Save button after the edit  : "Save footer", disabled = false
clicked sidebar link "Media": prompt shown = true
prompt text                 : "Unsaved changes  Leave this page and lose the edits you have not
                               saved?  Keep editing  Discard changes"
URL after                   : http://localhost:3011/admin/footer   (navigation held)
```

### `/admin/nav`

```
untouched, Save button      : "Save header settings", disabled = true
clicked sidebar link "Media": no prompt, URL after = http://localhost:3011/admin/media

after one edit, Save button : "Save header settings", disabled = false
clicked sidebar link "Media": prompt shown = true
prompt text                 : "Unsaved changes  Leave this page and lose the edits you have not
                               saved?  Keep editing  Discard changes"
URL after                   : http://localhost:3011/admin/nav      (navigation held)
```

Both pages: silent when untouched, and both ask once something has actually changed. Screenshots
`m10-footer-edited.png`, `m10-nav-edited.png`. No edit was saved - the only fields touched were
typed into and abandoned.

---

## What this run changed in the dev database

The page `fix-b-h3` (id 48) was deleted, deliberately, as the M09 Confirm step. It was a throwaway
page from an earlier job, not KAPE content. Nothing else was written: the M10 checks typed into
fields and left without saving, and `kape.db` was never opened.

---

## Re-check: inert drawer

Same method as above, same dev server, nothing under `src/` touched. Measured after the fix that
marks the closed drawer `inert` below `lg`.

**The defect is closed, and the desktop rail is not caught by it.**

### 375x812, `/admin/users`, drawer shut

```
#admin-sidebar found            : true
inert attribute                 : true
inert property                  : true
aria-hidden                     : null
getBoundingClientRect().left    : -256
links and buttons inside        : 43
of those, keyboard reachable    : 0        (was 43)
```

First six Tab stops from a fresh load:

```
Tab 1 : A [Skip to main content]
Tab 2 : BUTTON [Menu]
Tab 3 : A [View site ↗]
Tab 4 : A [My account]
Tab 5 : BUTTON [Log out]
Tab 6 : A [+ New user]
```

The hidden menu is gone from the tab ring. Tab 2 is now the drawer toggle and Tab 6 is already the
page's own primary action, where before Tab 2 through Tab 12 walked invisible sidebar links.
Screenshot `recheck-375-closed.png`.

### Opening it again at 375x812

```
aria-expanded after Enter    : true
inert attribute              : false
inert property               : false
getBoundingClientRect().left : 0
links and buttons inside     : 43
of those, keyboard reachable : 43        <- reachable again
document.activeElement       : ASIDE [Admin navigation]

Tab 1 : A [Dashboard]
Tab 2 : A [Messages]
Tab 3 : A [Forms]

after Escape : BUTTON [Menu]
               aria-expanded = "false", inert = true, keyboardReachable = 0, left = -256
```

Opening restores all 43 controls, the three tabs stay inside the drawer, and Escape closes it,
re-applies `inert` and returns focus to the toggle. Screenshot `recheck-375-open.png`.

### 1440x900, the desktop rail - the regression that would have mattered

```
#admin-sidebar inert attribute  : false
inert property                  : false
getBoundingClientRect().left    : 0
links and buttons inside        : 43
of those, keyboard reachable    : 43
programmatic focus on /admin/pages link succeeded : true
```

First six Tab stops:

```
Tab 1 : A [Skip to main content]
Tab 2 : A [Dashboard]
Tab 3 : A [Messages]
Tab 4 : A [Forms]
Tab 5 : BUTTON [Content]
Tab 6 : A [Pages]
```

The desktop rail is not inert, all 43 of its controls are reachable, and the tab order through it is
unchanged from the first run. Screenshot `recheck-1440-rail.png`.

With this, item 1 of the verification passes in full and all 7 items are green; L16 keeps its
caveat that no row menu has more than one item to arrow through.
