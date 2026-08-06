/**
 * Create the /calendar hub and its three table pages — Cambodia's public
 * holidays, KAPE's institutional calendar, and the international days KAPE
 * marks — plus the footer buttons that link to them.
 *
 * The bodies are ordinary rich-text tables, so /admin/pages edits them with the
 * table controls already in the editor. Slugs carry no year: the year lives in
 * the title, and the footer links keep working when 2026 becomes 2027.
 *
 * Idempotent: upserts by slug and rewrites the bodies. The 2026 holiday dates
 * are Sub-Decree No. 167 of 18 September 2025 — 21 paid days. Re-check the whole
 * list against the new sub-decree each September; the lunar days move by about
 * three weeks between years. Run: bun scripts/seed-calendar-pages.ts
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { pages, renderCache, siteSettings, translations } from "../src/server/schema";

const TENANT = 1;

/* ------------------------------- date rendering ------------------------------ */

const KM_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const toKhmer = (s: string | number) => String(s).replace(/\d/g, (d) => KM_DIGITS[Number(d)]);
const parts = (iso: string) => {
	const [y, m, d] = iso.split("-").map(Number);
	return { y, m: m - 1, d };
};

/** "14–16 April 2026" — the year is stated once, the month once when it repeats. */
function enDate(from: string, to?: string) {
	const a = parts(from);
	if (!to) return `${a.d} ${EN_MONTHS[a.m]} ${a.y}`;
	const b = parts(to);
	return a.m === b.m
		? `${a.d}–${b.d} ${EN_MONTHS[a.m]} ${a.y}`
		: `${a.d} ${EN_MONTHS[a.m]} – ${b.d} ${EN_MONTHS[b.m]} ${a.y}`;
}

function kmDate(from: string, to?: string) {
	const a = parts(from);
	if (!to) return `${toKhmer(a.d)} ${KM_MONTHS[a.m]} ${toKhmer(a.y)}`;
	const b = parts(to);
	return a.m === b.m
		? `${toKhmer(a.d)}–${toKhmer(b.d)} ${KM_MONTHS[a.m]} ${toKhmer(a.y)}`
		: `${toKhmer(a.d)} ${KM_MONTHS[a.m]} – ${toKhmer(b.d)} ${KM_MONTHS[b.m]} ${toKhmer(a.y)}`;
}

/* --------------------------- rich-text node builders -------------------------- */

type Node = Record<string, unknown>;

const text = (t: string): Node => ({ type: "text", text: t });
const para = (t: string): Node => (t ? { type: "paragraph", content: [text(t)] } : { type: "paragraph" });
const small = (t: string): Node => ({ type: "paragraph", content: [{ ...text(t), marks: [{ type: "italic" }] }] });
const h2 = (t: string): Node => ({ type: "heading", attrs: { level: 2 }, content: [text(t)] });

const cellAttrs = { colspan: 1, rowspan: 1, colwidth: null };
const th = (t: string): Node => ({ type: "tableHeader", attrs: cellAttrs, content: [para(t)] });
const td = (lines: string[]): Node => ({
	type: "tableCell",
	attrs: cellAttrs,
	content: lines.length ? lines.map(para) : [para("")],
});
const row = (cells: Node[]): Node => ({ type: "tableRow", content: cells });
const table = (headers: string[], body: string[][][]): Node => ({
	type: "table",
	content: [row(headers.map(th)), ...body.map((cells) => row(cells.map(td)))],
});

const docOf = (blocks: Node[]) => JSON.stringify({ type: "doc", content: blocks });

/* ---------------------------------- the data --------------------------------- */

type Day = { from: string; to?: string; en: string; km: string; note: string; kape?: boolean };

