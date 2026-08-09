# J07 — Form builder field types

Delta D21. Branch `j07-form-fields`, three commits on top of `e7570b6`.

## Files owned, as found

The backlog's guess was right for two of them. The full set that had to change:

| file | what changed |
|---|---|
| `src/lib/forms.ts` | the three new kinds, their validation, the section grouper |
| `src/components/FormRenderer.tsx` | public renderer: date input, checkbox group, numbered fieldsets |
| `src/components/admin/FormBuilder.tsx` | builder rows for the new kinds, plus three defects found while using it |
| `src/routes/api.forms.$.tsx` | multipart read and submission storage |
| `src/routes/admin.forms.$id.submissions.tsx` | inbox table + CSV export |
| `src/integrations/trpc/router.ts` | the field-type enum, now derived from `FORM_FIELD_TYPES` |
| `src/lib/forms.test.ts` | new, 18 tests |

`src/components/admin/FormBuilder*` is a single file, not a set.

## What landed

`date`, `checkboxes` (multi-pick group), `section` (numbered heading). No migration:
a checkbox group's picks are joined into the one string `form_submissions.data` already
holds, so the stop condition never fired.

Sections are flat, not nested: a `section` field opens a group and everything after it
belongs to that group until the next one. `groupIntoSections` is the whole model, and it
is what the renderer maps over.

Reading multipart with `getAll` instead of `entries` is what lets a group post one entry
per pick — and it opened a hole worth naming, below.

## Acceptance

### 1. `bun run test`

272 tests / 25 files → **290 tests / 26 files**, all passing. `bunx tsc --noEmit`: 0 errors.

### 2. The alumni form, built entirely through the admin UI

`feedback/src/routes/opportunities.alumni.tsx` rebuilt at `/admin/forms/new` with no code:
19 fields, 3 numbered sections, a date of birth, a six-way involvement group, both
dropdowns, the file upload and the consent checkbox. Stored definition:

```
section     personal_information             Personal information
text        full_name                    REQ Full name
text        name_in_khmer                    Name in Khmer
select      gender                           Gender    ["Female","Male","Prefer not to say"]
date        date_of_birth                    Date of birth
tel         phone_number                 REQ Phone number
email       email                        REQ Email
text        current_address                  Current address
file        recent_photo                     Recent photo
section     education_kape_connection        Education & KAPE connection
select      kape_programme_project           KAPE programme / project
                ["New Generation School (NGS)","Scholarship programme",
                 "Inclusive Education Program (IEP)","Digital Education Program (DEP)",
                 "Former KAPE staff","Other"]
text        school_institution               School / institution
text        graduation_year                  Graduation year
text        highest_qualification            Highest qualification
text        current_occupation_organization  Current occupation & organization
section     how_you_would_like_to_stay_involved   How you would like to stay involved
checkboxes  how_would_you_like_to_stay_involved   How would you like to stay involved?
                ["Mentor a current student","Speak at school events",
                 "Attend the annual reunion","Volunteer in the field",
                 "Support fundraising","Receive the KAPE newsletter"]
textarea    your_story_or_message_to_kape    Your story or message to KAPE
checkbox    i_agree_that_kape_may_store…  REQ I agree that KAPE may store my details…
```

Filled and submitted in a real browser at `/en/j07-alumni`; the success message rendered.
The stored row, `form_submissions` id 1:

```json
{
 "full_name": "Sophea Chan",
 "name_in_khmer": "សុភា ចាន់",
 "gender": "Female",
 "date_of_birth": "1997-03-14",
 "phone_number": "+855 12 345 678",
 "email": "sophea.chan@example.org",
 "current_address": "Prek Leap village, Kampong Cham",
 "kape_programme_project": "Scholarship programme",
 "school_institution": "Hun Sen Kampong Cham High School",
 "graduation_year": "2019",
 "highest_qualification": "Bachelor of Education",
 "current_occupation_organization": "Teacher, Kampong Cham Primary School",
 "how_would_you_like_to_stay_involved": "Mentor a current student, Volunteer in the field, Receive the KAPE newsletter",
 "your_story_or_message_to_kape": "I taught for four years after the scholarship and now mentor grade 11 students.03/14/1997",
 "i_agree_that_kape_may_store_my_details_and_contact_me_about_alumni_activities": "Yes"
}
```

