# S5 - donate

76 inventory rows wired, 0 skipped. 70 keys added, all in `src/lib/ui-strings/donate.ts`.

The counts differ because five keys already belong to other modules and are reused, not defined
(`error.generic`, `error.networkConnection`, `forms.message` in `forms.ts`; `nav.home` in `nav.ts`;
`nav.backHome` in `pages.ts`), several keys serve two or three call sites, and four rows carry two
keys each (the plural pairs and the either/or labels). `common.loading` is named in the job brief but
no row in my seven files renders it, so it stays untouched.

## Gates

| gate | result |
|---|---|
| `bunx tsc --noEmit` | silent |
| `bun run test` | 382 passed, 41 files, 0 failed |
| `bun run lint` | 8 errors, 0 warnings - the floor, unchanged |

`dictionary.test.ts` and `no-brand.test.ts` both pass. One existing test needed updating:
`src/routes/-donate.success.test.ts` stubs the loader's tRPC context, and the loader now also reads
`i18n.bootstrap` for the meta title, so the stub gained that procedure and the third case asserts the
extra `metaTitle` field.

## The round trip

Own scratch DB `.work/scratch/s5-donate.db` (VACUUM INTO from `kape.db`), own dev server on 3013.
`kape.db` and `.work/uat/uat.db` were not touched. The copy had no campaigns, so one was inserted
into the scratch copy with two paid donations against it.

Logged in at `/login` as `admin@kapekh.org`, opened `/admin/ui-strings`, changed `donate.pctFunded`
from `{pct}% funded` to `{pct}% of the way there`, saved, loaded
`/en/donate/school-library`: the progress card reads **25% of the way there** - the slot still lands
the number in the right place after an admin edit. Reset the field to empty, saved, reloaded: back to
**25% funded**.

- `.work/i18n/s5-shots/pctFunded-edited.png`
- `.work/i18n/s5-shots/pctFunded-reset.png`

Also exercised in the browser or over the rendered HTML: the hub with a campaign and with none (the
embedded link renders mid-sentence and points at `/who-we-are/about`), the featured spotlight, the
card grid, the ended-campaign branch, the supporters wall with and without supporters, the custom
amount hint (`✨ Funds a whole reading corner`), the submit button (`♡ Donate $250`), the confirm
modal (Close, Confirm your gift, Campaign, Credited as, Message, Back, Confirm & pay), and the
receipt page on both the paid and the pending branch. **No transaction was completed** - the run
stopped at the open confirm modal and closed it with Back.

Khmer was checked too (`/km/donate`, `/km/donate/school-library`): every donate key falls back to
English, and no raw key string leaks onto any page in either language.

## Rows

Every `new-key` row in the seven files, all `wired`. Line numbers are the inventory's.

### src/routes/$lang.donate.index.tsx - 20 rows

| line | key | state |
|---|---|---|
| 28 | `donate.metaTitleHub` | wired, via the loader (head runs outside the provider) |
| 77 | `donate.stat.campaign` / `.campaigns` | wired, pair picked in JS |
| 82 | `donate.raised` | wired |
| 88 | `donate.supporter` / `.supporters` | wired |
| 98 | `donate.empty.title` | wired |
| 101-108 | `donate.empty.body` + `donate.empty.link` | wired, one sentence with a `{link}` slot |
| 118 | `donate.more` / `donate.campaigns` | wired |
| 169 | `donate.featured` | wired, ★ stays in markup |
| 195 | `donate.ofGoal` | wired |
| 197 | `donate.raised` | wired, reused |
| 204 | `donate.supporter` / `.supporters` | wired, reused |
| 213 | `donate.beFirst` | wired |
| 217 | `donate.goal` | wired, `·` stays in markup |
| 224 | `donate.cta.campaign` | wired, ♡ and → stay in markup |
| 272 | `donate.raised` | wired, reused |
| 277 | `donate.donor` / `.donors` | wired |
| 278 | `donate.give` | wired, → stays in markup |
| 288 | `donate.goal` | wired, reused |
| 288 | `donate.new` | wired |
| 291 | `donate.beFirstShort` | wired, → stays in markup |

### src/routes/$lang.donate.$campaign.tsx - 2 rows