/** The 21 paid days of Sub-Decree No. 167 (18 September 2025), in the order it lists them. */
const CAMBODIA_HOLIDAYS: Day[] = [
	{ from: "2026-01-01", en: "International New Year Day", km: "ចូលឆ្នាំសាកល", note: "First day of the Gregorian calendar year, a rest day in Cambodia since the civil calendar was adopted under the French protectorate." },
	{ from: "2026-01-07", en: "Victory over Genocide Day", km: "ទិវាជ័យជម្នះ ៧ មករា", note: "Marks the fall of the Khmer Rouge regime in 1979 and the end of the killing." },
	{ from: "2026-03-08", en: "International Women's Day", km: "ទិវានារីអន្តរជាតិ", note: "A public holiday in Cambodia. Schools and NGOs use it for girls' education campaigns." },
	{ from: "2026-04-14", to: "2026-04-16", en: "Khmer New Year", km: "បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ", note: "Three days closing the harvest season. The largest family holiday of the year; most of the country travels home." },
	{ from: "2026-05-01", en: "International Labour Day and Visak Bochea Day", km: "ទិវាពលកម្មអន្តរជាតិ និងពិធីបុណ្យវិសាខបូជា", note: "The two fall together in 2026 and the sub-decree counts them as one paid day. Visak Bochea marks the Buddha's birth, enlightenment and passing, all held to fall on the same full-moon day." },
	{ from: "2026-05-05", en: "Royal Ploughing Ceremony", km: "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល", note: "Royal rite opening the planting season. What the sacred oxen choose to eat is read as a forecast for the harvest." },
	{ from: "2026-05-14", en: "Birthday of His Majesty King Norodom Sihamoni", km: "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះករុណា ព្រះបាទសម្តេចព្រះបរមនាថ នរោត្តម សីហមុនី", note: "The King was born on 14 May 1953." },
	{ from: "2026-06-18", en: "Birthday of Her Majesty Queen Mother Norodom Monineath Sihanouk", km: "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចព្រះមហាក្សត្រី នរោត្តម មុនិនាថ សីហនុ", note: "The Queen Mother was born on 18 June 1936." },
	{ from: "2026-09-24", en: "Constitution Day", km: "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ", note: "Marks the promulgation of the 1993 Constitution and the return of the monarchy." },
	{ from: "2026-10-10", to: "2026-10-12", en: "Pchum Ben", km: "បុណ្យភ្ជុំបិណ្ឌ", note: "The ancestors' festival. Families carry food to the pagoda for fifteen days; the last three are the public holiday." },
	{ from: "2026-10-15", en: "Commemoration Day of King Father Norodom Sihanouk", km: "ទិវាប្រារព្ធពិធីគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះករុណា ព្រះបាទសម្តេចព្រះនរោត្តម សីហនុ", note: "The King Father died on 15 October 2012." },
	{ from: "2026-10-29", en: "Coronation Day of His Majesty King Norodom Sihamoni", km: "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិ", note: "Marks the King's accession to the throne in 2004." },
	{ from: "2026-11-09", en: "Independence Day", km: "ទិវាបុណ្យឯករាជ្យជាតិ", note: "Independence from France, declared on 9 November 1953." },
	{ from: "2026-11-23", to: "2026-11-25", en: "Water Festival", km: "បុណ្យអុំទូក បណ្តែតប្រទីប សំពះព្រះខែ អកអំបុក", note: "Boat races marking the reversal of the Tonle Sap, with the moon salutation and floating lanterns." },
	{ from: "2026-12-29", en: "Peace Day in Cambodia", km: "ទិវាសន្តិភាពនៅកម្ពុជា", note: "Marks the end of the war under the Win-Win Policy in 1998." },
];

