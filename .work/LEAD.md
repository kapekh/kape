# Lead state

Rewritten in place at every job seam. Never appended. See `~/.claude/skills/paneout/SKILL.md`.

## Goal

**Admin UI/UX round: test every admin surface in a browser, fix what it finds, and make every text
a visitor sees editable by an admin.**

Gate: a browser pass over every `src/routes/admin.*.tsx` surface returns no `high` and no `med`,
and every visitor-visible string is either page content, a record, or a `ui_strings` key reachable
from `/admin/ui-strings`.

Gates now, re-measured in this pane at 16:02 after FIX-F, FIX-G and the dictionary bookkeeping:
**382 tests over 41 files**, `tsc` silent, `bun run lint` 8 errors 0 warnings - the known
`noArrayIndexKey` sites, unchanged all round. Baseline at round start was 313 over 30; it was 370
over 38 before this wave. `bun run build` green, measured here at 13:37.

**The round is committed**, eight commits over `9ff196c` up to `36da871`, split by theme rather
than by job because the jobs overlapped files. Every job's evidence is still its
`.work/<id>-report.md`. Graph after this round: 3955 nodes / 7354 edges.

Prior round - the CMS-core extraction - is closed; its ledger lives in the worklog.

## Ledger

`verdict` is what the lead confirmed in its own pane. A worker's claim is not a verdict.

| id | runner | state | verdict |
|---|---|---|---|
| UI1 admin-audit r1 | pane | verified | 5 high, 10 med, 6 low, each with a repro. `.work/ui-audit/R1.md`. Withdrew two of its own findings on method. Flagged that another pane's HMR disturbed its session |
| UI2 static-review | pane | verified | 20 prioritised findings, `.work/ui-audit/STATIC.md`. Its dead-code claim re-checked here and confirmed |
| T1 string-inventory | pane | verified | 52 files walked, **212 new keys**, 32 interpolated. Corrected the brief's key count from 53 to 41, counted. `.work/i18n/INVENTORY.md` |
| T2 ui-strings-editor | pane | verified | `/admin/ui-strings` exists and edits the dictionary. Stopped one line short of a green suite and gave the exact command; lead applied it |
| S0 i18n-foundation | pane | superseded by S0b | interpolation correct and kept; its dictionary work broke `no-brand.test.ts` |
| S0b dictionary-split | pane | **verified** | 41 keys restored, eight per-slice modules behind the same export, duplicate-key guard **mutation-tested here** - a dup fails the named test, restoring it passes |
| FIX-A admin-shell | pane | **verified, one defect found and closed** | drawer, `aria-current`, forbidden screen. Cross-pane check found the shut drawer kept 43 controls in the tab ring; lead fixed with `inert`, re-verified 43 -> 0 with desktop untouched |
| FIX-B page-editor | pane | **verified** | H1/H3/H5/L19/M11. Lost update and segment guard re-run here over the real API: stale save -> `409 CONFLICT`, bad segments refused server-side |
| FIX-C primitives | pane | **verified, its blocker applied here** | focus return, toast order, dirty baseline, menu arrow keys, `ActionMenu` label prop, `form-ui` required/error/hint |
| VERIFY-h3 | pane | verified | independent pane, 15 pages plus one it created itself, `h1Count` 1 everywhere. `.work/VERIFY-h3.md` |
| VERIFY-shell | pane | verified, then re-verified | 6 of 7 passed and found the inert defect; after the fix, re-measured in the same pane - shut drawer 43 controls reachable -> **0**, first six tab stops now skip it, open restores all 43, Escape returns focus to the toggle, and the 1440 rail is **not** inert with all 43 reachable. `.work/VERIFY-shell.md` |
| FIX-D list-pages | pane | reported, **unverified** | ten list routes plus a new `src/lib/format.ts`. `.work/FIX-D-report.md`. Its cross-verification died before it ran; re-dispatched |
| FIX-E singleton-routes | pane | reported, **unverified** | seven of eight items; L21 needs three lines in two files it does not own. `.work/FIX-E-report.md`. Same cross-verification |
| S1 public-routes | pane | **verified** | `$.tsx`, `$lang.search.tsx`, `login.tsx`, `pages.ts`. 27 of 27 rows wired, 0 skipped, round trip proven both ways. Stopped one line short: three keys it orphaned live in another slice's module. Lead applied the deletion and re-measured green |
| S2 chrome | pane w1:p1B | live, second attempt | first attempt died on an API error 8 minutes in, having read only the contract. Nothing to keep |
| S3 forms-and-contact | pane w1:p19 | live | - |
| VERIFY-lists | pane w1:p1C | **verified, one defect found and closed** | 7 of 8 checks pass with raw output for each. Check 8 failed and it was the lead's own new code, not FIX-D or FIX-E: see below. Copied the tree to `~/workspace/kape-verify` on port 3111 to escape the other panes' HMR |
| FIX-D, FIX-E | - | **verified by VERIFY-lists** | refused delete says what still points at the record; failed list query names itself and offers a retry; the 375 table scrolls at 341/442; search 40 -> 1; two distinct empty states; footer save failure keeps the typed edit and the button re-armed; 0 bare glyphs of 44 + 25 buttons |
| S2 chrome | pane | reported, unverified | 23 of 27 rows wired, 4 skipped, each blocked by another slice's module. 20 keys into `nav.ts`. `.work/S2-report.md` |
| NAV accordion + rail | lead pane | **verified, one defect found and closed** | Rithy's ask. Groups are one-at-a-time; the desktop rail collapses to icons. VERIFY-lists caught the hydration mismatch it shipped with; fixed and re-measured. Below |
| S3 forms-and-contact | pane | reported, **unverified** | 31 of 31 rows, 0 skipped, 28 keys into `forms.ts`. Round trip shown twice, heading and `<title>`, because the meta strings take the loader path and not `useT()`. `.work/S3-report.md` |
| S4 section-templates | pane | reported, **unverified** | 40 rows, 41 wirings, 0 skipped, 34 keys into `sections.ts`. Round trip on `albums.count`, which has a slot, so the interpolation is proven too. `.work/S4-report.md` |
| UAT-A public site | subagent | **verified, one claim re-checked here** | not sign-off ready. 6 high, 15 med, 5 low, 0 leaked keys. Its headline - `/km` serves English - I tested myself rather than take it: wrote a Khmer overlay onto the home hero, `/km` rendered it, `/en` stayed English, removed it again. **The mechanism works; the Khmer was never typed.** So F1 is content, not code |
| UAT-B admin + editability | subagent | **verified, two claims re-checked here** | not sign-off ready. 3 high, 5 med, 4 low, and a census of **91 hardcoded visitor-facing strings**. B1 and B2 both confirmed by reading the code in this pane, below. Its census beat the inventory on `KhmerCalendar` and cleared three components the queue thought were outstanding |

