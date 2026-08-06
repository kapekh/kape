# J25 - Five ways in, before this ships

Authorised defensive review on the owner's own pre-launch app, on a localhost dev server (port 3222) against a scratch database (`VACUUM INTO /tmp/j25.db`, `DATABASE_PATH` overridden).
Every defect was reproduced before it was touched.
`src/server/auth.ts` and `src/lib/permissions.ts` were left unchanged.
No J24 files (`src/server/repo/admin.ts`, the `admin.*.tsx` editors) were touched.

Gate numbers at hand-off (after round 3):
`bunx tsc --noEmit` clean, no output.
`bun run test` 58 passed across 13 files (baseline on entry was 37 across 9; this job adds `security-guards.test.ts` and `login-throttle.test.ts`, 14 tests between them; the rest moved with other panes).
`bun run format` "No fixes applied".

Screenshots and transcripts live in `.work/j25-shots/`.

---

## Round 3 - the proxy path, the silent collapse, and where the guarantee is tested

Three findings from the critic, all confirmed and closed.
Evidence: `A3-before-xff-chain.txt`, `A3-after-xff-chain.txt`, `A3-proxy-warning.txt`.

### 1. The proxy path took the wrong end of the chain

**Reproduced.**
With `TRUSTED_PROXY_HEADER=x-forwarded-for` and an appending proxy - which produces `<what the caller sent>, <real client>` - `clientIp()` took `split(",")[0]`, the leftmost, which is the caller's own value.
Both round-1 vulnerabilities came straight back: rotating the leftmost element gave **40/40 non-429**, and burning a victim's claimed value then presenting it as the victim returned **429 on the correct password**.

**Fixed.**
`clientIp()` now takes the **rightmost** entry: the one the nearest trusted proxy appended, and the only one a caller cannot control.
A single-value overwriting header such as `cf-connecting-ip` is unaffected, being both leftmost and rightmost.
I did not add a trust-depth setting - rightmost is correct for the one-proxy case that the README documents, and a hop count is another number an operator can get wrong for no gain here.

**After**, same appending-proxy setup:
- rotating the leftmost element: **20/40 non-429, first 429 at attempt 21** (was 40/40, never throttled);
- the victim presenting a burned claimed value, correct password: **200** (was 429);
- the attacker's own real client address **is** throttled (429) even when they change their claimed leftmost value, so the bucket follows the real client.
- Default mode (variable unset) re-checked and unregressed: rotating both headers still gives 20/40 with first 429 at attempt 21, and a different real peer still gets 200.

Each run reports its connection-error count, which is 0. My first attempt at this re-verification recorded a bogus 40/40 "pass" because a `pkill` pattern matched its own shell, the server never started, and every failed connection counted as non-429. I caught it and added the error guard.

**README corrected**, because the old wording walked operators into the hole.
It named `x-forwarded-for` for "nginx, Caddy or Traefik" while only stating an "overwrites, not appends" condition - and Caddy, Traefik and the common `$proxy_add_x_forwarded_for` nginx recipe all append.
The docs now explain the rightmost rule and why, and the remaining condition is stated as the one that actually matters: the app must not be reachable around the proxy.
`.env.example` carries the same correction.

### 2. A proxy in front with the variable unset collapsed everyone into one bucket

Behaviour unchanged - it fails closed, which is the right direction - but it is no longer silent.
When the socket peer is loopback or a private range (RFC1918/RFC4193) and `TRUSTED_PROXY_HEADER` is unset, the app logs one warning naming the observed address and the fix.
Gated to `NODE_ENV=production`: in dev every request is loopback, so the signal is meaningless there and would just train people to ignore warnings.

**Verified on the real production artifact**, not a simulation: built the image and ran it, where Docker's own port NAT makes the app see `172.17.0.1` - the same signal a reverse proxy gives.
Five login requests produced exactly **one** `[ratelimit]` line:

