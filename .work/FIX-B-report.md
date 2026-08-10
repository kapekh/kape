# FIX-B - the page editor loses work and accepts URLs that do not work

Contract: `.work/jobs/FIX-B-page-editor.md`. Evidence rows H1, H3, H5, L19, M11 of `.work/ui-audit/R1.md`.
All five are fixed and reproduced in the browser on the running dev server. Screenshots in
`.work/fix-b-shots/`.

## What landed

| file | change |
|---|---|
| `src/lib/slug.ts` | new: the segment rules, the suggestion, the title cap |
| `src/lib/slug.test.ts` | new: 11 cases |
| `src/server/repo/admin.ts` | `adminPages` handlers only: segment guard, compare-and-swap on `updatedAt`, `StaleWriteError`, `getPageForEdit` returns the version |
| `src/integrations/trpc/router.ts` | `adminPages` create/update only: `expectedUpdatedAt`, the `CONFLICT` mapping, the title cap in `pageInput` |
| `src/components/admin/PageForm.tsx` | field errors beside their field, focus, the refusal banner, the save confirmation, `maxLength`, dropdown truncation |
| `src/routes/admin.pages.$id.tsx` | holds the loaded version, offers the reload, no more error toast |
| `src/routes/admin.pages.new.tsx` | inline refusal instead of a vanishing toast, success toast on create |
| `src/routes/$.tsx` | a sectioned page keeps its title block unless a section owns the h1 |

`RichTextEditor.tsx`, `useDirty.ts`, `Dialogs.tsx`, `SectionRenderer.tsx` and everything in
`admin.ts` / `router.ts` outside `adminPages` were read only.

## Decisions

**H5 rejects rather than slugifies, and names the fix.** Silently renaming an author's URL changes
the address other people already linked to. The refusal carries the segment that would have worked:
`The URL segment cannot contain spaces. Try "ui1-slug-with-spaces".`

