# A11Y pass - what landed, what is still standing

Branch `a11y-pass`, off `72ddef5`. Four commits.

Lint went from 142 errors / 30 warnings to 20 errors / 30 warnings.
The 20 are 8 `noArrayIndexKey`, which J12 left on purpose and this job did not touch, plus 12
`noLabelWithoutControl` that are blocked on a decision someone else owns. All 134 a11y errors in the
brief are accounted for: 122 fixed, 12 written down below.

Gates after each commit: `bunx tsc --noEmit` silent, `bun run test` 269 passed across 24 files,
`bunx biome format src` clean over 247 files, `git diff --stat bun.lock package.json` empty.

One deviation to flag: the dev server ran on **3002**, not 3001. Ports 3000 and 3001 are both held
by vite processes whose cwd is `/home/userx/workspace/kape`, which I was told not to touch, so
killing them was off the table. 3002 served this worktree; I confirmed the pid's cwd before using it.

## The 21 SVGs - commit `cca407c`

Every one turned out to be decorative: a chevron inside a button that already says "Programmes", a
shield beside the word "secure", a magnifier sitting on top of a search input. Giving them a
`<title>` would make a screen reader read the picture and then the label, so they got
`aria-hidden="true"` instead. None needed a title, because in none of them was the icon the only
thing carrying the meaning.

Three buttons had no text and leaned on the `title` attribute alone for their name. Hiding the icon
would have left `title` as the last remaining source, so they got an explicit `aria-label`: Copy URL
and Delete in the media grid, and New page in the page switcher.

Verified on `/admin/media`: 133 of 138 SVGs report `aria-hidden`, and the 5 that do not all belong to
the TanStack devtools overlay, not to app markup. On the public home page, 9 of 9 app SVGs are hidden
and no `<a href="#">` survives.

## The 7 static handlers and 6 singletons - commit `325a349`

Four were genuine controls wearing a `div`, and became buttons: the mobile drawer scrim, and the
scrims behind the map picker, the media library and the org-chart person editor. Each has an explicit
close label, and each panel gained `relative` so it keeps stacking above the scrim.

The page-editor divider was a mouse-only splitter. It now takes focus, answers Arrow keys, Home and
End inside its existing 300-880px clamp, and publishes `aria-valuenow`.

Three more, and their reasons:

- The page switcher's option buttons sat inside `<li>` wrappers, which broke the `listbox` ownership
  its own `role="option"` depended on. They are direct children of the listbox now.
- The toast stack was a `div` with `role="status"`; it is an `<output>`, which is the element that
  role was imitating.
- `SubPage`'s media placeholder was an `<a href="#">`. It announced a destination that does not
  exist, and it is a `div` now. Nothing else in the codebase renders that component as a link.

**Four suppressions, each with a reason I would defend:**

| site | rule | why |
|---|---|---|
| `Header.tsx:393` | `noStaticElementInteractions` | Layout wrapper. Its handlers only cancel a hover timer; every menu it can open is also reachable through the nav buttons' `onClick` and `aria-expanded`. |
| `SectionRenderer.tsx:219` | `noStaticElementInteractions` | Pause region for the hero slideshow. |
| `admin.media.tsx:319` | `noStaticElementInteractions` | Drop target. Dragging a file here is a shortcut for the Upload control below. |
| `PageForm.tsx:326` | `useSemanticElements` | The rule wants `<hr>` for `role="separator"`. `<hr>` is void and cannot hold the grab handle, and a focusable splitter is a widget, not a thematic break. |

The slideshow one was not true when I wrote it, so I made it true: the region now pauses on focus as
well as hover. Measured on the home page - the active slide did not advance for 6 seconds while a
slide button held focus, then advanced within 6 seconds of blur. The media claim checks out too: the
file input is `tabIndex 0` inside a visible "↑ Upload" label.

`noAutofocus` in `admin.org-chart.tsx` is also suppressed. `NodeForm` only mounts inside the Add/Edit
person modal, which opens on an explicit click, so focus belongs in the form rather than stranded on
the trigger behind it. Confirmed live: opening the modal lands focus on the Name input.

## The 98 labels - commit `df51c8f`

86 wired, 12 left standing.

Most are wired by containment, not by id: the `<label>` wraps the control, and its text moves into a
`<span>` carrying the same classes. Containment cannot be aimed at the wrong input the way a
generated `htmlFor` can, and it leaves no ids to collide when a form repeats. Where the wrapper div
held only the label and its control, the div became the label. Where a hint paragraph follows, the
label wraps only the pair, because `<label>` takes phrasing content and `<p>` is not.

Six captions were never labels for one control, and became `fieldset`/`legend`: Impact tiers, a
card's Buttons, Social links, the cards repeater, and the two Map position blocks. The repeated
inputs beneath them got numbered `aria-label`s of their own. I tried `role="group"` with
`aria-labelledby` first; it works for AT but trips `useSemanticElements`, and `fieldset` is the
better answer anyway since it needs no ids at all.

