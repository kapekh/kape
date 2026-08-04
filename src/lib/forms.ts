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
	| "select"
	| "checkbox"
	| "file"
	| "richtext"
	| "content";

export type FormField = {
	key: string; // stable column key, e.g. "graduation_year"
	label: string;
	labelKm?: string;
	type: FormFieldType;
	required?: boolean;
	placeholder?: string;
	options?: string[]; // for `select`
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
	{ value: "select", label: "Dropdown" },
	{ value: "checkbox", label: "Checkbox (e.g. consent)" },
	{ value: "file", label: "File upload" },
	{ value: "content", label: "Content / instructions (no input)" },
];

/** Field types that are author content, not respondent inputs (no submission column). */
export function isContentField(f: { type: FormFieldType }): boolean {
	return f.type === "content";
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
		if (f.type === "content") continue; // author content, not an input
		const raw = values[f.key];
		const v = typeof raw === "string" ? raw.trim() : raw;
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
