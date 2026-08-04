import { and, count, eq } from "drizzle-orm";

import { ALL_AREAS, type PermissionArea } from "#/lib/permissions";
import type { DB } from "../db";
import { roles, users } from "../schema";

const TENANT = 1;

export type RoleInput = {
	key: string;
	name: string;
	permissions: PermissionArea[];
};

const slugifyKey = (s: string) =>
	s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

export async function getRoleByKey(db: DB, key: string) {
	const [r] = await db
		.select()
		.from(roles)
		.where(and(eq(roles.tenantId, TENANT), eq(roles.key, key)))
		.limit(1);
	return r ?? null;
}

/** Effective permissions for a role key. `admin` is the super-role (all areas). */
export async function resolvePermissions(
	db: DB,
	roleKey: string,
): Promise<{ permissions: string[]; isSuperAdmin: boolean }> {
	if (roleKey === "admin")
		return { permissions: ALL_AREAS, isSuperAdmin: true };
	const r = await getRoleByKey(db, roleKey);
	return { permissions: r?.permissions ?? [], isSuperAdmin: false };
}

export async function roleExists(db: DB, key: string): Promise<boolean> {
	return !!(await getRoleByKey(db, key));
}

/** Roles for a picker (the user form). */
export async function listRolesForPicker(db: DB) {
	return db
		.select({ key: roles.key, name: roles.name })
		.from(roles)
		.where(eq(roles.tenantId, TENANT))
		.orderBy(roles.id);
}

/* ---- Admin ---- */

export async function adminListRoles(db: DB) {
	const rows = await db
		.select()
		.from(roles)
		.where(eq(roles.tenantId, TENANT))
		.orderBy(roles.id);
	const counts = await db
		.select({ role: users.role, n: count() })
		.from(users)
		.where(eq(users.tenantId, TENANT))
		.groupBy(users.role);
	const byRole = new Map(counts.map((c) => [c.role, Number(c.n)]));
	return rows.map((r) => ({
		...r,
		permissions: r.key === "admin" ? ALL_AREAS : r.permissions,
		userCount: byRole.get(r.key) ?? 0,
	}));
}

export async function getRoleForEdit(db: DB, id: number) {
	const [r] = await db
		.select()
		.from(roles)
		.where(and(eq(roles.tenantId, TENANT), eq(roles.id, id)))
		.limit(1);
	if (!r) return null;
	return { ...r, permissions: r.key === "admin" ? ALL_AREAS : r.permissions };
}

async function keyTaken(
	db: DB,
	key: string,
	excludeId?: number,
): Promise<boolean> {
	const [r] = await db
		.select({ id: roles.id })
		.from(roles)
		.where(and(eq(roles.tenantId, TENANT), eq(roles.key, key)))
		.limit(1);
	return !!r && r.id !== excludeId;
}

export async function createRole(db: DB, v: RoleInput): Promise<number> {
	const key = slugifyKey(v.key || v.name);
	if (!key) throw new Error("Role needs a name.");
	if (key === "admin" || key === "staff")
		throw new Error("That name is reserved.");
	if (await keyTaken(db, key))
		throw new Error("A role with that key already exists.");
	const [r] = await db
		.insert(roles)
		.values({
			tenantId: TENANT,
			key,
			name: v.name,
			permissions: v.permissions,
			isSystem: false,
		})
		.returning({ id: roles.id });
	return r.id;
}

export async function updateRole(
	db: DB,
	id: number,
	v: Omit<RoleInput, "key">,
): Promise<void> {
	const [r] = await db
		.select()
		.from(roles)
		.where(and(eq(roles.tenantId, TENANT), eq(roles.id, id)))
		.limit(1);
	if (!r) throw new Error("Role not found.");
	// `admin` permissions are always all (super-role) — only its name is editable.
	const permissions = r.key === "admin" ? r.permissions : v.permissions;
	await db
		.update(roles)
		.set({ name: v.name, permissions, updatedAt: new Date().toISOString() })
		.where(eq(roles.id, id));
}

export async function deleteRole(db: DB, id: number): Promise<void> {
	const [r] = await db
		.select()
		.from(roles)
		.where(and(eq(roles.tenantId, TENANT), eq(roles.id, id)))
		.limit(1);
	if (!r) return;
	if (r.isSystem)
		throw new Error("Built-in roles (Administrator, Staff) can't be deleted.");
	const [inUse] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.tenantId, TENANT), eq(users.role, r.key)))
		.limit(1);
	if (inUse)
		throw new Error("This role is assigned to users — reassign them first.");
	await db.delete(roles).where(eq(roles.id, id));
}
