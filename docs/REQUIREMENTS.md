# KAPE Website & CMS — Requirements

> Source: `kate_website_requirement.pptx` (41 slides). Reference site: kapekh.org.
> Reference build: `kapecambodia-main/` (separate codebase, excluded from this project's tsconfig).
> This document captures *what to build*. Architecture decisions still open are listed at the end.

## 1. Overview

KAPE (Kampuchea Action to Promote Education / អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា) is the
largest local education NGO in Cambodia, HQ in Kampong Cham. This project is a from-scratch,
**CMS-driven, bilingual (English + Khmer)** public website **plus a login-gated internal staff
portal**.

The defining requirement, repeated across nearly every slide: **non-technical admins must be able
to create menus, nested submenus, and pages themselves**, and compose each page from arbitrary
sections (text, images, videos, charts, logos+links, maps, PDFs, audio, embedded forms). This is a
**page builder**, not a fixed-template site.

## 2. Public site — information architecture

Top nav (Menu Bar): **Home · Who We Are · What We Do · Media and Publications · Opportunities ·
Donate · Contact Us**. Global: Search, EN/KH language toggle, auto-generated **Site Map**,
**"For Staff Only"** login link.

### 2.1 Home
- **Pop-up**: shows the latest job/bidding announcement; auto-disappears at its deadline. When none
  is active, shows an inspirational message instead. Closable; click-through to full text.
- **Hero**: slideshow of **images and videos** with tagline ("Where every Cambodian child learns,
  dreams, and rises.").
- **Latest News & Events**: one large featured post (title + description + "read more" → full
  article with photo album) + recent posts that **rotate** — when a new post arrives, older ones
  move to the right sidebar. "See all" → section page.
- **Impact Stories** section and **Videos** section (3 columns each); "read more" / "watch more" /
  "See all".
- **Announcements**: list with scheduled dates; **auto-hide when deadline passes**.
- **Stat counters** (animated): preschools, primary schools, secondary schools, higher
  institutions, students, teachers/principals, stakeholders.
- **Footer**: quick links, **e-newsletter subscribe** (email capture), contact info, social
  ("Follow Us"), copyright, **visitor counter** (Today / Yesterday / This Month / This Year /
  Total).

### 2.2 Who We Are (submenus)
- **About KAPE** — rich text + images/graphs/videos + a **map** with KAPE-logo pins marking project
  locations; clicking a pin shows project name, school name, photos.
- **News and Events** — grid **5 rows × 3 columns**, auto-paginate; full article = title + photo
  album (lightbox with captions, prev/next) above body. Right sidebar of **partner-agency links**
  grouped: Governmental Agencies, Local NGOs, International NGOs, Foundations, News Agencies.
- **Fact Sheet** — rich text + pictures/tables/graphs/charts.
- **Vision, Mission & Core Values**.
- **Executive Director's Speech**.
- **Leadership Team & Org Chart** — 4 sections: Board of Directors, Senior Management Team,
  Program Managers/Team Leaders/Supervisors, Organizational Chart. Photo grids **6 columns**,
  multiple rows; click a person → bio page (photo, name, position, biography, more images).
- **Our Partners** — admin-created header sections, each with text + logos + links.

### 2.3 What We Do (submenus)
- **Current Projects** and **Past Projects** — each expands into **nested project submenus** (e.g.
  NGS, NGPRC, HCC, IEP, DEP, IDEAL / E2L, GEI, IBEC, SFE, BfC). Each project = a page with
  admin-created header sections (text, pictures, logos+links) and donor info.
- **Impact / Success Stories** — grid of stories (head photo + title + blurb) → full story with
  photos, charts, videos, text.
- **ICT Innovation** — composable page (text, pictures, videos, subtitles/descriptions).
- **Learning Applications** — composable page (apps, links e.g. observic.com, YouTube).

### 2.4 Media and Publications (12 submenus)
Annual Report · E-Newsletter · Program Brochure · Program Report · **Photo Gallery** ·
**Video Gallery** · Paper Research · Other Publications · ESCUP Sources · Life Skills Education ·
AI and Digital Education · Policies and Regulations.
- **Document submenus** (most of them): grid of uploaded PDFs **5 rows × 5 columns**, auto-paginate;
  per item **track # readers and # downloads**; in-browser viewer + download; sidebar of related
  docs.
- **Photo Gallery**: albums grid **5 × 3**, auto-paginate; album → photos with captions; lightbox
  full-screen with captions + prev/next.
- **Video Gallery**: **5 × 3**, auto-paginate; each video has title + short description, links to
  the KAPE YouTube channel (youtube.com/@KAPECambodia).

### 2.5 Opportunities (submenus)
- **Partner with KAPE** — composable page (text/picture/video).
- **Job Vacancies & Careers** — table (Subject, Location, Deadline, **Apply**); items **auto-hide at
  deadline**. Includes public bidding invitations.
- **Alumni Network** — composable page + **online registration form (stored in DB)**; may also
  embed a Google Form.
- **Scholarship Program** — composable page + active announcements with deadlines.
- **Volunteer with KAPE** — composable page.

### 2.6 Donate
Descriptive article (why donate, how to transfer funds, donation portal links e.g. Myriad
Alliance).

### 2.7 Contact Us
Contact form (Full name, Email, Phone, Message) → **emails kape@kapekh.org**. Contact details +
**provincial sub-offices**, each with a **Google Maps pin** and address/phone/email (Phnom Penh,
Siem Reap, Kampong Chhnang, Svay Rieng, Kratie, Ratanakiri, Banteay Meanchey).

### 2.8 Site Map
Auto-generated from the menu tree (mirrors the full nav).

## 3. Internal Staff Portal

URL: `www.kapekh.org/internalsources`. **Login required** (staff photo + name shown; Logout).
Nav: Internal News Feed · Calendar of Events · Internal Documents · Staff Directory.
- **Internal News Feed** — staff announcements/articles, paginated; click → full article.
- **Calendar of Events** — table: Program, Description, Start Date, End Date.
- **Internal Documents** — categories: Admin & HR, Finance & Procurement, Program & M&E,
  Branding & Media, IT Supportive Resources. Upload PDF / Word / PPT / Excel / images; grid of
  5 rows, auto-paginate; shows document title; download.
- **Staff Directory** — table: ID No., Name (Khmer), Name (English), Sex, Phone, Email, Program;
  **Download PDF** export.

## 4. Cross-cutting CMS capabilities (the hard part)

1. **Dynamic menus/submenus/pages of arbitrary depth**, admin-creatable (data-driven nav tree).
2. **Rich page composition** — pages = ordered sections; section types: rich text, image, gallery,
   video, chart/graph, logo+link group, map, audio/voice, embedded form, PDF embed, stat counters.
3. **Bilingual EN/KH** at the content level (i18n) with a site-wide language toggle.
4. **Media library → Cloudflare R2** — heavy use: images, videos, PDFs, audio; albums, galleries,
   lightboxes.
5. **Time-bound content** — announcements / job vacancies auto-hide at deadline.
6. **Counters** — site visitor stats; per-document read & download counts.
7. **Forms** — contact, newsletter subscribe, alumni registration → DB (+ email on contact).
8. **Auth + roles** — public visitor vs. staff portal vs. CMS admin.
9. **Search** across content; **auto-pagination** when content exceeds the per-page row limit.
10. **Maps** — Google Maps with pins (project locations on About; sub-offices on Contact).

## 5. Mapping to current stack

| Requirement | Status |
| --- | --- |
| SSR (news/story SEO) | Done — TanStack Start (verified) |
| Relational content + uploads metadata | Done — Drizzle + SQLite (`bun:sqlite`) |
| Media library (img/video/PDF/audio) | Storage ready — R2 via `Bun.S3Client` |
| Admin CRUD + public queries | Done — tRPC |
| Admin forms/tables/dialogs/lightbox | Primitives ready — shadcn/ui |
| Dynamic menu + page builder | **Not built** — central challenge |
| Auth + roles | **Not built** |
| i18n (EN/KH) | **Not built** |
| Search, pagination, counters, maps, email, time-bound content | **Not built** |

## 6. Open architecture decisions (to resolve before schema)

- **Page composition model**: flexible page-builder (JSON section tree + DynamicRenderer) vs. fixed
  templates per page type vs. **hybrid** (typed pages for repeating/listable content — articles,
  projects, bios, documents, media — plus a generic builder page for free-form pages like About /
  Fact Sheet / Partners / Donate). The "admin creates any page" requirement pushes toward
  page-builder or hybrid. (See the `dynamic-composable-react-app` pattern.)
- **Auth approach** for Bun + TanStack Start (no auth library in the stack yet); three tiers.
- **i18n strategy**: per-field translated columns vs. translation rows vs. JSON blobs.
- **Build sequencing / phasing** for a large scope.
