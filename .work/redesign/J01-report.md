# J01 — design system foundation

The API is frozen. `.work/redesign/PRIMITIVES.md` is what the other twelve jobs read.

`kape.db` was never opened. Checksum at the start and at the end:

```
ae763b65cc99a2478b9efc4176c0ef364b683b4d78539f9a70268963ee92ba1f  kape.db   (start)
ae763b65cc99a2478b9efc4176c0ef364b683b4d78539f9a70268963ee92ba1f  kape.db   (end)
```

Everything ran on `.work/redesign/j01.db` at `:3041`. `:3020` was never touched.

## The one line outside my files

`src/routes/admin.tsx:413`, and nothing else in that file:

```diff
-		<div className="min-h-screen flex bg-card text-foreground">
+		<div className="admin min-h-screen flex bg-card text-foreground">
```

That is the anchor the whole token layer scopes to. J02 owns the rest of the file, including
swapping `bg-card text-foreground` for `bg-admin-bg text-admin-ink`, which I deliberately left
alone.

## What changed

**Tokens (F01).** 21 tokens under `.admin` in `src/styles.css`, derived from the same
`--paper-*` and brand inputs the public layer uses, each declared once, `light-dark()` where the
modes differ, oklch only, all registered in `@theme inline`. The two non-inheritances are in
`@layer base` so a call site can still override: `body:has(.admin)::before { display: none }`
kills the radial texture, and `.admin :is(h1,h2,h3,h4)` puts admin headings on `--font-sans`.

**Seven existing `ui/*` retuned**, radix kept, none rewritten. `Button` is now
`primary|secondary|ghost|danger` × `sm|md|icon` (F04) and a disabled button keeps its colour,
loses saturation and carries its reason (F05).

**Five new primitives**: `Card` (F03), `Badge` (F07), `Table` (F06), `PageHeader` with
breadcrumbs (F08), `Skeleton` (F12). Plus `EmptyState` moved to `ui/` with an icon slot.

**`form-ui`, `list-ui`, `ActionMenu` reworked onto them with their APIs frozen.** `Dialogs`
restyled. `AdminIcon` moved to lucide (F10). `MediaThumb` deleted.

## Acceptance

### 1. `bun run test`

```
 Test Files  47 passed (47)
      Tests  429 passed (429)
```

Baseline was 399 / 43. The four new files are `src/styles.admin.test.ts`,
`src/components/ui/primitives.test.tsx`, `src/components/admin/admin-api.test.ts` and
`src/components/admin/AdminIcon.test.tsx`.

### 2. `bunx tsc --noEmit`

```
$ bunx tsc --noEmit
EXIT=0
```

No output.

### 3. `bun run lint`

```
Checked 296 files in 201ms. No fixes applied.
Found 8 errors.
```

Eight, the baseline, and all eight are the pre-existing `noArrayIndexKey` in files I do not own:

```
src/components/admin/CampaignForm.tsx:298:22     lint/suspicious/noArrayIndexKey
src/components/admin/FormBuilder.tsx:280:16      lint/suspicious/noArrayIndexKey
src/components/admin/ProjectForm.tsx:242:20      lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:175:17  lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:282:16  lint/suspicious/noArrayIndexKey
src/components/admin/SectionsBuilder.tsx:362:21  lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:373:14               lint/suspicious/noArrayIndexKey
src/routes/admin.footer.tsx:80:15                lint/suspicious/noArrayIndexKey
```

I removed none. I added and then cleared twelve of my own: `table.tsx` writes `role="table"`,
`role="row"` and so on explicitly, which biome calls redundant. It is right at desktop and wrong
below `md`, where `display: block` takes the implicit roles away — so the roles stay and carry a
`biome-ignore` naming that reason. Two `noUselessFragments` infos in the new test file were
fixed rather than suppressed.

### 4. `bun run build`

```
dist/server/assets/PageForm-DskIOnWd.js                        51.27 kB │ gzip: 11.91 kB
dist/server/server.js                                          67.78 kB │ gzip: 17.34 kB
dist/server/assets/SectionRenderer-Sen5qhZU.js                 83.32 kB │ gzip: 18.51 kB
dist/server/assets/router-BKqhJTnB.js                         257.46 kB │ gzip: 63.08 kB

✓ built in 1.46s
```

