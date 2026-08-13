# J07 — editors B: people, schools, offices, partners

Read `COMMON.md`, then `EDITORS.md`, then this. Port **3047**. Deltas: E1-E6.

The four record editors. All four are module-gated in places, and three carry a map.

## Files you own

```
src/components/admin/PeopleForm.tsx     (328)
src/components/admin/SchoolForm.tsx     (281)
src/components/admin/OfficeForm.tsx     (269)
src/components/admin/PartnerForm.tsx    (147)
src/routes/admin.people.new.tsx         (49)
src/routes/admin.people.$id.tsx         (67)
src/routes/admin.schools.new.tsx        (66)
src/routes/admin.schools.$id.tsx        (73)
src/routes/admin.offices.new.tsx        (52)
src/routes/admin.offices.$id.tsx        (66)
src/routes/admin.partners.new.tsx       (54)
src/routes/admin.partners.$id.tsx       (66)
```

## Specific to these four

1. **`SchoolForm` and the school routes are module-gated** through `useModules`. Fields appear or vanish depending on which modules the install has enabled. **That gating is behaviour.** A field hidden by a disabled module stays hidden; a field shown stays shown.

   `useModules.ts` is 34 lines and is imported by five routes across three jobs. **You do not own it.** Consume it.

2. **`SchoolForm` and `OfficeForm` both render `MapPicker`** directly; `PeopleForm` does not. J05 owns the picker. You place it, you do not edit it.

3. **`PeopleForm` feeds the org chart.** A person's title and photo appear on `/admin/org-chart` and on the public org chart. Changing what the form stores would change both, so do not.

4. **`PartnerForm` at 147 lines is the smallest of the four** and the closest to a clean template. Get it right first and let the other three follow it.

5. **All four carry a `TermOpt` type** for their category selects, exported from their own form file and imported by their two routes. Shapes do not change.

## Additional acceptance

On top of everything in `EDITORS.md`:

11. **Module gating still gates.** Turn a module off in `/admin/modules`, open `SchoolForm`, and paste the visible field list. Turn it back on, paste again. Both lists must match what they were before your change. Four lists total.
12. **The map still picks on both forms that have one.** Set a location, save, reload, paste the coordinates. Twice.
13. **A person still reaches the org chart.** Edit a person's title, save, and show the new title on `/admin/org-chart`. Then show it on the public org chart.
14. **Category selects still select.** For each of the four forms, paste the selected term before and after a save.
15. **Photo upload still works** on `PeopleForm`. Attach an image, save, reload, show it renders.

## Additional stop conditions

- **A module-gated field appears when its module is off, or vanishes when it is on.**
- A `TermOpt`, `ProjectOpt`, `SchoolFormValue`, `OfficeFormValue`, `PartnerFormValue` or `PersonFormValue` would have to change shape.
- You would need to edit `useModules.ts`.
- A person's data stops reaching the org chart.