## Live now

- `w1:p18` - dev server, `PORT=3011`, `DATABASE_PATH=.work/scratch/uitest.db`. Not a job.
- **UAT server, `PORT=3020`, `DATABASE_PATH=.work/uat/uat.db`** - a copy of the repo's `kape.db`,
  so UAT runs on KAPE's real 39 pages and 239 `ui_strings` rows rather than the audit fixture.
  Started from this pane, log at `.work/uat/dev.log`. `kape.db` itself is never opened.
- **S5** (donate, 76 rows, seven files) and **S6** (staff portal, 29 rows, five routes), two
  subagents. Disjoint files and disjoint dictionary modules. Both were given the 382/41 floor
  explicitly, so neither can report green against a stale bar.
- FIX-F and FIX-G are both done and verified. S7 is next and still blocked on nothing but a free
  runner - FIX-G has released `$lang.search.tsx`.
- UAT-A and UAT-B have both reported. `.work/uat/uat.db` **restored from `kape.db`** afterwards -
  UAT-B's CRUD pass deleted two projects and, through the B1 defect below, stripped a third's
  translations. 18 projects and 108 project translation rows are back. `kape.db` itself still
  carries its 07:38 checksum, untouched by any of this.
- `w1:p19`, `w1:p1B` and `w1:p1C` are **closed** - S3, S4 and VERIFY-lists had all written their
  reports first, which is the only thing a closed pane leaves behind. Two panes remain: the lead and
  the `:3011` dev server, which is kept for the S5 and S6 builders so they never share an instance
  with a UAT run.

**Two API deaths in one seam.** A pane that dies leaves no report and its `agent_status` still reads
`done`. Read the pane, not the status, before believing a job finished, and check the report file
exists.

## The sidebar, measured at 1440x900 and 375x812