Exit 0. **This rewrote `dist/`,** which UAT-C had flagged as stale. See "for the lead" below.

### 5. Public tokens unmoved

Two halves. The unit guard is `src/styles.admin.test.ts`, which freezes the declaration text of
all 39 `:root` tokens and additionally asserts the set is unchanged, so a token cannot be added
either.

The browser half is a real before/after: `git worktree add /tmp/j01-before HEAD` on a second dev
server at `:3042`, against the same database copy. Same page, same tenant theme, both modes.

`/en`, **before** (`:3042`, HEAD `fa65dea`) and **after** (`:3041`, this branch) — identical:

| | light | dark |
|---|---|---|
| `--background` | `light-dark( oklch(0.985 calc(0.012 * 1) calc(80 + 0)), oklch(0.19 calc(0.015 * 1) calc(60 + 0)) )` | same |
| `--foreground` | `light-dark( oklch(0.22 calc(0.04 * 1) calc(40 + 0)), oklch(0.95 calc(0.012 * 1) calc(85 + 0)) )` | same |
| `--primary` | `light-dark( oklch(0.30 0.10 255), oklch(0.62 0.13 250) )` | same |
| `--accent` | `light-dark( oklch(0.68 0.19 35), oklch(0.70 0.19 35) )` | same |
| `--border` | `light-dark( oklch(0.88 calc(0.02 * 1) calc(70 + 0)), oklch(0.34 calc(0.015 * 1) calc(60 + 0)) )` | same |

`--card`, `--muted`, `--muted-foreground`, `--destructive`, `--palm`, `--ring` and `--input`
were dumped too and also match.

What the page actually paints, which is the check that matters:

| | before | after |
|---|---|---|
| `body` background, light | `oklch(0.985 0.012 80)` | `oklch(0.985 0.012 80)` |
| `body` colour, light | `oklch(0.22 0.04 40)` | `oklch(0.22 0.04 40)` |
| `body` background, dark | `oklch(0.19 0.015 60)` | `oklch(0.19 0.015 60)` |
| `body` colour, dark | `oklch(0.95 0.012 85)` | `oklch(0.95 0.012 85)` |
| `h1` font | `Fraunces, Battambang, Georgia, serif` | `Fraunces, Battambang, Georgia, serif` |
| `body::before` display | `block` | `block` |

And the leak check, on `/en`:

```
--admin-bg on the public body: (unset)
```

### 6. Every primitive rendered

Four images, 1440 and 390, light and dark:

```
.work/redesign/shots/j01-1440-light.png
.work/redesign/shots/j01-1440-dark.png
.work/redesign/shots/j01-390-light.png
.work/redesign/shots/j01-390-dark.png
```

They were taken from a scratch route, `src/routes/admin.j01.tsx`, rendering every `Button`
variant × size including all four disabled, all six `Badge` tones, all four `Card` paddings and
all six tones, a `Table` inside `TableScroll`, `PageHeader` with breadcrumb + actions + toolbar,
`FormSection` with `Field`, `Select`, `Textarea`, `Switch`, `Slider`, `Skeleton`, `EmptyState`
and both `ListStatus` states. **The route was deleted afterwards and `routeTree.gen.ts`
restored**, because `src/lib/modules.test.ts` correctly fails any admin route with no permission
area — I did not weaken that test to get past it.

Measured on that page, at 1440:

```
table row heights        [56, 56, 56]
Button sm / md / icon    [32, 40, 36]
Input height             40
Select trigger height    40
ActionMenu trigger       36
```

Every number is the one the density scale asks for. Two things I had to correct to get there:
`TD` was `py-3`, which a 36px icon button pushed to a 61px row, and `Input` needed an explicit
`h-10`.

### 7. `Table` below `md`

At 390px, stacked cards, nothing clipped, no horizontal scroll anywhere on the page:

```
viewport                    390
TableScroll clientWidth     310
TableScroll scrollWidth     310
table clientWidth           310
table scrollWidth           310
documentElement clientWidth 390
documentElement scrollWidth 390

table display               block
tbody display               block
row display                 block
row height                  191      (a card, not a 56px row)
thead position              absolute (sr-only — still read, not seen)
first cell ::before content "Title"
roles                       { table: "table", tbody: "rowgroup", tr: "row", td: "cell" }
```

