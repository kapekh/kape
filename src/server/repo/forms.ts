import { eq } from "drizzle-orm";

import type { DB } from "../db";
import { contactSubmissions, newsletterSubscribers } from "../schema";

const TENANT = 1;

export async function createContactSubmission(
	db: DB,
	v: { name: string; email: string; phone?: string; message: string },
): Promise<void> {
	await db.insert(contactSubmissions).values({
		tenantId: TENANT,
		name: v.name,
		email: v.email,
		phone: v.phone ?? null,
		message: v.message,
	});
}

/** Idempotent subscribe — ignores duplicates for the tenant. */
export async function addSubscriber(db: DB, email: string): Promise<void> {
	const existing = await db
		.select({ id: newsletterSubscribers.id })
		.from(newsletterSubscribers)
		.where(eq(newsletterSubscribers.email, email))
		.limit(1);
	if (existing.length) return;
	await db.insert(newsletterSubscribers).values({ tenantId: TENANT, email });
}
