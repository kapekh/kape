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