> Requests are arriving from a local/private address (::ffff:172.17.0.1) and TRUSTED_PROXY_HEADER is unset. If a reverse proxy or CDN sits in front, every visitor now shares ONE rate-limit bucket … Fix: set TRUSTED_PROXY_HEADER to the header your proxy sets …

Control: the same image with `TRUSTED_PROXY_HEADER` declared logs **0** such lines, and both containers serve normally.
The message ends by saying container NAT can also look like this and needs no action, so the false positive it will produce on a plain `docker compose up` does not send anyone chasing a non-problem.

### 3. The "never refuses" guarantee now lives where it can break

The critic was right that the old test asserted against `backoffDelayMs`, not the route, so swapping the backoff for `rateLimit(...)` + 429 in the handler would have left it green.

`src/server/login-throttle.test.ts` (new) imports and calls the **real login handler** from `src/routes/api.auth.$.tsx`, with only the database and auth modules mocked; the limiter itself is real.
It asserts a user still gets 200 after 17 failures against their account, and repeats that across several accounts.
A second test drives the address limit until it sees a 429, so the first test cannot pass vacuously - the handler demonstrably can return 429, therefore the 200 it returns for a flooded account is a real result.

**I checked the test actually fails on the regression it exists to catch.**
I temporarily inserted the exact swap the critic described (a `rateLimit` + 429 on the account key) and ran the suite: **2 tests failed** (`expected 429 to be 401`, `expected 429 to be 200`) while every `backoffDelayMs` assertion stayed green - the precise blind spot, now covered.
The regression was reverted immediately; the handler is back to delay-only.

`handler` is now exported from the route so the test can reach it. That is the only production change item 3 required.

**Recorded, not fixed** (per the coordinator): limiter state is per-process and resets on restart, out of scope by contract; and `sweep()` only deleting expired entries past 10,000 entries is inherited and low severity.

---

## Round 2 - the login throttle did not throttle

An independent critic showed my first fix for A was not a fix, and that it introduced a new defect.
Both came from one root cause, and both are now closed.
Evidence: `A2-before-bypass.txt`, `A2-after-bypass.txt`, `E2-media-400.txt`.

**What was wrong.**
`clientIp()` took the client address from `cf-connecting-ip` / `x-forwarded-for` / `x-real-ip` with no trusted-proxy check.
Those headers are set by the caller.
Keying a limiter on one is keying it on a value the attacker chooses.

I reproduced both attacks before touching anything:
- Rotating `cf-connecting-ip` per request, 60 wrong passwords against `admin@kapekh.org`: **60/60 non-429**. Unlimited guessing, exactly what A was supposed to stop.
- 8 wrong passwords carrying `cf-connecting-ip: 203.0.113.77`, then the correct admin password from that same claimed address: **429**. Anyone could lock a named administrator out for 10 minutes with 8 requests. That capability was new - before my change there was no throttle, so there was no lockout.

My first-round note calling header spoofing "out of scope" was wrong, and so was the brief's premise that IP+email keying was the remedy.

**Is a trustworthy address available? Checked, not assumed.**
I probed the running server through a temporary endpoint in my own route, then removed it.
`getRequestIP()` from `@tanstack/react-start/server` returned `::1` - the real socket peer - and was **unchanged** by spoofed headers.
Only the opt-in `getRequestIP({ xForwardedFor: true })` returned the attacker's `9.9.9.9`.
So the socket peer address is reachable at this layer, and it is the address to key on.

**The fix.**

*Trustworthy address by default.*
`clientIp()` now returns the socket peer address via `getRequestIP()`.
Proxy headers are ignored unless the operator sets the new `TRUSTED_PROXY_HEADER` env var naming the one header to honour.
Unset means trust nothing, so the default `docker compose up` deployment - which is what a self-hosting NGO runs, with no proxy in front - is not bypassable.
Header trust is now explicit configuration, and the config carries the condition attached to it: the proxy must overwrite the header, and the app must not be reachable around the proxy.

