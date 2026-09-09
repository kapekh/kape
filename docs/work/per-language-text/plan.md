# Per-language text, and the director's portrait

## Context

Editing a person's **Position** in Khmer rewrites what English readers see. This is not an
inline-editing glitch: `people.position` is a single column shared by every language
(`src/server/repo/admin.ts:1197`, whose comment admits it), and the editor is even shown a note
saying so (`sharedNote`, `src/lib/inline-edit.tsx:96`). A Khmer position is unstorable.

An audit of every editor-authored text column found the same shape in five more tables, plus three
tables that hardcode exactly two languages as column pairs, where a third language can hold nothing:

| Table | Column(s) | Shape |
|---|---|---|
| `people` | `position` | one value for all languages — **the reported bug** |
| `terms` | `label` | one value — category and location names, shown publicly |
| `offices` | `name`, `address` | one value — contact page |
| `schools` | `name`, `address` | one value |
| `org_nodes` | `name`, `title` | one value — org chart |
| `people` | `name_en` / `name_km` | en+km only |
| `campaigns` | `title_km`, `blurb_km` | en+km only |
| `forms` | `title_km` | en+km only |

The mechanism that works already exists: the `translations` table
(`entity_type`,`entity_id`,`field`,`lang`), resolved by `resolveTranslations` /
`resolveOneWithFallback` (`src/server/repo/i18n.ts`) and already used for pages, posts, projects,
nav items, stats, hero slides and a person's `bio`. Every fix below moves text onto that mechanism.

Separately, `who-we-are/director-speech` is a wall of text; it should carry the Executive Director's
portrait beside the message with his name and position beneath it, sourced from his person record so
the caption is per-language for free and his photo is changed in one place.

## Outcome

A Khmer visitor reads Khmer job titles, category names, office addresses and org-chart titles. An
editor sets each of them per language in the dashboard and in place on the page. The director-speech
page shows his portrait, and his photo is changed from the dashboard or swapped on the page.

## Check

`bun run check` currently runs only `biome check`. First commit redefines it as the repo's one gate —
`bunx tsc --noEmit && bun run lint && bunx vitest run` — and points `deploy/ship.sh` at it, so the
gate and the deploy cannot drift. Every job below is green under `bun run check`.

## Job 1 — A person's text becomes translation rows

The vertical slice that proves the pattern. Converts `name`, `position` and `bio` together, because
the admin form's `bio: { en, km }` hardcodes the same two languages the name columns do.

- `src/lib/record-fields.ts` — `position` moves from `PERSON_COLUMN_FIELDS` into
  `TRANSLATED_FIELDS.person`; `PERSON_NAME_COLUMNS` and the `isRowField` special case for `name` are
  deleted.
- `src/server/repo/admin.ts` — `writePersonColumn` is deleted; `updateField` routes every person
  field to the existing `writeTranslationField`.
- `src/lib/inline-edit.tsx` — the `person: ["position"]` entry leaves `SHARED_ACROSS_LANGUAGES`.
- `src/server/repo/people.ts` — `listPeople`, `colleaguesOf` and `getPersonBySlug` resolve `name` and
  `position` through `resolveTranslations` with the same `i18nFallback` marking `bio` already gets;
  `cols()` stops writing name/position columns; `writeBio` becomes `writePersonText`.
- `src/integrations/trpc/router.ts` — `personInput` takes `translations: [{ lang, name, position,
  bio }]`, the shape `PostForm` already sends (`src/components/admin/PostForm.tsx:248`).
- `src/components/admin/PeopleForm.tsx` — name and position move inside the existing `LangTabs`
  beside bio.
- `src/routes/admin.people.index.tsx` — the list and its position/name search read translations.
- `src/server/seed/*` — people seeds write translation rows.
- Migration `0018`: copy `position` and `name_en`/`name_km` into `translations` for the matching
  language, then drop the three columns. `INSERT ... SELECT ... ON CONFLICT DO NOTHING`, default
  language read from `languages.is_default` (never hardcoded), inside the migration's transaction.

**Failing check first:** `src/components/sections/SectionRenderer.row.test.tsx:228,251,313` assert
today's shared-position behaviour ("the position is one column for every language"). Invert them —
they are the reproduction.

## Job 2 — The rest of the public-facing shared text

Same pattern, one migration per table, no new mechanism: `terms.label`, `offices.name`+`address`,
`schools.name`+`address`, `org_nodes.name`+`title`. Each: schema column dropped, data copied to
`translations` under a new `entity_type`, repo read switched to `resolveTranslations`, the admin form
field moved into `LangTabs`, seed updated, one repo test proving en and km differ.

## Job 3 — The remaining two-language column pairs

`campaigns.title_km`+`blurb_km` and `forms.title_km`, converted the same way. Largest blast radius of
the three i18n jobs (donate and forms flows), and independent of Jobs 1-2 — drop it without
consequence if you would rather not touch payments this round.

## Job 4 — The director's portrait

- `src/lib/sections.ts` — the `split` section gains an optional `personId` field. Its `image`,
  `imageCaption`, name and position then come from that person.
- `src/server/repo/sections.ts` — `resolveSections` resolves `personId` to the person's photo, name
  and position **in the requested language**, so Job 1 makes the caption bilingual for free.
- `src/components/sections/SectionRenderer.tsx` — the `split` renderer (line 1647) draws the portrait
  with the name and position beneath it, matching the reference; when `personId` is set the camera
  badge is the existing `PersonPhotoEdit` (line 2547), so an in-page swap writes the person's photo
  rather than a section prop.
- `src/server/seed/pages-who-we-are.ts` — `directorSpeechSections`: the "Warm greetings" richtext
  becomes a `split` with `layout: "media-right"` pointing at the Executive Director.
- Dashboard: his photo is already changeable at `/admin/people/<id>` (`PeopleForm` line 306 has a
  `MediaPicker`); this job makes that picture appear on the speech page too.

## Risks

- **Dropping columns loses data if a copy is wrong.** Each migration copies before it drops, in one
  transaction, and `deploy/ship.sh` already runs `deploy/backup.sh` first. Before deploying, restore
  a prod backup locally, migrate it, and diff the row counts (see Verification).
- `people.name_en` is `NOT NULL` and is the record's label in admin lists, search, the org chart and
  the footer. Job 1 is the widest of the four; if it goes long, position alone still fixes the
  reported bug and name can stay on columns.
- Migrations run at boot and are fatal on failure (`src/server/db.ts:19`) — a bad migration takes the
  site down, not just the feature.

## Verification

1. `bun run check` green on the assembled tree, not per branch.
2. Seed a throwaway db (`seed:kape` with `DATABASE_PATH`), `bun run dev` on it, then in a browser:
   set a Khmer position on one person in `/admin/people/<id>`, and confirm `/km/who-we-are/our-team`
   shows Khmer while `/en/who-we-are/our-team` still shows English. Repeat the edit **in place** on
   the public page in both languages.
3. Same two-language pass for a category name, an office address and an org-chart title (Job 2).
4. `/en/who-we-are/director-speech` and `/km/...` show the portrait with the right caption; swap the
   photo from the page and from `/admin/people/<id>` and confirm both the speech page and the team
   page change.
5. **Migration rehearsal on real data**: copy a prod backup to a scratch file, point `DATABASE_PATH`
   at it, boot, then assert every previously non-empty `position`/`name_km` has a matching
   `translations` row and no person lost a name.
