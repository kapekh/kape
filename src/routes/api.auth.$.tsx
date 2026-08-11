import { createFileRoute } from "@tanstack/react-router";

import {
	authenticate,
	clearSessionCookie,
	createSession,
	parseCookies,
	revokeSession,
	SESSION_COOKIE,
	sessionCookie,
	validateToken,
} from "#/server/auth";
import { db } from "#/server/db";
import {
	backoffDelayMs,
	clientIp,
	countEvent,
	peekCount,
	rateLimit,
} from "#/server/ratelimit";

// the address limit is the real defence and keys on the socket peer, which a caller cannot rotate; the per-account part only ever delays, or it is a lockout aimed at a named administrator
const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60_000;
const ACCOUNT_WINDOW_MS = 15 * 60_000;
const ACCOUNT_FREE_ATTEMPTS = 10;
const ACCOUNT_MAX_DELAY_MS = 2_000;

const sleep = (ms: number) =>
	ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

export async function handler({ request }: { request: Request }) {
	const url = new URL(request.url);
	const action = url.pathname.replace(/^\/api\/auth\/?/, "");
	const cookies = parseCookies(request.headers.get("cookie"));

	// POST /api/auth/login  { email, password } -> set session cookie
	if (request.method === "POST" && action === "login") {
		const body = (await request.json().catch(() => ({}))) as {
			email?: string;
			password?: string;
		};
		const email = String(body.email ?? "");
		const ip = clientIp(request);
		if (!rateLimit(`login:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS)) {
			return Response.json(
				{ error: "Too many attempts. Please try again shortly." },
				{ status: 429 },
			);
		}

		const accountKey = `login:account:${email.toLowerCase().slice(0, 254)}`;
		await sleep(
			backoffDelayMs(
				peekCount(accountKey),
				ACCOUNT_FREE_ATTEMPTS,
				ACCOUNT_MAX_DELAY_MS,
			),
		);

		const user = await authenticate(db, email, String(body.password ?? ""));
		if (!user) countEvent(accountKey, ACCOUNT_WINDOW_MS);
		if (!user)
			return Response.json({ error: "Invalid credentials" }, { status: 401 });
		const { token } = await createSession(
			db,
			user.id,
			request.headers.get("user-agent") ?? undefined,
		);
		return Response.json(
			{ user },
			{ headers: { "set-cookie": sessionCookie(token, request) } },
		);
	}

	// POST /api/auth/logout -> revoke session + clear cookie
	if (request.method === "POST" && action === "logout") {
		const auth = await validateToken(db, cookies[SESSION_COOKIE]);
		if (auth) await revokeSession(db, auth.sessionId);
		return Response.json(
			{ ok: true },
			{ headers: { "set-cookie": clearSessionCookie(request) } },
		);
	}

	// GET /api/auth/me -> current user or null
	if (action === "me") {
		const auth = await validateToken(db, cookies[SESSION_COOKIE]);
		return Response.json({ user: auth?.user ?? null });
	}

	return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});
