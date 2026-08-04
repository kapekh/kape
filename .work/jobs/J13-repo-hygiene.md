# J13 — Repo hygiene, from J02's findings

Three problems J02 hit while doing something else. None was caused by the delta work, all three
cost a worker real time, and one of them can silently corrupt a demonstration.

**Item 1 needs a decision from the user before starting** — it adds or removes a dependency.

## 1. `bun run db:migrate` has never worked — RESOLVED `0784475`

`@libsql/client` added as a dev dependency. `db:migrate`, `db:studio` and `db:push` were all
verified working against a `VACUUM INTO` copy. Chosen over `better-sqlite3` because it ships
prebuilt platform binaries and installs under Bun without a node-gyp compile. The app never loads
it — it still migrates on boot through `drizzle-orm/bun-sqlite`.

The rest of this section is kept as the record of what was wrong.



`drizzle-kit migrate` needs `better-sqlite3` or `@libsql/client` to open a SQLite database and
neither is a dependency. It fails before touching any database, identically on `main`. The app
does not need either package: `src/server/db.ts` migrates on boot with `drizzle-orm/bun-sqlite`'s
migrator over `bun:sqlite`.

So the script is dead, and any contract gating on it gates on a command that cannot run. J02's own
acceptance criterion did exactly that. J02, J09 and J10 have since been reworded.

Check `db:push` and `db:studio` too — they go through the same driver and are probably dead as well.

Two ways out, **user's call**:

- Add `better-sqlite3` as a dev dependency, making the documented scripts work as written.
- Delete the dead scripts and document the boot-time migrator as the real mechanism.

The second adds nothing to the tree. The first matches what the README implies today.

## 2. SSR self-fetches tRPC on a hardcoded port

`src/integrations/tanstack-query/root-provider.tsx` builds the server-side tRPC URL as
`http://localhost:${process.env.PORT ?? 3000}`.

Running `vite dev --port 3111` without also exporting `PORT=3111` gives a whole-page HTTP 500,
`Unable to connect`, on every route. That is bad on its own. The real hazard is the other
direction: on the default port it **silently succeeds against whatever dev server holds 3000**,
which in a paned setup means one agent's SSR resolving routes against another agent's database.
A demonstration can look perfect and be measuring the wrong process.

Derive the port from the server actually listening, or fail loudly when `PORT` and the listen port
disagree. Do not leave it as a silent fallback.

## 3. `kape.db` is WAL-mode, so `cp` is not a safe copy

A bare `cp kape.db` produces a copy missing everything still in the 4MB `-wal` file, and the
symptom is `FOREIGN KEY constraint failed` against rows that appear to exist. J02 lost time to
exactly this before switching to `VACUUM INTO`.

**Corollary, and it invalidates a check we have already relied on:** `md5sum kape.db` proves
nothing. J03 inserted a page, mutated three rows, and left the main file byte-identical — every
write was still in the WAL. J02 cited an unchanged md5 as evidence the dev database was never
migrated; that particular line carried no weight, though its `PRAGMA table_info(projects)` check
did, because a live connection reads through the WAL. Any future job proving it did not touch a
database must query it, not hash it.

Not a code change — document it where someone will read it before copying the database. The
contracts for J09 and J10 now say it; `README.md` or `docs/` is the durable home.

## Acceptance

**Also gates on `bunx tsc --noEmit` reporting 0 errors** and `bun run test` passing 3 of 3.

1. Item 1 resolved the way the user chose, and `README.md`'s script list matches what actually
   runs. No script in `package.json` fails with a missing-driver error.
2. `vite dev --port <non-default>` serves real pages without exporting `PORT` by hand, or fails
   with a message naming the mismatch. Demonstrate on a non-default port.
3. The WAL copy hazard is documented somewhere a newcomer meets before copying the database.
4. No dependency added without it being the option the user picked.

## Out of scope

The `/projects` landing page — that is a content row, tracked separately in the backlog.