`src/routes/admin.tsx` only. Two localStorage keys, `admin-nav-open` and `admin-nav-rail`; the old
`admin-nav-folded` is gone.

- One group open at a time. Clicking a shut group opens it and shuts the other five; clicking the
  open one shuts everything. Count of `aria-expanded="true"` never above 1.
- Landing inside a shut group opens it: `/admin/settings` with `Site` shut gives `Site` open and
  `Settings` carrying `aria-current="page"`. Survives reload.
- On `/admin` nothing is active, so the first group opens rather than showing six shut headers over
  three links.
- The desktop rail collapses 256px -> 72px, six group headers -> none, all 37 links as icons.
  Accessible names survive as `sr-only` plus a `title`; the active item keeps its accent background
  and 3px inset bar.
- At 375 the rail is never narrowed - 256px, headers back, `inert` when the drawer is shut and not
  when it is open. The collapse toggle is `lg:` only; the phone keeps its `Menu` button.
- Shots in `.work/sidebar-shots/`. `chrome-devtools-axi` writes screenshots nowhere under `.work`
  and reports success anyway; capture to `/tmp` and copy.

**The defect it shipped with, found by VERIFY-lists and closed.** Both pieces of state read
`localStorage` in their `useState` initialiser, so the first client render disagreed with the
server and React threw the whole nav subtree away: `Hydration failed` on any page whose group was
not the stored one. Now both start at the server's value and adopt storage in an effect. Re-run of
the report's own repro - `admin-nav-open` set to `Posts`, then a full load of `/admin/media`,
`/admin/users`, `/admin/posts`, `/admin/pages`, `/admin/settings` - is **0 hydration errors on all
five**, and a planted `console.error` proves the probe would have seen one. The pre-existing
`folded` state had the same bug; it is gone with it.

## Queued

- **S5 donate** - contract written, `.work/jobs/S5-donate.md`. 76 rows over seven files, module
  `donate.ts` (empty stub). The largest slice left and the only one where a wrong edit touches a
  payment flow. Carries the three product-neutrality fixes: KAPE's own donation copy, a Cambodian
  family name as the product's placeholder, and Baray named in the core.
- **S6 staff portal** - contract written, `.work/jobs/S6-staff-portal.md`. 29 rows over the five
  `internalsources.*` routes, module `internal.ts` (empty stub). Mostly table headers; needs a
  signed-in staff session to see at all.
- **S7 leftovers** - contract written from UAT-B's census, `.work/jobs/S7-leftovers.md`. The
  inventory had this slice at almost nothing; the census found **31 strings in `KhmerCalendar.tsx`
  alone**, in the footer of every page, which the inventory missed entirely. The contract points at
  `Intl.DateTimeFormat` before the dictionary - 31 hand-typed month names buy one language, `Intl`
  buys every language a future tenant adds. `PdfReader`, `AnnouncementPopup` and `Lightbox` turned
  out to be **already fully wired**, so three of the five areas the queue listed are done.
- **S7 and FIX-G both want `$lang.search.tsx`.** Sequence them; do not run them together.
- **`forms.yourName` has zero readers as of FIX-G's F2 fix**, so `no-brand.test.ts` and
  `dictionary.test.ts` are red - the guard doing exactly its job. The mock sign-up form was the
  key's only reader and it is gone, correctly. The round's own rule says a key lives with the
  component that renders it, and after FIX-G the only future renderer is `DonateForm.tsx:206`. So
  the key **moves out of `sections.ts` and into `donate.ts`, defined by S5, not reused**. S5's
  contract currently says the opposite and must be corrected before dispatch. Do not delete the key
  as a way of getting the gates green on their own.
- **Two more from FIX-F, found and deliberately not fixed.** `deletePage` is the widest unguarded
  multi-write left - reparent, slug recompute and 301s, no transaction. It cannot be refused, so it
  cannot gut a record the way B1 did, but it can half-apply; priced at about half a day and it needs
  a sync rewrite. `deleteDonor` refuses with a raw constraint error and gives the admin no way to
  find the projects still holding it - same family as the string-matched refusal message already on
  this list, and one error-code sweep should take all of them.
- **From VERIFY-lists, three it raised outside the eight checks.** `/admin/nav`'s four group
  disclosure buttons are all named just `Expand`, with no item name and no `aria-expanded`;
  `/admin/footer`'s three logo pickers are all named `+ Logo`, distinguished only by position; and
  the save-error `<output>` clears itself after ~4s, which is short for a failure whose only other
  trace is a button that looks unclicked.
