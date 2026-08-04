/**
 * Idempotent dev seed: default tenant, languages (en default + km), content types,
 * a starter nav tree, and a sample page + post with EN/KH translations.
 *
 * Run: `bun run db:seed`  (db.ts applies migrations on import first)
 */
import { FOOTER_DEFAULTS } from "#/lib/footer-defaults";
import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { defaultUiStrings } from "#/lib/ui-strings.default";
import { hashPassword } from "./auth";
import { db } from "./db";
import { applyTreeMigrations } from "./migrate-tree";
import {
	contentTypes,
	donors,
	heroSlides,
	languages,
	media,
	navItems,
	offices,
	pages,
	partners,
	people,
	postMedia,
	posts,
	projectDonors,
	projectLocations,
	projects,
	schools,
	siteSettings,
	stats,
	tenants,
	terms,
	translations,
	uiStrings,
	users,
} from "./schema";

const TENANT = 1;

async function alreadySeeded() {
	const [row] = await db.select().from(languages).limit(1);
	return Boolean(row);
}

async function addTranslations(
	entityType: string,
	entityId: number,
	fields: Record<string, { en: string; km?: string }>,
) {
	const rows: {
		tenantId: number;
		entityType: string;
		entityId: number;
		field: string;
		lang: string;
		value: string;
	}[] = [];
	for (const [field, v] of Object.entries(fields)) {
		rows.push({
			tenantId: TENANT,
			entityType,
			entityId,
			field,
			lang: "en",
			value: v.en,
		});
		if (v.km)
			rows.push({
				tenantId: TENANT,
				entityType,
				entityId,
				field,
				lang: "km",
				value: v.km,
			});
	}
	if (rows.length) await db.insert(translations).values(rows);
}

type SeedNav = {
	kind: string; // page | post_list | view | url | none
	ref: string;
	en: string;
	km: string;
	children?: SeedNav[];
};

/**
 * Mega-menu card metadata, keyed by `targetRef` (or the EN label for label-only
 * containers). `brief` is the card description; `img` is a picsum seed used for
 * the card background. Single source of truth — also consumed by the nav backfill.
 */
export const NAV_META: Record<string, { brief?: string; img: string }> = {
	// Top-level sections (used by the mega-menu feature panel)
	"Who We Are": {
		brief: "Our story, our people and the values behind our work.",
		img: "kape-who",
	},
	"What We Do": {
		brief: "Programs and innovations improving education across Cambodia.",
		img: "kape-what",
	},
	"Media & Publications": {
		brief: "Reports, research, galleries and resources.",
		img: "kape-media",
	},
	Opportunities: {
		brief: "Ways to partner, work, study and give.",
		img: "kape-opp",
	},
	// Who We Are
	"who-we-are/about": {
		brief: "The largest local education NGO in Cambodia, across 15 provinces.",
		img: "kape-about",
	},
	"who-we-are/news": {
		brief: "Latest stories, events and announcements from the field.",
		img: "kape-news",
	},
	"who-we-are/fact-sheet": {
		brief: "Key facts, figures and milestones at a glance.",
		img: "kape-facts",
	},
	"who-we-are/vision-mission": {
		brief: "The vision, mission and core values that guide us.",
		img: "kape-vision",
	},
	"who-we-are/director-speech": {
		brief: "A message from our Executive Director.",
		img: "kape-director",
	},
	"who-we-are/leadership": {
		brief: "Meet the team and see our organizational structure.",
		img: "kape-leaders",
	},
	"who-we-are/partners": {
		brief: "The ministries, donors and organizations we work with.",
		img: "kape-partners",
	},
	// What We Do
	"Current Projects": {
		brief: "Programs we are running right now across Cambodia.",
		img: "kape-current",
	},
	"Past Projects": {
		brief: "Completed initiatives and the impact they left behind.",
		img: "kape-past",
	},
	"what-we-do/impact-stories": {
		brief: "Real stories of students and communities transformed.",
		img: "kape-impact",
	},
	"what-we-do/ict-innovation": {
		brief: "Bringing technology and digital learning into classrooms.",
		img: "kape-ict",
	},
	"what-we-do/learning-applications": {
		brief: "Apps and tools that extend learning beyond the classroom.",
		img: "kape-apps",
	},
	// Media & Publications
	"media/annual-report": {
		brief: "Our year in review — results, finances and highlights.",
		img: "kape-annual",
	},
	"media/e-newsletter": {
		brief: "Periodic updates delivered to your inbox.",
		img: "kape-newsletter",
	},
	"media/program-brochure": {
		brief: "Overviews of each KAPE program.",
		img: "kape-brochure",
	},
	"media/program-report": {
		brief: "Detailed reporting on program activities and outcomes.",
		img: "kape-report",
	},
	"media/photo-gallery": {
		brief: "Faces and moments from across our work.",
		img: "kape-photo",
	},
	"media/video-gallery": {
		brief: "Watch stories from the classroom and the field.",
		img: "kape-video",
	},
	"media/paper-research": {
		brief: "Studies and academic papers produced by KAPE.",
		img: "kape-research",
	},
	"media/other-publications": {
		brief: "Guides, toolkits and assorted materials.",
		img: "kape-pubs",
	},
	"media/escup-sources": {
		brief: "Resources from the ESCUP program.",
		img: "kape-escup",
	},
	"media/life-skills": {
		brief: "Materials on life-skills education for young people.",
		img: "kape-lifeskills",
	},
	"media/ai-digital": {
		brief: "Our work on AI literacy and digital education.",
		img: "kape-ai",
	},
	"media/policies": {
		brief: "Policies, regulations and governance documents.",
		img: "kape-policies",
	},
	// Media & Publications groups
	"Reports & Updates": {
		brief: "Annual & program reports, brochures and newsletters.",
		img: "kape-grp-reports",
	},
	Galleries: {
		brief: "Photos and videos from across our work.",
		img: "kape-grp-galleries",
	},
	"Research & Publications": {
		brief: "Studies, papers and assorted resources.",
		img: "kape-grp-research",
	},
	"Thematic Resources": {
		brief: "Materials on key education themes.",
		img: "kape-grp-thematic",
	},
	// Opportunities
	"opportunities/partner": {
		brief: "Collaborate with us to expand quality education.",
		img: "kape-collab",
	},
	"opportunities/careers": {
		brief: "Open positions and how to join our team.",
		img: "kape-careers",
	},
	"opportunities/alumni": {
		brief: "Reconnect with the KAPE alumni community.",
		img: "kape-alumni",
	},
	"opportunities/scholarship": {
		brief: "Scholarship programs for Cambodian students.",
		img: "kape-scholarship",
	},
	"opportunities/volunteer": {
		brief: "Give your time and skills to our mission.",
		img: "kape-volunteer",
	},
	// Current projects (brief = full project name where it differs from the code)
	"current-projects/ngs": {
		brief: "New Generation Schools",
		img: "kape-proj-ngs",
	},
	"current-projects/ngprc": {
		brief: "New Generation Pedagogical Research Center",
		img: "kape-proj-ngprc",
	},
	"current-projects/hcc": {
		brief: "Happy Cambodian Children",
		img: "kape-proj-hcc",
	},
	"current-projects/class": { img: "kape-proj-class" },
	"current-projects/iep": {
		brief: "Inclusive Education Project",
		img: "kape-proj-iep",
	},
	"current-projects/dep": {
		brief: "Digital Education Project",
		img: "kape-proj-dep",
	},
	"current-projects/mldp": { img: "kape-proj-mldp" },
	"current-projects/equal-i3l": { img: "kape-proj-equal" },
	"current-projects/llse": {
		brief: "Life-Long Skills Education",
		img: "kape-proj-llse",
	},
	// Past projects
	"past-projects/ibec": {
		brief: "Improved Basic Education in Cambodia",
		img: "kape-proj-ibec",
	},
	"past-projects/e2l": {
		brief: "Enabling Education for Learning",
		img: "kape-proj-e2l",
	},
	"past-projects/lslag": { img: "kape-proj-lslag" },
	"past-projects/seek": { img: "kape-proj-seek" },
	"past-projects/kyla": { img: "kape-proj-kyla" },
	"past-projects/sfe": {
		brief: "Schools for Empowerment",
		img: "kape-proj-sfe",
	},
	"past-projects/bfc": { brief: "Books for Cambodia", img: "kape-proj-bfc" },
	"past-projects/escup": {
		brief: "Educational support for underserved communities",
		img: "kape-proj-escup",
	},
	"past-projects/bsi": {
		brief: "Beacon Schools Initiative",
		img: "kape-proj-bsi",
	},
};

