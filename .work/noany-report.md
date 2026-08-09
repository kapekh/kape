# NOANY - Type the 30 `any` sites

All 28 sites in the four files are gone.
The remaining 2 are in `src/components/admin/FormBuilder.tsx`, which J07 owns and which I never opened.

```
$ bunx biome lint src --max-diagnostics=500 | grep noExplicitAny
src/components/admin/FormBuilder.tsx:62:23
src/components/admin/FormBuilder.tsx:411:56
```

No suppression comments were added, and no `unknown` stands in for `any` behind a cast.
The one cast that remains at the JSON boundary is described below and is named in the code.

## Gates

| gate | result |
|---|---|
| `bunx tsc --noEmit` | silent |
| `bun run test` | 272 passed, 25 files |
| `bunx biome format src` | clean over 248 |
| `bunx biome check src --max-diagnostics=500` | 20 errors, 2 warnings |
| `git diff --stat bun.lock package.json` | empty |

Two of the job's numbers were already stale at the commit I branched from (`e7570b6`).
The suite there is 272 passed / 25 files, not 269 / 24, and the formatter sees 248 files, not 247.
I ran the suite with my renderer change stashed and got the same 272 / 25, so nothing here moved it.

The gate asks for errors down and warnings at 2 or fewer.
Warnings went 30 to 2 and both survivors are J07's, but errors did not move, because `noExplicitAny` is configured as a *warning* here - all 30 of it.
The 20 errors are `noArrayIndexKey` and friends, all pre-existing, none in my four files, and out of scope by the job's own "don't fix unrelated lint" rule.
Nothing this branch does could have lowered that number.

## What the renderer got

`SECTION_DEFS` names the sections and `resolveQuery` produces their rows, but nothing wrote down which source produces which shape, so every template took `Record<string, any>` and read `p.data` as an anonymous `any[]`.

`src/server/repo/sections.ts` now exports `SourceRow`, one row type per `QuerySource`, built from the repo functions' own return types.
`resolveQuery` returns `SourceRow[QuerySource][] | null`, so each branch is checked against that map: a repo function that changes shape now fails in the resolver rather than silently in a template.
No repo function's behaviour or return value changed, so the stop condition never came up.

Each template then declares the props it is authored with and the rows its source fills.
The full discriminated union keyed on section `type` is not reachable from here: `SectionNode.type` is `string`, and narrowing it to a union of the 21 keys would reach the page editor, the admin section form and the tRPC preview procedure, none of which I own.
So the type-to-template lookup stays one assertion in one function, `templateFor`, with a comment saying why. Past it everything is typed.

Three shapes would have been a lie as a single row type, and are not:

- **`map`** binds to project locations or to offices.
  Their `lat`/`lng` disagree (`number` against `text`), so an intersection would have produced `never`.
  It narrows on the row and builds each marker from that source's own fields.
  This drops the `r.label ||` branch that led the old label expression - no source has ever produced a `label`, offices fall to `name` and locations to `schoolName` exactly as before, and the HTML confirms it.
- **`directory`** prints whatever columns its rows carry, which is the point of the section, so it reads them by key. The three sources it binds to are named in `DirectoryRow`.
- **`postList`** binds to news/stories or to jobs and is not told which, so a row carries whichever fields its own source filled. That is lossy about the correlation between fields but not a lie about any one of them. The strict union was possible but wanted twelve `in` narrowings inside JSX, several in text positions where `undefined` and `""` do not serialise alike.

## Evidence

Byte-identical is the bar the job set, and it is met for 71 pages.

The seeded database renders 16 of the 21 templates.
`.work/seed-coverage.ts` adds a page per template and per layout the fixture never reaches - `pills`, `siteMap`, `projectList`, `directory`, `orgChart`, plus `postList/table`, `hero/split`, `hero/carousel`, `stats/plain`, `publicationList/grid-2`, `map` bound to offices, the empty-state branches and an unknown section type - and the org and staff rows two of those sources read. All 21 templates render in the capture, most of them twice.

```
$ .work/capture.sh before      # 71 pages, at e7570b6
$ .work/capture.sh after       # 71 pages, at HEAD
$ .work/compare.sh before after
identical: 71 pages
```

`compare.sh` normalises two things, both dev-only:

1. **Epoch-ms in the hydration payload.** Two runs of the same code differ here; I captured `before` twice and confirmed that is the only difference between them.
2. **`data-tsd-source`.** This one did change, and it is worth reading before waving through.

The devtools Vite plugin annotates each JSX element with its source location, but skips an element that spreads the component's props identifier, so the caller's annotation survives instead.
`NavLink` spread `{...(rest as any)}`, a TSAsExpression rather than an identifier, so the skip never fired and every link on the site was labelled `NavLink.tsx:26` instead of its caller.
Removing that pointless cast let the plugin do what it means to do.

The attribute never ships: the plugin's `apply` gates on `config.mode === "development"`.

```
$ PORT=3005 bun --bun vite dev --port 3005 --mode production
$ curl -s localhost:3005/en/home | grep -c data-tsd-source
0
```

Strip those two and all 71 pages are identical, byte for byte, in both languages.

### Screenshots

`.work/noany-shots/`, before and after each. The two client-only sections are here because SSR gives them a placeholder, so the HTML diff cannot see them:

- `map-offices` - 4 office pins, the source whose marker construction I rewrote
- `map-locations` (`/who-we-are/about`) - 26 project pins
- `orgchart` - React Flow tree, 4 nodes
- `home`

Identical in every case bar the footer's visit counter, which is a write-on-read counter that increments on each load.

Take the first pair I shot as a warning, not evidence: the `after` map came out blank because I screenshotted before hydration on a cold dev server. Re-shot after waiting on the Leaflet attribution. Both are correct now.

## For whoever runs the dev server next

The SSR half of a page calls its own tRPC API at `http://localhost:${process.env.PORT ?? 3000}`.
Run `bun --bun vite dev --port 3004` without also setting `PORT=3004` and every page resolves against whatever is serving :3000 - another worktree's dev server, another worktree's database.
It does not error. Pages that exist in both databases render fine and pages that only exist in yours 404, which is a confusing half-hour.

```
PORT=3004 DATABASE_PATH=./noany.db SSG_CACHE=off bun --bun vite dev --port 3004
```

`SSG_CACHE=off` is not required, only honest: the render cache would otherwise serve resolved loader data from before the change.

## Files

Owned and changed:

```
src/components/sections/SectionRenderer.tsx | 308 +++++++++-------
src/server/repo/sections.ts                 |  40 ++-
src/server/migrate-tree.ts                  |  19 +-
src/components/admin/CampaignForm.tsx       |  12 +-
src/components/NavLink.tsx                  |   6 +-
```

`src/lib/sections.ts` was not touched - the shapes it needed to contribute were already there.
`src/lib/forms.ts`, `src/components/FormRenderer.tsx` and `src/components/admin/FormBuilder*` were never opened.

Fixtures, not product: `.work/seed-coverage.ts`, `.work/capture.sh`, `.work/compare.sh`.
The seeder wrote 25 `zz-cover/*` pages plus 4 org nodes and 3 staff rows into `./noany.db`, which is the throwaway database. It is idempotent and re-runnable.