The trailing `03/14/1997` in the story field is mine, not the app's: a date I typed while
the textarea still held focus. Everything else is what was entered.

Accessibility tree of the rendered group, confirming all six options and the numbered
legends (`chrome-devtools-axi snapshot`):

```
StaticText "Personal information"          ← legend "1. Personal information"
Date "Date of birth" (spinbuttons Month/Day/Year)
StaticText "Education & KAPE connection"   ← "2. …"
StaticText "How you would like to stay involved"  ← "3. …"
StaticText "How would you like to stay involved?"
checkbox "Mentor a current student"
checkbox "Speak at school events"
checkbox "Attend the annual reunion"
checkbox "Volunteer in the field"
checkbox "Support fundraising"
checkbox "Receive the KAPE newsletter"
```

### 3. CSV export

Exported with the admin's own **Export CSV** button; file at
`.work/j07-shots/alumni-responses.csv`. 17 columns — 19 fields minus the 3 section
headings, plus Date. A row:

```csv
"8/9/2026, 5:12:38 PM","Sophea Chan","សុភា ចាន់","Female","1997-03-14","+855 12 345 678","sophea.chan@example.org","Prek Leap village, Kampong Cham","","Scholarship programme","Hun Sen Kampong Cham High School","2019","Bachelor of Education","Teacher, Kampong Cham Primary School","Mentor a current student, Volunteer in the field, Receive the KAPE newsletter","I taught for four years…","Yes"
```

A date exports as `1997-03-14`. A checkbox group exports as
`Mentor a current student, Volunteer in the field, Receive the KAPE newsletter`.
`grep -c "object Object"` over the file: **0**.

### 4. Existing forms

Three checked, each rendered and submitted in the browser, each row read back out of
`j07.db`:

- **Contact** (`/en/contact` → `/api/forms/contact`, JSON body). "Thank you — your message
  has been sent." `contact_submissions`: `Regression Check / regression@example.org /
  +855 99 000 111`.
- **Newsletter subscribe** (footer, same handler). "Thanks for subscribing!"
  `newsletter_subscribers`: `newsletter-regression@example.org`.
- **A built form with no sections at all** — the shape every form saved before this job
  has. Built one (`volunteer_legacy`: text + email + textarea), embedded it next to the
  alumni form on the same page. It renders flat, with no fieldset and no numbering, and
  submits: `{"your_name":"Dara Kim","email":"dara.kim@example.org",
  "why_do_you_want_to_volunteer":"I want to help with the reading programme on weekends."}`

This DB carried no built forms before the job, so that third one is a constructed stand-in
for the legacy shape rather than a pre-existing row. Saying so plainly because it is the
one item here that is not literally pre-existing data.

### 5. Server-side rejection

`curl` straight at the endpoint, no browser, so client validation is not in the path:

```
$ curl -X POST /api/forms/alumni -F 'date_of_birth=1997-02-31' …
{"error":"“Date of birth” must be a date (YYYY-MM-DD)."}   [HTTP 400]

$ curl -X POST /api/forms/alumni \
    -F 'how_would_you_like_to_stay_involved=Mentor a current student' \
    -F 'how_would_you_like_to_stay_involved=Become the executive director' …
{"error":"“How would you like to stay involved?” has an invalid choice."}  [HTTP 400]

