# S5 - donate

**Read `.work/jobs/SLICE-COMMON.md` first.** It holds the rules every slice follows. This file only
names your share.

This is the largest slice of the round: 76 `new-key` rows across seven files, and the only one where
a wrong edit can break a payment flow.

## Files you own

- `src/routes/$lang.donate.index.tsx` - 20 rows
- `src/routes/$lang.donate.$campaign.tsx` - 2 rows
- `src/routes/$lang.donate.success.tsx` - 11 rows
- `src/components/donate/DonateForm.tsx` - 28 rows, the bulk
- `src/components/donate/CampaignDetail.tsx` - 8 rows
- `src/components/donate/CampaignProgress.tsx` - 6 rows
- `src/components/donate/SupportersWall.tsx` - 1 row
- `src/lib/ui-strings/donate.ts` - your dictionary module, currently an empty stub. Nobody else
  opens it.

`src/routes/$lang.donate.tsx` is a layout with no rows. Do not open it.

## Your rows

`.work/i18n/INVENTORY.md`, the seven blocks named above. Confirm every line number against the real
file before you touch it - the tree has moved this round.

Prefix `donate.` for everything you define, in `donate.ts`.

## Six specifics

- **Five keys are somebody else's. Reuse, do not define.** Grep `src/lib/ui-strings/` for each one
  before you type it. `error.generic`, `error.networkConnection`, `forms.message` and
  `common.loading` are in `forms.ts` (S3); `nav.home` is in `nav.ts` (S2) and `nav.backHome` in
  `pages.ts` (S1). A key defined twice fails `dictionary.test.ts` by design.

- **`forms.yourName` is yours to define, in `donate.ts`.** It used to live in `sections.ts`, read
  only by the mock sign-up form that FIX-G deleted. The lead has already removed the orphaned entry,
  so the key does not exist anywhere right now and the suite is green without it. `DonateForm.tsx:206`
  is the only place left that renders it, so define it in your own module and wire the call site.
  Do not put it back in `sections.ts`.

- **`dialog.close` and `dialog.back` are undefined and unowned.** `DonateForm.tsx:304/338` render
  them and nothing else does, so they are yours - put them in `donate.ts` despite the prefix, which
  is what SLICE-COMMON means by the module being storage. The inventory's "Duplicates worth
  collapsing" section lists three seeded near-duplicates of the close label; do **not** collapse
  them this round, that is a separate job with its own call sites to re-point.

- **Four plural pairs.** `donate.campaign`/`.campaigns`, `donate.supporter`/`.supporters`,
  `donate.donor`/`.donors`, and the `stat.` variant. The dictionary cannot express plurals, so ship
  both keys and pick at the call site, exactly as S4 did for `publications.downloadsOne`. Do not
  build the plural as a JSX suffix.

- **Seven strings are assembled across JSX nodes**, not written as one literal: `donate.helpReach`,
  `donate.raisedOfGoal`, `donate.pctFunded`, `donate.minimum`, `donate.funds`, `donate.submit`, and
  the `donate.empty.body` + `donate.empty.link` pair with a link embedded mid-sentence. Each becomes
  **one key with slots**, not a key per fragment - a Khmer translator has to be able to move the
  number and the link within the sentence. `donate.funds` has two call sites (181 sentence case, 317
  lowercase); one key, and let the markup carry the casing difference or accept sentence case at
  both.

- **Glyphs stay in markup.** `♡`, `✨`, `★`, `🎉`, `→`, `$`, `៛`. The key holds words only. Same for
  the `Intl.NumberFormat("en-US")` at `CampaignProgress.tsx:4` and `“{s.message}”` at
  `SupportersWall.tsx:70` - both are on the inventory's "Not a key" list and not yours.

- **Three product-neutrality flags, and you fix all three.** These are the whole reason this slice
  matters beyond translation:
  - `donate.success.lead` - "Your generosity helps Cambodian children learn, dream, and rise." One
    organisation's copy sitting in the product core. Ship a neutral default; KAPE's wording becomes
    a seeded override, not the shipped English.
  - `donate.customNamePlaceholder` - "e.g. The Sok Family". A Cambodian family name as the product's
    example.
  - `donate.secured` - "Secured by Baray — KHQR, card, or mobile wallet" names one payment provider
    in the core. Ship it as `Secured by {provider} — …` and fill the slot from whatever the code
    already knows about the configured provider. If nothing in scope knows, take the provider name
    from settings if a field exists, and if none does, say so in the report rather than inventing a
    settings field - that is a stop condition.

  `keys.proposed.ts` has proposed English for these. Where you depart from it, say so and why.

## Do not break the payment

You are changing labels, not logic. The amount, the currency, the campaign id, the redirect to the
provider and the success/pending branch on the return leg all keep their current behaviour. If
keying a string means touching a conditional, stop and report rather than restructuring it.

**Never complete a real transaction while testing.** Exercise the form up to the point where a real
charge would be created and stop there.

## Out of scope

Everything in SLICE-COMMON, plus every `src/lib/ui-strings/*.ts` that is not `donate.ts`, the
`/admin/campaigns` editor, `CampaignForm.tsx`, and the hardcoded `/stories` href at
`$lang.donate.success.tsx:67` - a real bug, on the "Not a key" list, not yours this round.

## Acceptance

Everything in `SLICE-COMMON.md`. Your round-trip proof uses one of your own keys **with a slot** -
`donate.raisedOfGoal` or `donate.pctFunded` - so it shows the number still lands in the right place
after an admin edit. Change it at `/admin/ui-strings`, show it on a donate page, reset it, show the
original back. Two screenshots into `.work/i18n/s5-shots/`.

State both counts: rows wired and keys added. They will differ, because of the reuse above.

Report to `.work/S5-report.md`.
