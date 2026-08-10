# FIX-H - the repo-side halves of F5 and F9

Branch `cms-core`. Own scratch fixture `.work/scratch/h/h.db` (a `VACUUM INTO` copy of `kape.db`),
own dev server on port 3041. `kape.db` and `.work/uat/uat.db` were never opened for writing - both
mtimes predate this session.

Both defects closed at the producer. Two files of source, two of test.

| File | Why |
|---|---|
| `src/server/repo/content.ts` | H1: `listPublications` no longer caps by default. |
| `src/server/repo/search.ts` | H2: the title can no longer become a record's snippet. |
| `src/integrations/trpc/router.test.ts` | H1's check, through the endpoint the detail page reads. |
| `src/server/repo/search.test.ts` | H2's check. |

## H1 - a publication past the 24th could not be opened. Closed.

**Chosen fix: the presentation limit left the data layer.** `listPublications(db, lang, category?,
limit?)` slices only when a caller asks for a slice. The one caller that wants a page of rows,
`resolveQuery` in `sections.ts`, already passes `q.limit ?? 24` explicitly and is unchanged; the
tRPC procedure passes no limit and now returns the whole list.

Two lines, one file, no dead code. I did not give `ResolvedPost` its own `fileUrl`/`youtubeUrl`,
and the reason is not the type - `ResolvedPost` is referenced in exactly one other place
(`repo/route.ts`, as a type), so the type change really is four lines and spreads nowhere. The
reason is the consumer: the field is worthless until `PublicationFile` in `src/routes/$.tsx` reads
it instead of the list query, and `$.tsx` belongs to S7 this round. Adding a field nothing reads is
scaffolding for later, and shipping it alongside the cap fix would leave exactly the two half-fixes
this job was told not to leave. The uncapped list closes the defect on its own.

What that leaves behind is a cost, not a bug: the publication detail page still ships the whole
publications list in its dehydrated SSR state, roughly 250 bytes per record, where one `fileUrl`
would do. The video path has always worked this way (`listVideos` has no limit either). Whoever next
has `$.tsx` can take the four lines and delete both list queries and both loader warms; nothing is
waiting on them.

- Fixture reality: `kape.db` holds 4 publications, so the cap could not be reached. I seeded 26 more
  in my scratch copy (`h-pub-01` … `h-pub-26`, dated 2023-12-30 down to 2023-12-05, all pointing at
  a real uploaded PDF, `/uploads/f2e93886-1119-4cfc-befd-23c85d60514f.pdf`, which serves 200
  `application/pdf`). 30 published publications, ordered `published_at` desc.
- Positions used: `h-pub-20` is number 24, `h-pub-21` is number 25, `h-pub-26` is number 30.
- Before, on the running site: `/en/publications/annual-report-2025` (1) and `/en/publications/h-pub-20`
  (24) each rendered one "Open the document"; `h-pub-21` (25) and `h-pub-26` (30) rendered none.
- After: all four render the button with the file's href. The record demonstrated is `h-pub-26`,
  the **last of 30**, six past the old boundary.
- Check: `router.test.ts > posts.publications > returns every publication, not just a page of them`.
  It inserts 30 publications into a scratch database, calls `posts.publications` through the real
  tRPC caller and asserts 30 back with the 30th's `fileUrl` intact. Putting `slice(0, limit ?? 24)`
  back makes it fail: `expected [ …(24) ] to have a length of 30 but got 24`.

## H2 - the search snippet repeated the title. Closed at the producer.

`collect` picked the snippet from the highest-scoring field, and `title` outweighs everything
(6 against 3 and 1), so any record matching in its title described itself with its title. Now the
title and a project's `name` are excluded from snippet candidacy: they still score and still rank,
they just cannot be quoted back. A record whose only match is its title carries `snippet: ""`.

I did not read this as "no excerpt, no snippet at all". A body snippet only ever surfaces when the
title did not match, which is precisely the query where a reader needs to see where the word was
found; deleting those would fix the duplicate by making search less useful. The rule implemented is
narrower and is the actual root cause: a title cannot be its own summary.

- After, `/en/search?q=school`: 14 results, none repeating its title. The three title-only records -
  the video "ICT Lab at a New Generation School", the gallery "New Generation School Classrooms",
  the publication "New Generation Schools — Programme Brochure" - render a title and nothing under
  it. Records with a real excerpt, summary or body match still show it, including the two mid-body
  snippets that open with "…". Same shape on `/km/search?q=សាលា`: 10 results, no repeats.
- Check: `search.test.ts > snippet` gains two cases - "leaves a title-only match with no snippet to
  repeat" (scores above zero, snippet empty) and "still snippets the body when only the title
  outscored it".

### The route-side guard from F9

`src/routes/$lang.search.tsx:157` still reads `r.snippet && r.snippet !== r.title`. **Leave it.**
The producer can no longer emit the title *field* as a snippet, but it can still emit a snippet that
happens to equal the title - a record whose excerpt is a verbatim copy of its own title, or a body
whose first sentence is. That is content, not a bug, and one `&&` at the render site is cheaper than
teaching the producer to compare strings it does not yet know the translation of. The producer is
now in charge of the class of defect; the guard is a one-condition backstop, not a second half of
the fix. I did not touch that file - S7 holds it this round.

## Gates

| gate | result |
|---|---|
| `bunx tsc --noEmit` | silent |
| `bun run lint` | 8 errors, 0 warnings - the same `noArrayIndexKey` sites, none in a file I touched |
| `bun run test` | 42 files, 389 tests, all pass. Floor was 386 over 42; the 3 new ones are mine. |

One earlier full run showed 3 failures in the ui-strings dictionary tests while S7 was mid-write.
The rerun after it landed is clean; nothing in that failure touched this job's files.

## Handed back

- `ResolvedPost` carrying `fileUrl` and `youtubeUrl`, and the two list queries in `$.tsx` that would
  then disappear. A payload saving, not a defect, and it needs whoever holds `$.tsx` next.
- `src/integrations/trpc/router.test.ts` is not on this job's owned-files list. It was idle and
  unmodified in the working tree, and it is where the tRPC procedure this defect runs through is
  already tested, so the H1 check went there rather than into a fifth copy of the shell-out runner.
