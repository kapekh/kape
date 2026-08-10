# FIX-E - the singleton admin screens

Seven of the eight items are done.
L21 is done as far as my file set reaches; its counter and filter tab need three lines in two files I do not own, given verbatim at the end.

## Files changed

| file | what changed |
|---|---|
| `src/routes/admin.footer.tsx` | STATIC 2 the missing `try`; success + failure reporting; 19 glyph buttons named after their row |
| `src/routes/admin.settings.tsx` | STATIC 20 raw-row save/delete/add now report; row controls disable while writing |
| `src/routes/admin.nav.tsx` | all four nav mutations report; row controls disable; M07 labels on 5 × 25 buttons; header save confirms |
| `src/routes/admin.org-chart.tsx` | all five org mutations report; submit disables; a refused reparent/move refetches |
| `src/routes/admin.languages.tsx` | three mutations report; per-row disable; the empty state |
| `src/routes/admin.media.tsx` | L21 video tile + playable preview; bulk delete disables and confirms |
| `src/components/admin/TermsManager.tsx` | STATIC 20 save/create/delete report; per-row disable; row menu named |
| `src/components/admin/OrgCanvas.tsx` | M07 labels on the three per-card buttons |

`admin.footer.tsx:204` and `admin.nav.tsx:58` — the lead's `!loading` argument — are untouched.

## 1. Acceptance: the gates

```
tsc=0
Checked 281 files in 283ms. No fixes applied.
Found 8 errors.
 Test Files  38 passed (38)
      Tests  369 passed (369)
```

356 over 37 was the floor; 369 over 38 clears it. Lint is 8 errors, 0 warnings.

One transient red worth recording, because it was real for about twenty minutes.
Mid-run the suite failed on a file none of mine:

```
FAIL src/lib/no-brand.test.ts > shipped source carries no customer branding > is free of /kape/i
+   "routes/admin.offices.index.tsx:83: description=\"Offices are the places KAPE works from…\"",
+   "routes/admin.partners.index.tsx:83: description=\"Partners are the organisations working alongside KAPE…\"",
+   "routes/admin.schools.index.tsx:116: description=\"Schools are the sites KAPE supports…\"",
```

Three list pages, all owned elsewhere this round. I confirmed none of my eight files carry the brand string and left them alone; the pane that owns them fixed it while I was in the browser, and the suite is green as pasted above.

Lint also briefly hit 1 warning — a `biome-ignore` I added for `useMediaCaption` on the grid-tile `<video>`, which has no `controls` and so never triggered the rule. I removed the suppression rather than leaving a dead one.

## 2. Acceptance: every mutation in the six routes

Twenty mutations. No blanks.

| file:line | what it does | how failure reaches the user | disables while pending |
|---|---|---|---|
| `admin.footer.tsx:210` | writes all footer settings keys | error toast via `saveErrorMessage`; **this was STATIC 2** — there was no `try` at all | yes, `saving` on the submit |
| `admin.settings.tsx:376` | saves one identity/brand field per iteration | inline status beside the button, naming how many of how many landed and the server's words | yes, `pending` gates the button |
| `admin.settings.tsx:405` | saves one raw settings row | error toast; success toast names the key | yes, `rowBusy === r.key`, button reads "Saving…" |
| `admin.settings.tsx:419` | adds a raw settings row | inline `addError` under the field; success toast | yes, `adding`, button reads "Adding…" |
| `admin.settings.tsx:439` | deletes a raw settings row | error toast; the row is dropped from the table **after** the server takes it, so a refused delete no longer looks like it worked | yes, `rowBusy === r.key` |
| `admin.nav.tsx:47` | writes the four header settings keys | error toast; success toast "Header settings saved." | yes, `saving` |
| `admin.nav.tsx:372` | creates a menu item | error toast; success toast | yes, `busyId === "new"` |
| `admin.nav.tsx:385` | updates a menu item | error toast; success toast | yes, `busyId === id` |
| `admin.nav.tsx:399` | deletes an item and its children | error toast; success toast | yes, `busyId === id` |
| `admin.nav.tsx:411` | moves an item up or down | error toast | yes, `busyId === id` |
| `admin.org-chart.tsx:191` | updates a position | error toast; success toast | yes, new `saving` prop on `NodeForm` |
| `admin.org-chart.tsx:192` | creates a position | error toast; success toast | yes, same |
| `admin.org-chart.tsx:215` | deletes a position and its reports | error toast; success toast names the node | the confirm dialog gates it |
| `admin.org-chart.tsx:227` | reparents a node (drag) | error toast **and a refetch** — a refused reparent otherwise leaves the canvas drawing an edge the server never accepted | drag, no button to disable |
| `admin.org-chart.tsx:241` | saves a dragged node's position | error toast **and a refetch**; local state is only updated after the server agrees | drag, no button to disable |
| `admin.languages.tsx:47` | adds a language | error toast; success toast | yes, `busy === "add"` |
| `admin.languages.tsx:68` | updates a language (enable / make default) | error toast **and a refetch**, so a refused toggle stops showing the state the operator asked for rather than the one stored | yes, `busy === l.code` on the checkbox and "Make default" |
| `admin.languages.tsx:94` | deletes a language | error toast; success toast | yes, `busy === l.code`, and the row menu item disables |
| `admin.media.tsx:209` | uploads a file (`fetch`) | already correct: per-file failures collected and toasted with the server's reason | yes, the file input is `disabled` while uploading |
| `admin.media.tsx:266` | deletes one media item | already correct: `deleteReason` translates the FK error into "still attached to a record" | the confirm dialog gates it |
| `admin.media.tsx:297` | bulk-deletes the selection | already reported stuck items; now also confirms the successful ones | **new** — `bulkBusy`, button reads "Deleting…" |
| `TermsManager.tsx:54` | saves a term row | **was STATIC 20** — silent. Now error + success toast naming the term | yes, `busy === r.id`, button reads "Saving…" |
| `TermsManager.tsx:72` | creates a term | error toast; success toast | yes, `busy === "add"` |
| `TermsManager.tsx:91` | deletes a term | error toast; row dropped only after the server takes it | yes, and the row menu item disables |

