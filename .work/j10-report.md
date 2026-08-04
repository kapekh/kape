# J10 report — Map pin richness (D20)

Claim, not verified state. Verification belongs to the orchestrator.

Ran against a `VACUUM INTO` scratch copy at
`/tmp/claude-1000/-home-userx-workspace-kape/00457a8d-.../scratchpad/j10.db`, with
`DATABASE_PATH` and `SSG_CACHE=off` exported for every command, dev server on port 3010 with
`PORT=3010` (the SSR tRPC client dials `localhost:$PORT`, so a non-default port needs it or every
page 500s).

## What changed

- `src/server/schema.ts` — one new column, `project_locations.photo_media_id` → `media.id`.
  The **project reference already existed** (`project_id`, written by the seed and by the admin
  project form), so the contract's "no link to the project" was stale; only the photo is new.
- `drizzle/0016_wooden_turbo.sql` — one additive `ALTER TABLE`.
- `src/server/repo/projects.ts` — `listProjectLocations` left-joins `projects` and resolves the
  photo. `ProjectPin` gains `projectHref`, `status`, `photoUrl`.
- `src/components/MapView.tsx` — branded divIcon pin (`/logo.png` in a white ring), popup rebuilt
  as a card (photo, Current/Past tag, school name, project name, "View project →"). Every new
  `MapMarker` field is optional, so `SectionRenderer.tsx` and `routes/contact.tsx` compile and
  behave unchanged.

Popup content is built with `document.createElement` + `textContent`, not an HTML string: pin
labels are CMS data. A marker `href` is followed only when it starts with `/`, so a stored
`javascript:` URL renders no link at all. Both checked with a hostile fixture (below).

## Acceptance

1. **`bun run test` 10/10** — `Test Files 4 passed (4), Tests 10 passed (10)`, run after the last
   edit. No test added or removed.
2. **One additive migration, applied clean.** SQL, in full:

   ```sql
   ALTER TABLE `project_locations` ADD `photo_media_id` integer REFERENCES media(id);
   ```

   `bun run db:migrate` against the scratch copy: `migrations applied successfully`. Scratch
   `project_locations` now carries `photo_media_id integer REFERENCES media(id)`.
   `kape.db` queried through a connection afterwards (not hashed): **16 migrations, no
   `photo_media_id`, 2 location rows** — untouched.
3. **Every pin's link resolves — 3 of 3, no 404s.** Fixtures in the scratch DB gave 4 pins; 3 have
   a project, the 4th deliberately has none and so has no link. Fetched each rendered href:

   | href | status | title |
   |---|---|---|
   | `/en/projects/ngs` | 200 | New Generation Schools — KAPE |
   | `/en/projects/hcc` | 200 | Happy Cambodian Children — KAPE |
   | `/en/projects/ibec` | 200 | Improved Basic Education in Cambodia — KAPE |

   `/projects/<slug>` resolves for sub-projects too (`route.ts` treats a single segment as a record
   slug regardless of nesting), so J17's 8 new sub-projects will link without change. Hrefs are
   language-prefixed at render time via `localizedHref`.
4. **A location with no photo and no project renders a working pin.** Scratch fixture "Community
   Learning Centre, Battambang" (`project_id` null, `photo_media_id` null). On the live About page
   it renders as the 4th branded pin and opens
   `<div class="w-56 space-y-1"><div class="font-semibold text-primary leading-snug">Community
   Learning Centre, Battambang</div></div>` — no photo, no tag, no link, no error. The Contact page
   (4 office markers, which never have a photo or a project) behaves the same.
5. **SSR intact.** `GET /who-we-are/about` → 301 → `/en/who-we-are/about` **200, 67KB**. Server
   HTML contains the section heading ("Where we work" / "Our project sites") and the map container
   `h-80 w-full rounded-2xl …`; no error body. `/en/contact` 200. Leaflet still loads only inside
   the effect.
