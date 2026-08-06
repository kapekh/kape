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

	// contact form (ContactForm.tsx)
	"forms.send": { en: "Send message", km: "ផ្ញើសារ" },
	"forms.sending": { en: "Sending…", km: "កំពុងផ្ញើ…" },
};
