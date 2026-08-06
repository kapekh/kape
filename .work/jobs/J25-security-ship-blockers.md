# J25 - Five ways in, before this ships

Nobody has audited the doors. Every previous job graded what a visitor or an editor can see; this one
grades what an attacker can reach. Five defects, all read off the source by a survey job and **none of
them yet reproduced**. Reproducing them is the first half of your work - a security claim you have not
demonstrated is a guess, and a guess in a security report is worse than silence because it gets
believed.

Four of the five are ship-blockers for KAPE itself, not just for the reusable core.

## The five

**A. Password guessing is unlimited.**

`rateLimit` (`src/server/ratelimit.ts`) is called at exactly two sites - `api.forms.$.tsx:78` and
`api.pay.$.tsx:38`. `/api/auth/login` (`src/routes/api.auth.$.tsx:21-42`) is not one of them, so a
script can try passwords as fast as the server answers. `authenticate()` (`src/server/auth.ts:54-71`)
is otherwise careful: it does a dummy hash for unknown emails so timing does not leak which addresses
exist. That care is wasted while the attempt count is unbounded.

Note before you design: the limiter is a per-process `Map` (`ratelimit.ts:8`), its own comment admits
single-instance only, and the client IP comes from `cf-connecting-ip` → `x-forwarded-for[0]` →
`x-real-ip` → `"unknown"` (`:11-19`). Behind no trusted proxy that header is caller-controlled, so an
IP-only limit is bypassed by spoofing one header, and every direct connection shares the `"unknown"`
bucket. A limit keyed on the submitted email as well as the IP is not optional here.

**B. The runtime image ships the source tree, `.env` and the database.**

`Dockerfile:25` does `COPY . .` in the **runtime** stage, after the build stage already produced
`dist/`. `.dockerignore` is 284 bytes and has not been audited against this. If a developer has ever
run the app locally, `kape.db` and `.env` are sitting next to the Dockerfile, and `AUTH_SECRET` is in
`.env`. Anyone who can pull the image has the signing key for every session.

`RUN rm -f build.db` at `:26` removes the throwaway build database and nothing else.

Find out what is actually in there before you change anything: `docker history --no-trunc`, and a
shell in the image listing what landed. Report the real inventory, not the inferred one.

**C. The payment webhook proves nothing about who called it.**

`POST /api/pay/webhook` (`src/routes/api.pay.$.tsx:133-164`) is unauthenticated. Its only check is
that the caller produced an `encrypted_order_id` that decrypts under `BARAY_SK`/`BARAY_IV` (`:150`),
after which it marks a donation paid. There is no signature verification.

Whether that is exploitable depends on Baray's scheme, which is not in this repo. **Read
`src/server/baray.ts` first** and establish what the gateway actually offers - a signature header, an
HMAC over the body, a callback nonce, nothing at all. If the gateway provides no signature, say so
plainly and implement the strongest check the protocol does allow (server-side confirmation of the
order against the gateway before marking it paid is usually it). Do not invent a signature scheme the
gateway does not send, and do not claim a fix you cannot verify against the real API.

The endpoint is also not rate limited, while `/api/pay/donate` next to it is.

**D. `/admin` is guarded on the client only.**

`src/routes/admin.tsx:189-212` fetches `auth.me` in an effect and redirects in the browser. There is
no `beforeLoad` and no server guard, so the shell HTML is served to anyone who asks. The tRPC data
behind it *is* protected by `adminProcedure`, so this is disclosure of structure and of the admin's
existence, not of content - grade it honestly at that level rather than inflating it. It also causes
the 12-second "Checking access…" paint that J23 measured, so the fix is a usability win as much as a
security one.

**E. The `media` permission area cannot upload.**

`src/routes/api.media.$.tsx:13-17` gates on `auth.user.role !== "admin"` - a literal role string,
bypassing the permission system entirely. A custom role holding `media`
(`src/lib/permissions.ts:34`) can list and delete media over tRPC but is refused by the upload
endpoint. The seeded `editor` role has exactly this shape, so this is a live functional bug as well
as an authorisation inconsistency: the role we ship cannot do the job it names.

While you are in that file: the allow-list at `:35-51` is **extension-only**, and J23 demonstrated a
`.sh` renamed to `.png` being accepted and stored. `file.type` is taken from the client and never
checked against the bytes. Sniff the magic bytes. This one J23 proved; you do not need to re-prove
it, but you do need to show your fix refusing the same file.

## Files you own

- `src/routes/api.auth.$.tsx`
- `src/server/ratelimit.ts`
- `src/routes/api.pay.$.tsx`
- `src/routes/api.media.$.tsx`
- `src/routes/admin.tsx`
- `Dockerfile`, `.dockerignore`
- one new test file under `src/server/`
- `.work/j25-report.md`, `.work/j25-shots/`

