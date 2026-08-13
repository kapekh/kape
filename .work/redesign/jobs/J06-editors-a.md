# J06 — editors A: posts, projects, campaigns

Read `COMMON.md`, then `EDITORS.md`, then this. Port **3046**. Deltas: E1-E6.

The three heaviest entity editors. `PostForm` alone is imported by nine routes, seven of them type-only.

## Files you own

```
src/components/admin/PostForm.tsx          (605)
src/components/admin/ProjectForm.tsx       (458)
src/components/admin/CampaignForm.tsx      (407)
src/routes/admin.posts.new.tsx             (64)
src/routes/admin.posts.$id.tsx             (73)
src/routes/admin.projects.new.tsx          (75)
src/routes/admin.projects.$id.tsx          (87)
src/routes/admin.campaigns.new.tsx         (40)
src/routes/admin.campaigns.$id.index.tsx   (50)
src/routes/admin.campaigns.$id.tsx         (10, a bare Outlet)
```

## Specific to these three

1. **`PostForm` serves eleven content types** — news, story, video, album, publication, job, event, document, announcement, internal news, and the bare post. The type drives which fields appear.

   **Its exported types `LangOpt`, `TypeOpt`, `PostStatus` and `PostFormValue` are imported by nine routes and their shapes do not change.** Seven of those routes import `LangOpt` type-only and are owned by other jobs; changing it breaks them silently at compile time.

   Design the type-conditional fields as progressive disclosure rather than a wall that changes shape without explanation.

2. **`ProjectForm`** carries a location picker (`MapField`, J05's), a donor select and a snapshot structure. Its `noArrayIndexKey` lint error at `:242` is one of the eight baseline errors. Do not add a ninth; removing this one is welcome.

3. **`CampaignForm`** has the same lint error at `:298`. It also carries money fields, and a campaign's goal and raised amounts must render identically before and after.

4. **`admin.campaigns.$id.tsx`** is a 10-line `<Outlet/>` layout route with no UI. It exists so the campaign editor and its donations ledger share a parent. Leave it alone unless it needs a wrapper class.

## Additional acceptance

On top of everything in `EDITORS.md`:

11. **All eleven post types render.** Open `PostForm` for each type in turn and paste, for each, the list of visible field names. Before and after your change. Eleven lists, matching eleven lists.
12. **Campaign money is unchanged.** Paste goal and raised for three campaigns, before and after.
13. **The project location still picks.** Set a location on a project, save, reload, paste the coordinates.
14. **The donor select still selects.** Paste the selected donor before and after a save.
15. **Lint delta.** Name whether you removed the `noArrayIndexKey` errors at `ProjectForm.tsx:242` and `CampaignForm.tsx:298`. Either is fine; adding one is not.

## Additional stop conditions

- **`LangOpt`, `TypeOpt`, `PostStatus` or `PostFormValue` would have to change shape.** Nine routes depend on them and seven are not yours.
- A post type stops rendering a field it rendered before.
- A money value changes.
