import { and, eq } from "drizzle-orm";

import { ALL_AREAS, type PermissionArea } from "#/lib/permissions";
import type { DB } from "../db";
import { roles } from "../schema";

const TENANT = 1;

export type SeedRole = {
	key: string;
	name: string;
	permissions: PermissionArea[];
	isSystem: boolean;
};

const EDITOR_AREAS: PermissionArea[] = ["pages", "posts", "projects", "media"];

/**
 * `admin` and `staff` are code built-ins (see lib/permissions.ts and
 * trpc/init.ts) but the rest of the admin reads roles from this table — the
 * user form's role picker, the roles list, the delete guard. Without rows they
 * are invisible, so a new account cannot be given a role at all.
 *
 * `admin` short-circuits to every area in resolvePermissions, so its stored
 * permissions are display only. `staff` holds none: the staff portal is gated
 * by role, not by area.
 */
export const SEED_ROLES: SeedRole[] = [
	{
		key: "admin",
		name: "Administrator",
		permissions: ALL_AREAS,
		isSystem: true,
	},
	{ key: "staff", name: "Staff", permissions: [], isSystem: true },
	{
		key: "editor",
		name: "Editor",
		permissions: EDITOR_AREAS,
		isSystem: false,
	},
	{
		key: "content_manager",
		name: "Content manager",
		permissions: [
			...EDITOR_AREAS,
			"forms",
			"messages",
			"people",
			"partners",
			"schools",
			"offices",
			"navigation",
			"lists",
		],
		isSystem: false,
	},
];

/** Insert any missing role. Safe to re-run against a populated database. */
export async function seedRoles(db: DB): Promise<void> {
	for (const r of SEED_ROLES) {
		const [existing] = await db
			.select({ id: roles.id })
			.from(roles)
			.where(and(eq(roles.tenantId, TENANT), eq(roles.key, r.key)))
			.limit(1);
		if (existing) continue;
		await db.insert(roles).values({ tenantId: TENANT, ...r });
	}
}
