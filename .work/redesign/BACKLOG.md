# Backlog: admin redesign round

Frozen at first dispatch. What actually happened lives in `.work/LEAD.md`; when the two disagree, LEAD wins.

Audit: `docs/ui-audit.md`. Spec every job builds to: `.work/redesign/DESIGN.md`.
Phase 2, not this round: `docs/inline-editing-plan.md`.

## Baseline

Measured in the lead pane at 07:24 on `cms-core` at `fa65dea`, working tree clean.

| Check | Command | Result |
|---|---|---|
| Tests | `bun run test` | **399 passed, 43 files** |
| Types | `bunx tsc --noEmit` | **silent** |
| Lint | `bun run lint` | **8 errors, 0 warnings** |
| Build | `bun run build` | not re-measured; green last round |

The runner is vitest. `bun run test`, never `bun test`, which skips jsdom and reports false failures.

**Lint is already red, so it gates on delta, not on zero.** All 8 are `noArrayIndexKey`, all pre-existing:

```
src/components/admin/CampaignForm.tsx:298      src/components/admin/SectionsBuilder.tsx:362
src/components/admin/FormBuilder.tsx:280       src/routes/admin.footer.tsx:80
src/components/admin/ProjectForm.tsx:242       src/routes/admin.footer.tsx:373
src/components/admin/SectionsBuilder.tsx:175
src/components/admin/SectionsBuilder.tsx:282
```

A job may not add a ninth. A job that removes one is welcome to, and says so.

## Per-job verification

Every job proves all four before it reports, and pastes the real output:

1. `bun run test` at 399/43 or better
2. `bunx tsc --noEmit` silent
3. `bun run lint` at 8 errors or fewer
4. `bun run build` green
5. Its own screens exercised in a browser for the behaviour they had before

Then one commit naming the surface redesigned.

## Instances

**Never `kape.db`. Never port `:3020`, which is KAPE's own.**

Each job runs its own dev server on its own port against its own copy:

```
sqlite3 kape.db "VACUUM INTO '.work/redesign/j<NN>.db'"
PORT=30<NN> DATABASE_PATH=.work/redesign/j<NN>.db AUTH_SECRET=redesign-audit-secret-key-0001 \
  bun --bun vite dev --port 30<NN>
```

`PORT=` is not optional: `getUrl()` falls back to 3000, so `--port` alone makes every server
render fetch a dead port. See `jobs/COMMON.md`.

Sign-in on a fresh copy needs a known password, since the copy carries KAPE's own hash:

```
DATABASE_PATH=.work/redesign/j<NN>.db bun -e '
import { hashPassword } from "#/server/auth";
import { Database } from "bun:sqlite";
const h = await hashPassword("redesign-dev-pw");
new Database(".work/redesign/j<NN>.db").run(
  "update users set password_hash = ? where email = ?", [h, "admin@kapekh.org"]);'
```

Then `admin@kapekh.org` / `redesign-dev-pw`.

Ports are assigned per job below. Two jobs sharing a port will fight over HMR and corrupt each other's evidence, which cost the last round a whole job.

## Jobs

`deltas` cite `docs/ui-audit.md`. `owns` is exact and exclusive: two jobs never open the same file.