The roles are the point: `display: block` strips the implicit ones, so a stacked table would
otherwise reach a screen reader as a pile of anonymous text.

### 8. `Select` by keyboard

Radix earns it. Accessible name **"Status"**, role **`combobox`**; options are `role="option"`
inside a `role="listbox"`.

| Step | What happened |
|---|---|
| focus the field before it, then `Tab` | `BUTTON role=combobox aria-label="Status" aria-expanded=false`, text "Live" |
| `Enter` | `aria-expanded=true`, listbox appears, focus on the option `Live`, `aria-selected=true`. Options: `Live selected=true`, `Draft selected=false`, `Archived selected=false` |
| `ArrowDown` | focus `Draft`, `role=option` |
| `ArrowDown` then `ArrowUp` | back on `Draft` |
| `Enter` | trigger reads "Draft", `aria-expanded=false`, listbox gone, `focus === trigger` → `true` |
| `Space` | `aria-expanded=true`, listbox back, focus on `Draft` |
| `Escape` | `aria-expanded=false`, listbox gone, value still "Draft" (unchanged), `focus === trigger` → `true` |
| type `a` on the closed trigger | trigger reads "Archived" — typeahead, like a native select |

The stop condition did not fire. The radix select is keyboard-complete and the conversions can
go ahead, each proving it at its own call site.

### 9. `form-ui` API unchanged

Signatures as the compiler sees them, HEAD vs this branch, produced by the same script run in
both trees. Full diff:

```diff
- FormActions: ({ saving, label, savedAt, dirty, children, }: { saving?: boolean | undefined; label: string; savedAt?: string | null | undefined; dirty?: boolean | undefined; children?: ReactNode; }) => Element
- TextField: ({ label, required, hint, error, ...input }: { label: string; required?: boolean | undefined; hint?: string | undefined; error?: string | null | undefined; } & InputHTMLAttributes<HTMLInputElement>) => Element
- cancelButtonClass: "rounded-full border border-border px-5 py-1.5 …"
- fieldInput:        "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm …"
- fieldLabel:        "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5"
+ cancelButtonClass: string
+ fieldInput:        "w-full min-w-0 rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-base …"
+ fieldLabel:        "block text-[13px] font-medium text-admin-ink mb-2"
```

Unchanged, character for character:

```
EditorGrid: ({ main, aside, }: { main: ReactNode; aside: ReactNode; }) => Element
EditorHeader: ({ title, saving, savedAt, saveLabel, dirty, children, }: { title: string; saving?: boolean | undefined; savedAt?: string | null | undefined; saveLabel?: string | undefined; dirty?: boolean | undefined; children?: ReactNode; }) => Element
Field: ({ label, required, hint, error, children, }: { label: string; required?: boolean | undefined; hint?: string | undefined; error?: string | null | undefined; children: (props: FieldControlProps) => ReactNode; }) => Element
FieldControlProps
FormSection: ({ title, description, children, }: { title: string; description?: string | undefined; children: ReactNode; }) => Element
```

The two deletions are the sanctioned ones. Zero importers confirmed immediately before, with
`grep -a`:

```
$ grep -a -rn "\bTextField\b" src/ | grep -v "form-ui.tsx"
[exit 1]
$ grep -a -rn "\bFormActions\b" src/ | grep -v "form-ui.tsx"
[exit 1]
```

The three class strings changed *contents* — that is the restyle, and it is the point of them
being exported. `cancelButtonClass` widens from a string literal type to `string` because it is
now `buttonVariants({ variant: "secondary", size: "md" })` rather than a literal. Nothing can
depend on the literal type: it is only ever interpolated into `className`. All three are now the
primitives' own strings rather than copies, so a hand-rolled `<input>` and an `<Input>` cannot
drift apart again.

`FormActions`'s submit was the second of the two primary button sizes inside this one file
(`:45` vs `:225`). There is now one, and it is `Button size="md"`.

### 10. `list-ui` and `ActionMenu` API unchanged