$ curl -X POST /api/forms/alumni -F 'date_of_birth=1997-02-28' \
    -F 'how_would_you_like_to_stay_involved=Support fundraising' \
    -F 'how_would_you_like_to_stay_involved=Speak at school events' …
{"ok":true}                                                [HTTP 200]
```

`1997-02-31` is well-formed and impossible, so this is a real calendar check, not a regex.
The control proves the rejections are not a blanket refusal. Both are covered by unit
tests in `src/lib/forms.test.ts`.

### 6. `bunx biome check`

Repo baseline 20 errors / 30 warnings → **20 errors / 28 warnings**. The two dropped
warnings are the `noExplicitAny` pair in `FormBuilder.tsx` the job assigned; both are now
typed (`FormStatus`). One error remains in that file, `noArrayIndexKey` at the field list.
It is pre-existing: linting `e7570b6:src/components/admin/FormBuilder.tsx` gives
1 `noArrayIndexKey` + 2 `noExplicitAny`, and only the two `any` are gone.

## Three defects found by using the builder, and fixed

None of these were in the brief. All three are in a file I own and all three block the
acceptance test, so they landed rather than being handed back.

**The options box could not accept a comma.** Its value was rendered as
`options.join(", ")` while every keystroke was parsed with `trim().filter(Boolean)` — so
the comma you had just typed was dropped before the next character arrived. Typing
`Female, Male, Prefer not to say` stored `["FemaleMalePrefernottosay"]`. No dropdown could
be given more than one option by typing, which means `select` has been half-broken since
it shipped and `checkboxes` would have shipped broken too. Split and join on the bare
comma round-trip exactly; trimming and de-duplication moved to save time.

**A field's key froze to the first letter typed.** The label's `onChange` set
`key: f.key || slugify(e.target.value)`, so on the first keystroke the key became the
slug of one character and never updated. The first build of the alumni form came out with
keys `p`, `f`, `n`, `g`, `d`, `p_2`, `e`, `c`, `r`, … — and those are the submission
column names. Removed: `submit()` already derives a key from the label when none is set,
and a saved field keeps its key so responses stay attached when a label is reworded.

**The form name could not be typed with a separator.** `slugify` strips a leading or
trailing underscore and it ran on every keystroke, so `volunteer_legacy` saved as
`volunteerlegacy`. On-change now only lowercases and folds illegal runs; full
normalisation happens once at save.

The first two were caught only because the acceptance test is "build it through the UI".
Reading the diff would not have found either.

## One hole I opened and closed

Switching the multipart read to `getAll` means a repeated key now arrives as an **array**.
For a single-value field that array slipped past every `typeof v === "string"` guard in
`validateSubmission` and got `String()`-ed at storage time — so
`email=real@example.org&email=nope` would have stored `real@example.org,nope` with the
email format check never running. The validator now rejects an array anywhere a checkbox
group is not expected:

```
$ curl -X POST /api/forms/alumni -F 'email=real@example.org' -F 'email=not-an-email' …
{"error":"“Email” has an invalid value."}                  [HTTP 400]
```

Covered by a named test.

## Standing finding, not mine to fix

**The SSR tRPC client hardcodes a port.**
`src/integrations/tanstack-query/root-provider.tsx:12` returns
`http://localhost:${process.env.PORT ?? 3000}`. `bun run dev` passes `--port` to Vite but
never sets `PORT`, so any instance not on 3000 renders every page against **whatever else
is listening on 3000**. On this machine that was another worktree's dev server with a
different database: my page returned a hard 404 while the same path resolved correctly
in-process and over HTTP on 3003. It cost a while to find, and it silently crosses two
installs' data.

Not touched — the file is outside this job, and the fix is a judgement call between
deriving the origin from the request and refusing to guess. Reproduce with
`bun --bun vite dev --port 3003` while anything else holds 3000.

Workaround used for the whole run: `PORT=3003 SSG_CACHE=off bun --bun vite dev --port 3003`.

## Evidence on disk

- `.work/j07-shots/01-builder-alumni.png` — first build, before the builder defects were fixed
- `.work/j07-shots/02-builder-alumni-fixed.png` — the 19-field build that was saved
- `.work/j07-shots/03-public-alumni-form.png` — public render, three numbered fieldsets
- `.work/j07-shots/alumni-responses.csv` — the exported file, unedited
- `j07.db` — forms 2 and 3, `form_submissions` 1–3, contact and subscriber rows

## Commits

```
26bec07  Let a form express a real registration, not just a contact box
0aa1089  Let an editor type a comma into the options box
d5eca63  Let a form name be typed with a separator in it
```

Next: J07 is done and gated; the hardcoded SSR port at `root-provider.tsx:12` needs an
owner before two installs ever run side by side.
