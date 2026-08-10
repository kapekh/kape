/**
 * Slice 1: the public routes — the catch-all page/record renderer (`$.tsx`),
 * site search and the staff sign-in screen.
 *
 * Prefixes here: `nav.`, `page.`, `album.`, `error.`, `collection.`, `search.`,
 * `login.` and the two `forms.` fields the sign-in form shares with the rest of
 * the site. The module is storage, not a namespace — a key lives with the slice
 * that renders it, whatever it is called.
 *
 * English only. A key with no `km` falls back to English, which is honest;
 * invented Khmer is not.
 */
export const pages: Record<string, { en: string; km?: string }> = {
	// Collections. One key per collection, not one per call site: the breadcrumb
	// on a detail page, the "More from" rail and the search result kind are the
	// same word and must not drift into three translations of it.
	"collection.careers": { en: "Careers" },
	"collection.events": { en: "Events" },
	"collection.galleries": { en: "Photo Galleries" },
	"collection.news": { en: "News & Events" },
	"collection.page": { en: "Page" },
	"collection.projects": { en: "Projects" },
	"collection.publications": { en: "Publications" },
	"collection.stories": { en: "Impact Stories" },
	"collection.team": { en: "Our Team" },
	"collection.videos": { en: "Videos" },

	"album.lead": { en: "Click any photo to view it larger." },
	"page.empty": {
		en: "This section is being updated. Please check back soon.",
	},

	"error.network": { en: "Network error. Please try again." },
	"error.notfound.body": { en: "This page doesn't exist or was moved." },
	"error.notfound.section": { en: "Not found" },
	"error.notfound.title": { en: "Page not found" },

	"forms.email": { en: "Email" },
	"forms.emailPlaceholder": { en: "you@email.org" },
	"forms.password": { en: "Password" },

	"login.busy": { en: "Signing in…" },
	"login.failed": { en: "Sign-in failed. Please try again." },
	"login.invalid": { en: "Invalid email or password." },
	"login.metaTitle": { en: "Sign in — {site}" },
	"login.submit": { en: "Sign in" },
	"login.subtitle": { en: "Sign in to manage the website." },

	"nav.backHome": { en: "Back to home" },
	"nav.backSite": { en: "Back to the site" },
	"nav.explore": { en: "Explore" },

	"publications.open": { en: "Open the document" },
	"videos.watch": { en: "Watch the video" },

	"search.noneFor": { en: "Nothing matched “{query}”." },
	"search.placeholder": { en: "Search {site}" },
	"search.showingFirstN": { en: "showing the first {limit}" },
	"search.summary": { en: "{total} results" },
};
