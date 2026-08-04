# J20 — UX flow audit of the client's live site

Read-only audit. **Produces a document, not code.** Its output becomes the next round of jobs.

## Why this is a different audit

`.work/AUDIT.md` compared *capabilities* from source: can our catalogue express what their code
expresses. It never opened a browser, so it says nothing about **behaviour** — what happens on
hover, how long a slide holds, what a menu does on touch, what an empty state looks like, how many
clicks it takes to reach a project from the home page.

That behaviour is the part the client actually reacts to, and none of it is in the code diff.

## Files you own

- `.work/UX-AUDIT.md` (new)
- `.work/ux-shots/` (new, screenshots)

You write **no application code**. Not one line.

## Setup

- Their live site: `https://kapecambodia.lovable.app`
- Ours: start a dev server yourself on port **3011**, and you must export **both**
  `PORT=3011` and `DATABASE_PATH=<a VACUUM INTO scratch copy of kape.db>`. Exporting only one of
  them either 500s every page or silently migrates the real database. Both facts are in
  `.work/BACKLOG.md` and were learned the expensive way.
- Use the `agent-browser` CLI, with `--session ux` so you do not collide with another pane's
  browser. Close the session when done.

## Do

Walk the site as a visitor would, theirs and ours side by side, and record what differs in
*behaviour*. Start at the home page and follow the real paths outward.

1. **Home page, top to bottom.** Announcement popup: when does it appear, on what trigger, how is
   it dismissed, what happens on reload. Hero slideshow: advance interval, pause on hover, progress
   affordance, what a keyboard user gets. Stat counters: when do they animate, and what does a
   `prefers-reduced-motion` user see. Every section in order, with its scroll behaviour.
2. **Navigation.** Mega menu open/close on hover and on click, keyboard traversal, what happens at
   touch widths, how deep the tree goes, whether the current page is indicated.
3. **Home to each top-level destination**, then one level deeper. Count the clicks. Record where a
   path dead-ends or loops back on itself.
4. **The photo and document journeys.** Gallery to album to full-screen and back. Document list to
   viewer or download. These are the two flows this NGO's audience actually uses.
5. **Forms.** Contact, and any registration or apply flow. Record validation timing, error copy,
   what success looks like, and whether the user is told what happens next.
6. **Two viewports**, desktop and 375px. Record anything that overflows, hides content, or becomes
   unreachable by touch.
7. **Language switch.** What changes, what does not, and whether the switch preserves your place.

For each finding: id, one line, **their behaviour**, **ours**, the flow it sits in, severity, and
whether our CMS can already express it or needs new capability. That last column decides whether it
becomes a job or a content change.

## Acceptance

1. `.work/UX-AUDIT.md` exists with 20-40 findings, each citing a URL on both sides and a screenshot
   path. A finding without a screenshot or a URL is a hunch, not a finding.
2. Every top-level nav destination visited on both sites. List them with the click count to reach
   each from home.
3. Both viewports covered. State which findings are viewport-specific.
4. An explicit "ALREADY MATCHES" section. Half an audit's value is stopping work that is already
   done, and our build is ahead of theirs in several places — say where.
5. Each finding marked `expressible-now` or `needs-capability`. Total each.
6. State plainly anything you could not test and why — auth-gated flows, missing seed data, a form
   you must not actually submit.
7. `kape.db` untouched. Prove it by querying, not hashing.

## Out of scope

Writing application code, seed data, or contracts. Fixing anything you find. Judging visual taste
where the two are merely different — this is about flow and behaviour, not preference.

## Stop conditions

- Their site is down or rate-limits you: stop and report how far you got.
- A flow needs a login you do not have: record it as untested, do not attempt credentials.
- **Never submit a real form on the client's live site.** It may email a real person at KAPE. Fill
  it, screenshot the validation, and stop before submit.
