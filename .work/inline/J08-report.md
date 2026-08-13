# J08 report, prerender invalidation

Closes D7.
`scripts/prerender-static.ts` gains `--stale`: it works out which prerendered files are older than what they render and regenerates only those.
The full rebuild and the explicit-path incremental mode are untouched.

Files changed:

- `scripts/prerender-static.ts`, the stale mode
- `src/server/prerender-stale.test.ts`, new, 11 cases
- `scripts/gen-prerender-paths.ts`, one loop, for the reason in "The path list had to move first" below

Worktree `/home/userx/workspace/kape-j08`, branch `j08-prerender`, database `./j08.db`, prerender preview on `:4185`.
Every run below is real: the preview server serving the production build, `updateField` and `setUiString` through `trpcRouter.createCaller`, and the files on disk.

## How staleness is decided

Four signals, per path, all of them disk against database.

| signal | source | why |
|---|---|---|
| no file | `dist/static/<path>/index.html` missing | nothing to keep |
| content | entity `updated_at` and the newest `nav_items.updated_at`, against the file's mtime | an inline save bumps `updated_at`, so the row itself dates the page |
| versionless input | a fingerprint recorded beside the html tree | `ui_strings` and `projects` have no timestamp column at all |
| build | mtime of `dist/server/server.js` against the file's mtime | html from an older build names asset files the new build has renamed |

The third signal needs the one piece of state this job adds: `dist/static/.prerender-state.json`, written by every mode, one entry per path.
It holds the fingerprint of the chrome strings the page was rendered with, and the run's start time.
`ui_strings` is a `(tenant, key, lang)` primary key with three columns and no `updated_at`; adding one is a migration and a schema change, neither of which is this job's.
A hash of what the page was rendered with is the honest substitute, and it lives on disk next to the output it describes, so a `bun run build` that clears `dist/` clears it too.
`projects` has no `updated_at` either (J03 refused `expectedUpdatedAt` there for the same reason), so a project path carries a second fingerprint of its row and its translations.

The recorded start time is also what closes the write race: a save landing while a run is mid-flight would otherwise be buried under an mtime stamped after it.
`renderedAt` is `min(file mtime, run start)`.

A path with no entry in the state file is stale, which is what makes the answer to the round's open problem work.

## Acceptance 1, a save makes one entity stale

`adminPages.updateField` writing `field:title` on page 13, `what-we-do/ict-innovation`, in English.

```
__C10_RESULT__[{"ok":true,"value":{"wrote":"translation","cleared":false,"updatedAt":"2026-08-13T02:43:06.568Z"}},
               {"rows":[{"id":13,"slug":"what-we-do/ict-innovation","updated_at":"2026-08-13T02:43:06.568Z"}]}]
```

```
$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
Stale: 2 of 150 paths.
  regenerate  /en/what-we-do/ict-innovation  (content 2026-08-13T02:43:06.568Z > rendered 2026-08-13T02:42:36.709Z)
  regenerate  /km/what-we-do/ict-innovation  (content 2026-08-13T02:43:06.568Z > rendered 2026-08-13T02:42:36.709Z)

Skipped, up to date (148):
  /en
  /en/calendar
  /en/calendar/international-days
  [... 145 more, one per line ...]
  /km/who-we-are/vision-mission

Prerendered 2/2 pages → dist/static/
```

Two paths, not one, and the second one is correct rather than sloppy.
`updated_at` lives on the page row, so it dates the entity, not the language: nothing in the schema records which language a translations row was written in and when.
The Khmer page also renders English for every field Khmer has not overlaid, so regenerating both is the conservative answer.
One save, one entity, one file per enabled language.

Every other file was left alone, by mtime:

```
$ diff <(mtimes before) <(mtimes after)
> 1786588999.2296396860 dist/static/en/what-we-do/ict-innovation/index.html
> 1786588999.2976387410 dist/static/km/what-we-do/ict-innovation/index.html
```

## Acceptance 2, the regenerated file carries the new text

