# J03 report, narrow `updateField` procedure

Built as contracted. `adminPages.updateField` writes one addressed field and nothing else, on `adminProcedure`.

Files touched, and only these three:

- `src/server/repo/admin.ts`, the procedure and its target parser
- `src/integrations/trpc/router.ts`, the `adminProcedure` exposure plus a per-entity gate
- `src/server/repo/admin-updatefield.test.ts`, new, 18 cases

Evidence below is pasted from two runs against `./j03.db` on port-free scripts, and from `bun run test`.
Everything under "Acceptance" went through the real tRPC caller, `trpcRouter.createCaller(...)`, so the zod input, the permission gate and the cache bust are all in the path.

## The addressing tuple

```
{ entity: "page" | "post" | "person" | "project",
  entityId: number,
  lang: string,
  target: "field:<name>"
        | "section:<sectionId>:props.<field>"
        | "section:<sectionId>:props.<items>[<n>].<field>",
  value: string,
  expectedUpdatedAt?: string | null }
```

Returns `{ wrote: "translation" | "section", cleared: boolean, updatedAt: string | null }`.
`updatedAt` is the version to send with the next save.

## Acceptance 1, nothing else dies

Page 40, `calendar/international-days`, six rows across two languages. One `updateField` writing `field:title` in Khmer.

```
===== A1 page 40, before =====
627|en|body|{"type":"doc","content":[{"type":"table","cont
625|en|excerpt|Global observances KAPE and its partners mark
623|en|title|International Days
628|km|body|{"type":"doc","content":[{"type":"table","cont
626|km|excerpt|ទិវាអន្តរជាតិដែលខេប និងដៃគូរបស់ខេបប្រារព្ធពេញម
624|km|title|ទិវាអន្តរជាតិ

updateField -> {"wrote":"translation","cleared":false,"updatedAt":"2026-08-13T02:06:59.931Z"}

===== A1 page 40, after =====
627|en|body|{"type":"doc","content":[{"type":"table","cont
625|en|excerpt|Global observances KAPE and its partners mark
623|en|title|International Days
628|km|body|{"type":"doc","content":[{"type":"table","cont
626|km|excerpt|ទិវាអន្តរជាតិដែលខេប និងដៃគូរបស់ខេបប្រារព្ធពេញម
624|km|title|ទិវាអន្តរជាតិ (កែសម្រួល)

===== A1 delta =====
rows before 6, rows after 6
rows differing: 1
  was: 624|km|title|ទិវាអន្តរជាតិ
  now: 624|km|title|ទិវាអន្តរជាតិ (កែសម្រួល)
ids identical: true
```

Row count identical, one value different, and the row ids are unchanged, so the row was updated in place rather than deleted and reinserted.
The wholesale path cannot produce that output: it deletes all six and reinserts whatever the payload carried.

## Acceptance 2, all three target forms

Page 13, `what-we-do/ict-innovation`, a hero section and a `cards` section with four items, both already overlaid in Khmer.

### `field:`

```
before: 446|en|title|ICT Innovation  //  720|km|title|បច្ចេកវិទ្យាព័ត៌មាន
updateField -> {"wrote":"translation","cleared":false,"updatedAt":"2026-08-13T02:06:59.958Z"}
after:  446|en|title|ICT Innovation  //  720|km|title|បច្ចេកវិទ្យាព័ត៌មាន (ថ្មី)
read-back km title: បច្ចេកវិទ្យាព័ត៌មាន (ថ្មី)
```

The read-back is `getPageBySlug(db, slug, "km")`, the same function the public route loader calls.

### `section:<id>:props.<field>`