| id | title | deltas | owns | port | state | pairs with |
|---|---|---|---|---|---|---|
| **J01** | Design system foundation | F01-F12 | `src/styles.css`; `src/components/ui/*` (7 existing + `card` `badge` `table` `page-header` `skeleton`); `src/components/Dialogs.tsx`; `src/components/admin/{form-ui,list-ui,ActionMenu,AdminHeader,AdminIcon,MediaThumb}.tsx` | 3041 | **ready** | nothing. Runs alone |
| **J02** | Shell, dashboard, login | S1-S6, D1-D5, X3, X4 | `src/routes/admin.tsx`; `src/routes/admin.index.tsx`; `src/routes/login.tsx` | 3042 | after J01 | J03, J05 |
| **J03** | The ten canonical lists | L1-L7, L9 | `src/routes/admin.{campaigns,donors,offices,pages,partners,people,posts,projects,schools,users}.index.tsx` | 3043 | after J01 | J02, J05 |
| **J04** | The five off-pattern lists, terms, donations | L1, L2, L8, X1, X2 | `src/routes/admin.{forms.index,roles.index,messages,donations.index,forms.$id.submissions,campaigns.$id.donations}.tsx`; `src/routes/admin.{doc-categories,locations,partner-categories,publication-categories}.tsx`; `src/components/admin/{TermsManager,DonationsTable}.tsx` | 3044 | after J01 | J10, J11 |
| **J05** | Shared editor controls | E5, E6, F10, F11 | `src/components/admin/{RichTextEditor,LangTabs,SearchableSelect,MapField,MapPicker}.tsx` | 3045 | after J01 | J02, J03 |
| **J06** | Editors A: posts, projects, campaigns | E1-E6 | `src/components/admin/{PostForm,ProjectForm,CampaignForm}.tsx`; `src/routes/admin.{posts,projects}.{new,$id}.tsx`; `src/routes/admin.campaigns.{new,$id.index,$id}.tsx` | 3046 | after J01, J05 | J07, J08 |
| **J07** | Editors B: people, schools, offices, partners | E1-E6 | `src/components/admin/{PeopleForm,SchoolForm,OfficeForm,PartnerForm}.tsx`; `src/routes/admin.{people,schools,offices,partners}.{new,$id}.tsx` | 3047 | after J01, J05 | J06, J08 |
| **J08** | Editors C: forms, users, roles, donors | E1-E6 | `src/components/admin/{FormBuilder,UserForm,RoleForm,DonorForm}.tsx`; `src/routes/admin.{users,roles,donors}.{new,$id}.tsx`; `src/routes/admin.forms.{new,$id.index,$id}.tsx` | 3048 | after J01, J05 | J06, J07 |
| **J09** | The page studio | P1-P6 | `src/routes/admin.pages.{new,$id}.tsx`; `src/components/admin/{PageForm,SectionsBuilder,PagePreview,PageSwitcher}.tsx` | 3049 | after J01, J05 | J12, J13 |
| **J10** | Media library and pickers | M1-M3, E7 | `src/routes/admin.media.tsx`; `src/components/admin/{MediaPicker,MediaLibraryDialog}.tsx` | 3050 | after J01 | J04, J11 |
| **J11** | Settings and modules | G1, G2, G8 | `src/routes/admin.settings.tsx`; `src/routes/admin.modules.tsx` | 3051 | after J01 | J04, J10 |
| **J12** | Header and footer builders | G3, G4, F10 | `src/routes/admin.nav.tsx`; `src/routes/admin.footer.tsx` | 3052 | after J01, J05 | J09, J13 |
| **J13** | Languages, UI strings, org chart, account | G6, G7, G8 | `src/routes/admin.{languages,ui-strings,org-chart,account}.tsx`; `src/components/admin/OrgCanvas.tsx` | 3053 | after J01 | J09, J12 |
| **J14** | Public content states | W1-W5 | `src/components/sections/SectionRenderer.tsx`; `src/components/{FormRenderer,ContactForm}.tsx`; `src/lib/placeholder.ts` | 3054 | after J01 | J15 |
| **J15** | Command palette | S3 | new `src/components/admin/CommandPalette.tsx` only; needs three lines in `src/routes/admin.tsx` which it does **not** own | 3055 | after J02 | J14 |

All 57 admin routes are owned exactly once: J02 has 2, J03 has 10, J04 has 10, J06 has 7, J07 has 8, J08 has 9, J09 has 2, J10 has 1, J11 has 2, J12 has 2, J13 has 4.

## Sequencing, and why

**J01 is the serial gate.** It owns every file with cross-job reach: `form-ui.tsx` has 15 component consumers and 8 route consumers, `ActionMenu.tsx` has 17, `list-ui.tsx` has 10, `Dialogs.tsx` has 55. Nothing else starts until its API is frozen.

**J05 before the editor jobs.** J06, J07, J08, J09 and J12 all render `RichTextEditor`, `LangTabs` or `SearchableSelect`. They never edit those files, but a job restyling a form around an unrestyled control produces work that has to be redone.

**J15 after J02.** The palette needs a mount point in `admin.tsx`, which J02 owns. J15 writes its component and hands the three-line diff to the lead. It does not reach across.

### Waves

Three concurrent, widened from paneout's default of two because file ownership is provably disjoint after J01 and verification stays in the lead pane.

| Wave | Jobs |
|---|---|
| 1 | J01 |
| 2 | J02, J03, J05 |
| 3 | J04, J10, J11 |
| 4 | J06, J07, J08 |
| 5 | J09, J12, J13 |
| 6 | J14, J15 |

## Decided at planning time

- **`LangOpt` is not extracted from `PostForm.tsx`.** The audit's risk register floated it. Seven routes import it type-only, and a type-only import creates no edit contention as long as its shape does not change, which no job is allowed to do. Dropped as unnecessary.
- **`MediaThumb.tsx` is deleted, not redesigned.** Zero importers repo-wide.
- **The seven `src/components/ui/*` files are adopted, not replaced.** 412 lines of radix-backed code with zero importers. No new dependency.
- **Lint gates on delta.** A gate nobody can pass is not a gate.
- **The command palette is a separate job and is the one item that adds a component rather than restyling one.** It is last, and it is the first thing to cut if the round runs long.