```
$ grep -ao ".\{120\}ICT Innovation (saved inline).\{20\}" dist/static/en/what-we-do/ict-innovation/index.html
" data-precedence="default"/><link rel="stylesheet" href="/assets/style-DtxX27Jz.css" data-precedence="default"/><title>ICT Innovation (saved inline) — KAPE</title><meta
mage" content="/fixture/kape-logo.png"/><meta name="twitter:card" content="summary"/><meta property="og:title" content="ICT Innovation (saved inline) — KAPE"/><meta name
s",l:$R[136]={route:$R[137]={kind:"page",page:$R[138]={id:13,slug:"what-we-do/ict-innovation",status:"published",title:"ICT Innovation (saved inline)",excerpt:"",coverUr

$ grep -ao "<title>[^<]*</title>" dist/static/km/what-we-do/ict-innovation/index.html
<title>បច្ចេកវិទ្យាព័ត៌មាន — KAPE</title>
```

The English file carries the new title in `<title>`, in `og:title` and in the dehydrated route payload; the Khmer file keeps its own overlay.
On this page the `<h1>` comes from the hero section's own prop rather than the page title, which is why the new string is not in it.
An earlier run of the same shape on page 1, `who-we-are/about`, whose h1 is the page title, showed it there with J04's markers intact:

```
<h1 data-cms-entity="page" data-cms-entity-id="1" data-cms-lang="en" data-cms-target="field:title" class="mt-5 max-w-4xl t-page-title ...">About KAPE (J08 stale proof)</h1>
```

`grep` needs `-a`: the prerendered html holds 9 NUL bytes (`file` calls it `data`), which is true of HEAD's output too and is not from this job.

## Acceptance 3, a UI string save makes the paths that show it stale

`adminSettings.setUiString` on `footer.explore`, Khmer only.

```
__C10_RESULT__[{"ok":true,"value":{"reset":false}},
               {"rows":[{"key":"footer.explore","lang":"en","value":"Explore"},
                        {"key":"footer.explore","lang":"km","value":"រុករក (ថ្មី)"}]}]
```

```
$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
Stale: 75 of 150 paths.
  regenerate  /km  (chrome changed)
  regenerate  /km/calendar  (chrome changed)
  regenerate  /km/calendar/international-days  (chrome changed)
  [... 71 more, every one of them /km/... ...]
  regenerate  /km/who-we-are/vision-mission  (chrome changed)

Skipped, up to date (75):
  /en
  /en/calendar
  [... 73 more, every one of them /en/... ...]

Prerendered 75/75 pages → dist/static/
```

75 stale, 0 of them English, and the string is in the regenerated files:

```
$ grep -ao "រុករក (ថ្មី)" dist/static/km/index.html            → រុករក (ថ្មី)
$ grep -ao "រុករក (ថ្មី)" dist/static/km/projects/ngs/index.html → រុករក (ថ្មី)
$ english files with a changed mtime: 0
$ khmer files with a changed mtime: 75
```

The granularity is per language, not per key: the whole Khmer half of the site is stale, because a chrome string appears in the header and footer of every page and nothing in the rendered html says which keys a page used.
`<T k="…"/>` emits its `data-` marker in the browser only, gated on edit mode, so the SSR output carries the text without the key.
Editing an English string marks all 150 rather than 75, since Khmer falls back to English for any key it has not overridden.

A project edit, the other input with no timestamp, is finer, because the fingerprint is per row:

```
$ adminPages.updateField {entity: project, entityId: 1, lang: en, target: field:summary}
__C10_RESULT__[{"ok":true,"value":{"wrote":"translation","cleared":false,"updatedAt":null}}]

$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
Stale: 2 of 150 paths.
  regenerate  /en/projects/ngs  (entity changed)
  regenerate  /km/projects/ngs  (entity changed)

Prerendered 2/2 pages → dist/static/

$ grep -ao "New Generation Schools, a summary with no version column to bump." dist/static/en/projects/ngs/index.html
New Generation Schools, a summary with no version column to bump.
$ files touched: dist/static/en/projects/ngs/index.html, dist/static/km/projects/ngs/index.html
```

`updatedAt: null` is J03 refusing to pretend a project has a version. The fingerprint is what catches it.

## Acceptance 4, nothing stale means nothing written

Two consecutive runs on a freshly prerendered tree.
No preview server is started when the stale set is empty, so the run costs one pass over the database and the file mtimes.

