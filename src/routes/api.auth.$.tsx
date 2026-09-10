import { createFileRoute } from "@tanstack/react-router";

import { landingPath } from "#/lib/permissions";
import {
	adminHintCookie,
	authenticate,
	clearAdminHintCookie,
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
import { resolvePermissions } from "#/server/repo/roles";

// the address limit is the real defence and keys on the socket peer, which a caller cannot rotate; the per-account part only ever delays, or it is a lockout aimed at a named administrator
const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60_000;
const ACCOUNT_WINDOW_MS = 15 * 60_000;
const ACCOUNT_FREE_ATTEMPTS = 10;
const ACCOUNT_MAX_DELAY_MS = 2_000;

const sleep = (ms: number) =>
	ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

// two Set-Cookie headers need append; an object literal keeps only the last
function sessionHeaders(request: Request, token?: string): Headers {
	const headers = new Headers();
	headers.append(
		"set-cookie",
		token ? sessionCookie(token, request) : clearSessionCookie(request),
	);
	headers.append(
		"set-cookie",
		token ? adminHintCookie(request) : clearAdminHintCookie(request),
	);
	return headers;
}

export async function handler({ request }: { request: Request }) {
	const url = new URL(request.url);
	const action = url.pathname.replace(/^\/api\/auth\/?/, "");
	const cookies = parseCookies(request.headers.get("cookie"));

	// POST /api/auth/login  { email, password } -> set session cookie
	if (request.method === "POST" && action === "login") {
		// a cross-site form can post text/plain with a cookie-less body and log the
		// victim into an account of the attacker's choosing; a fetch cannot send
		// json cross-site without a preflight this route never answers
		const contentType = request.headers.get("content-type") ?? "";
		if (!contentType.toLowerCase().startsWith("application/json"))
			return Response.json({ error: "Expected JSON" }, { status: 415 });
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
		const home = landingPath(await resolvePermissions(db, user.role));
		return Response.json(
			{ user, home },
			{ headers: sessionHeaders(request, token) },
		);
	}

	// POST /api/auth/logout -> revoke session + clear cookie
	if (request.method === "POST" && action === "logout") {
		const auth = await validateToken(db, cookies[SESSION_COOKIE]);
		if (auth) await revokeSession(db, auth.sessionId);
		return Response.json({ ok: true }, { headers: sessionHeaders(request) });
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
