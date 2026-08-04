# J08 — Rich text tables

Delta: D18.

## Files you own

- `src/lib/richtext/extensions.ts`
- the Tiptap editor toolbar component
- the server-side static renderer's node allow-list

## Do

`richTextExtensions` is StarterKit + Image + FormEmbed (`extensions.ts:17-27`). Two pages the
client shipped are literally tabular and would become bullet soup today:
`feedback/src/routes/who-we-are.fact-sheet.tsx` (an organisation profile table) and the 57-term
acronym glossary in `who-we-are.leadership.tsx`.

1. Add table support to the **trusted** extension set only.
2. Add a definition-list or two-column term/description construct, whichever renders the glossary
   more honestly.
3. Add toolbar controls: insert table, add/remove row and column.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors.** It passes clean on `main` as of
`ba0c534`, so any type error during your run is yours.

1. `bun run test` passes, 3 of 3.
2. Author a table in admin, save, reload, and confirm it round-trips unchanged. Screenshot both
   sides.
3. It renders server-side. The static renderer is **fail-closed on unknown nodes**, so an
   unregistered node type breaks the page — confirm SSR output contains the table markup, with
   JavaScript disabled.
4. `basicRichTextExtensions` is **unchanged**. That set handles untrusted public input and must
   not gain table nodes. State explicitly that you did not touch it.
5. Existing rich-text content still renders. Check at least three existing pages by URL.
6. Tables are responsive on mobile, or scroll rather than overflow. Screenshot at narrow width.
7. `bunx biome check` on your files: no new errors.

## Out of scope

The fact sheet and glossary pages themselves — this job delivers the capability, content authoring
comes later.

## Stop conditions

- Table nodes cannot be rendered by `@tiptap/static-renderer` without a custom mapping: report the
  cost before writing one.
- Anything tempts you toward `basicRichTextExtensions`: stop. That is a security boundary.
