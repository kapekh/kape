import { and, count, eq, ne } from "drizzle-orm";

import { hashPassword, verifyPassword } from "../auth";
import type { DB } from "../db";
import { sessions, users } from "../schema";

const TENANT = 1;

/** Role is a free-form role key — built-in (`admin`, `staff`) or a custom role's key. */
export type UserInput = { email: string; name: string | null; role: string };

const normEmail = (e: string) => e.trim().toLowerCase();

export async function adminListUsers(db: DB) {
	return db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(eq(users.tenantId, TENANT))
		.orderBy(users.id);
}

export async function getUserForEdit(db: DB, id: number) {
	const [u] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
		})
		.from(users)
		.where(and(eq(users.tenantId, TENANT), eq(users.id, id)))
		.limit(1);
	return u ?? null;
}

async function countAdmins(db: DB): Promise<number> {
	const [r] = await db
		.select({ n: count() })
		.from(users)
		.where(and(eq(users.tenantId, TENANT), eq(users.role, "admin")));
	return Number(r?.n ?? 0);
}

async function emailTaken(
	db: DB,
	email: string,
	excludeId?: number,
): Promise<boolean> {
	const [u] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.tenantId, TENANT), eq(users.email, email)))
		.limit(1);
	return !!u && u.id !== excludeId;
}

export async function createUser(
	db: DB,
	v: UserInput & { password: string },
): Promise<number> {
	const email = normEmail(v.email);
	if (await emailTaken(db, email))
		throw new Error("A user with that email already exists.");
	const passwordHash = await hashPassword(v.password);
	const [r] = await db
		.insert(users)
		.values({
			tenantId: TENANT,
			email,
			name: v.name,
			role: v.role,
			passwordHash,
		})
		.returning({ id: users.id });
	return r.id;
}

export async function updateUser(
	db: DB,
	id: number,
	v: UserInput,
): Promise<void> {
	const email = normEmail(v.email);
	if (await emailTaken(db, email, id))
		throw new Error("A user with that email already exists.");
	const [cur] = await db
		.select({ role: users.role })
		.from(users)
		.where(and(eq(users.tenantId, TENANT), eq(users.id, id)))
		.limit(1);
	if (
		cur?.role === "admin" &&
		v.role !== "admin" &&
		(await countAdmins(db)) <= 1
	) {
		throw new Error(
			"Can't change the role of the only admin — promote another admin first.",
		);
	}
	await db
		.update(users)
		.set({ email, name: v.name, role: v.role })
		.where(and(eq(users.tenantId, TENANT), eq(users.id, id)));
}

/** Admin resets another user's password. Revokes their sessions (forces re-login). */
export async function setUserPassword(
	db: DB,
	id: number,
	password: string,
): Promise<void> {
	const passwordHash = await hashPassword(password);
	await db
		.update(users)
		.set({ passwordHash })
		.where(and(eq(users.tenantId, TENANT), eq(users.id, id)));
	await db
		.update(sessions)
		.set({ revokedAt: new Date().toISOString() })
		.where(eq(sessions.userId, id));
}

export async function deleteUser(
	db: DB,
	id: number,
	currentUserId: number,
): Promise<void> {
	if (id === currentUserId)
		throw new Error("You can't delete your own account.");
	const [u] = await db
		.select({ role: users.role })
		.from(users)
		.where(and(eq(users.tenantId, TENANT), eq(users.id, id)))
		.limit(1);
	if (!u) return;
	if (u.role === "admin" && (await countAdmins(db)) <= 1)
		throw new Error("Can't delete the only admin.");
	// revoking left the rows behind and sessions.user_id then refused the delete;
	// a revoked session outliving its user has no reader
	await db.batch([
		db.delete(sessions).where(eq(sessions.userId, id)),
		db.delete(users).where(and(eq(users.tenantId, TENANT), eq(users.id, id))),
	]);
}

/** A user changes their own password (verifies the current one). Keeps this session, signs out every other. */
export async function changeOwnPassword(
	db: DB,
	userId: number,
	currentPassword: string,
	newPassword: string,
	keepSessionId: string,
): Promise<void> {
	const [u] = await db
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (!u) throw new Error("User not found.");
	if (!(await verifyPassword(currentPassword, u.passwordHash)))
		throw new Error("Your current password is incorrect.");
	const passwordHash = await hashPassword(newPassword);
	await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
	await db
		.update(sessions)
		.set({ revokedAt: new Date().toISOString() })
		.where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}
