# Common to every job

Read this once, then your own contract. Your contract may add rules; it never relaxes these.

## Read in this order

1. `.work/redesign/DESIGN.md` — the spec. Tokens, scale, primitive APIs, the four states, copy rules.
2. `.work/redesign/PRIMITIVES.md` — what J01 froze. Every export, its props, a usage example. **Read this instead of reading J01's source.**
3. `docs/ui-audit.md` — your findings, cited by id in your contract.
4. Your own `.work/redesign/jobs/J<NN>-*.md`.

## The rule above all others

**No behaviour changes.** No routes removed, no props dropped, no handlers rewired, no API contracts changed, no data shapes altered.

You change markup, styling, layout, copy, states, transitions and component composition. Nothing else.

If a redesign needs a logic change to work, **stop and report it**. Do not decide. The lead decides.

Load-bearing and surviving verbatim: every accessible name, `aria-*`, `role`, `tabIndex`, `inert`, focus order, focus trap, focus return, keyboard handler, and every `sr-only` label. A prior round earned each of these one bug at a time. Breaking one to make a design work is the single worst outcome available to you.

## No new dependencies

`radix-ui`, `lucide-react`, `tailwind v4`, `@tanstack/react-table`, `@tiptap/*` and `@xyflow/react` are installed and cover everything in the spec. If you believe you need something else, stop and ask.

## File ownership is exclusive

Your contract lists the files you own. You open no others.

A job needing a file it does not own **stops and reports**. It never reaches across. Two panes editing one file is how the last round lost a day.

## Your instance

**Never open `kape.db`. Never touch port `:3020`, which is the client's live instance.**

Your port is in your contract. Substitute it for `<PORT>` and your job id for `<NN>`:

```bash
sqlite3 kape.db "VACUUM INTO '.work/redesign/j<NN>.db'"
DATABASE_PATH=.work/redesign/j<NN>.db bun -e '
import { hashPassword } from "#/server/auth";
import { Database } from "bun:sqlite";
const h = await hashPassword("redesign-dev-pw");
new Database(".work/redesign/j<NN>.db").run(
  "update users set password_hash = ? where email = ?", [h, "admin@kapekh.org"]);'
PORT=<PORT> DATABASE_PATH=.work/redesign/j<NN>.db AUTH_SECRET=redesign-audit-secret-key-0001 \
  bun --bun vite dev --port <PORT>
```

**`PORT=` is not optional and is not the same thing as `--port`.** `getUrl()` in
`root-provider.tsx` reads `process.env.PORT` and falls back to 3000, so `--port` on its own points
every server render at a dead port and the whole site 500s with "Unable to connect". Read the
`Local:` line out of the log before trusting any probe: vite silently moves off a taken port.

Sign in as `admin@kapekh.org` / `redesign-dev-pw`.

Checksum `kape.db` at the start and the end and paste both. It is `e9789f59cb05f9f3426b9aba88001f9a` and it stays that way.

## Gates, every job

Run all four and paste the real output. No summarising.

| # | Command | Bar |
|---|---|---|
| 1 | `bun run test` | 399 passed / 43 files or better |
| 2 | `bunx tsc --noEmit` | silent |
| 3 | `bun run lint` | 8 errors or fewer |
| 4 | `bun run build` | green |

The runner is vitest. **`bun run test`, never `bun test`** — the latter skips jsdom and reports false failures.

Lint gates on **delta**: 8 pre-existing `noArrayIndexKey` errors. You may not add a ninth. Removing one is welcome; say so.

## Behaviour proof

Gates passing is not enough. For every screen you touch, exercise in a browser what it did before and show it still does it. At minimum, per screen:

- It loads, and its data renders.
- Its primary action still works end to end. A save saves; a delete deletes; a filter filters.
- Tab through it. Focus order unchanged, every control reachable, nothing new trapped.
- 1440x900 and 390x844.

Screenshots to `.work/redesign/shots/j<NN>-*.png`.

## Known traps

- `src/routes/admin.ui-strings.tsx` **contains non-UTF8 bytes**. Plain `grep` skips it and reports nothing, silently. Use `grep -a` for any repo-wide search.
- The deployed `dist/` predates HEAD. Verify against your own dev server, never a build output.
- Toasts live 4.5s. A tool call issued after a click arrives later than that. Click and poll inside one evaluation or you will read a working save as a silent failure.
- Driving ProseMirror through raw DOM calls does not work. Use real key presses.
- If another pane's HMR disturbs your session, say so in your report rather than working around it silently.
- **A `flex-wrap` row where one child wraps to two lines and its sibling does not.** `items-center` then centres the short child against the tall one and everything on that row looks a few pixels off. J03 shipped it on ten lists. Before you call a toolbar done, print the centre line of every child of each `flex items-center` row and check they match:

  ```js
  [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e);
    return s.display === 'flex' && s.flexDirection === 'row' && s.alignItems === 'center'; })
    .map(r => [...r.children].map(k => { const b = k.getBoundingClientRect(); return (b.top + b.bottom) / 2; }))
    .filter(m => m.length > 1 && Math.max(...m) - Math.min(...m) > 2)
  ```

  An empty result is the pass. Run it at 1440 and at 390.

## Reporting

Write `.work/redesign/J<NN>-report.md`:

- What you did, per numbered item in Do.
- Every Acceptance item with its real pasted output.
- What you could not do, and why. This is the most valuable section.
- What you found and deliberately left alone, so the lead can pick it up.

Then **one commit**, message naming the surface redesigned and why. No agent as co-author. Never touch `CHANGELOG.md`.

Your "done" is a claim. The lead re-runs your checks in its own pane before believing it. A claim with no pasted evidence is sent back.

## Stop conditions, every job

Halt and report rather than pushing through:

- A change would alter behaviour.
- You need a file you do not own.
- A primitive from J01 does not fit and you are tempted to hand-roll around it. Report the gap; do not fork the design system.
- You would have to remove or weaken an accessible name, `aria-*`, `role` or focus behaviour.
- A test that currently passes would need editing to accommodate your change.
- You want a new dependency.
