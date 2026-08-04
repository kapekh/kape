import { db } from "../db";
import { navItems } from "../schema";
import { addTranslations, createPicsumMedia, TENANT } from "./helpers";

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
function navMetaFor(n: { ref: string; en: string }) {
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

/** Full navigation tree (admin-editable later). `none` = label-only dropdown parent. */
export async function seedNav() {
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
}