- **The refused-delete message is string-matched.** The server returns raw `FOREIGN KEY constraint
  failed` as a 500 with a drizzle stack trace on the wire; the friendly sentence is recognised
  client-side. Works, but it rests on wording SQLite may change. Same family as the segment-refusal
  500s - one error-code sweep should take both.
- **M06b** - `/admin/posts?type=news` announces three `aria-current="page"`. FIX-A tried two fixes
  and reverted both with evidence; needs the link layer to take an explicit active state, or those
  items to stop being search-param variants of one route.
- **M08 / L20** - inserted images ship with no `alt` and the media picker offers no way to supply
  one; picker items are announced as `#136 · image/png`. Needs `RichTextEditor.tsx` +
  `MediaLibraryDialog.tsx`.
- **STATIC 11** copy drift, **STATIC 14** collapse the nine list pages, **STATIC 13** delete the
  dead `src/components/ui/*`. All after the current round.
- **L16 is unverified, not failed.** Arrow keys in the row menu cannot be exercised: every row menu
  in the app currently has exactly one item.

## Decided

- **Editable text: public site only, dashboard editor.** Rithy's call. Admin's own labels stay
  hardcoded; inline click-to-edit priced and declined for now.
- **Keys land with the component that renders them.** `no-brand.test.ts` refuses a seeded string
  nothing reads, and it is right to. That killed the plan to land all 212 keys up front, and forced
  the per-slice module split.
- **Test against a scratch DB.** `.work/scratch/uitest.db`; the audit creates, corrupts and deletes
  records. UI1 checksummed the repo's `kape.db` before and after - unchanged.
- **Testing, fixing and verifying are three different panes.** A pane never verifies its own work.
  That is what caught the `inert` defect.
- **Segment refusals return 500, not 400**, matching the duplicate-slug guard beside them. FIX-B's
  call, documented; the whole error-code family is worth one sweep later.
- **The three `search.*` fragments are gone.** S1 replaced the assembled search sentence with
  slot-taking keys, orphaning `search.none`, `search.results` and `search.showingFirst`. Deleted here
  from `site.ts` and from the KAPE seed fixture; `search.none`'s Khmer moved into `search.noneFor`,
  the only one of the three that had any.
- **Herdr's `pane read`, `send-keys` and `agent start` are intermittently refused** by this
  session's classifier. Read a worker through its report file, not its pane. `Bash(herdr:*)` on the
  allowlist would remove the friction.
- **`agent prompt` leaves text unsubmitted.** Every dispatch this round needed a second prompt to
  send it. Always check `agent_status` moved to `working`.

## The launch this round is now aiming at

Rithy's call, both parts. **KAPE gets a UAT instance on the LAN**, not a tunnel and not a public
deploy - bound to `0.0.0.0` on this machine at `192.168.100.232`. And **the launch holds for S5 and
S6**: KAPE should meet the site with every front-facing string already editable, which is the
round's acceptance criterion, not with donate and the staff portal carrying 105 strings they cannot
touch.

The LAN gotcha, worth having in hand before the day: `bun run start` is `vite preview`, which 403s
every request with `Blocked request` unless the Host header is in `ALLOWED_HOSTS`. On a LAN the
host is the bare IP, so the launch command needs `ALLOWED_HOSTS=192.168.100.232,localhost` and an
`AUTH_SECRET`. Unset, KAPE sees a blank refusal with nothing explaining it.

| FIX-F data integrity | subagent | **verified here, independently** | all three closed. I re-ran B1 against my own `VACUUM INTO` copy, not its fixture: refused with `FOREIGN KEY constraint failed`, and 6 translations / 2 donors / 1 location / 1 project row all still there, identical counts before and after. Then **mutation-tested its check** - stripping the transaction back out of `deleteProject` turns one of the five red, restoring it turns it green, so `delete-integrity.test.ts` is load-bearing and not decoration |

| FIX-G public dead ends | subagent | **verified here** | all six closed. F2 re-checked independently: the three dead pages now render **1 input and 1 submit**, which is exactly the footer-newsletter baseline measured on `/en/news` and `/en/team`, so the section renders nothing at all. Scholarship keeps its 5 inputs because it is `layout: contact` and was always posting for real |
| dictionary bookkeeping | lead pane | **closed here** | FIX-G's fixes orphaned one key and introduced three call sites with no definition. `forms.yourName` deleted from `sections.ts`, `pdf.failed` added to `site.ts`, `publications.open` and `videos.watch` to `pages.ts` - each beside the keys its own renderer already uses. Suite back to green |

