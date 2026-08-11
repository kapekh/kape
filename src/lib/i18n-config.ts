// LANGS and the languages table are kept in step by hand; reportUnroutable says so when they drift
export const DEFAULT_LANG = "en";
export const LANGS = ["en", "km"]; // language prefixes the router matches

/** Warn about enabled languages the router has no prefix for. */
export function reportUnroutable(codes: string[], where: string) {
	const missing = codes.filter((c) => !LANGS.includes(c));
	if (missing.length)
		console.warn(
			`[${where}] ${missing.join(", ")} enabled in the languages table but absent from LANGS in src/lib/i18n-config.ts, so the router will not serve /${missing[0]}/`,
		);
}

// functional routes sit at fixed paths and are never language-prefixed
const FUNCTIONAL =
	/^\/(internalsources|admin|login|api|uploads)(\/|$)|^\/[^/]+\.[a-z0-9]+$/i;

export const isFunctional = (path: string) => FUNCTIONAL.test(path);

/** Active language for a pathname (default when no/unknown prefix). */
export function detectLang(pathname: string): string {
	const seg = pathname.replace(/^\/+/, "").split("/")[0];
	return LANGS.includes(seg) ? seg : DEFAULT_LANG;
}

/** Split a pathname into its language + the remaining content path (leading "/"). */
export function stripLang(pathname: string): {
	lang: string;
	path: string;
	prefixed: boolean;
} {
	const parts = pathname.replace(/^\/+/, "").split("/");
	if (LANGS.includes(parts[0])) {
		const rest = parts.slice(1).join("/");
		return { lang: parts[0], path: rest ? `/${rest}` : "/", prefixed: true };
	}
	const all = parts.join("/");
	return { lang: DEFAULT_LANG, path: all ? `/${all}` : "/", prefixed: false };
}

/** Prefix an internal content href with the language (externals + functional routes untouched). */
export function localizedHref(
	href: string | null | undefined,
	lang: string,
): string | undefined {
	if (!href) return undefined;
	if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
	if (FUNCTIONAL.test(href)) return href;
	const code = LANGS.includes(lang) ? lang : DEFAULT_LANG;
	const path = href === "/" ? "" : href.startsWith("/") ? href : `/${href}`;
	return `/${code}${path}`; // "/" → "/en" (no trailing slash)
}
