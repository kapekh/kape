// canonical drops the query string with or without an origin; hreflang needs a fully-qualified href, so it waits for VITE_SITE_URL
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
