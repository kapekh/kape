import { and, asc, eq, ne } from "drizzle-orm";

import { DEFAULT_LANG } from "#/lib/i18n-config";
import type { DB } from "../db";
import { renderBody } from "../richtext";
import { media, people, translations } from "../schema";
import { resolveOneWithFallback } from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

type NameColumns = { nameEn: string; nameKm: string | null };

const translatedName = (r: NameColumns, lang: string) =>
	lang === "km" ? r.nameKm : null;

const pickName = (r: NameColumns, lang: string) =>
	translatedName(r, lang) || r.nameEn;

/* --------------------------------- public --------------------------------- */

export type PersonItem = {
	id: number;
	slug: string;
	name: string;
	position: string;
	section: string;
	photoUrl: string | null;
};

/** Public team / leadership (isPublic), optionally filtered to a tier. */
export async function listPeople(db: DB, lang: string): Promise<PersonItem[]> {
	const rows = await db
		.select()
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.isPublic, true)))
		.orderBy(asc(people.sort));
	const withUrl = await attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
	return withUrl.map((r) => ({
		id: r.id,
		slug: r.slug ?? "",
		name: pickName(r, lang),
		position: r.position ?? "",
		section: r.tier,
		photoUrl: r.photoUrl,
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
	return withUrl.map((r) => ({
		id: r.id,
		slug: r.slug ?? "",
		name: pickName(r, lang),
		position: r.position ?? "",
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
	// name is a column pair, not a translations row, so its fallback is invisible to the resolver
	if (lang !== DEFAULT_LANG && !translatedName(p, lang)) fallback.push("name");
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
		position: p.position ?? "",
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

export type PersonInput = {
	nameEn: string;
	nameKm: string | null;
	position: string | null;
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
	bio: { en: string; km: string };
};

export async function adminListPeople(db: DB) {
	const rows = await db
		.select()
		.from(people)
		.where(eq(people.tenantId, TENANT))
		.orderBy(asc(people.tier), asc(people.sort));
	return attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
}

export async function getPerson(db: DB, id: number) {
	const [p] = await db
		.select()
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)))
		.limit(1);
	if (!p) return null;
	const rows = await db
		.select({ lang: translations.lang, value: translations.value })
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "person"),
				eq(translations.entityId, id),
				eq(translations.field, "bio"),
			),
		);
	const bio: Record<string, string> = {};
	for (const r of rows) bio[r.lang] = r.value;
	return { ...p, bio };
}

const cols = (input: PersonInput) => ({
	nameEn: input.nameEn,
	nameKm: input.nameKm ?? null,
	position: input.position ?? null,
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

async function writeBio(db: DB, id: number, bio: { en: string; km: string }) {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "person"),
				eq(translations.entityId, id),
				eq(translations.field, "bio"),
			),
		);
	const rows = [] as {
		tenantId: number;
		entityType: string;
		entityId: number;
		field: string;
		lang: string;
		value: string;
	}[];
	if (bio.en)
		rows.push({
			tenantId: TENANT,
			entityType: "person",
			entityId: id,
			field: "bio",
			lang: "en",
			value: bio.en,
		});
	if (bio.km)
		rows.push({
			tenantId: TENANT,
			entityType: "person",
			entityId: id,
			field: "bio",
			lang: "km",
			value: bio.km,
		});
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
	await writeBio(db, row.id, input.bio);
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
	await writeBio(db, id, input.bio);
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
			and(
				eq(translations.entityType, "person"),
				eq(translations.entityId, id),
				eq(translations.field, "bio"),
			),
		);
	await db
		.delete(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)));
}
