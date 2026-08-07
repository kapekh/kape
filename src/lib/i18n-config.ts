/**
 * Path-based i18n — EVERY language is prefixed, including the default
 * (/en/who-we-are/about, /km/who-we-are/about). An unprefixed content path
 * redirects to the default-language prefix (/about → /en/about, / → /en).
 * Pure helpers shared by the router, links, and the prerenderer.
 *
 * Adding a language: enable it in the admin AND add its code to LANGS.
 * The `languages` table decides which languages a site has, and the build steps
 * that can await a query — the sitemap and the prerenderer — read it. Route
 * definitions are synchronous, so the router still matches this list; the two
 * are kept in step by hand and `reportUnroutable` says so when they drift.
 */
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

// Functional routes live at fixed paths and are never language-prefixed: the
// staff-facing app, the API, and static file routes with an extension
// (/sitemap.xml, /robots.txt, /manifest.json, …). Public pages are prefixed
// even when they have their own route file — /km/contact, /km/donate.
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
