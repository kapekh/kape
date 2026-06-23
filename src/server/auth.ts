import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

import { env } from "#/env";
import type { DB } from "./db";
import { sessions, users } from "./schema";

/**
 * Auth = JWT + revocable sessions.
 *
 * Login creates a `sessions` row and signs a JWT carrying `{ sid, uid }`. The
 * JWT is verified statelessly on each request, then the session row is checked
 * so we can revoke (logout / admin kill) before the JWT naturally expires.
 */

const SECRET = new TextEncoder().encode(env.AUTH_SECRET);
export const SESSION_COOKIE = "kape_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export type AuthUser = { id: number; email: string; name: string | null; role: string };

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

async function verifyToken(token: string): Promise<{ sid: string; uid: number } | null> {
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
	const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (!u) {
		// Equalise timing so missing emails aren't distinguishable.
		await Bun.password.hash("not-a-real-password");
		return null;
	}
	if (!(await verifyPassword(password, u.passwordHash))) return null;
	return { id: u.id, email: u.email, name: u.name, role: u.role };
}

/** Create a session row and return its signed JWT. */
export async function createSession(db: DB, userId: number, userAgent?: string) {
	const id = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + MAX_AGE_S * 1000).toISOString();
	await db.insert(sessions).values({ id, userId, expiresAt, userAgent: userAgent ?? null });
	return { id, token: await signToken(id, userId) };
}

export async function revokeSession(db: DB, sessionId: string): Promise<void> {
	await db
		.update(sessions)
		.set({ revokedAt: new Date().toISOString() })
		.where(eq(sessions.id, sessionId));
}

/**
 * Validate a session JWT against the DB: verifies the signature, then confirms
 * the session exists, is unexpired and not revoked, and the user still exists.
 */
export async function validateToken(
	db: DB,
	token: string | undefined,
): Promise<{ user: AuthUser; sessionId: string } | null> {
	if (!token) return null;
	const payload = await verifyToken(token);
	if (!payload) return null;

	const [sess] = await db.select().from(sessions).where(eq(sessions.id, payload.sid)).limit(1);
	if (!sess || sess.revokedAt) return null;
	if (new Date(sess.expiresAt).getTime() < Date.now()) return null;

	const [u] = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
	if (!u) return null;
	return { user: { id: u.id, email: u.email, name: u.name, role: u.role }, sessionId: sess.id };
}

/* ---- cookie helpers ---- */

export function parseCookies(header: string | null): Record<string, string> {
	const out: Record<string, string> = {};
	if (!header) return out;
	for (const part of header.split(";")) {
		const i = part.indexOf("=");
		if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
	}
	return out;
}

// `Secure` is added automatically in production so the session cookie is only
// ever sent over HTTPS. (Left off in dev where the server is plain http.)
const SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";
export function sessionCookie(token: string): string {
	return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_S}${SECURE}`;
}
export function clearSessionCookie(): string {
	return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${SECURE}`;
}
