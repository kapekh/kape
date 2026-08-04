# J17 — Real project content, and the missing sub-projects

**Starts after J15 and J09.** J09 is adding project metadata columns; land those first or you will
transfer content into a shape that is about to change.

## Why

Our 18 project records carry **generated filler**, not the client's copy. `ngs`'s body reads
"New Generation Schools overview and outcomes." Theirs has province, partner school, timeline,
donors and real prose across a dedicated route each. And 8 sub-projects do not exist at all.

J02 shipped `projects.parentId`, so the nested records the client's menu implies are now
expressible for the first time.

## Files you own

- `src/server/seed/projects.ts` (post-J15)
- `.work/km-review.md` (append only)

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
4. **Khmer**: machine-translate, and append every generated string to `.work/km-review.md` as
   `entity | field | en | km`. Nothing generated is final copy.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 3 of 3.

1. All 26 project pages render real content — 18 updated, 8 new. List every slug with its URL and
   its resolved title. A project still carrying filler is a fail.
2. Each of the 8 sub-projects resolves at `/projects/<parent>/<child>` **and** the client's own
   `/current-projects/<parent>/<child>` reaches it. Paste both for at least three of them.
3. `/projects/<wrong-parent>/<child>` still returns not-found. J02 built that guard; show it
   survives.
4. English copy matches the source routes verbatim. Diff the strings for any two projects.
5. `.work/km-review.md` row count matches the number of Khmer fields you generated.
6. `bun run db:seed` on a fresh empty database produces all 26. The seed is the source of truth.
7. Compare three of your pages against the live client site at
   `https://kapecambodia.lovable.app/current-projects/...` and report any content you could not
   express.
8. `bunx biome check` on your files: no new errors.

## Out of scope

Images — placeholders until J19 lands. The map (J10). Project schema columns (J09). Admin UI.

## Stop conditions

- J09 has not landed: do not start, the project shape is in flight.
- A project needs a field the schema does not have after J09: report it rather than folding the
  content into prose.
