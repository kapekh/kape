# NOANY - Type the 30 `any` sites

## Objective

`noExplicitAny` is the last lint category nobody has touched. J12 sized it and stopped, correctly:
this is real typing work, not a mechanical pass, and the biggest cluster is the section renderer,
which is the file the whole public site renders through.

Measured in the lead pane at the commit you branch from:

| file | sites |
|---|---|
| `src/components/sections/SectionRenderer.tsx` | 22 |
| `src/components/admin/CampaignForm.tsx` | 3 |
| `src/components/NavLink.tsx` | 2 |
| `src/server/migrate-tree.ts` | 1 |

That is 28. The other 2 are in `src/components/admin/FormBuilder.tsx`, which **J07 owns and is live
at the same time as you**. Do not open it. J07 clears its own two.

You are done when `bunx biome lint src` reports 0 `noExplicitAny` across the four files above, with
no suppressions and no `unknown` used as a synonym for `any` behind a cast.

## The one that matters

The 22 in `SectionRenderer.tsx` are almost all the same shape: a section component takes `p: P` and
immediately does `const rows: any[] = Array.isArray(p.data) ? p.data : []`. The renderer is handed
whatever the section's `query.source` returned, and nobody has ever written down what that is.

The real fix is a discriminated union keyed on section `type`, matching `SECTION_DEFS` in
`src/lib/sections.ts`, so a section component receives the row shape its own source produces. Read
`src/lib/sections.ts` and `src/server/repo/sections.ts` before you write a line - the shapes already
exist there, they are just not connected to the renderer.

If that union turns out to be a bigger change than this job can hold, say so with the evidence and
type the leaf shapes individually instead. A half-built union is worse than 22 honest `any`s.

## Files you own

- `src/components/sections/SectionRenderer.tsx`
- `src/components/admin/CampaignForm.tsx`
- `src/components/NavLink.tsx`
- `src/server/migrate-tree.ts`
- `src/lib/sections.ts` and `src/server/repo/sections.ts`, **read-write but only to export a type**.
  Any behaviour change in either is out of scope.
- `.work/noany-report.md`

Nothing else. `src/lib/forms.ts`, `src/components/FormRenderer.tsx` and
`src/components/admin/FormBuilder*` belong to J07 this round.

## Gates

```
bunx tsc --noEmit                       # silent
bun run test                            # 269 passed, 24 files
bunx biome format src                   # clean over 247
bunx biome check src --max-diagnostics=500   # errors down, warnings to 2 or fewer
```

`git diff --stat bun.lock package.json` empty.

## Evidence

Typing changes are invisible at runtime until they are not. `SectionRenderer` renders every public
page, so a wrong narrowing is a blank section in production and a green suite.

Render the KAPE home page and one page of every section type against a throwaway database, before
and after, and diff the HTML:

```
DATABASE_PATH=/tmp/noany.db bun run seed:kape
DATABASE_PATH=/tmp/noany.db bun run dev
```

Byte-identical body HTML is the bar. Anything else is a behaviour change you did not intend, and it
goes in the report before it goes in a commit. Screenshots to `.work/noany-shots/`.

## Stop condition

If typing a shape honestly requires changing what a repo function returns, stop. That is a
behaviour change wearing a types costume, and it needs the lead's verdict, not yours.
