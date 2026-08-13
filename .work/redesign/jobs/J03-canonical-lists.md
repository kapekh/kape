# J03 — the ten canonical lists

Read `.work/redesign/jobs/COMMON.md` first. Port **3043**. Deltas: L1-L7, L9.

Ten routes that already share `list-ui`, so they are already near-identical. That is the point: one pattern, applied ten times, and it is the largest single block of the admin.

## Files you own

```
src/routes/admin.campaigns.index.tsx   (209)
src/routes/admin.donors.index.tsx      (176)
src/routes/admin.offices.index.tsx     (189)
src/routes/admin.pages.index.tsx       (177)
src/routes/admin.partners.index.tsx    (192)
src/routes/admin.people.index.tsx      (204)
src/routes/admin.posts.index.tsx       (204)
src/routes/admin.projects.index.tsx    (153)
src/routes/admin.schools.index.tsx     (223)
src/routes/admin.users.index.tsx       (204)
```

**You do not own `src/components/admin/list-ui.tsx` or `ActionMenu.tsx`.** J01 owns both and froze their APIs. Consume them.

## Do

1. **`PageHeader` on all ten** (F08). Title, description, breadcrumb, the primary action, and a toolbar holding search and filters. Today the wrapper `flex items-center justify-between mb-6` is byte-identical in these ten files and the `h1` string is one of three.

2. **`Table` on all ten** (F06). Today: 9 distinct `<th>` strings, 27 distinct `<td>` strings, and two different row heights (`py-2` in some, `py-2.5` in others). One 56px row everywhere.

3. **L2 — one row affordance, not two.** Every row currently offers a bare accent-coloured `Edit` word **and** a `⋯` menu. Pick one and apply it to all ten. The recommendation is the whole row targets the editor and the `⋯` menu holds everything including Edit.

   **`ActionMenu`'s keyboard behaviour and its `label` prop are load-bearing.** If you make the row clickable, a keyboard user must still reach both the row and the menu, and the menu must not be inside the row's click target in a way that swallows its own activation.

4. **L3 — `Badge` for status** (F07). These ten routes carry four different shells for the same published pill and copy-paste the green token five times.

5. **L5 — count and filters in the toolbar.** The header says `Pages` where it could say what is there. Add a row count, and status filter chips where a status exists.

   **Filtering is client-side over data the route already loaded.** `matchesQuery` from `list-ui` is the existing model. If a filter would need a new query, stop.

6. **L4 — page hierarchy.** `admin.pages.index.tsx` shows the tree as a ~16px indent, unreadable across 39 rows (`.work/redesign/shots/rd-02-pages.png`). Indent guides, and the parent as breadcrumb text under the title. This one route only.

7. **L7 — stacked cards below `md`.** J01's `Table` does this for you. Verify it, do not reimplement it. Today the table scrolls horizontally and clips the status column mid-word at 390px.

8. **L9 — a real not-found state.** These are index routes so this is mostly for their `$id` siblings, but `list-ui`'s error state should be the model. Where a list query fails, it already names itself and offers a retry; keep that and restyle it.

9. **The four states on every one of the ten.** Loading is a `Skeleton` in the shape of the table, with the header staying put. Empty says what would be here and offers the one action. **A filtered-empty result is worded differently from a never-had-any** — today only `/admin/media` makes that distinction and it should be all of them.

10. **`admin.posts.index.tsx` carries the `?type=` search param** and renders eleven different collections. Its heading takes the raw parameter. Restyle it; do not try to validate the parameter, which is logic and is a known open defect.

## Acceptance

Do each of these on **three** routes minimum — `pages`, `posts` and `users` — and state that you checked the other seven.

1. The four gates from COMMON, pasted.
2. **Search still filters.** On `/admin/pages`, paste the row count before, then after typing a term that matches one page. Then clear it and show the count returns.
3. **Delete still works end to end.** Open a row menu, Delete, Cancel — row still there. Escape — row still there. Confirm — row count drops by one. Paste all four counts. Use your own copy.
4. **A refused delete still explains itself.** Delete something another record points at. Paste the message. It must still name what is holding the record.
5. **Row count before and after.** For all ten routes, paste the row count from before your change and after. Identical, or you have broken a query.
6. **The `⋯` menu still works by keyboard.** Tab to it, open, reach Delete, Escape, and show focus returns to the trigger. Paste the sequence. Do this on whichever affordance you chose in step 3 of Do.
7. **Row navigation.** If you made rows clickable, show a keyboard user can reach both the row and the menu, and that activating the menu does not also trigger the row. Paste the sequence.
8. **390px is stacked cards, not a scroll.** Paste `clientWidth` and `scrollWidth` of the table wrapper on `/admin/users`. They must be equal — today they are 70 against 442.
9. **Two distinct empty states.** Show the never-had-any wording and the filtered-away wording on the same route, with the copy for each.
10. **Loading preserves layout.** Throttle or delay the query and screenshot the skeleton. The `PageHeader` must still be there.
11. **`?type=` still filters.** `/admin/posts?type=news` returns the news rows only. Paste the count against the unfiltered one.
12. Screenshots at 1440 and 390 of `pages`, `posts` and `users`. Six into `.work/redesign/shots/j03-*.png`.

## Out of scope

- `list-ui.tsx` and `ActionMenu.tsx`. J01 owns them. If one does not fit, report the gap; do not fork it.
- The five off-pattern lists — `forms.index`, `roles.index`, `messages`, `donations.index`, `forms.$id.submissions`. That is J04.
- The `TermsManager` wrappers. J04.
- Sortable column headers. Sort state is new logic. If the design wants the affordance, ship it inert and flag it.
- Validating the `?type=` parameter.
- Any `.new` or `.$id` editor route.

## Stop conditions

Everything in COMMON, plus:

- **A row count changes.** You have altered a query.
- A filter you want needs a new server call.
- Making the row clickable breaks the menu's keyboard path, and you cannot have both. Report it and keep the two-affordance row rather than shipping a keyboard regression.
- `removeWithRollback`'s optimistic delete stops rolling back on failure.
