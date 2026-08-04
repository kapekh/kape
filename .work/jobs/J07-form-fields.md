# J07 — Form builder field types

Delta: D21.

## Files you own

- `src/lib/forms.ts`
- the public form renderer and the admin form builder components

Confirm the exact component paths before you start and record them in your report; the backlog's
guess is `src/components/FormRenderer.tsx` and `src/components/admin/FormBuilder*`.

## Do

Data capture — alumni, scholarship, volunteer registration — is a stated client goal, and the
field kinds (`src/lib/forms.ts:20-31`) cannot express their own registration form.
`feedback/src/routes/opportunities.alumni.tsx` uses three numbered fieldsets, a date of birth, and
a six-way involvement checkbox group. Ours has a single consent-style `checkbox`, no `date`, and
no grouping.

1. Add a `date` field kind.
2. Add a multi-select checkbox **group** kind, distinct from the existing single checkbox.
3. Add numbered sections or fieldsets so a long form can be broken up.
4. Wire all three through: schema, admin builder, public renderer, submission storage, CSV export.

## Acceptance

1. `bun run test` passes, 3 of 3.
2. Build the alumni form from `feedback/src/routes/opportunities.alumni.tsx` entirely through the
   admin UI, submit it, and show the stored row. This is the acceptance test — if you cannot build
   that form without code, the job is not done.
3. CSV export contains the new field types in a readable form. Paste a row. A checkbox group must
   not export as `[object Object]`.
4. Existing forms still render and still submit. Name the ones you checked.
5. Server-side validation rejects a malformed date and a checkbox group value that is not in the
   declared option set. Show both rejections. Client-side validation alone is a fail — this is a
   trust boundary.
6. `bunx biome check` on your files: no new errors.

## Out of scope

Email delivery. File upload changes. The alumni page itself.

## Stop conditions

- Adding a field kind requires a migration to `form_submissions`: stop and report, schema is
  contended.