Read-only, however tempting: `src/server/auth.ts` and `src/lib/permissions.ts`. If the honest repair
needs a change inside either, stop and report which line and why - they are load-bearing for every
other surface and a change there wants its own review.

**J24 is live and owns `src/server/repo/admin.ts` and 21 `admin.*.tsx` route files.** It does not own
`admin.tsx` itself, which is yours. Do not touch its files, even to fix something obvious.

## Getting in

`admin@kapekh.org` / `kape-admin-2026`, from `src/server/seed/users.ts:20-21` - committed dev
defaults for this local seed, on a localhost dev server, at the repo owner's request. Sign in at
`http://localhost:3000/login`.

**Run your dev server on port 3222, against a scratch database.** J24 is on 3000 and another session
has held 3111; two panes on one port is a confusing half-hour. `export DATABASE_PATH=/tmp/j25.db`
after copying the repo one with `VACUUM INTO` - never `cp`, it is WAL-mode and a bare copy silently
drops the `-wal`. `src/server/db.ts:33` migrates on import and vite restarts SSR on any file change,
so a server pointed at `kape.db` will migrate it out from under the other panes.

`/admin` takes up to 12 s to paint today. Wait on `main`, never on a fixed delay.

## Do

1. **Demonstrate each of A through E before fixing it.** For A, a loop of wrong passwords and the
   count you reached. For B, the real image inventory. For C, whatever the protocol lets you show -
   if you cannot forge a call, say exactly what stopped you. For D, an unauthenticated `curl` of
   `/admin` and what came back. For E, a login as a `media`-only role and the refusal.
2. **Create a role for E rather than editing one.** Make a `J25-media` role holding only `media`,
   and a user on it. Delete both afterwards.
3. **Fix each, smallest repair that holds.** A limiter keyed on IP *and* email; a runtime stage that
   copies only what it runs; the strongest webhook check the gateway actually supports; a server-side
   redirect for the admin shell; the permission area in place of the role string; magic-byte sniffing
   on upload.
4. **Leave one runnable check.** The smallest thing that fails if the logic breaks - the limiter's
   window arithmetic and the sniffer's accept/reject table are both pure functions and both testable
   without a database, which matters because vitest runs under Node and cannot import `bun:sqlite`.
5. **Say what you did not fix.** If the webhook has no honest fix without gateway documentation, that
   is a finding and a good one. Write it as a finding.

## Acceptance

1. `.work/j25-report.md`, one section per defect, each carrying: what you did to reproduce it, what
   happened, what you changed, and what happens now. Before and after.
2. A: a login loop that gets throttled, with the attempt count at which it turned over, and evidence
   that a second email from the same IP is still able to log in - a limiter that locks the whole
   office out of the admin because one person fat-fingered a password is not a fix.
3. B: `docker history --no-trunc` on the rebuilt image, plus a directory listing from inside it,
   showing no `src/`, no `.env`, no `*.db`. The image must still start and serve.
4. C: either a rejected forged call, or a written finding naming exactly what the gateway does not
   give us and what you implemented instead.
5. D: `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}'` against `/admin` with no cookie,
   before and after.
6. E: the `J25-media` user uploading a file successfully, and the same endpoint refusing a `.sh`
   renamed `.png`. Screenshots of both.
7. `bun run test` - everything that passed before still passes, plus yours. The count moves with the
   other panes; the number to beat is whatever `main` gives on the day.
8. `bunx tsc --noEmit` - no output.
9. `bun run format` - "No fixes applied".
10. Confirm the `J25-media` role and user are deleted, and name any test upload you left behind.

## Out of scope

- Password reset, email verification, 2FA, SSO. All absent, all real, all a later job.
- API tokens and machine auth. Absent; Stage C owns it.
- CSRF. `SameSite=Lax` is the only protection and tRPC mutations are POSTs. Report it, do not fix it
  here - it needs a decision about token placement across every form in the admin.
- Making the limiter survive more than one process. It is a `Map` and will stay one until the
  datastore question is settled. Note the constraint in your report.
- The `render_cache` full wipe on every mutation, `busy_timeout`, transactions. Operations work,
  Stage B.
- Lint. Red repo-wide, J12's problem.

## Stop conditions

- **Never run `bun run db:seed`, `db:push` or `db:migrate`.** The migration lane is shared and
  `db.ts` migrates on boot. If a fix appears to need a schema change, stop and report.
- Never point a dev server at the repo's `kape.db`.
- Never delete a seeded record. Yours are the `J25-` ones.
- Do not commit, do not touch git, do not edit the worklog. Verification happens in the parent pane;
  your "done" is a claim.
- Do not weaken a check to make a test pass.
- If a login gate refuses you, stop and report it. Do not work around it, and do not fabricate a
  round-trip from repo-layer calls.
