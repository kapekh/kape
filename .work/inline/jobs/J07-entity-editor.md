# J07 - inline editor for page and post fields

Depends on J03, J04 and J06, all verified before this goes out.
J06 built the field box in the bar; this job points it at the fields that live in the `translations` table rather than in section props.

The plan calls these the hardest kind (`docs/inline-editing-plan.md:80-88`), because the wholesale path destroys every row it is not told about.
J03 removed that hazard.
This job must use `updateField` and never `adminPages.update`.

## Files you own

- `src/components/SubPage.tsx`
- `src/routes/$.tsx`
- one new test

Nothing else.
`src/lib/inline-edit.tsx`, `InlineEditBar.tsx` and `SectionRenderer.tsx` are J06's and are already landed.
Consume the box, do not edit it.
If it cannot serve a field, stop and report.

## Do

1. Mark the page fields that render outside sections: title, excerpt and body on a page, and title, excerpt and body on a post or article.
   J04 threaded `entityId` and `lang` into these two files; use what is there rather than re-deriving it.
2. Emit `field:<name>` targets, the form J03 parses, with the `entity` matching the route's kind: `page` for a page, `post` for an article.
3. Reuse J06's editor. One box, one save path, one refusal message.
4. Honour the language rule the same way: on `/km` a field showing English opens empty and quotes the English, driven by the `i18nFallback` list already on the payload.
5. Leave the heading structure alone. One `h1` per page before and after, and no wrapper that changes the rendered text.

## Acceptance

Each item is a demonstration.
Run it, paste the output into `.work/inline/J07-report.md`.

1. **A page title saves.** `select id, lang, field, value from translations where entity_type='page' and entity_id=<id> order by lang, field` before and after: row count identical, one value changed, every other row byte for byte the same.
2. **A post title saves**, same proof, `entity_type='post'`.
3. **Khmer writes a Khmer row.** On `/km`, a field with no Khmer row gains exactly one row with `lang='km'`, and the `en` row is untouched. Paste both.
4. **Body saves.** The longest field, in the box and back out, with the rendered page after.
5. **Nothing else died.** Full translations dump for the entity before and after the four saves above, diffed. Only the intended lines move.
6. **Stale write refused.** Two tabs, second save refused, message pasted.
7. **`h1` count unchanged.** Fifteen public pages, one `h1` each, before and after.
8. **Anonymous sees nothing.** Public HTML and network log for a signed-out visitor: no chrome, no extra request.
9. **Permission gated.** `staff@kapekh.org` gets plain text.
10. **Gates.** `bun run test` at 449 or better, `tsc` silent, `bun run lint` at 6 or fewer, `bun run build` green.

## Out of scope

- `adminPages.update`. Using it is the defect this round exists to remove.
- Section fields, done in J06.
- Person, project and album fields. If the route renders them, report which and stop; that is a later job, not a stretch of this one.
- The prerender cache, which is J08.
- Redesign work.

## Stop conditions

- **Never touch `:3020`.**
- A field whose text cannot be addressed with `field:<name>`, for example a name stored in a column pair rather than a translations row. Report it, do not invent a fourth target form.
- Any rendered text or heading level changing for a visitor who is not editing.
- Acceptance 1 or 5 showing a row count change.
