import { hashPassword } from "../auth";
import { db } from "../db";
import { users } from "../schema";
import { TENANT } from "./helpers";

export async function seedStaffUser() {
	await db.insert(users).values({
		tenantId: TENANT,
		email: process.env.STAFF_EMAIL ?? "staff@kapekh.org",
		passwordHash: await hashPassword(
			process.env.STAFF_PASSWORD ?? "kape-staff-2026",
		),
		name: "KAPE Staff",
		role: "staff",
	});
}

/** Returns the admin email so the caller can report it without logging the password. */
export async function seedAdminUser() {
	const adminEmail = process.env.ADMIN_EMAIL ?? "admin@kapekh.org";
	const adminPassword = process.env.ADMIN_PASSWORD ?? "kape-admin-2026";
	await db.insert(users).values({
		tenantId: TENANT,
		email: adminEmail,
		passwordHash: await hashPassword(adminPassword),
		name: "KAPE Admin",
		role: "admin",
	});
	return adminEmail;
}
