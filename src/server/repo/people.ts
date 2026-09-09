import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { DEFAULT_LANG } from "#/lib/i18n-config";
import type { DB } from "../db";
import { renderBody } from "../richtext";
import { media, people, translations } from "../schema";
import {
	getDefaultLang,
	resolveOneWithFallback,
	resolveTranslations,
	resolveWithFallback,
} from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

/** Person text that lives in `translations`, not in a column of `people`. */
export const PERSON_TEXT_FIELDS = ["position", "bio"] as const;

type NameColumns = { nameEn: string; nameKm: string | null };

const translatedName = (r: NameColumns, lang: string) =>
	lang === "km" ? r.nameKm : null;

const pickName = (r: NameColumns, lang: string) =>
	translatedName(r, lang) || r.nameEn;

// name is a column pair, not a translations row, so no resolver sees its fallback
const nameFallback = (r: NameColumns, lang: string): string[] =>
	lang !== DEFAULT_LANG && !translatedName(r, lang) ? ["name"] : [];

/* --------------------------------- public --------------------------------- */

export type PersonItem = {
	id: number;
	slug: string;
	name: string;
	position: string;
	section: string;
	photoUrl: string | null;
	i18nFallback: string[];
	/** What this row was loaded at, so an inline edit is checked against it. */
	updatedAt: string;
};

/** Public team / leadership (isPublic), optionally filtered to a tier. */
export async function listPeople(db: DB, lang: string): Promise<PersonItem[]> {
	const rows = await db
		.select()
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.isPublic, true)))
		.orderBy(asc(people.sort));
	const withUrl = await attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
	const { values, fallback } = await resolveWithFallback(
		db,
		"person",
		rows.map((r) => r.id),
		lang,
	);
	return withUrl.map((r) => ({
		id: r.id,
		slug: r.slug ?? "",
		name: pickName(r, lang),
		position: values.get(r.id)?.position ?? "",
		section: r.tier,
		photoUrl: r.photoUrl,
		i18nFallback: [
			...nameFallback(r, lang),
			...(fallback.get(r.id) ?? []).filter((f) => f === "position"),
		],
		updatedAt: r.updatedAt,
	}));
}

export type Colleague = {
	id: number;
	slug: string;
	name: string;
	position: string;
	photoUrl: string | null;
};

export type ResolvedPerson = {
	id: number;
	slug: string;
	name: string;
	position: string;
	/** `people.tier`, which the profile shows as the group this person sits in. */
	tier: string;
	/** Department, e.g. "Digital Education Programming". Shown when set. */
	program: string;
	photoUrl: string | null;
	bodyHtml: string;
	i18nFallback: string[];
	/** Everyone else public in the same tier, so a profile is not a dead end. */
	colleagues: Colleague[];
};

const COLLEAGUES_SHOWN = 6;

async function colleaguesOf(
	db: DB,
	person: { id: number; tier: string },
	lang: string,
): Promise<Colleague[]> {
	const rows = await db
		.select()
		.from(people)
		.where(
			and(
				eq(people.tenantId, TENANT),
				eq(people.isPublic, true),
				eq(people.tier, person.tier),
				ne(people.id, person.id),
			),
		)
		.orderBy(asc(people.sort));
	const withUrl = await attachMediaUrl(
		db,
		rows.slice(0, COLLEAGUES_SHOWN),
		"photoMediaId",
		"photoUrl",
	);
	const text = await resolveTranslations(
		db,
		"person",
		withUrl.map((r) => r.id),
		lang,
	);
	return withUrl.map((r) => ({
		id: r.id,
		slug: r.slug ?? "",
		name: pickName(r, lang),
		position: text.get(r.id)?.position ?? "",
		photoUrl: r.photoUrl,
	}));
}

/** A single public profile by slug, with the bilingual bio rendered to HTML. */
export async function getPersonBySlug(
	db: DB,
	slug: string,
	lang: string,
): Promise<ResolvedPerson | null> {
	const [p] = await db
		.select()
		.from(people)
		.where(
			and(
				eq(people.tenantId, TENANT),
				eq(people.slug, slug),
				eq(people.isPublic, true),
			),
		)
		.limit(1);
	if (!p) return null;
	const { fields: f, fallback } = await resolveOneWithFallback(
		db,
		"person",
		p.id,
		lang,
	);
	fallback.push(...nameFallback(p, lang));
	let photoUrl: string | null = null;
	if (p.photoMediaId) {
		const [m] = await db
			.select({ url: media.url })
			.from(media)
			.where(eq(media.id, p.photoMediaId))
			.limit(1);
		photoUrl = m?.url ?? null;
	}
	return {
		id: p.id,
		slug: p.slug ?? "",
		name: pickName(p, lang),
		position: f.position ?? "",
		tier: p.tier,
		program: p.program ?? "",
		photoUrl,
		bodyHtml: renderBody(f.bio ?? null),
		i18nFallback: fallback,
		colleagues: await colleaguesOf(db, p, lang),
	};
}