Nothing in the six is exempt on "it probably won't fail" grounds. The two drag handlers on the org canvas have no button to disable, which is why both refetch on failure instead — that is the only way the canvas can be made to stop showing a change the server refused.

## 3. Acceptance: the footer failure, in a browser

This was the defect the job is named for. With `adminSettings.set` blocked at the network layer:

```
edit typed: "EDIT THAT MUST SURVIVE A FAILED SAVE"
Save before: "Save footer" disabled: false

--- after the blocked save ---
Save button text : "Save footer"
Save disabled    : false
edit still there : "EDIT THAT MUST SURVIVE A FAILED SAVE"
toast on screen  : "Could not reach the server. Check your connection and try again."
```

The button is back to "Save footer" rather than pinned on "Saving…", it is clickable again, and the edit is still in the field — so the only way out is no longer a reload that discards the work.

And it still saves once the block is lifted, from the same unreloaded page:

```
--- after unblocking and retrying ---
Save button text : "Save footer"
toast on screen  : "Footer saved."
```

Screenshots: `.work/ui-audit/fixe/footer-save-failure-recovers.png`, `.work/ui-audit/fixe/footer-save-success.png`

## 4. Acceptance: a silent save, now confirmed

`Save identity` already reported before I touched it — `saveDraft` writes an inline status next to the button. The audit's M11 note about it is out of date; I verified rather than "fixing" what was already working:

```
Save identity disabled before edit: true
Save identity disabled after edit : false
Save identity label               : "Save identity (1)"
inline confirmation: "Saved 1 field."
```

`TermsManager` was genuinely silent and now is not:

```
row Save buttons: 5
first button accessible name: "Save Admin & HR"
toast: "Saved Admin & HR."
```

Screenshots: `.work/ui-audit/fixe/save-identity-confirms.png`, `.work/ui-audit/fixe/terms-save-confirms.png`

**The rule I settled on for consistency (item 6):** the confirmation goes next to the control when the control has room for it, and to a toast when it does not. So the two section saves on `/admin/settings` keep their inline status, which carries something a toast cannot — "Saved 3 of 5; 2 still unsaved" plus the server's own words — and every row-level and page-level save in the other five routes toasts. Every save in the six now says something either way.

## 5. Acceptance: M07, accessible names

Computed by the browser through CDP's accessibility tree, not read off the attribute.

`/admin/nav`, the five row buttons:

```
  name="Move Home up"  | text="↑" | aria-label="Move Home up" | title=null
  name="Move Home down"  | text="↓" | aria-label="Move Home down" | title=null
  name="Add a child item under Home"  | text="＋" | aria-label="Add a child item under Home" | title=null
  name="Edit Home"  | text="✎" | aria-label="Edit Home" | title=null
  name="Delete Home"  | text="✕" | aria-label="Delete Home" | title=null

  computed AX names (browser's own):
   • "Move Home up"
   • "Move Home down"
   • "Add a child item under Home"
   • "Edit Home"
   • "Delete Home"
```

`/admin/footer`, five of the nineteen:

```
  name="Remove Annual Report"  | text="✕" | aria-label="Remove Annual Report" | title=null
  name="Remove Impact Stories"  | text="✕" | aria-label="Remove Impact Stories" | title=null
  name="Remove Research"  | text="✕" | aria-label="Remove Research" | title=null
  name="Remove Program Brochure"  | text="✕" | aria-label="Remove Program Brochure" | title=null
  name="Remove Photo Gallery"  | text="✕" | aria-label="Remove Photo Gallery" | title=null

  computed AX names (browser's own):
   • "Remove Annual Report"
   • "Remove Impact Stories"
   • "Remove Research"
   • "Remove Program Brochure"
   • "Remove Photo Gallery"
```

