/**
 * Default footer content, seeded into `site_settings` so it's editable in
 * /admin/settings. The Footer falls back to these when a key is unset. Shared by
 * the Footer component and the seed script (no React imports here).
 */
export const FOOTER_DEFAULTS: Record<string, string> = {
	site_name_km: "អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា",
	site_name_en: "Kampuchea Action to Promote Education",
	footer_blurb: "KAPE works at every level of formal education across 15 provinces in Cambodia — from preschools to Master's programs in Mentoring.",
	footer_links_title: "Explore",
	footer_links:
		"Annual Report|/media/annual-report, Impact Stories|/stories, Research|/media/paper-research, Program Brochure|/media/program-brochure, Photo Gallery|/galleries, Video Gallery|/videos, Policies|/media/policies",
	newsletter_title: "Newsletter",
	newsletter_text: "Subscribe to receive our e-newsletter.",
};
