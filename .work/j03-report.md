# J03 — Renderer visual fidelity

J03 complete. All eight deltas are built and verified.

## Acceptance

1. **PASS** — `bun run test`: 3/3 passed, 2 files. Gate `bunx tsc --noEmit`: **0 errors**.
2. **PASS** — every touched section screenshotted against seeded data on `/en/j03-preview` (page id 35, left in place per your call): D06 `p1.png`, D13 `p2.png`, D14 `p3.png`, D17 `p4.png`, D16 `p4/p5.png`, D04 covers `p6.png`, D04 counts `p7.png`, D01 `p8.png`, D15 `p8/p9.png`. All in the scratchpad. No branch shipped unrendered.
3. **PASS** — `team-initials.png`: all four seeded people have `photo_media_id = null` and render initials (MH/ED/NP/MM). `p8.png` shows both branches at once — Mr. Heang Koy with a photo, the other three on initials.
4. **PASS** — `pubs-nocover3.png` and `p6.png`: publications with `cover_media_id = null` fall back to the doc icon; "KAPE Annual Report 2025" (cover set) renders its cover beside them.
5. **PASS** — 21 registry keys, 21 defs, bijection verified both directions (`comm` empty each way). New pairs: `projectList` (registry `SectionRenderer.tsx:1575` / def `sections.ts:479`), `certificates` (`1664` / `329`), `siteMap` (`1747` / `360`).
6. **PASS** — table below.
7. **PASS** — 22 errors on my four files, all `noExplicitAny`, all in pre-existing code; I added zero. Two new **warnings**: `noArrayIndexKey` in `Certificates` (1680, 1717), matching the file's existing idiom for authored repeaters (14 pre-existing instances). J12 owns those.

| delta | field / branch added | renderer line that reads it |
|---|---|---|
| D01 | `person.photoUrl`, 5-col grid | `SectionRenderer.tsx:1312`, `:1304` |
| D04 | publication `image` cover, `downloadCount`, download tracking | `:1247`, `:1235`, `:1244` |
| D06 | stats item `icon` (band + plain) | `:539` (via `StatItem`), `:599` |
| D13 | `postList` `table` layout, `location`, `deadline` | `:992`, `:1016`, `:1019` |
| D14 | `projectList` def + `ProjectRow` fields `name`/`summary`/`status`/`image`/`code` | `:1575`, `:1639`, `:1644` |
| D15 | `siteMap` def, nav `label`/`description`/`href`/`children` | `:1747`, `:1749`, `:1764`, `:1805` |
| D16 | `certificates` def, item `image`/`title`/`issuer`/`year`/`fileUrl` | `:1684`, `:1702`, `:1707` |
| D17 | `partners` `marquee` layout, `logoUrl` | `:1482`, `:1449`, `:1418` |
| D27 | `split.statValue`/`statLabel`, `stats.image`, `videoGrid.moreHref` | `:763`, `:769`, `:629`, `:1129` |

## Decisions you should know about

- **D13 type column: dropped.** `listJobs` (`content.ts:284-316`) has no employment-type field and `content.ts` is not mine. Table is Position / Location / Deadline. The Apply cell renders only when `linkBase` is set; `POST_LINK_BASE` has no `job` entry, so it is currently empty — a one-line repo fix for whoever owns `content.ts`.
- **D14 repo query: `listProjectCards` in `src/server/repo/projects.ts`**, wired at `src/server/repo/sections.ts:58` plus a `linkBase = "/projects"` line. `listProjectOptions` is untouched — the trpc admin picker still uses it. Those two files are outside my four; flagging since the contract asked me to name them.
- **D15 needed no server change.** The nav tree is already in the root loader, so `SiteMap` reads it via `useLoaderData({ from: "__root__" })`. No new QuerySource, no second repo query — the stop condition was not tripped.
- **`PublicationGrid.tsx` deleted** after moving `trackDownload` + download counts into `PublicationList`.
- **`styles.css` untouched.** The existing `marquee` keyframe was sufficient; the track holds the list twice and the duplicate copy is `aria-hidden` and unlinked, so it adds no duplicate tab stops. `motion-reduce` disables it.