**The rule applies to what is being written, not to what is stored.** Client and server both skip the
check when the segment is unchanged. Page 45 (`../ui1-escape`, the audit's own row) still opens,
still saves, and still keeps its address; changing that field is what triggers the rule. Without this
the fix would have stranded every legacy row inside its own editor - I hit exactly that mid-run and
fixed it.

**The conflict check is a compare-and-swap, not a read-then-compare.** The `UPDATE` carries
`updated_at = <the version the editor loaded>` in its `WHERE`, and no rows written means the record
moved. A read-then-write would leave a window where both tabs pass the check.

**The refusal is a banner in the editor, not a toast.** M11's complaint is that a save failure lands
in the far corner for 4.5s. Save errors now sit against the Save button until the next attempt, and
field errors sit against their field. The draft is never touched on refusal; `Reload the saved
version` is a separate, explicit click, and it says what it will replace.

**H3 asks `$.tsx` a question `SectionRenderer` also answers.** `SectionRenderer` promotes a `hero`,
or else the first section carrying a title, to the page `h1`. `$.tsx` now tests the same condition to
decide whether to wrap the page in `SubPage`. That is a duplicated rule, and I would rather have
exported it - `SectionRenderer.tsx` is spoken for, so it stays duplicated and commented. Blast radius
measured against the database before and after: of 28 pages with sections, 27 render byte-identically
and exactly one changes, `ui1-audit-page`, the audit's own repro.

**Title cap 120.** The longest real title on this site is 44 characters; the audit's 300-character row
is the only one over the cap. `maxLength` stops new ones, `pageInput` refuses them server-side, and the
one stored row gets a message beside the field rather than a silent truncation of someone's text.

**Segment refusals return 500, not 400.** They throw a plain `Error` like `requireFreeSlug` beside
them, so the message reaches `saveErrorMessage` intact. Giving mine a `BAD_REQUEST` and leaving the
duplicate-slug guard on 500 would put two patterns in one handler; the whole family is worth one sweep
later.

## Evidence

### 1. Gates

```
$ bunx tsc --noEmit          # silent
$ bun run lint
Found 8 errors.              # the round's baseline, all noArrayIndexKey
$ bunx biome format <my 8 files>
Checked 8 files in 21ms. No fixes applied.
```

```
$ bun run test
 Test Files  2 failed | 34 passed (36)
      Tests  4 failed | 347 passed (351)
```

347 passing over 36 files, against the floor of 333 over 33. The four failures are all in
`useDirty.test.ts` and `useDirty.async.test.tsx`. `src/components/admin/useDirty.ts` was last written
at 10:05, one minute before that run, by the pane that owns it; my contract puts it out of scope and
I did not touch it. With that hook's tests excluded:

```
$ bunx vitest run --exclude "**/useDirty*"
 Test Files  33 passed (33)
      Tests  345 passed (345)
```

Earlier in the run the same suite was red on `/admin/forbidden` missing from `NAV_AREA`, also another
pane's file; that one has since been registered and passes.

### 2. H1 - the two-tab overwrite, reproduced and refused

Two tabs of one signed-in admin on `/admin/pages/48`, the audit's exact repro:

```
{
 "tabBSaved": "Saved 10:03:07 AM",
 "tabARefused": {
  "banner": "Someone else changed this record. Reload the page and try again.Reload the saved versionYour draft is still on screen. Reloading replaces it with what is stored.",
  "reloadOffered": true,
  "draftStillOnScreen": "TAB-A WROTE THIS"
 },
 "storedAfterBothSaves": "TAB-B WROTE THIS",
 "afterReloadInTabA": { "brief": "TAB-B WROTE THIS", "bannerGone": true },
 "tabASavesAfterReload": "Saved 10:03:13 AM"
}
```

A saved second and was refused; A's draft is still in the field; what is stored is B's text, not A's.
`h1-tab-a-refused.png` shows the banner, the reload button and `TAB-A WROTE THIS` still on screen.
`h1-tab-a-reloaded.png` shows the same tab after taking the offer.

### 3. H3 - a sectioned page ships with its title

Created with a title and a brief, published, one Rich text section added, saved, then read as a
visitor:

```
{
 "h3": { "h1Count": 1, "h1Text": "FIX-B H3 page", "hasBrief": true },
 "heroPageUnchanged":         { "h1Count": 1, "h1Text": "Where every Cambodian child learns, dreams, and rises." },
 "titledSectionPageUnchanged":{ "h1Count": 1, "h1Text": "Our Team" },
 "auditPage43":               { "h1Count": 1, "h1Text": "UI1 Audit Page" }
}
```

`document.querySelectorAll('h1').length` is 1 and the `h1` is the title. The audit's own page 43 was
0 and is now 1. The home page, whose hero renders its own `h1`, still has exactly one, and so does a
collection landing whose first section carries a title - no page gained a second.
Screenshot: `h3-public-page.png`.

### 4. H5 - the segment is validated on both sides

In the editor:

```
{
 "h5spaces": { "error": "The URL segment cannot contain spaces. Try \"ui1-slug-with-spaces\".", "stillOnNewPage": true },
 "h5escape": { "error": "The URL segment cannot contain a slash. Try \"ui1-escape\".",          "stillOnNewPage": true },
 "created":  { "url": "http://localhost:3011/admin/pages/46" }
}
```

Screenshots `h5-spaces-refused.png`, `h5-escape-refused.png`, `h5-valid-saved.png`.

The same values sent straight at the mutation with a real admin cookie, no browser involved:

```
$ curl -s -X POST http://localhost:3011/api/trpc/adminPages.create -H "cookie: $COOKIE" -d '{"json":{...,"segment":"ui1 slug with spaces",...}}'
{"error":{"json":{"message":"The URL segment cannot contain spaces. Try \"ui1-slug-with-spaces\".", ...

--- segment: ../ui1-escape
{"error":{"json":{"message":"The URL segment cannot contain a slash. Try \"ui1-escape\".", ...

--- segment: Direct.Probe
{"error":{"json":{"message":"The URL segment cannot contain a dot. Try \"direct-probe\".", ...

--- segment: fix-b-direct
{"result":{"data":{"json":47}}}
```

The stack in the refusal names `requireValidSegment` in `src/server/repo/admin.ts`, so the rule is in
the repo layer and every caller gets it. A valid segment still creates the page.

### 5. Regression - the duplicate slug is still caught

```
"duplicate": { "banner": "A page already exists at \"fix-b-probe\". Choose a different URL." }
```

Screenshot `h5-duplicate-refused.png`. It now reads in the banner instead of a 4.5s toast.

### 6. L19 - the 300-character title

```
{
 "l19":       { "typedLength": 120, "maxLength": "120" },
 "l19legacy": { "storedTitleLength": 300, "longestOptionLabelInParentPicker": 68 },
 "l19refusal":{ "focused": "page-title-en",
                "error": "The English title is 300 characters. The limit is 120.",
                "ariaInvalid": "true", "ariaDescribedBy": "page-title-error-en" },
 "l19afterFix": { "confirmation": "Saved 10:02:10 AM" }
}
```

Pasting 300 characters now lands 120. The stored 300-character row opens, says why it will not save,
focuses the field, and saves once shortened - with its illegal segment untouched and accepted, which
is the legacy path from the decision above. The parent picker's longest option is 68 characters, not
300. Screenshot `l19-legacy-title.png`.

### 7. M11 - the error beside the field

Saving a new page with the segment empty:

```
{
 "focused": "page-segment",
 "ariaInvalid": "true",
 "ariaDescribedBy": "page-segment-error page-segment-url",
 "errorText": "The URL segment is required.",
 "errorIsDescribed": true
}
```

Screenshot `m11-empty-segment.png` - the message sits under the field, the field is outlined, and
focus is in it. A save that works now says `Saved 10:02:10 AM` in a live region beside the button
(`m11-save-confirmed.png`); creating a page toasts `Page created.` on its way to the editor.

### 8. Slug tests, and one of them mutated

```
$ bunx vitest run src/lib/slug.test.ts
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

Covering spaces, `..`, `/`, uppercase, a leading dash, a trailing dash, an empty segment, a valid
segment, a Khmer segment, and the suggestion. With the dot rule deleted from `RULES`:

```
 ❯ src/lib/slug.test.ts (11 tests | 1 failed) 7ms
     × refuses a dot, so `..` cannot walk out of the path 3ms

 FAIL  src/lib/slug.test.ts > segmentProblem > refuses a dot, so `..` cannot walk out of the path
AssertionError: expected null to be 'The URL segment cannot contain a dot.…' // Object.is equality

- Expected: "The URL segment cannot contain a dot. Try \"escape\"."
+ Received: null

 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
```

Rule restored, green again at 11 of 11.

## What this left in the dev database

`.work/scratch/uitest.db`, never `kape.db`.

- Page 48 `fix-b-h3`, published, kept as the H3 evidence.
- Pages 46 and 47, the two probes, deleted through `adminPages.delete`.
- Page 45, the audit's `../ui1-escape` row: its segment is untouched, but its 300-character title is
  now `UI1 escape page` and its brief reads `Touched by FIX-B.` - that fixture was consumed proving
  L19. The illegal segment, which is the H5 fixture, is still there.
