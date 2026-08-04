/**
 * Default header chrome content, seeded into `site_settings` so it's editable in
 * /admin/nav (the "Header" page). The Header falls back to these when a key is
 * unset. Shared by the Header component + seed script (no React imports).
 *
 * The nav MENU itself is the nav_items tree (the builder on the same page); these
 * are the few non-menu header bits (donate button + top-bar utility links).
 */
export const HEADER_DEFAULTS: Record<string, string> = {
	header_donate_label: "♡ Donate",
	header_donate_link: "/donate",
	header_search_link: "/search",
	header_sitemap_link: "/sitemap.xml",
};