```
before hero props: {"eyebrow":"What We Do","title":"ICT Innovation","lead":"From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.","image":"/uploads/6bae6f26-...jpg","i18n":{"km":{"eyebrow":"សកម្មភាពយើង","title":"បច្ចេកវិទ្យាព័ត៌មាន","lead":"ចាប់ពីបន្ទប់កុំព្យូទ័រដំបូងរហូតដល់ចំណេះដឹង AI — នាំជំនាញសតវត្សរ៍ទី ២១ ចូលទៅក្នុងគ្រប់ថ្នាក់រៀន។"}}}
updateField -> {"wrote":"section","cleared":false,"updatedAt":"2026-08-13T02:06:59.987Z"}
after hero props:  {"eyebrow":"What We Do","title":"ICT Innovation","lead":"From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.","image":"/uploads/6bae6f26-...jpg","i18n":{"km":{"eyebrow":"សកម្មភាពយើង","title":"បច្ចេកវិទ្យាព័ត៌មាន","lead":"ចាប់ពីបន្ទប់កុំព្យូទ័រដល់ AI (កែសម្រួល)"}}}
read-back km lead: ចាប់ពីបន្ទប់កុំព្យូទ័រដល់ AI (កែសម្រួល)
read-back en lead: From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.
```

A Khmer write lands in `props.i18n.km`, the English text and the shared `image` are untouched, and the two languages read back differently.

### `section:<id>:props.items[<n>].<field>`

```
updateField -> {"wrote":"section","cleared":false,"updatedAt":"2026-08-13T02:07:00.019Z"}
after b0 items:  [... ,{"title":"Online safety","body":"Helping students protect their accounts, recognise digital risks and report abuse."}]
read-back en items[3].body: Helping students protect their accounts, recognise digital risks and report abuse.
read-back km items[3].body: ជួយសិស្សការពារគណនីរបស់ពួកគេ និងស្គាល់ហានិភ័យឌីជីថល។
```

Item 3 changed, items 0 to 2 byte for byte the same, and Khmer still reads its own overlay rather than the new English.

## The repeater question, and what it costs

The renderer replaces whole keys: `props = { ...props, ...i18n[lang] }` at `src/server/repo/sections.ts:126-128`.
There is no per-key merge inside an array, so a translated repeater is not a per-item overlay.
It is a full copy of the array.

So a non-default language writing one item field does this:

1. take the existing `i18n[lang][<items>]` array if there is one, otherwise copy the shared array from `props[<items>]`
2. set the one field on the one item
3. store the whole array back under `i18n[lang][<items>]`

Demonstrated:

```
updateField -> {"wrote":"section","cleared":false,"updatedAt":"2026-08-13T02:07:00.056Z"}
overlay km items: [{"title":"បន្ទប់ ICT នៅគ្រប់សាលា NGS","body":"កន្លែងឯកទេស..."},{...},{...},{"title":"សុវត្ថិភាពអនឡាញ (កែសម្រួល)","body":"ជួយសិស្សការពារគណនីរបស់ពួកគេ..."}]
shared items unchanged: [{"title":"ICT labs in every NGS",...},{...},{...},{"title":"Online safety","body":"Helping students protect their accounts, recognise digital risks and report abuse."}]
read-back km items[3].title: សុវត្ថិភាពអនឡាញ (កែសម្រួល)
```

Three costs, all inherent to the whole-key overlay and none of them introduced here:

- **The overlay is a snapshot.** Once a language has an overlay array, adding, deleting or reordering an item in the default language does not reach it. That language keeps showing the old count and the old order until someone edits it too. The wholesale editor has the same hole today.
- **Non-text keys get duplicated.** The copy carries `image`, `href` and `buttons` along with the text, because dropping them would blank the images in that language. A later change to a shared image does not reach the copy.
- **An item field cannot fall back on its own.** Blanking one item field in a non-default language leaves that item's field empty rather than showing the default language, because the array replacement is all or nothing. The one case that does recover is an overlay array that ends up identical to the shared array: `updateField` then drops the overlay key entirely, which restores fallback for the whole repeater.

For J06 that means: offer "clear to fall back" on plain section fields, but not on repeater item fields, where clearing means empty and should say so.

## Acceptance 3, a bad target is refused

