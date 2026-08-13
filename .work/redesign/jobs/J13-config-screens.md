# J13 — languages, UI strings, org chart, account

Read `.work/redesign/jobs/COMMON.md` first. Port **3053**. Deltas: G6, G7, G8.

Four unrelated config surfaces grouped because nothing else wants them. One of them has a trap that will waste your afternoon if you miss it.

## Files you own

```
src/routes/admin.languages.tsx   (274)
src/routes/admin.ui-strings.tsx  (361)  ← read the warning below
src/routes/admin.org-chart.tsx   (368)
src/routes/admin.account.tsx     (145)
src/components/admin/OrgCanvas.tsx (220)
```

## Read this before you touch `admin.ui-strings.tsx`

**The file contains non-UTF8 bytes. `file` reports it as `data`, and plain `grep` skips it silently, reporting nothing rather than an error.**

Use `grep -a` for anything that searches it, and for any repo-wide search you run while this job is live. A search that returns nothing from this file has not proved the file is clean.

The encoding is worth fixing, and it is the one thing in this job that is not styling. **Ask the lead before changing the file's bytes.** Do not silently rewrite it as UTF-8, because whatever is in there may be intentional Khmer content.

## Do

1. **`ui-strings` is the highest-traffic screen in this job.** 249 dictionary keys, each with a shipped default and an optional per-site override, in two languages. Someone using it is hunting for one string among hundreds.

   Give it search that actually helps, a clear three-state read per row (shipped default, overridden, empty), and a visible reset. An empty value is a reset rather than a blank, which the UI should say rather than leave someone to discover.

2. **`languages`** manages which languages exist, which is enabled, and which is default. Every one of those is consequential: disabling a language changes what the public site serves. It has no empty state at all today (`:159` maps straight off the loading branch).

   It also renders an `ActionMenu` row list inside a config screen, so it is half list and half form. Let it be both, clearly.

3. **`org-chart`** is an `@xyflow/react` canvas plus a form. **Bring the surrounding chrome onto the scale and leave the canvas alone.** It is the one place where the library owns the visual language and that is correct.

   It has the admin's only `autofocus`, in a modal, with a comment saying why. Keep it.

   Its empty state, a card with "+ Add the first person", is one of the better ones in the admin. Keep the idea.

4. **`account`** is someone editing their own profile and password. Two forms, two save semantics, one screen, hand-rolled fields with no `FormSection`. Same treatment `admin.users.$id.tsx` gets in J08: make the two scopes visually distinct.

5. **All four states on all four screens**, plus the empty states that are missing entirely on `languages`.

## Acceptance

1. The four gates from COMMON, pasted.
2. **The dictionary is intact.** Paste the key count before and after. It is 249. Then paste ten keys with their values, before and after.
3. **A UI string still round-trips to the public site.** Override one key, save, load the public page that renders it, and show the new text. Then reset it and show the default return. Paste all four states.
4. **Reset is a reset.** Show that clearing a value restores the shipped default rather than rendering an empty string on the public site.
5. **UI string search finds a key.** Paste the row count before and after a query, and show a search by key and a search by value both work.
6. **The dictionary tests still pass.** `dictionary.test.ts` and `no-brand.test.ts` are the guards that a key exists, is read by something, and is not duplicated. Paste both.
7. **Languages still gate.** Disable Khmer, show `/km` behaves as it did before, re-enable it, show it returns. Paste each step. Then paste the enabled set before and after your change.
8. **The default language is unchanged.** Paste it before and after.
9. **The org chart still renders and still edits.** Add a person to the chart, save, show it on the public org chart, remove it. Paste each step. Then paste the node and edge count before and after your change.
10. **The org chart modal still autofocuses.** Paste the active element on open.
11. **Account still saves.** Change your own display name, save, reload, show it persisted. Then change the password, sign out, sign in with the new one. Paste both.
12. **`admin.ui-strings.tsx` is still valid.** Whatever you did or did not do to its encoding, show the file still parses, the route still renders, and the byte count before and after.
13. Screenshots at 1440 and 390 of all four screens. Eight into `.work/redesign/shots/j13-*.png`.

## Out of scope

- Changing the `@xyflow/react` canvas itself.
- Adding, removing or renaming a dictionary key. `no-brand.test.ts` refuses a seeded key nothing reads and it is right to.
- Adding a language, or changing how language resolution falls back.
- `admin.settings.tsx` and `admin.modules.tsx`. J11.
- `admin.users.$id.tsx`. J08, and it has the same two-forms-one-screen problem, so read its report if it has landed.
- Rewriting `admin.ui-strings.tsx`'s encoding without asking.

## Stop conditions

Everything in COMMON, plus:

- **The dictionary key count changes**, or `dictionary.test.ts` or `no-brand.test.ts` goes red.
- A UI string stops reaching the public site.
- The enabled language set or the default language changes.
- The org chart's nodes or edges change.
- You would need to change `admin.ui-strings.tsx`'s bytes to do your work. Ask first.
