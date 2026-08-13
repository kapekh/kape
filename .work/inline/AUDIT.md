# Inline editing round, audit

Deltas between the tree at `55e9ace` and `docs/inline-editing-plan.md`, jobs 3 and 4.
Every citation re-checked in this pane on 13 Aug. The plan's own line numbers had drifted since the redesign round; corrected paths are in the `ours` column.

| id | title | ours | target | effort | why |
|---|---|---|---|---|---|
| D1 | No narrow write path for one translated field | `src/integrations/trpc/router.ts:673` `pageInput` demands the whole `sections` and `translations` arrays | `adminPages.updateField` writing one row, on `adminProcedure` so cache invalidation stays automatic | M | plan:90-92 |
| D2 | The wholesale write destroys what it is not told | `src/server/repo/admin.ts:698` `updatePage` deletes every translation row for the page and reinserts from the payload | one-field mutation that touches one row | M | any language or field absent from the payload is gone, plan:82-88 |
| D3 | Inline save has to read the whole record back | `src/server/repo/admin.ts:595` `getPageForEdit`, the pattern `admin.pages.$id.tsx` already follows | no full-record round trip per keystroke-save | M | two admins on different fields of one page collide; `expectedUpdatedAt` at `admin.ts:747` makes that a refusal, which still loses an edit |
| D4 | `SectionRenderer` is handed no identity | `src/components/sections/SectionRenderer.tsx`, 2,196 lines, takes `{sections}` and spreads `{...s.props}` flat into templates | `entityId` and `lang` threaded down with `s.id`, `s.type` and the index surviving the spread | L | without it nothing in the DOM points back at a row, plan:64-68 |
| D5 | No `data-*` markers in the 21 templates | zero `data-` attributes across `SectionRenderer.tsx`, `SubPage.tsx`, `$.tsx` | each editable text field carries the `entity/entityId/lang/target` tuple from plan:55-62 | L | the bulk of the addressing work |
| D6 | `renderTitle` splits a title into spans | `SectionRenderer.tsx` `renderTitle`, turns `*text*` into an italic accent span | a marked heading serializes back to the asterisk form | S | plan:70-72; a naive marker silently drops the accent syntax on save |
| D7 | Prerender cache survives an inline save | `scripts/prerender-static.ts`, 59 lines | busted when a field is written | S | the second cache the DB bust does not reach, plan:133. Job 8, not this round |

## Already built

Half the audit's value is stopping work that does not need doing. These are done and no job below touches them.

- **Fallback signal.** Every resolved payload carries `i18nFallback: string[]`, plus `captionFallback` per photo and `stringsFallback` on the dictionary (job 1, plan:116-118).
- **Identity and affordance gating.** Resolved in the browser only, never at SSR. `cms_admin=1` is a JS-readable hint granting nothing; every save still runs `adminProcedure` (job 2, plan:140-143).
- **The proving ground.** `InlineEditBar`, `<T k="…" />` at `src/components/T.tsx` (53 lines), and the UI-string editor all shipped. Header and footer strings are converted (job 5, plan:145-154).
- **Conflict refusal.** `expectedUpdatedAt` already exists at `admin.ts:747`. J03 has to preserve it, not invent it.

## Stale in the plan, corrected here

The plan cites `router.ts:684-699` and `admin.ts:775-781`. Neither resolves today.
`router.ts` is `src/integrations/trpc/router.ts` and `pageInput` is at `:673`; `updatePage` is at `admin.ts:698` and `getPageForEdit` at `:595`.
The redesign round moved both files underneath the plan. Job contracts cite the checked lines, not the plan's.
