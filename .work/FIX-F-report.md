# FIX-F report - data integrity in the repo layer

All three closed. Gates: `bunx tsc --noEmit` silent, `bun run test` 379 passed / 2 failed over 41
files (both failures belong to another job, see Gates below), `bun run lint` 8 errors 0 warnings -
the known `noArrayIndexKey` sites, none of them mine.

Everything below was run against `.work/scratch/fixf.db`, a `VACUUM INTO` copy of `kape.db`, and a
dev server on port 3033. `kape.db` and `.work/uat/uat.db` were never opened for writing.

## B1 - a refused delete destroys the record first. Closed.

`deleteProject` and `deleteLanguage` in `src/server/repo/admin.ts` now run their statements inside
`db.transaction((tx) => …)`, the same shape `deleteMedia` already used. The school's foreign key
still refuses the delete; the refusal now rolls back the three clears that used to commit ahead of
it.

Repro on the copy of the real fixture, project HCC (id 3, two schools attached):

| | translations | project_donors | project_locations | schools | project |
|---|---|---|---|---|---|
| before | 6 | 1 | 1 | 2 | 1 |
| after the refused delete | 6 | 1 | 1 | 2 | 1 |

The refusal is `FOREIGN KEY constraint failed`. Detaching the schools and deleting again clears all
of it and removes the project, so the ordinary path is intact.

Driven through the admin as well, not just the repo: `/admin/projects` → HCC → Delete → Confirm
toasts *"Something else still points at this record. Remove those links first, then try again."*
(`saveErrorMessage` already maps the constraint), and the five counts above are unchanged after it.
The message does not name the two schools. Fixing that means a pre-check listing them, in the shape
of `MediaInUseError`; I left it, it is polish on a path that no longer loses anything.

`deleteLanguage` got the same treatment. It has no incoming foreign key so it cannot be refused, but
it writes three tables and its first statement deletes every translation in that language - a crash
between statements is unrecoverable.

### Sweep of the rest of `src/server/repo/`

Only two multi-statement deletes can have their **last** statement refused, and both are fixed:
`deleteProject` (schools.project_id) and `deleteUser` (sessions.user_id). Every other table with an
incoming foreign key has that dependant cleared by the same function first - `deletePost` clears
`post_media`, `deleteForm` clears `form_submissions`, `deleteCampaign` clears `donations` - so their
final delete cannot trip. Left alone deliberately.

Two things the sweep turned up that are outside this job:

- `deletePage` (`admin.ts:813`) is the widest unguarded one: it reparents children, recomputes their
  slugs and writes 301s, then deletes translations and the page, across a dozen statements with no
  transaction. It cannot be *refused* (nothing points at `pages`), but a failure partway leaves the
  tree half-reparented with slugs that no longer match. Wrapping it is not a five-line change:
  `recomputeSubtree` and `slugFor` are async and `bun:sqlite` transactions take a synchronous
  callback, so the whole reparent path has to be rewritten in the sync builder API. Half a day with
  a test. Worth doing before launch, not worth doing inside this job.
- `deleteDonor` (`admin.ts:1987`) is refused with a raw constraint error whenever the donor is
  attached to a project. One statement, so nothing is lost, but the admin gets no way to find the
  projects holding it.

## B2 - a user who has ever signed in can never be deleted. Closed.

`deleteUser` in `src/server/repo/users.ts` now **deletes** the user's sessions instead of revoking
them, both statements in one transaction.

Deleting the rows rather than cascading the foreign key, because a revoked session that outlives its
user has no reader: `validateToken` joins the session to the user and fails closed when the user is
gone, and nothing else reads the table. Keeping the rows would only be worth a migration if they
were an audit trail, and they are not - there is no view of them anywhere in the admin, and the row
holds nothing but an id, a user id, a user agent and two timestamps. The FK stays strict, which is
what keeps a session from pointing at a user who never existed.

Repro on the copy, both paths:

- created `uat-signedin@test.example`, authenticated with the real `authenticate` + `createSession`
  (token validated true), signed out with `revokeSession`, one session row left behind - delete
  succeeded, user rows 0, session rows 0.
- created `uat-never@test.example`, no session, delete succeeded.
- the admin account's own 10 session rows were untouched by both.

