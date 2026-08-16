# Open work, audited against the tree on 2026-08-16

Every row below was checked in the tree at `cbfab12`, not read out of a report. The source column
says which round left it open.

Baseline measured here: `bun run test` **496 / 54 files**, `bunx tsc --noEmit` **exit 0**,
`bunx biome lint src/` **6 errors** (all `noArrayIndexKey`, carried since the redesign round).

## Done

Gates after all six, run here: `bun run test` **506 / 55 files**, `tsc` exit 0,
`bun run lint` **6 errors over 313 files**, `bun run build` green.

Browser evidence came from `:3081` on `.work/audit/audit.db`, a `VACUUM INTO` copy.
`kape.db` was read once, for the copy, and never written to.

| # | item | commit | how it was proved | source |
|---|---|---|---|---|
| 1 | Lint gate counted built output. `**/index.html` and `**/src/**/*` matched `dist/`, so `bun run lint` read 48,880 on a built tree and 6 on a clean one | `e7110bc` | `bun run lint` now checks 313 files and reports 6 | new |
| 2 | `pageBuilder` step 2 spotlighted nothing. The picker took the first selector that **existed**, and `#page-segment` exists at zero size inside a collapsed group, so naming an alternative behind it would have changed nothing | `d71ffe2` | On the real page builder: `#page-segment` measures 0 high, `[data-tour=page-settings]` sits at top 388 / height 49, and the ring lands at 382 / 61, which is that box plus `PAD`. Guarded by a case that stubs both rects | redesign J09 |
| 3 | A reset UI string dropped out of the public dictionary, so a Khmer reader got the call site's English and `t("nav.contact")` got the bare key | `5b2fdc6` | Every `nav.contact` row deleted, `/km/contact` still renders ទំនាក់ទំនង once and no bare key. Two repo cases cover the reset and a language with no rows of its own | redesign J13 |
| 4 | Sign-in sent every non-admin to `/internalsources`, which admits staff and admin only and bounces back to `/login` silently. The seeded `editor` role holds pages, posts, projects and media and could reach none of them | `d20de5d` | `editor@test.example` signs in and lands on `/admin` with Dashboard, Pages, Projects and Media in the sidebar and nothing else | redesign J08 |
| 5 | `deleteTerm` was a bare delete, so a term went and left the rows holding its key dangling | `43dcf6f` | Deleting Kampong Cham on `/admin/locations` now raises `"Kampong Cham" is still used by 1 office and 2 schools.` on screen and the term stays in the table. Four repo cases including the term nothing points at | redesign J04 |
| 6 | Media had no Video tab and no video count | `ba938e8` | Videos lists the one `video/mp4` row on its own; Files still lists it beside the PDF, so that tab's meaning did not move; the header reads `123 items · 121 images · 1 video · 1 file` | redesign J10 |

## Rithy's, not mine

Named with what it would cost, so the decision is one line rather than a re-audit.

- **The operator's filename on a media item.** `media` has no filename column, so an upload is
  announced as its UUID. Needs a column, a migration and an endpoint change, and belongs with alt
  text.
- **Roles, users and forms have no navigation guard.** All three `navigate()` to the list on save, so
  arming the blocker without a baseline reset would stop their own post-save navigation. One
  decision: should they stay put after saving, the way donors and posts do?
- **J02's `toggleRail` deviation** at `admin.tsx:354-374`. Collapsing the rail on arrival at the page
  builder is a new side effect. Keep, or revert to the plain toggle.
- **One stray row in `kape.db`.** `render_cache` key `v3::en::home`, written by a verification server
  pointed at the client's database. Nothing serves it; the deployed server reads `v2`. Clears with
  `sqlite3 kape.db "delete from render_cache where key='v3::en::home'; pragma wal_checkpoint(TRUNCATE);"`
- **A post's body is not inline-editable.** The public payload carries rendered HTML, not the source,
  so there is nothing an editor could save back.
- **`LANGS` is hardcoded** at `lib/i18n-config.ts:3`. A client who wants a third language needs a code
  change.
- **38 commits on `main` are unpushed**, and the deploy the inline round ended on has not run:
  `bun run build && PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale`
