import { and, eq, inArray } from "drizzle-orm";

import { LANGS } from "#/lib/i18n-config";
import type { DB } from "../db";
import { languages, translations, uiStrings } from "../schema";

const TENANT = 1;

/** Map of entityId -> { field: resolvedValue }. */
export type TranslationMap = Map<number, Record<string, string>>;

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
 * Resolve translations for a set of entities of one type, in one query.
 * Each field resolves to the requested language, falling back to the default
 * language when the requested value is missing.
 */
export async function resolveTranslations(
	db: DB,
	entityType: string,
	ids: number[],
	lang: string,
): Promise<TranslationMap> {
	const out: TranslationMap = new Map();
	if (ids.length === 0) return out;
	for (const id of ids) out.set(id, {});

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
		const fields = out.get(r.entityId);
		if (fields) fields[r.field] = r.value;
	}
	if (lang !== defaultLang) {
		for (const r of rows) {
			if (r.lang !== lang) continue;
			const fields = out.get(r.entityId);
			if (fields) fields[r.field] = r.value;
		}
	}
	return out;
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

/** The UI-string dictionary for `lang`, with per-key fallback to the default language. */
export async function getUiStrings(
	db: DB,
	lang: string,
): Promise<Record<string, string>> {
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
	if (lang !== defaultLang) {
		for (const r of rows) if (r.lang === lang) out[r.key] = r.value;
	}
	return out;
}

export type I18nBootstrap = {
	lang: string;
	languages: { code: string; name: string; nativeName: string }[];
	strings: Record<string, string>;
};

/**
 * Everything the client needs to render in one round-trip: the resolved active
 * language (requested if enabled, else default), the enabled language list, and
 * the UI-string dictionary for that language.
 */
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
	const strings = await getUiStrings(db, active);
	return {
		lang: active,
		languages: langs.map((l) => ({
			code: l.code,
			name: l.name,
			nativeName: l.nativeName,
		})),
		strings,
	};
}
