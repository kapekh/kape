# Khmer review - everything that must be swept before launch

Every Khmer string on this site was produced by machine translation, and some of the site has no Khmer at all.
This file is the whole list, in one place, for one native speaker to work through.
**Nothing here is final copy.** Treat every row as wrong until you have confirmed it.

Merged from `.work/km-review-j16.md`, `-j17.md` and `-j18.md`, plus the site chrome and the two pages those three jobs did not cover.
Those files are the per-job record and stay where they are; this one is the thing to review.

## How to read it

- **where** points at the page, project or person the string belongs to.
- Sections 1 to 5 already have machine Khmer. Correct the `km` column in place.
- Sections 6 and 7 have **no Khmer at all**. The `km` column is empty because nothing has been written yet.
- `⏎` and `<br>` mark a paragraph break inside one field. Keep them where they are.
- `“…”` at the start of an impact story is the pull quote.
- `<amount>`, `<n>` and `<campaign title>` are filled in by the site at runtime. Translate around them; word order can move, the placeholder cannot be dropped.

## Where each section gets fixed

| # | section | rows | edit in |
|---|---|---|---|
| 1 | People's names | 7 | `/admin/people`, Khmer tab |
| 2 | Role placeholders used as names | 17 | `/admin/people`, Khmer tab |
| 3 | Page copy, 6 pages | 55 | `/admin/pages` → section → Khmer tab |
| 4 | Project records, 26 projects | 78 | `/admin/projects`, Khmer tab |
| 5 | Bios, news, stories | 51 | `/admin/people`, `/admin/posts`, Khmer tab |
| 6 | Search page chrome | 13 | needs a developer, see the section |
| 7 | Contact and donate | 99 | needs a developer, see the section |
| 8 | Blocked, cannot be translated yet | 48 + 4 fields | needs a code change first |

Total with machine Khmer to correct: **208**.
Total with no Khmer written yet: **112**.

---

## 1. People's names - highest risk on the site

These are real people, and the source romanises their names.
The Khmer below is a best-effort transliteration back, and a romanised Cambodian name has several possible Khmer spellings.
Getting one wrong publishes a misspelled name under that person's own face.

`person-heang-koy` was already in the database before J18 and was kept rather than regenerated.
It is no more verified than the rest.

| where | field | en | km |
|---|---|---|---|
| person:person-heang-koy | name | Mr. Heang Koy | លោក ហេង គយ |
| person:person-hin-simhuon | name | Mr. Hin Simhuon | លោក ហ៊ិន ស៊ីមហួន |
| person:person-chhay-typa | name | Mr. Chhay Typa | លោក ឆាយ ទីប៉ា |
| person:person-sambath | name | Mr. Sambath | លោក សម្បត្តិ |
| person:person-set-soleakna | name | Ms. Set Soleakna | លោកស្រី សេត សុលក្ខិណា |
| person:person-kimheang | name | Ms. Kimheang | លោកស្រី គីមហៀង |
| person:person-phal-sovanthy | name | Mr. Phal Sovanthy | លោក ផល សុវណ្ណថី |

## 2. Role placeholders used as names

17 entries whose "name" is a job title, not a person: seats whose occupant the client never supplied.
Ordinary machine translation, no personal name at risk.

| where | field | en | km |
|---|---|---|---|
| person:person-board-4 | name | Board Member | សមាជិកក្រុមប្រឹក្សាភិបាល |
| person:person-board-5 | name | Board Member | សមាជិកក្រុមប្រឹក្សាភិបាល |
| person:person-board-6 | name | Board Member | សមាជិកក្រុមប្រឹក្សាភិបាល |
| person:person-senior-technical-adviser | name | Senior Technical Adviser | ទីប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់ |
| person:person-senior-national-adviser | name | Senior National Adviser | ទីប្រឹក្សាជាតិជាន់ខ្ពស់ |
| person:person-hr-admin-manager | name | HR & Admin Manager | អ្នកគ្រប់គ្រងធនធានមនុស្ស និងរដ្ឋបាល |
| person:person-ngprc-manager | name | NGPRC Center Manager | អ្នកគ្រប់គ្រងមជ្ឈមណ្ឌល NGPRC |
| person:person-hcc-manager | name | HCC Program Manager | អ្នកគ្រប់គ្រងកម្មវិធី HCC |
| person:person-class-manager | name | CLASS Program Manager | អ្នកគ្រប់គ្រងកម្មវិធី CLASS |
| person:person-iep-coordinator | name | IEP Coordinator | អ្នកសម្របសម្រួល IEP |
| person:person-dep-coordinator | name | DEP Project Coordinator | អ្នកសម្របសម្រួលគម្រោង DEP |
| person:person-equal-i3l-manager | name | EQUAL-i3L Program Manager | អ្នកគ្រប់គ្រងកម្មវិធី EQUAL-i3L |
| person:person-llse-manager | name | LLSE Project Manager | អ្នកគ្រប់គ្រងគម្រោង LLSE |
| person:person-foster-manager | name | FOSTER Program Manager | អ្នកគ្រប់គ្រងកម្មវិធី FOSTER |
| person:person-mldp-manager | name | MLDP Program Manager | អ្នកគ្រប់គ្រងកម្មវិធី MLDP |
| person:person-mc-manager | name | M&C Manager | អ្នកគ្រប់គ្រង M&C |
| person:person-me-manager | name | M&E Manager | អ្នកគ្រប់គ្រង M&E |

## 3. Page copy, 6 pages

Page titles, excerpts and section props for the six `who-we-are` and `what-we-do` pages.
Rich-text bodies are flattened to their rendered text.

