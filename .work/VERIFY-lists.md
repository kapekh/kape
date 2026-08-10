# Independent verification: ten admin list pages and six singleton screens

Measured in a headless Chrome against `http://localhost:3011`, signed in as `admin@kapekh.org`.
No file under `src/` was touched. `kape.db` in the repo root is byte-identical before and after
(`e9789f59cb05f9f3426b9aba88001f9a`). Screenshots in `.work/verify-shots/`.
`FIX-D-report.md` and `FIX-E-report.md` were not opened before or during the measuring.

Seven of the eight checks pass. The regression sweep does not: three of the five pages log a
React hydration error, and it reproduces on demand.

## Environment caveat, read this before trusting a timestamp

Other panes were rewriting `src/` while I measured. `src/routes/admin.tsx` changed at 12:52:06
and again at 12:58:53, and `src/routes/$lang.contact.tsx` was left with a syntax error
(`<` with no tag name at line 169) that vite kept reporting.

Between 12:44 and 12:53 the running admin shell crashed into its error boundary with
`folded is not defined` and `slugifyGroup is not defined` — half-written versions of
`admin.tsx` served by HMR. Those are not defects; they are the file mid-save.

To get a target that stood still I copied the working tree to `/home/userx/workspace/kape-verify`,
pointed it at a `.backup` copy of the scratch database, and ran a second dev server on port 3111.
Checks 1, 6 and 7 were measured there as well and agree with 3011. That server is stopped now;
the tree is still on disk if you want it, otherwise it is safe to delete.

The database is `.work/scratch/uitest.db`, as instructed. It ends the run with 18 projects,
same as it started.

## 1. Refused delete — PASS

`/admin/projects`, HCC (id 3), which `project_locations` points at. Menu → Delete → Confirm.

Row count before: 18. Row count after, sampled every 400 ms for 4 s: 18, and the HCC row is
present at every sample. Nothing was removed from the database:

```
sqlite> select id,slug from projects where id=3;
3|hcc
```

The message, verbatim, from the toast host:

```
Something else still points at this record. Remove those links first, then try again.
```

Not "reload the page, pick it again, and save". Screenshots `01c-refused-delete-3011.png`
(port 3011) and `01b-refused-delete-message.png` (pinned copy).

One caveat on my own first pass: I probed `document.querySelector('output')` and got the empty
first toast host, so my initial reading was "no message at all". That was my measurement error,
not the app's. The second `<output>` holds the toast.

Worth flagging separately: the server hands the browser the raw SQLite failure, HTTP 500,
`INTERNAL_SERVER_ERROR`, with a stack trace naming `drizzle-orm/sqlite-core/session.js`:

```
{"error":{"message":"FOREIGN KEY constraint failed","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500,"stack":"Error: FOREIGN KEY constraint failed\n    at run (native)\n    at #run (bun:sqlite:185:20)\n ...","path":"adminProjects.delete"}}}
```

The friendly sentence is produced on the client by recognising that string. It works, and the
acceptance criteria are met, but the mapping rests on an error message SQLite is free to reword,
and the stack trace should not be crossing the wire. A typed `CONFLICT` from the procedure would
hold better.

## 2. Failed list query — PASS

`adminUsers.list` rejected in the page by wrapping `window.fetch` before any app script ran.
`/admin/users`, sampled every 400 ms for 4 s. Every sample reads:

```
Users
People who can sign in.
+ New user
This list could not be loaded. Could not reach the server. Check your connection and try again.
Try again
```

No "Loading...", at any sample. There is a retry control. Screenshot `02-users-list-error.png`.

## 3. Table overflow at 375x812 — PASS

`/admin/users`, viewport 375x812.

```
wrapper: SECTION.thin-scroll.overflow-x-auto…   overflow-x: auto
  clientWidth  341
  scrollWidth  442
table   clientWidth 442   scrollWidth 442
document scrollWidth 375   clientWidth 375
```

It scrolls: setting `scrollLeft = 999` settles at `101`, exactly `442 - 341`. The document itself
does not overflow, so the page does not shear sideways. The wrapper carries `tabindex="0"` and
`aria-label="Users"`, so a keyboard user can reach the scroll region and hears what it is.
Screenshot `03-users-375-overflow.png`.

## 4. Search — PASS

`/admin/pages`, search box labelled "Search pages", placeholder "Search by title or URL…".

Rows before typing: **40**.
After typing `International`: **1** — `International Days /international-days — Published`.

The count is also stated on screen once filtered, as "0 of 40" / "1 of 40".
Screenshot `04-pages-search-filtered.png`.

## 5. Empty state — PASS

Two kinds, both named.

A list with genuinely zero rows, `/admin/campaigns` (the `campaigns` table is empty):

```
Campaigns
Fundraising campaigns shown on /donate — 0 total.
+ New campaign
No campaigns yet
A campaign is a fundraising goal with its own page on /donate and its own donation record.
+ New campaign
```

A list filtered to zero, `/admin/pages` searching `zzzqqqnothing`:

```
0 of 40
No pages match that search
Nothing here contains “zzzqqqnothing”.
Clear search
```

