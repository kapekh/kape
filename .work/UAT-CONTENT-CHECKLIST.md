# What the KAPE team needs to fill in

Two UAT passes walked the whole site and split what they found into two piles. One pile is ours -
code that does not work, and we are fixing it. This is the other pile: places where the software
works but nothing has been typed into it yet.

None of this needs a developer. Every item below is a screen in the admin.

Ordered by what a visitor notices first.

## 1. The Khmer site is in English

The largest job here by a wide margin, and the one that decides whether KAPE can launch bilingual.

Every page section can carry a Khmer version of its text - the heading, the lead paragraph, the
button labels. The editor for it is already in the page builder, and it works: we changed one
heading to Khmer, confirmed `/km` showed it and `/en` did not, and changed it back.

Nobody has typed the Khmer. **Zero of the 59 published sections have a Khmer version**, so `/km`
serves the Khmer navigation over English body copy. On the Khmer home page, 52 of 100 lines of text
contain no Khmer character.

Page titles are in the same state: 39 exist in English, 8 in Khmer.

Worst pages first, by how much English a Khmer visitor meets:

| Page | English lines |
|---|---|
| Home | 52 of 100 |
| Contact | 30 of 36 |
| Media, and its 10 children | 22 of 24 |
| Opportunities > Volunteer | 13 of 18 |
| Opportunities | 12 of 14 |
| Media > Policies | 10 of 16 |
| Our Team | 7 of 15 |
| Who We Are | 7 of 14 |
| What We Do | 6 of 8 |
| Donate | 8 of 9 |

`/km/who-we-are/about` is already fully Khmer. It is the proof that the mechanism works, and it is
worth opening beside a page you are translating to see what "done" looks like.

## 2. Three things on the site lead nowhere

**Donate has no campaigns.** The ♡ Donate button is in the header of all 39 pages and it lands on
"No active campaigns right now". Until one published campaign exists, the site's most prominent
call to action is a dead end, and neither we nor you can test the donation flow at all.

**26 documents cannot be opened.** On Policies, Other Publications, E-Newsletter, ESCUP Sources, AI
and Digital Education and Life Skills, each document shows a red PDF icon and a file name, and
clicking does nothing - the records were saved without a file. The Child Safeguarding Policy is one
of them.

**4 annual reports and publications point at files that are gone.** They link to PDFs on
`kapekh.org` that now return "not found". The files need uploading into the CMS media library so
they live with the site.

## 3. Records that were saved half-finished

**Three of the four leadership entries have a job title where the name goes** - the team page reads
"Executive Director / Executive Director". Three real named staff exist in the system but are set to
private.

**The three videos all link to the KAPE YouTube channel front page** rather than to each video, so
whichever video a visitor clicks, they arrive at the same place and have to find it themselves.

**Siem Reap and Kratie offices share one placeholder phone number and one email** (`011 222 222`),
and neither has a street address.

**Both internal documents in the staff portal say "no file".**

**The organisational chart is empty**, though the menu promises "Leadership Team & Organizational
Chart".

## 4. Four settings that hide working features

- **Search has no link anywhere on the site.** The search page works well - we tested it in both
  languages - but `header_search_link` points at `/sitemap.xml`, which the header refuses to link
  because it is a machine file rather than a page. Set it to `/search`.
- **The sitemap link is suppressed the same way**, and there is no human-readable sitemap page
  published.
- **The Donate button label has no Khmer version**, so it reads "♡ Donate" on Khmer pages.
- **Dark mode is switched off**, so the theme toggle renders nothing. Deliberate or not, worth a
  decision before launch.

## 5. Two navigation gaps to decide about

**The What We Do menu offers 20 destinations; the What We Do page shows 2.** Same on Who We Are: the
menu has 7, the page lists 5. Either the landing pages should cover what the menus cover, or the
menus should be trimmed.

**Old project links break.** `kapekh.org/current-projects` and `/past-projects` are paths the
current live site uses, and both now land on "Page not found". Anyone with a bookmark or an inbound
link hits it. This one may end up being ours - we are checking whether a projects landing page
should exist.

## 6. Four sign-up forms need building

The Volunteer, Alumni, Scholarship and E-Newsletter pages each show a sign-up form that currently
throws submissions away. **We are fixing the code so that can never happen silently again**, but
each of those four pages still needs a real form built in the forms editor and attached to it.
Until then those pages cannot accept an application.

## 7. Sign-in details before the first session

The site has two accounts: `admin@kapekh.org`, which reaches everything, and `staff@kapekh.org`,
which reaches the staff portal but not the admin.

**Nobody currently knows the staff password.** The admin one is known and works; the staff account's
was set at seeding time and is not written down anywhere we can find. It needs resetting from
`/admin/users` before anyone tries to test the portal, otherwise the whole `/internalsources`
section is untestable.

---

Nothing above is lost work or a bug in what you have already entered. It is the gap between a site
that is structurally finished and one that is ready for a visitor - and most of it is typing that
only KAPE can do, because it is your content and your language.