/** Widely kept in Cambodia but not rest days: offices and schools stay open. */
const CAMBODIA_OBSERVANCES: Day[] = [
	{ from: "2026-02-02", en: "Meak Bochea Day", km: "ពិធីបុណ្យមាឃបូជា", note: "Buddhist holy day recalling the gathering of 1,250 monks who came to the Buddha unsummoned. Dropped from the paid-holiday list, still kept at the pagoda. Moves with the lunar calendar." },
	{ from: "2026-02-14", en: "Valentine's Day", km: "ទិវានៃក្តីស្រឡាញ់", note: "Widely marked by young Cambodians, though it is a normal working day." },
	{ from: "2026-05-10", en: "Mother's Day", km: "ទិវាមាតា", note: "Second Sunday of May." },
	{ from: "2026-06-01", en: "International Children's Day", km: "ទិវាកុមារអន្តរជាតិ", note: "Marked in schools across the country." },
	{ from: "2026-06-21", en: "Father's Day", km: "ទិវាបិតា", note: "Third Sunday of June." },
	{ from: "2026-10-05", en: "Teachers' Day", km: "ទិវាគ្រូបង្រៀន", note: "Cambodia marks World Teachers' Day; schools hold ceremonies for their staff." },
];

/** KAPE-specific closures on top of the national list, set by the Senior Management Team. */
const KAPE_EXTRA: Day[] = [
	{ from: "2026-01-02", kape: true, en: "KAPE Office Closure (New Year bridge)", km: "ថ្ងៃឈប់សម្រាកបន្ថែមរបស់ខេប", note: "Offices closed between New Year's Day and the weekend, by decision of the Senior Management Team." },
];

/** UN and global observances KAPE and its partners work to. All fixed dates unless noted. */
const INTERNATIONAL_DAYS: Day[] = [
	{ from: "2026-01-24", en: "International Day of Education", km: "ទិវាអប់រំអន្តរជាតិ", note: "UNESCO's day for the right to education; KAPE's own sector day." },
	{ from: "2026-02-04", en: "World Cancer Day", km: "ទិវាមហារីកពិភពលោក", note: "" },
	{ from: "2026-02-14", en: "Valentine's Day", km: "ទិវានៃក្តីស្រឡាញ់", note: "" },
	{ from: "2026-02-21", en: "International Mother Language Day", km: "ទិវាភាសាកំណើតអន្តរជាតិ", note: "Relevant to KAPE's bilingual and ethnic-minority education work." },
	{ from: "2026-03-08", en: "International Women's Day", km: "ទិវានារីអន្តរជាតិ", note: "Also a Cambodian public holiday." },
	{ from: "2026-03-21", en: "International Day for the Elimination of Racial Discrimination", km: "ទិវាលុបបំបាត់ការរើសអើងជាតិសាសន៍អន្តរជាតិ", note: "" },
	{ from: "2026-03-22", en: "World Water Day", km: "ទិវាទឹកពិភពលោក", note: "" },
	{ from: "2026-04-02", en: "World Autism Awareness Day", km: "ទិវាយល់ដឹងអំពីជំងឺអូទីស្សឹមពិភពលោក", note: "Tied to KAPE's inclusive education programmes." },
	{ from: "2026-04-07", en: "World Health Day", km: "ទិវាសុខភាពពិភពលោក", note: "" },
	{ from: "2026-04-23", en: "World Book and Copyright Day", km: "ទិវាសៀវភៅ និងកម្មសិទ្ធិបញ្ញាពិភពលោក", note: "Marked in KAPE-supported school libraries." },
	{ from: "2026-05-01", en: "International Labour Day", km: "ទិវាពលកម្មអន្តរជាតិ", note: "Also a Cambodian public holiday." },
	{ from: "2026-05-10", en: "Mother's Day", km: "ទិវាមាតា", note: "Second Sunday of May." },
	{ from: "2026-05-15", en: "International Day of Families", km: "ទិវាគ្រួសារអន្តរជាតិ", note: "" },
	{ from: "2026-06-01", en: "International Children's Day", km: "ទិវាកុមារអន្តរជាតិ", note: "" },
	{ from: "2026-06-05", en: "World Environment Day", km: "ទិវាបរិស្ថានពិភពលោក", note: "" },
	{ from: "2026-06-12", en: "World Day Against Child Labour", km: "ទិវាប្រឆាំងការប្រើប្រាស់កម្លាំងពលកម្មកុមារពិភពលោក", note: "Closely tied to KAPE's dropout-prevention work." },
	{ from: "2026-06-21", en: "Father's Day", km: "ទិវាបិតា", note: "Third Sunday of June." },
	{ from: "2026-07-30", en: "World Day against Trafficking in Persons", km: "ទិវាប្រឆាំងអំពើជួញដូរមនុស្សពិភពលោក", note: "" },
	{ from: "2026-08-12", en: "International Youth Day", km: "ទិវាយុវជនអន្តរជាតិ", note: "" },
	{ from: "2026-09-08", en: "International Literacy Day", km: "ទិវាអក្ខរកម្មអន្តរជាតិ", note: "One of KAPE's principal advocacy days." },
	{ from: "2026-09-21", en: "International Day of Peace", km: "ទិវាសន្តិភាពអន្តរជាតិ", note: "" },
	{ from: "2026-10-05", en: "World Teachers' Day", km: "ទិវាគ្រូបង្រៀនពិភពលោក", note: "Cambodia marks it as Teachers' Day." },
	{ from: "2026-10-11", en: "International Day of the Girl Child", km: "ទិវាកុមារីអន្តរជាតិ", note: "Tied to KAPE's girls' scholarship programmes." },
	{ from: "2026-11-16", en: "International Day for Tolerance", km: "ទិវាការអត់ឱនអន្តរជាតិ", note: "" },
	{ from: "2026-11-20", en: "World Children's Day", km: "ទិវាកុមារពិភពលោក", note: "Anniversary of the Convention on the Rights of the Child." },
	{ from: "2026-11-25", en: "International Day for the Elimination of Violence against Women", km: "ទិវាលុបបំបាត់អំពើហិង្សាលើស្ត្រីអន្តរជាតិ", note: "Opens the 16 Days of Activism." },
	{ from: "2026-12-03", en: "International Day of Persons with Disabilities", km: "ទិវាជនពិការអន្តរជាតិ", note: "Tied to KAPE's inclusive education programmes." },
	{ from: "2026-12-10", en: "Human Rights Day", km: "ទិវាសិទ្ធិមនុស្ស", note: "" },
];

