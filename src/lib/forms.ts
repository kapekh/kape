/**
 * Shared form model — a form is data (a list of fields), stored as JSON on the
 * `forms` row, rendered on the public site and edited in /admin/forms. Used by
 * both server (validation, schema typing) and client (renderer, builder).
 */
export type FormFieldType =
	| "text"
	| "textarea"
	| "email"
	| "tel"
	| "number"
	| "date"
	| "select"
	| "checkbox"
	| "checkboxes"
	| "file"
	| "richtext"
	| "content"
	| "section";

export const FORM_FIELD_TYPES = [
	"text",
	"textarea",
	"email",
	"tel",
	"number",
	"date",
	"select",
	"checkbox",
	"checkboxes",
	"file",
	"richtext",
	"content",
	"section",
] as const satisfies readonly FormFieldType[];

export type FormField = {
	key: string; // stable column key, e.g. "graduation_year"
	label: string;
	labelKm?: string;
	type: FormFieldType;
	required?: boolean;
	placeholder?: string;
	options?: string[]; // for `select` and `checkboxes`
	content?: string; // for `content` blocks: author Tiptap JSON (not an input)
	contentHtml?: string; // server-rendered HTML for `content` blocks (populated when served)
};

export const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
	{ value: "text", label: "Short text" },
	{ value: "textarea", label: "Long text" },
	{ value: "richtext", label: "Rich text answer" },
	{ value: "email", label: "Email" },
	{ value: "tel", label: "Phone" },
	{ value: "number", label: "Number" },
	{ value: "date", label: "Date" },
	{ value: "select", label: "Dropdown" },
	{ value: "checkbox", label: "Checkbox (e.g. consent)" },
	{ value: "checkboxes", label: "Checkboxes (choose any)" },
	{ value: "file", label: "File upload" },
	{ value: "content", label: "Content / instructions (no input)" },
	{ value: "section", label: "Section heading (groups what follows)" },
];

/** Field types that are author content, not respondent inputs (no submission column). */
export function isContentField(f: { type: FormFieldType }): boolean {
	return f.type === "content" || f.type === "section";
}

/** Field types whose answer is a list, stored joined rather than as one value. */
export function isMultiField(f: { type: FormFieldType }): boolean {
	return f.type === "checkboxes";
}

/** How a checkbox group's picks are joined into the single stored/exported cell. */
export const MULTI_SEPARATOR = ", ";

/** Coerce a submitted checkbox-group value (one, many, or none) to a clean list. */
export function toStringList(raw: unknown): string[] {
	const all = Array.isArray(raw) ? raw : [raw];
	return all
		.filter((v): v is string => typeof v === "string")
		.map((v) => v.trim())
		.filter(Boolean);
}

/** Render a checkbox group's picks as the one string stored in the submission. */
export function formatMultiValue(values: string[]): string {
	return values.join(MULTI_SEPARATOR);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date in YYYY-MM-DD (rejects 2025-02-30, 2025-13-01…). */
export function isIsoDate(v: string): boolean {
	if (!ISO_DATE_RE.test(v)) return false;
	const [y, m, d] = v.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return (
		dt.getUTCFullYear() === y &&
		dt.getUTCMonth() === m - 1 &&
		dt.getUTCDate() === d
	);
}

export type FormSectionGroup = {
	/** The `section` field that opens this group; null for fields before the first one. */
	heading: FormField | null;
	/** 1-based, in section order — what the renderer prints before the legend. */
	number: number;
	fields: FormField[];
};

/**
 * Split a flat field list into numbered sections. A `section` field opens a new
 * group and everything after it belongs to that group until the next one.
 */
export function groupIntoSections(fields: FormField[]): FormSectionGroup[] {
	const groups: FormSectionGroup[] = [];
	let n = 0;
	for (const f of fields) {
		if (f.type === "section") {
			groups.push({ heading: f, number: ++n, fields: [] });
			continue;
		}
		if (!groups.length) groups.push({ heading: null, number: 0, fields: [] });
		groups[groups.length - 1].fields.push(f);
	}
	return groups;
}

/** File extensions accepted for `file` fields (mirrors the server allow-list). */
export const ATTACHMENT_EXTS = [
	"png",
	"jpg",
	"jpeg",
	"webp",
	"gif",
	"avif",
	"pdf",
	"doc",
	"docx",
	"xls",
	"xlsx",
	"ppt",
	"pptx",
	"txt",
	"csv",
];
/** Max attachment size for a `file` field. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** True when a value looks like an uploaded File (works on server + client). */
function isFileLike(v: unknown): v is { size: number; name: string } {
	return (
		typeof v === "object" &&
		v !== null &&
		typeof (v as { size?: unknown }).size === "number" &&
		typeof (v as { name?: unknown }).name === "string"
	);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when a form's deadline (a YYYY-MM-DD date) has passed (end of that day). */
export function isFormClosed(deadline: string | null | undefined): boolean {
	if (!deadline) return false;
	const end = new Date(`${deadline}T23:59:59`);
	return !Number.isNaN(end.getTime()) && Date.now() > end.getTime();
}

/** Validate submitted values against a form's fields. Returns an error or null. */
export function validateSubmission(
	fields: FormField[],
	values: Record<string, unknown>,
): string | null {
	for (const f of fields) {
		if (isContentField(f)) continue; // author content, not an input
		const raw = values[f.key];
		const v = typeof raw === "string" ? raw.trim() : raw;
		if (f.type === "checkboxes") {
			// Multi-value: the wire carries a repeated key, so `raw` may be an array.
			const picked = toStringList(raw);
			if (f.required && !picked.length) return `“${f.label}” is required.`;
			const allowed = new Set(f.options ?? []);
			for (const p of picked)
				if (!allowed.has(p)) return `“${f.label}” has an invalid choice.`;
			continue;
		}
		// Only a checkbox group may arrive as a repeated key. Anything else would
		// slip past the string-guarded checks below as an array.
		if (Array.isArray(raw)) return `“${f.label}” has an invalid value.`;
		if (f.type === "richtext") {
			// Value is ProseMirror JSON; an "empty" editor still serializes a doc,
			// so treat it as filled only when it carries a text node.
			const hasText = typeof v === "string" && v.includes('"text"');
			if (f.required && !hasText) return `“${f.label}” is required.`;
			continue;
		}
		const empty =
			v == null || v === "" || v === false || (isFileLike(v) && v.size === 0);
		if (f.required && empty) return `“${f.label}” is required.`;
		if (empty) continue;
		if (f.type === "file" && isFileLike(v) && v.size > ATTACHMENT_MAX_BYTES)
			return `“${f.label}” is too large (max 10 MB).`;
		if (f.type === "email" && typeof v === "string" && !EMAIL_RE.test(v))
			return `“${f.label}” must be a valid email.`;
		if (f.type === "number" && typeof v === "string" && Number.isNaN(Number(v)))
			return `“${f.label}” must be a number.`;
		if (f.type === "date" && (typeof v !== "string" || !isIsoDate(v)))
			return `“${f.label}” must be a date (YYYY-MM-DD).`;
		if (
			f.type === "select" &&
			f.options?.length &&
			typeof v === "string" &&
			!f.options.includes(v)
		)
			return `“${f.label}” has an invalid choice.`;
	}
	return null;
}
