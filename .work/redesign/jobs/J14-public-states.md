# J14 — public content states

Read `.work/redesign/jobs/COMMON.md` first. Port **3054**. Deltas: W1-W5.

The only job that touches the public site, and the one with the tightest leash.

## The rule that governs this whole job

**The client signed off on the public site's look. You are not redesigning it.**

You are adding the states it does not have: what a section shows when its query returns nothing, what an image does when it fails to load, what a form says when a field is wrong. Nothing that renders today changes how it looks when it has content.

If you find yourself improving a layout, stop. That is a different round and a different conversation with the client.

## Files you own

```
src/components/sections/SectionRenderer.tsx  (2,166 — 21 section templates)
src/components/FormRenderer.tsx
src/components/ContactForm.tsx
src/lib/placeholder.ts
```

`SectionRenderer.test.tsx` sits beside the first and must keep passing.

## Do

1. **W2 — empty states for the dynamic sections.** Eleven of the 21 templates render whatever their query returns: `postList`, `videoGrid`, `albumGrid`, `publicationList`, `people`, `map`, `directory`, `partners`, `projectList`, `orgChart`, and `siteMap`.

   When the query returns nothing, they render a heading over emptiness, so a half-built page looks broken to a visitor.

   Each gets an empty state in the site's own voice, not the admin's. A visitor should read something intentional, not a gap.

   **Where a section is genuinely better hidden than empty, that is a rendering decision inside the template and is fine. Removing a section from the page is not.**

2. **W3 — media fallback.** An image that fails to load currently leaves a broken element. `src/lib/placeholder.ts` already exists and is the pattern; extend it to cover the cases the templates hit.

3. **W5 — visitor-facing forms.** `FormRenderer` renders forms built in `/admin/forms`; `ContactForm` is the fixed contact form. Both have thin validation, pending and success states.

   Field-level errors, a pending state on submit that cannot be double-submitted, and a real success state.

   **This is the boundary and it is the same one the editor jobs have.** Rendering an error the form already produces is markup. Making the form produce a per-field error it does not currently produce is logic. If the submit handler returns one message with no field attached, **stop and report**.

   A prior round fixed the public site silently swallowing what visitors send. Do not reopen that.

4. **W4 — rich text edges.** `.prose-body` in `src/styles.css` is solid and J01 may have touched it; check before you assume. Its weak spots are tables and the `form-embed` placeholder. **`src/styles.css` is J01's file, so if the fix belongs there, report it rather than editing it.**

5. **Do not thread anything new through `SectionRenderer`'s props.** Inline editing wants `entityId` and `lang` passed down, and that is planned in `docs/inline-editing-plan.md` for a later round. Not now.

## Acceptance

1. The four gates from COMMON, pasted.
2. **Every one of the 21 sections still renders identically with content.** For each, render it with data and paste the rendered text content before and after your change. Twenty-one pairs, matching. This is the check that proves you did not redesign the signed-off look.
3. **Every dynamic section renders something sensible with no data.** Force each of the eleven to an empty result and paste what a visitor sees. Screenshot four of them.
4. **Every page still has exactly one `h1`.** Walk fifteen public pages and paste the `h1` count for each. All must be 1. A prior round fixed this and it is the regression check.
5. **The contact form still submits and still stores.** Send a submission, show it in `/admin/messages`, and paste both.
6. **A built form still submits.** Place one on a page, submit it, show it in that form's submissions.
7. **Validation refuses.** Submit each form with a required field empty. Paste the refusal, and show the field carries `aria-invalid` and is associated by `aria-describedby`.
8. **A submit cannot be double-fired.** Click submit twice quickly and show one submission was stored, not two.
9. **A broken image falls back.** Point an image at a missing file and paste what renders.
10. **`SectionRenderer.test.tsx` passes.** Paste it.
11. **Khmer still works.** Load `/km` on three pages and show the Khmer content renders and the fallback to English behaves as it did.
12. Screenshots at 1440 and 390 of four empty-state sections and both forms in error and success. Into `.work/redesign/shots/j14-*.png`.

## Out of scope

- Any visual change to a section that has content.
- The public header, footer, or any chrome. `Header.tsx`, `Footer.tsx`, `SubPage.tsx`, `$.tsx` are not yours.
- `src/styles.css`. J01.
- Adding a section type or changing `src/lib/sections.ts`.
- Anything in `docs/inline-editing-plan.md`. Not this round.
- Threading new props through `SectionRenderer`.
- The admin's side of any of this.

## Stop conditions

Everything in COMMON, plus:

- **A section with content renders differently.** Paste the pairs; any mismatch is a failure.
- **A page ends up with zero or two `h1` elements.**
- A form stops submitting, or a submission stops being stored.
- The submit handler cannot give you a per-field error.
- The fix belongs in `src/styles.css`.
- You find yourself improving the public layout.