```
$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale        (run 1)
Stale: 0 of 150 paths.

Skipped, up to date (150):
  /en
  /en/calendar
  [... 147 more ...]
  /km/who-we-are/vision-mission

Nothing stale — no file written.

$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale        (run 2)
Stale: 0 of 150 paths.

Skipped, up to date (150):
  /en
  /en/calendar
  [... 147 more ...]
  /km/who-we-are/vision-mission

Nothing stale — no file written.
```

Mtimes of all 150 files, before run 1, between the runs and after run 2:

```
$ find dist/static -name index.html -printf '%T@ %p\n' | sort > before   (150 lines)
   1786588956.7582263420 dist/static/en/index.html
   1786588956.8122256000 dist/static/en/calendar/index.html
   ...
$ diff before between   → (no output) run 1 changed nothing
$ diff between after    → (no output) run 2 changed nothing
```

## Acceptance 5, a missing file counts as stale

```
$ rm dist/static/en/projects/ngs/index.html
$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
Stale: 1 of 150 paths.
  regenerate  /en/projects/ngs  (no file)

Prerendered 1/1 pages → dist/static/

$ ls -l --time-style=full-iso dist/static/en/projects/ngs/index.html
-rw-r--r-- 1 userx userx 62763 2026-08-13 09:43:41.346331790 +0700 dist/static/en/projects/ngs/index.html
$ grep -ao "<title>[^<]*</title>" dist/static/en/projects/ngs/index.html
<title>New Generation Schools — KAPE</title>
```

## Acceptance 6, the full rebuild is unchanged

`git show HEAD:scripts/prerender-static.ts` run against the same tree, the same database and the same `prerender-paths.json`, then the new script with no argument:

```
$ PRERENDER_PORT=4185 bun /tmp/j08-head-prerender.ts

Prerendered 150/150 pages → dist/static/

$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts

Prerendered 150/150 pages → dist/static/

$ diff head.txt new.txt
byte-identical
```

The same comparison on the pre-fix 152-path list, before the generator change, also came out byte-identical, failures block included:

```
Prerendered 146/152 pages → dist/static/
Failures (6): [ "/en/events/event-eye-2026-05-10 → 404",
  "/en/events/event-hcc-2026-05-02 → 404", "/en/events/event-ngs-2026-05-02 → 404",
  "/km/events/event-eye-2026-05-10 → 404", "/km/events/event-hcc-2026-05-02 → 404",
  "/km/events/event-ngs-2026-05-02 → 404" ]
```

The full rebuild does one thing more than it did: it records the state file for the paths it wrote, which is what lets a later `--stale` run trust them. Stdout is unchanged.

## Acceptance 7, gates

```
$ bun run test
 Test Files  52 passed (52)
      Tests  478 passed (478)
   Duration  15.71s

$ bunx tsc --noEmit
tsc exit=0            (no output)

$ bun run lint
Checked 309 files in 418ms. No fixes applied.
Found 6 errors.

$ bun run build
✓ built in 3.02s
```

478 tests against the 467 baseline, the 11 new ones in `src/server/prerender-stale.test.ts`.
Lint holds at 6, the same `suspicious/noArrayIndexKey` six in `FormBuilder.tsx`, `SectionsBuilder.tsx` and `admin.footer.tsx`, none of them in a file I touched.

That lint number is with `dist/static` moved aside. With a prerendered tree present:

```
$ bun run lint
Checked 459 files in 2s. No fixes applied.
Found 48874 errors.
```

`biome.json` includes `**/index.html`, which matches all 150 prerendered files.
It predates this job and fires for anyone who runs `bun run prerender` before `bun run lint`; the fix is one entry, `"!**/dist"`, in `files.includes`, and `biome.json` is not mine this round.

## The path list had to move first

`scripts/gen-prerender-paths.ts` emitted 6 paths the router refuses.
It selects posts by `content_type = def.contentType`, while the detail route asks `resolvesUnder(col, post.contentType)` (`src/server/repo/route.ts:98`), which blocks the four internal-only types and allows a collection's `alsoResolves` list.
So three published events were emitted and 404'd on every prerender, and two announcements that do serve under `/careers/<slug>` were never prerendered at all.