| S6 staff portal | subagent | **verified here** | 29 of 29 rows, 27 wired and 2 glyphs skipped, 25 keys into `internal.ts`. Checked here: 25 keys present, `duplicateUiStringKeys()` empty, dictionary at 249 keys, 23 `internal.*` call sites, and **zero leftover literals** in the five routes. English only, no invented Khmer |

| S5 donate | subagent | reported, spot-checked here | 76 rows, 0 skipped, 70 keys into `donate.ts`. All three neutrality fixes landed: KAPE's donation line moved out of the core into the seed, the placeholder is no longer a Cambodian family name, and `Secured by {provider}` takes a slot. It **handed back a payment bug rather than fixing it outside its brief**, which was the right call - see below |
| donate amount input | lead pane | **fixed and mutation-tested here** | S5's handback was real and its suggested one-liner was wrong. Below |

| FIX-H repo boundary | subagent | **verified here** | both closed. H1 mutation-tested in this pane: putting the 24-cap back turns its check red with `expected […(24)] to have a length of 30`, restoring it green. Callers check out - `sections.ts` still passes its own limit because a section renders a page, the tRPC route passes none because a detail page needs the row it is on |

## The donate form rejected every round amount

S5 found it and correctly refused to fix payment logic outside its brief. Confirmed here: the custom
amount input shipped `min={0.03}` with `step="1"`, and a number input only accepts `min + n*step`.
So the valid USD amounts were 0.03, 1.03, 2.03 - **every whole dollar failed `stepMismatch`** and the
form would not submit. KHR was the same shape at `min={100} step={1000}`.

S5's suggested fix, `step={cur === "USD" ? "0.01" : "1000"}`, fixes USD and **leaves KHR broken**:
100 + n*1000 still rejects 5000៛. Modelled both currencies here before writing anything.

Fixed as `STEP = { USD: 0.01, KHR: 100 }` beside `MIN`, with the one comment the code cannot carry.
`src/components/donate/donate-amount.test.ts` asserts round amounts in both currencies satisfy
`min + n*step`; putting the old values back turns two of the four red, on USD 1 and KHR 4000.

Worth naming: **no UAT pass could have caught this**, because the fixture has zero campaigns and the
donate form never rendered. It surfaced only because a slice was reading the file line by line.

## Nobody knows the staff password, and that was my error

S6 reported it could not sign in as `staff@kapekh.org` with the password my dispatch brief gave it,
and did its round trip as admin instead through the identical role guard. The brief was wrong, not
the worker: verified here against `kape.db` with `Bun.password.verify`, `admin@kapekh.org` accepts
`kape-admin-2026` and **`staff@kapekh.org` rejects it**. Both hashes are identical in `kape.db` and
the UAT copy, so nothing drifted - the staff password was simply set at seeding and never recorded.

UAT-A claims it reached the portal as staff, which means it set a password through the admin during
its run. Nothing on disk carries one now.

Reset it from `/admin/users` before the LAN stand-up, or the entire `/internalsources` section is
untestable by the KAPE team. On the checklist as item 7.

## The two defects worth reading the code for

Both confirmed here, not taken on a worker's word.

**A refused delete destroys the record first.** `deleteProject`, `admin.ts:2182`, runs four
statements with no transaction: translations, donors, locations, then the project. When the last one
trips a foreign key - a school still points at it - the first three have already committed. The
delete is correctly refused and the record is already gutted, still sitting in the list looking
intact. Real fixture project HCC lost all 23 of its translation rows this way. `deleteLanguage` has
the same shape. `deleteMedia` at `admin.ts:1471` already does it right, inside `db.transaction`, so
the pattern to copy was in the same file the whole time.

**A user who has ever signed in can never be deleted.** `deleteUser`, `users.ts:144`, revokes
sessions with an `update` and then deletes the user, tripping the `sessions.user_id` FK. A user who
never signed in deletes fine, which is exactly what isolates it.

## The content half, which no amount of our work closes

