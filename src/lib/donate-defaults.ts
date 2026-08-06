/**
 * Default copy for the /donate HUB page (the global landing, not any single
 * campaign). Seeded into `site_settings` so it's editable in /admin/settings;
 * the donate page falls back to these when a key is unset. Per-campaign hero
 * text lives on the campaign row — these are intentionally generic.
 */
export const DONATE_DEFAULTS: Record<string, string> = {
	donate_eyebrow: "Support our work",
	donate_title: "Give to what moves you",
	donate_intro:
		"Choose a campaign below. Every gift goes directly to the work it names.",
};
