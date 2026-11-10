import { ZodError } from "zod";

const label = (path: PropertyKey[]) =>
	path
		.filter((p): p is string => typeof p === "string")
		.map((p) => p.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())
		.join(" ");

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The message a form shows for input the server refused, one clause per field. */
export function readableInputError(cause: unknown): string | null {
	if (!(cause instanceof ZodError)) return null;
	const clauses = cause.issues.map((i) => {
		const field = label(i.path);
		return field ? `${sentence(field)}: ${i.message}` : i.message;
	});
	return Array.from(new Set(clauses)).join(". ");
}

/**
 * A database refusal as SQLite worded it ("UNIQUE constraint failed: posts.slug"),
 * without the SQL drizzle wraps it in or libSQL's "SQLITE_CONSTRAINT: " prefix:
 * the query is no business of an editor's, and save-error.ts keys on the wording.
 */
export function databaseError(cause: unknown): string | null {
	for (let e: unknown = cause; e instanceof Error; e = e.cause) {
		const code = (e as { code?: unknown }).code;
		if (typeof code === "string" && code.startsWith("SQLITE_"))
			return e.message.replace(/^SQLITE_[A-Z_]+: /, "");
	}
	return null;
}