## One repo inconsistency, not fixed

`publications` resolves to two different shapes: with a category → `listPublications` (has `downloadCount`, **no cover**); without → `listPosts` (has `image`, **no `fileUrl`/`downloadCount`**). So a category-filtered publication page can never show covers, whatever the renderer does. Both branches render correctly (screenshots `p6`/`p7`), but that is a `content.ts` fix, not mine.

Dev server is still running on port 3000 with the preview page at `/en/j03-preview`. I did not touch git or the shared worklog — the sibling agent is still active.

Next: orchestrator reviews `SectionRenderer.tsx`, `sections.ts`, `repo/projects.ts`, `repo/sections.ts` and the `PublicationGrid.tsx` deletion, then commits; `content.ts` owner picks up the job `type` column, the `job` link base, and the publications shape split.

---

## Appendix A — files changed

Owned by J03 and edited:

- `src/components/sections/SectionRenderer.tsx`
- `src/lib/sections.ts` (inherited from J01)
- `src/components/PublicationGrid.tsx` — **deleted**

Outside the four, named here because D14 required them (contract item: "a projects repo query, if D14 needs one — name the file in your report before you add it"):

- `src/server/repo/projects.ts` — added `ProjectCard` type + `listProjectCards(db, lang, status?, limit?)`. Nothing removed; `listProjectOptions` left intact for the trpc admin picker (`router.ts:360`).
- `src/server/repo/sections.ts` — three lines: import swap, `case "projects"` now calls `listProjectCards(db, lang, q.category, q.limit)`, and `props.linkBase = "/projects"` for the projects source.

Not touched, as required: `src/styles.css`, `src/routes/$.tsx`, `src/server/schema.ts`, `src/server/repo/route.ts`, `src/lib/collections.ts`, `drizzle/`, `feedback/`.

## Appendix B — PublicationGrid.tsx fate

**Deleted**, with your explicit approval (my first `rm` was blocked by the permission classifier and I stopped to ask rather than work around it).

Rationale: the file had zero importers (`grep -rn "PublicationGrid" src` returned only its own definition). Its one behaviour not already present in `PublicationList` was the `trpcClient.posts.trackDownload` fire-and-forget counter and the "N downloads" line. Both were moved into `PublicationList` in `SectionRenderer.tsx`:

- `trpcClient` import — `SectionRenderer.tsx:1`
- optimistic counter state + `track(id)` — `:1218-1222`
- rendered count — `:1235`, `:1244`

`bunx tsc --noEmit` reports 0 errors after the deletion, confirming nothing referenced the exported `Publication` type either.

## Appendix C — preview page and every seeded row

Written by `setup.ts` (see Appendix D). The database is `kape.db` at the repo root, gitignored at `.gitignore:16` (`*.db`). Per your instruction the seed was **left in place**, not reverted.

**Page**

| table | row |
|---|---|
| `pages` | INSERT — `tenant_id=1`, `slug='j03-preview'`, `parent_id=NULL`, `segment='j03-preview'`, `sort_order=900`, `status='published'`, `sections=<JSON below>` → assigned **id 35** |
| `translations` | INSERT — `tenant_id=1`, `entity_type='page'`, `entity_id=35`, `field='title'`, `lang='en'`, `value='J03 preview'` |

**Existing rows mutated** (to exercise the photo and cover branches, which no seed data covered)

| table | row | before | after |
|---|---|---|---|
| `people` | `id=1` (Mr. Heang Koy) `photo_media_id` | `NULL` | `7` |
| `posts` | `id=6` (annual-report-2025) `cover_media_id` | `NULL` | `4` |
| `posts` | `id=6` `meta.downloadCount` | `0` | `128` |

Media ids 4 and 7 are pre-existing seed rows (`https://picsum.photos/seed/kape-facts/640/400` and `.../kape-leaders/640/400`). No media rows were created.

