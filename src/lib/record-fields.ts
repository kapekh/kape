// one definition of what updateField takes, so the boxes a page offers and the
// checks the server makes cannot drift apart. no server imports: the browser
// bundle reads this too

export const TRANSLATED_FIELDS: Record<string, readonly string[]> = {
	page: ["title", "excerpt", "body"],
	post: ["title", "excerpt", "body"],
	person: ["name", "position", "bio"],
	project: ["name", "summary", "body"],
};

// a rich body is stored as prosemirror json, which no plain-text box can edit
export const RICH_TEXT = new Set(["body", "bio"]);

const lines = (entity: string): readonly string[] =>
	(TRANSLATED_FIELDS[entity] ?? []).filter((f) => !RICH_TEXT.has(f));

/** What a listing may offer on a record it pulled in. A page's own fields belong
 *  to its route, so it is not here. */
export const ROW_FIELDS: Record<string, readonly string[]> = {
	post: lines("post"),
	project: lines("project"),
	person: lines("person"),
};

/** True when `updateField` takes this field of this record. */
export function isRowField(entity: string, field: string): boolean {
	return ROW_FIELDS[entity]?.includes(field) ?? false;
}
