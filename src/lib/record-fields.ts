// one definition of what updateField takes, so the boxes a page offers and the
// checks the server makes cannot drift apart. no server imports: the browser
// bundle reads this too

export const TRANSLATED_FIELDS: Record<string, readonly string[]> = {
	page: ["title", "excerpt", "body"],
	post: ["title", "excerpt", "body"],
	person: ["bio"],
	project: ["name", "summary", "body"],
};

// columns of `people`, not translation rows
export const PERSON_COLUMN_FIELDS: readonly string[] = ["name", "position"];

// a name is one column per language, so a language missing here can hold none
export const PERSON_NAME_COLUMNS: Record<string, "nameEn" | "nameKm"> = {
	en: "nameEn",
	km: "nameKm",
};

// a rich body is stored as prosemirror json, which no inline box can edit
const RICH_TEXT = new Set(["body", "bio"]);

const lines = (entity: string): readonly string[] => [
	...(entity === "person" ? PERSON_COLUMN_FIELDS : []),
	...(TRANSLATED_FIELDS[entity] ?? []).filter((f) => !RICH_TEXT.has(f)),
];

/** What a listing may offer on a record it pulled in. A page's own fields belong
 *  to its route, so it is not here. */
export const ROW_FIELDS: Record<string, readonly string[]> = {
	post: lines("post"),
	project: lines("project"),
	person: lines("person"),
};

/** True when `updateField` takes this field of this record in this language. */
export function isRowField(
	entity: string,
	field: string,
	lang: string,
): boolean {
	if (!ROW_FIELDS[entity]?.includes(field)) return false;
	if (entity === "person" && field === "name")
		return Object.hasOwn(PERSON_NAME_COLUMNS, lang);
	return true;
}
