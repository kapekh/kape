/**
 * Proof-of-concept: create the "alumni" form (replacing the orphaned
 * alumni_registrations table) and drop it onto the /opportunities/alumni page.
 * Idempotent. Run: bun scripts/seed-alumni-form.ts
 */
import { and, eq } from "drizzle-orm";

import type { FormField } from "../src/lib/forms";
import type { SectionNode } from "../src/lib/sections";
import { db } from "../src/server/db";
import { clearCache } from "../src/server/render-cache";
import { forms, pages } from "../src/server/schema";

const TENANT = 1;

const fields: FormField[] = [
	{ key: "name", label: "Full name", labelKm: "ឈ្មោះពេញ", type: "text", required: true },
	{ key: "email", label: "Email", type: "email", required: true, placeholder: "you@email.org" },
	{ key: "phone", label: "Phone", type: "tel" },
	{ key: "graduation_year", label: "Year you finished", type: "number", placeholder: "e.g. 2018" },
	{ key: "program", label: "Program / school", type: "text" },
	{ key: "message", label: "What are you doing now? (optional)", type: "textarea" },
	{ key: "consent", label: "I agree to KAPE keeping my details to send me alumni updates.", type: "checkbox", required: true },
];

async function main() {
	// 1. Upsert the form by slug.
	const values = {
		tenantId: TENANT,
		slug: "alumni",
		status: "active" as const,
		title: "Alumni registration",
		titleKm: "ការចុះឈ្មោះសិស្សពីមុន",
		intro: "Stay connected with KAPE — register so we can invite you to alumni events and share opportunities.",
		introKm: null,
		fields,
		submitLabel: "Register",
		successMessage: "Thank you for registering — welcome back to the KAPE family! We'll be in touch.",
		notifyEmail: null,
	};
	const [existing] = await db.select({ id: forms.id }).from(forms).where(and(eq(forms.tenantId, TENANT), eq(forms.slug, "alumni"))).limit(1);
	if (existing) {
		await db.update(forms).set(values).where(eq(forms.id, existing.id));
		console.log("updated form 'alumni' (#" + existing.id + ")");
	} else {
		const [r] = await db.insert(forms).values(values).returning({ id: forms.id });
		console.log("created form 'alumni' (#" + r.id + ")");
	}

	// 2. Add a form section to the /opportunities/alumni page (if not already there).
	const [page] = await db.select({ id: pages.id, sections: pages.sections }).from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.slug, "opportunities/alumni"))).limit(1);
	if (!page) {
		console.log("⚠ page 'opportunities/alumni' not found — form created but not placed on a page.");
		return;
	}
	const sections = (Array.isArray(page.sections) ? page.sections : []) as SectionNode[];
	if (sections.some((s) => s.type === "form" && (s.props as any)?.formSlug === "alumni")) {
		console.log("page already has the alumni form section.");
	} else {
		sections.push({
			id: "alumni-form",
			type: "form",
			layout: "custom",
			props: { eyebrow: "Alumni", title: "Register as an alumnus", body: "Fill in the form below and we'll keep you posted.", formSlug: "alumni" },
		} as SectionNode);
		await db.update(pages).set({ sections }).where(eq(pages.id, page.id));
		console.log("added alumni form section to the page.");
	}

	await clearCache(db);
	console.log("done. View at /opportunities/alumni");
}

main();