| line | key | state |
|---|---|---|
| 20 | `donate.metaTitleCampaign`, `donate.title` | wired, via the loader |
| 23 | `donate.metaDescription` | wired, via the loader; the campaign's own blurb still wins |

### src/routes/$lang.donate.success.tsx - 11 rows

| line | key | state |
|---|---|---|
| 20 | `donate.success.metaTitle` | wired, via the loader |
| 35 | `donate.title` | wired, reused |
| 36 | `donate.success.title` | wired |
| 37 | `donate.success.badge` | wired |
| 38 | `donate.success.lead` | wired, neutral default - see below |
| 41 | `donate.success.confirmed` | wired |
| 41 | `donate.success.pending` | wired |
| 46 | `donate.success.confirmedBody` | wired, 🎉 stays in markup |
| 50 | `donate.success.pendingBody` | wired |
| 61 | `nav.backHome` | wired, reused from `pages.ts` |
| 67 | `donate.success.stories` | wired; the hardcoded `/stories` href is left alone as briefed |

### src/components/donate/DonateForm.tsx - 28 rows

| line | key | state |
|---|---|---|
| 57/60/61 | `donate.anonymous` | wired once into a local, used at all three sites |
| 67 | `donate.minimum` | wired with an `{amount}` slot |
| 98 | `error.generic` | wired, reused from `forms.ts` |
| 101 | `error.networkConnection` | wired, reused from `forms.ts` |
| 122 | `donate.step1` | wired |
| 153 | `donate.oneTime` | wired |
| 175 | `donate.otherAmount` | wired |
| 181 | `donate.funds` | wired, ✨ stays in markup, tier keeps its bold |
| 195 | `donate.step2` | wired |
| 206 | `forms.yourName` | wired, defined here as briefed |
| 206 | `donate.yourNameOptional` | wired |
| 217 | `donate.receiptEmail` | wired |
| 225 | `donate.messageOptional` | wired |
| 231 | `donate.wallAs` | wired |
| 240 | `donate.wall.name` | wired |
| 246 | `donate.wall.custom` | wired |
| 252 | `donate.anonymous` | wired, reused |
| 261 | `donate.customNamePlaceholder` | wired, neutral default - see below |
| 279 | `donate.submit` | wired with an `{amount}` slot, ♡ stays in markup |
| 295 | `donate.secured` | wired with a `{provider}` slot - see below |
| 304 | `dialog.close` | wired, defined here |
| 309 | `donate.confirm.title` | wired |
| 317 | `donate.funds` | wired, reused; sentence case at both sites |
| 322 | `donate.confirm.campaign` | wired |
| 323 | `donate.confirm.creditedAs` | wired |
| 324 | `forms.message` | wired, reused from `forms.ts` |
| 338 | `dialog.back` | wired, defined here |
| 346 | `donate.redirecting`, `donate.confirmPay` | wired |

### src/components/donate/CampaignDetail.tsx - 8 rows

| line | key | state |
|---|---|---|
| 46 | `nav.home` | wired, reused from `nav.ts` |
| 52 | `donate.title` | wired, reused |
| 59 | `donate.closed.badge`, `donate.badge` | wired |
| 84 | `donate.recentSupporters` | wired |
| 96 | `donate.ended.title` | wired |
| 99 | `donate.ended.body` | wired |
| 105 | `donate.ended.cta` | wired |
| 111 | `donate.form.title` | wired |

### src/components/donate/CampaignProgress.tsx - 6 rows

| line | key | state |
|---|---|---|
| 32 | `donate.beFirst` | wired, reused |
| 37-41 | `donate.helpReach` | wired, one key with a `{goal}` slot |
| 44 | `donate.getMoving` | wired |
| 59-67 | `donate.raisedOfGoal` | wired, one key with a `{goal}` slot |
| 77 | `donate.supporter` / `.supporters` | wired, reused |
| 90 | `donate.pctFunded` | wired |

`Intl.NumberFormat("en-US")` at line 4 is untouched, as briefed.

### src/components/donate/SupportersWall.tsx - 1 row

| line | key | state |
|---|---|---|
| 46 | `donate.wall.empty` | wired |

`♡` and the quotation marks around a donor's message stay in markup.

## The three neutrality fixes

