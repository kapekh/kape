# J18 — Transfer the structured records

J15 has landed, so start now. Read `.work/BACKLOG.md`'s **Rules** section first — in particular:
export `DATABASE_PATH` to a `VACUUM INTO` scratch copy for any dev server, export `SSG_CACHE=off`
or `render_cache` will replay stale HTML at you, do not touch git, and do not touch the shared
worklog.

## Why

The client's directory content is several times larger than ours, and ours is partly invented.

| record | ours | theirs | source |
|---|---|---|---|
| people | 7 | ~24 leaders | `feedback/src/data/leaders.ts` |
| partners | 5 | ~34 | `feedback/src/data/partners.ts` |
| posts (news) | 26 all types | 36 news | `feedback/src/data/news.ts` |
| impact stories | — | 12 | `feedback/src/data/stories.ts` |

These are the records that fill the leadership grid, the partner rows and the news lists — the
pages a visitor actually lands on.

## Files you own

- `src/server/seed/records.ts` (post-J15)
- `.work/km-review-j18.md` (yours alone; J16 and J17 write their own, the orchestrator merges)

## Do

1. Transfer every leader, partner, news item and impact story from the four data files.
2. Match our existing records rather than duplicating them. Seven people and five partners already
   exist; reconcile by name or slug and report every collision and how you resolved it.
3. Leaders carry a tier (`board`, `smt`, `pm`, `team`) in our schema — map theirs onto it and say
   what you inferred rather than read.
4. **Khmer**: machine-translate names, positions and summaries; append every generated string to
   `.work/km-review-j18.md` as `entity | field | en | km`. Person names especially need a native
   reviewer — a transliterated name is not a translated one, and getting someone's name wrong in
   public is worse than leaving it in English. If a name has no reliable Khmer form, keep the
   English and log it.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 10 of 10.

1. Record counts after seeding match the source files. State each: people, partners, posts,
   stories. A count short of the source is a fail unless you list the records you dropped and why.
2. No duplicates. Query for repeated slugs and names and paste the result.
3. `/team` renders the full leadership grid, `/news` the full news list, `who-we-are/partners` the
   full partner set. Screenshot each.
4. Every person page resolves at `/team/<slug>`. Report the count checked and any 404.
5. `bun scripts/check-authorable.ts` reports zero problems.
6. Each record type is editable in `/admin` — open one person, one partner and one post, change a
   field, save, and show the change publicly.
7. `.work/km-review-j18.md` row count matches the Khmer fields you generated, with names flagged
   separately as needing a native reviewer.
8. `bun run db:seed` on a fresh empty database produces all of it.
9. `bunx biome check` on your files: no new errors.

## Out of scope

Images — placeholders until J19. Page copy (J16). Projects (J17). The org chart.

## Stop conditions

- A record needs a column the schema does not have: report it, do not fold the data into a summary
  string where nothing can query it.
- Reconciling with an existing record would lose data: stop and report rather than overwriting.