One exception wires by id. The footer's `Field` helper picks `<textarea>` or `<input>` with a
ternary, which containment cannot express, so it uses `htmlFor` built from the settings key it
already carries - unique by construction, not minted by a script.

### Evidence

Clicking a correctly wired label moves focus to the control it names. I drove that on every rewired
form as `admin@kapekh.org`. Two false alarms had to be filtered out of the sweep first: clicking
checkbox labels toggled state and unmounted conditional fields, and `LangTabs` renders a hidden copy
of each field per language.

| route | labels wired | mis-wired | left standing |
|---|---|---|---|
| `/admin/campaigns/new` | 11 | 0 | 0 |
| `/admin/people/new` | 9 | 0 | 0 |
| `/admin/posts/new` | 6 | 0 | 2 |
| `/admin/projects/new` | 7 | 0 | 1 |
| `/admin/schools/new` | 6 | 0 | 2 |
| `/admin/offices/new` | 6 | 0 | 1 |
| `/admin/org-chart` (modal) | 2 | 0 | 2 |
| `/admin/footer` | 17 | 0 | 0 |
| `/admin/settings` | 26 | 0 | 0 |
| `/admin/forms/new` | 9 | 0 | 0 |
| `/admin/nav` | 4 | 0 | 0 |
| `/admin/languages` | 3 | 0 | 0 |
| `/admin/account` | 3 | 0 | 0 |
| `/admin/pages/new` | 3 | 0 | 0 |
| `/admin/locations` | 2 | 0 | 0 |

On `/admin/campaigns/new` the focus target was checked by placeholder, so the evidence is that the
right control took focus rather than merely some control: Title (EN) → "Where every child learns",
Slug → "every-child-learns", Goal amount → "50000". The a11y tree for that page reports every field
named - `textbox "TITLE (EN)"`, `combobox "CURRENCY"`, `spinbutton "GOAL AMOUNT (OPTIONAL)"`.

Keyboard checks, all passing:

- Org-chart scrim: focused directly, Enter closed the modal.
- Mobile drawer scrim at 420px: focused, Enter closed the drawer.
- Page-editor splitter: focused, ArrowRight then End moved `aria-valuenow` to 880 and the panel
  actually resized to 880px.

Screenshots in `.work/a11y-shots/`.

## The 12 still standing - a decision I did not make alone

Every one is a caption over `SearchableSelect`, `RichTextEditor` or `MediaPicker`. Containment does
not help: Biome only accepts a nested native control, and more importantly a screen reader gets
nothing useful either, because the real control is a `<button>` or a contenteditable buried inside
the component. Today `SearchableSelect`'s trigger announces the selected value with no field name -
"Kampong Cham, button", never "Province".

The fix is one line in each component: accept an `id` (or `ariaLabelledBy`) prop and put it on the
control it renders. That is a public props change on three shared components, which the brief says to
stop on rather than decide alone. I did not fake it with a `role="group"` wrapper - these are single
controls, not groups, and dressing them as groups to clear a count is the lie the brief warns about.

| site | control | caption |
|---|---|---|
| `OfficeForm.tsx:133` | SearchableSelect | Province |
| `PartnerForm.tsx:101` | SearchableSelect | Category |
| `SchoolForm.tsx:170` | SearchableSelect | Province |
| `SchoolForm.tsx:183` | SearchableSelect | Project |
| `PostForm.tsx:334` | SearchableSelect | Content type |
| `admin.org-chart.tsx:112` | SearchableSelect | Link to team member |
| `admin.org-chart.tsx:124` | SearchableSelect | Reports to (parent) |
| `PostForm.tsx:295` | RichTextEditor | Body |
| `ProjectForm.tsx:218` | RichTextEditor | Body |
| `SectionsBuilder.tsx:312` | MediaPicker | Image |
| `PostForm.tsx:396` | mixed by `f.kind` | authored meta field |
| `SectionsBuilder.tsx:461` | mixed by `field.kind` | authored section field |

The last two pick their control with a ternary across native and custom branches, so they need the
prop change plus a decision about which branch owns the id.

## Found while driving, fixed - commit `bc134e4`

43 controls had no accessible name at all. None carried a `<label>` element, so no rule ever fired on
them, but a screen reader announces each as a bare "edit text". They are the same shape as the
repeaters this pass captioned, so they got `aria-label`s built from their own row: the footer's link
rows, the raw settings table, the taxonomy key/label grid, the language enable toggles. Re-checked
live afterwards - `/admin/locations` and `/admin/footer` both report zero unnamed controls, with
names reading "Key for Kampong Cham", "Link 1 path".

## Two more findings, not fixed

- **Modals have no dialog semantics.** The map picker, media library and person editor are still
  plain divs. Making them honest needs `role="dialog"`, `aria-modal`, a focus trap and Escape
  handling - a feature, not a lint fix, and larger than this job.
- **Row action buttons repeat their names.** Every row in the media grid and the settings table
  offers "Save" or "Delete" with nothing distinguishing it. Same remedy as the inputs above, but it
  touches list rendering across most admin tables.