*Re-keyed so a stranger cannot lock out a named account.*
The address limit is the real defence and is now the only hard block: 20 attempts / 10 minutes per peer address.
Generous enough for an office behind one NAT address, far too slow to search an argon2id password space.
The account dimension only ever **delays**: past 10 failures in 15 minutes for one email, an escalating backoff (100 ms doubling, saturating at 2 s) is applied before authenticating.
I chose delay over a higher-bounded hard block because *any* per-account refusal is a lockout an attacker can aim at a named administrator simply by failing logins in their name - a higher bound just raises the price from 8 requests to 50.
A delay slows distributed guessing and cannot be weaponised into shutting someone out.
The cost is honest and visible in the evidence: an admin logging in while their account is under attack waits up to 2 s.

**After.**
- Attack 1, rotating both headers, from a fixed real source address: **20/60 non-429, first 429 at attempt 21** (was 60/60).
- Attack 2: the attacker exhausts their own bucket (429), while the real admin from their own address signs in with the correct password: **HTTP 200**, delayed 2,104 ms by the backoff. The lockout attempt fails.
- The declared-proxy path still works: with `TRUSTED_PROXY_HEADER=cf-connecting-ip`, client A (`198.51.100.5`) is throttled after 20 attempts while client B (`198.51.100.6`) behind the same socket still signs in (200), so a real CDN deployment does not put the whole internet in one bucket.

These runs use distinct real loopback source addresses (`--interface 127.0.0.x`) so the socket peer and the claimed header can be varied independently - otherwise the two dimensions cannot be told apart.
My first attempt at this test conflated them and I redid it.

**Deployment surface updated** so the guarantee is not a comment nobody reads: `.env.example` (the var, with the condition for setting it), `README.md` (a "Running behind a proxy" section), `docker-compose.yml` (passes it through, documented empty by default).

**Also fixed: a 500 on attacker-controlled input in my own endpoint.**
A multipart part with an empty filename returned `{"status":500,"unhandled":true}`.
Reproduced first; the throw is in `request.formData()` itself, before the `file.name.split(".")` line, so the repair is to catch the parse and reject an empty filename.
Now returns 400, with real PNG upload (200) and the `.sh`-as-`.png` refusal (415) both unregressed.

**Recorded, not fixed this round** (agreed with the coordinator): the sniffer validates leading signatures only, so `ftyp` / `PK\x03\x04` / GIF polyglots pass.
The docstring in `magic-bytes.ts` was overpromising and now says what the code actually does; full container validation is its own job.

**Note on file ownership.**
The fix needed a validated env var, so I edited `src/env.ts`, which was not in my listed files.
It is a purely additive optional field and no other pane owns that file, but flagging it for review.
`src/server/auth.ts` and `src/lib/permissions.ts` remain untouched.

---

## A. Unlimited password guessing

**Reproduce.**
A loop of wrong passwords against `POST /api/auth/login` for `admin@kapekh.org`.
60 attempts, all HTTP 401, in 4 seconds, never throttled.
The correct password still returned 200 afterwards.
Evidence: `A-before-bruteforce.txt`.

**Cause.**
`rateLimit` was called only from the forms and pay endpoints.
Login never touched it, so `authenticate()`'s careful constant-time dummy hash was guarding an unbounded attempt count.

**Change.**
`src/routes/api.auth.$.tsx` now rate-limits the login branch before `authenticate()`, keyed on `login:<ip>:<email>` (both, lowercased), 8 attempts per 10 minutes.
Keying on the email as well as the IP is the load-bearing part.
The IP falls back to the literal `"unknown"` when no proxy header is present, so an IP-only key would share one bucket across every direct caller and let one fat-fingered password lock the whole office out.
With the email in the key, each account has its own bucket even behind a shared or absent IP.

**After.**
Same loop now turns over at attempt 9 (attempts 1-8 return 401, attempt 9 onward returns 429).
The exhausted bucket also 429s the correct admin password, as intended.
A second account (`j25-media@kapekh.org`) logging in from the same IP still returns 200, so the throttle does not lock colleagues out.
Evidence: `A-after-bruteforce.txt`.

