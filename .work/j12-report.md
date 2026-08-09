# J12 - Lint pass report

Status: **six of eight categories done and gated. Two left, both large, neither started.**
Tree is uncommitted and category boundaries are listed below so the lead can commit them separately.

Ran at `5ed6e11`. Working tree at the start held only the two expected files (`.env.example`
modified, `scripts/import-client-assets.ts` untracked), so no other job was live.

## Result

| | errors | warnings | infos |
|---|---|---|---|
| before | 219 | 67 | 2 |
| after | **142** | **30** | **0** |

77 errors and 37 warnings cleared. Everything still standing is one of two categories that were never
started, plus 8 deliberate survivors. No rule was disabled or downgraded: `biome.json`'s `linter`
block is untouched.

## The baseline delta, measured before anything was touched

The code has not moved since `58a0fe7`. The table has.

Every rule the contract lists holds the same count at `5ed6e11` as it claimed at `58a0fe7`, with one
exception, and that exception is a miscount rather than a change.

`noDangerouslySetInnerHtml` was listed at 14 and measures 6. That is not a code change:
`git grep dangerouslySetInnerHTML` returns 10 occurrences across the same 7 files at both revisions,
so the source that rule reads is identical across the range. There are 10 call sites, the rule fires
on 6, and the other 4 carry a suppression that lands correctly. 14 was never the count of anything.
I did not re-run Biome at `58a0fe7`, which needs a checkout the contract forbids; the `git grep`
comparison is what supports this.

### What the table actually was

Not the error list, and not any single severity. Its 12 rows sum to 151 findings and mix all three:

- 81 of the 219 errors were rules it lists.
- 138 of the 219 errors were rules it does not: 134 a11y and 4 `organizeImports`.
- 61 of its 151 rows were warnings, 1 more was an info.

The single largest thing in `bun run check` was `a11y/noLabelWithoutControl` at 98 errors, 45% of the
error count on its own, and the contract never mentions it. Two scope questions followed from that
and Rithy settled both before any fixing started: **fix the a11y block as a category 0**, and **the
Do list wins over the "67 warnings are out of scope" line**, so the enumerated warning categories
were in.

### Per-rule, before and after

| rule | severity | before | after |
|---|---|---|---|
| `a11y/noLabelWithoutControl` | error | 98 | 98 |
| `correctness/useExhaustiveDependencies` | error | 35 | **0** |
| `suspicious/noArrayIndexKey` | error | 32 | **8** |
| `suspicious/noExplicitAny` | warning | 30 | 30 |
| `a11y/noSvgWithoutTitle` | error | 21 | 21 |
| `style/noNonNullAssertion` | warning | 19 | **0** |
| `a11y/noStaticElementInteractions` | error | 7 | 7 |
| `suppressions/unused` | warning | 6 | **0** |
| `style/useImportType` | warning | 6 | **0** |
| `security/noDangerouslySetInnerHtml` | error | 6 | **0** |
| `complexity/useOptionalChain` | warning | 5 | **0** |
| `assist/source/organizeImports` | error | 4 | **0** |
| `suspicious/useIterableCallbackReturn` | error | 3 | **0** |
| `suspicious/noAssignInExpressions` | error | 3 | **0** |
| `a11y/useSemanticElements` | error | 2 | 2 |
| `correctness/useJsxKeyInIterable` | error | 2 | **0** |
| `style/useExponentiationOperator` | info | 1 | **0** |
| `suspicious/useBiomeIgnoreFolder` | warning | 1 | **0** |
| `a11y` singletons (6 rules) | error | 6 | 6 |
| `deserialize` (config) | info | 1 | **0** |

## Gates, re-run after every category

`bunx tsc --noEmit` silent and `bun run format` clean over 250 files after all six. Tests:

