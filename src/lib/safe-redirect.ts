// attacker-controlled: //evil.tld and /\evil.tld are the same trick, browsers fold a backslash to a slash; a codepoint scan and not a character class, where a mistyped - widens it to most of ASCII
export function safeRedirect(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	if (!value.startsWith("/") || value.startsWith("//")) return undefined;
	if (value.includes("\\")) return undefined;
	for (const ch of value) {
		const code = ch.codePointAt(0) ?? 0;
		if (code < 0x20 || code === 0x7f) return undefined;
	}
	return value;
}