/** Look up a node's card metadata by its ref (or label for containers). */
export function navMetaFor(n: { ref: string; en: string }) {
	return NAV_META[n.ref] ?? NAV_META[n.en];
}

/** Labels for the Media & Publications leaf items, keyed by targetRef. */
const MEDIA_ITEMS: Record<string, { en: string; km: string }> = {
	"media/annual-report": { en: "Annual Report", km: "របាយការណ៍ប្រចាំឆ្នាំ" },
	"media/program-report": { en: "Program Report", km: "របាយការណ៍កម្មវិធី" },
	"media/program-brochure": { en: "Program Brochure", km: "ប័ណ្ណកម្មវិធី" },
	"media/e-newsletter": { en: "E-Newsletter", km: "ព្រឹត្តិបត្រអេឡិចត្រូនិក" },
	"media/photo-gallery": { en: "Photo Gallery", km: "វិចិត្រសាលរូបភាព" },
	"media/video-gallery": { en: "Video Gallery", km: "វិចិត្រសាលវីដេអូ" },
	"media/paper-research": { en: "Paper Research", km: "ឯកសារស្រាវជ្រាវ" },
	"media/other-publications": { en: "Other Publications", km: "ឯកសារផ្សេងៗ" },
	"media/escup-sources": { en: "ESCUP Sources", km: "ប្រភព ESCUP" },
	"media/life-skills": { en: "Life Skills Education", km: "ការអប់រំជំនាញជីវិត" },
	"media/ai-digital": { en: "AI and Digital Education", km: "AI និងការអប់រំឌីជីថល" },
	"media/policies": {
		en: "Policies and Regulations",
		km: "គោលនយោបាយ និងបទបញ្ជា",
	},
};

/** Section grouping for the Media & Publications menu (also used by the regroup script). */
export const MEDIA_GROUPS: { en: string; km: string; refs: string[] }[] = [
	{
		en: "Reports & Updates",
		km: "របាយការណ៍ និងព័ត៌មាន",
		refs: [
			"media/annual-report",
			"media/program-report",
			"media/program-brochure",
			"media/e-newsletter",
		],
	},
	{
		en: "Galleries",
		km: "វិចិត្រសាល",
		refs: ["media/photo-gallery", "media/video-gallery"],
	},
	{
		en: "Research & Publications",
		km: "ការស្រាវជ្រាវ និងការបោះពុម្ព",
		refs: [
			"media/paper-research",
			"media/other-publications",
			"media/escup-sources",
		],
	},
	{
		en: "Thematic Resources",
		km: "ធនធានតាមប្រធានបទ",
		refs: ["media/life-skills", "media/ai-digital", "media/policies"],
	},
];

/** Create a picsum-backed media row and return its id (used for nav card images). */
async function createPicsumMedia(seed: string): Promise<number> {
	const [m] = await db
		.insert(media)
		.values({
			tenantId: TENANT,
			r2Key: `seed/nav-${seed}.jpg`,
			url: `https://picsum.photos/seed/${seed}/640/400`,
			contentType: "image/jpeg",
		})
		.returning({ id: media.id });
	return m.id;
}

async function addNavTree(nodes: SeedNav[], parentId: number | null) {
	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i];
		const meta = navMetaFor(n);
		const imageMediaId = meta ? await createPicsumMedia(meta.img) : null;
		const [row] = await db
			.insert(navItems)
			.values({
				tenantId: TENANT,
				parentId,
				sort: i,
				targetKind: n.kind,
				targetRef: n.ref,
				visible: true,
				imageMediaId,
			})
			.returning({ id: navItems.id });
		await addTranslations("nav_item", row.id, {
			label: { en: n.en, km: n.km },
			...(meta?.brief ? { description: { en: meta.brief } } : {}),
		});
		if (n.children?.length) await addNavTree(n.children, row.id);
	}
}

function doc(text: string) {
	return JSON.stringify({
		type: "doc",
		content: [{ type: "paragraph", content: [{ type: "text", text }] }],
	});
}

