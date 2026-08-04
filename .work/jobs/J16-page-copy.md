# J16 — Transfer the missing page copy

Six pages. **Starts after J15.**

## Files you own

- `src/server/seed/pages-who-we-are.ts` and `src/server/seed/pages-what-we-do.ts` (post-J15 names)
- `.work/km-review.md` (append only)

## Do

Four pages exist with **zero sections**, two do not exist at all. Take the copy verbatim from the
client's prototype and express it as section nodes.

| target slug | source |
|---|---|
| `who-we-are/about` | `feedback/src/routes/who-we-are.about.tsx` |
| `who-we-are/vision-mission` | `feedback/src/routes/who-we-are.vision-mission.tsx` |
| `who-we-are/fact-sheet` | `feedback/src/routes/who-we-are.fact-sheet.tsx` |
| `who-we-are/director-speech` | `feedback/src/routes/who-we-are.director-speech.tsx` |
| `who-we-are/accreditations` | `feedback/src/routes/who-we-are.accreditations.tsx` — **new page** |
| `what-we-do/ten-subsectors` | `feedback/src/routes/what-we-do.ten-subsectors.tsx` — **new page** |

The prototype's block kit maps onto our catalogue: `SubPage title/lead/badge/heroImage` → a `hero`
section; `<Section title>` + prose → `richtext` with a title; `<Grid cols=N>` of `<Card>` →
`cards` with that layout; the fact sheet's profile table → rich-text table (J08 adds those — if it
has not landed, use a `cards` grid and say so). Accreditations is exactly what J03's new
`certificates` section was built for.

**Copy is the client's. Do not improve it, shorten it, or fix its grammar.** If a sentence looks
wrong, transfer it as-is and note it.

**Khmer**: machine-translate each field, and append every generated string to `.work/km-review.md`
as `slug | field | en | km` so a native speaker can sweep them. Nothing generated is final copy.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 3 of 3.

1. All six pages render at their real URLs with content. Screenshot each. Run the dev server with
   `PORT` exported to the same port you pass `--port`, or every page 500s.
2. Every paragraph, heading, list item and card in the source route appears on our page. Work
   through one source file at a time and state, per page, what you transferred and what you
   deliberately dropped. "Looks the same" is not evidence.
3. English text matches the source **verbatim**. Pick any two pages and diff the strings.
4. Both new pages are reachable from the nav, or you state why not.
5. `.work/km-review.md` has one row per generated Khmer string, and the count matches the number
   of translated fields you wrote.
6. `bun run db:seed` on a fresh empty database produces these pages. The seed is the source of
   truth, not hand-edits to `kape.db`.
7. `bunx biome check` on your files: no new errors.

## Out of scope

Images — every image slot uses the existing picsum placeholder helper until the client's assets
arrive. Project pages (J17). People, partners, posts (J18). The section catalogue and renderer.

## Stop conditions

- A page needs a section type the catalogue does not have: report it, do not invent a renderer.
- The fact sheet needs rich-text tables and J08 has not landed: use `cards` and flag it.
