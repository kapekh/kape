# SEED-COPY - Put the real project copy into the seed

## Objective

The KAPE seed ships 24 projects whose `body` is a 152-character placeholder called `TAIL`. The real
copy exists on the client's prototype and nobody has moved it.

K1 already did half of this and its work is on disk, verified in its own pane:

- `.work/kape-copy/projects.json` - 8 projects, 274 strings, each body 1,289 to 1,721 characters
  against the 152-character `TAIL`. Extracted from the route chunks and checked against the live
  rendered page, zero missing.
- `.work/k1-report.md` - how it was done and what it found.

You are done when all 24 projects carry their real copy in `src/server/seed/projects.ts`, a fresh
`bun run seed:kape` renders it, and no project still shows `TAIL`.

## Two halves, in this order

**1. Apply K1's 8.** They are extracted, ordered and verified. Do not re-extract them. K1 shipped
`blocks` (structured and ordered: goal, update, activities, target areas, target group, impact, case
studies, snapshots) plus a derived `bodyDoc.en` ProseMirror document, because `richText()` cannot
hold a heading or a bullet list and flattening to `body: string[]` would discard the
objective/activities/outcomes split. `heading` and `bulletList` are already in the StarterKit
allow-list, so this needs no new node type and no dependency.

Note K1's finding on ordering: the chunk's prop order is wrong and `blocks` follows the *rendered*
order. Trust the render, not the source order.

**2. Extract and apply the other 16.** Same method, same verification: check every extracted string
against the live rendered page and report the count, rather than trusting the chunk.

## Files you own

- `src/server/seed/projects.ts`
- `.work/kape-copy/` and `.work/seed-copy-report.md`

Nothing else. A second job is live across every `.tsx` in `src/components/` and `src/routes/`. Do
not open any of them. If applying the copy seems to need a renderer change, stop and report it
instead of making it.

## Two things you must not decide alone

K1 flagged both and neither is yours to settle:

1. **CTSP and CamScam summaries contradict every block beneath them** on the client's own prototype.
2. **The seed's single-province target areas are narrower than the pages' three or four.** LOTUS's
   page does not even list Battambang, which is its own map pin.

Do the 22 uncontested projects. For these two, put the conflict in your report with both versions
quoted and leave the seed as it is. Guessing at a client's content is how a fixture starts lying.

**Khmer stays out.** K1 left it out deliberately and did not machine-translate. If `body.en` goes
rich while `body.km` keeps `TAIL`, Khmer holds today's content while English pulls ahead. That is a
defensible state and it is Rithy's call to change, not yours.

## Gates

```
bunx tsc --noEmit                       # silent
bun run test                            # 269 passed, 24 files
bunx biome format src                   # clean over 247
bunx biome check src --max-diagnostics=500   # 142 errors, never up
```

Then the one that matters, against a throwaway database so the repo's `kape.db` is untouched:

```
DATABASE_PATH=/tmp/seed-copy.db bun run seed:kape
DATABASE_PATH=/tmp/seed-copy.db bun run dev
```

Open every one of the 24 project pages and show the real copy rendering, headings and bullets
included. Screenshots to `.work/seed-copy-shots/`. A project that renders a wall of unstyled text
because the ProseMirror doc was built wrong is a failure, not a detail.

## Trap

`DATABASE_PATH` is read by the app *and* by drizzle-kit. Setting it in one shell and not another is
how migrations land on the wrong file. Never run the seed against the repo's `kape.db`.
