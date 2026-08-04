J06 done except D25, which is blocked on a file I do not own.

**What I changed** (only my four files): `src/styles.css`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/KhmerCalendar.tsx` (new). Local-only, gitignored artifacts created to run the app: `.env`, `kape.db*`, `.review-shots/*.png`.

**Against the acceptance criteria**

1. **PASS** — `bun run test`: `Test Files 2 passed (2)`, `Tests 3 passed (3)`.
2. **PASS** — dev server rendered; header and footer viewed in both languages. Screenshots: `.review-shots/j06-en-header.png`, `j06-en-footer.png`, `j06-km-header.png`, `j06-km-footer.png` (plus `j06-dark-footer.png`, `j06-mobile-320-header.png`, `j06-login.png`).
3. **PASS** — same Khmer string `អប់រំនៅកម្ពុជា` at 32px in the live page: Battambang **152.59px**, Noto Serif Khmer **177.13px**, generic serif **158.86px**; `var(--font-khmer)` measures **152.59px** (= Battambang, not a fallback). `document.fonts.check('16px Battambang', 'អប់រំ')` = `true`, face list shows `Battambang 400 loaded` / `700 loaded`. Computed stacks on the page: body `Inter, Battambang, system-ui, sans-serif`, h1 `Fraunces, Battambang, Georgia, serif`. Khmer nav visibly changed in `j06-km-header.png`.
4. **FAIL — blocked, not worked around.** The month figure is derivable from `visitor_daily` (`SELECT sum(count) ... WHERE date LIKE '2026-08%'` → today 17, month 17, total 17 on the seeded DB), but the only public read path is `recordAndGetVisits` in **`src/server/repo/site.ts`**, which returns `{today, total}` and is owned by **J05**. `Footer.tsx` alone cannot obtain a month number; no other public endpoint exposes `visitor_daily` rows (`admin.stats` is `adminProcedure`). It needs one line in J05's file, not a schema change — so it is not J09's territory either. Footer counter left as Today · Total.
5. **PASS** — the top-bar pill links to `/login`; clicking it navigates to `http://localhost:3000/login`, title `Sign in — KAPE Admin`, real email/password form (`j06-login.png`). No new auth route invented.
6. **PASS** — `bunx biome check` on the four files: 0 format errors, 10 lint errors, all pre-existing and all in code I did not add (`Header.tsx` a11y at 169/183/284/463/529/564/636/651, `Footer.tsx:238` `noArrayIndexKey` in the socials map). `KhmerCalendar.tsx`: 0 errors. `styles.css` is excluded from Biome by `biome.json`.
7. **PASS** — dark theme intact: `.dark` still resolves `--background: oklch(0.19 0.015 60)`, `--foreground: oklch(0.95 0.012 85)`; token counts unchanged (`:root` 40, `.dark` 34). My `styles.css` edits were only the font `@import` URL, the three `--font-*` stacks, and one stale comment. Dark footer + calendar checked visually.

**Notes for review**
- D24 wordmark: I added the staff-login entry only. `public/` holds a single square `logo.png` and no wide wordmark asset, and `public/` is not mine, so I did not swap the existing bilingual text lockup for an image.
- My pill initially pushed the top bar to horizontal overflow at ≤390px (408px content in a 375px box). Fixed inside `Header.tsx`: contact string is `hidden sm:inline`, gap tightens below `sm`, and the pill is icon-only below `sm` with a permanent `aria-label`. Verified no overflow at 320/375/390/640/1440.
- Calendar navigation verified: Aug 2026 (ខែសីហា ២៥៦៩ ព.ស.) → back 8 → Dec 2025 (២៥៦៨) → forward 13 → Jan 2027 (២៥៧០); Khmer numerals, today highlighted, no console errors. It is mount-gated (client-only) because the footer is prerendered and render-cached, matching `AnnouncementPopup`'s precedent.
