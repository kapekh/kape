# J08 - prerender invalidation

Closes D7.
Depends on J03 verified.
Runs beside J06 without contention: one script, no shared file.

The database cache is busted automatically by `adminProcedure` (`src/integrations/trpc/init.ts:43`).
`dist/static/<path>/index.html` is not.
An inline save therefore lands in the database and the visitor on a statically served page keeps reading the old sentence until someone rebuilds the whole site.
This round's own handover is stuck on exactly that: the deployed `dist/` predates HEAD and 138 pages serve pre-fix HTML.

## Files you own

- `scripts/prerender-static.ts`
- one new test
- `scripts/gen-prerender-paths.ts` only if the stale set cannot be derived without it, and say so in the report

Nothing else.
The trpc router and `src/server/repo/admin.ts` are J03's and are landed; read them, do not edit them.

## Do

1. Give the script a stale mode: work out which prerendered paths are older than the content they render, and regenerate only those.
   The incremental path list at `:20-24` already exists, so this is the selection, not the writing.
2. Derive staleness from what is on disk against what is in the database.
   The mtime of `dist/static/<path>/index.html` against the entity's `updated_at`, and against the newest `ui_strings` write for a path whose chrome changed.
   A path with no file yet is stale.
3. Say what it did. The script prints a count today; it must print which paths it regenerated and which it skipped, because this is the command an operator runs after an edit.
4. Leave the full rebuild exactly as it is. No argument, no behaviour change: this is a second mode beside it.

## Acceptance

Each item is a demonstration.
Run it, paste the output into `.work/inline/J08-report.md`.

1. **A save makes exactly one path stale.** Build, prerender everything, edit one page's title through `updateField`, run stale mode, paste the output: one path regenerated, the rest skipped.
2. **The regenerated file carries the new text.** `grep` the new title out of `dist/static/<path>/index.html`.
3. **A UI string save makes the paths that show it stale.** Same shape of proof, with the count.
4. **Nothing stale means nothing written.** Run it twice; the second run writes zero files. Paste both runs and the file mtimes.
5. **A missing file counts as stale.** Delete one, run, show it comes back.
6. **The full rebuild is unchanged.** Run the no-argument form, paste its output beside the same command's output at `HEAD`.
7. **Gates.** `bun run test` at 449 or better, `tsc` silent, `bun run lint` at 6 or fewer, `bun run build` green.

## Out of scope

- Deploying anything, or touching the real `dist/` on the server.
- A watcher, a queue, or anything that runs on its own. This is a command an operator or a deploy step runs.
- Changing how the database cache is busted.
- Redesign work.

## Stop conditions

- **Never touch `:3020`,** and never write to a `dist/` outside your own worktree.
- If staleness cannot be derived without a server-side hook that writes a dirty list, stop and report. That is a design change and the lead decides it, not this job.
- If prerendering in your worktree needs the client's real database, stop: use your own copy and say what the copy could not show.
