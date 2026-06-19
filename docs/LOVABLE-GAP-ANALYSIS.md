# Lovable build (`kapecambodia-main/`) vs. Requirements

Comparison of the customer's vibe-coded Lovable prototype against `docs/REQUIREMENTS.md`.
**Verdict:** it's an excellent *design + information-architecture reference* and a near-complete
**public-site presentation layer** — built (conveniently) on the **same framework we use**
(TanStack Start + React 19 + shadcn/Radix + Tailwind v4). But it is **~0% of the system**: no
backend, no data, no CMS, no auth, no staff portal. All content is hardcoded mock data and every
action link is `#`.

## What it is, technically
- TanStack Start app, **frontend-only**. No DB, no tRPC/server functions (only a Lovable
  error-reporting stub + an `example.functions.ts`), no auth.
- Clean, consistent **design system**: color tokens, display + Khmer fonts, shadows, animations.
- `Header.tsx` holds a **hardcoded `NAV` array**; each page is a **hardcoded `.tsx`** composing a
  `SubPage` template + `Section`/`Card`/`Grid`/`MediaPlaceholder` block kit.
- `lib/i18n.tsx` = client-side EN/KH dictionary (localStorage) — **UI strings only**, page content
  is English-only.
- Images are `*.asset.json` references already pointing at a Lovable R2 bucket.

## Coverage matrix

| Requirement area | Lovable status | Notes |
| --- | --- | --- |
| Top nav + nested submenus | ✅ Strong | `NAV` matches IA exactly (projects, media ×12, opps ×5) — but **hardcoded**, not data-driven |
| Homepage sections | ✅ Strong | pop-up, hero slideshow, latest news (featured+recents), impact stories, videos, **animated stat counters**, about, donate CTA, footer |
| Design system / theming | ✅ Strong | tokens, Khmer font, motion — the part the customer likes |
| EN/KH i18n | 🟡 Partial | switcher + dict exist, but **UI labels only**; no content-level translation |
| SubPage template + block kit | ✅ Strong | `Section/Card/Grid/MediaPlaceholder` — good basis for page-builder block types |
| Inner page routes (49) | ✅ Strong | who-we-are ×7, current ×9, past ×9, media ×12, opps ×5, contact |
| News & Events | 🟡 Partial | list grid only; **no article detail, no photo album/lightbox, no partner-agency sidebar, no pagination** ("read more" loops back) |
| Leadership | 🟡 Partial | 4 sections + org chart, but **placeholder initials (no photos), no bio pages**, grid is 3-col (spec: 6) |
| Photo Gallery | 🟡 Partial | grid + hover caption; **no album drill-down, no full-screen lightbox w/ prev-next** |
| Video Gallery | 🟡 Partial | grid; not wired to YouTube data |
| Document libraries (Annual Report etc.) | 🟡 Partial | static PDF placeholders; **no viewer, no read/download counters, no 5×5 pagination** |
| Job Vacancies | 🟡 Partial | table w/ deadline present; **deadlines static (no auto-hide), Apply → #** |
| Contact | 🟡 Partial | office cards only; **no contact form, no Google Maps pins** |
| Donate / Partner / Scholarship / Volunteer | 🟡 Partial | pages/CTAs exist, thin content |
| Alumni Network | 🟡 Partial | page exists; **no registration form → DB** |
| Hero slideshow | 🟡 Partial | images only (spec: images **and** videos) |
| Home pop-up | 🟡 Partial | static; **no deadline show/hide, no inspirational fallback** |
| Footer | 🟡 Partial | only on homepage (`index.tsx`), **not global in the shell** |
| Search | ❌ Missing | header link is `#` |
| Site Map | ❌ Missing | header link is `#` |

## Entirely missing (the whole back half of the project)
- **All backend / data layer** — everything is hardcoded mock data.
- **The dynamic CMS** — admin-creatable menus/submenus/pages, the page-builder, content editing.
  The hardcoded `NAV` + per-page `.tsx` **directly contradict** the central requirement that admins
  build pages themselves.
- **Auth & roles** (public / staff / admin).
- **Internal Staff Portal** (slides 37–41): login, internal news feed, calendar of events,
  internal documents by category, staff directory — none exist.
- **Content-level i18n** (DB-stored EN/KH per record).
- **Media handling on our R2** (uploads, data-driven galleries/albums).
- **Forms wiring**: contact → email, newsletter subscribe, alumni registration → DB.
- **Time-bound content** logic (auto-hide announcements/jobs at deadline).
- **Real counters**: visitor analytics + per-document read/download counts.
- **Maps**, **search**, **pagination** logic.
- **Detail routes**: news article, photo album, person bio, success story.

## How to use it (recommended)
1. **Port the presentation layer** into our app (`/home/brilliant/projects/kape`): `styles.css`
   tokens + fonts, `Header`, the homepage sections, and the `SubPage` block kit.
2. **Make it data-driven**: replace the hardcoded `NAV` with a DB nav tree and the per-page `.tsx`
   content with page-builder blocks. The existing `Section/Card/Grid/MediaPlaceholder` kit maps
   cleanly onto block component types.
3. **Lift i18n** to the content level (DB EN/KH per field), keep the switcher UX.
4. **Build the system** that doesn't exist yet: auth, CMS admin, staff portal, forms, R2 media,
   counters, search, maps, pagination, and the detail routes.

**Bottom line:** the Lovable build saves us most of the public-site *design and layout* work and
confirms the IA — but the CMS, auth, staff portal, and all data/server behavior are still the bulk
of the engineering, and the presentation must be re-plumbed from hardcoded to data-driven.
