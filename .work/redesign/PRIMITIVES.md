# Admin primitives

Frozen by J01. Twelve jobs build against this page rather than against the source.

Everything below only works inside the admin shell, which sets `.admin` on its root in
`src/routes/admin.tsx`. Outside it the `--admin-*` tokens are undefined and a token-based
utility paints nothing. `Dialogs.tsx` is the one exception and is explained at the bottom.

## The scale

Use these and nothing else. If you need a value that is not here, ask the lead.

| | |
|---|---|
| Spacing | `1 2 3 4 6 8 12` — 4, 8, 12, 16, 24, 32, 48px |
| Radius | `rounded-lg` controls · `rounded-xl` containers · `rounded-full` pills and avatars |
| Motion | `transition-colors duration-150 ease-out`, or `duration-200` for transform and size |
| Density | table row 56px · field 40px · icon button 36px · topbar 64px |

Type, as literal class strings:

| Role | Classes |
|---|---|
| Page title | `text-xl font-semibold text-admin-ink` |
| Section title | `text-base font-semibold text-admin-ink` |
| Body, table cell | `text-sm text-admin-ink` |
| Field label | `text-[13px] font-medium text-admin-ink` |
| Help text, meta | `text-[13px] text-admin-ink-muted` |
| Table header | `text-xs font-medium uppercase tracking-wide text-admin-ink-muted` |

Sentence case throughout. The uppercase micro-label survives in the table header and nowhere else.
`text-[10px]` and `text-[11px]` are out.

## Tokens

Surfaces: `--admin-bg` `--admin-panel` `--admin-panel-raised`
Lines: `--admin-border` `--admin-border-strong`
Text: `--admin-ink` `--admin-ink-muted` `--admin-ink-subtle`
Accent: `--admin-accent` `--admin-accent-soft` `--admin-focus`

Status tones, each a foreground and a `-soft` background:
`--admin-live` `--admin-draft` `--admin-warning` `--admin-danger` `--admin-neutral`.
`accent` reuses `--admin-accent` / `--admin-accent-soft`.

Every one is registered in `@theme inline`, so they are Tailwind utilities:
`bg-admin-panel`, `text-admin-ink-muted`, `border-admin-border`, `ring-admin-focus/50`.

There is no `--admin-shadow`. Use the existing `shadow-[var(--shadow-soft)]`.

## Button — `#/components/ui/button.tsx`

```tsx
<Button>Save page</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" disabled disabledReason="Delete the pages under it first.">Delete</Button>
```

| Prop | Values | Default |
|---|---|---|
| `variant` | `primary` `secondary` `ghost` `danger` | `primary` |
| `size` | `sm` (32px) `md` (40px) `icon` (36px) | `md` |
| `asChild` | render as the child element, e.g. a `<Link>` | `false` |
| `disabledReason` | why it is disabled | — |

Plus every `<button>` prop.

`disabledReason` sets `title` and an `aria-describedby` on an `sr-only` span, and only while
`disabled` is set. It is ignored under `asChild`, where there is no second child to hang the
hint on. A disabled button keeps its colour and loses saturation; it deliberately does **not**
set `pointer-events: none`, because a tooltip on an element the pointer cannot reach never opens.

`buttonVariants({ variant, size })` is exported for the two places that need the string rather
than the component — `cancelButtonClass` is one.

## Badge — `#/components/ui/badge.tsx`

```tsx
<Badge tone="live">Published</Badge>
<Badge tone="neutral" dot={false}>12</Badge>
```

`tone`: `live` `draft` `warning` `danger` `neutral` `accent`. Default `neutral`.
`dot`: default `true`; turn it off for a count or a plain tag, where there is no state to signal.

A dot plus a label, not a filled pill. The label always carries the state, so colour is never
the only channel.

## Card — `#/components/ui/card.tsx`

```tsx
<Card>…</Card>
<Card padding="lg" tone="warning">…</Card>
<Card padding="none"><div className="border-b border-admin-border px-4 py-4">…</div></Card>
```

`padding`: `none` `sm` (12px) `md` (16px) `lg` (24px). Default `md`.
`tone`: the same six status tones. Default `neutral`, which is the plain panel.

Card has no header sub-component on purpose. For a titled panel of fields use `FormSection`
from `form-ui`; for anything else, `padding="none"` and a bordered header div, as above.

## Table — `#/components/ui/table.tsx`

```tsx
<TableScroll label="Pages">
  <Table>
    <THead><TR><TH>Title</TH><TH align="right" width={120}>Updated</TH></TR></THead>
    <TBody><TR><TD label="Title">About us</TD><TD label="Updated" align="right">2 days ago</TD></TR></TBody>
  </Table>
</TableScroll>
```