| where | field | en | km |
|---|---|---|---|
| who-we-are/about | page.title | About KAPE | អំពី KAPE |
| who-we-are/about | page.excerpt | Cambodia's largest local NGO specializing in education — founded 1999, working in 15 provinces. | អង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេរបស់កម្ពុជាឯកទេសខាងការអប់រំ — បង្កើតឡើងក្នុងឆ្នាំ១៩៩៩ ធ្វើការនៅ១៥ខេត្ត។ |
| who-we-are/about | hero.eyebrow | Established 1999 | បង្កើតឡើងឆ្នាំ១៩៩៩ |
| who-we-are/about | hero.title | About KAPE | អំពី KAPE |
| who-we-are/about | hero.lead | Kampuchea Action to Promote Education is Cambodia's largest and longest-serving local NGO dedicated to the education sector — partnering with MoEYS, international donors and communities since 1999. | អង្គការសកម្មភាពកម្ពុជាដើម្បីលើកកម្ពស់ការអប់រំ គឺជាអង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេ និងបម្រើការយូរជាងគេរបស់កម្ពុជា ដែលឧទ្ទិសដល់វិស័យអប់រំ — សហការជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ម្ចាស់ជំនួយអន្តរជាតិ និងសហគមន៍ តាំងពីឆ្នាំ១៩៩៩។ |
| who-we-are/about | story.title | Our story | រឿងរ៉ាវរបស់យើង |
| who-we-are/about | story.body | KAPE's roots trace back to 1996, when the work began as a project called CAPE (Cambodian Assistance to Primary Education). By 1999 the team localized into an independent Cambodian NGO — KAPE — committed to a sustainable, community-led approach to rebuilding the country's classrooms. ⏎ Three decades on, KAPE works across 15 provinces, reaching over 160,000 children in 385+ schools from preschool through tertiary and a Master's Degree in Educational Mentoring. | ឫសគល់របស់ KAPE ចាប់ផ្តើមតាំងពីឆ្នាំ១៩៩៦ ពេលការងារនេះបានចាប់ផ្តើមជាគម្រោងមួយឈ្មោះ CAPE (ជំនួយកម្ពុជាដល់ការអប់រំបឋមសិក្សា)។ នៅឆ្នាំ១៩៩៩ ក្រុមការងារបានក្លាយជាអង្គការក្រៅរដ្ឋាភិបាលកម្ពុជាឯករាជ្យ — KAPE — ដែលប្តេជ្ញាចិត្តចំពោះវិធីសាស្ត្រប្រកបដោយចីរភាព និងដឹកនាំដោយសហគមន៍ ក្នុងការកសាងឡើងវិញនូវថ្នាក់រៀនរបស់ប្រទេស។ ⏎ បីទសវត្សរ៍ក្រោយមក KAPE ធ្វើការនៅ១៥ខេត្ត ឈានដល់កុមារជាង១៦០,០០០នាក់ នៅសាលារៀនជាង៣៨៥ ចាប់ពីមត្តេយ្យសិក្សា រហូតដល់ឧត្តមសិក្សា និងបរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកការណែនាំអប់រំ។ |
| who-we-are/about | focus.title | What we focus on | អ្វីដែលយើងផ្តោតលើ |
| who-we-are/about | where.title | Where we work | កន្លែងដែលយើងធ្វើការ |
| who-we-are/about | where.body | KAPE implements projects across 15 provinces of Cambodia. The map below pins the locations where KAPE teams and partner schools operate — from the head office in Kampong Cham to field sites in Banteay Meanchey, Battambang, Siem Reap, Ratanakiri, Kratie, Stung Treng, Tboung Khmum, Prey Veng, Svay Rieng, Kampong Speu, Kampong Chhnang, Pursat, Kandal and Phnom Penh. | KAPE អនុវត្តគម្រោងនៅ១៥ខេត្តនៃប្រទេសកម្ពុជា។ ផែនទីខាងក្រោមបង្ហាញទីតាំងដែលក្រុមការងារ KAPE និងសាលារៀនដៃគូប្រតិបត្តិការ — ចាប់ពីការិយាល័យកណ្តាលនៅកំពង់ចាម រហូតដល់ទីតាំងការងារនៅបន្ទាយមានជ័យ បាត់ដំបង សៀមរាប រតនគិរី ក្រចេះ ស្ទឹងត្រែង ត្បូងឃ្មុំ ព្រៃវែង ស្វាយរៀង កំពង់ស្ពឺ កំពង់ឆ្នាំង ពោធិ៍សាត់ កណ្តាល និងភ្នំពេញ។ |
| who-we-are/about | map-note.body | Each red KAPE pin marks a project location. Click a pin to see the project name, school and a photo, then follow through to the project page. Green tags are current projects; grey are past projects. | ម្ជុលពណ៌ក្រហម KAPE និមួយៗសម្គាល់ទីតាំងគម្រោង។ ចុចលើម្ជុលដើម្បីមើលឈ្មោះគម្រោង សាលារៀន និងរូបថត បន្ទាប់មកបន្តទៅកាន់ទំព័រគម្រោង។ ស្លាកពណ៌បៃតងគឺគម្រោងបច្ចុប្បន្ន ពណ៌ប្រផេះគឺគម្រោងកន្លងមក។ |
| who-we-are/vision-mission | page.title | Vision, Mission & Core Values | ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល |
| who-we-are/vision-mission | page.excerpt | KAPE's vision, mission and the values that guide every project. | ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃរបស់ KAPE ដែលដឹកនាំគ្រប់គម្រោង។ |
| who-we-are/vision-mission | hero.eyebrow | What guides us | អ្វីដែលដឹកនាំយើង |
| who-we-are/vision-mission | hero.title | Vision, Mission & Core Values | ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល |
| who-we-are/vision-mission | vision.title | Vision | ចក្ខុវិស័យ |
| who-we-are/vision-mission | vision.body | Our vision is for children and youth to be able to make the best life choices possible — choices that flow from a good education. | ចក្ខុវិស័យរបស់យើងគឺឱ្យកុមារ និងយុវជនអាចធ្វើការសម្រេចចិត្តល្អបំផុតក្នុងជីវិត — ជម្រើសដែលកើតចេញពីការអប់រំល្អ។ |
| who-we-are/vision-mission | mission.title | Mission | បេសកកម្ម |
| who-we-are/vision-mission | mission.body | To work with government, community and other stakeholders to empower vulnerable children and youth to achieve their own right to a quality education through innovative approaches. | ធ្វើការជាមួយរដ្ឋាភិបាល សហគមន៍ និងភាគីពាក់ព័ន្ធដទៃទៀត ដើម្បីផ្តល់អំណាចដល់កុមារ និងយុវជនងាយរងគ្រោះ ឱ្យទទួលបានសិទ្ធិរបស់ខ្លួនក្នុងការទទួលការអប់រំប្រកបដោយគុណភាព តាមរយៈវិធីសាស្ត្រច្នៃប្រឌិត។ |
| who-we-are/vision-mission | values.title | Core values | តម្លៃស្នូល |
| who-we-are/fact-sheet | page.title | Fact Sheet | ឯកសារពិត |
| who-we-are/fact-sheet | page.excerpt | Quick facts about KAPE: organizational profile, expertise and strengths. | ព័ត៌មានសង្ខេបអំពី KAPE៖ ប្រវត្តិរូបអង្គការ ជំនាញ និងចំណុចខ្លាំង។ |
| who-we-are/fact-sheet | hero.eyebrow | Snapshot | ទិដ្ឋភាពសង្ខេប |
| who-we-are/fact-sheet | hero.title | Fact Sheet | ឯកសារពិត |
| who-we-are/fact-sheet | hero.lead | Cambodia's largest and longest-serving local NGO specializing in the education sector — established 1999. | អង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេ និងបម្រើការយូរជាងគេរបស់កម្ពុជា ឯកទេសខាងវិស័យអប់រំ — បង្កើតឡើងក្នុងឆ្នាំ១៩៩៩។ |
| who-we-are/fact-sheet | profile.title | Organizational overview | ទិដ្ឋភាពទូទៅរបស់អង្គការ |
| who-we-are/fact-sheet | profile.body | Founded1999HeadquarterKampong Cham Town, CambodiaPrimary FocusAccess, quality, and equity in educationCore ApproachSystemic partnerships with MoEYS, innovation & evidence-based interventionsReach15 provinces · 385+ schools · 160,000+ children | បង្កើតឡើង១៩៩៩ទីស្នាក់ការកណ្តាលក្រុងកំពង់ចាម ប្រទេសកម្ពុជាការផ្តោតសំខាន់លទ្ធភាព គុណភាព និងសមធម៌ក្នុងការអប់រំវិធីសាស្ត្រស្នូលភាពជាដៃគូជាប្រព័ន្ធជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ការច្នៃប្រឌិត និងអន្តរាគមន៍ផ្អែកលើភស្តុតាងវិសាលភាព១៥ខេត្ត · សាលារៀនជាង៣៨៥ · កុមារជាង១៦០,០០០នាក់ |
| who-we-are/fact-sheet | expertise.title | Areas of expertise & specialization | វិស័យជំនាញ និងឯកទេស |
| who-we-are/fact-sheet | expertise.body | KAPE acts as a "laboratory of innovation" for the Cambodian education system, developing models that can be scaled nationwide. | KAPE ដើរតួជា "មន្ទីរពិសោធន៍នៃការច្នៃប្រឌិត" សម្រាប់ប្រព័ន្ធអប់រំកម្ពុជា ដោយអភិវឌ្ឍគំរូដែលអាចពង្រីកទៅទូទាំងប្រទេស។ |
| who-we-are/fact-sheet | strengths.title | Key strengths | ចំណុចខ្លាំងសំខាន់ៗ |
| who-we-are/fact-sheet | strengths.body | Trusted reform partner — recognized for local expertise bridging policy and school practice.Sustained government collaboration — programs explicitly aligned with national education policy.Accountability — strong governance and transparency for international donors.Local leadership empowerment — investing in school directors and teachers for long-term sustainability. | ដៃគូកំណែទម្រង់ដែលគួរឱ្យទុកចិត្ត — ត្រូវបានទទួលស្គាល់សម្រាប់ជំនាញក្នុងស្រុកដែលភ្ជាប់គោលនយោបាយទៅនឹងការអនុវត្តនៅសាលារៀន។កិច្ចសហការជាមួយរដ្ឋាភិបាលប្រកបដោយចីរភាព — កម្មវិធីត្រូវបានតម្រឹមយ៉ាងច្បាស់ជាមួយគោលនយោបាយអប់រំជាតិ។គណនេយ្យភាព — អភិបាលកិច្ចរឹងមាំ និងតម្លាភាពសម្រាប់ម្ចាស់ជំនួយអន្តរជាតិ។ការផ្តល់អំណាចដល់ភាពជាអ្នកដឹកនាំក្នុងស្រុក — វិនិយោគលើនាយកសាលា និងគ្រូបង្រៀន ដើម្បីចីរភាពរយៈពេលវែង។ |
| who-we-are/director-speech | page.title | Executive Director's Speech | សុន្ទរកថានាយកប្រតិបត្តិ |
| who-we-are/director-speech | page.excerpt | Welcome message from KAPE's Executive Director. | សារស្វាគមន៍ពីនាយកប្រតិបត្តិរបស់ KAPE។ |
| who-we-are/director-speech | hero.eyebrow | A note from the ED | សារពីនាយកប្រតិបត្តិ |
| who-we-are/director-speech | hero.title | Executive Director's Speech | សុន្ទរកថានាយកប្រតិបត្តិ |
| who-we-are/director-speech | hero.lead | Welcome message from the Executive Director | សារស្វាគមន៍ពីនាយកប្រតិបត្តិ |
| who-we-are/director-speech | beginning.title | Where it all began | កន្លែងដែលអ្វីៗបានចាប់ផ្តើម |
| who-we-are/director-speech | beginning.body | To truly understand KAPE's mission today, we must look back to where it all began. Our roots trace back to 1996, when we first started as a project known as CAPE (Cambodian Assistance to Primary Education). Those early years were defined by a critical need to rebuild educational foundations. By 1999, recognizing the need for a localized, sustainable approach to educational development, we officially localized to become KAPE, an independent Cambodian non-governmental organization. ⏎ From those foundational years between 1996 and 1999 up to the present day, Cambodia's educational landscape has transformed tremendously — and KAPE has been there every step of the way. What began as a localized effort in a few primary schools has evolved into the largest local NGO in Cambodia's education sector. | ដើម្បីយល់ច្បាស់អំពីបេសកកម្មរបស់ KAPE សព្វថ្ងៃ យើងត្រូវក្រឡេកមើលទៅកន្លែងដែលអ្វីៗបានចាប់ផ្តើម។ ឫសគល់របស់យើងចាប់ផ្តើមតាំងពីឆ្នាំ១៩៩៦ ពេលយើងបានចាប់ផ្តើមដំបូងជាគម្រោងមួយស្គាល់ថា CAPE (ជំនួយកម្ពុជាដល់ការអប់រំបឋមសិក្សា)។ ឆ្នាំដំបូងទាំងនោះត្រូវបានកំណត់ដោយតម្រូវការចាំបាច់ក្នុងការកសាងឡើងវិញនូវមូលដ្ឋានគ្រឹះនៃការអប់រំ។ នៅឆ្នាំ១៩៩៩ ដោយទទួលស្គាល់តម្រូវការវិធីសាស្ត្រក្នុងស្រុកប្រកបដោយចីរភាពសម្រាប់ការអភិវឌ្ឍការអប់រំ យើងបានប្រែក្លាយជាអង្គការក្នុងស្រុកជាផ្លូវការក្លាយជា KAPE ដែលជាអង្គការក្រៅរដ្ឋាភិបាលកម្ពុជាឯករាជ្យ។ ⏎ ចាប់ពីឆ្នាំមូលដ្ឋានទាំងនោះរវាងឆ្នាំ១៩៩៦ និង១៩៩៩ រហូតដល់សព្វថ្ងៃនេះ ទេសភាពអប់រំរបស់កម្ពុជាបានផ្លាស់ប្តូរយ៉ាងខ្លាំង — ហើយ KAPE បានឋិតនៅជាមួយគ្រប់ជំហាន។ អ្វីដែលបានចាប់ផ្តើមជាកិច្ចខិតខំក្នុងស្រុកនៅសាលាបឋមសិក្សាមួយចំនួន បានវិវត្តទៅជាអង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេក្នុងវិស័យអប់រំរបស់កម្ពុជា។ |
| who-we-are/director-speech | moeys.title | Partnering with MoEYS for national progress | ភាពជាដៃគូជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ដើម្បីវឌ្ឍនភាពជាតិ |
| who-we-are/director-speech | moeys.body | KAPE's success has never been achieved in isolation. Our core strategy has always been to work hand-in-hand with the Ministry of Education, Youth and Sport (MoEYS). Over the decades, KAPE has designed, piloted and implemented a vast array of innovative educational projects specifically structured to help MoEYS develop and modernize the national education system. ⏎ From pioneering Child-Friendly School models to creating cutting-edge New Generation Schools (NGS), our projects have consistently served as incubators for educational innovation. We have worked tirelessly to: ⏎ Enhance access & equity — ensuring that children from vulnerable, rural and marginalized backgrounds have the right to a quality education.Empower teachers — providing rigorous professional development, digital literacy coaching and modern pedagogical tools.Drive digital & technical innovation — integrating STEM, ICT and modern technologies into classrooms to prepare Cambodian youth for the 21st century. ⏎ By aligning our projects directly with MoEYS's strategic plans, we ensure that our interventions are not just temporary fixes, but sustainable methodologies that can be integrated into national policy. | ជោគជ័យរបស់ KAPE មិនដែលសម្រេចបានដោយឯកឯងឡើយ។ យុទ្ធសាស្ត្រស្នូលរបស់យើងគឺតែងតែធ្វើការដៃគូជាមួយក្រសួងអប់រំ យុវជន និងកីឡា។ ក្នុងរយៈពេលជាច្រើនទសវត្សរ៍ KAPE បានរៀបចំ សាកល្បង និងអនុវត្តគម្រោងអប់រំច្នៃប្រឌិតជាច្រើន ដែលរៀបចំឡើងជាពិសេសដើម្បីជួយក្រសួងអប់រំ យុវជន និងកីឡា អភិវឌ្ឍ និងធ្វើទំនើបកម្មប្រព័ន្ធអប់រំជាតិ។ ⏎ ចាប់ពីការត្រួសត្រាយគំរូសាលារៀនមិត្តកុមារ រហូតដល់ការបង្កើតសាលារៀនជំនាន់ថ្មី (NGS) គម្រោងរបស់យើងបានដើរតួជាកន្លែងបណ្តុះការច្នៃប្រឌិតក្នុងវិស័យអប់រំជាប់ជានិច្ច។ យើងបានខិតខំធ្វើការដើម្បី៖ ⏎ បង្កើនលទ្ធភាព និងសមធម៌ — ធានាថាកុមារមកពីគ្រួសារងាយរងគ្រោះ ជនបទ និងជនដាច់ស្រយាល មានសិទ្ធិទទួលការអប់រំប្រកបដោយគុណភាព។ផ្តល់អំណាចដល់គ្រូបង្រៀន — ផ្តល់ការអភិវឌ្ឍវិជ្ជាជីវៈយ៉ាងម៉ត់ចត់ ការណែនាំអក្ខរកម្មឌីជីថល និងឧបករណ៍គរុកោសល្យទំនើប។ជំរុញការច្នៃប្រឌិតឌីជីថល និងបច្ចេកទេស — បញ្ចូល STEM បច្ចេកវិទ្យាព័ត៌មាន និងបច្ចេកវិទ្យាទំនើបទៅក្នុងថ្នាក់រៀន ដើម្បីរៀបចំយុវជនកម្ពុជាសម្រាប់សតវត្សរ៍ទី២១។ ⏎ ដោយតម្រឹមគម្រោងរបស់យើងដោយផ្ទាល់ជាមួយផែនការយុទ្ធសាស្ត្ររបស់ក្រសួងអប់រំ យុវជន និងកីឡា យើងធានាថាអន្តរាគមន៍របស់យើងមិនត្រឹមតែជាដំណោះស្រាយបណ្តោះអាសន្នទេ ប៉ុន្តែជាវិធីសាស្ត្រប្រកបដោយចីរភាព ដែលអាចបញ្ចូលទៅក្នុងគោលនយោបាយជាតិបាន។ |
| who-we-are/accreditations | page.title | Accreditations & Honors | ការទទួលស្គាល់ និងកិត្តិយស |
| who-we-are/accreditations | page.excerpt | Explore KAPE's official credentials, operational licenses, and letters of appreciation. These honors celebrate our track record of trust, accountability, and meaningful educational achievements recognized by donors, local authorities, and key stakeholders. | ស្វែងយល់អំពីលិខិតបញ្ជាក់ផ្លូវការ អាជ្ញាបណ្ណប្រតិបត្តិការ និងលិខិតកោតសរសើររបស់ KAPE។ កិត្តិយសទាំងនេះអបអរសាទរកំណត់ត្រានៃការទុកចិត្ត គណនេយ្យភាព និងសមិទ្ធផលអប់រំដ៏មានអត្ថន័យ ដែលត្រូវបានទទួលស្គាល់ដោយម្ចាស់ជំនួយ អាជ្ញាធរមូលដ្ឋាន និងភាគីពាក់ព័ន្ធសំខាន់ៗ។ |
| who-we-are/accreditations | hero.eyebrow | Credentials & recognition | លិខិតបញ្ជាក់ និងការទទួលស្គាល់ |
| who-we-are/accreditations | hero.title | Accreditations & Honors | ការទទួលស្គាល់ និងកិត្តិយស |
| who-we-are/accreditations | hero.lead | Explore KAPE's official credentials, operational licenses, and letters of appreciation. These honors celebrate our track record of trust, accountability, and meaningful educational achievements recognized by donors, local authorities, and key stakeholders. | ស្វែងយល់អំពីលិខិតបញ្ជាក់ផ្លូវការ អាជ្ញាបណ្ណប្រតិបត្តិការ និងលិខិតកោតសរសើររបស់ KAPE។ កិត្តិយសទាំងនេះអបអរសាទរកំណត់ត្រានៃការទុកចិត្ត គណនេយ្យភាព និងសមិទ្ធផលអប់រំដ៏មានអត្ថន័យ ដែលត្រូវបានទទួលស្គាល់ដោយម្ចាស់ជំនួយ អាជ្ញាធរមូលដ្ឋាន និងភាគីពាក់ព័ន្ធសំខាន់ៗ។ |
| who-we-are/accreditations | honors-intro.title | 1. Honors and Awards | ១. កិត្តិយស និងពានរង្វាន់ |
| who-we-are/accreditations | honors-intro.body | Letters of appreciation, awards and recognitions received from ministries, donors and local authorities. Click any certificate to view it full screen. | លិខិតកោតសរសើរ ពានរង្វាន់ និងការទទួលស្គាល់ដែលទទួលបានពីក្រសួង ម្ចាស់ជំនួយ និងអាជ្ញាធរមូលដ្ឋាន។ ចុចលើវិញ្ញាបនបត្រណាមួយដើម្បីមើលពេញអេក្រង់។ |
| who-we-are/accreditations | accreditations-intro.title | 2. Accreditations & Certifications | ២. ការទទួលស្គាល់ និងវិញ្ញាបនបត្រ |
| who-we-are/accreditations | accreditations-intro.body | Operational licenses, registrations and quality certifications held by KAPE. Click any certificate to view it full screen. | អាជ្ញាបណ្ណប្រតិបត្តិការ ការចុះបញ្ជី និងវិញ្ញាបនបត្រគុណភាពដែល KAPE កាន់កាប់។ ចុចលើវិញ្ញាបនបត្រណាមួយដើម្បីមើលពេញអេក្រង់។ |
| what-we-do/ten-subsectors | page.title | Ten Subsectors | អនុវិស័យទាំងដប់ |
| what-we-do/ten-subsectors | page.excerpt | KAPE's ten education subsectors defining our holistic approach to improving learning outcomes in Cambodia. | អនុវិស័យអប់រំទាំងដប់របស់ KAPE ដែលកំណត់វិធីសាស្ត្រគ្រប់ជ្រុងជ្រោយរបស់យើងក្នុងការកែលម្អលទ្ធផលសិក្សានៅកម្ពុជា។ |
| what-we-do/ten-subsectors | hero.eyebrow | Framework | ក្របខណ្ឌ |
| what-we-do/ten-subsectors | hero.title | Ten Subsectors | អនុវិស័យទាំងដប់ |
| what-we-do/ten-subsectors | hero.lead | A comprehensive framework covering the ten key subsectors that drive education quality and access across Cambodia. | ក្របខណ្ឌដ៏ទូលំទូលាយមួយដែលគ្របដណ្តប់លើអនុវិស័យសំខាន់ៗទាំងដប់ ដែលជំរុញគុណភាព និងលទ្ធភាពទទួលបានការអប់រំនៅទូទាំងប្រទេសកម្ពុជា។ |
| what-we-do/ten-subsectors | subsectors.title | The ten subsectors | អនុវិស័យទាំងដប់ |

