import { MODULES, MODULES_SETTING, serializeModules } from "#/lib/modules";
import { db } from "../db";
import { offices, siteSettings, stats } from "../schema";
import { addTranslations, TENANT } from "./helpers";

/**
 * Site settings (kv). Spelt out rather than spread from `#/lib/footer-defaults`
 * and `#/lib/header-defaults`: those are the product's neutral defaults for a
 * fresh install, so importing them here would rewrite the client's footer every
 * time the product's defaults move.
 */
export async function seedSiteSettings() {
	await db.insert(siteSettings).values(
		Object.entries({
			// schema.org/telephone wants a dialable number and the product will not
			// invent a dialling code, so the fixture carries Cambodia's. The first
			// entry is the one that reaches JSON-LD.
			contact_phone: "+855-42-941-481 / +855-42-941-918",
			contact_email: "kape@kapekh.org",
			telegram: "t.me/kapemedia",
			address:
				"PTTC, National Road 7, Kampong Cham Town, Kampong Cham Province",
			address_region: "Kampong Cham",
			address_country: "KH",
			area_served: "Cambodia",
			copyright: "© 2026 Kampuchea Action to Promote Education",
			youtube_url: "https://www.youtube.com/@KAPECambodia",
			social_facebook: "https://facebook.com/KAPECambodia",
			site_name_km: "អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា",
			site_name_en: "Kampuchea Action to Promote Education",
			// Identity the product used to hardcode. site_name_short drives the title
			// suffix and, being declared rather than derived, the JSON-LD
			// alternateName and the article publisher.
			site_name_short: "KAPE",
			og_site_name: "KAPE Cambodia",
			// main hardcoded four descriptions for this one idea; the settings model
			// has one knob. This is the one it used for schema.org, which is the
			// field a machine quotes, and it reads as a sentence in the others.
			site_description:
				"KAPE advances equitable, transformative education for children across Cambodia.",
			// The client's crest, kept byte for byte at this path; /logo.png is now
			// the product's own neutral mark and belongs to nobody.
			logo_url: "/fixture/kape-logo.png",
			og_image: "/fixture/kape-logo.png",
			footer_blurb:
				"KAPE works at every level of formal education across 15 provinces in Cambodia — from preschools to Master's programs in Mentoring.",
			footer_links_title: "Explore",
			footer_links:
				"Annual Report|/media/annual-report, Impact Stories|/stories, Research|/media/paper-research, Program Brochure|/media/program-brochure, Photo Gallery|/galleries, Video Gallery|/videos, Policies|/media/policies",
			// slugs carry no year, so the label can be rolled forward alone
			footer_buttons:
				"Public Holidays in Cambodia 2026|/calendar/public-holidays-cambodia, Public Holidays in KAPE 2026|/calendar/public-holidays-kape, International Days|/calendar/international-days",
			newsletter_title: "Newsletter",
			newsletter_text: "Subscribe to receive our e-newsletter.",
			footer_socials: JSON.stringify([
				{
					name: "Facebook",
					url: "https://facebook.com/KAPECambodia",
					logoUrl: "",
				},
				{
					name: "YouTube",
					url: "https://www.youtube.com/@KAPECambodia",
					logoUrl: "",
				},
				{ name: "Telegram", url: "https://t.me/kapemedia", logoUrl: "" },
			]),
			// The client's palette. The product's own default is a neutral slate, so
			// KAPE's navy and saffron live here with the rest of the fixture rather
			// than in styles.css. Both modes are spelt out: the dark values are the
			// ones the designer tuned, not the ones the derivation would guess.
			theme_primary: "oklch(0.30 0.10 255)",
			theme_primary_dark: "oklch(0.62 0.13 250)",
			theme_secondary: "oklch(0.72 0.17 55)",
			theme_secondary_dark: "oklch(0.74 0.17 55)",
			theme_accent: "oklch(0.68 0.19 35)",
			theme_accent_dark: "oklch(0.70 0.19 35)",
			theme_highlight: "oklch(0.78 0.14 80)",
			theme_highlight_dark: "oklch(0.80 0.14 80)",
			// Full warmth, unrotated: the cream paper the site was designed on.
			theme_paper_chroma: "1",
			theme_paper_hue: "0",
			// KAPE ships light only, so the dark values above are carried but unused.
			theme_dark_mode: "off",
			header_donate_label: "♡ Donate",
			header_donate_link: "/donate",
			header_search_link: "/search",
			header_sitemap_link: "/sitemap.xml",
			// KAPE is the organisation the domain features were built for, so the
			// fixture turns all of them on. A fresh install writes no row and gets a
			// plain CMS: see src/lib/modules.ts.
			[MODULES_SETTING]: serializeModules(MODULES.map((m) => m.id)),
		}).map(([key, value]) => ({ tenantId: TENANT, key, value })),
	);
}

/** Impact stats. */
export async function seedStats() {
	const statRows: { value: number; label: { en: string; km: string } }[] = [
		{ value: 30, label: { en: "Preschools", km: "សាលាមត្តេយ្យ" } },
		{ value: 189, label: { en: "Primary Schools", km: "សាលាបឋមសិក្សា" } },
		{ value: 129, label: { en: "Secondary Schools", km: "សាលាមធ្យមសិក្សា" } },
		{ value: 2, label: { en: "Higher Institutions", km: "ស្ថាប័នឧត្តមសិក្សា" } },
		{ value: 160531, label: { en: "Students", km: "សិស្ស" } },
		{ value: 1300, label: { en: "Teachers & Principals", km: "គ្រូ និងនាយក" } },
		{ value: 4522, label: { en: "Stakeholders", km: "ភាគីពាក់ព័ន្ធ" } },
	];
	for (let i = 0; i < statRows.length; i++) {
		const [row] = await db
			.insert(stats)
			.values({ tenantId: TENANT, value: statRows[i].value, sort: i })
			.returning({ id: stats.id });
		await addTranslations("stat", row.id, { label: statRows[i].label });
	}
}

/** Offices (Contact map + cards). */
export async function seedOffices() {
	await db.insert(offices).values([
		{
			tenantId: TENANT,
			name: "Head Office (PTTC)",
			province: "Kampong Cham",
			address: "National Road 7, Kampong Cham Town",
			phone: "042-941-481",
			email: "kape@kapekh.org",
			lat: "11.9925",
			lng: "105.4636",
			isHq: true,
			sort: 0,
		},
		{
			tenantId: TENANT,
			name: "Phnom Penh Sub-Office",
			province: "Phnom Penh",
			address: "House #57, St 302, BKK1",
			phone: "011 222 222",
			email: "communications@kapekh.org",
			lat: "11.5564",
			lng: "104.9282",
			isHq: false,
			sort: 1,
		},
		{
			tenantId: TENANT,
			name: "Siem Reap",
			province: "Siem Reap",
			phone: "011 222 222",
			email: "communications@kapekh.org",
			lat: "13.3671",
			lng: "103.8448",
			isHq: false,
			sort: 2,
		},
		{
			tenantId: TENANT,
			name: "Kratie",
			province: "Kratie",
			phone: "011 222 222",
			email: "communications@kapekh.org",
			lat: "12.4881",
			lng: "106.0188",
			isHq: false,
			sort: 3,
		},
	]);
}
