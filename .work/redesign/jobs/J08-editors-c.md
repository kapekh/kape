# J08 — editors C: forms, users, roles, donors

Read `COMMON.md`, then `EDITORS.md`, then this. Port **3048**. Deltas: E1-E6.

Three small editors and one large builder. Two of them are the admin's own access control, so a mistake here locks people out.

## Files you own

```
src/components/admin/FormBuilder.tsx     (501)
src/components/admin/UserForm.tsx        (174)
src/components/admin/RoleForm.tsx        (170)
src/components/admin/DonorForm.tsx       (122)
src/routes/admin.forms.new.tsx           (38)
src/routes/admin.forms.$id.index.tsx     (51)
src/routes/admin.forms.$id.tsx           (6, a bare Outlet)
src/routes/admin.users.new.tsx           (45)
src/routes/admin.users.$id.tsx           (128)
src/routes/admin.roles.new.tsx           (43)
src/routes/admin.roles.$id.tsx           (66)
src/routes/admin.donors.new.tsx          (37)
src/routes/admin.donors.$id.tsx          (56)
```

## Specific to these four

1. **`FormBuilder` is the odd one out** and the most interesting design problem in this job. It is not an entity form; it is a builder that composes the forms visitors fill in. 501 lines, and its `noArrayIndexKey` lint error at `:280` is one of the eight baseline errors.

   Design it as a builder: a field list you can reorder, each field's settings revealed on selection rather than all at once.

   **Reordering that exists today keeps working exactly as it does. Do not add drag-and-drop** — that is new interaction logic and is explicitly deferred.

2. **`RoleForm` edits permissions.** The permission set is what `NAV_AREA` and `resolvePermissions` enforce on the server. Rendering a permission wrong is one thing; **saving a role with a permission it did not have is a security change**. Prove the round trip.

3. **`UserForm`, plus `admin.users.$id.tsx` at 128 lines** — the only editor route that also imports `form-ui` directly, for a password-reset panel below the form. Two forms on one screen with two different save semantics. Make the two scopes visually distinct.

4. **`DonorForm` at 122 lines is the smallest.** A donor is referenced by projects, so a refused delete elsewhere depends on the record this form writes.

5. **`admin.forms.$id.tsx`** is a 6-line `<Outlet/>`. Leave it.

## Additional acceptance

On top of everything in `EDITORS.md`:

11. **A built form still renders and still submits.** Build a form with three field types, save it, place it on a public page, fill it as a visitor, submit, and show the submission in `/admin/forms/<id>/submissions`. End to end, pasted.
12. **Field reordering still reorders.** Move a field up and down, save, reload, paste the order at each step.
13. **Role permissions round-trip exactly.** For one role, paste the full permission set before, after opening and saving with no change, and after a deliberate single change. Set one must equal set two. This is the check that proves you have not widened access.
14. **A staff user is still refused.** Sign in as `staff@kapekh.org`, open `/admin/users`, and show the refusal. Then confirm the server refuses too, not only the client.
15. **Password reset still resets.** Use the panel on `admin.users.$id.tsx`, then sign in with the new password. Paste both.
16. **A refused donor delete still explains itself.** Delete a donor a project points at. Paste the message.
17. **Lint delta.** Say whether `FormBuilder.tsx:280` is still there.

## Additional stop conditions

- **A role's permission set differs after a no-op save.** Stop immediately and report. This is the one failure in this round that has a security consequence.
- The staff user reaches anything they could not reach before.
- A built form stops rendering or stops submitting.
- You are tempted to add drag-and-drop to the field list.
- Password reset stops working.
