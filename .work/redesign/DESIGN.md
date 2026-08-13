# Admin design spec

Every job builds to this document.
If a job needs something not defined here, it stops and asks the lead rather than inventing a value.

Findings referenced as `F01`-`F12` live in `docs/ui-audit.md`.

## Direction

Calm and spacious, guided.
One primary action per screen. Progressive disclosure. Inline help where a field needs it.
This is not a densification exercise: rows stay at 56px.

| Reference | What we take |
|---|---|
| Sanity / Notion | Editorial calm, the document pane, live preview as a real half of the editor |
| Stripe Dashboard | Form and settings layout, section framing, empty states, table headers |
| Linear | Keyboard affordances, restraint with colour, transition quality |

Where they disagree, calm wins.

## The one rule that outranks the rest

**No behaviour changes.** No routes removed, no props dropped, no handlers rewired, no API contracts changed, no data shapes altered.
Changes are markup, styling, layout, copy, states, transitions and component composition.
If a redesign needs a logic change to work, the job stops and reports. It does not decide.

Accessible names, `aria-*` attributes, `role`s, focus order, `inert`, and every keyboard behaviour already present are load-bearing and survive verbatim.
The prior round earned them one bug at a time.

## Layer 1: tokens

The public site's tokens are not edited. `src/styles.css` gains an admin block, scoped under `.admin`, set once on the shell root in `src/routes/admin.tsx`.
Every value derives from the existing `--brand-*` inputs so a configured tenant stays recognisable.

```
.admin {
  --admin-bg            app background, one step cooler and flatter than the public paper
  --admin-panel         card and table surface
  --admin-panel-raised  popovers, menus, dialogs
  --admin-border        hairline, the default
  --admin-border-strong section dividers and table headers
  --admin-ink           primary text
  --admin-ink-muted     secondary text, descriptions, table meta
  --admin-ink-subtle    placeholders, disabled labels
  --admin-accent        = the operator's brand accent
  --admin-accent-soft   accent at low alpha, for selected and active states
  --admin-focus         focus ring
}
```

Status tones, each a foreground and a soft background:
`live`, `draft`, `warning`, `danger`, `neutral`, `accent`.
`live` keeps `--palm`. `danger` keeps `--destructive`.

Two things the admin does not inherit:
- `body::before`, the fixed radial texture (`src/styles.css:279-287`). The admin surface is flat.
- Fraunces on headings (`src/styles.css:253-256`). Admin headings are `--font-sans`.

`src/styles.css` already enforces its own rules through `styles.test.ts`, and every new token follows them: declared exactly once, `light-dark()` where it differs by mode, registered in `@theme inline`, oklch only.

## Layer 2: scale

**Spacing.** The allowed subset, and nothing else: `1 2 3 4 6 8 12` (4, 8, 12, 16, 24, 32, 48px).
`2.5`, `1.5`, `5`, `7`, `10` and arbitrary values are out. F09 counted 10 distinct `py` values across the routes; the point is to land on seven.

**Radius.** Three, and only three.

| Token | Use |
|---|---|
| `rounded-lg` | Controls: inputs, buttons, selects, icon buttons, menu items |
| `rounded-xl` | Containers: cards, panels, tables, dialogs |
| `rounded-full` | Pills and avatars only |

`rounded-2xl`, `rounded-3xl`, `rounded-md` and bare `rounded` are out.

**Type.** Sentence case throughout. The uppercase micro-label with `tracking-[0.15em]` is part of what makes the current admin feel scattered, and it goes everywhere except the table header.

| Role | Size | Weight |
|---|---|---|
| Page title | 20px | 600 |
| Section title | 16px | 600 |
| Body and table cell | 14px | 400 |
| Field label | 13px | 500 |
| Help text, meta | 13px | 400 |
| Table header | 12px | 500, uppercase, `tracking-wide` |

`text-[10px]` and `text-[11px]` are out.

**Density.** Table row 56px. Form field height 40px. Icon button 36px. Topbar 64px, unchanged.

**Motion.** 150ms for colour and opacity, 200ms for transform and size, both `ease-out`.
Everything respects `prefers-reduced-motion`, which `src/styles.css:45-50` already honours for view transitions.

## Layer 3: primitives