**Sections placed on page 35** (nine, in order)

| id | type | layout | query | proves |
|---|---|---|---|---|
| `s-stats` | `stats` | `band` | — | D06; 3 items with `icon`, 1 without (fallback) |
| `s-jobs` | `postList` | `table` | `posts` / `job` | D13 |
| `s-projects` | `projectList` | `grid-3` | `projects`, `category='current'`, `limit=6` | D14 |
| `s-partners` | `partners` | `marquee` | `partners` | D17 |
| `s-certs` | `certificates` | `cols-3` | — | D16; 2 with image+PDF, 1 with neither |
| `s-pubs-cover` | `publicationList` | `grid-2` | `publications` (no category) | D04 covers |
| `s-pubs-count` | `publicationList` | `list` | `publications`, `category='annual-report'` | D04 download counts |
| `s-people` | `people` | `grid` | `people` | D01 photo + initials |
| `s-sitemap` | `siteMap` | `columns` | — | D15 |

Certificate and stat-icon images are `https://picsum.photos/seed/...` URLs authored into `props`; no media rows were inserted for them.

## Appendix D — scripts and screenshots

- Seed script: `/tmp/claude-1000/-home-userx-workspace-kape/6b1f86dc-d827-4345-ac8b-6783821b50c5/scratchpad/setup.ts`
- **Revert:** `bun /tmp/claude-1000/-home-userx-workspace-kape/6b1f86dc-d827-4345-ac8b-6783821b50c5/scratchpad/setup.ts revert` — deletes page `j03-preview` and its title translation, resets `people.id=1` `photo_media_id` to `NULL`, resets `posts.id in (6,7)` `cover_media_id` to `NULL`, resets `posts.id=6` `meta.downloadCount` to `0`.
- DB inspection helper: `.../scratchpad/inspect.ts`
- Screenshots: `.../scratchpad/` — `team-initials.png`, `pubs-nocover.png`, `pubs-nocover2.png`, `pubs-nocover3.png`, `p1.png` … `p9.png`
- Verification output: `.../scratchpad/tsc3.txt`, `lint3.txt`, `dev.log`

Both scratchpad session directories are in play: the scripts and screenshots live under session `6b1f86dc-…`, this report under `cbcaa089-…`.

## Appendix E — everything I declined

1. **The job `type` column (D13).** The contract offered "drop the column, or extend the query". Dropped. Extending means editing `src/server/repo/content.ts`, which I do not own and which would trip the "repo query beyond the one D14 calls for" stop condition.
2. **A `job` entry in `POST_LINK_BASE`.** The job table's Apply cell is conditional on `linkBase` and therefore renders empty today. Adding the entry means guessing the careers detail route and editing `repo/sections.ts` beyond D14's wiring. Reported instead.
3. **The publications shape split.** Not fixed — `content.ts` is not mine. Detailed above.
4. **Existing `noExplicitAny` errors.** 22 of them across the file; contract says J12 owns them and explicitly says not to fix them. I added none.
5. **Two new `noArrayIndexKey` warnings** in `Certificates`. Authored repeater items carry no stable id, and the file already keys `stats`, `resources`, `pills`, `cards` and `slides` by index (14 instances). Kept for consistency rather than manufacturing a synthetic key. They are warnings, not errors, so criterion 7 still passes.
6. **`src/styles.css`.** Out of scope and J06 has finished with it. The existing `marquee` keyframe proved sufficient, so there was nothing to report as insufficient.
7. **Admin preview screenshot.** `PagePreview.tsx` also mounts `SectionRenderer`; it sits under the same root route, so `useLoaderData({ from: "__root__" })` resolves there too. Not separately screenshotted — no acceptance criterion asked for it.
8. **git and the shared worklog.** Untouched, per the constraints and because the sibling agent is still active in `schema.ts` / `repo/route.ts` / `collections.ts` / `drizzle/`.