**Superseded by round 2.**
The keying described above (`login:<ip>:<email>`, 8 per 10 min, with `clientIp` reading proxy headers) was **not a working fix** and introduced a lockout.
See "Round 2" at the top of this report for the reproduction, the root cause and the current behaviour.
The remaining unfixed constraint is that the limiter is a per-process `Map` and does not survive a second instance; that is Stage B's datastore question, noted per the brief.

---

## B. What the runtime image ships

**Reproduce.**
Built the image as it stood (`docker build`), then inventoried the runtime stage with `docker history --no-trunc` and a shell inside it.
Evidence: `B-before-image.txt`.

**Finding, correcting the survey.**
The survey's headline was wrong on its worst point: `.env` and the database are **not** in the image.
`.dockerignore` already excludes `.env`, `.env.*`, `*.db`, `*.db-wal`, `*.db-shm` and `.git`, and the inside-image check confirmed all absent.
`AUTH_SECRET` is therefore **not** shipped.

What `COPY . .` in the runtime stage did leak: the whole working tree of internal material next to `dist/` - `.work/` (job briefs, prior reports, screenshots), `feedback/`, `.claude/`, `.mcp.json`, `.cursorrules`, `.review-shots/`, `.lavish/`, `README.md`, `docker-compose.yml`, `Dockerfile`, `scripts/`.
That is internal-notes and source disclosure to anyone who can pull the image, not credential disclosure.

**Change.**
`Dockerfile` runtime stage no longer does `COPY . .`; it copies only what the server needs: `dist`, `node_modules`, `prerender-paths.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, `tsr.config.json`, `src`, `drizzle`, `public`, and the entrypoint.
`.dockerignore` additionally excludes `.work/`, `feedback/`, `.claude/`, `.lavish/`, `.review-shots/`, `.vscode/`, `.cursorrules`, `.mcp.json`, `.cta.json` so they never enter any build stage or context.
(That last change also mattered operationally: `.work/scratch` had grown to 32 GB of another job's log, which the old full-context copy dragged into the build and which filled the disk mid-run.)

**After.**
Rebuilt image root contains only `dist drizzle node_modules package.json prerender-paths.json public src tsconfig.json tsr.config.json vite.config.ts`.
No `.env`, no `*.db`, no `.work`, no `feedback`, no `.claude`, no `.mcp.json`, no `.git`, no `scripts`, no `README.md`, no `docker-compose.yml`.
The container starts (ready in ~2 s) and serves: `/login` 200, `/admin` (no cookie) 307 to `/login`.
Evidence: `B-after-image.txt` (history, inventory, boot log, serving probes).

**Acceptance #3 not fully met, honestly.**
`src/` cannot be removed.
The production server is `vite preview`, and the `@tanstack/react-start` vite plugin resolves the router entry from `/app/src` when preview boots; an image without `src/` fails at startup with `Could not resolve entry for router entry: router in /app/src` (I reproduced this: a src-less build built fine but the container crash-looped).
Dropping `src/` needs a different production entrypoint - running the built `dist/server/server.js` directly instead of `vite preview` - which changes the `start` script and wants its own testing, so it is a separate decision, not this change.
The security-relevant goals (no `.env`, no `*.db`, no internal notes) are met; "no `src/`" is not, for the reason above.

---

## C. The payment webhook proves nothing about who called it

**Reproduce.**
`POST /api/pay/webhook`.
In the scratch env Baray is unconfigured (no `BARAY_*`), so the handler returns 503 before parsing anything; I could not forge a live call there.
To exercise the real check I ran a throwaway server (`/tmp/j25c.db`, separate port) with a **self-generated dummy** `BARAY_SK`/`BARAY_IV` and demonstrated the mechanics.
Evidence: `C-webhook.txt`.

**Finding.**
`src/server/baray.ts` is the whole story: Baray is a redirect-plus-webhook gateway whose webhook body is `{ encrypted_order_id, bank }`, and the only integrity primitive is AES-256-CBC under a key **shared** by the app and the gateway.
There is no signature header, no HMAC, no nonce.
Its own doc pointer (`https://baray.io/llm.txt`) was returning HTTP 502 throughout this job, so I could not confirm from the source of truth whether a signature or an order-status endpoint exists; that is the blocker on the "proper" fix.