| category | tests | files |
|---|---|---|
| 0 config + organizeImports | 266 | 24 |
| 1 mechanical | 266 | 24 |
| 2 keys + iterable returns | 266 | 24 |
| 3 assertions | 266 | 24 |
| 4 index keys | 266 | 24 |
| 5 effect dependencies | 266 | 24 |
| 7 innerHTML | 266 | 24 |

The contract's bar is 239 over 21 files; the tree was already at 266 over 24 when I started, and it
never moved off that. Its "246 files" for format is stale too, it is 250.

## Commit boundaries

Seven separable commits, in this order. Nothing in a later one depends on an earlier one except by
line number.

1. **config** - `biome.json` only.
2. **organizeImports** - `src/lib/modules.ts`, `src/lib/modules.test.ts`, `src/routes/admin.settings.tsx`, `src/server/install.ts`.
3. **mechanical** - the 7 `useImportType` files, `PublicRichText.tsx`, `FormBuilder.tsx`, `SectionRenderer.tsx`, `integrations/trpc/router.ts`.
4. **keys + iterable returns** - `Dialogs.tsx`, `admin.media.tsx`, `SectionRenderer.tsx`.
5. **assertions** - `FormRenderer.tsx`, `PageForm.tsx`, `SectionsBuilder.tsx`, `admin.media.tsx`, `admin.nav.tsx`, `page-tree.ts`, `repo/admin.ts`, `repo/i18n.ts`, `repo/nav.ts`, `repo/org.ts`, `PostForm.tsx`, `internalsources.documents.tsx`, `RichBody.tsx`.
6. **index keys** - 24 suppressions across 8 files.
7. **effect dependencies** - 20 files.
8. **innerHTML** - `RichBody.tsx`, `FormRenderer.tsx`, `admin.forms.$id.submissions.tsx`, `internalsources.index.tsx`.

## The defect this job was worth running for

**All 6 `noDangerouslySetInnerHtml` sites carried a suppression, and all 6 were dead.** They were the
entire `suppressions/unused` count, which is why the two rules cleared together.

A `biome-ignore` binds to the line directly below it. Biome anchors this diagnostic to the
`dangerouslySetInnerHTML` **attribute**, not to the element that owns it. Commit `6f4b6b2`, "Format
the tree with its own configured formatter", reflowed the JSX and pushed those attributes one to four
lines further down, out from under their comments. Every one of the six has been silently unsuppressed
since, and the rule has been firing at 6 errors that everyone read as "known, already justified".

| file | comment was | attribute is |
|---|---|---|
| `RichBody.tsx` | 28 | 30 |
| `RichBody.tsx` | 42 | 45 |
| `RichBody.tsx` | 52 | 55 |
| `FormRenderer.tsx` | 163 | 167 |
| `admin.forms.$id.submissions.tsx` | 191 | 194 |
| `internalsources.index.tsx` | 45 | 48 |

The 4 sites that never fired, in `JsonLd.tsx`, `$.tsx` and `__root.tsx`, have the comment on the
immediately preceding line, which is the only reason they work.

This is a trap the next person will fall into. A suppression that stops matching fails open and
silent: the comment still reads as a justification in review, and the only signal is a warning in a
category everyone has been told is out of scope.

## Provenance of all 10 innerHTML sites

The contract asked for this before anything was folded in. **No site needs sanitising, so there is no
behaviour change to propose here.**

| site | HTML comes from |
|---|---|
| `RichBody.tsx` x3 | admin-authored body, server-rendered by `renderBody` |
| `FormRenderer.tsx` | admin-authored content block, `renderBody` |
| `internalsources.index.tsx` | admin-authored note body, `renderBody` |
| `$.tsx` | `page.bodyHtml`, `renderBody` |
| `JsonLd.tsx` | JSON-LD the server serialises and escapes |
| `__root.tsx` | inline bootstrap script the app itself emits |
| `admin.forms.$id.submissions.tsx` | **public form submission** |