```
title                                -> TRPCError: "title" is not a field address. Expected field:<name>, section:<id>:props.<field> or section:<id>:props.<items>[<n>].<field>.
section:hero:title                   -> TRPCError: "section:hero:title" is not a field address. ...
props.title                          -> TRPCError: "props.title" is not a field address. ...
section:hero:props.items[x].title    -> TRPCError: "section:hero:props.items[x].title" is not a field address. ...
section:missing:props.title          -> TRPCError: No section "missing" on this page.
section:hero:props.image             -> TRPCError: "image" is not translatable text on a hero section. It offers eyebrow, title, lead, ctaLabel, cta2Label.
field:author                         -> TRPCError: "author" is not a translated field of a page. It has title, excerpt, body.
rows before 2, rows after 2
sections byte-identical: true
```

The last two are worth naming. A target is not just parsed, it is checked against the section's own declared fields, so an inline save cannot write `image`, `ctaHref` or any other non-text prop, and cannot invent a translation field the entity does not have.
`section:hero:props.image` is exactly the shape a tampered `data-` attribute would take.

## Acceptance 4, stale write refused

Both writers carry the same `expectedUpdatedAt`, the version they loaded.

```
===== A4 two writers, one loaded version =====
both editors loaded updatedAt = 2026-08-13T02:06:59.931Z
first  -> {"wrote":"translation","cleared":false,"updatedAt":"2026-08-13T02:07:40.291Z"}
second -> TRPCError: CONFLICT
stored: International Days (first writer)
row count: 6

===== A4b the same, on a section write =====
both editors loaded updatedAt = 2026-08-13T02:07:00.138Z
first  -> {"wrote":"section","cleared":false,"updatedAt":"2026-08-13T02:07:40.313Z"}
second -> TRPCError: CONFLICT
stored eyebrow: What We Do (first writer)
```

Same shape the wholesale path returns, a bare `CONFLICT`, so the inline UI surfaces one thing rather than two.
The refusal is a compare-and-swap in the `where` clause, not a read-then-compare, so two concurrent writers cannot both pass it.
For a section write the version check and the sections write are one `UPDATE` statement, so they cannot come apart.

## Acceptance 5, cache invalidation still automatic

`updateField` is registered as `adminProcedure`, so `clearCache` at `src/integrations/trpc/init.ts:68` runs after it, exactly as it does for `setUiString`.

```
===== A5c cache cleared by the procedure, as setUiString is =====
render_cache before: [{"key":"v4::en::what-we-do/ict-innovation"},{"key":"v4::km::what-we-do/ict-innovation"}]
render_cache after:  []
```

And the gate itself, proving it is not a bare procedure:

```
anonymous     -> TRPCError: UNAUTHORIZED
posts-only admin on a page -> TRPCError: FORBIDDEN
pages-only admin on a post -> TRPCError: FORBIDDEN
pages-only admin on a page -> {"wrote":"translation","cleared":false,"updatedAt":"2026-08-13T02:07:40.439Z"}
```

That third line needed work the contract did not ask for, and it is the one thing here worth a second look.
`adminProcedure` derives the permission area from the router key, so everything under `adminPages` is checked against `pages`.
A procedure that writes four entity types from `adminPages` would have let a pages-only admin edit post, person and project text, and would have skipped the module gate that can turn `adminProjects` off entirely.
`assertEntityAllowed` in `router.ts` re-runs both checks against the router that actually owns the row.

## Empty values

An empty value clears rather than storing a blank, which is what the wholesale path already does: `pageTranslationRows` skips any field whose value is `""`, so after a wholesale save a cleared field has no row at all.
`updateField` matches that by deleting the row.

```
updateField(field:excerpt, "  ") -> {"wrote":"translation","cleared":true,...}
after:  ... 623|en|title|... // 628|km|body|... // 624|km|title|...      (the km excerpt row is gone)
read-back km excerpt (falls back to en): Global observances KAPE and its partners mark through the ye
read-back km i18nFallback: ["excerpt"]
```

For section fields it matches `SectionsBuilder.tsx:595-606` instead: a blank drops the overlay key, and a map or an overlay left empty goes with it.