**`donate.success.lead`.** The shipped English is now
`Your generosity goes straight into the work this campaign names.` - no country, no sector, no
client. KAPE's own wording moves to the fixture, `src/server/seed/ui-strings.kape.ts`, English only.
A site already installed keeps whatever is in its `ui_strings` table; a fresh KAPE install picks the
line up from the fixture, and a fresh install of anything else gets the neutral sentence.

**`donate.customNamePlaceholder`.** `e.g. The Sok Family` becomes `e.g. A family or a team name`.
This departs from `keys.proposed.ts`, which kept the original. Any surname is somebody's, so the
example names a kind of name rather than a name.

**`donate.secured`.** Ships as `Secured by {provider} — KHQR, card, or mobile wallet`, the shape the
job asked for.

The slot needed a source, and here is what is actually there. Nothing on the client knows the
gateway: `src/server/baray.ts` is server-only, the three `BARAY_*` credentials live in `env.ts`, and
`/api/pay/donate` returns only a redirect URL. There is no provider field in `site_settings` and no
settings form that could hold one, and inventing one is a stop condition. So the name became its own
editable key, `donate.provider`, defaulting to `Baray` - the one gateway the product integrates. An
admin can change it at `/admin/ui-strings` without a developer, which is the point of the round, and
a deployment on another gateway edits one word instead of a translated sentence.

**Hand back, if you disagree with that call:** the alternative is a real settings field
(`payment_provider`) on `/admin/settings`, threaded to the donate form through `site.settings`, which
the loader already fetches. That is a settings-shaped change in files another slice owns, so it did
not happen here.

One residual: the default still names KHQR, a Cambodian payment rail, in the product core. It is one
key an admin can rewrite, and the brief flagged only the provider, so it was left as proposed rather
than widened on my own initiative.

## Decisions worth knowing

- **`Slot`, a new 20-line component** at `src/components/donate/Slot.tsx`. Four sentences put markup
  in the middle of themselves: a link in `donate.empty.body`, an emphasised amount in
  `donate.helpReach` and `donate.raisedOfGoal`, an emphasised tier in `donate.funds`. Splitting them
  into a key per fragment would have made them untranslatable, and dropping the markup would have
  been a visual change this round is not allowed to make. `Slot` splits the translated string on its
  slot and drops the node in. A string an admin edits into losing its slot still renders the link,
  at the end, rather than silently dropping it.
- **Meta titles travel with the loader.** `head()` runs outside `LanguageProvider`, so the three
  routes read `i18n.bootstrap` in the loader, the same pattern `$lang.contact.tsx` established.
- **Plural pairs pick at the call site** (`t(n === 1 ? "donate.supporter" : "donate.supporters", …)`),
  as `publications.downloadsOne` does. Khmer will need only one of each pair.
- **`donate.funds` is sentence case at both sites**, which the job allowed. The confirm modal used to
  read `funds a whole reading corner` and now reads `Funds a whole reading corner`.
- **No Khmer anywhere.** All 70 keys ship `en` only, including the fixture entry.
- `donate.title` is quoted in the campaign route's inventory row but the meta path only needs it when
  the loader produced nothing, which cannot happen; it is wired at `CampaignDetail.tsx` and on the
  receipt page instead, so the key is live and the head fallback is a plain literal.

## One bug found, not fixed

`DonateForm.tsx` sets `min={MIN[cur]}` (0.03 for USD) and `step="1"` on the custom-amount input.
Native validation reads that as "valid values are 0.03, 1.03, 2.03…", so **every whole-dollar custom
amount is rejected by the browser and the form never submits** - no message, no modal, nothing.
Reproduced at `/en/donate/school-library`: typing 300 and pressing the button does nothing, and
`input.validationMessage` reads "The two nearest valid values are 299.03 and 300.03." Presets work
because they clear the custom field.

It predates this slice - neither attribute was touched - and it is payment-flow behaviour rather than
a label, which the job put out of scope. The fix is one line, `step={cur === "USD" ? "0.01" : "1000"}`,
and the amount is still floored server-side in `api.pay.$.tsx` and client-side in `review()`, so
widening the step loosens nothing that matters. Same cause makes `donate.minimum` unreachable through
the UI: the `min` attribute blocks a sub-minimum amount before `review()` can set the message.
