# Shared by J06, J07, J08 — the entity editors

Read `.work/redesign/jobs/COMMON.md` first, then this, then your own contract.

Eleven entities follow one shape: a `*Form` component, a `.new` route and a `.$id` route, where both routes are thin fetch-and-submit wrappers and all the UI is in the form. You redesign the form; the routes mostly inherit.

Three jobs split the eleven. **You all build the same thing.** If the three come back different, the round has failed at its one job. Read the other two contracts' reports before you finish.

## The pattern, applied to every form you own

1. **`EditorHeader` stays.** The sticky bar with title, Cancel and Save is the one genuinely good pattern in the current admin. J01 restyled it. Use it; do not replace it.

2. **E2 — two-column `FormSection`.** Today fields stack in one column at prose width, so related fields sit far apart and a long form is a scroll. Above `lg`, a description column on the left and the fields on the right, Stripe-style. Below `lg`, one column.

   `FormSection` from `form-ui.tsx` is the existing container and J01 froze its API.

3. **E6 — no native `<select>`.** Use `SearchableSelect` (J05) or J01's `Select`. **Prove the keyboard path on every one you convert.** A native select is correct for free; a replacement has to earn it.

4. **E3 — errors sit under their field.** Today a validation error arrives as a corner toast that vanishes in 4.5s, the field gets no `aria-invalid`, and focus never moves to it.

   The error renders under its field, referenced by `aria-describedby`, and the field carries `aria-invalid`.

   **This is where the boundary is, and you must respect it.** Rendering an error the form already has is markup. Making the form produce a per-field error it does not currently produce is logic. If the submit handler only ever gets one message with no field attached, **stop and report** rather than restructuring the handler.

5. **E4 — a save that worked says so.** Several of these are silent, with the button re-disabling as the only cue.

6. **E5 — `LangTabs`.** J05 owns the component. You consume it. Do not reach into it.

7. **The four states.** Loading is a skeleton in the shape of the form. A failed initial load is the common gap: `.catch` is absent from the initial query on most of these routes, so a rejected promise leaves the spinner up forever.

   **Adding a `.catch` is arguably logic.** Ask the lead once, for all three jobs, rather than three of you deciding separately.

8. **The dirty gate stays.** Save is disabled until the form is dirty; `useDirty` and `useDirtyGuard` own that and J01 did not change them. The disabled button now carries its reason instead of looking broken (F05).

## Acceptance shared by all three

Do every one of these on **each entity you own**, not on a sample. Paste real output.

1. The four gates from COMMON.
2. **Create works.** Fill the minimum, save, and show the record exists with the values you typed.
3. **Edit works.** Change one field, save, reload, show it persisted.
4. **No-op save is still prevented.** Load an editor, touch nothing, show Save is disabled. Then show its reason is available.
5. **The dirty guard still fires.** Make an edit, navigate away, show the confirmation. Cancel it and show the edit is still there.
6. **Validation still refuses.** Submit with a required field empty. Show the refusal, show the field carries `aria-invalid`, and show the message is associated by `aria-describedby`.
7. **Every converted select works by keyboard.** Tab, open, arrow, select, Escape, focus returns. Paste the sequence and the accessible name for each.
8. **Translations survive.** Type an English value, switch to Khmer, type a Khmer value, save, reload, and show both. This one matters more than it looks: the write path deletes and reinserts every translation row, so a form that drops a language destroys data.
9. **Field count unchanged.** For each form, paste the count of inputs, selects and textareas before and after. A dropped field is a dropped feature.
10. Screenshots at 1440 and 390 of each form, in both its new and its edit state.

## Out of scope for all three

- `form-ui.tsx`, `list-ui.tsx`, `ActionMenu.tsx` — J01.
- `RichTextEditor`, `LangTabs`, `SearchableSelect`, `MapField`, `MapPicker` — J05.
- `MediaPicker`, `MediaLibraryDialog` — J10. You render them; you do not edit them.
- `PageForm` and `SectionsBuilder` — J09.
- Any list route.
- Restructuring a submit handler to produce per-field errors.
- Adding `.catch` to an initial query without asking.

## Stop conditions for all three

Everything in COMMON, plus:

- **A form field disappears.** Count them before and after.
- **A translation is lost on save.** The update path deletes every translation row and reinserts from the payload, so any field or language your form stops sending is destroyed.
- The submit handler does not give you a per-field error and you would have to restructure it.
- `useDirty`'s baseline behaves differently after your change.
- A native select cannot be replaced without losing keyboard or screen-reader behaviour. Leave it native and say so.
