import { and, eq, inArray } from "drizzle-orm";

import { LANGS } from "#/lib/i18n-config";
import type { DB } from "../db";
import { languages, translations, uiStrings } from "../schema";

const TENANT = 1;

/** Map of entityId -> { field: resolvedValue }. */
export type TranslationMap = Map<number, Record<string, string>>;

/** Map of entityId -> fields showing the default language because `lang` had no row. */
export type FallbackMap = Map<number, string[]>;

/** Enabled languages, ordered for the switcher. */
export function listLanguages(db: DB) {
	return db
		.select()
		.from(languages)
		.where(eq(languages.enabled, true))
		.orderBy(languages.sort);
}

/** The fallback language code (defaults to 'en' if none flagged). */
export async function getDefaultLang(db: DB): Promise<string> {
	const [row] = await db
		.select({ code: languages.code })
		.from(languages)
		.where(eq(languages.isDefault, true))
		.limit(1);
	return row?.code ?? "en";
}

/**
 * Resolved fields plus, per entity, which of them fell back.
 * An inline editor that cannot tell a translation from a fallback writes Khmer into the English row.
 */
export async function resolveWithFallback(
	db: DB,
	entityType: string,
	ids: number[],
	lang: string,
): Promise<{ values: TranslationMap; fallback: FallbackMap }> {
	const values: TranslationMap = new Map();
	const fallback: FallbackMap = new Map();
	if (ids.length === 0) return { values, fallback };
	for (const id of ids) {
		values.set(id, {});
		fallback.set(id, []);
	}

	const defaultLang = await getDefaultLang(db);
	const wanted = Array.from(new Set([defaultLang, lang]));

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
				eq(translations.entityType, entityType),
				inArray(translations.entityId, ids),
				inArray(translations.lang, wanted),
			),
		);

	// Default first, then let the requested language override.
	for (const r of rows) {
		if (r.lang !== defaultLang) continue;
		const fields = values.get(r.entityId);
		if (fields) fields[r.field] = r.value;
	}
	if (lang !== defaultLang) {
		const translated = new Set<string>();
		for (const r of rows) {
			if (r.lang !== lang) continue;
			const fields = values.get(r.entityId);
			if (fields) fields[r.field] = r.value;
			translated.add(`${r.entityId}:${r.field}`);
		}
		for (const [id, fields] of values) {
			fallback.set(
				id,
				Object.keys(fields).filter((f) => !translated.has(`${id}:${f}`)),
			);
		}
	}
	return { values, fallback };
}

export async function resolveTranslations(
	db: DB,
	entityType: string,
	ids: number[],
	lang: string,
): Promise<TranslationMap> {
	const { values } = await resolveWithFallback(db, entityType, ids, lang);
	return values;
}

/** Convenience: resolved fields for a single entity. */
export async function resolveOne(
	db: DB,
	entityType: string,
	id: number,
	lang: string,
): Promise<Record<string, string>> {
	const map = await resolveTranslations(db, entityType, [id], lang);
	return map.get(id) ?? {};
}

/** `resolveOne` with the fallback list the inline editor needs. */
export async function resolveOneWithFallback(
	db: DB,
	entityType: string,
	id: number,
	lang: string,
): Promise<{ fields: Record<string, string>; fallback: string[] }> {
	const { values, fallback } = await resolveWithFallback(
		db,
		entityType,
		[id],
		lang,
	);
	return { fields: values.get(id) ?? {}, fallback: fallback.get(id) ?? [] };
}

/** The UI-string dictionary for `lang`, with per-key fallback to the default language. */
export async function getUiStrings(
	db: DB,
	lang: string,
): Promise<{ strings: Record<string, string>; fallback: string[] }> {
	const defaultLang = await getDefaultLang(db);
	const wanted = Array.from(new Set([defaultLang, lang]));
	const rows = await db
		.select({
			key: uiStrings.key,
			lang: uiStrings.lang,
			value: uiStrings.value,
		})
		.from(uiStrings)
		.where(
			and(eq(uiStrings.tenantId, TENANT), inArray(uiStrings.lang, wanted)),
		);

	const out: Record<string, string> = {};
	for (const r of rows) if (r.lang === defaultLang) out[r.key] = r.value;
	const fallback: string[] = [];
	if (lang !== defaultLang) {
		const translated = new Set<string>();
		for (const r of rows) {
			if (r.lang !== lang) continue;
			out[r.key] = r.value;
			translated.add(r.key);
		}
		for (const key of Object.keys(out))
			if (!translated.has(key)) fallback.push(key);
	}
	return { strings: out, fallback };
}

export type I18nBootstrap = {
	lang: string;
	languages: { code: string; name: string; nativeName: string }[];
	strings: Record<string, string>;
	/** keys serving the default language because `lang` has no row */
	stringsFallback: string[];
};

export async function bootstrapI18n(
	db: DB,
	requestedLang: string,
): Promise<I18nBootstrap> {
	// only what the router can serve: offering /fr/ in the switcher when LANGS has
	// no prefix for it sends every visitor who picks it to a 404
	const langs = (await listLanguages(db)).filter((l) => LANGS.includes(l.code));
	const defaultLang = await getDefaultLang(db);
	const active = langs.some((l) => l.code === requestedLang)
		? requestedLang
		: defaultLang;
	const { strings, fallback } = await getUiStrings(db, active);
	return {
		lang: active,
		languages: langs.map((l) => ({
			code: l.code,
			name: l.name,
			nativeName: l.nativeName,
		})),
		strings,
		stringsFallback: fallback,
	};
}