Before the fix the first of those two returns `FOREIGN KEY constraint failed` and the user stays.

## B3 - adding a language 404s the whole site. Closed, the honest way.

The router still matches the hand-maintained `LANGS`. I did not touch that; see the price below.
Two changes make the admin tell the truth instead:

- `bootstrapI18n` (`src/server/repo/i18n.ts`) filters the switcher list to languages `LANGS` can
  serve. This is the one query the public chrome reads, so a language the router has no prefix for
  is never offered to a visitor. `i18n.languages`, which the admin translation tabs read, is
  untouched - you can still author content in the new language while you wait for the developer.
- `/admin/languages` marks it at the point of the action. Adding `fr` toasts *"French added. The
  site can't serve /fr/ yet: a developer has to add "fr" to LANGS in src/lib/i18n-config.ts. Until
  then it stays out of the visitor language switcher, and you can already translate content into
  it."*, the row carries the same sentence in destructive colour under the name, and "Make default"
  is disabled for it - making an unroutable language the fallback would have been the next trap.
  The page intro no longer claims a new language "appears in the site switcher immediately".

Verified in the running app: added French through the admin form, admin row shows the warning and
the disabled "Make default"; the public header switcher offers English and ខ្មែរ only, and
`i18n.bootstrap` returns `en` and `km`. `/fr` still 301s to `/en/fr` and 404s, unchanged - nothing
links there now.

**Pricing the real fix**, if the lead wants it: making the router read the `languages` table means
the route tree can no longer be a static `LANGS` array. TanStack route definitions are synchronous
and the file-based generator produces `$lang` as a plain param already, so the shape of the work is
(a) drop the `LANGS.includes` gate from `detectLang`/`stripLang`/`localizedHref` and take the set
from a value loaded once at server boot, (b) give the `$lang` route a `beforeLoad` that 404s on a
code the table does not have, (c) invalidate that cached set when the admin writes to `languages`,
(d) rework `prerender-paths` and the sitemap, which already read the table, to agree. Roughly a day
including the prerender path, and it introduces a boot-time DB read into a module that is currently
pure - which is why I did not do it under a "laziest thing that holds" brief.

## Runnable checks left behind

`src/server/repo/delete-integrity.test.ts`, 5 tests, following the subprocess-plus-real-install
pattern of `admin-guards.test.ts` (vitest runs under node, `bun:sqlite` does not).

Confirmed it fails without the fix: reverting both hunks turns two of the five red -
`expected { translations: 0, donors: 0, … } to deeply equal { translations: 6, donors: 1, … }` for
B1 and `expected 'FOREIGN KEY constraint failed' to be ''` for B2. Restored, all five pass.

B3 has no automated check. Its logic is a one-line `filter` over `LANGS` and the admin copy that
goes with it; the repro above is in the running app.

## Gates

- `bunx tsc --noEmit` - silent.
- `bun run test` - 381 tests over 41 files, 379 passed. The two failures are
  `src/lib/ui-strings/dictionary.test.ts` and `src/lib/no-brand.test.ts`, both on
  `forms.yourName`: the key is defined in `src/lib/ui-strings/sections.ts:34` and has no call site
  yet. That is FIX-G's in-flight work on `SectionRenderer`, not mine - I added no dictionary keys
  and opened nothing under `src/lib/ui-strings/`.
- `bun run lint` - 8 errors, 0 warnings, all `noArrayIndexKey` in `CampaignForm`, `FormBuilder`,
  `ProjectForm`, `SectionsBuilder` and `admin.footer`.
- `bunx biome check` clean on all five files I touched.

## Files changed

- `src/server/repo/admin.ts` - `deleteProject`, `deleteLanguage` wrapped in a transaction.
- `src/server/repo/users.ts` - `deleteUser` deletes sessions in a transaction.
- `src/server/repo/i18n.ts` - `bootstrapI18n` filters the switcher list to routable languages.
- `src/routes/admin.languages.tsx` - unroutable languages marked, "Make default" disabled for them,
  intro copy corrected.
- `src/server/repo/delete-integrity.test.ts` - new.

No git command was run. `kape.db` mtime is unchanged.
