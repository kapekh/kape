/**
 * Who the site says it is. Every brand-bearing string in the app resolves
 * through here, so a fresh install is neutral and an operator rebrands the
 * whole site from /admin/settings without touching code.
 *
 * Keys, all optional:
 *   site_name_en     full name, e.g. "Riverside Community Trust"
 *   site_name_km     full name in Khmer (header/footer lockup only)
 *   site_name_short  brand short form used as a title suffix and in the admin
 *   site_description one line about the organisation, for meta + JSON-LD
 *   og_image         image shown when a page is shared on social media
 *   og_site_name     what social cards call the site, when that is not the brand
 *   logo_url         the organisation's own logo; the product mark otherwise
 *
 * A short name may be *derived* when one is not set, and a derived name is a
 * display convenience. It never reaches a machine-read field: `alternateName`,
 * a publisher and `og:site_name` are claims about what an organisation is
 * actually called, so those read `declaredShortName` and take nothing on trust.
 */
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

/**
 * The leading words that fit, stopping before a minor one so the result is a
 * phrase rather than a cut. Catches the names an acronym cannot: too many
 * words for initials to mean anything, or a script initials do not apply to.
 */
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

/**
 * Short brand for title suffixes and chrome. An operator who has not set one
 * gets their own name back while it still fits a title bar, then its acronym,
 * then the words of it that fit — never a legal name pasted after every page.
 */
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

/**
 * What a page says about itself to search engines and social cards when it has
 * no description of its own. Stays out of JSON-LD, which should carry the
 * operator's own words or nothing.
 */
export const metaDescription = (s: SiteSettings) =>
	siteDescription(s) || `The website of ${siteName(s)}.`;

/**
 * The organisation's logo. `/logo.png` is the product's own neutral mark, so an
 * install that has uploaded nothing still shows something, and it shows nobody
 * else's crest.
 */
export const siteLogo = (s: SiteSettings) => val(s, "logo_url") || "/logo.png";

/** Image for a shared link. Falls back to the logo, which every install has. */
export const socialImage = (s: SiteSettings) =>
	val(s, "og_image") || siteLogo(s);

/**
 * What social cards call the site. Never derived: a scraper quotes this as the
 * publication's name.
 */
export const socialSiteName = (s: SiteSettings) =>
	val(s, "og_site_name") || declaredShortName(s) || siteName(s);

/** Browser title for the CMS itself. */
export const adminTitle = (s: SiteSettings) => `${siteShortName(s)} Admin`;

export const staffPortalTitle = (s: SiteSettings) =>
	`${siteShortName(s)} Staff Portal`;

/** Single letter mark used where there is no room for a logo. */
export const siteInitial = (s: SiteSettings) =>
	siteShortName(s).trim().charAt(0).toUpperCase() || "S";
