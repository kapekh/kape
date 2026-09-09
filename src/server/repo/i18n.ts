import { and, eq, getTableName, inArray, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import { LANGS } from "#/lib/i18n-config";
import { defaultUiStrings } from "#/lib/ui-strings.default";
import type { DB } from "../db";
import { languages, translations, uiStrings } from "../schema";

const TENANT = 1;

/** Map of entityId -> { field: resolvedValue }. */
export type TranslationMap = Map<number, Record<string, string>>;

/** Map of entityId -> fields showing the default language because `lang` had no row. */
export type FallbackMap = Map<number, string[]>;

/** One entity's editable text, per language: `{ lang, field: value }`. */
export type EntityText<F extends string> = { lang: string } & Partial<
	Record<F, string>
>;

/** Map of entityId -> lang -> { field: value }, every stored language. */
export type TextByLang = Map<number, Record<string, Record<string, string>>>;

/**
 * Every stored language of the given entities' text, narrowed to `fields` when
 * the caller names them — a list that shows a name has no use for a rich-text
 * body it would only ship to the browser.
 * The admin screens edit all languages at once, so they cannot use the resolver.
 */
export async function textByLang(
	db: DB,
	entityType: string,
	ids: number[],
	fields?: readonly string[],
): Promise<TextByLang> {
	const byId: TextByLang = new Map();
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
				eq(translations.entityType, entityType),
				inArray(translations.entityId, ids),
				fields?.length ? inArray(translations.field, [...fields]) : undefined,
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

/** One entity's text: the default language's values, and every language's. */
export type EntityTextView = {
	text: Record<string, string>;
	byLang: Record<string, Record<string, string>>;
};

/**
 * What every admin list and edit screen reads: each row named in the default
 * language, with the other languages beside it for the editor's tabs and the
 * list's search box.
 */
export async function readEntityText(
	db: DB,
	entityType: string,
	ids: number[],
	fields?: readonly string[],
): Promise<{ defaultLang: string; textOf: (id: number) => EntityTextView }> {
	const [defaultLang, byId] = await Promise.all([
		getDefaultLang(db),
		textByLang(db, entityType, ids, fields),
	]);
	return {
		defaultLang,
		textOf: (id) => {
			const byLang = byId.get(id) ?? {};
			return { text: byLang[defaultLang] ?? {}, byLang };
		},
	};
}

/** Replace one entity's rows for `fields`. A blank value stores no row. */
export async function writeEntityText<F extends string>(
	db: DB,
	entityType: string,
	id: number,
	fields: readonly F[],
	byLang: readonly EntityText<F>[],
): Promise<void> {
	const rows = byLang.flatMap((tr) =>
		fields
			.map((field) => ({ field, value: (tr[field] ?? "").trim() }))
			.filter(({ value }) => value !== "")
			.map(({ field, value }) => ({
				tenantId: TENANT,
				entityType,
				entityId: id,
				field,
				lang: tr.lang,
				value,
			})),
	);
	// one transaction: a failure between the two leaves the record with no name in any language
	db.transaction((tx) => {
		tx.delete(translations)
			.where(
				and(
					eq(translations.entityType, entityType),
					eq(translations.entityId, id),
					inArray(translations.field, [...fields]),
				),
			)
			.run();
		if (rows.length) tx.insert(translations).values(rows).run();
	});
}

/** Drop every translation row of one entity, or of a whole subtree, for a delete. */
export async function deleteEntityText(
	db: DB,
	entityType: string,
	id: number | number[],
): Promise<void> {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, entityType),
				Array.isArray(id)
					? inArray(translations.entityId, id)
					: eq(translations.entityId, id),
			),
		);
}

/** Enabled languages, ordered for the switcher. */
export function listLanguages(db: DB) {
	return db
		.select()
		.from(languages)
		.where(eq(languages.enabled, true))
		.orderBy(languages.sort);
}

/**
 * One entity's default-language value, as SQL a surrounding query can select or
 * order by — for a label wanted where no language has been asked for.
 */