All in `src/components/ui/`. J01 owns them and freezes the API before any other job starts.

The seven files already there (`button`, `input`, `label`, `select`, `slider`, `switch`, `textarea`) are radix-backed shadcn output with **zero importers repo-wide**.
They are retuned to admin tokens and adopted, not replaced. radix-ui and lucide-react are already dependencies. Nothing new is installed.

### Existing, retuned

**`Button`** (`button.tsx`). Variants `primary`, `secondary`, `ghost`, `danger`. Sizes `sm` (32px), `md` (40px), `icon` (36px).
This replaces the 12 primary and 8 secondary hand-rolled variants in F04.

Disabled (F05): keeps its shape, loses saturation, never turns into a grey slab.
A disabled primary carries a `title` and `aria-describedby` giving the reason. For a dirty gate that reason is "No changes to save."

**`Select`** (`select.tsx`). The radix select, replacing native `<select>` (F11).
This is the riskiest primitive: a native select is keyboard- and screen-reader-correct for free and the radix one has to earn it.
Every job converting a select proves keyboard operation in its acceptance.

**`Input`, `Textarea`, `Label`, `Switch`, `Slider`.** Retuned only.

### New

**`Card`** (`card.tsx`) — `padding` (`none | sm | md | lg`), `tone`. Replaces the 16 variants in F03.

**`Badge`** (`badge.tsx`) — `tone` from the status list. Replaces the 14 pill variants in F07.
Rendered as a dot plus a label, not a filled pill: it reads calmer at list density and stops relying on colour alone.

**`Table`** (`table.tsx`) — `Table`, `THead`, `TBody`, `TR`, `TH`, `TD`. `align` and `width` as props.
Replaces the 9 `th` and 27 `td` strings in F06.
Below `md` it renders a stacked card list, not a horizontal scroll (L7).

**`PageHeader`** (`page-header.tsx`) — `title`, `description`, `breadcrumb`, `actions`, `toolbar`.
One treatment for all 57 surfaces, replacing the four in F08. Breadcrumbs are new and belong here (S4).

**`Skeleton`** (`skeleton.tsx`) — the loading state preserves the layout it is loading into (F12). No more bare `Loading…` paragraphs replacing a whole table.

**`EmptyState`** — already exists in `list-ui.tsx:89`. It moves to `ui/`, keeps its API, and gains an icon slot.

## The four states, every surface

A surface is not done until all four are designed. This is the most common gap in the current admin.

| State | Rule |
|---|---|
| Loading | A `Skeleton` in the shape of the content. The page header stays put |
| Empty | Says what would be here, why it is not, and offers the one action that fixes it. A filtered-empty result is worded differently from a never-had-any |
| Error | Names what failed and offers a retry. `list-ui` already does this and is the model |
| Disabled | Never a grey slab. Carries its reason |

Add a fifth for `$id` routes: **not found**. Today `/admin/pages/43` renders a bare `Page not found.` at the top-left with no chrome and no way back (L9).

## Copy

Sentence case. No terminal punctuation on labels and buttons.
Say what happens, not what the system does: "Save page", not "Submit".
An empty state names the thing: "No campaigns yet", then the action.
Implementation never leaks into a label. `site_name_en` and `logo_url` currently appear in settings help text (G2) and come out.

## Iconography

lucide-react, already a dependency (F10).
`AdminIcon` stays as the nav's named-icon indirection and is backed by lucide.
The typographic glyphs (`↑ ↓ ＋ ✎ ✕ ❝ ▦`) in `admin.nav.tsx`, `admin.footer.tsx` and `RichTextEditor.tsx` become real icons.

**Their accessible names already exist and must survive the swap byte for byte.** An icon gets `aria-hidden="true"` and the control keeps its label.

## What no job may do

- Add a dependency. Ask first.
- Change behaviour to make a design work. Stop and report instead.
- Refactor for its own sake. `SectionsBuilder.tsx` at 954 lines is restyled in place.
- Remove an `aria-*`, a `role`, an accessible name, `inert`, or a focus behaviour.
- Fix a bug it noticed in passing, unless the bug blocks its own work. Report it to the lead.
- Add a ninth `noArrayIndexKey` lint error. Eight is the baseline and it is a delta gate.
- Touch `kape.db`, or any instance on port `:3020`.
