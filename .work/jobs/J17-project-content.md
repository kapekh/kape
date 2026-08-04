# J17 — Real project content, and the missing sub-projects

J15 (`bf3da1b`) and J09 (`4566c2b`) have both landed, so start now. `projects` already carries
`start_date`, `end_date`, `target_areas` and `snapshots` — transfer into that shape, it is settled.

Read `.work/BACKLOG.md`'s **Rules** section first — in particular: export `DATABASE_PATH` to a
`VACUUM INTO` scratch copy for any dev server, export `SSG_CACHE=off` or `render_cache` will replay
stale HTML at you, do not touch git, and do not touch the shared worklog.

## Why

Our 18 project records carry **generated filler**, not the client's copy. `ngs`'s body reads
"New Generation Schools overview and outcomes." Theirs has province, partner school, timeline,
donors and real prose across a dedicated route each. And 8 sub-projects do not exist at all.

J02 shipped `projects.parentId`, so the nested records the client's menu implies are now
expressible for the first time.

## Files you own

- `src/server/seed/projects.ts` (post-J15)
- `.work/km-review-j17.md` (yours alone; J16 and J18 write their own, the orchestrator merges)

## Do

1. **Replace the 18 placeholder bodies** with the client's real copy, one source route each:
   `feedback/src/routes/current-projects.<slug>.tsx` and `past-projects.<slug>.tsx`. Their
   `src/data/projects.ts` carries province, partner school and coordinates;
   `src/data/projectMeta.ts` carries donor and timeline.
2. **Add the 8 missing sub-projects** with `parentId` set to their parent:
   `dep/{air,camscam,ideal,midl,dvitsa}` and `iep/{ctsp,dwd,lotus-outreach}`. Source routes exist
   for each. Verify each resolves at `/projects/<parent>/<child>` — that path only works because
   of J02, so it is worth actually hitting.
3. Name mismatches: ours says "New Generation Schools", theirs "New Generation School". **Theirs
   wins** — it is their organisation.
4. **Khmer**: machine-translate, and append every generated string to `.work/km-review-j17.md` as
   `entity | field | en | km`. Nothing generated is final copy.

## Acceptance

### CMS acceptance - non-negotiable

The product exists so admins compose the site themselves. Content that renders but cannot be
edited in `/admin` is not transferred, it is hardcoded in a new place.

- **A.** Every prop you seed is declared as a field in `SECTION_DEFS`. `SectionsBuilder` only draws
  a control for declared keys, and silently preserves the rest, so an undeclared prop is invisible
  and permanently uneditable while looking perfect publicly. Run `bun scripts/check-authorable.ts`
  and paste its output; it must report zero undeclared props.
- **B.** Open at least three of your pages in `/admin/pages`, change a real string in the builder,
  save, and show the change on the public URL. Screenshot the builder and the result.
- **C.** No section on your pages renders as `UnknownSection` in the builder or the preview.
- **D.** If a piece of copy cannot be expressed with a declared field, say so and leave it out.
  Do **not** smuggle it in as an undeclared prop.

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 10 of 10.

1. All 26 project pages render real content — 18 updated, 8 new. List every slug with its URL and
   its resolved title. A project still carrying filler is a fail.
2. Each of the 8 sub-projects resolves at `/projects/<parent>/<child>` **and** the client's own
   `/current-projects/<parent>/<child>` reaches it. Paste both for at least three of them.
3. `/projects/<wrong-parent>/<child>` still returns not-found. J02 built that guard; show it
   survives.
4. English copy matches the source routes verbatim. Diff the strings for any two projects.
5. `.work/km-review-j17.md` row count matches the number of Khmer fields you generated.
6. `bun run db:seed` on a fresh empty database produces all 26. The seed is the source of truth.
7. Compare three of your pages against the live client site at
   `https://kapecambodia.lovable.app/current-projects/...` and report any content you could not
   express.
8. `bunx biome check` on your files: no new errors.

## Out of scope

Images — placeholders until J19 lands. The map (J10). Project schema columns (J09). Admin UI.

## Stop conditions

- A project needs a field the schema does not have after J09: report it rather than folding the
  content into prose. `schema.ts` is J10's right now.