```
before hero km overlay: {"eyebrow":"សកម្មភាពយើង","title":"បច្ចេកវិទ្យាព័ត៌មាន","lead":"ចាប់ពី..."}
updateField(section:hero:props.lead, "") -> {"wrote":"section","cleared":true,...}
after hero km overlay:  {"eyebrow":"សកម្មភាពយើង","title":"បច្ចេកវិទ្យាព័ត៌មាន"}
read-back km lead: From the first computer labs to AI literacy — bringing 21st-century skills into every classroom.
read-back km i18nFallback: ["lead"]
```

The fallback signal J01 built picks the field up straight away, which is what J06 needs to show the editor that the box now holds English.

Values are trimmed, as `setUiString` trims, because a contenteditable hands back stray whitespace.
The default language of a section field is the one case where a blank stores `""` rather than deleting, because that is what `setProp` in the builder does and the key has nowhere to fall back to.

## What I refused, and why

- **`expectedUpdatedAt` on a project.** `projects` has no `updated_at` column: it is the one entity in the tuple that `timestamps` in `schema.ts` was never applied to. Ignoring the parameter there would have silently weakened the conflict refusal, so a project write carrying `expectedUpdatedAt` is refused outright with `A project has no version column, so this save cannot be checked against the copy you loaded.`, and a write without it is allowed and returns `updatedAt: null`. Page, post and person all carry the column and get the real compare-and-swap. This round has no migration, so adding the column was out of scope.
- **`field:name` on a person.** A person's name lives in the `name_en` and `name_km` columns, not in a translations row, so it is not addressable by this procedure. Only `bio` is. J07 should not emit a name marker on a person.
- **`album` as an entity.** The plan's tuple lists it, but there is no album table: an album is a post with `content_type = 'album'`, and its translations rows say `entityType = 'post'`. Accepting `album` would have written rows nothing reads. A marker on an album page must say `post`.
- **`nav_item`, `stat`, `hero_slide` and `media`.** Real translations entity types, none of them in the plan's tuple and none of them reachable by a page or post inline editor. Not wired.
- **`cards` items are allowed, but only `title` and `body`.** The `cards` field kind declares no `itemFields` in `SECTION_DEFS`, so there is nothing to validate against. Rather than refuse the kind the seeded content actually uses, `admin.ts` names the two text keys the card editor and the card renderer both agree on. Adding `itemFields` to the `cards` def in `src/lib/sections.ts` would remove that list, but that file is not mine this round.

## Acceptance 6, gates

```
$ bun run test
 Test Files  51 passed (51)
      Tests  467 passed (467)
   Duration  32.80s

$ bunx tsc --noEmit
tsc exit=0            (no output)

$ bun run lint
Checked 308 files in 534ms. No fixes applied.
Found 6 errors.

$ bun run build
✓ built in 6.34s
```

467 tests against a baseline of 449, the 18 new ones all in `admin-updatefield.test.ts`.
Lint holds at 6, the same six `noArrayIndexKey` errors carried since the redesign round, none of them in a file I touched.

## Notes for whoever picks this up

- The test harness copies `ui-strings.test.ts`: install a database into a temp dir, then run each case in a Bun subprocess. It builds its own fixture page with two languages, a hero and a `cards` repeater, so it does not depend on seeded content.
- The `field:` path bumps the version and then writes the row as two statements rather than one transaction. A failure between them leaves a bumped `updatedAt` with no text change, which costs another editor one spurious conflict refusal and loses nothing. The section path has no such window.
- `updateField` deliberately does not run `assertSectionsAllowed`. It cannot add a section or change a section's type, only the text of a field a section already declares.
- `./j03.db` in this worktree carries the demo edits from the runs above, on pages 13 and 40. It is gitignored and it is a copy.

Next: J03 is done and committed on `j03-updatefield`; J06 and J07 can build against `adminPages.updateField`, and J08 can hang prerender invalidation off it.
