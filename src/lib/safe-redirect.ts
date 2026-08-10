/**
 * Sanitises a post-login `?redirect=` target.
 *
 * The value arrives from the URL, so it is attacker-controlled: anything that is
 * not a plain same-site path is refused. `//evil.tld` matters as much as
 * `https://evil.tld` — a browser reads a protocol-relative URL as another origin,
 * and every major browser folds a backslash to a slash, so `/\evil.tld` is the
 * same trick spelled differently.
 *
 * Written as a codepoint scan rather than a regex character class: the range
 * that matters here is the control characters, and a mistyped `-` inside a class
 * silently widens it to most of ASCII.
 */
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