`.work/UAT-CONTENT-CHECKLIST.md`, written for the KAPE team rather than for us. 59 sections with no
Khmer, 0 campaigns, 26 documents saved with no file, 4 publication PDFs 404ing on the legacy site,
3 videos pointing at a channel front page, 3 leadership rows showing a job title where the name goes,
an empty org chart, and `header_search_link` set to a machine file so the working search page has no
link anywhere on the site.

S5, S6 and S7 make donate, the staff portal and the calendar **editable**. They do not fill any of
the above in. Worth saying out loud at the launch, because "every string is editable" and "the site
reads well in Khmer" are different finish lines and only the first one is ours.

| S7 leftovers | subagent | **verified here** | 11 rows, 10 keys, 2 orphans deleted, dictionary 249 -> 257. **30 of 31 calendar keys avoided.** Three handbacks, two of them closed in this pane below |
| S7's handbacks | lead pane | **closed here** | `DialogHost` moved inside `LanguageProvider`, and the two dead keys deleted from the KAPE seed fixture. Gates re-measured green after |

## The calendar finding is the one to remember

S7 was told to try `Intl.DateTimeFormat` before adding 31 hand-typed month names, and it did - then
found **Chrome ships no `km` locale data at all**. `Intl.supportedLocalesOf(["km"])` returns `[]` in
Chrome, Chromium and Brave, so `Intl` formats Khmer months in English. Bun's JSC *does* have `km`,
which means a test suite would have passed while every real visitor saw English.

It checked in the browser instead of trusting the runtime, which is the only reason this was caught.
Landing shape: `EN_MONTHS` deleted for `Intl([lang, "en"])`, Khmer months and weekdays stay as
component data, and the whole Khmer headline is one interpolated key, `calendar.buddhistDate`,
carrying ខែ, ឆ្នាំ and ព.ស. together. 30 keys avoided, 1 added.

**`DialogHost` was mounted outside `LanguageProvider`** - `RootDocument` is the shell, the provider
lives in the `{children}` it renders, so `useT()` hit the null context and all four dialog labels
resolved to their English fallback for ever. S7 proved it with an override that never reached the
screen. Moved inside the provider here; nothing in the error or 404 shells opens a dialog, so they
lose nothing.

## The UAT instance, as handed over

Production build, not the dev server. `http://192.168.1.17:3020`, also reachable on the tailscale
address. `DATABASE_PATH=.work/uat/uat.db`, copied fresh from `kape.db` after every job had finished
writing to its own scratch copy.

- `admin@kapekh.org` / `kape-admin-2026`
- `staff@kapekh.org` / `kape-staff-2026` - **set by me**, because the seeded one was lost. Verified
  both with `Bun.password.verify` before starting the server.
- `ALLOWED_HOSTS=192.168.1.17,100.86.58.128,localhost`. The allowlist is doing real work: an
  unlisted Host still gets `Blocked request. This host ("evil.example") is not allowed.`
- Checked over the LAN address, not just localhost: 9 public routes 200, `/admin` 307 to login,
  a nonexistent URL 404, devtools absent from the production bundle, and the volunteer page back to
  the 1-input footer baseline, so F2 holds in the built output and not only in dev.

**My earlier LAN address was wrong.** I read `192.168.100.232` off `ip addr` and it is `192.168.1.17`
on `wlan0`. Vite printing its own network address is what caught it - check the server's output
rather than the interface list.

## Next action

**Every job in this round is done, verified and green. The round is not committed** - roughly 125
files in the working tree, and `HEAD` is still `9ff196c`. That is the one thing standing between
this state and a safe one, and it is Rithy's call to make, not a worker's.

After the commit, KAPE's UAT is a content job. `.work/UAT-CONTENT-CHECKLIST.md` is the handout;
nothing on it needs a developer.

Held for the next round, all sized in this file: `deletePage`'s transaction, `ResolvedPost` gaining
`fileUrl`/`youtubeUrl` so `$.tsx` drops two list queries, the error-code sweep that takes the
string-matched refusal message and the segment 500s together, `M06b`, `M08`/`L20`, and the router
half of data-driven languages.

`~/workspace/kape-verify` is VERIFY-lists' snapshot copy, server stopped - delete it. `.work/uat/`
stays until KAPE signs off.

`~/workspace/kape-verify` is VERIFY-lists' snapshot copy, server stopped. Delete it when the round
closes. `.work/uat/` is disposable too, but not until KAPE has signed off.