`TH` and `TD` take `align` (`left` `center` `right`, default `left`) and `width`
(`string | number`, applied as a style, not the deprecated attribute).
`TD` also takes `label`.

**`label` is not optional in practice.** Below `md` the table becomes a stacked card list and
each cell prints its `label` beside its value. A cell with no label shows the value alone, which
is right for an actions column and wrong for everything else.

Row height is 56px and comes from `h-14` on `TR`. Keep cell content under 40px tall or the row
grows. The explicit `role` on every part is what survives `display: block`; do not remove them,
and do not "fix" the biome suppressions that let them through.

## PageHeader — `#/components/ui/page-header.tsx`

```tsx
<PageHeader
  title="Pages" description="Every page on the site."
  breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "Pages" }]}
  actions={<Button>New page</Button>}
  toolbar={<ListSearch … />} />
```

`title` (required), `description`, `breadcrumb`, `actions`, `toolbar`, plus every `<header>` prop.

`breadcrumb` is `{ label, to? }[]`. `to` is typed as the router's own `to`, so a literal route
path type-checks. The last crumb is never a link and carries `aria-current="page"`.
`title` renders as the page's `<h1>`.

`PageHeader` renders in the page body. `AdminHeader` still portals into the topbar and the two
coexist; a surface picks one.

## Skeleton — `#/components/ui/skeleton.tsx`

```tsx
<Skeleton className="h-4 w-32" />
<SkeletonRows rows={5} />
```

Both are `aria-hidden`. Whoever renders them owns the announcement — `ListStatus` renders an
`sr-only` "Loading…" next to them. The pulse is behind `motion-safe:`.

The rule the primitive exists to enforce: a loading state is the shape of the thing being
loaded, and the page header stays put while it loads.

## EmptyState — `#/components/ui/empty-state.tsx`

```tsx
<EmptyState icon={<FolderOpen />} title="No campaigns yet"
  description="A campaign groups donations behind one goal."
  action={<Button>New campaign</Button>} />
```

`title` (required), `description`, `action`, `icon`, `className`.
`list-ui` re-exports it, so its ten consumers keep their existing import.

Two cases, two wordings: nothing exists yet (offer the create action) reads differently from
nothing matches the filter (offer to clear it).

## Form controls

`Input`, `Textarea`, `Label`, `Select`, `Switch`, `Slider` — all in `#/components/ui/`,
all radix-backed where radix applies, all taking their underlying element's props.

`Select` is the radix select and replaces the native `<select>`. It is keyboard-complete:
Enter and Space open, arrows move, Enter selects, Escape closes without changing the value,
focus returns to the trigger, and typing jumps to a match on the closed trigger.
Give the trigger an accessible name and `className="w-full"` in a form:

```tsx
<Select value={status} onValueChange={setStatus}>
  <SelectTrigger className="w-full" aria-label="Status"><SelectValue placeholder="Choose a status" /></SelectTrigger>
  <SelectContent><SelectItem value="live">Live</SelectItem></SelectContent>
</Select>
```

**Every job that converts a native select proves the keyboard sequence in its acceptance.**

`inputClass` is exported from `input.tsx` and is the same string as `fieldInput`. It carries no
height, because it is also spread onto textareas and onto compact rows that append their own
`h-8`. A bare `<input className={fieldInput}>` therefore renders 38px; the `<Input>` component
adds `h-10` and renders the 40px the scale asks for. Converting a raw input to `<Input>` is how
a surface lands on the scale.

## The three frozen modules

`form-ui`, `list-ui` and `ActionMenu` were restyled onto the primitives and **their exported
names and signatures did not change**. `src/components/admin/admin-api.test.ts` is the guard.

`form-ui`: `fieldInput` `fieldLabel` `cancelButtonClass` `EditorHeader` `EditorGrid`
`FormSection` `Field` `FieldControlProps`. `TextField` and `FormActions` were deleted; they had
no call sites.

`list-ui`: `ListState` `useListQuery` `ListStatus` `EmptyState` `TableScroll` `ListSearch`
`matchesQuery` `removeWithRollback`.

`ActionMenu`: `ActionMenu` `ActionItem`. Its keyboard behaviour and its `label` prop were earned
one bug at a time and are not to be touched. The menu is `w-36` and `toggle()` hardcodes 144px
to position it — changing one without the other puts the menu in the wrong place.

## Dialogs is not on these tokens

`DialogHost` is mounted in `src/routes/__root.tsx` and `prompt` is called from
`src/components/PublicRichText.tsx`, so `Dialogs.tsx` renders on the public site as well as in
the admin — always outside `.admin`, where every `--admin-*` token is undefined.

It was restyled to the same geometry and scale using the **public** tokens (`--border`,
`--card`, `--foreground`, `--accent`, `--destructive`). Do not convert it to admin tokens or to
`Button`, and do not import it as an example of the admin style.