## 4. Project records, 26 projects

Name, summary and body for every project.
The bodies repeat because the client's own site repeats them: 24 of the 26 project pages carry one identical sentence.
Correcting the Khmer here does not make those pages say anything, KAPE still has to write them.

| where | field | en | km |
|---|---|---|---|
| project:ngs | name | New Generation School | សាលាជំនាន់ថ្មី |
| project:ngs | summary | New Generation School project by KAPE. | សាលាជំនាន់ថ្មី ជាគម្រោងរបស់ខេប។ |
| project:ngs | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:ngprc | name | New Generation Pre-service Resource Center | មជ្ឈមណ្ឌលធនធានបណ្តុះបណ្តាលគ្រូមុនចូលបម្រើការជំនាន់ថ្មី |
| project:ngprc | summary | New Generation Pre-service Resource Center project by KAPE. | មជ្ឈមណ្ឌលធនធានបណ្តុះបណ្តាលគ្រូមុនចូលបម្រើការជំនាន់ថ្មី ជាគម្រោងរបស់ខេប។ |
| project:ngprc | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:hcc | name | Happy Cambodian Children | កុមារកម្ពុជាសប្បាយរីករាយ |
| project:hcc | summary | Happy Cambodian Children project by KAPE. | កុមារកម្ពុជាសប្បាយរីករាយ ជាគម្រោងរបស់ខេប។ |
| project:hcc | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:class | name | Comprehensive Learning and Academic Support Strategy | យុទ្ធសាស្ត្រសិក្សាទូលំទូលាយ និងការគាំទ្រផ្នែកសិក្សា |
| project:class | summary | Comprehensive Learning and Academic Support Strategy project by KAPE. | យុទ្ធសាស្ត្រសិក្សាទូលំទូលាយ និងការគាំទ្រផ្នែកសិក្សា ជាគម្រោងរបស់ខេប។ |
| project:class | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:mldp | name | Master's Degree in Leadership and Mentoring | បរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកភាពជាអ្នកដឹកនាំ និងការណែនាំ |
| project:mldp | summary | Master's Degree in Leadership and Mentoring project by KAPE. | បរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកភាពជាអ្នកដឹកនាំ និងការណែនាំ ជាគម្រោងរបស់ខេប។ |
| project:mldp | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:equal-i3l | name | EQUAL-i3L | EQUAL-i3L |
| project:equal-i3l | summary | EQUAL-i3L project by KAPE. | EQUAL-i3L ជាគម្រោងរបស់ខេប។ |
| project:equal-i3l | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:llse | name | Lower Secondary School Enhancement | ការលើកកម្ពស់គុណភាពអនុវិទ្យាល័យ |
| project:llse | summary | Lower Secondary School Enhancement project by KAPE. | ការលើកកម្ពស់គុណភាពអនុវិទ្យាល័យ ជាគម្រោងរបស់ខេប។ |
| project:llse | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:dep | name | Digital Education Program | កម្មវិធីអប់រំឌីជីថល |
| project:dep | summary | The Digital Education Program (DEP) builds digital, media and AI capability across Cambodian schools. | កម្មវិធីអប់រំឌីជីថល (DEP) កសាងសមត្ថភាពឌីជីថល ប្រព័ន្ធផ្សព្វផ្សាយ និងបញ្ញាសិប្បនិម្មិត នៅតាមសាលារៀនកម្ពុជា។ |
| project:dep | body | The Digital Education Program (DEP) builds digital and AI capability across Cambodian schools — equipping teachers, students and school leaders with the skills, devices and curricula they need for a digital economy. ⏎ DEP operates through a portfolio of focused sub-projects, each with its own donors, target provinces and timelines. | កម្មវិធីអប់រំឌីជីថល (DEP) កសាងសមត្ថភាពឌីជីថល និងបញ្ញាសិប្បនិម្មិតនៅតាមសាលារៀនកម្ពុជា — ដោយផ្តល់ជូនគ្រូបង្រៀន សិស្ស និងថ្នាក់ដឹកនាំសាលា នូវជំនាញ ឧបករណ៍ និងកម្មវិធីសិក្សាដែលពួកគេត្រូវការសម្រាប់សេដ្ឋកិច្ចឌីជីថល។ ⏎ DEP ដំណើរការតាមរយៈបណ្តុំអនុគម្រោងជាក់លាក់ ដែលនីមួយៗមានម្ចាស់ជំនួយ ខេត្តគោលដៅ និងកាលវិភាគរៀងៗខ្លួន។ |
| project:iep | name | Inclusive Education Program | កម្មវិធីអប់រំបរិយាប័ន្ន |
| project:iep | summary | Inclusive Education Program (IEP) by KAPE — inclusive classrooms for children with disabilities and marginalised learners. | កម្មវិធីអប់រំបរិយាប័ន្ន (IEP) របស់ខេប — ថ្នាក់រៀនបរិយាប័ន្នសម្រាប់កុមារពិការ និងសិស្សដែលរងការរើសអើង។ |
| project:iep | body | The Inclusive Education Program (IEP) ensures children with disabilities and other marginalised learners are welcomed and supported in mainstream classrooms. ⏎ IEP works with teachers, school directors, families and provincial education offices to remove physical, attitudinal and pedagogical barriers to learning. It brings together several sub-projects, each with its own target areas and partners. | កម្មវិធីអប់រំបរិយាប័ន្ន (IEP) ធានាថាកុមារពិការ និងសិស្សដែលរងការរើសអើងផ្សេងទៀត ត្រូវបានស្វាគមន៍ និងគាំទ្រនៅក្នុងថ្នាក់រៀនធម្មតា។ ⏎ IEP សហការជាមួយគ្រូបង្រៀន នាយកសាលា គ្រួសារ និងមន្ទីរអប់រំខេត្ត ដើម្បីលុបបំបាត់ឧបសគ្គផ្នែករូបវន្ត ផ្លូវចិត្ត និងគរុកោសល្យចំពោះការសិក្សា។ វារួមបញ្ចូលគ្នានូវអនុគម្រោងជាច្រើន ដែលនីមួយៗមានតំបន់គោលដៅ និងដៃគូរៀងៗខ្លួន។ |
| project:air | name | AIR | AIR |
| project:air | summary | AIR (AI Readiness) prepares Cambodian schools, teachers and students for the responsible integration of artificial intelligence in learning. | AIR (ការត្រៀមខ្លួនផ្នែកបញ្ញាសិប្បនិម្មិត) រៀបចំសាលារៀន គ្រូបង្រៀន និងសិស្សកម្ពុជា សម្រាប់ការបញ្ចូលបញ្ញាសិប្បនិម្មិតដោយទំនួលខុសត្រូវទៅក្នុងការសិក្សា។ |
| project:air | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:ideal | name | IDEAL | IDEAL |
| project:ideal | summary | IDEAL (Integrated Digital Education for Adolescent Learners) blends classroom and online learning for lower-secondary students. | IDEAL (ការអប់រំឌីជីថលរួមបញ្ចូលគ្នាសម្រាប់សិស្សវ័យជំទង់) បញ្ចូលការរៀនក្នុងថ្នាក់ និងការរៀនតាមអនឡាញ សម្រាប់សិស្សអនុវិទ្យាល័យ។ |
| project:ideal | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:midl | name | MIDL | MIDL |
| project:midl | summary | MIDL (Media and Information Digital Literacy) equips youth with critical thinking, online safety, and digital citizenship skills. | MIDL (អក្ខរកម្មប្រព័ន្ធផ្សព្វផ្សាយ ព័ត៌មាន និងឌីជីថល) ផ្តល់ឱ្យយុវជននូវជំនាញគិតបែបរិះគន់ សុវត្ថិភាពអនឡាញ និងភាពជាពលរដ្ឋឌីជីថល។ |
| project:midl | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:camscam | name | CamScam | CamScam |
| project:camscam | summary | CamScam supports STEM, computing and maker-space initiatives in Cambodian secondary schools. | CamScam គាំទ្រគំនិតផ្តួចផ្តើមផ្នែក STEM កុំព្យូទ័រ និងលំហច្នៃប្រឌិត នៅតាមសាលាមធ្យមសិក្សានៅកម្ពុជា។ |
| project:camscam | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:dvitsa | name | DViTSA | DViTSA |
| project:dvitsa | summary | Digital and Virtual Teaching for Sciences & Arts (DViTSA), a sub-project of KAPE's Digital Education Program. | ការបង្រៀនឌីជីថល និងនិម្មិតសម្រាប់វិទ្យាសាស្ត្រ និងសិល្បៈ (DViTSA) ជាអនុគម្រោងនៃកម្មវិធីអប់រំឌីជីថលរបស់ខេប។ |
| project:dvitsa | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:dwd | name | DWD | DWD |
| project:dwd | summary | DWD (Disability and Working Development) strengthens disability-inclusive education and supports children with disabilities to access and thrive in mainstream classrooms. | DWD (ពិការភាព និងការអភិវឌ្ឍការងារ) ពង្រឹងការអប់រំបរិយាប័ន្នសម្រាប់ជនពិការ និងគាំទ្រកុមារពិការឱ្យទទួលបាន និងរីកចម្រើនក្នុងថ្នាក់រៀនធម្មតា។ |
| project:dwd | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:lotus-outreach | name | Lotus Outreach | Lotus Outreach |
| project:lotus-outreach | summary | Lotus Outreach partners with KAPE to keep marginalised girls and at-risk children — particularly in rural communities — enrolled and learning. | Lotus Outreach សហការជាមួយខេប ដើម្បីរក្សាក្មេងស្រីដែលរងការរើសអើង និងកុមារប្រឈមហានិភ័យ — ជាពិសេសនៅតាមសហគមន៍ជនបទ — ឱ្យបន្តចុះឈ្មោះរៀន និងសិក្សា។ |
| project:lotus-outreach | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:ctsp | name | CTSP | CTSP |
| project:ctsp | summary | CTSP (Children Targeted Support Program) provides individualised support for children with disabilities, including assistive devices and specialist teachers. | CTSP (កម្មវិធីគាំទ្រកុមារគោលដៅ) ផ្តល់ការគាំទ្រជាលក្ខណៈបុគ្គលដល់កុមារពិការ រួមទាំងឧបករណ៍ជំនួយ និងគ្រូបង្រៀនឯកទេស។ |
| project:ctsp | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:ibec | name | Inquiry-Based Education in Cambodia | ការអប់រំផ្អែកលើការសាកសួរស្រាវជ្រាវនៅកម្ពុជា |
| project:ibec | summary | Inquiry-Based Education in Cambodia past project by KAPE. | ការអប់រំផ្អែកលើការសាកសួរស្រាវជ្រាវនៅកម្ពុជា ជាគម្រោងពីមុនរបស់ខេប។ |
| project:ibec | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:e2l | name | Education to Employment | ការអប់រំឆ្ពោះទៅរកការងារ |
| project:e2l | summary | Education to Employment past project by KAPE. | ការអប់រំឆ្ពោះទៅរកការងារ ជាគម្រោងពីមុនរបស់ខេប។ |
| project:e2l | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:lslag | name | Life Skills Learning for Adolescent Girls | ការសិក្សាជំនាញជីវិតសម្រាប់ក្មេងស្រីវ័យជំទង់ |
| project:lslag | summary | Life Skills Learning for Adolescent Girls past project by KAPE. | ការសិក្សាជំនាញជីវិតសម្រាប់ក្មេងស្រីវ័យជំទង់ ជាគម្រោងពីមុនរបស់ខេប។ |
| project:lslag | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:seek | name | Sustainability and Enhancement of Education in Kratie | និរន្តរភាព និងការលើកកម្ពស់ការអប់រំនៅខេត្តក្រចេះ |
| project:seek | summary | Sustainability and Enhancement of Education in Kratie past project by KAPE. | និរន្តរភាព និងការលើកកម្ពស់ការអប់រំនៅខេត្តក្រចេះ ជាគម្រោងពីមុនរបស់ខេប។ |
| project:seek | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:kyla | name | Kape Youth Leadership Academy | បណ្ឌិត្យសភាភាពជាអ្នកដឹកនាំយុវជនខេប |
| project:kyla | summary | Kape Youth Leadership Academy past project by KAPE. | បណ្ឌិត្យសភាភាពជាអ្នកដឹកនាំយុវជនខេប ជាគម្រោងពីមុនរបស់ខេប។ |
| project:kyla | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:sfe | name | Schools for Excellence | សាលារៀនសម្រាប់ឧត្តមភាព |
| project:sfe | summary | Schools for Excellence past project by KAPE. | សាលារៀនសម្រាប់ឧត្តមភាព ជាគម្រោងពីមុនរបស់ខេប។ |
| project:sfe | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:bfc | name | Better Futures for Children | អនាគតកាន់តែប្រសើរសម្រាប់កុមារ |
| project:bfc | summary | Better Futures for Children past project by KAPE. | អនាគតកាន់តែប្រសើរសម្រាប់កុមារ ជាគម្រោងពីមុនរបស់ខេប។ |
| project:bfc | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:escup | name | Education Support for Children in Underserved Provinces | ការគាំទ្រការអប់រំដល់កុមារនៅខេត្តដាច់ស្រយាល |
| project:escup | summary | Education Support for Children in Underserved Provinces past project by KAPE. | ការគាំទ្រការអប់រំដល់កុមារនៅខេត្តដាច់ស្រយាល ជាគម្រោងពីមុនរបស់ខេប។ |
| project:escup | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |
| project:bsi | name | Basic School Improvement | ការកែលម្អសាលារៀនមូលដ្ឋាន |
| project:bsi | summary | Basic School Improvement past project by KAPE. | ការកែលម្អសាលារៀនមូលដ្ឋាន ជាគម្រោងពីមុនរបស់ខេប។ |
| project:bsi | body | Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team. | ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។ |