const byDate = (a: Day, b: Day) => a.from.localeCompare(b.from);

/* ------------------------------- table builders ------------------------------ */

const enTable = (days: Day[]) =>
	table(
		["Date", "Day", "ភាសាខ្មែរ", "What it marks"],
		days.map((d) => [[enDate(d.from, d.to)], [d.en], [d.km], [d.note]]),
	);

/** The Khmer body drops the "what it marks" column: those notes are English-only
 *  until the Khmer reviewer supplies them (see .work/km-review.md). */
const kmTable = (days: Day[]) =>
	table(
		["កាលបរិច្ឆេទ", "ថ្ងៃបុណ្យ", "English"],
		days.map((d) => [[kmDate(d.from, d.to)], [d.km], [d.en]]),
	);

const SOURCE_EN =
	"21 paid days under Sub-Decree No. 167 of 18 September 2025. The lunar dates move each year, so the list is reissued every September.";
const SOURCE_KM =
	"ថ្ងៃឈប់សម្រាកមានប្រាក់ឈ្នួល ២១ ថ្ងៃ តាមអនុក្រឹត្យលេខ ១៦៧ ចុះថ្ងៃទី ១៨ ខែកញ្ញា ឆ្នាំ ២០២៥។";

/* ---------------------------------- the pages -------------------------------- */

type PageDef = {
	segment: string;
	parent?: string;
	title: { en: string; km: string };
	excerpt: { en: string; km: string };
	body?: { en: string; km: string };
};

const cambodiaDays = [...CAMBODIA_HOLIDAYS].sort(byDate);
const kapeDays = [...CAMBODIA_HOLIDAYS, ...KAPE_EXTRA].sort(byDate);
const internationalDays = [...INTERNATIONAL_DAYS].sort(byDate);

