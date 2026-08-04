import { FOOTER_DEFAULTS } from "#/lib/footer-defaults";
import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { db } from "../db";
import { offices, siteSettings, stats } from "../schema";
import { addTranslations, TENANT } from "./helpers";

/** Site settings (kv). */
export async function seedSiteSettings() {
	await db.insert(siteSettings).values(
		Object.entries({
			contact_phone: "042-941-481 / 042-941-918",
			contact_email: "kape@kapekh.org",
			telegram: "t.me/kapemedia",
			address:
				"PTTC, National Road 7, Kampong Cham Town, Kampong Cham Province",
			copyright: "© 2026 Kampuchea Action to Promote Education",
			youtube_url: "https://www.youtube.com/@KAPECambodia",
			social_facebook: "https://facebook.com/KAPECambodia",
			...FOOTER_DEFAULTS, // editable footer text/links (org name, blurb, Explore links, …)
			...HEADER_DEFAULTS, // editable header bits (donate button + top-bar links)
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