## 5. Bios, news and stories

Ordinary machine translation.
News bodies quote named officials (Chet Sophoan, Hem Sinath, Um Sarith, Sor Sophanak, Hin Simhuon), and the Khmer spelling of those names inside the prose carries the same risk as section 1.

| where | field | en | km |
|---|---|---|---|
| person:person-heang-koy | bio | Mr. Heang Koy chairs KAPE's Board of Directors and has served the education sector in Cambodia for more than three decades.<br>He guides the organisation's strategic direction, ensuring KAPE remains accountable to communities, government partners and donors as it scales its impact across 15 provinces. | លោក ហេង គយ ជាប្រធានក្រុមប្រឹក្សាភិបាលរបស់ ខេប ហើយបានបម្រើវិស័យអប់រំនៅកម្ពុជាអស់រយៈពេលជាងបីទសវត្សរ៍មកហើយ។<br>លោកដឹកនាំទិសដៅយុទ្ធសាស្ត្ររបស់អង្គការ ដោយធានាថា ខេប នៅតែមានគណនេយ្យភាពចំពោះសហគមន៍ ដៃគូរដ្ឋាភិបាល និងម្ចាស់ជំនួយ ខណៈពេលដែលពង្រីកផលប៉ះពាល់របស់ខ្លួននៅទូទាំង ១៥ ខេត្ត។ |
| person:person-hin-simhuon | bio | Mr. Hin Simhuon is a senior member of KAPE's Board of Directors, bringing decades of experience in Cambodian public education and community development.<br>He provides governance oversight and advises on partnerships with the Ministry of Education, Youth and Sport and provincial authorities. | លោក ហ៊ិន ស៊ីមហួន ជាសមាជិកជាន់ខ្ពស់នៃក្រុមប្រឹក្សាភិបាលរបស់ ខេប ដែលនាំមកនូវបទពិសោធន៍ជាច្រើនទសវត្សរ៍ក្នុងវិស័យអប់រំសាធារណៈ និងការអភិវឌ្ឍសហគមន៍នៅកម្ពុជា។<br>លោកផ្តល់ការត្រួតពិនិត្យអភិបាលកិច្ច និងផ្តល់យោបល់អំពីភាពជាដៃគូជាមួយក្រសួងអប់រំ យុវជន និងកីឡា និងអាជ្ញាធរខេត្ត។ |
| person:person-chhay-typa | bio | Mr. Chhay Typa serves on KAPE's Board of Directors and contributes long experience in school-level programming and teacher development.<br>He supports the board's review of programme quality and community engagement across KAPE's project provinces. | លោក ឆាយ ទីប៉ា បម្រើការក្នុងក្រុមប្រឹក្សាភិបាលរបស់ ខេប និងចូលរួមចំណែកដោយបទពិសោធន៍យូរអង្វែងក្នុងការរៀបចំកម្មវិធីថ្នាក់សាលា និងការអភិវឌ្ឍគ្រូបង្រៀន។<br>លោកគាំទ្រការពិនិត្យឡើងវិញរបស់ក្រុមប្រឹក្សាភិបាល លើគុណភាពកម្មវិធី និងការចូលរួមរបស់សហគមន៍នៅទូទាំងខេត្តគម្រោងរបស់ ខេប។ |
| person:person-board-4 | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-board-5 | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-board-6 | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-sambath | bio | Mr. Sambath leads KAPE as Executive Director, overseeing programmes reaching more than 160,000 children across Cambodia.<br>He works closely with the Ministry of Education, Youth and Sport, international donors and civil-society partners to align KAPE's work with national education priorities.<br>Under his leadership KAPE has expanded into new areas such as AI literacy, STEM innovation and inclusive education for the most vulnerable learners. | លោក សម្បត្តិ ដឹកនាំ ខេប ក្នុងតួនាទីជានាយកប្រតិបត្តិ ដោយត្រួតពិនិត្យកម្មវិធីដែលឈានដល់កុមារជាង ១៦០.០០០ នាក់នៅទូទាំងប្រទេសកម្ពុជា។<br>លោកធ្វើការយ៉ាងជិតស្និទ្ធជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ម្ចាស់ជំនួយអន្តរជាតិ និងដៃគូសង្គមស៊ីវិល ដើម្បីតម្រឹមការងាររបស់ ខេប ទៅនឹងអាទិភាពអប់រំជាតិ។<br>ក្រោមការដឹកនាំរបស់លោក ខេប បានពង្រីកទៅវិស័យថ្មីៗ ដូចជាអក្ខរកម្មបញ្ញាសិប្បនិម្មិត នវានុវត្តន៍ STEM និងការអប់រំបរិយាបន្នសម្រាប់សិស្សដែលងាយរងគ្រោះបំផុត។ |
| person:person-set-soleakna | bio | Ms. Set Soleakna serves as Vice Director, supporting KAPE's Executive Director on programme strategy, human resources and cross-project coordination.<br>She has been instrumental in strengthening KAPE's internal systems and mentoring the next generation of Cambodian education leaders. | លោកស្រី សេត សុលក្ខិណា បម្រើការជាអនុនាយក ដោយគាំទ្រនាយកប្រតិបត្តិរបស់ ខេប លើយុទ្ធសាស្ត្រកម្មវិធី ធនធានមនុស្ស និងការសម្របសម្រួលឆ្លងគម្រោង។<br>លោកស្រីបានដើរតួយ៉ាងសំខាន់ក្នុងការពង្រឹងប្រព័ន្ធផ្ទៃក្នុងរបស់ ខេប និងបណ្តុះបណ្តាលអ្នកដឹកនាំអប់រំកម្ពុជាជំនាន់ក្រោយ។ |
| person:person-kimheang | bio | Ms. Kimheang leads KAPE's Finance Directorate, ensuring transparent stewardship of donor funds and compliance with Cambodian law and international standards.<br>She oversees financial planning, audit, and grant management for all KAPE projects. | លោកស្រី គីមហៀង ដឹកនាំនាយកដ្ឋានហិរញ្ញវត្ថុរបស់ ខេប ដោយធានានូវការគ្រប់គ្រងថវិកាម្ចាស់ជំនួយប្រកបដោយតម្លាភាព និងអនុលោមតាមច្បាប់កម្ពុជា និងស្តង់ដារអន្តរជាតិ។<br>លោកស្រីត្រួតពិនិត្យការរៀបចំផែនការហិរញ្ញវត្ថុ សវនកម្ម និងការគ្រប់គ្រងជំនួយសម្រាប់គម្រោងទាំងអស់របស់ ខេប។ |
| person:person-senior-technical-adviser | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-senior-national-adviser | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-hr-admin-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-phal-sovanthy | bio | Mr. Phal Sovanthy manages KAPE's New Generation Schools Initiative (NGSI), a flagship reform programme piloting high-quality secondary education across Cambodia.<br>He works with school directors, teachers and MoEYS partners to implement rigorous standards, ICT-rich classrooms and student-centred learning. | លោក ផល សុវណ្ណថី គ្រប់គ្រងគំនិតផ្តួចផ្តើមសាលាជំនាន់ថ្មី (NGSI) របស់ ខេប ដែលជាកម្មវិធីកែទម្រង់ឈានមុខគេ សាកល្បងការអប់រំមធ្យមសិក្សាគុណភាពខ្ពស់នៅទូទាំងប្រទេសកម្ពុជា។<br>លោកធ្វើការជាមួយនាយកសាលា គ្រូបង្រៀន និងដៃគូក្រសួងអប់រំ ដើម្បីអនុវត្តស្តង់ដារតឹងរឹង ថ្នាក់រៀនសម្បូរបច្ចេកវិទ្យា និងការសិក្សាដែលផ្តោតលើសិស្ស។ |
| person:person-ngprc-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-hcc-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-class-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-iep-coordinator | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-dep-coordinator | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-equal-i3l-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-llse-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-foster-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-mldp-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-mc-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| person:person-me-manager | bio | Biography coming soon. | ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។ |
| news:chaktomuk-annual-student-exhibition | title | Annual Student Exhibition at Chaktomuk Secondary School: Cultivating Digital Skills and Creating Direct Impacts on Youth's Future through the IDEAL Project | ពិព័រណ៍សិស្សប្រចាំឆ្នាំនៅវិទ្យាល័យចតុមុខ៖ ការបណ្តុះជំនាញឌីជីថល និងបង្កើតផលប៉ះពាល់ដោយផ្ទាល់ដល់អនាគតយុវជនតាមរយៈគម្រោង IDEAL |
| news:chaktomuk-annual-student-exhibition | excerpt | Phnom Penh: On July 31, 2026, Chaktomuk Secondary School hosted a significant "Annual Student Exhibition" filled with a vibrant and celebratory atmosphere, supported by the IDEAL project and implemented by KAPE. | ភ្នំពេញ៖ នៅថ្ងៃទី ៣១ ខែកក្កដា ឆ្នាំ ២០២៦ វិទ្យាល័យចតុមុខបានរៀបចំ «ពិព័រណ៍សិស្សប្រចាំឆ្នាំ» ដ៏សំខាន់មួយ ពោរពេញដោយបរិយាកាសរស់រវើក និងសប្បាយរីករាយ ដោយមានការគាំទ្រពីគម្រោង IDEAL និងអនុវត្តដោយ ខេប។ |
| news:chaktomuk-annual-student-exhibition | body | Phnom Penh: On July 31, 2026, Chaktomuk Secondary School hosted a significant "Annual Student Exhibition" filled with a vibrant and celebratory atmosphere. This program materialized under the full support of the Improving Digital Education for All Learners (IDEAL) project, funded by ChorogUsan for children and directly implemented by KAPE, with the aim of encouraging and motivating the school to increase its focus on developing 21st-century skills for the youth.<br>This meaningful event attracted a total of approximately 350 participants, including the school management committee, teachers, students, parents, and local authorities. It was held under the high presidency of Mrs. Chet Sophoan, Deputy Director of the Secondary Education Office, the representative of Mr. Hem Sinath, Director of the Phnom Penh Municipal Office of Education, Youth and Sport; Mr. Um Sarith, Deputy Principal of Chaktomuk Secondary School; Mr. Hin Simhuon, Vice Executive Director of KAPE; and Mr. Sor Sophanak, Project Coordinator.<br>To drive this vision of digital education into reality, the IDEAL project has encouraged and supported the establishment of 17 study clubs within the school, such as Khmer Language, Earth Science, Biology, Mathematics, Physics, Chemistry, and Geography clubs, etc. As a result of this endeavor, the exhibition was organized not only to showcase the students' personal achievements born out of their creativity and year-long research, but also to clearly demonstrate the positive impacts of digital education and study clubs on transforming students' attitudes and developing their competencies.<br>Reflecting pride in this success, Mrs. Chet Sophoan, Deputy Head of the Secondary Education Office, expressed her delight and highly evaluated that "Our students possess not only knowledge but also practical know-how, skills, strong will, and creativity. This exhibition will help boost intellectual capacity and new skills to contribute to the further development and prosperity of the nation." Regarding the achievements the students have accomplished, Mr. Um Sarith, Deputy Principal of Chaktomuk Secondary School, further emphasized in the school's progress report that "The progress and success of the school stem from the close collaboration among the management committee, teachers, development partners, and especially the active participation and support from all parents and guardians." To broaden this vision even further, Mr. Hin Simhuon, Vice Executive Director of KAPE, highlighted the importance of education in this new era, stating that "Responding to the Royal Government's Pentagonal Strategy means equipping students with digital and STEAM skills from a young age. If our human resources lack technological knowledge, we will face high risks in this digital age."<br>Overall, the annual student exhibition at Chaktomuk Secondary School concluded successfully, leaving behind smiles and strong hope. The knowledge, hands-on experiences, and creativity that students acquired from the study clubs and this event serve as the most valuable educational investment in shifting their mindsets, enhancing their digital skills, and unlocking doors to bright career opportunities for them in the future. | ភ្នំពេញ៖ នៅថ្ងៃទី ៣១ ខែកក្កដា ឆ្នាំ ២០២៦ វិទ្យាល័យចតុមុខបានរៀបចំ «ពិព័រណ៍សិស្សប្រចាំឆ្នាំ» ដ៏សំខាន់មួយ ពោរពេញដោយបរិយាកាសរស់រវើក និងសប្បាយរីករាយ។ កម្មវិធីនេះបានកើតឡើងក្រោមការគាំទ្រពេញលេញពីគម្រោងលើកកម្ពស់ការអប់រំឌីជីថលសម្រាប់សិស្សគ្រប់រូប (IDEAL) ដែលឧបត្ថម្ភថវិកាដោយ ChorogUsan សម្រាប់កុមារ និងអនុវត្តដោយផ្ទាល់ដោយ ខេប ក្នុងគោលបំណងលើកទឹកចិត្ត និងជំរុញឱ្យសាលាបង្កើនការផ្តោតលើការអភិវឌ្ឍជំនាញសតវត្សរ៍ទី ២១ សម្រាប់យុវជន។<br>កម្មវិធីដ៏មានអត្ថន័យនេះបានទាក់ទាញអ្នកចូលរួមសរុបប្រមាណ ៣៥០ នាក់ រួមមានគណៈកម្មការគ្រប់គ្រងសាលា គ្រូបង្រៀន សិស្ស មាតាបិតា និងអាជ្ញាធរមូលដ្ឋាន។ កម្មវិធីនេះបានប្រព្រឹត្តទៅក្រោមអធិបតីភាពដ៏ខ្ពង់ខ្ពស់របស់លោកស្រី ជេត សុភ័ណ អនុប្រធានការិយាល័យអប់រំមធ្យមសិក្សា តំណាងលោក ហែម ស៊ីណាត ប្រធានមន្ទីរអប់រំ យុវជន និងកីឡា រាជធានីភ្នំពេញ លោក អ៊ុំ សារិទ្ធ អនុប្រធានវិទ្យាល័យចតុមុខ លោក ហ៊ិន ស៊ីមហួន អនុនាយកប្រតិបត្តិ ខេប និងលោក សរ សុភ័ណក អ្នកសម្របសម្រួលគម្រោង។<br>ដើម្បីជំរុញចក្ខុវិស័យនៃការអប់រំឌីជីថលនេះឱ្យក្លាយជាការពិត គម្រោង IDEAL បានលើកទឹកចិត្ត និងគាំទ្រការបង្កើតក្លឹបសិក្សាចំនួន ១៧ នៅក្នុងសាលា ដូចជាក្លឹបភាសាខ្មែរ ផែនដីវិទ្យា ជីវវិទ្យា គណិតវិទ្យា រូបវិទ្យា គីមីវិទ្យា និងភូមិវិទ្យា ជាដើម។ ជាលទ្ធផលនៃការខិតខំនេះ ពិព័រណ៍នេះត្រូវបានរៀបចំឡើងមិនត្រឹមតែដើម្បីបង្ហាញសមិទ្ធផលផ្ទាល់ខ្លួនរបស់សិស្ស ដែលកើតចេញពីការច្នៃប្រឌិត និងការស្រាវជ្រាវពេញមួយឆ្នាំប៉ុណ្ណោះទេ ប៉ុន្តែថែមទាំងដើម្បីបង្ហាញយ៉ាងច្បាស់នូវផលប៉ះពាល់វិជ្ជមាននៃការអប់រំឌីជីថល និងក្លឹបសិក្សា ក្នុងការផ្លាស់ប្តូរឥរិយាបថសិស្ស និងអភិវឌ្ឍសមត្ថភាពរបស់ពួកគេផងដែរ។<br>ដោយឆ្លុះបញ្ចាំងពីមោទនភាពចំពោះជោគជ័យនេះ លោកស្រី ជេត សុភ័ណ អនុប្រធានការិយាល័យអប់រំមធ្យមសិក្សា បានសម្តែងនូវក្តីរីករាយ និងវាយតម្លៃខ្ពស់ថា «សិស្សរបស់យើងមិនត្រឹមតែមានចំណេះដឹងប៉ុណ្ណោះទេ ថែមទាំងមានចំណេះធ្វើ ជំនាញ ឆន្ទៈមោះមុត និងការច្នៃប្រឌិតផងដែរ។ ពិព័រណ៍នេះនឹងជួយលើកកម្ពស់សមត្ថភាពបញ្ញា និងជំនាញថ្មីៗ ដើម្បីរួមចំណែកក្នុងការអភិវឌ្ឍ និងវិបុលភាពរបស់ជាតិបន្ថែមទៀត»។ ចំពោះសមិទ្ធផលដែលសិស្សបានសម្រេច លោក អ៊ុំ សារិទ្ធ អនុប្រធានវិទ្យាល័យចតុមុខ បានបញ្ជាក់បន្ថែមក្នុងរបាយការណ៍វឌ្ឍនភាពរបស់សាលាថា «វឌ្ឍនភាព និងជោគជ័យរបស់សាលា កើតចេញពីកិច្ចសហការយ៉ាងជិតស្និទ្ធរវាងគណៈកម្មការគ្រប់គ្រង គ្រូបង្រៀន ដៃគូអភិវឌ្ឍន៍ និងជាពិសេសការចូលរួម និងការគាំទ្រយ៉ាងសកម្មពីមាតាបិតា និងអាណាព្យាបាលទាំងអស់»។ ដើម្បីពង្រីកចក្ខុវិស័យនេះឱ្យកាន់តែទូលំទូលាយ លោក ហ៊ិន ស៊ីមហួន អនុនាយកប្រតិបត្តិ ខេប បានគូសបញ្ជាក់ពីសារៈសំខាន់នៃការអប់រំក្នុងយុគសម័យថ្មីនេះថា «ការឆ្លើយតបទៅនឹងយុទ្ធសាស្ត្របញ្ចកោណរបស់រាជរដ្ឋាភិបាល មានន័យថាត្រូវបំពាក់ឱ្យសិស្សនូវជំនាញឌីជីថល និង STEAM តាំងពីតូច។ ប្រសិនបើធនធានមនុស្សរបស់យើងខ្វះចំណេះដឹងផ្នែកបច្ចេកវិទ្យា យើងនឹងប្រឈមហានិភ័យខ្ពស់ក្នុងយុគសម័យឌីជីថលនេះ»។<br>សរុបមក ពិព័រណ៍សិស្សប្រចាំឆ្នាំនៅវិទ្យាល័យចតុមុខបានបញ្ចប់ដោយជោគជ័យ ទុកឱ្យនៅសល់នូវស្នាមញញឹម និងក្តីសង្ឃឹមដ៏មុតមាំ។ ចំណេះដឹង បទពិសោធន៍ជាក់ស្តែង និងការច្នៃប្រឌិតដែលសិស្សទទួលបានពីក្លឹបសិក្សា និងព្រឹត្តិការណ៍នេះ គឺជាការវិនិយោគអប់រំដ៏មានតម្លៃបំផុត ក្នុងការផ្លាស់ប្តូរផ្នត់គំនិត បង្កើនជំនាញឌីជីថល និងបើកទ្វារឆ្ពោះទៅរកឱកាសការងារភ្លឺស្វាងសម្រាប់ពួកគេនាពេលអនាគត។ |
| news:ideal-annual-student-achievement-exhibition | title | Annual Student Achievement Exhibition at Neak Oknha Moha Pheakdey Hun Neang Bak Kheng Primary School: Showcasing Digital Education Achievements Supported by the IDEAL Project | ពិព័រណ៍សមិទ្ធផលសិស្សប្រចាំឆ្នាំនៅសាលាបឋមសិក្សា នាក់ឧកញ៉ា មហាភក្តី ហ៊ុន នាង បាកខែង៖ បង្ហាញសមិទ្ធផលអប់រំឌីជីថលដែលគាំទ្រដោយគម្រោង IDEAL |
| news:ideal-annual-student-achievement-exhibition | excerpt | Phnom Penh: On July 23, 2026, the campus of Neak Oknha Moha Pheakdey Hun Neang Bak Kheng Primary School was transformed into a vibrant and smile-filled educational forum during the grand Annual Student Achievement Exhibition. | ភ្នំពេញ៖ នៅថ្ងៃទី ២៣ ខែកក្កដា ឆ្នាំ ២០២៦ បរិវេណសាលាបឋមសិក្សា នាក់ឧកញ៉ា មហាភក្តី ហ៊ុន នាង បាកខែង ត្រូវបានប្រែក្លាយជាវេទិកាអប់រំដ៏រស់រវើក និងពោរពេញដោយស្នាមញញឹម ក្នុងពិព័រណ៍សមិទ្ធផលសិស្សប្រចាំឆ្នាំដ៏អធិកអធម។ |
| news:ideal-annual-student-achievement-exhibition | body | Phnom Penh: On July 23, 2026, the campus of Neak Oknha Moha Pheakdey Hun Neang Bak Kheng Primary School was transformed into a vibrant and smile-filled educational forum during the grand Annual Student Achievement Exhibition.<br>The exhibition brought together students, teachers, school directors, parents and education officials to celebrate a full year of learning under the IDEAL project — an initiative that integrates digital tools, media literacy and project-based learning into everyday classroom practice.<br>Dozens of booths lined the school grounds. Each one was designed, built and presented by the students themselves: coding and robotics demonstrations, digital storytelling, science experiments, recycled-material inventions, traditional cooking, and Khmer arts and dance performances.<br>Officials from the Ministry of Education, Youth and Sport, the Phnom Penh Department of Education, and representatives of KAPE and the project's partners toured the exhibition, speaking directly with students about how they researched, produced and presented their work.<br>"What we see here is not memorisation — it is children explaining their own thinking," one visiting official noted. "This is exactly the kind of learning the digital era demands."<br>Teachers shared how the IDEAL project changed their classrooms: lesson plans now blend offline group work with tablets and shared digital resources, while students take greater responsibility for their own projects and presentations.<br>The cultural programme closed the day, with students performing classical and folk dances on the main stage before parents and guests, a reminder that digital skills and Khmer identity grow side by side.<br>KAPE and the IDEAL project team extend their sincere thanks to the school leadership, teachers, parents and partners whose support made the exhibition possible, and reaffirm their commitment to expanding digital education opportunities for every Cambodian child. | ភ្នំពេញ៖ នៅថ្ងៃទី ២៣ ខែកក្កដា ឆ្នាំ ២០២៦ បរិវេណសាលាបឋមសិក្សា នាក់ឧកញ៉ា មហាភក្តី ហ៊ុន នាង បាកខែង ត្រូវបានប្រែក្លាយជាវេទិកាអប់រំដ៏រស់រវើក និងពោរពេញដោយស្នាមញញឹម ក្នុងពិព័រណ៍សមិទ្ធផលសិស្សប្រចាំឆ្នាំដ៏អធិកអធម។<br>ពិព័រណ៍នេះបានប្រមូលផ្តុំសិស្ស គ្រូបង្រៀន នាយកសាលា មាតាបិតា និងមន្ត្រីអប់រំ ដើម្បីអបអរសាទរការសិក្សាពេញមួយឆ្នាំក្រោមគម្រោង IDEAL ដែលជាគំនិតផ្តួចផ្តើមមួយបញ្ចូលឧបករណ៍ឌីជីថល អក្ខរកម្មប្រព័ន្ធផ្សព្វផ្សាយ និងការសិក្សាតាមគម្រោង ទៅក្នុងការអនុវត្តថ្នាក់រៀនប្រចាំថ្ងៃ។<br>តូបរាប់សិបបានតម្រៀបជួរនៅតាមបរិវេណសាលា។ តូបនីមួយៗត្រូវបានរចនា សាងសង់ និងបង្ហាញដោយសិស្សផ្ទាល់៖ ការបង្ហាញការសរសេរកូដ និងមនុស្សយន្ត ការនិទានរឿងឌីជីថល ការពិសោធន៍វិទ្យាសាស្ត្រ ការច្នៃប្រឌិតពីសម្ភារៈកែច្នៃ ការចម្អិនម្ហូបបុរាណ និងការសម្តែងសិល្បៈ និងរបាំខ្មែរ។<br>មន្ត្រីមកពីក្រសួងអប់រំ យុវជន និងកីឡា មន្ទីរអប់រំរាជធានីភ្នំពេញ ព្រមទាំងតំណាង ខេប និងដៃគូគម្រោង បានទស្សនាពិព័រណ៍ ដោយសន្ទនាដោយផ្ទាល់ជាមួយសិស្ស អំពីរបៀបដែលពួកគេស្រាវជ្រាវ ផលិត និងបង្ហាញស្នាដៃរបស់ខ្លួន។<br>«អ្វីដែលយើងឃើញនៅទីនេះ មិនមែនជាការទន្ទេញទេ គឺជាកុមារកំពុងពន្យល់ពីគំនិតរបស់ខ្លួនផ្ទាល់» មន្ត្រីម្នាក់ដែលបានមកទស្សនាបានកត់សម្គាល់។ «នេះជាការសិក្សាបែបដែលយុគសម័យឌីជីថលទាមទារយ៉ាងពិតប្រាកដ»។<br>គ្រូបង្រៀនបានចែករំលែកពីរបៀបដែលគម្រោង IDEAL បានផ្លាស់ប្តូរថ្នាក់រៀនរបស់ពួកគេ៖ ផែនការបង្រៀនឥឡូវនេះបញ្ចូលការងារជាក្រុមក្រៅបណ្តាញ ជាមួយថេប្លេត និងធនធានឌីជីថលរួម ខណៈដែលសិស្សទទួលខុសត្រូវកាន់តែច្រើនលើគម្រោង និងការធ្វើបទបង្ហាញរបស់ខ្លួន។<br>កម្មវិធីវប្បធម៌បានបិទបញ្ចប់ថ្ងៃនោះ ដោយសិស្សសម្តែងរបាំបុរាណ និងរបាំប្រជាប្រិយនៅលើឆាកធំ ចំពោះមុខមាតាបិតា និងភ្ញៀវកិត្តិយស ជាការរំលឹកថាជំនាញឌីជីថល និងអត្តសញ្ញាណខ្មែរ រីកចម្រើនទន្ទឹមគ្នា។<br>ខេប និងក្រុមការងារគម្រោង IDEAL សូមថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅដល់ថ្នាក់ដឹកនាំសាលា គ្រូបង្រៀន មាតាបិតា និងដៃគូទាំងអស់ ដែលការគាំទ្ររបស់ពួកគាត់បានធ្វើឱ្យពិព័រណ៍នេះកើតឡើងបាន ហើយសូមបញ្ជាក់ឡើងវិញនូវការប្តេជ្ញាចិត្តក្នុងការពង្រីកឱកាសអប់រំឌីជីថលសម្រាប់កុមារកម្ពុជាគ្រប់រូប។ |
| news:kang-meas-21st-century-library | title | Kang Meas District Receives 21st Century Library and Educational Material Support for Vulnerable Children | ស្រុកកងមាសទទួលបានបណ្ណាល័យសតវត្សរ៍ទី ២១ និងជំនួយសម្ភារៈអប់រំសម្រាប់កុមារងាយរងគ្រោះ |
| news:kang-meas-21st-century-library | excerpt | On May 25, 2026, the BMZ-EYE project organized a handover ceremony for a 21st-century library room and the distribution of educational materials and food supplies at Preak Koy Primary School, Kang Meas District, Kampong Cham Province. | នៅថ្ងៃទី ២៥ ខែឧសភា ឆ្នាំ ២០២៦ គម្រោង BMZ-EYE បានរៀបចំពិធីប្រគល់បន្ទប់បណ្ណាល័យសតវត្សរ៍ទី ២១ និងចែកចាយសម្ភារៈអប់រំ ព្រមទាំងស្បៀងអាហារ នៅសាលាបឋមសិក្សាព្រែកគយ ស្រុកកងមាស ខេត្តកំពង់ចាម។ |
| news:kang-meas-21st-century-library | body | On May 25, 2026, the BMZ-EYE project organized a handover ceremony for a 21st-century library room and the distribution of educational materials and food supplies at Preak Koy Primary School, Kang Meas District, Kampong Cham Province.<br>The ceremony was attended by district education officials, school directors, teachers, parents and children from the surrounding communities. The new library provides a dedicated space for reading, project-based learning and after-school clubs.<br>KAPE and BMZ-EYE are committed to expanding access to safe learning spaces and quality resources for vulnerable children across rural Cambodia. | នៅថ្ងៃទី ២៥ ខែឧសភា ឆ្នាំ ២០២៦ គម្រោង BMZ-EYE បានរៀបចំពិធីប្រគល់បន្ទប់បណ្ណាល័យសតវត្សរ៍ទី ២១ និងចែកចាយសម្ភារៈអប់រំ ព្រមទាំងស្បៀងអាហារ នៅសាលាបឋមសិក្សាព្រែកគយ ស្រុកកងមាស ខេត្តកំពង់ចាម។<br>ពិធីនេះមានការចូលរួមពីមន្ត្រីអប់រំស្រុក នាយកសាលា គ្រូបង្រៀន មាតាបិតា និងកុមារមកពីសហគមន៍ជុំវិញ។ បណ្ណាល័យថ្មីនេះផ្តល់នូវកន្លែងសម្រាប់ការអាន ការសិក្សាតាមគម្រោង និងក្លឹបក្រៅម៉ោងសិក្សា។<br>ខេប និង BMZ-EYE ប្តេជ្ញាពង្រីកលទ្ធភាពទទួលបានកន្លែងសិក្សាដែលមានសុវត្ថិភាព និងធនធានប្រកបដោយគុណភាព សម្រាប់កុមារងាយរងគ្រោះនៅទូទាំងជនបទកម្ពុជា។ |
| news:school-enrollment-campaign-2025-2026 | title | The Provincially Launching Campaign to Boost School Enrollment for 2025-2026 Academic Year | យុទ្ធនាការបើកបវេសនកាលថ្នាក់ខេត្ត ដើម្បីជំរុញការចុះឈ្មោះចូលរៀនសម្រាប់ឆ្នាំសិក្សា ២០២៥-២០២៦ |
| news:school-enrollment-campaign-2025-2026 | excerpt | A wave of educational outreach and celebratory announcements is sweeping across KAPE's partner provinces ahead of the new school year. | រលកនៃការផ្សព្វផ្សាយអប់រំ និងសេចក្តីប្រកាសអបអរសាទរ កំពុងរីករាលដាលនៅទូទាំងខេត្តដៃគូរបស់ ខេប មុនឆ្នាំសិក្សាថ្មី។ |
| news:school-enrollment-campaign-2025-2026 | body | A wave of educational outreach and celebratory announcements is sweeping across KAPE's partner provinces ahead of the 2025-2026 academic year.<br>Provincial teams have organized parades, community meetings and door-to-door visits to encourage families to enroll their children — with a special focus on girls, out-of-school youth and children with disabilities. | រលកនៃការផ្សព្វផ្សាយអប់រំ និងសេចក្តីប្រកាសអបអរសាទរ កំពុងរីករាលដាលនៅទូទាំងខេត្តដៃគូរបស់ ខេប មុនឆ្នាំសិក្សា ២០២៥-២០២៦។<br>ក្រុមការងារថ្នាក់ខេត្តបានរៀបចំក្បួនដង្ហែ កិច្ចប្រជុំសហគមន៍ និងការចុះសួរសុខទុក្ខតាមផ្ទះ ដើម្បីលើកទឹកចិត្តគ្រួសារឱ្យចុះឈ្មោះកូនចូលរៀន ដោយផ្តោតជាពិសេសលើកុមារី យុវជនក្រៅសាលា និងកុមារពិការ។ |
| news:ngs-new-ict-lab | title | New ICT Lab opens at New Generation School | បន្ទប់ពិសោធន៍ ICT ថ្មីបើកដំណើរការនៅសាលាជំនាន់ថ្មី |
| news:ngs-new-ict-lab | excerpt | Students gain a dedicated space for digital learning, coding clubs and AI literacy training as part of the NGS initiative. | សិស្សទទួលបានកន្លែងជាក់លាក់សម្រាប់ការសិក្សាឌីជីថល ក្លឹបសរសេរកូដ និងការបណ្តុះបណ្តាលអក្ខរកម្មបញ្ញាសិប្បនិម្មិត ជាផ្នែកនៃគំនិតផ្តួចផ្តើម NGS។ |
| news:ngs-new-ict-lab | body | Students at the New Generation School now have a dedicated ICT lab equipped with modern computers, high-speed internet and interactive displays.<br>The lab will host coding clubs, AI literacy sessions and digital citizenship workshops for both students and teachers. | សិស្សនៅសាលាជំនាន់ថ្មី ឥឡូវនេះមានបន្ទប់ពិសោធន៍ ICT ជាក់លាក់មួយ បំពាក់ដោយកុំព្យូទ័រទំនើប អ៊ីនធឺណិតល្បឿនលឿន និងអេក្រង់អន្តរកម្ម។<br>បន្ទប់ពិសោធន៍នេះនឹងរៀបចំក្លឹបសរសេរកូដ វគ្គអក្ខរកម្មបញ្ញាសិប្បនិម្មិត និងសិក្ខាសាលាពលរដ្ឋឌីជីថល សម្រាប់ទាំងសិស្ស និងគ្រូបង្រៀន។ |
| news:teacher-training-lslag | title | Teacher Training Workshop for Life Skills for Adolescent Girls | សិក្ខាសាលាបណ្តុះបណ្តាលគ្រូស្តីពីជំនាញជីវិតសម្រាប់ក្មេងស្រីវ័យជំទង់ |
| news:teacher-training-lslag | excerpt | Over 80 teachers from Pursat and Battambang gathered for a three-day training on life skills pedagogy. | គ្រូបង្រៀនជាង ៨០ នាក់មកពីខេត្តពោធិ៍សាត់ និងបាត់ដំបង បានប្រមូលផ្តុំគ្នាក្នុងវគ្គបណ្តុះបណ្តាលរយៈពេលបីថ្ងៃ ស្តីពីវិធីសាស្ត្របង្រៀនជំនាញជីវិត។ |
| news:teacher-training-lslag | body | Over 80 teachers from Pursat and Battambang gathered for a three-day training on life skills pedagogy under the LSLAG project.<br>Topics included sexual and reproductive health, financial literacy and gender equality in the classroom. | គ្រូបង្រៀនជាង ៨០ នាក់មកពីខេត្តពោធិ៍សាត់ និងបាត់ដំបង បានប្រមូលផ្តុំគ្នាក្នុងវគ្គបណ្តុះបណ្តាលរយៈពេលបីថ្ងៃ ស្តីពីវិធីសាស្ត្របង្រៀនជំនាញជីវិត ក្រោមគម្រោង LSLAG។<br>ប្រធានបទរួមមាន សុខភាពផ្លូវភេទ និងសុខភាពបន្តពូជ អក្ខរកម្មហិរញ្ញវត្ថុ និងសមភាពយេនឌ័រក្នុងថ្នាក់រៀន។ |
| story:yary-life-transformation | title | A life rewritten by the Happy Cambodian Children project | ជីវិតមួយដែលបានសរសេរឡើងវិញដោយគម្រោងកុមារកម្ពុជាសប្បាយរីករាយ |
| story:yary-life-transformation | excerpt | Yary, age 11 · Grade 6 · Rompok Primary School, Kratie | យ៉ារី អាយុ ១១ ឆ្នាំ · ថ្នាក់ទី ៦ · សាលាបឋមសិក្សារំពក់ ខេត្តក្រចេះ |
| story:yary-life-transformation | body | “We will always encounter both good and bad things in life, but as long as we have breath, we must use our precious time to overcome every obstacle — for the future of our family and our society.”<br>Yary is a bright 11-year-old girl in Grade 6 at Rompok Primary School in Snuol District, Kratie Province. Life at home was difficult — her family relied on daily-wage farm work, and Yary often thought about dropping out to help her mother.<br>Through the Happy Cambodian Children (HCC) project, Yary joined a child club, received school materials, hygiene items and monthly nutrition support. Volunteer mentors visited her home to encourage her parents to keep her in school.<br>Today Yary is one of the top students in her class. She dreams of becoming a nurse so she can care for children in her village — and she leads a small reading circle for younger pupils at Rompok School. | “យើងតែងតែជួបប្រទះទាំងរឿងល្អ និងរឿងអាក្រក់ក្នុងជីវិត ប៉ុន្តែដរាបណាយើងនៅមានដង្ហើម យើងត្រូវប្រើពេលវេលាដ៏មានតម្លៃរបស់យើង ដើម្បីយកឈ្នះរាល់ឧបសគ្គ សម្រាប់អនាគតគ្រួសារ និងសង្គមរបស់យើង។”<br>យ៉ារី ជាក្មេងស្រីវ័យ ១១ ឆ្នាំដ៏ឆ្លាតវៃ រៀននៅថ្នាក់ទី ៦ សាលាបឋមសិក្សារំពក់ ស្រុកស្នួល ខេត្តក្រចេះ។ ជីវភាពនៅផ្ទះមានការលំបាក ដោយគ្រួសាររបស់នាងពឹងផ្អែកលើការងារកសិកម្មឈ្នួលប្រចាំថ្ងៃ ហើយយ៉ារីតែងតែគិតចង់ឈប់រៀន ដើម្បីជួយម្តាយ។<br>តាមរយៈគម្រោងកុមារកម្ពុជាសប្បាយរីករាយ (HCC) យ៉ារីបានចូលរួមក្លឹបកុមារ ទទួលបានសម្ភារៈសិក្សា សម្ភារៈអនាម័យ និងជំនួយអាហារូបត្ថម្ភប្រចាំខែ។ អ្នកណែនាំស្ម័គ្រចិត្តបានចុះទៅផ្ទះរបស់នាង ដើម្បីលើកទឹកចិត្តមាតាបិតាឱ្យបន្តឱ្យនាងរៀន។<br>សព្វថ្ងៃនេះ យ៉ារីជាសិស្សពូកែម្នាក់ក្នុងថ្នាក់។ នាងសុបិនចង់ក្លាយជាគិលានុបដ្ឋាយិកា ដើម្បីថែទាំកុមារនៅភូមិរបស់នាង ហើយនាងក៏ដឹកនាំក្រុមអានសៀវភៅតូចមួយសម្រាប់សិស្សតូចៗនៅសាលារំពក់ផងដែរ។ |
| story:sum-bopha-digital-literacy | title | Bridging the urban–rural classroom with digital literacy | តភ្ជាប់ថ្នាក់រៀនទីក្រុង និងជនបទដោយអក្ខរកម្មឌីជីថល |
| story:sum-bopha-digital-literacy | excerpt | Ms. Sum Bopha · Physics Teacher · Arrany Rangsey LSS, Siem Reap | លោកស្រី ស៊ុម បុប្ផា · គ្រូរូបវិទ្យា · អនុវិទ្យាល័យអារញ្ញរង្សី ខេត្តសៀមរាប |
| story:sum-bopha-digital-literacy | body | “Technology and modern teaching aids are powerful tools, but the true heart of educational transformation lies in the lifelong learning will of both teachers and students.”<br>Sum Bopha is a 24-year-old Physics teacher at Arrany Rangsey Lower Secondary School in Siem Reap. With three years of experience, she has become a champion of digital pedagogy in her rural district.<br>Through KAPE's teacher-development programme she completed training on interactive whiteboards, simulation software and low-cost science experiments — then began sharing those tools with peers at neighbouring schools.<br>Her Grade 8 students now build their own simple circuits, run water-quality simulations and record short science videos. Enrolment in her physics elective has more than doubled in two years. | “បច្ចេកវិទ្យា និងឧបករណ៍បង្រៀនទំនើប គឺជាឧបករណ៍ដ៏មានឥទ្ធិពល ប៉ុន្តែបេះដូងពិតនៃការផ្លាស់ប្តូរវិស័យអប់រំ ស្ថិតនៅលើឆន្ទៈសិក្សាពេញមួយជីវិតរបស់ទាំងគ្រូ និងសិស្ស។”<br>ស៊ុម បុប្ផា ជាគ្រូរូបវិទ្យាវ័យ ២៤ ឆ្នាំ នៅអនុវិទ្យាល័យអារញ្ញរង្សី ខេត្តសៀមរាប។ ដោយមានបទពិសោធន៍បីឆ្នាំ លោកស្រីបានក្លាយជាអ្នកតស៊ូមតិសំខាន់សម្រាប់វិធីសាស្ត្របង្រៀនឌីជីថលនៅស្រុកជនបទរបស់លោកស្រី។<br>តាមរយៈកម្មវិធីអភិវឌ្ឍគ្រូបង្រៀនរបស់ ខេប លោកស្រីបានបញ្ចប់វគ្គបណ្តុះបណ្តាលស្តីពីក្តារខៀនអន្តរកម្ម កម្មវិធីក្លែងធ្វើ និងការពិសោធន៍វិទ្យាសាស្ត្រតម្លៃទាប រួចបានចាប់ផ្តើមចែករំលែកឧបករណ៍ទាំងនោះជាមួយមិត្តរួមវិជ្ជាជីវៈនៅសាលាជិតខាង។<br>សិស្សថ្នាក់ទី ៨ របស់លោកស្រី ឥឡូវនេះអាចតបណ្តាញអគ្គិសនីសាមញ្ញដោយខ្លួនឯង ធ្វើការក្លែងធ្វើគុណភាពទឹក និងថតវីដេអូវិទ្យាសាស្ត្រខ្លីៗ។ ចំនួនសិស្សចុះឈ្មោះរៀនមុខវិជ្ជារូបវិទ្យាជម្រើសរបស់លោកស្រី បានកើនឡើងជាងទ្វេដងក្នុងរយៈពេលពីរឆ្នាំ។ |
| story:chhim-phallak-reading-culture | title | Growing a reading culture, one child at a time | ការបណ្តុះវប្បធម៌អាន ម្តងមួយកុមារ |
| story:chhim-phallak-reading-culture | excerpt | Ms. Chhim Phallak · Librarian · Sophorn Kiri Primary School | លោកស្រី ឈឹម ផល្លក · បណ្ណារក្ស · សាលាបឋមសិក្សាសុភណ្ឌគិរី |
| story:chhim-phallak-reading-culture | body | “I do this work with heart and love — for a librarian is not merely a book guard, but a cultivator of reading culture who guides students toward the path of wisdom.”<br>Since 2016, Chhim Phallak has been the librarian at Sophorn Kiri Primary School. When she started, the library was a locked storeroom of dusty books; today it is the busiest room in the school.<br>With KAPE's Library Fellows programme, Phallak rebuilt the collection, ran read-aloud sessions for younger grades and introduced a home-borrowing scheme so children could share stories with their parents.<br>Reading fluency scores at Sophorn Kiri have risen for three consecutive years, and Phallak now mentors librarians at four neighbouring schools. | “ខ្ញុំធ្វើការងារនេះដោយបេះដូង និងក្តីស្រឡាញ់ ព្រោះបណ្ណារក្សមិនមែនគ្រាន់តែជាអ្នកយាមសៀវភៅនោះទេ ប៉ុន្តែជាអ្នកបណ្តុះវប្បធម៌អាន ដែលនាំសិស្សឆ្ពោះទៅរកផ្លូវនៃប្រាជ្ញា។”<br>ចាប់តាំងពីឆ្នាំ ២០១៦ មក ឈឹម ផល្លក បានធ្វើជាបណ្ណារក្សនៅសាលាបឋមសិក្សាសុភណ្ឌគិរី។ ពេលលោកស្រីចាប់ផ្តើម បណ្ណាល័យគ្រាន់តែជាបន្ទប់ស្តុកដែលចាក់សោ ពោរពេញដោយសៀវភៅប្រឡាក់ធូលី ប៉ុន្តែសព្វថ្ងៃនេះ វាជាបន្ទប់ដែលមមាញឹកជាងគេក្នុងសាលា។<br>ជាមួយកម្មវិធីមិត្តបណ្ណាល័យរបស់ ខេប លោកស្រី ផល្លក បានស្តារបណ្តុំសៀវភៅឡើងវិញ រៀបចំវគ្គអានឮៗសម្រាប់សិស្សថ្នាក់តូច និងបានដាក់ឱ្យដំណើរការគម្រោងខ្ចីសៀវភៅយកទៅផ្ទះ ដើម្បីឱ្យកុមារអាចចែករំលែករឿងជាមួយមាតាបិតា។<br>ពិន្ទុជំនាញអានស្ទាត់នៅសុភណ្ឌគិរីបានកើនឡើងបីឆ្នាំជាប់ៗគ្នា ហើយឥឡូវនេះ លោកស្រី ផល្លក កំពុងណែនាំបណ្ណារក្សនៅសាលាជិតខាងចំនួនបួនទៀត។ |

