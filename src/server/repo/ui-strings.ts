import { and, eq } from "drizzle-orm";

import { defaultUiStrings } from "#/lib/ui-strings.default";
import type { DB } from "../db";
import { languages, uiStrings } from "../schema";
import { getDefaultLang, listLanguages } from "./i18n";

const TENANT = 1;

export type UiStringRow = {
	key: string;
	/** Shipped default per active language; what an empty field falls back to. */
	defaults: Record<string, string>;
	/** Only the languages this site has actually overridden. */
	values: Record<string, string>;
};

export type UiStringList = {
	languages: { code: string; name: string; nativeName: string }[];
	rows: UiStringRow[];
};

const shippedDefault = (key: string, lang: string): string | undefined =>
	(defaultUiStrings[key] as Record<string, string | undefined> | undefined)?.[
		lang
	];

/** Every key a component reads or this site has written, in every active language. */
export async function listUiStrings(db: DB): Promise<UiStringList> {
	const langs = await listLanguages(db);
	const fallback = await getDefaultLang(db);
	const stored = await db
		.select({
			key: uiStrings.key,
			lang: uiStrings.lang,
			value: uiStrings.value,
		})
		.from(uiStrings)
		.where(eq(uiStrings.tenantId, TENANT));

	const values = new Map<string, Record<string, string>>();
	for (const row of stored) {
		const forKey = values.get(row.key) ?? {};
		forKey[row.lang] = row.value;
		values.set(row.key, forKey);
	}

	const keys = [
		...new Set([...Object.keys(defaultUiStrings), ...values.keys()]),
	].sort();

	return {
		languages: langs.map((l) => ({
			code: l.code,
			name: l.name,
			nativeName: l.nativeName,
		})),
		rows: keys.map((key) => {
			const defaults: Record<string, string> = {};
			for (const l of langs) {
				const own = shippedDefault(key, l.code);
				defaults[l.code] = own ?? shippedDefault(key, fallback) ?? "";
			}
			return { key, defaults, values: values.get(key) ?? {} };
		}),
	};
}

/**
 * A key outside the shipped dictionary and outside the table is a typo: no
 * component reads it, so the row would sit here for ever changing nothing.
 */
async function requireKnownKey(db: DB, key: string): Promise<void> {
	if (Object.hasOwn(defaultUiStrings, key)) return;
	const [row] = await db
		.select({ key: uiStrings.key })
		.from(uiStrings)
		.where(and(eq(uiStrings.tenantId, TENANT), eq(uiStrings.key, key)))
		.limit(1);
	if (!row)
		throw new Error(
			`No component reads "${key}", so a value stored against it would never appear. Keys come from the code, not from here.`,
		);
}

async function requireLanguage(db: DB, lang: string): Promise<void> {
	const [row] = await db
		.select({ code: languages.code })
		.from(languages)
		.where(eq(languages.code, lang))
		.limit(1);
	if (!row) throw new Error(`"${lang}" is not a language on this site.`);
}

/**
 * Drop the override so the key falls back to its shipped default again. The row
 * goes rather than being rewritten with that default: a stored copy stops
 * tracking the default, and the next release's wording never reaches the site.
 */
export async function resetUiString(
	db: DB,
	key: string,
	lang: string,
): Promise<void> {
	await requireKnownKey(db, key);
	await db
		.delete(uiStrings)
		.where(
			and(
				eq(uiStrings.tenantId, TENANT),
				eq(uiStrings.key, key),
				eq(uiStrings.lang, lang),
			),
		);
}

/** Write one override. An empty value is a reset, not a blank string on screen. */
export async function setUiString(
	db: DB,
	key: string,
	lang: string,
	value: string,
): Promise<{ reset: boolean }> {
	await requireKnownKey(db, key);
	await requireLanguage(db, lang);
	const trimmed = value.trim();
	if (!trimmed) {
		await resetUiString(db, key, lang);
		return { reset: true };
	}
	await db
		.insert(uiStrings)
		.values({ tenantId: TENANT, key, lang, value: trimmed })
		.onConflictDoUpdate({
			target: [uiStrings.tenantId, uiStrings.key, uiStrings.lang],
			set: { value: trimmed },
		});
	return { reset: false };
}
