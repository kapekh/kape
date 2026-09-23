import type { DB } from "../db";
import { terms, translations } from "../schema";

const TENANT = 1;

/** Managed reference data (taxonomies) for relation fields, as `[key, label]`. */
export const TERM_SEED: Record<string, [string, string][]> = {
	location: [
		["Kampong Cham", "Kampong Cham"],
		["Phnom Penh", "Phnom Penh"],
		["Siem Reap", "Siem Reap"],
		["Kratie", "Kratie"],
		["Banteay Meanchey", "Banteay Meanchey"],
		["Battambang", "Battambang"],
		["Ratanakiri", "Ratanakiri"],
		["Svay Rieng", "Svay Rieng"],
		["Kampong Chhnang", "Kampong Chhnang"],
		["All provinces", "All provinces"],
	],
	// the keys double as the Media & Publications page segments a publication list filters by
	publication_category: [
		["annual-report", "Annual Report"],
		["program-brochure", "Program Brochure"],
		["program-report", "Program Report"],
		["paper-research", "Paper Research"],
		["e-newsletter", "E-Newsletter"],
		["other-publications", "Other Publications"],
		["policies", "Policies & Regulations"],
		["ai-digital", "AI and Digital Education"],
		["life-skills", "Life Skills Education"],
		["escup-sources", "ESCUP Sources"],
	],
	doc_category: [
		["Admin & HR", "Admin & HR"],
		["Finance & Procurement", "Finance & Procurement"],
		["Program & M&E", "Program & M&E"],
		["Branding & Media", "Branding & Media"],
		["IT", "IT Supportive Resources"],
	],
	// Keys, not labels, are what the public partners band prints as its group
	// heading, so they stay short; the label is what an admin picks from.
	partner_category: [
		["government", "Royal Government of Cambodia"],
		["strategic", "Strategic Partnership (Thun Thean Obrum / TTO)"],
		["private", "Private"],
		["foundation", "Foundation"],
		["international", "International Organizations"],
		["local", "Local Organizations"],
		["implementing", "Implemented Partners"],
		["technical", "Technical Supportive Partner"],
	],
};

export async function seedTerms(db: DB) {
	for (const [taxonomy, items] of Object.entries(TERM_SEED)) {
		const rows = await db
			.insert(terms)
			.values(
				items.map(([key], i) => ({ tenantId: TENANT, taxonomy, key, sort: i })),
			)
			.returning({ id: terms.id });
		// the term list ships English only; a Khmer label is the editor's to write
		await db.insert(translations).values(
			rows.map((row, i) => ({
				tenantId: TENANT,
				entityType: "term",
				entityId: row.id,
				field: "label",
				lang: "en",
				value: items[i][1],
			})),
		);
	}
}