async function main() {
	if (await alreadySeeded()) {
		console.log("Already seeded — skipping.");
		return;
	}

	await db.insert(tenants).values({ id: TENANT, slug: "kape", name: "KAPE" });

	await db.insert(languages).values([
		{
			code: "en",
			name: "English",
			nativeName: "English",
			isDefault: true,
			enabled: true,
			sort: 0,
		},
		{
			code: "km",
			name: "Khmer",
			nativeName: "ខ្មែរ",
			isDefault: false,
			enabled: true,
			sort: 1,
		},
	]);

	// UI chrome strings (en + km) for the default tenant.
	const uiRows: {
		tenantId: number;
		key: string;
		lang: string;
		value: string;
	}[] = [];
	for (const [key, v] of Object.entries(defaultUiStrings)) {
		uiRows.push({ tenantId: TENANT, key, lang: "en", value: v.en });
		if (v.km) uiRows.push({ tenantId: TENANT, key, lang: "km", value: v.km });
	}
	await db.insert(uiStrings).values(uiRows);

	await db.insert(contentTypes).values(
		[
			["news", "News & Events"],
			["story", "Impact / Success Story"],
			["announcement", "Announcement"],
			["job", "Job Vacancy"],
			["document", "Document"],
			["album", "Photo Album"],
			["video", "Video"],
			["event", "Calendar Event"],
			["internal_news", "Internal News"],
			["publication", "Publication"],
		].map(([key, name], i) => ({ key, name, isSystem: true, sort: i })),
	);

	// Full navigation tree (admin-editable later). `none` = label-only dropdown parent.
	const p = (ref: string, en: string, km: string): SeedNav => ({
		kind: "page",
		ref,
		en,
		km,
	});
	const proj = (ref: string, code: string): SeedNav => ({
		kind: "page",
		ref,
		en: code,
		km: code,
	});
	const NAV: SeedNav[] = [
		{ kind: "page", ref: "", en: "Home", km: "ទំព័រដើម" },
		{
			kind: "none",
			ref: "",
			en: "Who We Are",
			km: "អំពីយើង",
			children: [
				p("who-we-are/about", "About KAPE", "អំពី KAPE"),
				p("who-we-are/news", "News and Events", "ព័ត៌មាន និងព្រឹត្តិការណ៍"),
				p("who-we-are/fact-sheet", "Fact Sheet", "ឯកសារពិត"),
				p(
					"who-we-are/vision-mission",
					"Vision, Mission & Core Values",
					"ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល",
				),
				p(
					"who-we-are/director-speech",
					"Executive Director's Speech",
					"សុន្ទរកថានាយកប្រតិបត្តិ",
				),
				p(
					"who-we-are/leadership",
					"Leadership Team & Organizational Chart",
					"ក្រុមដឹកនាំ និងគ្រោងស្ថាប័ន",
				),
				p("who-we-are/partners", "Our Partners", "ដៃគូរបស់យើង"),
			],
		},
		{
			kind: "none",
			ref: "",
			en: "What We Do",
			km: "សកម្មភាពយើង",
			children: [
				{
					kind: "none",
					ref: "",
					en: "Current Projects",
					km: "គម្រោងបច្ចុប្បន្ន",
					children: [
						proj("current-projects/ngs", "NGS"),
						proj("current-projects/ngprc", "NGPRC"),
						proj("current-projects/hcc", "HCC"),
						proj("current-projects/class", "CLASS"),
						proj("current-projects/iep", "IEP"),
						proj("current-projects/dep", "DEP"),
						proj("current-projects/mldp", "MLDP"),
						proj("current-projects/equal-i3l", "EQUAL-i3L"),
						proj("current-projects/llse", "LLSE"),
					],
				},
				{
					kind: "none",
					ref: "",
					en: "Past Projects",
					km: "គម្រោងពីមុន",
					children: [
						proj("past-projects/ibec", "IBEC"),
						proj("past-projects/e2l", "E2L"),
						proj("past-projects/lslag", "LSLAG"),
						proj("past-projects/seek", "SEEK"),
						proj("past-projects/kyla", "KYLA"),
						proj("past-projects/sfe", "SfE"),
						proj("past-projects/bfc", "BfC"),
						proj("past-projects/escup", "ESCUP"),
						proj("past-projects/bsi", "BSI"),
					],
				},
				p(
					"what-we-do/impact-stories",
					"Impact / Success Stories",
					"រឿងរ៉ាវជោគជ័យ",
				),
				p("what-we-do/ict-innovation", "ICT Innovation", "បច្ចេកវិទ្យាព័ត៌មាន"),
				p(
					"what-we-do/learning-applications",
					"Learning Applications",
					"កម្មវិធីសិក្សា",
				),
			],
		},
		{
			kind: "none",
			ref: "",
			en: "Media & Publications",
			km: "ប្រព័ន្ធផ្សព្វផ្សាយ",
			children: MEDIA_GROUPS.map((g) => ({
				kind: "none",
				ref: "",
				en: g.en,
				km: g.km,
				children: g.refs.map((r) => p(r, MEDIA_ITEMS[r].en, MEDIA_ITEMS[r].km)),
			})),
		},
		{
			kind: "none",
			ref: "",
			en: "Opportunities",
			km: "ឱកាស",
			children: [
				p("opportunities/partner", "Partner with KAPE", "ភាពជាដៃគូជាមួយ KAPE"),
				p("opportunities/careers", "Job Vacancies & Careers", "មុខតំណែងការងារ"),
				p("opportunities/alumni", "Alumni Network", "បណ្តាញនិស្សិតចាស់"),
				p("opportunities/scholarship", "Scholarship Program", "កម្មវិធីអាហារូបករណ៍"),
				p("opportunities/volunteer", "Volunteer with KAPE", "ស្ម័គ្រចិត្តជាមួយ KAPE"),
			],
		},
		{ kind: "page", ref: "contact", en: "Contact", km: "ទំនាក់ទំនង" },
	];
	await addNavTree(NAV, null);

	// Rich-text pages (rendered by the generic /$ page route).
	const seedPages: {
		slug: string;
		title: { en: string; km: string };
		body: { en: string; km: string };
	}[] = [
		{
			slug: "who-we-are/about",
			title: { en: "About KAPE", km: "អំពី KAPE" },
			body: {
				en: doc(
					"Kampuchea Action to Promote Education (KAPE) is the largest local education NGO in Cambodia, working across 15 provinces from preschools to a Master's in Mentoring.",
				),
				km: doc(
					"អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា (ខេប) គឺជាអង្គការអប់រំក្នុងស្រុកធំជាងគេនៅកម្ពុជា ធ្វើការនៅ១៥ខេត្ត ចាប់ពីសាលាមត្តេយ្យដល់បរិញ្ញាបត្រអនុបណ្ឌិតផ្នែកការណែនាំ។",
				),
			},
		},
		{
			slug: "who-we-are/fact-sheet",
			title: { en: "Fact Sheet", km: "ឯកសារពិត" },
			body: {
				en: doc(
					"Founded in 1999 and headquartered in Kampong Cham, KAPE focuses on access, quality and equity in education through systemic partnerships with MoEYS.",
				),
				km: doc(
					"បង្កើតឡើងក្នុងឆ្នាំ១៩៩៩ និងមានទីស្នាក់ការនៅកំពង់ចាម ខេបផ្តោតលើលទ្ធភាព គុណភាព និងសមធម៌ក្នុងការអប់រំ។",
				),
			},
		},
		{
			slug: "who-we-are/vision-mission",
			title: {
				en: "Vision, Mission & Core Values",
				km: "ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល",
			},
			body: {
				en: doc(
					"Our vision is for children and youth to make the best life choices that match their potential as a result of a good education.",
				),
				km: doc(
					"ចក្ខុវិស័យរបស់យើងគឺឱ្យកុមារ និងយុវជនអាចធ្វើការសម្រេចចិត្តក្នុងជីវិតបានល្អបំផុតស្របតាមសក្តានុពលរបស់ពួកគេ។",
				),
			},
		},
		{
			slug: "who-we-are/director-speech",
			title: { en: "Executive Director's Speech", km: "សុន្ទរកថានាយកប្រតិបត្តិ" },
			body: {
				en: doc(
					"Welcome to the official digital home of KAPE. This website reflects our journey, transparency and enduring commitment to the children and youth of Cambodia.",
				),
				km: doc(
					"សូមស្វាគមន៍មកកាន់គេហទំព័រផ្លូវការរបស់ខេប។ គេហទំព័រនេះឆ្លុះបញ្ចាំងពីដំណើរ តម្លាភាព និងការប្តេជ្ញាចិត្តរបស់យើងចំពោះកុមារ និងយុវជនកម្ពុជា។",
				),
			},
		},
		{
			slug: "who-we-are/partners",
			title: { en: "Our Partners", km: "ដៃគូរបស់យើង" },
			body: {
				en: doc(
					"KAPE collaborates with the Royal Government of Cambodia, MoEYS, international donors, foundations and grassroots organisations to deliver lasting impact.",
				),
				km: doc(
					"ខេបសហការជាមួយរាជរដ្ឋាភិបាលកម្ពុជា ក្រសួងអប់រំ ម្ចាស់ជំនួយអន្តរជាតិ មូលនិធិ និងអង្គការមូលដ្ឋាន ដើម្បីបង្កើតផលប៉ះពាល់យូរអង្វែង។",
				),
			},
		},
	];
	for (const pg of seedPages) {
		const [row] = await db
			.insert(pages)
			.values({ tenantId: TENANT, slug: pg.slug, status: "published" })
			.returning({ id: pages.id });
		await addTranslations("page", row.id, { title: pg.title, body: pg.body });
	}

	// Sample news posts.
	const newsPosts: {
		slug: string;
		publishedAt: string;
		title: { en: string; km: string };
		excerpt: { en: string; km: string };
		body: { en: string; km: string };
	}[] = [
		{
			slug: "school-enrollment-campaign-2025-2026",
			publishedAt: "2025-09-01",
			title: {
				en: "Provincial Campaign to Boost School Enrollment for 2025–2026",
				km: "យុទ្ធនាការខេត្តដើម្បីបង្កើនការចុះឈ្មោះចូលរៀនឆ្នាំ ២០២៥–២០២៦",
			},
			excerpt: {
				en: "A wave of educational outreach is sweeping across Cambodia's provinces.",
				km: "រលកនៃការផ្សព្វផ្សាយអប់រំកំពុងរីករាលដាលនៅខេត្តនានា។",
			},
			body: {
				en: doc(
					"Across fifteen provinces, KAPE teams partnered with provincial education departments to welcome every child back to school for the new academic year.",
				),
				km: doc(
					"នៅទូទាំង១៥ខេត្ត ក្រុមការងារ KAPE បានសហការជាមួយមន្ទីរអប់រំខេត្ត ដើម្បីស្វាគមន៍កុមារគ្រប់រូបឱ្យត្រឡប់មកសិក្សាវិញសម្រាប់ឆ្នាំសិក្សាថ្មី។",
				),
			},
		},
		{
			slug: "kang-meas-21st-century-library",
			publishedAt: "2026-05-25",
			title: {
				en: "Kang Meas District Receives 21st-Century Library for Vulnerable Children",
				km: "ស្រុកកងមាសទទួលបានបណ្ណាល័យសតវត្សរ៍ទី២១សម្រាប់កុមារងាយរងគ្រោះ",
			},
			excerpt: {
				en: "The BMZ-EYE project handed over a modern library and learning materials at Preak Koy Primary School.",
				km: "គម្រោង BMZ-EYE បានប្រគល់បណ្ណាល័យទំនើប និងសម្ភារៈសិក្សានៅសាលាបឋមសិក្សាព្រែកគយ។",
			},
			body: {
				en: doc(
					"On the morning of 25 May 2026, the BMZ-EYE project organised a handover ceremony for a 21st-century library room at Preak Koy Primary School in Kang Meas District, Kampong Cham.",
				),
				km: doc(
					"នៅព្រឹកថ្ងៃទី២៥ ឧសភា ២០២៦ គម្រោង BMZ-EYE បានរៀបចំពិធីប្រគល់បន្ទប់បណ្ណាល័យសតវត្សរ៍ទី២១នៅសាលាបឋមសិក្សាព្រែកគយ ស្រុកកងមាស ខេត្តកំពង់ចាម។",
				),
			},
		},
		{
			slug: "ngs-ict-lab-opens",
			publishedAt: "2026-05-02",
			title: {
				en: "New ICT Lab Opens at a New Generation School",
				km: "បន្ទប់ពិសោធន៍ ICT ថ្មីបើកនៅសាលាជំនាន់ថ្មី",
			},
			excerpt: {
				en: "Students gain a dedicated space for digital learning, coding clubs and AI literacy.",
				km: "សិស្សទទួលបានកន្លែងសម្រាប់ការសិក្សាឌីជីថល ក្លឹបសរសេរកូដ និងអក្ខរកម្ម AI។",
			},
			body: {
				en: doc(
					"As part of the New Generation School initiative, a new ICT lab gives secondary students hands-on access to modern computing.",
				),
				km: doc(
					"ជាផ្នែកនៃគំនិតផ្តួចផ្តើមសាលាជំនាន់ថ្មី បន្ទប់ពិសោធន៍ ICT ថ្មីផ្តល់ឱ្យសិស្សមធ្យមសិក្សានូវការប្រើប្រាស់កុំព្យូទ័រទំនើបដោយផ្ទាល់ដៃ។",
				),
			},
		},
	];
	for (const n of newsPosts) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "news",
				slug: n.slug,
				status: "published",
				author: "KAPE Cambodia",
				publishedAt: n.publishedAt,
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: n.title,
			excerpt: n.excerpt,
			body: n.body,
		});
	}

	// Impact / success stories (type=story).
	const stories: {
		slug: string;
		title: { en: string; km: string };
		excerpt: { en: string; km: string };
		body: { en: string; km: string };
	}[] = [
		{
			slug: "yary-happy-cambodian-children",
			title: {
				en: "A life rewritten by the Happy Cambodian Children project",
				km: "ជីវិតមួយដែលបានសរសេរឡើងវិញដោយគម្រោងកុមារកម្ពុជាសប្បាយ",
			},
			excerpt: {
				en: "Yary, age 11, Grade 6 — Rompok Primary School, Kratie.",
				km: "យ៉ារី អាយុ១១ឆ្នាំ ថ្នាក់ទី៦ — សាលាបឋមសិក្សារំពក់ ខេត្តក្រចេះ។",
			},
			body: {
				en: doc(
					"With support from the Happy Cambodian Children project, Yary found her footing in school and now dreams bigger for her family and community.",
				),
				km: doc(
					"ដោយមានការគាំទ្រពីគម្រោងកុមារកម្ពុជាសប្បាយ យ៉ារីបានរកឃើញទីតាំងរបស់នាងនៅសាលា ហើយឥឡូវនេះសុបិនធំសម្រាប់គ្រួសារ និងសហគមន៍របស់នាង។",
				),
			},
		},
		{
			slug: "teacher-sum-bopha-digital-literacy",
			title: {
				en: "Bridging the urban–rural classroom with digital literacy",
				km: "តភ្ជាប់ថ្នាក់រៀនទីក្រុង និងជនបទដោយអក្ខរកម្មឌីជីថល",
			},
			excerpt: {
				en: "Ms. Sum Bopha, Physics teacher — Siem Reap.",
				km: "លោកស្រី ស៊ុម បុប្ផា គ្រូរូបវិទ្យា — ខេត្តសៀមរាប។",
			},
			body: {
				en: doc(
					"Technology and modern teaching aids are powerful tools, but the true heart of transformation is the lifelong learning will of teachers and students.",
				),
				km: doc(
					"បច្ចេកវិទ្យា និងឧបករណ៍បង្រៀនទំនើបជាឧបករណ៍ដ៏មានឥទ្ធិពល ប៉ុន្តែបេះដូងពិតនៃការផ្លាស់ប្តូរគឺឆន្ទៈសិក្សាពេញមួយជីវិតរបស់គ្រូ និងសិស្ស។",
				),
			},
		},
	];
	for (const s of stories) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "story",
				slug: s.slug,
				status: "published",
				author: "KAPE Cambodia",
				publishedAt: "2026-05-01",
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: s.title,
			excerpt: s.excerpt,
			body: s.body,
		});
	}

	// Managed reference data (taxonomies) for relation fields.
	const termSeed: Record<string, [string, string][]> = {
		location: [
			["Kampong Cham", "Kampong Cham"],
			["Phnom Penh", "Phnom Penh"],
			["Siem Reap", "Siem Reap"],
			["Kratie", "Kratie"],
			["Banteay Meanchey", "Banteay Meanchey"],
			["Battambang", "Battambang"],
			["Ratanakiri", "Ratanakiri"],
			["Svay Rieng", "Svay Rieng"],
			["Kampong Chhnang", "Kampong Chhnang"],
			["All provinces", "All provinces"],
		],
		publication_category: [
			["annual-report", "Annual Report"],
			["program-brochure", "Program Brochure"],
			["program-report", "Program Report"],
			["paper-research", "Paper Research"],
			["e-newsletter", "E-Newsletter"],
			["other-publications", "Other Publications"],
			["policies", "Policies & Regulations"],
		],
		doc_category: [
			["Admin & HR", "Admin & HR"],
			["Finance & Procurement", "Finance & Procurement"],
			["Program & M&E", "Program & M&E"],
			["Branding & Media", "Branding & Media"],
			["IT", "IT Supportive Resources"],
		],
		partner_category: [
			["government", "Government Agencies"],
			["local-ngo", "Local NGOs"],
			["intl-ngo", "International NGOs"],
			["foundation", "Foundations"],
			["news-agency", "News Agencies"],
		],
	};
	for (const [taxonomy, items] of Object.entries(termSeed)) {
		await db.insert(terms).values(
			items.map(([key, lbl], i) => ({
				tenantId: TENANT,
				taxonomy,
				key,
				label: lbl,
				sort: i,
			})),
		);
	}

	// Public publications (type=publication; category/year/fileUrl in meta).
	const publications: {
		slug: string;
		category: string;
		year: string;
		title: { en: string; km: string };
	}[] = [
		{
			slug: "annual-report-2025",
			category: "annual-report",
			year: "2025",
			title: { en: "KAPE Annual Report 2025", km: "របាយការណ៍ប្រចាំឆ្នាំ ខេប ២០២៥" },
		},
		{
			slug: "annual-report-2024",
			category: "annual-report",
			year: "2024",
			title: { en: "KAPE Annual Report 2024", km: "របាយការណ៍ប្រចាំឆ្នាំ ខេប ២០២៤" },
		},
		{
			slug: "program-brochure-ngs",
			category: "program-brochure",
			year: "2025",
			title: {
				en: "New Generation Schools — Programme Brochure",
				km: "ប័ណ្ណកម្មវិធីសាលាជំនាន់ថ្មី",
			},
		},
		{
			slug: "research-early-literacy",
			category: "paper-research",
			year: "2024",
			title: {
				en: "Early-Grade Literacy in Cambodia (Research Paper)",
				km: "ឯកសារស្រាវជ្រាវអក្ខរកម្មកម្រិតដំបូង",
			},
		},
	];
	for (const pub of publications) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "publication",
				slug: pub.slug,
				status: "published",
				publishedAt: `${pub.year}-12-31`,
				meta: {
					category: pub.category,
					year: pub.year,
					fileUrl: `https://www.kapekh.org/${pub.slug}.pdf`,
					downloadCount: 0,
				},
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, { title: pub.title });
	}

	// Photo albums (type=album) with media + captions (placeholder images).
	const albums: {
		slug: string;
		title: { en: string; km: string };
		photos: { seed: string; caption: { en: string; km: string } }[];
	}[] = [
		{
			slug: "album-library-launch",
			title: {
				en: "21st-Century Library Launch",
				km: "ការសម្ពោធបណ្ណាល័យសតវត្សរ៍ទី២១",
			},
			photos: [
				{
					seed: "lib-a",
					caption: { en: "Ribbon-cutting ceremony", km: "ពិធីកាត់ខ្សែបូ" },
				},
				{
					seed: "lib-b",
					caption: {
						en: "Children exploring new books",
						km: "កុមារកំពុងស្វែងយល់សៀវភៅថ្មី",
					},
				},
				{
					seed: "lib-c",
					caption: {
						en: "Librarian training session",
						km: "វគ្គបណ្តុះបណ្តាលបណ្ណារក្ស",
					},
				},
			],
		},
		{
			slug: "album-ngs-classrooms",
			title: {
				en: "New Generation School Classrooms",
				km: "ថ្នាក់រៀនសាលាជំនាន់ថ្មី",
			},
			photos: [
				{
					seed: "ngs-a",
					caption: { en: "Students in the ICT lab", km: "សិស្សក្នុងបន្ទប់ ICT" },
				},
				{
					seed: "ngs-b",
					caption: { en: "Group project work", km: "ការងារគម្រោងជាក្រុម" },
				},
			],
		},
	];
	for (const al of albums) {
		const [arow] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "album",
				slug: al.slug,
				status: "published",
				publishedAt: "2026-05-25",
			})
			.returning({ id: posts.id });
		await addTranslations("post", arow.id, { title: al.title });
		let i = 0;
		for (const ph of al.photos) {
			const [mrow] = await db
				.insert(media)
				.values({
					tenantId: TENANT,
					r2Key: `seed/${ph.seed}.jpg`,
					url: `https://picsum.photos/seed/kape-${ph.seed}/1200/800`,
					contentType: "image/jpeg",
				})
				.returning({ id: media.id });
			await db
				.insert(postMedia)
				.values({ postId: arow.id, mediaId: mrow.id, sort: i });
			await addTranslations("media", mrow.id, { caption: ph.caption });
			i++;
		}
	}

	// Job vacancies (type=job; location/deadline in meta). One is expired to prove auto-hide.
	const jobs: {
		slug: string;
		location: string;
		deadline: string;
		title: { en: string; km: string };
	}[] = [
		{
			slug: "job-me-officer",
			location: "Kampong Cham",
			deadline: "2026-12-31",
			title: { en: "Project M&E Officer", km: "មន្ត្រី M&E គម្រោង" },
		},
		{
			slug: "job-comms-officer",
			location: "Phnom Penh",
			deadline: "2026-11-30",
			title: { en: "Communications Officer", km: "មន្ត្រីទំនាក់ទំនង" },
		},
		{
			slug: "job-expired-bidding",
			location: "All provinces",
			deadline: "2024-01-01",
			title: {
				en: "Public Bidding Invitation (closed)",
				km: "ការអញ្ជើញដេញថ្លៃ (បិទ)",
			},
		},
	];
	for (const j of jobs) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "job",
				slug: j.slug,
				status: "published",
				meta: { location: j.location, deadline: j.deadline },
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: j.title,
			body: {
				en: doc("Full job description and how to apply."),
				km: doc("ការពិពណ៌នាការងារពេញលេញ និងវិធីដាក់ពាក្យ។"),
			},
		});
	}

	// Videos (type=video; youtube_url in meta).
	const videos: {
		slug: string;
		url: string;
		title: { en: string; km: string };
		excerpt: { en: string; km: string };
	}[] = [
		{
			slug: "video-digital-literacy",
			url: "https://www.youtube.com/@KAPECambodia",
			title: {
				en: "Training Digital Literacy to Students",
				km: "បណ្តុះបណ្តាលអក្ខរកម្មឌីជីថលដល់សិស្ស",
			},
			excerpt: {
				en: "Classroom digital-literacy training.",
				km: "ការបណ្តុះបណ្តាលអក្ខរកម្មឌីជីថលក្នុងថ្នាក់។",
			},
		},
		{
			slug: "video-ict-lab",
			url: "https://www.youtube.com/@KAPECambodia",
			title: {
				en: "ICT Lab at a New Generation School",
				km: "បន្ទប់ ICT នៅសាលាជំនាន់ថ្មី",
			},
			excerpt: {
				en: "Students using the new ICT lab.",
				km: "សិស្សកំពុងប្រើបន្ទប់ ICT ថ្មី។",
			},
		},
		{
			slug: "video-ai-training",
			url: "https://www.youtube.com/@KAPECambodia",
			title: {
				en: "Teachers Attend AI Literacy Training",
				km: "គ្រូចូលរួមបណ្តុះបណ្តាលអក្ខរកម្ម AI",
			},
			excerpt: { en: "AI literacy for educators.", km: "អក្ខរកម្ម AI សម្រាប់គ្រូ។" },
		},
	];
	for (const v of videos) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "video",
				slug: v.slug,
				status: "published",
				meta: { youtube_url: v.url },
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: v.title,
			excerpt: v.excerpt,
		});
	}

	// Leadership people (unified `people` table; public team/leadership).
	const leadership: {
		slug: string;
		tier: string;
		position: string;
		name: { en: string; km: string };
		bio: { en: string; km: string };
	}[] = [
		{
			slug: "person-heang-koy",
			tier: "board",
			position: "Chairman of the Board",
			name: { en: "Mr. Heang Koy", km: "លោក ហេង គយ" },
			bio: {
				en: doc(
					"Chairman of the Board of Directors, providing strategic governance to KAPE for nearly two decades.",
				),
				km: doc("ប្រធានក្រុមប្រឹក្សាភិបាល ដែលផ្តល់អភិបាលកិច្ចយុទ្ធសាស្ត្រដល់ខេបជិតពីរទសវត្សរ៍។"),
			},
		},
		{
			slug: "person-exec-director",
			tier: "smt",
			position: "Executive Director",
			name: { en: "Executive Director", km: "នាយកប្រតិបត្តិ" },
			bio: {
				en: doc("Leads KAPE's senior management team and overall strategy."),
				km: doc("ដឹកនាំក្រុមគ្រប់គ្រងជាន់ខ្ពស់ និងយុទ្ធសាស្ត្ររួមរបស់ខេប។"),
			},
		},
		{
			slug: "person-ngs-pm",
			tier: "pm",
			position: "NGS Program Manager",
			name: { en: "NGS Program Manager", km: "អ្នកគ្រប់គ្រងកម្មវិធី NGS" },
			bio: {
				en: doc("Manages the New Generation Schools initiative."),
				km: doc("គ្រប់គ្រងគំនិតផ្តួចផ្តើមសាលាជំនាន់ថ្មី។"),
			},
		},
		{
			slug: "person-me-manager",
			tier: "pm",
			position: "M&E Manager",
			name: { en: "M&E Manager", km: "អ្នកគ្រប់គ្រង M&E" },
			bio: {
				en: doc("Leads monitoring and evaluation across programs."),
				km: doc("ដឹកនាំការត្រួតពិនិត្យ និងវាយតម្លៃលើកម្មវិធី។"),
			},
		},
	];
	for (let i = 0; i < leadership.length; i++) {
		const pn = leadership[i];
		const [row] = await db
			.insert(people)
			.values({
				tenantId: TENANT,
				nameEn: pn.name.en,
				nameKm: pn.name.km,
				position: pn.position,
				tier: pn.tier,
				isPublic: true,
				slug: pn.slug,
				sort: i,
			})
			.returning({ id: people.id });
		await db.insert(translations).values([
			{
				tenantId: TENANT,
				entityType: "person",
				entityId: row.id,
				field: "bio",
				lang: "en",
				value: pn.bio.en,
			},
			{
				tenantId: TENANT,
				entityType: "person",
				entityId: row.id,
				field: "bio",
				lang: "km",
				value: pn.bio.km,
			},
		]);
	}

	// ---- Internal staff-portal content ----
	const internalNews: {
		slug: string;
		title: { en: string; km: string };
		excerpt: { en: string; km: string };
		body: { en: string; km: string };
	}[] = [
		{
			slug: "annual-assembly-2026",
			title: {
				en: "KAPE Annual Assembly Meeting 2026",
				km: "កិច្ចប្រជុំសភាប្រចាំឆ្នាំ ២០២៦",
			},
			excerpt: {
				en: "Held in Siem Reap, March 29 – April 2, 2026.",
				km: "ប្រព្រឹត្តនៅសៀមរាប ២៩ មីនា – ២ មេសា ២០២៦។",
			},
			body: {
				en: doc(
					"The 2026 assembly blended strategic vision with organizational harmony.",
				),
				km: doc("សភា២០២៦បានបញ្ចូលចក្ខុវិស័យយុទ្ធសាស្ត្រជាមួយសុខដុមរមនាស្ថាប័ន។"),
			},
		},
		{
			slug: "hr-policy-update",
			title: {
				en: "Updated HR Leave Policy",
				km: "បច្ចុប្បន្នភាពគោលនយោបាយឈប់សម្រាក",
			},
			excerpt: {
				en: "New leave guidelines effective this quarter.",
				km: "គោលការណ៍ឈប់សម្រាកថ្មីមានប្រសិទ្ធភាពត្រីមាសនេះ។",
			},
			body: {
				en: doc(
					"Please review the updated leave policy in Internal Documents.",
				),
				km: doc("សូមពិនិត្យគោលនយោបាយឈប់សម្រាកថ្មីនៅឯកសារផ្ទៃក្នុង។"),
			},
		},
	];
	for (const n of internalNews) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "internal_news",
				slug: n.slug,
				status: "published",
				author: "KAPE",
				publishedAt: "2026-04-05",
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: n.title,
			excerpt: n.excerpt,
			body: n.body,
		});
	}

	const events: {
		program: string;
		start: string;
		end: string;
		title: { en: string; km: string };
	}[] = [
		{
			program: "NGS",
			start: "2026-05-02",
			end: "2026-05-04",
			title: { en: "NGS Teacher Training", km: "វគ្គបណ្តុះបណ្តាលគ្រូ NGS" },
		},
		{
			program: "HCC",
			start: "2026-05-02",
			end: "2026-05-04",
			title: { en: "HCC Donor Visit", km: "ដំណើរទស្សនកិច្ចម្ចាស់ជំនួយ HCC" },
		},
		{
			program: "EYE",
			start: "2026-05-10",
			end: "2026-05-11",
			title: { en: "Library Inauguration", km: "ពិធីសម្ពោធបណ្ណាល័យ" },
		},
	];
	for (const e of events) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "event",
				slug: `event-${e.program.toLowerCase()}-${e.start}`,
				status: "published",
				publishedAt: e.start,
				meta: { program: e.program, start: e.start, end: e.end },
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, { title: e.title });
	}

	const documents: {
		slug: string;
		category: string;
		title: { en: string; km: string };
	}[] = [
		{
			slug: "doc-5yr-strategic-plan",
			category: "Admin & HR",
			title: { en: "5-Year Strategic Plan", km: "ផែនការយុទ្ធសាស្ត្រ៥ឆ្នាំ" },
		},
		{
			slug: "doc-procurement-guidelines",
			category: "Finance & Procurement",
			title: { en: "Procurement Guidelines", km: "គោលការណ៍ណែនាំលទ្ធកម្ម" },
		},
	];
	for (const d of documents) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "document",
				slug: d.slug,
				status: "published",
				meta: { category: d.category },
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, { title: d.title });
	}

	// Internal staff roster (unified `people` table; tier="staff", not public).
	await db.insert(people).values([
		{
			tenantId: TENANT,
			nameEn: "Heang Koy",
			nameKm: "ហេង គយ",
			tier: "staff",
			isPublic: false,
			staffNo: "K001",
			sex: "M",
			phone: "012 000 001",
			email: "heang.koy@kapekh.org",
			program: "Board",
			sort: 1000,
		},
		{
			tenantId: TENANT,
			nameEn: "Sum Bopha",
			nameKm: "ស៊ុម បុប្ផា",
			tier: "staff",
			isPublic: false,
			staffNo: "K002",
			sex: "F",
			phone: "012 000 002",
			email: "sum.bopha@kapekh.org",
			program: "NGS",
			sort: 1001,
		},
		{
			tenantId: TENANT,
			nameEn: "Chhim Phallak",
			nameKm: "ឈឹម ផល្លក",
			tier: "staff",
			isPublic: false,
			staffNo: "K003",
			sex: "F",
			phone: "012 000 003",
			email: "chhim.phallak@kapekh.org",
			program: "Library",
			sort: 1002,
		},
	]);

	// Staff-portal user.
	await db.insert(users).values({
		tenantId: TENANT,
		email: process.env.STAFF_EMAIL ?? "staff@kapekh.org",
		passwordHash: await hashPassword(
			process.env.STAFF_PASSWORD ?? "kape-staff-2026",
		),
		name: "KAPE Staff",
		role: "staff",
	});

	// ---- Structured entities (replace hardcoded UI content) ----

	// Site settings (kv).
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

	// Impact stats.
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

	// Donors.
	const donorIds: Record<string, number> = {};
	for (const [i, name] of [
		"Ministry of Education, Youth and Sport (MoEYS)",
		"European Union",
		"USAID",
		"Franks Family Foundation",
		"BMZ",
	].entries()) {
		const [row] = await db
			.insert(donors)
			.values({ tenantId: TENANT, name, sort: i })
			.returning({ id: donors.id });
		donorIds[name] = row.id;
	}

	// Projects (the "programs").
	const projectSeed: {
		code: string;
		slug: string;
		status: string;
		donors: string[];
		name: { en: string; km: string };
	}[] = [
		// Current
		{
			code: "NGS",
			slug: "ngs",
			status: "current",
			donors: [
				"Ministry of Education, Youth and Sport (MoEYS)",
				"Franks Family Foundation",
			],
			name: { en: "New Generation Schools", km: "សាលាជំនាន់ថ្មី" },
		},
		{
			code: "NGPRC",
			slug: "ngprc",
			status: "current",
			donors: ["Ministry of Education, Youth and Sport (MoEYS)"],
			name: {
				en: "New Generation Pedagogical Research Center",
				km: "មជ្ឈមណ្ឌលស្រាវជ្រាវគរុកោសល្យជំនាន់ថ្មី",
			},
		},
		{
			code: "HCC",
			slug: "hcc",
			status: "current",
			donors: ["BMZ"],
			name: { en: "Happy Cambodian Children", km: "កុមារកម្ពុជាសប្បាយ" },
		},
		{
			code: "CLASS",
			slug: "class",
			status: "current",
			donors: ["BMZ"],
			name: { en: "CLASS", km: "CLASS" },
		},
		{
			code: "IEP",
			slug: "iep",
			status: "current",
			donors: [],
			name: { en: "Inclusive Education Project", km: "គម្រោងអប់រំបរិយាប័ន្ន" },
		},
		{
			code: "DEP",
			slug: "dep",
			status: "current",
			donors: [],
			name: { en: "Digital Education Project", km: "គម្រោងអប់រំឌីជីថល" },
		},
		{
			code: "MLDP",
			slug: "mldp",
			status: "current",
			donors: [],
			name: { en: "MLDP", km: "MLDP" },
		},
		{
			code: "EQUAL-i3L",
			slug: "equal-i3l",
			status: "current",
			donors: ["European Union"],
			name: { en: "EQUAL-i3L", km: "EQUAL-i3L" },
		},
		{
			code: "LLSE",
			slug: "llse",
			status: "current",
			donors: [],
			name: { en: "Life-Long Skills Education", km: "ការអប់រំជំនាញពេញមួយជីវិត" },
		},
		// Past
		{
			code: "IBEC",
			slug: "ibec",
			status: "past",
			donors: ["USAID"],
			name: {
				en: "Improved Basic Education in Cambodia",
				km: "ការកែលម្អការអប់រំមូលដ្ឋាននៅកម្ពុជា",
			},
		},
		{
			code: "E2L",
			slug: "e2l",
			status: "past",
			donors: ["USAID"],
			name: {
				en: "Enabling Education for Learning",
				km: "ការអនុញ្ញាតការអប់រំសម្រាប់ការសិក្សា",
			},
		},
		{
			code: "LSLAG",
			slug: "lslag",
			status: "past",
			donors: [],
			name: { en: "LSLAG", km: "LSLAG" },
		},
		{
			code: "SEEK",
			slug: "seek",
			status: "past",
			donors: [],
			name: { en: "SEEK", km: "SEEK" },
		},
		{
			code: "KYLA",
			slug: "kyla",
			status: "past",
			donors: [],
			name: { en: "KYLA", km: "KYLA" },
		},
		{
			code: "SfE",
			slug: "sfe",
			status: "past",
			donors: [],
			name: { en: "Schools for Empowerment", km: "សាលាសម្រាប់ការផ្តល់អំណាច" },
		},
		{
			code: "BfC",
			slug: "bfc",
			status: "past",
			donors: [],
			name: { en: "Books for Cambodia", km: "សៀវភៅសម្រាប់កម្ពុជា" },
		},
		{
			code: "ESCUP",
			slug: "escup",
			status: "past",
			donors: ["USAID"],
			name: { en: "ESCUP", km: "ESCUP" },
		},
		{
			code: "BSI",
			slug: "bsi",
			status: "past",
			donors: [],
			name: { en: "Beacon Schools Initiative", km: "គំនិតផ្តួចផ្តើមសាលាគំរូ" },
		},
	];
	const projectIds: Record<string, number> = {};
	for (const p of projectSeed) {
		const [row] = await db
			.insert(projects)
			.values({
				tenantId: TENANT,
				code: p.code,
				slug: p.slug,
				status: p.status,
				sort: 0,
			})
			.returning({ id: projects.id });
		projectIds[p.code] = row.id;
		await addTranslations("project", row.id, {
			name: p.name,
			summary: {
				en: `${p.name.en} — a KAPE ${p.status} project.`,
				km: `${p.name.km} — គម្រោង${p.status === "current" ? "បច្ចុប្បន្ន" : "ពីមុន"}របស់ខេប។`,
			},
			body: {
				en: doc(`${p.name.en} overview and outcomes.`),
				km: doc(`ទិដ្ឋភាពទូទៅ និងលទ្ធផលនៃ${p.name.km}។`),
			},
		});
		for (const d of p.donors) {
			if (donorIds[d])
				await db
					.insert(projectDonors)
					.values({ projectId: row.id, donorId: donorIds[d] });
		}
	}

	// Project map locations.
	await db.insert(projectLocations).values([
		{
			tenantId: TENANT,
			projectId: projectIds.NGS,
			schoolName: "Hun Sen Rolea B'ier High School",
			lat: "12.245",
			lng: "104.668",
			sort: 0,
		},
		{
			tenantId: TENANT,
			projectId: projectIds.HCC,
			schoolName: "Rompok Primary School, Kratie",
			lat: "12.488",
			lng: "106.019",
			sort: 1,
		},
	]);

	// Schools KAPE supports (cover images reuse seeded media #1–#5).
	await db.insert(schools).values([
		{
			tenantId: TENANT,
			name: "Hun Sen Rolea B'ier High School",
			code: "NGS-001",
			level: "high",
			province: "Kampong Cham",
			projectId: projectIds.NGS,
			coverMediaId: 1,
			address: "Rolea B'ier, Kampong Chhnang",
			lat: "12.245",
			lng: "104.668",
			sort: 0,
		},
		{
			tenantId: TENANT,
			name: "Preah Sisowath High School",
			code: "NGS-002",
			level: "high",
			province: "Phnom Penh",
			projectId: projectIds.NGS,
			coverMediaId: 2,
			address: "Phnom Penh",
			lat: "11.563",
			lng: "104.928",
			sort: 1,
		},
		{
			tenantId: TENANT,
			name: "Rompok Primary School",
			code: "HCC-014",
			level: "primary",
			province: "Kratie",
			projectId: projectIds.HCC,
			coverMediaId: 3,
			address: "Rompok, Kratie",
			lat: "12.488",
			lng: "106.019",
			sort: 2,
		},
		{
			tenantId: TENANT,
			name: "Hun Sen Kampong Cham Preschool",
			code: "HCC-021",
			level: "preschool",
			province: "Kampong Cham",
			projectId: projectIds.HCC,
			coverMediaId: 4,
			address: "Kampong Cham Town",
			lat: "11.992",
			lng: "105.463",
			sort: 3,
		},
		{
			tenantId: TENANT,
			name: "Battambang Regional Teacher Training Center",
			code: "EYE-003",
			level: "higher",
			province: "Battambang",
			projectId: projectIds.EYE ?? null,
			coverMediaId: 5,
			address: "Battambang",
			lat: "13.095",
			lng: "103.203",
			sort: 4,
		},
	]);

	// Partners (grouped by category term).
	await db.insert(partners).values([
		{
			tenantId: TENANT,
			name: "MoEYS",
			category: "government",
			url: "https://moeys.gov.kh",
			sort: 0,
		},
		{ tenantId: TENANT, name: "NEP", category: "local-ngo", url: "#", sort: 1 },
		{
			tenantId: TENANT,
			name: "UNICEF",
			category: "intl-ngo",
			url: "https://unicef.org",
			sort: 2,
		},
		{
			tenantId: TENANT,
			name: "ASEAN Foundation",
			category: "foundation",
			url: "#",
			sort: 3,
		},
		{
			tenantId: TENANT,
			name: "CTN",
			category: "news-agency",
			url: "#",
			sort: 4,
		},
	]);

	// Offices (Contact map + cards).
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

	// Hero slides (placeholder images via media).
	for (let i = 0; i < 3; i++) {
		const [m] = await db
			.insert(media)
			.values({
				tenantId: TENANT,
				r2Key: `seed/hero-${i}.jpg`,
				url: `https://picsum.photos/seed/kape-hero-${i}/1600/1000`,
				contentType: "image/jpeg",
			})
			.returning({ id: media.id });
		const [s] = await db
			.insert(heroSlides)
			.values({ tenantId: TENANT, mediaId: m.id, kind: "image", sort: i })
			.returning({ id: heroSlides.id });
		await addTranslations("hero_slide", s.id, {
			kicker: {
				en: ["Classrooms of hope", "Digital futures", "Partners for change"][i],
				km: ["ថ្នាក់រៀននៃក្តីសង្ឃឹម", "អនាគតឌីជីថល", "ដៃគូសម្រាប់ការផ្លាស់ប្តូរ"][i],
			},
			title: {
				en: [
					"Every child, every classroom",
					"ICT labs that open new worlds",
					"Leaders aligning on equity",
				][i],
				km: [
					"កុមារគ្រប់រូប ថ្នាក់រៀនគ្រប់ថ្នាក់",
					"បន្ទប់ ICT ដែលបើកពិភពថ្មី",
					"អ្នកដឹកនាំរួបរួមលើសមធម៌",
				][i],
			},
			caption: { en: "KAPE across 15 provinces", km: "ខេបនៅ១៥ខេត្ត" },
		});
	}

	// Announcements are posts (contentType=announcement). meta.deadline drives the
	// floating homepage card; meta.link is an optional CTA. One active, one evergreen.
	const announcementPosts: {
		slug: string;
		deadline: string | null;
		link: string | null;
		title: { en: string; km: string };
		excerpt: { en: string; km: string };
	}[] = [
		{
			slug: "public-bidding-invitation-2026",
			deadline: "2026-12-15",
			link: "/opportunities/careers",
			title: {
				en: "Public Bidding Invitation now open",
				km: "ការអញ្ជើញដេញថ្លៃជាសាធារណៈបើកហើយ",
			},
			excerpt: {
				en: "Deadline: 15 December 2026 · Click to read the full notice.",
				km: "ផុតកំណត់៖ ១៥ ធ្នូ ២០២៦ · ចុចដើម្បីអានសេចក្តីជូនដំណឹងពេញលេញ។",
			},
		},
		{
			slug: "where-every-cambodian-child-learns",
			deadline: null,
			link: null,
			title: {
				en: "Where every Cambodian child learns",
				km: "កន្លែងដែលកុមារកម្ពុជាគ្រប់រូបរៀន",
			},
			excerpt: {
				en: "For more than thirty years, KAPE has walked alongside Cambodia's children.",
				km: "ជាង៣០ឆ្នាំមកហើយ ខេបបានដើររួមជាមួយកុមារកម្ពុជា។",
			},
		},
	];
	for (const a of announcementPosts) {
		const [row] = await db
			.insert(posts)
			.values({
				tenantId: TENANT,
				contentType: "announcement",
				slug: a.slug,
				status: "published",
				publishedAt: "2026-06-01",
				meta: { deadline: a.deadline, link: a.link },
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: a.title,
			excerpt: a.excerpt,
		});
	}

	// Admin user.
	const adminEmail = process.env.ADMIN_EMAIL ?? "admin@kapekh.org";
	const adminPassword = process.env.ADMIN_PASSWORD ?? "kape-admin-2026";
	await db.insert(users).values({
		tenantId: TENANT,
		email: adminEmail,
		passwordHash: await hashPassword(adminPassword),
		name: "KAPE Admin",
		role: "admin",
	});

	// Transform the base content into the page-tree + flat-collection model:
	// landing pages, migrated static section pages, the section-built home page,
	// the parent/segment tree, and flattened nav targets.
	await applyTreeMigrations(db);

	console.log(
		"Seed complete: 2 languages, UI strings, content types, full nav tree, page tree + collections, home page, 3 news, 2 stories.",
	);
	// Never print passwords (logs get archived). Show the email only; if a password
	// wasn't supplied via env, note that the documented dev default was used.
	console.log(
		`Admin user: ${adminEmail}${process.env.ADMIN_PASSWORD ? "" : " (default dev password — change it before go-live)"}`,
	);
	console.log("Staff user: staff@kapekh.org");
}

await main();