## 6. Search page chrome - no Khmer exists

The search page falls back to English for every one of these, so a Khmer visitor searching the site reads English labels around Khmer results.
The keys are not in `ui_strings` yet; a developer seeds them once the Khmer below is written.

| where | string (en) | km |
|---|---|---|
| `search.placeholder` | Search KAPE |  |
| `search.prompt` | Type a word above to search the site — try a project name, a place, or a title. |  |
| `search.none` | Nothing matched |  |
| `search.results` | results |  |
| `search.showingFirst` | showing the first |  |
| `search.kind.page` | Page |  |
| `search.kind.news` | News & Events |  |
| `search.kind.stories` | Impact Stories |  |
| `search.kind.videos` | Videos |  |
| `search.kind.galleries` | Photo Galleries |  |
| `search.kind.publications` | Publications |  |
| `search.kind.careers` | Careers |  |
| `search.kind.projects` | Projects |  |

## 7. Contact and donate - no Khmer exists

Both pages are reachable in Khmer (`/km/contact`, `/km/donate`) but their copy is written straight into the page rather than stored as translatable content, so a Khmer visitor gets an English page.
Nothing here can be fixed in `/admin`: it needs the strings lifted into `ui_strings` first.
Write the Khmer, and that work can follow.

`donate_eyebrow`, `donate_title` and `donate_intro` are a separate problem: they live in `site_settings`, which has one value per key and **no language column at all**, so whatever an editor types shows to English and Khmer visitors alike.