Demonstrated on the dummy-keyed server:
- A random (not-encrypted) `encrypted_order_id` returns 400 "invalid payload" - an attacker without the key cannot pass.
- A ciphertext I built **with** the shared key, for a random order id, reaches the mark-paid path and returns `{ok:true, matched:false}` (false only because the order id was random).
  The sole authenticator is possession of the symmetric key; there is no signature, no replay guard, and the IV is fixed.
  Anyone holding the key, or replaying a captured legitimate webhook, drives the paid-marking.

**Change.**
The honest, verifiable hardening available without gateway docs is a rate limit, which the endpoint lacked while `/api/pay/donate` beside it had one.
`src/routes/api.pay.$.tsx` now rate-limits the webhook at `pay:webhook:<ip>`, 120 per 60 s - generous headroom for legitimate confirmation bursts (Baray retries a throttled call), enough to blunt a flood or a decrypt-oracle probe.
On the dummy server the 429 begins at request 119 (the two mechanic probes had already consumed 2 of the 120).

**What I did not do, and why.**
I did not invent a signature scheme the gateway does not send.
I did not add a server-side order-confirmation round-trip: `baray.ts` exposes only `/pay` (create intent), there is no documented status endpoint, and inventing a call to an unknown URL would be fabricating a round-trip I cannot verify - especially with the docs down.
The real fix (confirm the order against Baray before marking it paid, or verify a gateway signature) is blocked on Baray documentation.
That is the finding: this endpoint's trust rests entirely on the secrecy of a symmetric key that both sides hold, and it needs gateway-side proof of origin that the protocol, as visible in this repo, does not provide.

---

## D. `/admin` guarded on the client only

**Reproduce.**
`curl` of `/admin` with no cookie returned `200` and 43,395 bytes of the admin shell HTML (title "KAPE Admin", the "Checking access" placeholder, the route module).
The tRPC data behind it is protected by `adminProcedure`, so this is disclosure of structure and of the admin's existence, not of content.
Evidence: `D-before-admin-curl.txt`.

**Change.**
`src/routes/admin.tsx` now has a server guard.
A `createServerFn` reads the session cookie server-side (`getCookie`), validates it, resolves the role's permissions, and returns the identity only for a super-admin or a user with at least one area.
The route's `beforeLoad` throws `redirect({ to: "/login" })` when that returns null.
The component now reads the resolved identity from route context instead of fetching `auth.me` in an effect, so the client-side `useEffect` guard and the "Checking access" spinner are gone.
This closes the disclosure and removes the 12-second placeholder paint J23 measured, in one change.

**After.**
`curl` of `/admin` with no cookie now returns `307 http://localhost:3222/login` with a zero-byte body; none of the shell markers are present.
With a valid admin cookie it serves the shell (200, real sidebar).
The same holds in the production container: `/admin` no-cookie returns 307 to `/login`.
Evidence: `D-after-admin-curl.txt`, and the container probe in `B-after-image.txt`.

---

## E. The `media` permission area cannot upload

**Reproduce.**
Created a `J25-media` role holding only `media` and a user on it (via the real admin tRPC mutations), logged in as that user.
Over tRPC the user could `adminMedia.list` (200), but `POST /api/media/upload` returned 401 "Unauthorized".
The endpoint gated on `auth.user.role !== "admin"` - a literal role string - so the seeded `editor`/`content_manager` shape and any custom `media` role are refused by the one endpoint that actually stores bytes.
J23's separate finding (a `.sh` renamed `.png` accepted and stored) reproduced too: as admin it returned 200 and persisted `bc15f1dd-...png`, a shell script sitting in `public/uploads`.
Evidence: `E-before-media-role.txt`.

