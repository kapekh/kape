# J04 — the five off-pattern lists, terms, donations

Read `.work/redesign/jobs/COMMON.md` first. Port **3044**. Deltas: L1, L2, L8, X1, X2.

Ten routes and two components that missed the `list-ui` migration. Bringing them onto it is composition, not logic, and it is the largest single consistency win left after J03.

## Files you own

```
src/routes/admin.forms.index.tsx              (163)
src/routes/admin.roles.index.tsx              (144)
src/routes/admin.messages.tsx                 (115)
src/routes/admin.donations.index.tsx          (115)
src/routes/admin.forms.$id.submissions.tsx    (234)
src/routes/admin.campaigns.$id.donations.tsx  (102)
src/routes/admin.doc-categories.tsx           (13)
src/routes/admin.locations.tsx                (13)
src/routes/admin.partner-categories.tsx       (13)
src/routes/admin.publication-categories.tsx   (13)
src/components/admin/TermsManager.tsx         (227)
src/components/admin/DonationsTable.tsx       (191)
```

The four category routes are 13-line config wrappers. All their UI is in `TermsManager`, so you redesign it once and they inherit.

## Do

1. **L1 — the five off-pattern lists onto `list-ui`.** `forms.index`, `roles.index`, `messages`, `donations.index` and `forms.$id.submissions` each hand-roll what the other ten get from the component: search, empty state, load error with a retry, horizontal scroll behaviour.

   **`donations.index` is the careful one.** It has its own filter state. That state is behaviour and survives exactly. Adopt `list-ui`'s presentation around it, not instead of it.

2. **`PageHeader` and `Table` on all of them** (F06, F08). Same treatment J03 applies to the canonical ten. Read J03's report if it has landed so the two blocks match.

3. **L2 — one row affordance.** Same choice J03 made. **Match it.** Two halves of the admin disagreeing about how a row works is worse than either choice.

4. **`Badge` for status** (F07). `admin.campaigns.index` has a `statusStyle` map that J03 owns; yours are the `forms.index` active pill and the donation statuses.

5. **X1 — `forms.$id.submissions`.** A submissions inbox rendered as a bare table. This is a reading surface, not an editing one: someone scanning what visitors sent. Design it as such.

6. **X2 — `DonationsTable`.** Shared by `donations.index` and `campaigns.$id.donations`. Restyle once; both inherit. `DonationStat`, `donationTotals` and `fmtMoney` are exported from it and are used by both — **their signatures do not change**.

7. **L8 — `TermsManager`.** One component behind four routes. It has a table, an add-one-above form and an empty state reading "No items yet - add one above." Give it the standard treatment.

8. **The four states on every surface.** `messages` currently has a bordered-card empty state, `roles.index` has "No roles yet." with no call to action, `forms.$id.submissions` has "No responses yet." with none either. All four states, everywhere, and a filtered-empty worded differently from a never-had-any.

## Acceptance

1. The four gates from COMMON, pasted.
2. **Row counts unchanged.** All ten routes, before and after, pasted side by side.
3. **The donations filter still filters.** Paste the row count unfiltered, then under each filter value, before and after your change. Four numbers must match four numbers.
4. **`donationTotals` still totals.** Paste the computed total on `/admin/donations` and on one campaign's ledger, before and after. Money that changes under a redesign is the worst possible outcome here.
5. **Search works on all five newly-migrated lists.** For each, paste the count before and after a query that matches one row.
6. **A failed list query names itself and offers a retry** on all five. Break the query, paste the message and show the retry works.
7. **`TermsManager` still adds, edits and deletes.** On `/admin/locations`: add a term, rename it, delete it, paste the count at each step. Then show the other three category routes render.
8. **A refused delete still explains itself.** Delete a term something points at. Paste the message.
9. **`forms.$id.submissions` still lists real submissions.** Paste the count and one row's fields before and after.
10. **390px on all ten.** Paste `clientWidth` and `scrollWidth` for each table wrapper. Equal, not clipped.
11. Screenshots at 1440 and 390 of `forms.index`, `messages`, `donations.index`, `forms.$id.submissions` and one category route. Ten into `.work/redesign/shots/j04-*.png`.

## Out of scope

- `list-ui.tsx` and `ActionMenu.tsx`. J01 owns them.
- The ten canonical lists. J03.
- `admin.campaigns.index.tsx`. J03 owns it, even though it is the other half of the campaigns surface.
- Any form editor.
- Adding filters or sort that need a new query.

## Stop conditions

Everything in COMMON, plus:

- **A donation total or a row count changes.**
- `donations.index` cannot keep its filter state while adopting `list-ui`. Report it and leave that one route hand-rolled rather than changing how it filters.
- A `DonationsTable` export would need a different signature.
- J03 chose a row affordance you cannot match. Ask the lead rather than diverging.
