import { and, asc, eq, ne, or } from "drizzle-orm";

import type { DB } from "../db";
import { renderBody } from "../richtext";
import { media, people } from "../schema";
import {
	deleteEntityText,
	type EntityText,
	readEntityText,
	requireDefaultText,
	resolveOneWithFallback,
	resolveTranslations,
	resolveWithFallback,
	textByLang,
	writeEntityText,
} from "./i18n";
import { attachMediaUrl } from "./media-util";

const TENANT = 1;

/** Person text that lives in `translations`, not in a column of `people`. */
export const PERSON_TEXT_FIELDS = ["name", "position", "bio"] as const;

// a bio is prosemirror json, which no inline box can edit, so its fallback is not offered
const INLINE_TEXT_FIELDS = new Set<string>(["name", "position"]);

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
		name: values.get(r.id)?.name ?? "",
		position: values.get(r.id)?.position ?? "",
		section: r.tier,
		photoUrl: r.photoUrl,
		i18nFallback: (fallback.get(r.id) ?? []).filter((f) =>
			INLINE_TEXT_FIELDS.has(f),
		),
		updatedAt: r.updatedAt,
	}));
}

/** One public person by id or slug, shaped exactly as `listPeople` shapes a row. */
export async function getPersonItem(
	db: DB,
	ref: string,
	lang: string,
): Promise<PersonItem | null> {
	const asId = Number(ref);
	const byRef =
		Number.isSafeInteger(asId) && String(asId) === ref
			? or(eq(people.id, asId), eq(people.slug, ref))
			: eq(people.slug, ref);
	const [row] = await db
		.select()
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.isPublic, true), byRef))
		.orderBy(asc(people.sort))
		.limit(1);
	if (!row) return null;
	const [withUrl] = await attachMediaUrl(db, [row], "photoMediaId", "photoUrl");
	const { fields, fallback } = await resolveOneWithFallback(
		db,
		"person",
		row.id,
		lang,
	);
	return {
		id: row.id,
		slug: row.slug ?? "",
		name: fields.name ?? "",
		position: fields.position ?? "",
		section: row.tier,
		photoUrl: withUrl.photoUrl,
		i18nFallback: fallback.filter((f) => INLINE_TEXT_FIELDS.has(f)),
		updatedAt: row.updatedAt,
	};
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
		name: text.get(r.id)?.name ?? "",
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
		name: f.name ?? "",
		position: f.position ?? "",
		tier: p.tier,
		program: p.program ?? "",
		photoUrl,
		bodyHtml: renderBody(f.bio ?? null),
		i18nFallback: fallback,
		colleagues: await colleaguesOf(db, p, lang),
	};
}

/** Full internal directory (everyone), named in every language it has. */
export async function staffDirectory(db: DB) {
	const rows = await db
		.select()
		.from(people)
		.where(eq(people.tenantId, TENANT))
		.orderBy(asc(people.sort));
	const withUrl = await attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
	const text = await textByLang(
		db,
		"person",
		rows.map((r) => r.id),
		["name"],
	);
	return withUrl.map((r) => {
		const names: Record<string, string> = {};
		for (const [lang, fields] of Object.entries(text.get(r.id) ?? {}))
			if (fields.name) names[lang] = fields.name;
		return { ...r, names };
	});
}

/* --------------------------------- admin ---------------------------------- */

export type PersonTranslation = EntityText<(typeof PERSON_TEXT_FIELDS)[number]>;

export type PersonInput = {
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

/**
 * Every person, with each language's text: the list names them in the default
 * language, shows the others beside it, and the search box reaches all of them.
 */
export async function adminListPeople(db: DB) {
	const rows = await db
		.select()
		.from(people)
		.where(eq(people.tenantId, TENANT))
		.orderBy(asc(people.tier), asc(people.sort));
	const withUrl = await attachMediaUrl(db, rows, "photoMediaId", "photoUrl");
	// no bio: the list only names and searches, and a prosemirror body is most of the payload
	const { defaultLang, textOf } = await readEntityText(
		db,
		"person",
		withUrl.map((r) => r.id),
		["name", "position"],
	);
	return withUrl.map((r) => {
		const { text, byLang } = textOf(r.id);
		return {
			...r,
			name: text.name ?? "",
			position: text.position ?? "",
			altNames: Object.entries(byLang)
				.filter(([lang, fields]) => lang !== defaultLang && fields.name)
				.map(([lang, fields]) => ({ lang, value: fields.name })),
			translations: byLang,
		};
	});
}

export async function getPerson(db: DB, id: number) {
	const [p] = await db
		.select()
		.from(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)))
		.limit(1);
	if (!p) return null;
	return {
		...p,
		translations: (await textByLang(db, "person", [id])).get(id) ?? {},
	};
}

const cols = (input: PersonInput) => ({
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

export async function createPerson(
	db: DB,
	input: PersonInput,
): Promise<number> {
	await requireDefaultText(db, input.translations, "person");
	const [row] = await db
		.insert(people)
		.values({ tenantId: TENANT, ...cols(input) })
		.returning({ id: people.id });
	await writeEntityText(
		db,
		"person",
		row.id,
		PERSON_TEXT_FIELDS,
		input.translations,
	);
	return row.id;
}

export async function updatePerson(
	db: DB,
	id: number,
	input: PersonInput,
): Promise<void> {
	await requireDefaultText(db, input.translations, "person");
	await db
		.update(people)
		.set({ ...cols(input), updatedAt: new Date().toISOString() })
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)));
	await writeEntityText(
		db,
		"person",
		id,
		PERSON_TEXT_FIELDS,
		input.translations,
	);
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
	await deleteEntityText(db, "person", id);
	await db
		.delete(people)
		.where(and(eq(people.tenantId, TENANT), eq(people.id, id)));
}