export const defaultLangText = (
	entityType: string,
	id: SQLiteColumn,
	field: string,
) => {
	// spelled out, not `${id}`: a bare column name inside the subquery binds to
	// translations.id, and the correlation silently yields null
	const outer = sql`${sql.identifier(getTableName(id.table))}.${sql.identifier(id.name)}`;
	return sql<
		string | null
	>`(select value from translations where entity_type = ${entityType} and entity_id = ${outer} and field = ${field} and lang = coalesce((select code from languages where is_default = 1 limit 1), 'en'))`;
};

const defaultLangOf = new WeakMap<DB, string>();

/** Forget the memoised default language. Every writer of `languages` calls this. */
export function forgetDefaultLang(db: DB): void {
	defaultLangOf.delete(db);
}

/**
 * The fallback language code (defaults to 'en' if none flagged), memoised:
 * rendering one page asks for it a dozen times and it changes only from the
 * languages screen.
 */
export async function getDefaultLang(db: DB): Promise<string> {
	const memo = defaultLangOf.get(db);
	if (memo !== undefined) return memo;
	const [row] = await db
		.select({ code: languages.code })
		.from(languages)
		.where(eq(languages.isDefault, true))
		.limit(1);
	// an uninstalled database has no answer yet, only the fallback — nothing to remember
	if (!row?.code) return "en";
	defaultLangOf.set(db, row.code);
	return row.code;
}

/**
 * Every list, link and search names a record by the default language's row, so
 * the field a record is named by — `name` for most, `title` for others — has to
 * be there in that language.
 */
export async function requireDefaultText(
	db: DB,
	byLang: readonly EntityText<string>[],
	what: string,
	field = "name",
): Promise<void> {
	const lang = await getDefaultLang(db);
	if (!byLang.find((tr) => tr.lang === lang)?.[field]?.trim())
		throw new Error(
			`A ${what} needs a ${field} in the default language (${lang}); every list and link uses it.`,
		);
}

/**
 * Resolved fields plus, per entity, which of them fell back.
 * An inline editor that cannot tell a translation from a fallback writes Khmer into the English row.
 */
export async function resolveWithFallback(
	db: DB,
	entityType: string,
	ids: number[],
	requested?: string,
): Promise<{ values: TranslationMap; fallback: FallbackMap }> {
	const values: TranslationMap = new Map();
	const fallback: FallbackMap = new Map();
	if (ids.length === 0) return { values, fallback };
	for (const id of ids) {
		values.set(id, {});
		fallback.set(id, []);
	}

	const defaultLang = await getDefaultLang(db);
	const lang = requested ?? defaultLang;
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

/** Resolved fields for `lang`, or for the default language when none is asked for. */
export async function resolveTranslations(
	db: DB,
	entityType: string,
	ids: number[],
	lang?: string,
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

const shippedDefault = (key: string, lang: string): string | undefined =>
	(defaultUiStrings[key] as Record<string, string | undefined> | undefined)?.[
		lang
	];

/**
 * The UI-string dictionary for `lang`, with per-key fallback to the default language.
 *
 * The shipped dictionary sits under the stored rows: a reset deletes the row, and without this
 * the key would drop out of the payload and the visitor would read the call site's English.
 */
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

	const stored = new Map<string, Record<string, string>>();
	for (const r of rows) {
		const forKey = stored.get(r.key) ?? {};
		forKey[r.lang] = r.value;
		stored.set(r.key, forKey);
	}

	const out: Record<string, string> = {};
	const fallback: string[] = [];
	const keys = new Set([...Object.keys(defaultUiStrings), ...stored.keys()]);
	for (const key of keys) {
		const own = stored.get(key)?.[lang] ?? shippedDefault(key, lang);
		if (own !== undefined) {
			out[key] = own;
			continue;
		}
		const other =
			stored.get(key)?.[defaultLang] ?? shippedDefault(key, defaultLang);
		if (other === undefined) continue;
		out[key] = other;
		if (lang !== defaultLang) fallback.push(key);
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
