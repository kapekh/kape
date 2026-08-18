// a derived short name never reaches alternateName, a publisher or og:site_name, which are claims about what an organisation is called
export type SiteSettings = Record<string, string | undefined>;

/** Shown when nothing is configured. Neutral, never blank. */
export const UNNAMED_SITE = "Your organisation";

const val = (s: SiteSettings, key: string) => s[key]?.trim() ?? "";

export const siteName = (s: SiteSettings) =>
	val(s, "site_name_en") || UNNAMED_SITE;

// Long enough for a three-word name like "Riverside Community Trust" (25),
// short enough that a legal name stops fitting.
const TITLE_SUFFIX_LIMIT = 28;

const MINOR_WORDS = new Set([
	"a",
	"an",
	"and",
	"de",
	"for",
	"in",
	"of",
	"on",
	"or",
	"the",
	"to",
]);

/** "Trust for the Advancement of Learning" -> "TAL"; "" when that reads as noise. */
function acronym(full: string) {
	const letters = full
		.split(/[\s–—-]+/)
		.filter((w) => w && !MINOR_WORDS.has(w.toLowerCase()))
		.map((w) => [...w][0].toUpperCase())
		.join("");
	return /^[A-Z]{2,6}$/.test(letters) ? letters : "";
}

// stops before a minor word, so the result is a phrase rather than a cut
function leadingWords(full: string) {
	const kept: string[] = [];
	for (const word of full.split(/\s+/).filter(Boolean)) {
		if (kept.length && MINOR_WORDS.has(word.toLowerCase())) break;
		if ([...kept, word].join(" ").length > TITLE_SUFFIX_LIMIT) break;
		kept.push(word);
	}
	return kept.length ? kept.join(" ") : "";
}

/** The short name an operator actually gave. Empty when they gave none. */
export const declaredShortName = (s: SiteSettings) => val(s, "site_name_short");

// never a legal name pasted after every page title
export const siteShortName = (s: SiteSettings) => {
	const declared = declaredShortName(s);
	if (declared) return declared;
	const full = siteName(s);
	if (full.length <= TITLE_SUFFIX_LIMIT) return full;
	return acronym(full) || leadingWords(full) || full;
};

/** The site-wide title, collapsed to one name when there is no distinct short form. */
export function siteTitle(s: SiteSettings) {
	const short = siteShortName(s);
	const full = siteName(s);
	return short && short !== full ? `${short} — ${full}` : full;
}

/** A page title carrying the brand suffix. */
export const pageTitle = (title: string, s: SiteSettings) =>
	`${title} — ${siteShortName(s)}`;

export const siteDescription = (s: SiteSettings) => val(s, "site_description");

// stays out of JSON-LD, which carries the operator's own words or nothing
export const metaDescription = (s: SiteSettings) =>
	siteDescription(s) || `The website of ${siteName(s)}.`;

// /logo.png is the product's neutral mark, so an install shows something and nobody else's crest
export const siteLogo = (s: SiteSettings) => val(s, "logo_url") || "/logo.png";

// same rule as the logo: the shipped .ico is the product's, an install points at its own
export const siteFavicon = (s: SiteSettings) =>
	val(s, "favicon_url") || "/favicon.ico";

/** Image for a shared link. Falls back to the logo, which every install has. */
export const socialImage = (s: SiteSettings) =>
	val(s, "og_image") || siteLogo(s);

// never derived: a scraper and a reader both take it as the publication's actual name
export const socialSiteName = (s: SiteSettings) =>
	val(s, "og_site_name") || declaredShortName(s) || siteName(s);

/** Browser title for the CMS itself. */
export const adminTitle = (s: SiteSettings) => `${siteShortName(s)} Admin`;

export const staffPortalTitle = (s: SiteSettings) =>
	`${siteShortName(s)} Staff Portal`;

/** Single letter mark used where there is no room for a logo. */
export const siteInitial = (s: SiteSettings) =>
	siteShortName(s).trim().charAt(0).toUpperCase() || "S";