`ActionMenu`, zero difference:

```
ActionItem
ActionMenu: ({ items, label, }: { items: ActionItem[]; label?: string | undefined; }) => Element
```

`list-ui`, one difference and it is the one `DESIGN.md` asks for:

```diff
- EmptyState: ({ title, description, action, }: { title: string; description?: string | undefined; action?: ReactNode; }) => Element
+ EmptyState: ({ title, description, action, icon, className, }: { title: string; description?: string | undefined; action?: ReactNode; icon?: ReactNode; className?: string | undefined; }) => Element
```

Both additions are optional, so every existing call still type-checks. `EmptyState` now lives in
`ui/empty-state.tsx` and `list-ui` re-exports it; the ten consumers keep their import.

The other seven are unchanged, character for character:

```
ListSearch: ({ value, onChange, label, placeholder, status, }: { value: string; onChange: (next: string) => void; label: string; placeholder: string; status?: string | undefined; }) => Element
ListState
ListStatus: ({ state, error, onRetry, }: { state: ListState; error?: unknown; onRetry: () => void; }) => Element | null
TableScroll: ({ label, children, }: { label: string; children: ReactNode; }) => Element
matchesQuery: (query: string, ...fields: (string | number | null | undefined)[]) => boolean
removeWithRollback: <T>(rows: T[], setRows: Dispatch<SetStateAction<T[]>>, doomed: (row: T) => boolean, run: () => Promise<unknown>) => Promise<boolean>
useListQuery: <T>(load: () => Promise<T[]>) => { rows: T[]; setRows: Dispatch<SetStateAction<T[]>>; state: ListState; error: unknown; reload: () => Promise<void>; }
```

`ActionMenu`'s keyboard behaviour is intact, including the part that reads as a detail and is
not — arrows skip a disabled item:

```
menu open        true, aria-label "Row actions"
focus            "Edit" role=menuitem
items            Edit tabindex=0 · Duplicate tabindex=-1 disabled · Delete tabindex=-1
ArrowDown        landed on "Delete"      (skipped the disabled "Duplicate")
```

`src/components/admin/admin-api.test.ts` now pins all three surfaces so the next round cannot
rename one quietly.

### 11. `Dialogs` behaviour intact

Opened a confirm from a row-actions button (the harder path: `ActionMenu` hands focus back to
its trigger *before* running the action, so the trigger is the recorded opener).

| Step | Active element | Inside the dialog |
|---|---|---|
| Delete pressed | `DIV` the dialog panel, `aria-modal="true"`, name "Delete page" | true |
| `Tab` ×1 | `BUTTON "Cancel"` | true |
| `Tab` ×2 | `BUTTON "Confirm"` | true |
| `Tab` ×3 | `BUTTON "Cancel"` (wrapped) | true |
| `Escape` | `BUTTON aria-label="Row actions" id=j01-opener` | dialog gone |

```
focus === opening button: true
```

The toast half, also untouched and re-proved:

```
live region mounted before any toast: true   (children before: 0)
toasts at +100ms: 1, text "Edit"
toast gone after: 4502 ms
```

The live region being mounted empty from first paint is what makes the first toast get read; a
region that appears in the same frame as its message is one the screen reader was not watching.

### 12. `AdminIcon` resolves

All 31 names, rendered through `renderToStaticMarkup`, counting drawn shapes:

```
dashboard        4   LayoutDashboard     announcements    3   Megaphone
modules          2   Blocks              partners         5   Handshake
posts            5   FileText            donors           1   HeartHandshake
pages            3   Files               donations        4   Coins
projects         4   FolderKanban        campaigns        3   Target
nav              3   Menu                offices          2   MapPin
hero             3   Image               staff            4   Users
stats            4   ChartColumn         media            4   Images
languages        6   Languages           publication      2   BookMarked
settings         2   Settings            career           2   Briefcase
tag              2   Tag                 event           10   CalendarDays
news             4   Newspaper           document         4   ScrollText
story            2   BookOpen            footer           2   PanelBottom
video            2   Video               message          1   MessageSquare
gallery          5   GalleryThumbnails   forms            6   ClipboardList
team             3   UsersRound

31 names, blanks: 0
```

