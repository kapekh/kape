import { PLACEHOLDER_IMAGE } from "#/lib/placeholder";
import { db } from "../db";
import { languages, media, translations } from "../schema";

export const TENANT = 1;

export async function alreadySeeded() {
	const [row] = await db.select().from(languages).limit(1);
	return Boolean(row);
}

export async function addTranslations(
	entityType: string,
	entityId: number,
	fields: Record<string, { en: string; km?: string }>,
) {
	const rows: {
		tenantId: number;
		entityType: string;
		entityId: number;
		field: string;
		lang: string;
		value: string;
	}[] = [];
	for (const [field, v] of Object.entries(fields)) {
		rows.push({
			tenantId: TENANT,
			entityType,
			entityId,
			field,
			lang: "en",
			value: v.en,
		});
		if (v.km)
			rows.push({
				tenantId: TENANT,
				entityType,
				entityId,
				field,
				lang: "km",
				value: v.km,
			});
	}
	if (rows.length) await db.insert(translations).values(rows);
}

export function doc(text: string) {
	return JSON.stringify({
		type: "doc",
		content: [{ type: "paragraph", content: [{ type: "text", text }] }],
	});
}

// a picsum url made every empty slot look like a deliberate, wrong editorial choice and hotlinked a third-party host
export async function createPlaceholderMedia(seed: string): Promise<number> {
	const [m] = await db
		.insert(media)
		.values({
			tenantId: TENANT,
			r2Key: `seed/nav-${seed}.svg`,
			url: PLACEHOLDER_IMAGE,
			contentType: "image/svg+xml",
		})
		.returning({ id: media.id });
	return m.id;
}
