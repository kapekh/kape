/**
 * Path-based i18n — EVERY language is prefixed, including the default
 * (/en/who-we-are/about, /km/who-we-are/about). An unprefixed content path
 * redirects to the default-language prefix (/about → /en/about, / → /en).
 * Pure helpers shared by the router, links, and the prerenderer.
 *
 * Adding a language: enable it in the admin AND add its code to LANGS.
 */
export const DEFAULT_LANG = "en";
export const LANGS = ["en", "km"]; // all enabled languages, each path-prefixed

// Functional routes live at fixed paths and are never language-prefixed. This
// covers explicit route files (contact, donate, …) and any static file route
// with an extension (/sitemap.xml, /robots.txt, /manifest.json, …).
const FUNCTIONAL = /^\/(contact|donate|internalsources|admin|login|api|uploads)(\/|$)|^\/[^/]+\.[a-z0-9]+$/i;

export const isFunctional = (path: string) => FUNCTIONAL.test(path);

/** Active language for a pathname (default when no/unknown prefix). */
export function detectLang(pathname: string): string {
	const seg = pathname.replace(/^\/+/, "").split("/")[0];
	return LANGS.includes(seg) ? seg : DEFAULT_LANG;
}

/** Split a pathname into its language + the remaining content path (leading "/"). */
export function stripLang(pathname: string): { lang: string; path: string; prefixed: boolean } {
	const parts = pathname.replace(/^\/+/, "").split("/");
	if (LANGS.includes(parts[0])) {
		const rest = parts.slice(1).join("/");
		return { lang: parts[0], path: rest ? `/${rest}` : "/", prefixed: true };
	}
	const all = parts.join("/");
	return { lang: DEFAULT_LANG, path: all ? `/${all}` : "/", prefixed: false };
}

/** Prefix an internal content href with the language (externals + functional routes untouched). */
export function localizedHref(href: string | null | undefined, lang: string): string | undefined {
	if (!href) return undefined;
	if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
	if (FUNCTIONAL.test(href)) return href;
	const code = LANGS.includes(lang) ? lang : DEFAULT_LANG;
	const path = href === "/" ? "" : href.startsWith("/") ? href : `/${href}`;
	return `/${code}${path}`; // "/" → "/en" (no trailing slash)
}