This is why the change was not optional here: a path that can never be written is stale on every run, and acceptance 4 can never hold while three of them are in the list.
The loop now asks the same question the route asks, using the helper that already exists for it.
152 paths became 150, and a full prerender went from 146/152 with six failures to 150/150.

## What this does not see

- **A listing page does not know its list changed.** Publishing a post marks the post's own two paths stale, not `/en/news`, not the home page. Every collection landing draws from a query no timestamp on the page row reflects. Closing it means either a dependency edge per section kind or a `max(updated_at)` per collection folded into the landing's path, and both are more than "the entity's `updated_at`" this contract asked for.
- **`site_settings` has no timestamp**, like `ui_strings`. A phone number or a social link in the footer changes nothing this script can detect. The same fingerprint trick would cover it; say the word and it is four lines.
- **Media.** Replacing the bytes behind a `media` row does not touch any `updated_at` the page carries.
- **A ui-string save costs a whole language**, per acceptance 3.
- **`people`, `stat`, `nav_item` and `hero_slide` translations** are not entity-addressed here. Nav is covered as a whole through `nav_items.updated_at`; a `people` row edit is not, and `/team` is a landing page anyway, so it falls under the first item.

## The round's open problem

The deployed `dist/` predates HEAD and serves pre-fix html.
Stale mode catches it, and this is exactly the state this worktree was in after a rebuild:

```
$ ls -l --time-style=full-iso dist/server/server.js dist/static/en/index.html
-rw-r--r-- 1 userx userx  67780 2026-08-13 09:40:10.553192545 +0700 dist/server/server.js
-rw-r--r-- 1 userx userx 108549 2026-08-13 09:34:53.943077626 +0700 dist/static/en/index.html

$ PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
Stale: 150 of 150 paths.
  regenerate  /en  (build 2026-08-13T02:40:10.553Z > rendered 2026-08-13T02:34:53.859Z)
  regenerate  /en/calendar  (build 2026-08-13T02:40:10.553Z > rendered 2026-08-13T02:34:53.859Z)
  regenerate  /en/calendar/international-days  (build 2026-08-13T02:40:10.553Z > rendered 2026-08-13T02:34:53.859Z)
  [... 147 more ...]

Prerendered 150/150 pages → dist/static/
```

The build signal is what catches it, and it had to be there anyway: `vite build` does not clear `dist/static`, so without it a rebuild leaves html pointing at asset filenames the new build has already renamed.
A deployed tree that predates this job trips the same wire from the other side, having no state file at all, and every path reads `not in the prerender state file`.

The command, on the deploy host, from the repo root:

```
bun run build && PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
```

`bun run build` regenerates `prerender-paths.json`, so a page published since the last deploy is included.
After an inline edit with no code change, the cheap form skips the build:

```
bun scripts/gen-prerender-paths.ts && PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale
```

Both are safe to run on a schedule: with nothing stale they touch no file and never start the preview server.

## Notes for whoever picks this up

- `bun scripts/prerender-static.ts --stale /en/news /km/news` filters an explicit list the same way, for a targeted check.
- The state file is `dist/static/.prerender-state.json`. Delete it and the next `--stale` run regenerates everything, which is the manual escape hatch.
- `staleReason` and `dbTime` are exported and pure; the test drives them directly. The module only runs `main()` under `import.meta.main`, so importing it from vitest does not load `bun:sqlite`.
- This copy of the database yields 150 paths from `gen-prerender-paths.ts` (75 content x 2 languages), not the 138 the lead pane measured. 38 published pages, 26 published posts and 2 languages all match; the difference is downstream of that, in projects and in the six event paths the generator used to emit. Numbers in this report are from `./j08.db` in this worktree.
- `./j08.db` carries the demo edits above on pages 1 and 13, project 1 and `ui_strings.footer.explore`, and `users.id = 1` was set to `admin` so the test caller could write. It is a gitignored copy.

Next: J08 is done and committed on `j08-prerender`; the operator command for the stale deploy is `bun run build && PRERENDER_PORT=4185 bun scripts/prerender-static.ts --stale`, and the two open calls for the lead are the biome `**/index.html` include and whether listing pages get a dependency signal.
