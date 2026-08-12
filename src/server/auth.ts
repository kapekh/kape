import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";

import { env } from "#/env";
import { ADMIN_HINT_COOKIE } from "#/lib/admin-hint";
import type { DB } from "./db";
import { sessions, users } from "./schema";

// the JWT is verified statelessly, then the session row is checked, so logout can revoke before it expires

const SECRET = new TextEncoder().encode(env.AUTH_SECRET);
export const SESSION_COOKIE = "cms_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export type AuthUser = {
	id: number;
	email: string;
	name: string | null;
	role: string;
};

export function hashPassword(pw: string): Promise<string> {
	return Bun.password.hash(pw, { algorithm: "argon2id" });
}
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
	return Bun.password.verify(pw, hash);
}

async function signToken(sid: string, uid: number): Promise<string> {
	return new SignJWT({ sid, uid })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${MAX_AGE_S}s`)
		.sign(SECRET);
}

async function verifyToken(
	token: string,
): Promise<{ sid: string; uid: number } | null> {
	try {
		const { payload } = await jwtVerify(token, SECRET);
		return { sid: String(payload.sid), uid: Number(payload.uid) };
	} catch {
		return null;
	}
}

/** Verify credentials; returns the user (no session) or null. Constant-ish time. */
export async function authenticate(
	db: DB,
	email: string,
	password: string,
): Promise<AuthUser | null> {
	const [u] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);
	if (!u) {
		// Equalise timing so missing emails aren't distinguishable.
		await Bun.password.hash("not-a-real-password");
		return null;
	}
	if (!(await verifyPassword(password, u.passwordHash))) return null;
	return { id: u.id, email: u.email, name: u.name, role: u.role };
}

/** Create a session row and return its signed JWT. */
export async function createSession(
	db: DB,
	userId: number,
	userAgent?: string,
) {
	const id = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + MAX_AGE_S * 1000).toISOString();
	await db
		.insert(sessions)
		.values({ id, userId, expiresAt, userAgent: userAgent ?? null });
	return { id, token: await signToken(id, userId) };
}

export async function revokeSession(db: DB, sessionId: string): Promise<void> {
	await db
		.update(sessions)
		.set({ revokedAt: new Date().toISOString() })
		.where(eq(sessions.id, sessionId));
}

export async function validateToken(
	db: DB,
	token: string | undefined,
): Promise<{ user: AuthUser; sessionId: string } | null> {
	if (!token) return null;
	const payload = await verifyToken(token);
	if (!payload) return null;

	const [sess] = await db
		.select()
		.from(sessions)
		.where(eq(sessions.id, payload.sid))
		.limit(1);
	if (!sess || sess.revokedAt) return null;
	if (new Date(sess.expiresAt).getTime() < Date.now()) return null;

	const [u] = await db
		.select()
		.from(users)
		.where(eq(users.id, sess.userId))
		.limit(1);
	if (!u) return null;
	return {
		user: { id: u.id, email: u.email, name: u.name, role: u.role },
		sessionId: sess.id,
	};
}

/* ---- cookie helpers ---- */

export function parseCookies(header: string | null): Record<string, string> {
	const out: Record<string, string> = {};
	if (!header) return out;
	for (const part of header.split(";")) {
		const i = part.indexOf("=");
		if (i > 0)
			out[part.slice(0, i).trim()] = decodeURIComponent(
				part.slice(i + 1).trim(),
			);
	}
	return out;
}

// browsers discard a Secure cookie set over plain http, which breaks LAN sign-in; x-forwarded-proto covers TLS terminated at a proxy
function secureFlag(request?: Request): string {
	if (!request) return "; Secure";
	const forwarded = request.headers
		.get("x-forwarded-proto")
		?.split(",")[0]
		.trim();
	const https = forwarded
		? forwarded === "https"
		: new URL(request.url).protocol === "https:";
	return https ? "; Secure" : "";
}
export function sessionCookie(token: string, request?: Request): string {
	return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_S}${secureFlag(request)}`;
}
export function clearSessionCookie(request?: Request): string {
	return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

// readable on purpose: it grants nothing, it only tells the public site to go and ask who this is
export function adminHintCookie(request?: Request): string {
	return `${ADMIN_HINT_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_S}${secureFlag(request)}`;
}
export function clearAdminHintCookie(request?: Request): string {
	return `${ADMIN_HINT_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}