The fallback still holds: `not-a-real-icon` renders `Tag`, 2 shapes, not a hole. `aria-hidden="true"`
survives on every one, and `className` still passes through so the nav can size it.

`hero` and `stats` are unused and were allowed to go; I kept them, because keeping them costs one
line each and guarantees the "zero blanks" property against any name the nav config might grow.

### 13. `.work/redesign/PRIMITIVES.md`

Written. Every export, its props, a usage example, plus the scale, the token names and the two
traps — `TD`'s `label` and the fact that `Dialogs` is not on admin tokens.

## What I could not do, and why

**Nothing was blocked.** No stop condition fired. In particular the radix `Select` matched the
native one's keyboard behaviour including typeahead, so F11 is safe to proceed with.

Three things I resolved rather than pushed through, each named because a downstream job will
meet them:

**`Dialogs.tsx` is not on the admin tokens.** `DialogHost` mounts in `src/routes/__root.tsx` and
`prompt` is called from `src/components/PublicRichText.tsx`, so it renders on the public site and
always *outside* the `.admin` element. An `--admin-*` utility there resolves to nothing and
paints nothing. It was restyled to the same geometry and scale on the public tokens instead. It
also cannot use `Button`. This is documented at the bottom of `PRIMITIVES.md`; please do not let
a later job "finish the migration" here.

**`fieldInput` cannot carry a height, so a bare `<input>` using it is 38px, not 40.** It is
spread onto `<textarea>` (where a height would freeze a resizable box) and onto compact rows in
`FormBuilder` that append their own `h-8` (which a height in the shared string would override).
The `<Input>` component adds `h-10` and hits 40px exactly, so converting a raw input to `<Input>`
is the migration that lands a surface on the scale. Everything else — `Select` trigger, buttons,
icon buttons, table rows — is exact.

**`Card` has no header sub-component.** `DESIGN.md` specifies `Card` with `padding` and `tone`
and nothing else, and I did not want to invent API on the serial gate. The titled-panel pattern
is `FormSection` from `form-ui`; for anything else, `padding="none"` plus a bordered header div,
shown in `PRIMITIVES.md`. If ten route jobs end up writing that div, a `CardHeader` is a cheap
follow-up — that is the lead's call, not mine.

## Found and deliberately left alone

Bugs and smells I ran into and did not fix, per the contract:

- **`src/routes/admin.tsx:453` and `:472` use `text-[10px]`** with `tracking-[0.18em]` and
  `tracking-[0.15em]`, which F09 and the type scale both rule out. J02's file, J02's call.
- **`ListStatus` cannot shape its skeleton to the table it is replacing.** Its signature is
  `{ state, error, onRetry }` and it is frozen, so it renders a generic five-row shape at the
  right 56px rhythm rather than the actual column layout. Good enough to stop the header
  disappearing; a `columns` prop would be an API change and I did not make one.
- **`TableScroll` keeps `tabIndex={0}` below `md`,** where the table has stacked and there is
  nothing left to scroll. That is a stray tab stop on mobile. It is existing behaviour with an
  earned `biome-ignore` on it, and removing it conditionally is a behaviour change. Worth a
  ticket.
- **`AdminHeader.tsx` needed no change.** It is 29 lines of context plus a portal with no styling
  in it. It coexists with `PageHeader` as asked — `PageHeader` renders in the page body,
  `AdminHeader` portals to the topbar — and I left it byte-identical rather than touch a file
  J02 and J12 will each be holding.

## For the lead

**`bun run build` rewrote `dist/`.** UAT-C found the deployed `dist/` predated HEAD and was
serving pre-fix HTML with stale `v2` render-cache keys. Acceptance 4 required a build, so `dist/`
is now current with this branch. That does not clear the render cache or restart anything —
UAT-C's item 2 still needs its cache clear and restart, and now needs them against a `dist/`
that is newer than the one it inspected.

**Scratch artefacts, all removed:** `src/routes/admin.j01.tsx` (deleted, `routeTree.gen.ts`
restored to HEAD), the `/tmp/j01-before` worktree, and the dev servers on `:3041` and `:3042`.
`.work/redesign/j01.db` is kept so the next job can reuse it.
