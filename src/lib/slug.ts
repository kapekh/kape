// anything that changes how a URL parses gives an address the site cannot serve

const RULES: { broken: (segment: string) => boolean; why: string }[] = [
	{ broken: (s) => /\s/.test(s), why: "cannot contain spaces" },
	{ broken: (s) => s.includes("/"), why: "cannot contain a slash" },
	{ broken: (s) => s.includes("."), why: "cannot contain a dot" },
	{ broken: (s) => s !== s.toLowerCase(), why: "must be lowercase" },
	{
		broken: (s) => s.startsWith("-") || s.endsWith("-"),
		why: "cannot start or end with a dash",
	},
];

/** Long enough for any real page title, short enough to keep `<title>` and the parent picker readable. */
export const PAGE_TITLE_MAX = 120;

/** The nearest legal segment, for suggesting what the author probably meant. */
export function toSegment(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/[^\p{L}\p{N}-]+/gu, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "");
}

// validates what is about to be written: rows stored before this rule keep their segment until edited
export function segmentProblem(segment: string): string | null {
	if (!segment) return "The URL segment is required.";
	const rule = RULES.find((r) => r.broken(segment));
	if (!rule) return null;
	const suggestion = toSegment(segment);
	return suggestion && suggestion !== segment
		? `The URL segment ${rule.why}. Try "${suggestion}".`
		: `The URL segment ${rule.why}.`;
}
