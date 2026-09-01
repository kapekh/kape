// a key with no km falls back to English; invented Khmer is not honest
export const pages: Record<string, { en: string; km?: string }> = {
	// one key per collection: the breadcrumb, the rail and the search kind must not drift apart
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

	"person.about": { en: "About {name}" },
	"person.alsoin": { en: "Also in {group}" },
	"person.back": { en: "← Back to the whole team" },
	"person.group": { en: "Group" },
	"person.more": { en: "More of the team" },
	"person.nobio": { en: "No profile has been written yet." },
	"person.program": { en: "Program" },

	"tier.board": { en: "Board of Directors" },
	"tier.pm": { en: "Programs & Team Leadership" },
	"tier.smt": { en: "Senior Management Team" },
	"tier.team": { en: "Our Team" },

	"publications.open": { en: "Open the document" },
	"videos.watch": { en: "Watch the video" },

	"search.noneFor": { en: "Nothing matched “{query}”." },
	"search.placeholder": { en: "Search {site}" },
	"search.showingFirstN": { en: "showing the first {limit}" },
	"search.summary": { en: "{total} results" },
};