None is a bare glyph and each names its own row. The dead `title` attributes are gone — a button with text content never took its name from them, so they were only ever readable as a tooltip.

`OrgCanvas.tsx` got the same treatment: `Add a report under {name}`, `Edit {name}`, `Delete {name}`. A row with no label falls back to its position ("link 3", "social link 2") rather than to nothing.

## 6. Acceptance: L21, video

Uploaded `test-video.mp4` to `/admin/media`:

```
=== before upload ===
counter    : 126 items · 123 images · 3 files · 22.9 MB
filter tabs: ["All","Images","Files"]

=== after uploading test-video.mp4 ===
counter    : 127 items · 123 images · 4 files · 22.9 MB
filter tabs: ["All","Images","Files"]
video tile : {"tag":"VIDEO","src":"ba-97ad-c14903327951.mp4","preload":"metadata","hasPlayBadge":true,"stillGenericDocGlyph":false}
detail preview has playable <video> with controls: true
```

**Done:** the tile is a real `<video>` with a ▶ badge instead of the 📄 glyph, using the frame the browser decodes as the thumbnail so nothing has to be stored for it, and the detail view plays the clip with controls. Screenshots: `.work/ui-audit/fixe/media-video-tile.png`, `.work/ui-audit/fixe/media-video-preview.png` — two videos visible in the grid, both rendering as video.

**Not done, and why:** the counter still says "4 files" and there is no Video tab. Both are server-side, not presentation. The list is paginated server-side (`type` is sent to `adminMedia.page`), so a client-only Video tab would filter one loaded page and silently drop the rest; and the counter comes from a single SQL aggregate that only splits image / not-image. Faking either would be worse than leaving them.

Exact edits, in two files I do not own. Three lines plus one aggregate:

`src/integrations/trpc/router.ts:1197`
```ts
				type: z.enum(["all", "image", "file", "video"]).default("all"),
```

`src/server/repo/admin.ts:1028`
```ts
export type MediaType = "all" | "image" | "file" | "video";
```

`src/server/repo/admin.ts:1036-1042` — add the video branch and take video out of "file":
```ts
	if (opts.type === "image") conds.push(like(media.contentType, "image/%"));
	else if (opts.type === "video") conds.push(like(media.contentType, "video/%"));
	else if (opts.type === "file") {
		const notMedia = and(
			or(isNull(media.contentType), sql`${media.contentType} not like 'image/%'`),
			or(isNull(media.contentType), sql`${media.contentType} not like 'video/%'`),
		);
		if (notMedia) conds.push(notMedia);
	}
```

`src/server/repo/admin.ts:1443-1450` — split the count:
```ts
			images: sql<number>`sum(case when ${media.contentType} like 'image/%' then 1 else 0 end)`,
			videos: sql<number>`sum(case when ${media.contentType} like 'video/%' then 1 else 0 end)`,
			…
	const videos = Number(r?.videos ?? 0);
	return { total, images, videos, files: total - images - videos, bytes: Number(r?.bytes ?? 0) };
```

Once those land, `admin.media.tsx` needs `Filter` widened to include `"video"`, `Stats` a `videos: number`, one more tab button beside Images/Files, and ` · ${plural(stats.videos, "video")}` in the counter — all four inside my file, and I have left it so that is the whole of it. I did not pre-wire them because `type: "video"` would not type-check against today's router enum.

## 7. Acceptance: the two screens otherwise unchanged

`.work/ui-audit/fixe/settings-1440x900.png` and `.work/ui-audit/fixe/nav-1440x900.png`, both at 1440x900.
Nav still shows Header settings above the menu tree with the same fields and the same expandable rows; the row controls are unchanged visually and only their accessible names and disabled states differ. Settings is unchanged apart from the raw-row Save button now reading "Saving…" while it writes.

## 8. `admin.languages.tsx` empty state

The table used to render its header over nothing when no language existed. It now says so, and says what to do:

> No languages yet — add one above. The site needs at least one, and the first you add becomes the default.

## Notes

- Two `ActionMenu` call sites in my files (`TermsManager`, `admin.languages`) now pass `label={\`Actions for ${…}\`}`. FIX-C shipped that prop and left the 18 call sites to a later job; these two are in my file set and were the same M07 defect, so I took them rather than leaving a named control called "Row actions" on every row of a screen I was already fixing.
- The MCP browser profile was held by another pane, so the evidence was collected with an isolated Chromium driven by `playwright-core` installed under `/tmp`. Nothing was added to the repo's dependencies, and the harness is deleted.
- The dev server on `:3011` was used as given; no second server was started, and `kape.db` was not touched. The uploads and the term save above went to `.work/scratch/uitest.db`.
- No `git` write command was run.
