# C3 - A re-skin needs no component edit

## Objective

An organisation changes its palette, fonts and logo through configuration, and **every part of the site follows**.

You are done when someone can swap the theme to an unrelated palette - say a green and grey law firm - and no section still renders KAPE's navy and saffron, in either light or dark mode, without a single component being edited.

Today that is not possible, and the reason is specific rather than vague: the token system is good and roughly a hundred places ignore it.

## What is actually wrong

**The entire CTA band paints itself with literal colours.** `SectionRenderer.tsx` around lines 676-700 uses `text-[oklch(0.3_0.07_255)]`, `bg-[oklch(0.24_0.09_255)]` and `border-[oklch(0.24_0.09_255)]/40` - a second, undeclared navy that has nothing to do with `--primary`. `$lang.donate.index.tsx` repeats the same five values. Change the brand colour and these stay navy. 11 inline `oklch()` literals in total.

**Six tokens are defined in `:root` and never redefined in `.dark`:** `--radius`, `--ink`, `--gradient-hero`, `--gradient-warm`, `--shadow-soft`, `--shadow-lift`. The consequence is visible: the stats band (`background: var(--gradient-hero)`) and the CTA band (`var(--gradient-warm)`) render **light-mode navy and saffron in dark mode**, and 20-odd `shadow-[var(--shadow-lift)]` usages keep a light-mode shadow on a dark page.

**`--ink` is defined and has zero consumers.** Either use it or delete it.

**Fonts are not tokens.** `src/styles.css:3` is a literal `@import` naming Battambang, Fraunces, Inter and Noto Serif Khmer, and the stacks at `:109-111` are literals inside `@theme inline`. Nothing reads a setting.

**`theme-color` is an independent hex.** `src/routes/__root.tsx` has `content: "#1f4e79"`, an sRGB navy that does not correspond to `--primary: oklch(0.30 0.10 255)` and drifts on its own.

**Roughly 105 hardcoded colour literals**, of which the survey counted 13 Tailwind palette classes (`bg-amber-500`, `bg-slate-600`, `bg-emerald-600` and friends), 11 inline `oklch()`, 72 `white`/`black`, 1 hex, and 8 `rgba()` text-shadows.

Not all 105 are bugs. `bg-black/40` behind a lightbox is a scrim and should stay literal; `text-white` over a photograph is often correct. **Use judgement, and state the rule you applied.** The test is whether a re-skin still looks like the new brand, not whether the grep count reaches zero.

**Spacing and type scale are module constants, not tokens.** `SectionRenderer.tsx:30-32` holds `Container = "mx-auto max-w-7xl px-6"` and `PAD = "py-20 md:py-24"`. `styles.css:332-357` has `.t-display` through `.t-meta` with literal rem values. Decide whether these become configurable or stay opinionated, and say why. "Everything configurable" is not automatically right; a CMS with a coherent default look is worth more than one with 200 knobs.

## Where the values live

`site_settings` already exists and is already used for the footer and header. Theme values belong there too, applied as CSS custom properties on the document.

The constraint that matters: **the theme has to be right in the server-rendered HTML**, not applied by a script after paint. A flash of KAPE navy on a law firm's site is the failure mode. Check how `__root.tsx` already injects head content and follow it.

Ship a sane default so an unconfigured install looks deliberate rather than unstyled.

## Files you own

- `src/styles.css`
- `src/components/sections/SectionRenderer.tsx` - **colour, spacing and type literals only**
- `src/routes/__root.tsx`
- `src/routes/admin.settings.tsx`
- `src/routes/$lang.donate.index.tsx`, `src/components/donate/*`
- `src/components/Lightbox.tsx`, `src/routes/admin.media.tsx`, `src/components/SubPage.tsx`, `src/components/CampaignDetail.tsx` and the other colour-literal sites you find
- `components.json` - `baseColor` is `zinc`, which contradicts the warm palette actually shipped
- `.work/c3-report.md`

**Do not touch** `src/lib/sections.ts`, `src/lib/collections.ts`, `src/lib/permissions.ts`, `src/routes/admin.tsx` or `src/server/repo/sections.ts`. C4 owns those and runs beside you.

You share `SectionRenderer.tsx` with nobody, but C4 is editing the section **catalogue** while you edit the section **renderer**. Stay out of the registry object and the section definitions; change only the styling literals inside components.

## Do

1. **Inventory first.** Count the literals yourself, classified. The survey's 105 is a starting point, not a finding.
2. Decide the rule: what becomes a token, what stays literal, what is deleted. Write it into the report before implementing.
3. Fix the dark-mode gaps first. They are the smallest change with the most visible payoff, and they prove the token path works.
4. Then the CTA band and the donate landing, which are the largest single failure.
5. Then fonts, then `theme-color`.
6. **Prove it by re-skinning.** Pick a genuinely different palette and set it in settings. Walk the home page, a content page, an article, the donate landing and the admin, in both light and dark. Screenshot everything.

## Acceptance

1. `.work/c3-report.md` with the inventory, the rule, and the after count.
2. A re-skin to an unrelated palette, applied through settings with **no component edited**, shown across at least six surfaces in both light and dark mode. Side-by-side screenshots.
3. No token defined in `:root` is missing from `.dark`. Show the check.
4. The stats band and the CTA band are correct in dark mode. This is currently visibly broken; show before and after.
5. Fonts are configurable, including the script-specific stack, and an unconfigured install still renders with a sensible default.
6. `theme-color` derives from the primary colour rather than a separate literal.
7. No flash of the default theme before the configured one applies. Demonstrate on a hard load.
8. KAPE's own appearance is unchanged when KAPE's values are in settings. Before and after.
9. `bun run test` at or above the count when you start. `bunx tsc --noEmit` silent. `bun run format` clean.

## Out of scope

- The admin's own visual design. Make it follow the tokens; do not redesign it.
- `KhmerCalendar.tsx` and the Khmer font stack as a *concept*. Khmer is a language, not a brand. The font must become configurable; the calendar component stays.
- Section layout variants and the catalogue. C4.
- Media, editorial workflow, admin UX. Later jobs.

## Stop conditions

- Never run against the repo's `kape.db`. `VACUUM INTO` a copy, `export DATABASE_PATH`, `export SSG_CACHE=off`.
- Do not commit, do not touch git, do not edit the worklog.
- Do not change a component's structure to make styling easier without saying so. A diff that quietly rewrites layout is not reviewable as a theming change.
- If a literal cannot be tokenised without changing how something looks, leave it, and put it in the report. A faithful inventory of what resisted is more useful than a silent visual regression.