### 7a. Contact

| where | string (en) | km |
|---|---|---|
| contact / meta title | Contact KAPE |  |
| contact / meta description | Reach KAPE's head office in Kampong Cham and provincial teams across Cambodia. |  |
| contact / page title | Contact Us |  |
| contact / lead | Get in touch with KAPE's head office or any of our provincial teams. |  |
| contact / badge | Say hello |  |
| contact / form heading | Send us a message |  |
| contact / form note | We usually reply within a couple of working days. |  |
| contact / heading | Head office |  |
| contact / label | Address: |  |
| contact / label | Telephone: |  |
| contact / label | Email: |  |
| contact / heading | Provincial offices |  |
| contact / card label | Phone: |  |
| contact / card label | Email: |  |
| ContactForm / sent | Thank you — your message has been sent. We'll be in touch. |  |
| ContactForm / field | Full name |  |
| ContactForm / field | Email |  |
| ContactForm / field | Phone (optional) |  |
| ContactForm / field | Message |  |
| ContactForm / error | Something went wrong. Please try again. |  |

### 7b. Donate

| where | string (en) | km |
|---|---|---|
| donate hub / meta title | Donate to KAPE |  |
| donate hub / meta description | Support equitable, transformative education for children across Cambodia. Choose a campaign and give. |  |
| donate hub / `donate_eyebrow` | Support KAPE |  |
| donate hub / `donate_title` | Give to what moves you |  |
| donate hub / `donate_intro` | Choose a campaign below — scholarships, libraries, teacher training, and more. Every gift goes directly to KAPE's work across 15 provinces of Cambodia. |  |
| donate hub / stat | campaign / campaigns |  |
| donate hub / stat | raised |  |
| donate hub / stat | supporter / supporters |  |
| donate hub / empty | No active campaigns right now |  |
| donate hub / empty | Please check back soon, or |  |
| donate hub / empty link | learn more about our work |  |
| donate hub / heading | More campaigns |  |
| donate hub / heading | Campaigns |  |
| donate hub / badge | ★ Featured |  |
| donate hub / progress | of |  |
| donate hub / progress | raised |  |
| donate hub / no gifts yet | Be the first to give |  |
| donate hub / no gifts yet | goal |  |
| donate hub / cta | ♡ Donate to this campaign → |  |
| donate hub / card | donor / donors |  |
| donate hub / card cta | Give → |  |
| donate hub / card | New campaign |  |
| donate hub / card cta | Be the first → |  |
| campaign / meta title | <campaign title> — Donate |  |
| campaign / meta title fallback | Donate |  |
| campaign / meta description fallback | Support KAPE's work across Cambodia. |  |
| campaign / breadcrumb | Home |  |
| campaign / breadcrumb | Donate |  |
| campaign / badge | Stand with us |  |
| campaign / badge | Campaign closed |  |
| campaign / heading | Recent supporters |  |
| campaign / ended | This campaign has ended |  |
| campaign / ended | Thank you to everyone who gave. Explore other ways to support KAPE. |  |
| campaign / ended cta | See active campaigns |  |
| campaign / heading | Make your gift |  |
| progress / no gifts yet | Be the first to give |  |
| progress / no gifts yet | Help reach the <amount> goal. |  |
| progress / no gifts yet | Your gift gets this campaign moving. |  |
| progress / label | raised |  |
| progress / label | of <amount> goal |  |
| progress / label | supporter / supporters |  |
| progress / label | <n>% funded |  |
| supporters wall / empty | Be the first to support this campaign. |  |
| donate form / step 1 | Choose your impact |  |
| donate form / amount | One-time gift |  |
| donate form / amount | Other amount |  |
| donate form / amount | ✨ Funds <impact label> |  |
| donate form / step 2 | Your details |  |
| donate form / field | Your name |  |
| donate form / field | Your name (optional) |  |
| donate form / field | Email for your receipt |  |
| donate form / field | Leave a message of support (optional) |  |
| donate form / label | Show me on the supporters wall as… |  |
| donate form / option | My name |  |
| donate form / option | Custom |  |
| donate form / option | Anonymous |  |
| donate form / field | e.g. The Sok Family |  |
| donate form / trust line | Secured by Baray — KHQR, card, or mobile wallet |  |
| donate form / confirm | Confirm your gift |  |
| donate form / confirm | funds <impact label> |  |
| donate form / confirm row | Campaign |  |
| donate form / confirm row | Credited as |  |
| donate form / confirm row | Message |  |
| donate form / button | Back |  |
| donate form / button | Confirm & pay |  |
| donate form / button | Redirecting… |  |
| donate form / error | Something went wrong. Please try again. |  |
| donate form / error | Network error. Please check your connection and try again. |  |
| success / meta title | Thank you for your donation |  |
| success / section | Support KAPE |  |
| success / title | Thank you |  |
| success / badge | With gratitude |  |
| success / lead | Your generosity helps Cambodian children learn, dream, and rise. |  |
| success / heading | Your gift is confirmed |  |
| success / heading | We've received your donation |  |
| success / body | 🎉 Your donation has been confirmed. Thank you for standing with KAPE — your support reaches classrooms across 15 provinces. |  |
| success / body | Thank you! We're finalising the confirmation of your payment. If it was completed, it will be confirmed shortly — no further action is needed. |  |
| success / cta | Back to home |  |
| success / cta | See the impact |  |

## 8. Blocked - cannot be translated without a code change

Nothing to review here.
This is the list of what a reviewer will notice is still English and should not chase.

- **48 card strings across 4 pages.** The section builder only offers a Khmer tab for `text`, `textarea` and `richtext` fields; `cards` and `items` are neither. About (8), vision-mission (8), fact-sheet (12), ten-subsectors (20). Needs `SectionsBuilder.tsx` or `sections.ts`.
- **`people.position`** (job title) has no `position_km` column, and the repo reads the column directly.
- **`partners.name`** is one column with no translations entry.
- **`donors.name`** likewise.
- **`projects.target_areas`** (province names) is a JSON array on the row, outside the translations table.
