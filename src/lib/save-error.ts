type ZodIssue = {
	path?: unknown[];
	message?: string;
	code?: string;
	minimum?: number;
};

const NETWORK =
	/^(failed to fetch|networkerror|load failed|the operation was aborted)/i;

/** tRPC sends the code as the whole message when the throw site gives no text. */
const BARE_CODE = /^[A-Z][A-Z_]{2,}$/;

const CODE_SENTENCES: Record<string, string> = {
	UNAUTHORIZED:
		"Your session has expired. Sign in again in another tab, then save. Nothing you typed has been lost.",
	FORBIDDEN:
		"Your account does not have permission to do this. Ask an administrator to grant it.",
	NOT_FOUND:
		"This record no longer exists. It may have been deleted in another tab.",
	CONFLICT: "Someone else changed this record. Reload the page and try again.",
	TOO_MANY_REQUESTS: "Too many attempts. Wait a moment and try again.",
	TIMEOUT: "The server took too long to answer. Try again.",
	PAYLOAD_TOO_LARGE: "That is too large to save. Remove something and retry.",
};

const CONSTRAINT = /^(FOREIGN KEY|UNIQUE) constraint failed(?::\s*(.*))?$/;

type Action = "save" | "delete";

function humanise(name: string): string {
	const words = name
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/_/g, " ")
		.toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function fieldName(path: unknown[] | undefined): string {
	const last = path?.filter((p) => typeof p === "string").pop();
	return last ? humanise(last) : "This form";
}

function describe(issue: ZodIssue): string {
	const field = fieldName(issue.path);
	if (issue.code === "invalid_type") return `${field} is required.`;
	if (issue.code === "too_small" && (issue.minimum ?? 0) <= 1)
		return `${field} is required.`;
	return `${field}: ${issue.message ?? "is not valid"}`;
}

function zodIssues(message: string): ZodIssue[] {
	if (!message.trimStart().startsWith("[")) return [];
	try {
		const parsed: unknown = JSON.parse(message);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(i): i is ZodIssue => !!i && typeof i === "object" && "code" in i,
		);
	} catch {
		return [];
	}
}

function constraintSentence(message: string, action: Action): string | null {
	const m = CONSTRAINT.exec(message);
	if (!m) return null;
	// A foreign key fails in opposite directions: saving, something this record
	// points at is gone; deleting, something still points at this one. Telling a
	// deleter to "pick it again" sends them nowhere.
	if (m[1] === "FOREIGN KEY")
		return action === "delete"
			? "Something else still points at this record. Remove those links first, then try again."
			: "Something this record points at was deleted while you were editing. Reload the page, pick it again, and save.";
	const column = (m[2] ?? "")
		.split(",")
		.map((c) => c.trim().split(".").pop() ?? "")
		.filter((c) => c && c !== "tenant_id")
		.pop();
	return column
		? `Another record already uses that ${humanise(column).toLowerCase()}. Choose a different one.`
		: "Another record already uses one of these values. Change it and save again.";
}

/**
 * A rejected admin save otherwise toasts whatever crossed the wire: a tRPC
 * input rejection arrives as a serialised ZodError array, an auth failure as
 * the bare code "UNAUTHORIZED", a stale reference as a raw SQLite constraint
 * string, and an aborted request as "Failed to fetch".
 */
export function saveErrorMessage(
	error: unknown,
	action: Action = "save",
): string {
	if (!(error instanceof Error) || !error.message)
		return action === "delete" ? "Could not delete." : "Could not save.";
	const message = error.message;

	if (NETWORK.test(message))
		return "Could not reach the server. Check your connection and try again.";

	if (BARE_CODE.test(message))
		return (
			CODE_SENTENCES[message] ??
			"Could not save. Try again, or reload the page if it keeps failing."
		);

	const constraint = constraintSentence(message, action);
	if (constraint) return constraint;

	const issues = zodIssues(message);
	if (!issues.length) return message;
	const shown = issues.slice(0, 3).map(describe).join(" ");
	const rest = issues.length - 3;
	return rest > 0 ? `${shown} And ${rest} more.` : shown;
}
