// placeholders for an unconfigured install, not anyone's branding
export const FOOTER_DEFAULTS: Record<string, string> = {
	site_name_km: "",
	site_name_en: "",
	site_name_short: "",
	site_description: "",
	footer_blurb: "",
	footer_links_title: "Explore",
	footer_links: "",
	// Calendar buttons under the contact block, same "Label|/href" format as
	// footer_links. Slugs carry no year, so the label can be rolled forward alone.
	footer_buttons: "",
	newsletter_title: "Newsletter",
	newsletter_text: "Subscribe to receive our e-newsletter.",
	// Social links as a JSON list of { name, url, logoUrl }. `logoUrl` is optional —
	// the footer shows the uploaded logo when set, else a short letter badge.
	footer_socials: "[]",
};
