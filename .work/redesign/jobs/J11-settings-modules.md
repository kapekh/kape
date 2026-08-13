# J11 — settings and modules

Read `.work/redesign/jobs/COMMON.md` first. Port **3051**. Deltas: G1, G2, G8.

`/admin/settings` is the clearest single win in the whole admin. It is one endless scroll and it does not have to be.

## Files you own

```
src/routes/admin.settings.tsx  (628 — third largest route)
src/routes/admin.modules.tsx   (164)
```

`admin.settings.tsx` imports `ActionMenu` for a sub-list inside it. J01 owns that component; consume it.

## Do

Screenshot to read first: `.work/redesign/shots/rd-04-settings.png`.

1. **G1 — give settings a spine.** Today: 628 lines in one single-column scroll, roughly seven fields visible per screen, no section nav, no anchors, no sticky save. At 1440 the card is ~768px against a ~1600px column, so about 400px sits empty.

   A section nav rail on the left, the active section's fields on the right, and a sticky save bar. The nav uses the space that is currently empty.

   **Whatever save semantics exist today survive.** If settings saves per section, it keeps saving per section; if it saves wholesale, it keeps saving wholesale. A sticky bar is a new position for an existing control, not a new control.

2. **G2 — the raw keys come out of the help text.** Today it reads "The full name, as it should read in the header and the footer. `site_name_en`" and the same for `logo_url`, `og_image`, `og_site_name`, `site_description`, `site_name_short`. Implementation leaking into a label.

   Move the key to a hover affordance or drop it. **Do not remove the key from anything that is not display text** — it is the actual settings key and the form depends on it.

3. **The custom key/value table** at the bottom has a loading row and no empty row. All four states, and `Table` from J01.

4. **G8 — modules.** 164 lines of toggles that turn whole areas of the admin on and off. It is one of only two screens that already confirms a save with a toast ("Modules saved."), which is the behaviour every other screen should copy, so keep it.

   Each toggle is consequential: turning Schools off removes it from the sidebar and makes `/admin/schools` redirect. Say what each one does before it is flipped, not after.

5. **`FormSection` and the two-column form pattern** are the same ones the editor jobs use. Read `EDITORS.md` step 2 so settings and the editors agree.

## Acceptance

1. The four gates from COMMON, pasted.
2. **Every setting round-trips.** Paste the full settings key/value set before your change and after. Identical. Then change one value, save, reload, show it persisted, and show the rest are untouched.
3. **A setting still reaches the public site.** Change Short name, save, and paste it out of the public homepage HTML. Then change the header donate label and do the same.
4. **Field count unchanged.** Paste the count of inputs, selects, textareas and switches on `/admin/settings` before and after.
5. **The section nav reaches every section.** List every section and show each is reachable, both by clicking the nav and by scrolling. Paste the list.
6. **The sticky save saves.** Edit a field in a section that is not the first, save from the sticky bar, reload, show it persisted.
7. **The dirty gate still gates.** Load, touch nothing, show save disabled and its reason available.
8. **Custom key/value still works.** Add a custom key, show it saved, delete it, show it gone. Paste the count at each step.
9. **Modules still gate.** Turn Schools off. Show it gone from the sidebar, show `/admin/schools` redirects to `/admin` rather than erroring, then turn it back on and show everything returns. Paste each step.
10. **The modules toast still fires.** Paste it.
11. **No raw setting key appears in display text.** Grep the rendered page for `site_name_en`, `logo_url`, `og_image`, `og_site_name`, `site_description`, `site_name_short` and show none is in visible copy. Then show the form still writes to those keys.
12. Screenshots at 1440 and 390, light and dark, of settings and modules. Eight into `.work/redesign/shots/j11-*.png`.

## Out of scope

- `ActionMenu.tsx`. J01.
- Theme token editing, if settings exposes it. The public site's look is signed off, so you restyle the control and never the value it writes.
- Adding a setting, removing one, or changing a key.
- `admin.languages.tsx` and `admin.ui-strings.tsx`. J13.
- Anything about how modules gate. You restyle the switch, not what it switches.

## Stop conditions

Everything in COMMON, plus:

- **A settings value changes, or a key stops being written.**
- The section nav would need the save semantics to change to work.
- A module toggle stops gating, or starts gating something else.
- A setting stops reaching the public site.
