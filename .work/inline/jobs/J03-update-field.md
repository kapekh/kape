# J03 - narrow `updateField` procedure

Closes D1, D2, D3. Unblocks J06, J07 and J08.

The ruling behind this job: `docs/inline-editing-plan.md:92` recommends building the narrow procedure, and the alternative is a read-modify-write over a delete-and-reinsert (`admin.ts:698`) that destroys any language or field missing from the payload. That is a data-loss path, not a preference, so it is being built rather than accepted.

## Files you own

- `src/integrations/trpc/router.ts`
- `src/server/repo/admin.ts`
- `src/server/repo/admin-updatefield.test.ts` (new)

Nothing else. If this job needs a file it does not own, stop and report. Never reach across.

## Do

1. Add `updateField` to the admin pages repo in `src/server/repo/admin.ts`, writing exactly one translation row. It takes the addressing tuple from `docs/inline-editing-plan.md:55-62`: `entity`, `entityId`, `lang`, `target`. Closes D1.
2. Support the three `target` forms the plan names: `field:<name>`, `section:<sectionId>:props.<field>`, and `section:<sectionId>:props.items[<n>].<field>`. A target that does not parse is refused, not guessed at. Closes D2.
3. Carry `expectedUpdatedAt` through, keeping the refusal already at `admin.ts:747`. A stale write is refused with the same shape the wholesale path returns, so the inline UI can surface one thing rather than two. Closes D3.
4. Expose it at `src/integrations/trpc/router.ts` as `adminProcedure`, alongside the existing `pageInput` procedures at `:673` and `:754`. It must be `adminProcedure` and not a bare procedure, because that is what keeps render-cache invalidation automatic.
5. Write `admin-updatefield.test.ts` covering the three target forms, the parse refusal, the stale-write refusal, and the non-destruction proof in acceptance 1.

## Acceptance

Each item is a demonstration. Run it, paste the output into `.work/inline/J03-report.md`. "Tests pass" is not acceptance.

1. **Nothing else dies.** Pick a page with translation rows in two languages. Paste `select id, lang, field, value from translations where page_id = <id> order by lang, field` before and after a single `updateField` call. Row count identical, exactly one `value` different, every other row byte for byte the same. This is the delta the job exists for; without this output the job is not done.
2. **All three target forms.** One write each against `field:`, `section:<id>:props.<field>` and `section:<id>:props.items[<n>].<field>`. Paste the row each one wrote, and the read-back proving the page renders the new value.
3. **A bad target is refused.** Paste the error for a malformed target and for a `sectionId` that is not on the page. Neither writes a row: show the row count unchanged.
4. **Stale write refused.** Two calls with the same `expectedUpdatedAt`, second one refused. Paste both responses and the row count.
5. **Cache invalidation still automatic.** Show the render cache cleared after an `updateField`, the same way `setUiString` does it today.
6. **Gates.** `bun run test` at 449 or better, `tsc` silent, `bun run lint` at 6 or fewer, `bun run build` green. Paste all four. Use `bun run test`, never `bun test`.

## Out of scope

- Any UI. This job ships a procedure and its tests, nothing a browser can see. The editors are J06 and J07.
- `SectionRenderer.tsx` and the templates. That is J04's file and J04 may be live in another pane.
- Prerender invalidation. That is J08, and it depends on this job landing first.
- Refactoring `updatePage`. It stays exactly as it is; this is a second path beside it, not a replacement.
- The six `noArrayIndexKey` lint errors. Not yours, do not fix them, do not add to them.

## Stop conditions

- **Never touch `:3020`.** That is KAPE's own instance. Test against a copy of the database, on your own port. See `reference/agent_tooling_traps` in the vault.
- Any change under `drizzle/` or to `src/server/schema.ts`. This round has no migration; if you believe you need one, stop and report.
- If `expectedUpdatedAt` cannot be preserved without changing the wholesale path's behaviour, stop. Silently weakening the conflict refusal is worse than not shipping the procedure.
- If acceptance 1 shows any row count change, stop and report rather than adjusting the test.
