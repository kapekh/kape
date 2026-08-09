/**
 * Default UI chrome strings (EN + KH), seeded into the `ui_strings` table.
 *
 * This is the *bootstrap* dictionary for a fresh install: the words the shipped
 * components put on screen before anyone has written a page. It holds every key
 * a component renders through `t()` and nothing else — no sample navigation, no
 * homepage copy, nothing about any one organisation, sector or country. An
 * example site's dictionary belongs in its own seed under src/server/seed/.
 *
 * At runtime the app reads UI strings from the DB, so adding a language is pure
 * data (INSERT rows) — no code change. Keep keys stable; components reference them.
 */
export const defaultUiStrings: Record<string, { en: string; km?: string }> = {
	// top bar (Header.tsx)
	"top.search": { en: "Search", km: "ស្វែងរក" },
	"top.sitemap": { en: "Site Map", km: "ផែនទីគេហទំព័រ" },

	// navigation chrome (Header.tsx, SubPage.tsx, contact route)
	"nav.home": { en: "Home", km: "ទំព័រដើម" },
	"nav.menu": { en: "Menu", km: "ម៉ឺនុយ" },
	"nav.contact": { en: "Contact", km: "ទំនាក់ទំនង" },
	"nav.donate": { en: "♡ Donate", km: "♡ បរិច្ចាគ" },

	"top.login": { en: "Staff login", km: "ចូលសម្រាប់បុគ្គលិក" },

	// forms (ContactForm.tsx, FormRenderer.tsx, SectionRenderer form section)
	"forms.send": { en: "Send message", km: "ផ្ញើសារ" },
	"forms.sending": { en: "Sending…", km: "កំពុងផ្ញើ…" },
	"forms.submit": { en: "Submit", km: "ដាក់ស្នើ" },

	// newsletter (Footer.tsx)
	"newsletter.email": { en: "Email address", km: "អាសយដ្ឋានអ៊ីមែល" },
	"newsletter.subscribe": { en: "Subscribe", km: "ជាវ" },
	"newsletter.thanks": {
		en: "Thanks for subscribing!",
		km: "សូមអរគុណសម្រាប់ការជាវ!",
	},
	"newsletter.error": {
		en: "Something went wrong. Please try again.",
		km: "មានបញ្ហាបានកើតឡើង។ សូមព្យាយាមម្តងទៀត។",
	},
	"footer.calendar": {
		en: "ប្រតិទិនខ្មែរ · Khmer Calendar",
		km: "ប្រតិទិនខ្មែរ",
	},

	// collection listings (SectionRenderer.tsx)
	"home.news.readmore": { en: "Read more →", km: "អានបន្ថែម →" },
	"home.news.all": { en: "See all →", km: "មើលទាំងអស់ →" },
	"home.video.all": { en: "All videos →", km: "វីដេអូទាំងអស់ →" },
	"share.label": { en: "Share", km: "ចែករំលែក" },

	// announcement popup (AnnouncementPopup.tsx)
	"announcement.label": { en: "Announcement", km: "សេចក្តីជូនដំណឹង" },
	"announcement.more": { en: "Read more", km: "អានបន្ថែម" },
	"announcement.deadline": { en: "Deadline", km: "ថ្ងៃផុតកំណត់" },
	"announcement.prev": { en: "Previous", km: "មុន" },
	"announcement.next": { en: "Next", km: "បន្ទាប់" },
	"announcement.close": {
		en: "Close announcement",
		km: "បិទសេចក្តីជូនដំណឹង",
	},
	"announcement.close.label": { en: "Close", km: "បិទ" },

	// lightbox (Lightbox.tsx)
	"lightbox.title": { en: "Photo viewer", km: "កម្មវិធីមើលរូបភាព" },
	"lightbox.view": { en: "View photo", km: "មើលរូបភាព" },
	"lightbox.prev": { en: "Previous photo", km: "រូបភាពមុន" },
	"lightbox.next": { en: "Next photo", km: "រូបភាពបន្ទាប់" },
	"lightbox.close": { en: "Close", km: "បិទ" },

	// pdf reader (PdfReader.tsx)
	"pdf.title": { en: "Document viewer", km: "កម្មវិធីមើលឯកសារ" },
	"pdf.newTab": { en: "Open in new tab", km: "បើកក្នុងផ្ទាំងថ្មី" },
	"pdf.close": { en: "Close", km: "បិទ" },

	// khmer calendar (KhmerCalendar.tsx)
	"calendar.prev": { en: "Previous month", km: "ខែមុន" },
	"calendar.next": { en: "Next month", km: "ខែបន្ទាប់" },

	// search (search route). The three that compose into one sentence are left
	// English until a Khmer speaker words the whole sentence, not each fragment.
	"search.none": { en: "Nothing matched", km: "រកមិនឃើញ" },
	"search.prompt": {
		en: "Type a word above to search the site — try a project name, a place, or a title.",
		km: "សូមវាយបញ្ចូលពាក្យខាងលើដើម្បីស្វែងរក ដូចជាឈ្មោះគម្រោង ទីកន្លែង ឬចំណងជើង។",
	},
	"search.results": { en: "results" },
	"search.showingFirst": { en: "showing the first" },
	"related.more": { en: "More from" },
};
