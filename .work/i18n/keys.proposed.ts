/**
 * T1 output: proposed NEW `ui_strings` keys for every visitor-visible string that
 * is currently hardcoded in a public route or component.
 *
 * Same shape as `src/lib/ui-strings.default.ts` so the next pane can merge it in.
 * English only — no invented Khmer. `km` is deliberately absent from every entry;
 * a Khmer speaker words these, not this file.
 *
 * `{name}` marks an interpolation slot. Those keys need a formatter at the call
 * site; see the Interpolation section of INVENTORY.md.
 *
 * Keys already present in ui-strings.default.ts are NOT repeated here.
 */
export const proposedUiStrings: Record<string, { en: string; km?: string }> = {
	/* ---------------- navigation + page chrome ---------------- */
	"nav.overview": { en: "Overview" },
	"nav.openMenu": { en: "Open menu" },
	"nav.closeMenu": { en: "Close menu" },
	"nav.backHome": { en: "Back to home" },
	"nav.backSite": { en: "Back to the site" },
	"nav.explore": { en: "Explore" },

	/* ---------------- collection labels ----------------
	 * The English side of these lives in src/lib/collections.ts (`label`) and is
	 * rendered as the breadcrumb section, the article "More from" label and the
	 * search result kind. The search route ALREADY calls t() for them, under
	 * `search.kind.<prefix>` — those keys have never been seeded. Recommend
	 * consolidating on one namespace rather than seeding both.
	 */
	"collection.page": { en: "Page" },
	"collection.news": { en: "News & Events" },
	"collection.stories": { en: "Impact Stories" },
	"collection.videos": { en: "Videos" },
	"collection.galleries": { en: "Photo Galleries" },
	"collection.team": { en: "Our Team" },
	"collection.publications": { en: "Publications" },
	"collection.careers": { en: "Careers" },
	"collection.events": { en: "Events" },
	"collection.projects": { en: "Projects" },

	/* ---------------- generic errors + status ---------------- */
	"error.generic": { en: "Something went wrong. Please try again." },
	"error.network": { en: "Network error. Please try again." },
	"error.networkConnection": {
		en: "Network error. Please check your connection and try again.",
	},
	"error.notfound.section": { en: "Not found" },
	"error.notfound.title": { en: "Page not found" },
	"error.notfound.body": { en: "This page doesn't exist or was moved." },
	"common.loading": { en: "Loading…" },

	/* ---------------- page body fallbacks ---------------- */
	"page.empty": { en: "This section is being updated. Please check back soon." },
	"album.lead": { en: "Click any photo to view it larger." },

	/* ---------------- forms ---------------- */
	"forms.name": { en: "Full name" },
	"forms.yourName": { en: "Your name" },
	"forms.email": { en: "Email" },
	"forms.emailPlaceholder": { en: "you@email.org" },
	"forms.password": { en: "Password" },
	"forms.phoneOptional": { en: "Phone (optional)" },
	"forms.message": { en: "Message" },
	"forms.select": { en: "— Select —" },
	"forms.sent": { en: "Thank you — your response has been recorded." },
	"forms.closed": {
		en: "This form is now closed and no longer accepting responses. Thank you for your interest.",
	},
	"forms.closesOn": { en: "Closes {date}" },
	"forms.fileHint": { en: "Up to {max} · {types}" },
	"forms.fileTooLarge": { en: "“{name}” is too large (max {max})." },

	/* ---------------- contact page ---------------- */
	"contact.metaTitle": { en: "Contact {site}" },
	"contact.metaDescription": { en: "Reach our head office and regional teams." },
	"contact.title": { en: "Contact Us" },
	"contact.lead": {
		en: "Get in touch with {site} at our head office or any of our regional teams.",
	},
	"contact.badge": { en: "Say hello" },
	"contact.form.title": { en: "Send us a message" },
	"contact.form.note": { en: "We usually reply within a couple of working days." },
	"contact.form.sent": {
		en: "Thank you — your message has been sent. We'll be in touch.",
	},
	"contact.hq": { en: "Head office" },
	"contact.provincial": { en: "Provincial offices" },
	"contact.address": { en: "Address:" },
	"contact.phone": { en: "Phone:" },
	"contact.email": { en: "Email:" },

	/* ---------------- login ---------------- */
	"login.metaTitle": { en: "Sign in — {site}" },
	"login.subtitle": { en: "Sign in to manage the website." },
	"login.submit": { en: "Sign in" },
	"login.busy": { en: "Signing in…" },
	"login.invalid": { en: "Invalid email or password." },
	"login.failed": { en: "Sign-in failed. Please try again." },

	/* ---------------- theme toggle ---------------- */
	"theme.toLight": { en: "Switch to light mode" },
	"theme.toDark": { en: "Switch to dark mode" },
	"theme.light": { en: "Light mode" },
	"theme.dark": { en: "Dark mode" },

	/* ---------------- dialogs (Dialogs.tsx defaults) ---------------- */
	"dialog.cancel": { en: "Cancel" },
	"dialog.dismiss": { en: "Cancel" },
	"dialog.confirm": { en: "Confirm" },
	"dialog.ok": { en: "OK" },
	"dialog.close": { en: "Close" },
	"dialog.back": { en: "Back" },

	/* ---------------- public rich-text editor (form answers) ---------------- */
	"richtext.bulletList": { en: "• List" },
	"richtext.orderedList": { en: "1. List" },
	"richtext.link": { en: "Link" },
	"richtext.link.title": { en: "Add link" },
	"richtext.link.placeholder": { en: "https://…" },
	"richtext.link.apply": { en: "Apply" },

	/* ---------------- footer ---------------- */
	"footer.visits": { en: "Today: {today} · Total visits: {total}" },

	/* ---------------- search ---------------- */
	"search.placeholder": { en: "Search {site}" },
	"search.noneFor": { en: "Nothing matched “{query}”." },
	"search.summary": { en: "{total} results" },
	"search.showingFirstN": { en: "showing the first {limit}" },

	/* ---------------- announcement popup ---------------- */
	"announcement.position": { en: "{n} of {total}" },
	"announcement.goto": { en: "Announcement {n}" },
	"announcement.deadlineOn": { en: "Deadline {date}" },

	/* ---------------- lightbox ---------------- */
	"lightbox.position": { en: "{n} of {total}" },
	"lightbox.viewNth": { en: "View photo {n} of {total}" },

	/* ---------------- map popups ---------------- */
	"map.current": { en: "Current" },
	"map.past": { en: "Past" },
	"map.viewProject": { en: "View project" },

	/* ---------------- media placeholder rows ---------------- */
	"media.video": { en: "Video" },
	"media.image": { en: "Image" },

	/* ---------------- project detail ---------------- */
	"project.notfound.title": { en: "Project not found" },
	"project.notfound.body": { en: "This project doesn't exist or was moved." },
	"project.current": { en: "Current project" },
	"project.past": { en: "Past project" },
	"project.donors": { en: "Supported by" },
	"project.startDate": { en: "Start date" },
	"project.endDate": { en: "End date" },
	"project.targetAreas": { en: "Target areas" },
	"project.snapshots": { en: "Snapshots" },

	/* ---------------- section templates: CTAs + empty states ---------------- */
	"cta.learnMore": { en: "Learn more" },
	"cta.donateNow": { en: "Donate now" },
	"empty.posts": { en: "Nothing published here yet." },
	"empty.projects": { en: "No projects listed yet." },
	"empty.videos": { en: "No videos yet." },
	"empty.albums": { en: "No photo albums yet." },
	"empty.publications": { en: "No publications in this category yet." },
	"empty.people": { en: "No team members listed yet." },
	"empty.partners": { en: "No partners listed yet." },
	"empty.resources": { en: "No resources published yet." },
	"empty.certificates": { en: "No accreditations listed yet." },
	"empty.directory": { en: "Nothing to list yet." },
	"empty.sitemap": { en: "No navigation published yet." },
	"empty.orgchart": { en: "No organizational chart yet." },

	/* ---------------- section templates: labels ---------------- */
	"hero.slide": { en: "Slide {n}" },
	"resources.kindDefault": { en: "file" },
	"partners.uncategorised": { en: "Partners" },
	"albums.count": { en: "{n} photos" },
	"publications.downloads": { en: "{n} downloads" },
	"publications.downloadsOne": { en: "{n} download" },
	"jobs.col.position": { en: "Position" },
	"jobs.col.location": { en: "Location" },
	"jobs.col.deadline": { en: "Deadline" },
	"jobs.apply": { en: "Apply" },

	/* ---------------- donate: hub + campaign ---------------- */
	"donate.title": { en: "Donate" },
	"donate.metaTitleHub": { en: "Donate to {site}" },
	"donate.metaTitleCampaign": { en: "{title} — Donate" },
	"donate.metaDescription": { en: "Support this campaign." },
	"donate.badge": { en: "Stand with us" },
	"donate.closed.badge": { en: "Campaign closed" },
	"donate.campaigns": { en: "Campaigns" },
	"donate.more": { en: "More campaigns" },
	"donate.featured": { en: "Featured" },
	"donate.new": { en: "New campaign" },
	"donate.give": { en: "Give" },
	"donate.beFirst": { en: "Be the first to give" },
	"donate.beFirstShort": { en: "Be the first" },
	"donate.getMoving": { en: "Your gift gets this campaign moving." },
	"donate.helpReach": { en: "Help reach the {goal} goal." },
	"donate.raised": { en: "raised" },
	"donate.raisedOfGoal": { en: "raised of {goal} goal" },
	"donate.ofGoal": { en: "of {goal}" },
	"donate.goal": { en: "{amount} goal" },
	"donate.pctFunded": { en: "{pct}% funded" },
	"donate.stat.campaign": { en: "campaign" },
	"donate.stat.campaigns": { en: "campaigns" },
	"donate.supporter": { en: "supporter" },
	"donate.supporters": { en: "supporters" },
	"donate.donor": { en: "donor" },
	"donate.donors": { en: "donors" },
	"donate.cta.campaign": { en: "Donate to this campaign" },
	"donate.empty.title": { en: "No active campaigns right now" },
	"donate.empty.body": { en: "Please check back soon, or {link}." },
	"donate.empty.link": { en: "learn more about our work" },
	"donate.recentSupporters": { en: "Recent supporters" },
	"donate.wall.empty": { en: "Be the first to support this campaign." },
	"donate.ended.title": { en: "This campaign has ended" },
	"donate.ended.body": {
		en: "Thank you to everyone who gave. Explore other ways to give.",
	},
	"donate.ended.cta": { en: "See active campaigns" },

	/* ---------------- donate: the giving form ---------------- */
	"donate.form.title": { en: "Make your gift" },
	"donate.step1": { en: "Choose your impact" },
	"donate.step2": { en: "Your details" },
	"donate.oneTime": { en: "One-time gift" },
	"donate.otherAmount": { en: "Other amount" },
	"donate.funds": { en: "Funds {tier}" },
	"donate.yourNameOptional": { en: "Your name (optional)" },
	"donate.receiptEmail": { en: "Email for your receipt" },
	"donate.messageOptional": { en: "Leave a message of support (optional)" },
	"donate.wallAs": { en: "Show me on the supporters wall as…" },
	"donate.wall.name": { en: "My name" },
	"donate.wall.custom": { en: "Custom" },
	"donate.anonymous": { en: "Anonymous" },
	"donate.customNamePlaceholder": { en: "e.g. The Sok Family" },
	"donate.minimum": { en: "Minimum donation is {amount}." },
	"donate.submit": { en: "Donate {amount}" },
	"donate.secured": { en: "Secured by {provider} — KHQR, card, or mobile wallet" },
	"donate.confirm.title": { en: "Confirm your gift" },
	"donate.confirm.campaign": { en: "Campaign" },
	"donate.confirm.creditedAs": { en: "Credited as" },
	"donate.redirecting": { en: "Redirecting…" },
	"donate.confirmPay": { en: "Confirm & pay" },

	/* ---------------- donate: receipt page ---------------- */
	"donate.success.metaTitle": { en: "Thank you for your donation" },
	"donate.success.title": { en: "Thank you" },
	"donate.success.badge": { en: "With gratitude" },
	"donate.success.lead": {
		en: "Your generosity helps Cambodian children learn, dream, and rise.",
	},
	"donate.success.confirmed": { en: "Your gift is confirmed" },
	"donate.success.pending": { en: "We've received your donation" },
	"donate.success.confirmedBody": {
		en: "Your donation has been confirmed. Thank you for your support.",
	},
	"donate.success.pendingBody": {
		en: "Thank you! We're finalising the confirmation of your payment. If it was completed, it will be confirmed shortly — no further action is needed.",
	},
	"donate.success.stories": { en: "See the impact" },

	/* ---------------- staff portal (/internalsources) ----------------
	 * Behind a staff login, so not strictly a visitor surface. Kept in one block
	 * so it can be seeded last, or dropped, without touching anything above.
	 */
	"internal.checking": { en: "Checking access…" },
	"internal.logout": { en: "Log out" },
	"internal.news": { en: "News Feed" },
	"internal.calendar": { en: "Calendar" },
	"internal.documents": { en: "Documents" },
	"internal.directory": { en: "Directory" },
	"internal.news.title": { en: "Internal News Feed" },
	"internal.news.empty": { en: "No internal news." },
	"internal.calendar.title": { en: "Calendar of Events" },
	"internal.calendar.col.program": { en: "Program" },
	"internal.calendar.col.event": { en: "Event" },
	"internal.calendar.col.start": { en: "Start" },
	"internal.calendar.col.end": { en: "End" },
	"internal.directory.title": { en: "Staff Directory" },
	"internal.directory.col.id": { en: "ID" },
	"internal.directory.col.nameKm": { en: "Name (KH)" },
	"internal.directory.col.nameEn": { en: "Name (EN)" },
	"internal.directory.col.sex": { en: "Sex" },
	"internal.directory.col.phone": { en: "Phone" },
	"internal.directory.col.email": { en: "Email" },
	"internal.directory.col.program": { en: "Program" },
	"internal.documents.title": { en: "Internal Documents" },
	"internal.documents.empty": { en: "No documents." },
	"internal.documents.open": { en: "Open" },
	"internal.documents.nofile": { en: "no file" },
};
