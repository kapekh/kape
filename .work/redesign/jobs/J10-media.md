# J10 — media library and pickers

Read `.work/redesign/jobs/COMMON.md` first. Port **3050**. Deltas: M1-M3, E7.

The best-built screen in the admin, and the one with its own private design system.

## Files you own

```
src/routes/admin.media.tsx                   (790 — the largest route in the tree)
src/components/admin/MediaPicker.tsx         (155)
src/components/admin/MediaLibraryDialog.tsx  (285)
```

`MediaPicker` is rendered by ten components across four other jobs, and `MediaLibraryDialog` by four. **Their exported names and props do not change**: `MediaLite`, `MediaPicker`, `MediaItem`, `isImageMedia`, `MediaLibraryDialog`.

## Do

Screenshot to read first: `.work/redesign/shots/rd-05-media.png`.

1. **M1 — onto the shared scale.** This route alone uses 8 distinct `py` values, 7 `px` values and 6 radii. Everything the spec allows is in `DESIGN.md` layer 2.

2. **The skeleton graduates.** `admin.media.tsx:427` has the only skeleton in the entire admin, ten pulsing tiles. J01 turned that idea into a primitive. Adopt the primitive here so the two do not drift.

3. **The empty state graduates too.** This is the only screen in the admin that tells a filtered-empty result apart from a genuinely empty collection. That distinction is now the rule everywhere, and yours was the model.

4. **M2 — video as its own kind.** A video uploads and serves correctly as `video/mp4`, but the counter calls it a "file", it gets the generic document tile, and the filter tabs are only All / Images / Files.

   Add a video filter and a real preview tile.

   **The kind test is the boundary.** If distinguishing video needs no more than a mime-prefix check on data the route already has, that is composition. If it needs a new field or a new query, **stop and report**.

5. **M3 — items are announced as `#136 · image/png`.** Nothing identifies which image is which without sight. Put the filename in the accessible name, in the library and in both pickers.

6. **E7 — the picker.** `MediaPicker` and `MediaLibraryDialog` are what every editor reaches for. They are dialogs, so J01's dialog treatment applies, and their focus trap and focus return are behaviour.

7. **The upload path is the most careful thing here.** Drag-and-drop target, the allow-list refusal, the empty-file refusal, the progress state. All four are behaviour and all four keep working. The drop target is a `rounded-3xl border-2 border-dashed` panel that needs to come onto the scale without becoming less obvious as a drop target.

8. **The usage drawer** shows what points at a media item, and it is what makes a safe delete possible. Restyle it; keep it.

## Acceptance

1. The four gates from COMMON, pasted.
2. **Upload still works and still refuses.** Upload a PNG, an MP4 and a PDF: all three succeed, paste the served `Content-Type` and byte count for each from `/uploads/<uuid>.<ext>`. Then upload an SVG carrying a script, a file with no extension, and a 0-byte file: all three refused, paste each message.
3. **A filename with spaces, Khmer and diacritics** still uploads and is still stored under a UUID. Paste the stored name.
4. **Item count unchanged.** Paste the total before and after your change.
5. **Every filter still filters.** All, Images, Files, and your new Video. Paste the count for each.
6. **Video is a video.** Upload an MP4 and show it under the video filter with a preview tile, and show the counter no longer calls it a file.
7. **Accessible names carry the filename.** Paste the accessible name of five items in the library and five in the picker, before and after.
8. **The usage drawer still reports usage.** Insert an image into a page, open the drawer for that image, and show the page listed. Paste it.
9. **Deleting a used item still refuses**, and the refusal still names what holds it.
10. **The picker's focus trap and return still work.** Open it from an editor, Tab three times and show focus stays inside, Escape, and show focus returns to the opening control. Paste the active element at each step.
11. **An inserted image still renders publicly.** Insert into a page body, save, load the public page, paste the `<img>` element.
12. **Drag-and-drop upload still works.** Show the drop target appearing and a file landing.
13. Screenshots at 1440 and 390 of the library, the drop state, the usage drawer and the picker dialog. Eight into `.work/redesign/shots/j10-*.png`.

## Out of scope

- Alt text on images. It needs a data shape change and is in `docs/inline-editing-plan.md`.
- `RichTextEditor`. J05 owns it and only calls your dialog.
- Any editor form.
- Changing what the upload endpoint accepts.
- Image processing, thumbnails, or anything that touches the served bytes.

## Stop conditions

Everything in COMMON, plus:

- **The upload allow-list stops refusing anything it refuses today.** That list is a security boundary.
- Distinguishing video needs a new field or a new query.
- A `MediaPicker` or `MediaLibraryDialog` export would need a different signature. Ten components depend on the first.
- The usage drawer stops reporting a usage it reported before, which would make an unsafe delete look safe.
- The drop target becomes less discoverable than it is now.
