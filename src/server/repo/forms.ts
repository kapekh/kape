import { and, count, desc, eq } from "drizzle-orm";

import type { FormField } from "#/lib/forms";
import type { DB } from "../db";
import {
	contactSubmissions,
	formSubmissions,
	forms,
	newsletterSubscribers,
} from "../schema";

const TENANT = 1;

/* ---- Form builder ---- */

export type FormInput = {
	slug: string;
	status: "active" | "draft";
	title: string;
	titleKm: string | null;
	intro: string | null;
	introKm: string | null;
	fields: FormField[];
	deadline: string | null;
	submitLabel: string | null;
	successMessage: string | null;
	notifyEmail: string | null;
};

/** Public: an active form by slug (for the renderer). */
export async function getFormBySlug(db: DB, slug: string) {
	const [row] = await db
		.select()
		.from(forms)
		.where(
			and(
				eq(forms.tenantId, TENANT),
				eq(forms.slug, slug),
				eq(forms.status, "active"),
			),
		)
		.limit(1);
	return row ?? null;
}

export async function createFormSubmission(
	db: DB,
	formId: number,
	data: Record<string, string>,
): Promise<void> {
	await db.insert(formSubmissions).values({ tenantId: TENANT, formId, data });
}

/* ---- Admin ---- */

export async function adminListForms(db: DB) {
	const rows = await db
		.select()
		.from(forms)
		.where(eq(forms.tenantId, TENANT))
		.orderBy(desc(forms.id));
	const counts = await db
		.select({ formId: formSubmissions.formId, n: count() })
		.from(formSubmissions)
		.where(eq(formSubmissions.tenantId, TENANT))
		.groupBy(formSubmissions.formId);
	const byForm = new Map(counts.map((c) => [c.formId, Number(c.n)]));
	return rows.map((r) => ({ ...r, submissionCount: byForm.get(r.id) ?? 0 }));
}

/** Is this slug free (ignoring the form being edited)? */
export async function isFormSlugAvailable(
	db: DB,
	slug: string,
	excludeId?: number,
): Promise<boolean> {
	if (!slug.trim()) return false;
	const [row] = await db
		.select({ id: forms.id })
		.from(forms)
		.where(and(eq(forms.tenantId, TENANT), eq(forms.slug, slug.trim())))
		.limit(1);
	return !row || row.id === excludeId;
}

export async function getFormForEdit(db: DB, id: number) {
	const [row] = await db
		.select()
		.from(forms)
		.where(and(eq(forms.tenantId, TENANT), eq(forms.id, id)))
		.limit(1);
	return row ?? null;
}

export async function createForm(db: DB, input: FormInput): Promise<number> {
	const [r] = await db
		.insert(forms)
		.values({ tenantId: TENANT, ...input })
		.returning({ id: forms.id });
	return r.id;
}

export async function updateForm(
	db: DB,
	id: number,
	input: FormInput,
): Promise<void> {
	await db
		.update(forms)
		.set({ ...input, updatedAt: new Date().toISOString() })
		.where(and(eq(forms.tenantId, TENANT), eq(forms.id, id)));
}

export async function deleteForm(db: DB, id: number): Promise<void> {
	await db
		.delete(formSubmissions)
		.where(
			and(eq(formSubmissions.tenantId, TENANT), eq(formSubmissions.formId, id)),
		);
	await db
		.delete(forms)
		.where(and(eq(forms.tenantId, TENANT), eq(forms.id, id)));
}

export async function adminListSubmissions(db: DB, formId: number) {
	return db
		.select({
			id: formSubmissions.id,
			data: formSubmissions.data,
			createdAt: formSubmissions.createdAt,
		})
		.from(formSubmissions)
		.where(
			and(
				eq(formSubmissions.tenantId, TENANT),
				eq(formSubmissions.formId, formId),
			),
		)
		.orderBy(desc(formSubmissions.id));
}

export async function deleteFormSubmission(db: DB, id: number): Promise<void> {
	await db
		.delete(formSubmissions)
		.where(
			and(eq(formSubmissions.tenantId, TENANT), eq(formSubmissions.id, id)),
		);
}

/** All contact-form messages, newest first, for the admin inbox. */
export async function adminListContactSubmissions(db: DB) {
	return db
		.select()
		.from(contactSubmissions)
		.where(eq(contactSubmissions.tenantId, TENANT))
		.orderBy(desc(contactSubmissions.createdAt));
}

/** Delete a contact message (after it's been handled). */
export async function deleteContactSubmission(
	db: DB,
	id: number,
): Promise<void> {
	await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
}

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