const PAGES: PageDef[] = [
	{
		segment: "calendar",
		title: { en: "Calendar", km: "ប្រតិទិន" },
		excerpt: {
			en: "The holidays and observances KAPE works to through the year.",
			km: "ថ្ងៃឈប់សម្រាក និងទិវាសំខាន់ៗដែលខេបប្រកាន់ខ្ជាប់ពេញមួយឆ្នាំ។",
		},
		// no body — the hub renders its three children as an index
	},
	{
		segment: "public-holidays-cambodia",
		parent: "calendar",
		title: { en: "Public Holidays in Cambodia 2026", km: "ថ្ងៃឈប់សម្រាកនៅកម្ពុជា ២០២៦" },
		excerpt: {
			en: "The 21 public holidays observed nationwide in 2026, with the special days Cambodians keep alongside them.",
			km: "ថ្ងៃឈប់សម្រាកជាផ្លូវការទូទាំងប្រទេសចំនួន ២១ ថ្ងៃ ក្នុងឆ្នាំ ២០២៦ ព្រមទាំងទិវាពិសេសផ្សេងទៀត។",
		},
		body: {
			en: docOf([
				enTable(cambodiaDays),
				small(SOURCE_EN),
				h2("Other days Cambodians keep"),
				para("These are working days — offices and schools stay open — but they are widely marked."),
				enTable(CAMBODIA_OBSERVANCES),
			]),
			km: docOf([
				kmTable(cambodiaDays),
				small(SOURCE_KM),
				h2("ទិវាផ្សេងទៀតដែលប្រជាជនកម្ពុជាប្រារព្ធ"),
				para("ថ្ងៃទាំងនេះជាថ្ងៃធ្វើការ ប៉ុន្តែត្រូវបានប្រារព្ធយ៉ាងទូលំទូលាយ។"),
				kmTable(CAMBODIA_OBSERVANCES),
			]),
		},
	},
	{
		segment: "public-holidays-kape",
		parent: "calendar",
		title: { en: "Public Holidays in KAPE 2026", km: "ថ្ងៃឈប់សម្រាករបស់ខេប ២០២៦" },
		excerpt: {
			en: "KAPE's institutional holiday calendar for 2026. Dates may shift by royal decree and by decision of KAPE's Senior Management Team (SMT).",
			km: "ប្រតិទិនថ្ងៃឈប់សម្រាករបស់អង្គការខេបសម្រាប់ឆ្នាំ ២០២៦។ កាលបរិច្ឆេទអាចប្រែប្រួលតាមព្រះរាជក្រឹត្យ និងតាមសេចក្តីសម្រេចរបស់ក្រុមប្រឹក្សាគ្រប់គ្រងជាន់ខ្ពស់ (SMT)។",
		},
		body: {
			en: docOf([
				para("KAPE keeps the national public holidays. Rows marked KAPE are additional office closures decided by the Senior Management Team."),
				enTable(kapeDays.map((d) => (d.kape ? { ...d, en: `${d.en} — KAPE` } : d))),
				small(SOURCE_EN),
			]),
			km: docOf([
				para("ខេបប្រកាន់ខ្ជាប់តាមថ្ងៃឈប់សម្រាកជាតិ។ ជួរដែលមានសញ្ញា KAPE គឺជាថ្ងៃបិទការិយាល័យបន្ថែមតាមសេចក្តីសម្រេចរបស់ SMT។"),
				kmTable(kapeDays),
				small(SOURCE_KM),
			]),
		},
	},
	{
		segment: "international-days",
		parent: "calendar",
		title: { en: "International Days", km: "ទិវាអន្តរជាតិ" },
		excerpt: {
			en: "Global observances KAPE and its partners mark through the year, including Valentine's Day, Mother's Day, Father's Day and Teachers' Day.",
			km: "ទិវាអន្តរជាតិដែលខេប និងដៃគូរបស់ខេបប្រារព្ធពេញមួយឆ្នាំ រួមទាំងទិវានៃក្តីស្រឡាញ់ ទិវាមាតា ទិវាបិតា និងទិវាគ្រូបង្រៀន។",
		},
		body: {
			en: docOf([enTable(internationalDays)]),
			km: docOf([kmTable(internationalDays)]),
		},
	},
];