/** Full internal directory (everyone), with resolved photo URLs. */
export async function staffDirectory(db: DB) {
	const rows = await db
		.select()
		.from(people)
		.where(eq(people.tenantId, TENANT))
		.orderBy(asc(people.sort));
	return attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
}

/* --------------------------------- admin ---------------------------------- */

export type PersonTranslation = { lang: string } & Partial<
	Record<(typeof PERSON_TEXT_FIELDS)[number], string>
>;

export type PersonInput = {
	nameEn: string;
	nameKm: string | null;
	tier: string;
	isPublic: boolean;
	slug: string | null;
	photoMediaId: number | null;
	staffNo: string | null;
	sex: string | null;
	phone: string | null;
	email: string | null;
	program: string | null;
	sort: number;
	translations: PersonTranslation[];
};

async function personText(
	db: DB,
	ids: number[],
): Promise<Map<number, Record<string, Record<string, string>>>> {
	const byId = new Map<number, Record<string, Record<string, string>>>();
	for (const id of ids) byId.set(id, {});
	if (ids.length === 0) return byId;
	const rows = await db
		.select({
			entityId: translations.entityId,
			field: translations.field,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "person"),
				inArray(translations.entityId, ids),
			),
		);
	for (const r of rows) {
		const byLang = byId.get(r.entityId);
		if (!byLang) continue;
		byLang[r.lang] ??= {};
		byLang[r.lang][r.field] = r.value;
	}
	return byId;
}

/**
 * Every person, with each language's position: the list column shows the default
 * language's and the search box reaches all of them.
 */
export async function adminListPeople(db: DB) {
	const rows = await db
		.select()
		.from(people)
		.where(eq(people.tenantId, TENANT))
		.orderBy(asc(people.tier), asc(people.sort));
	const withUrl = await attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
	const defaultLang = await getDefaultLang(db);
	const text = await personText(
		db,
		withUrl.map((r) => r.id),
	);
	return withUrl.map((r) => {
		const byLang = text.get(r.id) ?? {};
		const positions: Record<string, string> = {};
		for (const [lang, fields] of Object.entries(byLang))
			if (fields.position) positions[lang] = fields.position;
		return { ...r, position: positions[defaultLang] ?? "", positions };
	});
}

export async function getPerson(db: DB, id: number) {
	const [p] = await db
		.select()
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)))
		.limit(1);
	if (!p) return null;
	return { ...p, translations: (await personText(db, [id])).get(id) ?? {} };
}

const cols = (input: PersonInput) => ({
	nameEn: input.nameEn,
	nameKm: input.nameKm ?? null,
	tier: input.tier,
	isPublic: input.isPublic,
	slug: input.slug ?? null,
	photoMediaId: input.photoMediaId ?? null,
	staffNo: input.staffNo ?? null,
	sex: input.sex ?? null,
	phone: input.phone ?? null,
	email: input.email ?? null,
	program: input.program ?? null,
	sort: input.sort,
});

async function writePersonText(
	db: DB,
	id: number,
	byLang: PersonTranslation[],
) {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "person"),
				eq(translations.entityId, id),
				inArray(translations.field, [...PERSON_TEXT_FIELDS]),
			),
		);
	const rows = byLang.flatMap((tr) =>
		PERSON_TEXT_FIELDS.filter((field) => (tr[field] ?? "") !== "").map(
			(field) => ({
				tenantId: TENANT,
				entityType: "person",
				entityId: id,
				field,
				lang: tr.lang,
				value: tr[field] as string,
			}),
		),
	);
	if (rows.length) await db.insert(translations).values(rows);
}

export async function createPerson(
	db: DB,
	input: PersonInput,
): Promise<number> {
	const [row] = await db
		.insert(people)
		.values({ tenantId: TENANT, ...cols(input) })
		.returning({ id: people.id });
	await writePersonText(db, row.id, input.translations);
	return row.id;
}

export async function updatePerson(
	db: DB,
	id: number,
	input: PersonInput,
): Promise<void> {
	await db
		.update(people)
		.set({ ...cols(input), updatedAt: new Date().toISOString() })
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)));
	await writePersonText(db, id, input.translations);
}

// narrow on purpose: the public grid holds no other field to send back
export async function setPersonPhoto(
	db: DB,
	id: number,
	photoMediaId: number | null,
): Promise<boolean> {
	const rows = await db
		.update(people)
		.set({ photoMediaId, updatedAt: new Date().toISOString() })
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)))
		.returning({ id: people.id });
	return rows.length > 0;
}

export async function deletePerson(db: DB, id: number): Promise<void> {
	await db
		.delete(translations)
		.where(
			and(eq(translations.entityType, "person"), eq(translations.entityId, id)),
		);
	await db
		.delete(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)));
}
