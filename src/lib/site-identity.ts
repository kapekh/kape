/**
 * Who the site says it is. Every brand-bearing string in the app resolves
 * through here, so a fresh install is neutral and an operator rebrands the
 * whole site from /admin/settings without touching code.
 *
 * Keys, all optional:
 *   site_name_en     full name, e.g. "Kampuchea Action to Promote Education"
 *   site_name_km     full name in Khmer (header/footer lockup only)
 *   site_name_short  brand short form used as a title suffix and in the admin
 *   site_description one line about the organisation, for meta + JSON-LD
 */
export type SiteSettings = Record<string, string | undefined>;

/** Shown when nothing is configured. Neutral, never blank. */
export const UNNAMED_SITE = "Your organisation";

const val = (s: SiteSettings, key: string) => s[key]?.trim() ?? "";

export const siteName = (s: SiteSettings) =>
	val(s, "site_name_en") || UNNAMED_SITE;

/** Short brand for title suffixes and chrome; falls back to the full name. */
export const siteShortName = (s: SiteSettings) =>
	val(s, "site_name_short") || siteName(s);

/** The site-wide title, collapsed to one name when there is no distinct short form. */
export function siteTitle(s: SiteSettings) {
	const short = val(s, "site_name_short");
	const full = siteName(s);
	return short && short !== full ? `${short} — ${full}` : full;
}

/** A page title carrying the brand suffix. */
export const pageTitle = (title: string, s: SiteSettings) =>
	`${title} — ${siteShortName(s)}`;

export const siteDescription = (s: SiteSettings) => val(s, "site_description");

/** Browser title for the CMS itself. */
export const adminTitle = (s: SiteSettings) => `${siteShortName(s)} Admin`;

export const staffPortalTitle = (s: SiteSettings) =>
	`${siteShortName(s)} Staff Portal`;

/** Single letter mark used where there is no room for a logo. */
export const siteInitial = (s: SiteSettings) =>
	siteShortName(s).trim().charAt(0).toUpperCase() || "S";