6. **Marker assets self-hosted.** In-page check: all 4 pin images are `/logo.png` (already served
   from `public/`, already loaded by the header, so no extra request); the document contains no
   `marker-icon.png` and nothing from the prototype's Lovable bucket. Leaflet's own default icon is
   no longer referenced at all. The Leaflet **stylesheet** is still the pre-existing unpkg CDN link
   — untouched, out of scope, but worth a follow-up if self-hosting is meant to be total.
7. **`bunx biome check`** on `MapView.tsx`, `schema.ts`, `repo/projects.ts`: `Checked 3 files. No
   fixes applied.` `bunx tsc --noEmit`: 0 errors.

## Could not satisfy

Nothing failed, but two things are only demonstrable in isolation, both because of files I do not
own. See below — the second is a data-loss defect, not just a gap.

## Hand-offs (files I do not own — not touched)

1. **`src/components/sections/SectionRenderer.tsx` — the About map still shows label-only popups.**
   `MapSection` (line ~1342) rebuilds each row as `{lat, lng, label}` and drops everything else, so
   the card never gets a photo, tag or link on the real page. Verified in the browser: the About
   map renders 4 branded pins, popup HTML is the title div alone. One edit inside the existing
   `.map()`:

   ```tsx
   		.map((r) => ({
   			lat: Number(r.lat),
   			lng: Number(r.lng),
   			label: r.label || r.name || r.schoolName || "",
   			sublabel: r.projectName ?? null,
   			photoUrl: r.photoUrl ?? null,
   			href: r.projectHref ?? null,
   			status: r.status ?? null,
   		}))
   ```

   `rows` is `any[]` there, so this adds no type error, and the office source simply has none of
   those keys.

   The card itself is proven end-to-end: `MapView` was mounted in the running page with rich
   markers (real module, real Leaflet) and produced photo + `CURRENT`/`PAST` tag + school + project
   + `View project →` linking to `/en/projects/ngs`; the no-project marker produced a bare card;
   a marker with label `<img src=x onerror=alert(1)>` and `href="javascript:alert(1)"` rendered the
   label escaped as text and **no anchor**. Screenshot: `scratchpad/j10-rich-popup.png`; About page
   as it stands: `scratchpad/j10-about-map2.png`.

2. **The photo is not authorable, and any value set is silently destroyed.**
   `setProjectRelations` (`src/server/repo/admin.ts:1699-1720`) deletes every row in
   `project_locations` for the project and re-inserts from `ProjectInput.locations`, which carries
   only `schoolName/lat/lng`. So a photo set by seed, script or SQL is **wiped the next time an
   admin saves that project** — nothing errors, the pin just loses its picture. Needs
   `photoMediaId` threaded through `ProjectInput`, `adminGetProject`, and the "Map locations" rows
   in `src/components/admin/ProjectForm.tsx:221-240` (an image picker, as the partner logo field
   does). Until then the column is write-only-by-migration and the CMS-managed rule is not met.
   I would treat this as blocking release of the photo half, not a nice-to-have.

## Stop condition — many-to-many

Not taken unilaterally. `project_locations` stays **one location → one project**, which is what the
column already did and what the prototype models. It is genuinely arguable: one school site can host
NGS and HCC at once, and today that needs two rows at identical coordinates (two overlapping pins).
If the client confirms shared sites are real, the fix is a `project_location_projects` join table
and a repo change — a separate job, since it also changes the admin editor.

## Also noted

- No page in `kape.db` has a `map` section at all, so the "About page centrepiece" does not exist
  yet in content. I authored one **only in the scratch copy** (`who-we-are/about`, eyebrow "Where we
  work", `query.source = "locations"`) to have something to test. J16 owns that page's real copy.
- Seeded locations are 2, both `current`, both photo-less. The Past tag and the photo were shown
  with scratch-only fixtures (a third pin on IBEC, a fourth with no project, and
  `photo_media_id` 1/2 on the existing pair). Nothing was written to `kape.db`.