The last one is the only untrusted input, and it is the one worth stating plainly. `api.forms.$.tsx:150`
renders it through `renderBasicRichText` **at write time**, using `basicRichTextExtensions`, a
restricted allow-list of text and links with no images and no form embeds. The Tiptap static renderer
escapes text values and the allow-list drops unknown nodes, so what reaches the database is already
allow-listed HTML, not the submitter's markup. `src/lib/richtext/extensions.test.ts` covers it. The
existing comment was accurate; it just was not attached to anything.

`renderBody`, used by the other seven, is the trusted-author path and says so in its own doc comment.

## Behaviour changes forced by a lint fix

Two, both intended and both verified. Everything else in this pass is behaviour-preserving by
construction.

**1. `SectionsBuilder` dynamic-source block now guards on length, not truthiness.** Clearing
`def.sources![0]` meant hoisting `const sources = def.sources ?? []`, which turned the JSX guard from
`def.sources &&` into `sources.length > 0 &&`. The old guard let an empty array through and then read
`[0].value` off it. This is strictly safer and only differs when `def.sources` is `[]`.

**2. `RichBody`'s form-marker scan moved from `FORM_RE.exec` to `html.matchAll`.** The
`noAssignInExpressions` fix removed the `while ((m = exec()))` loop. `matchAll` clones the regex, so
the module-level global `FORM_RE` no longer carries `lastIndex` between calls and the manual
`FORM_RE.lastIndex = 0` reset is gone with it. That reset was the only thing standing between this
and a re-entrancy bug.

Exercised: the public home page renders its sections, and `RichBody` is on the `$.tsx` body path that
page uses.

## Browser verification of the effect category

Contract asks for this because a dependency fix is where something breaks silently. Run against a
throwaway install, never the repo's `kape.db`: `VACUUM INTO` a copy, then a fresh
`DATABASE_PATH=/tmp/j12-fresh.db` seeded with `db:seed:dev`. Dev server on 3117, killed afterwards,
temp DBs deleted. Screenshots in `/tmp/j12-home.png`, `/tmp/j12-admin-media.png`, `/tmp/j12-admin-nav.png`.

- **Public home** - renders fully, sections, hero, nav, the lot.
- **`/admin/media`**, the most effect-heavy screen - loaded to "0 items · 0 images", so both `reset()`
  and `fetchStats()` resolved and `loading` flipped. **One** tRPC batch, still one after 3s.
- The dependency chain that actually changed: typing in search took it to **2** batches after the
  debounce and it stayed at 2 through the next 5s. One request per input, no storm. That is the check
  that matters, since `reset` moved from a bare `[debounced, filter]` effect to a `useCallback`
  the effect depends on.
- **`/admin/nav`** - all four header fields populated with their stored values, which proves the
  `HeaderSettings` effect ran correctly after `FIELDS` was hoisted to module scope. 2 batches, settled.

One dead end worth recording: the first run showed the app's "Something went wrong / Unable to
connect" boundary on every page. That was mine, not the code's. `root-provider.tsx:12` hardcodes the
SSR tRPC base as `http://localhost:${process.env.PORT ?? 3000}`, and I had started vite on 3117
without setting `PORT`, so SSR called a port with nothing on it. **Anyone driving this app on a
non-3000 port must set `PORT` to match** or they will debug a phantom.

## Survivors: 8 errors, deliberate

`suspicious/noArrayIndexKey`, in the editor repeaters. **These are real React bugs and I did not
suppress them**, because the fix is a behaviour change and the contract says to stop and report
rather than fold one in.

`CampaignForm.tsx:296`, `FormBuilder.tsx:268`, `ProjectForm.tsx:235`, `SectionsBuilder.tsx:172`,
`SectionsBuilder.tsx:278`, `SectionsBuilder.tsx:355`, `admin.footer.tsx:74`, `admin.footer.tsx:348`.