/** The three footer buttons, in the order the client's design shows them. */
const FOOTER_BUTTONS = [
	"Public Holidays in Cambodia 2026|/calendar/public-holidays-cambodia",
	"Public Holidays in KAPE 2026|/calendar/public-holidays-kape",
	"International Days|/calendar/international-days",
].join(", ");

const FOOTER_BUTTONS_KM = [
	"ថ្ងៃឈប់សម្រាកនៅកម្ពុជា ២០២៦|/calendar/public-holidays-cambodia",
	"ថ្ងៃឈប់សម្រាករបស់ខេប ២០២៦|/calendar/public-holidays-kape",
	"ទិវាអន្តរជាតិ|/calendar/international-days",
].join(", ");

/* ------------------------------------ run ------------------------------------ */

async function setField(pageId: number, field: string, lang: string, value: string) {
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "page"),
				eq(translations.entityId, pageId),
				eq(translations.field, field),
				eq(translations.lang, lang),
			),
		);
	await db.insert(translations).values({ tenantId: TENANT, entityType: "page", entityId: pageId, field, lang, value });
}

async function upsertSetting(key: string, value: string) {
	const [existing] = await db
		.select({ key: siteSettings.key })
		.from(siteSettings)
		.where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, key)))
		.limit(1);
	if (existing) {
		await db.update(siteSettings).set({ value }).where(and(eq(siteSettings.tenantId, TENANT), eq(siteSettings.key, key)));
		return "updated";
	}
	await db.insert(siteSettings).values({ tenantId: TENANT, key, value });
	return "created";
}

async function main() {
	const ids = new Map<string, number>();

	for (let i = 0; i < PAGES.length; i++) {
		const p = PAGES[i];
		const parentId = p.parent ? (ids.get(p.parent) ?? null) : null;
		const slug = p.parent ? `${p.parent}/${p.segment}` : p.segment;

		const [existing] = await db
			.select({ id: pages.id })
			.from(pages)
			.where(and(eq(pages.tenantId, TENANT), eq(pages.slug, slug)))
			.limit(1);

		let id: number;
		if (existing) {
			id = existing.id;
			await db
				.update(pages)
				.set({ segment: p.segment, parentId, status: "published", sortOrder: i, sections: null })
				.where(eq(pages.id, id));
		} else {
			const [r] = await db
				.insert(pages)
				.values({ tenantId: TENANT, slug, segment: p.segment, parentId, status: "published", sortOrder: i })
				.returning({ id: pages.id });
			id = r.id;
		}
		ids.set(p.segment, id);

		await setField(id, "title", "en", p.title.en);
		await setField(id, "title", "km", p.title.km);
		await setField(id, "excerpt", "en", p.excerpt.en);
		await setField(id, "excerpt", "km", p.excerpt.km);
		if (p.body) {
			await setField(id, "body", "en", p.body.en);
			await setField(id, "body", "km", p.body.km);
		}
		console.log(`  ${existing ? "updated" : "created"}  /${slug}  (id ${id})`);
	}

	console.log(`  footer_buttons ${await upsertSetting("footer_buttons", FOOTER_BUTTONS)}`);
	console.log(`  footer_buttons_km ${await upsertSetting("footer_buttons_km", FOOTER_BUTTONS_KM)}`);

	// The render cache serves resolved routes for 7 days; without this the new
	// pages stay invisible with no error to explain it.
	await db.delete(renderCache);
	console.log(`\n${PAGES.length} calendar pages ready. Render cache cleared.`);
}

main().then(() => process.exit(0));