Screenshots `05b-campaigns-empty.png` and `05a-pages-empty-filter.png`. The two states are
distinct, which is the point — "no campaigns yet" offers to create one, "no matches" offers to
clear the search.

## 6. Footer save failure — PASS

`adminSettings.set` rejected at `fetch`. Column title changed from `Explore` to `ExploreVERIFYX`,
confirmed present before clicking. Then Save footer.

Button text after the failure: **`Save footer`** — unchanged, and still enabled, so the save can be
retried. It never sticks on "Saving…".

The typed edit survives. Sampled every 300 ms for 3.6 s, the field holds `ExploreVERIFYX` at every
sample, and it is still there after the message clears. Screenshot `06-footer-save-failed.png`
shows the field reading `ExploreVERIFYX` with the untouched form around it.

The failure is announced:

```
Could not reach the server. Check your connection and try again.
```

Rendered in an `<output>` at the bottom right — `<output>` carries an implicit `role=status` and
`aria-live=polite`, so it is announced without a hand-written live region.
Screenshot `06c-footer-save-error-visible.png`, captured with the dismiss timer suppressed.

That timer is the one thing I would push back on: the message clears itself after roughly four
seconds. Measured, it is present at 0 through 4000 ms and gone by 4400 ms. Four seconds is enough
time to look away from a save that failed, and the form gives no other sign afterwards — the
button looks exactly as it did before the click. An error that the reader must be watching for is
one they can miss.

## 7. Accessible names — PASS

Zero bare glyphs on either screen. Visible text on the left, accessible name on the right.

`/admin/nav`, first five row buttons:

```
↑   Move Home up
↓   Move Home down
＋  Add a child item under Home
✎   Edit Home
✕   Delete Home
```

`/admin/footer`, five row buttons:

```
✕   Remove Annual Report
✕   Remove Impact Stories
✕   Remove Research
↑   Move Facebook up
↓   Move Facebook down
```

Of 44 buttons on `/admin/nav` and 25 on `/admin/footer`, none is an unlabelled glyph.

Two soft spots, neither a failure of the check. On `/admin/nav` the group disclosure buttons are
named just `Expand` — four of them, identical, with no item name and no `aria-expanded`, so a
screen reader hears "Expand, button" four times with nothing to tell them apart. On
`/admin/footer` the three logo pickers are all named `+ Logo`, so which social platform each one
belongs to is carried only by position.

## 8. Regression sweep at 1440x900 — FAIL

Five pages, full load each, console read after the page settled.

```
/admin/pages      h1 "Pages"          40 rows    no errors
/admin/posts      h1 "All posts"      26 rows    Hydration failed
/admin/users      h1 "Users"           2 rows    Hydration failed
/admin/settings   h1 "Site Settings"  53 fields  no errors
/admin/media      h1 "Media library"  27 tiles   Hydration failed
```

Nothing crashed and every page rendered its content. But three of the five log:

```
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
As a result this tree will be regenerated on the client.
```

The diff names the sidebar group button in `src/routes/admin.tsx:464`:

```
<button
  type="button"
  onClick={function onClick}
+ aria-expanded={false}
- aria-expanded="true"
  aria-controls="admin-nav-content"
  data-tsd-source="/src/routes/admin.tsx:464:10"
>
- <div id="admin-nav-content" className="space-y-0.5" data-tsd-source="/src/routes/admin.tsx:479:10">
```

The whole group panel is present in one tree and absent in the other, so React throws away the
server markup for that subtree and rebuilds it.

**Cause and a deterministic repro.** The open sidebar group is persisted to
`localStorage["admin-nav-open"]`. The server has no access to it, so it renders the group the
current route belongs to; the client's first render uses the stored one. When they differ, React
reports a mismatch.

```
localStorage.setItem('admin-nav-open', 'Posts')
navigate to /admin/media          → Hydration failed
localStorage.removeItem('admin-nav-open')
navigate to /admin/media          → clean, and "Content" is written back
```

Clearing the key makes `/admin/media` load clean; setting it to a non-matching group makes it fail
again, every time. That is also why `/admin/pages` and `/admin/settings` came up clean in the sweep
— the stored group happened to match what the server rendered for those routes.

So the sweep's premise, that a returning admin sees a clean console, does not hold. Any admin who
opens one nav group and then loads a page in a different group gets this on the next full page
load. The fix is the usual one for persisted UI state under SSR: render the server's value on the
first client pass and adopt the stored value in an effect, so the two trees agree at hydration time.

`admin.tsx` was being edited by another pane during this run, at 12:52 and 12:58. The line numbers
above are from the 12:58 version and the repro was run against it, but re-check after that pane
lands.

## Also seen, outside the eight checks

- `src/routes/$lang.contact.tsx:169` does not parse: `<` opens with no tag name, so the
  tanstack-router code splitter throws `Unexpected token (169:15)` on every request that touches
  it. This is a public route, not an admin one, and it was mid-edit in another pane.
- Cookies ignore the port, so signing in on a second localhost port silently invalidates the first
  session. Only relevant if someone else repeats the two-server trick.

Next: hand the hydration mismatch on the sidebar group state back to whoever owns `admin.tsx`,
and decide whether the four-second auto-dismiss on save errors is acceptable.