Every one is a repeater of controlled inputs with a mid-list delete (`filter((_, n) => n !== i)`), and
four also have up/down reorder. Delete row 1 of 3 under an index key and React keeps the DOM node,
swaps the props, and hands row 2's data to the node holding row 1's focus and child state. For plain
text cells that mostly self-corrects. For the rows carrying a `MediaPicker` or a `RichTextEditor` it
does not: that child's internal state stays put and now belongs to the wrong row.

**Why it cannot be fixed here.** None of these rows has a stable identity to key on. `SectionsBuilder`
rows are arbitrary `Record<string, unknown>` out of the section's props. `FormBuilder` fields have
`f.key`, but the code itself says legacy forms carry duplicates, so it is not unique while editing.
Footer links, campaign tiers and project locations have no id either. The fix is a client-side row id
minted on load and stripped on save, which changes the persisted shape of section props. That is a
data-model change, not a lint fix.

The other 24 index-key sites were suppressed with a per-site reason: 16 in `SectionRenderer`, plus
`Footer`, `PublicOrgChart`, `SubPage`, `SupportersWall`, `slider`, `MediaLibraryDialog` and 2 in
`admin.media`. Each is either a fixed-length skeleton, a split of one string into segments where
position is the identity, a slideshow where the index *is* what the active index compares against, or
a read-only server-rendered list that cannot reorder while mounted.

## Not started

Both were in scope by Rithy's answers. Neither is begun; no file below has been touched for them.

**Category 0, a11y: 134 errors.** 98 `noLabelWithoutControl` concentrated in the admin forms
(`SectionsBuilder` and `PeopleForm` 10 each, `PostForm`/`FormBuilder`/`CampaignForm` 9 each, then a
long tail over 22 files), 21 `noSvgWithoutTitle`, 7 `noStaticElementInteractions`, 8 singletons. The
label pass is mechanical but wide, and it needs unique ids minted per field across ~25 files, where a
careless scripted pass produces duplicate ids and leaves accessibility worse than it found it.

**Category 6, `noExplicitAny`: 30 warnings.** The contract is explicit that the fix is a discriminated
prop type for the section props, not a cast that satisfies the linter and tells the reader nothing.
That is design work on `SectionRenderer`, not a lint edit.

I stopped rather than rush either. Six categories are done, gated and verified; these two are sized,
scoped and untouched, which is a better handoff than a 25-file a11y diff I could not stand behind.

## Notes for the lead

- `biome.json` has two edits, neither touching the `linter` block: `$schema` bumped 2.2.4 to 2.4.5 to
  match the installed CLI, and `"!**/feedback/**"` shortened to `"!**/feedback"`, which is what
  `useBiomeIgnoreFolder` was asking for. File count stayed at 250, so linting scope did not change.
- 19 `noNonNullAssertion` cleared and **not one needed a suppression**. Every `!` was a true claim, and
  every one had a narrowing the compiler could see. No defect hid behind any of them. The most
  interesting was `FormRenderer`'s `form!.slug`: `submit` was a hoisted `function` declaration, so TS
  discarded the `if (!form) return null` narrowing above it. Making it a `const` arrow restored the
  narrowing and the `!` fell away.
- Three `useIterableCallbackReturn` were benign, not bugs: `forEach` callbacks returning a value
  nobody read. Rewritten as `for...of`.
- Two `useJsxKeyInIterable` were false positives and are suppressed with a reason: `badge` is a single
  child of a wrapper that already has `key={r.id}`.
- Dead `eslint-disable-next-line` comments removed where a category touched them; this project has no
  eslint, so they suppressed nothing. More remain elsewhere in the tree.
- `.work/j12-count.sh` is my scratch counter. Delete it with this job. Anything scratch under `.work/`
  must not end in `.ts`: tsconfig includes `**/*.ts`, so a helper there breaks `tsc --noEmit` and
  looks like the job broke the gate.

## Next

Category 0 (a11y, 134) and category 6 (`noExplicitAny`, 30) are the whole remaining job. Take a11y
first: it is 94% of the remaining error count, and the label pass wants its own commit and its own
screenshot round.
