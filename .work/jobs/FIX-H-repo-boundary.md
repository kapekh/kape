# FIX-H - the two fixes FIX-G could not reach

Both of these are in `src/server/repo/`, which FIX-G was told to stay out of because FIX-F held it.
FIX-F is done and the boundary is free. Small job; read `.work/FIX-G-report.md` for the context it
wrote when it hit each wall.

## Files you own

- `src/server/repo/content.ts`
- `src/server/repo/search.ts`
- whatever type carries a resolved post (`ResolvedPost`), wherever it lives

Nobody else is in these files. Do not open `src/lib/ui-strings/*` - S7 is there and a key defined
twice fails `dictionary.test.ts` by design.

## H1 - a publication past the 24th cannot be opened. The real one.

FIX-G taught the article route to render a publication's file, and it works. But it reads the file
from `posts.publications`, which inherits `listPublications`' 24-row cap, so the fix only reaches
the 24 most recent publications. The 25th onward render a detail page with no document again - the
exact F5 defect, just further down the list.

FIX-G priced the fix at four lines in `content.ts` and could not make it. Read what it wrote there
before choosing your own approach.

The cleaner shape, if it is not much more work: `ResolvedPost` drops `meta`, which is why the route
had to go back to a list query at all. A resolved post that carries its own `fileUrl` and
`youtubeUrl` removes the list lookup and the cap together. FIX-G named this as the better fix and
left it because the type is on this side of the boundary. Judge it yourself - if it turns into a
wide refactor, take the four lines instead and say why.

**Verify with a real record past the cap**, not with the first publication in the list. Count the
publications in your fixture; if there are fewer than 25, create enough to push one past the
boundary in your own scratch database and open that one.

## H2 - the search snippet, at the producer

F9 was "every search result prints its title twice". FIX-G closed it in the route by hiding a
snippet identical to the title, which is correct and shipped. The producer is `search.ts`, which
fills the snippet with the title when a record has no excerpt.

Fix it where it is produced: no excerpt means no snippet. Then check whether the route-side guard
FIX-G added is still earning its place - if the producer can no longer emit a title-as-snippet,
say so and leave the guard as cheap defence, or remove it, but do not leave two half-fixes with
neither one obviously in charge.

## Out of scope

The rest of `src/server/repo/`. In particular **do not** take `deletePage`, which is queued and
sized at about half a day - it needs a sync rewrite and it is not this job.

## Acceptance

- H1: the publication past the cap opens its document. Show the record you used and its position in
  the list.
- H2: a record with no excerpt renders a title and nothing under it, at the producer.

Gates before you report: `bunx tsc --noEmit` silent, `bun run test` at or above **386 tests over 42
files**, `bun run lint` 8 errors and 0 warnings - the known `noArrayIndexKey` sites, not yours.

H1 needs a test that fails if the cap comes back. Use your own scratch copy of `kape.db` via
`sqlite3 kape.db "VACUUM INTO '.work/scratch/<yours>.db'"` and your own port; 3011 and 3020 are
taken, and `.work/uat/uat.db` and `kape.db` are both off limits for writes.

Report to `.work/FIX-H-report.md`.
