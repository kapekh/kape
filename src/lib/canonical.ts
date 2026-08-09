/**
 * The <link> set for a public URL: one canonical, plus an hreflang alternate per
 * language once the site's own origin is known.
 *
 * Canonical is emitted with or without that origin — a relative href resolves
 * against the document, and it still does canonical's main job here, which is to
 * drop the query string (/en/donate/success?order=… is one page, not thousands).
 * hreflang is different: search engines only honour a fully-qualified alternate,
 * so those wait for VITE_SITE_URL.
 */
import { DEFAULT_LANG, LANGS, stripLang } from "./i18n-config";

export type HeadLink = { rel: string; href: string; hrefLang?: string };

export function localeLinks(
	splat: string,
	origin?: string | null,
): { canonical: string; links: HeadLink[]; absolute: string | null } {
	const base = origin?.replace(/\/$/, "") ?? "";
	const { lang, path } = stripLang(`/${splat.replace(/^\/+/, "")}`);
	const tail = path === "/" ? "" : path;
	const canonical = `${base}/${lang}${tail}`;
	const links: HeadLink[] = [{ rel: "canonical", href: canonical }];
	if (base) {
		for (const l of LANGS)
			links.push({
				rel: "alternate",
				hrefLang: l,
				href: `${base}/${l}${tail}`,
			});
		links.push({
			rel: "alternate",
			hrefLang: "x-default",
			href: `${base}/${DEFAULT_LANG}${tail}`,
		});
	}
	return { canonical, links, absolute: base ? canonical : null };
}
