/**
 * What a page's address and title are allowed to be.
 *
 * The segment is the editable last part of a page's path, so anything that
 * changes how a URL parses - a space, a slash, a dot - produces an address the
 * site cannot serve and a `<loc>` crawlers drop from the sitemap.
 */

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

/**
 * One sentence naming the first broken rule, or null when the segment is legal.
 * Validate what is about to be written: rows stored before this rule existed
 * keep their segment until someone edits it.
 */
export function segmentProblem(segment: string): string | null {
	if (!segment) return "The URL segment is required.";
	const rule = RULES.find((r) => r.broken(segment));
	if (!rule) return null;
	const suggestion = toSegment(segment);
	return suggestion && suggestion !== segment
		? `The URL segment ${rule.why}. Try "${suggestion}".`
		: `The URL segment ${rule.why}.`;
}