**Change.**
`src/routes/api.media.$.tsx`:
- Authorisation now matches `adminMedia` over tRPC: it resolves the caller's permissions (`resolvePermissions`) and requires super-admin or the `media` area, instead of the literal `"admin"` string.
- Added magic-byte sniffing.
  A new pure module `src/server/magic-bytes.ts` maps each allowed extension to acceptable leading-byte signatures (`bytesMatchExtension`), and the upload is refused when the bytes do not match the declared extension.
  It is a separate, dependency-free module so `vitest` (Node) can test it without importing `bun:sqlite`.

**After.**
As the `J25-media` user (media-only, non-admin):
- a real PNG uploads successfully (200) both over `curl` and through the real Media Library UI (item count 126 to 127);
- a `.sh` renamed `.png` is refused with 415 "File contents do not match \".png\"".
As admin the same `.sh`-as-`.png` J23 proved was accepted is now refused (415), while a real PNG still uploads (200).
Anonymous upload is still refused (401).
Evidence: `E-after-media-role.txt`, `E-browser-session.txt`, and screenshots `E-ui-1-media-role-access.png`, `E-ui-2-media-role-upload-success.png`, `E-ui-3-evil-rejected.png`.

---

## Tests, and the runnable checks left behind

`src/server/security-guards.test.ts` (new, 11 tests, runs under vitest with no database):
- the limiter's window arithmetic - `limit` allowed then blocked, distinct keys in separate buckets, and a fresh window after the old one elapses;
- the per-account backoff - counting within a window, `peekCount` not recording, silence until the threshold then doubling and saturating, and that it **never refuses** however many failures accumulate (the property that stops it becoming a lockout);
- the sniffer's accept/reject table - each signature identified, real files accepted under their true extension, a shell script refused under `.png`, real files refused under the wrong extension, unknown extensions refused outright.

The pure arithmetic lives in `src/server/ratelimit-core.ts` so the test never imports the server runtime; `ratelimit.ts` re-exports it and adds `clientIp`.

---

## Housekeeping (acceptance #10)

`J25-media` role and its user were deleted through the admin tRPC mutations after the demonstration.
The user delete first hit a FOREIGN KEY constraint because the logins had created `sessions` rows; those were cleared in the scratch DB and the delete then succeeded.
Roles are back to `admin, staff, editor, content_manager`; zero `j25` users remain.

Test uploads: six files were created during the demonstration (media ids 132-137 in the scratch DB, all under `public/uploads/`), including the malicious `bc15f1dd-...png`.
All six files were removed from `public/uploads/`.
The scratch DB rows are disposable (that DB is `/tmp/j25.db`).
**No test upload was left behind.**

## Out of scope, reported not fixed

CSRF: the only protection is `SameSite=Lax` and tRPC mutations are POSTs.
Real, but fixing it needs a token decision across every admin form, so it is left for that decision per the brief.
Password reset / email verification / 2FA / SSO and machine auth are all absent and all later jobs.

## Files changed

- `src/routes/api.auth.$.tsx` (A, round 2)
- `src/server/ratelimit.ts` (round 2: trustworthy `clientIp`, re-exports the core)
- `src/server/ratelimit-core.ts` (round 2, new: pure limiter + backoff arithmetic)
- `src/env.ts` (round 2: `TRUSTED_PROXY_HEADER` - **outside my listed files**, flagged above)
- `src/routes/api.pay.$.tsx` (C)
- `src/routes/api.media.$.tsx` (E, plus the 400 fix)
- `src/routes/admin.tsx` (D)
- `src/server/magic-bytes.ts` (E, new; docstring softened in round 2)
- `src/server/security-guards.test.ts` (new test)
- `src/server/login-throttle.test.ts` (round 3, new: handler-level "never refuses" test)
- `Dockerfile`, `.dockerignore` (B)
- `.env.example`, `README.md`, `docker-compose.yml` (round 2 + round 3, deployment surface)
