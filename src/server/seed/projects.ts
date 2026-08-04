import { db } from "../db";
import {
	donors,
	projectDonors,
	projectLocations,
	projects,
	schools,
} from "../schema";
import { addTranslations, TENANT } from "./helpers";

type Copy = { en: string; km: string };

type ProjectSeed = {
	code: string;
	slug: string;
	/** Parent project code — the record then resolves at /projects/<parent>/<slug>. */
	parent?: string;
	status: "current" | "past";
	start: string;
	end: string;
	donors: string[];
	targetAreas: string[];
	location: { schoolName: string; lat: string; lng: string };
	name: Copy;
	summary: Copy;
	/**
	 * Defaults to TAIL alone. On every source route but dep and iep the meta
	 * description and the first body paragraph are the same sentence; it is seeded
	 * once, as the summary, so the page does not print it twice.
	 */
	body?: { en: string[]; km: string[] };
};

const TAIL: Copy = {
	en: "Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team.",
	km: "ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។",
};

const MOEYS = "Ministry of Education, Youth and Sport (MoEYS)";

const PROJECT_SEED: ProjectSeed[] = [
	{
		code: "NGS",
		slug: "ngs",
		status: "current",
		start: "2015-01-01",
		end: "2028-12-31",
		donors: [MOEYS, "Asian Development Bank (ADB)"],
		targetAreas: ["Kampong Cham"],
		location: {
			schoolName: "Hun Sen Kampong Cham High School",
			lat: "12.0",
			lng: "105.45",
		},
		name: { en: "New Generation School", km: "សាលាជំនាន់ថ្មី" },
		summary: {
			en: "New Generation School project by KAPE.",
			km: "សាលាជំនាន់ថ្មី ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "NGPRC",
		slug: "ngprc",
		status: "current",
		start: "2020-01-01",
		end: "2027-12-31",
		donors: [MOEYS, "Google.org"],
		targetAreas: ["Kampong Cham"],
		location: {
			schoolName: "NGPRC Resource Center",
			lat: "12.05",
			lng: "105.5",
		},
		name: {
			en: "New Generation Pre-service Resource Center",
			km: "មជ្ឈមណ្ឌលធនធានបណ្តុះបណ្តាលគ្រូមុនចូលបម្រើការជំនាន់ថ្មី",
		},
		summary: {
			en: "New Generation Pre-service Resource Center project by KAPE.",
			km: "មជ្ឈមណ្ឌលធនធានបណ្តុះបណ្តាលគ្រូមុនចូលបម្រើការជំនាន់ថ្មី ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "HCC",
		slug: "hcc",
		status: "current",
		start: "2019-06-01",
		end: "2027-05-31",
		donors: ["Happy Cambodian Children (HCC)"],
		targetAreas: ["Kratie"],
		location: {
			schoolName: "Rompok Primary School",
			lat: "12.4881",
			lng: "106.0189",
		},
		name: { en: "Happy Cambodian Children", km: "កុមារកម្ពុជាសប្បាយរីករាយ" },
		summary: {
			en: "Happy Cambodian Children project by KAPE.",
			km: "កុមារកម្ពុជាសប្បាយរីករាយ ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "CLASS",
		slug: "class",
		status: "current",
		start: "2023-01-01",
		end: "2026-12-31",
		donors: ["ChildFund Korea"],
		targetAreas: ["Banteay Meanchey"],
		location: {
			schoolName: "CLASS partner schools",
			lat: "13.75",
			lng: "103.0",
		},
		name: {
			en: "Comprehensive Learning and Academic Support Strategy",
			km: "យុទ្ធសាស្ត្រសិក្សាទូលំទូលាយ និងការគាំទ្រផ្នែកសិក្សា",
		},
		summary: {
			en: "Comprehensive Learning and Academic Support Strategy project by KAPE.",
			km: "យុទ្ធសាស្ត្រសិក្សាទូលំទូលាយ និងការគាំទ្រផ្នែកសិក្សា ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "MLDP",
		slug: "mldp",
		status: "current",
		start: "2022-10-01",
		end: "2026-09-30",
		donors: ["The Asia Foundation"],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "NIE, Phnom Penh",
			lat: "11.5264",
			lng: "104.8982",
		},
		name: {
			en: "Master's Degree in Leadership and Mentoring",
			km: "បរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកភាពជាអ្នកដឹកនាំ និងការណែនាំ",
		},
		summary: {
			en: "Master's Degree in Leadership and Mentoring project by KAPE.",
			km: "បរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកភាពជាអ្នកដឹកនាំ និងការណែនាំ ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "EQUAL-i3L",
		slug: "equal-i3l",
		status: "current",
		start: "2022-03-01",
		end: "2027-02-28",
		donors: ["WeWorld", "European Union"],
		targetAreas: ["Siem Reap"],
		location: {
			schoolName: "Sophorn Kiri Primary School",
			lat: "13.3671",
			lng: "103.8448",
		},
		name: { en: "EQUAL-i3L", km: "EQUAL-i3L" },
		summary: {
			en: "EQUAL-i3L project by KAPE.",
			km: "EQUAL-i3L ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "LLSE",
		slug: "llse",
		status: "current",
		start: "2021-09-01",
		end: "2026-08-31",
		donors: ["UNICEF Cambodia", MOEYS],
		targetAreas: ["Tboung Khmum"],
		location: {
			schoolName: "Arrany Rangsey LSS",
			lat: "11.9",
			lng: "105.83",
		},
		name: {
			en: "Lower Secondary School Enhancement",
			km: "ការលើកកម្ពស់គុណភាពអនុវិទ្យាល័យ",
		},
		summary: {
			en: "Lower Secondary School Enhancement project by KAPE.",
			km: "ការលើកកម្ពស់គុណភាពអនុវិទ្យាល័យ ជាគម្រោងរបស់ខេប។",
		},
	},
	{
		code: "DEP",
		slug: "dep",
		status: "current",
		start: "2021-01-01",
		end: "2027-12-31",
		donors: ["Google.org", "Meta"],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "Preah Sisowath High School",
			lat: "11.5564",
			lng: "104.9282",
		},
		name: { en: "Digital Education Program", km: "កម្មវិធីអប់រំឌីជីថល" },
		summary: {
			en: "The Digital Education Program (DEP) builds digital, media and AI capability across Cambodian schools.",
			km: "កម្មវិធីអប់រំឌីជីថល (DEP) កសាងសមត្ថភាពឌីជីថល ប្រព័ន្ធផ្សព្វផ្សាយ និងបញ្ញាសិប្បនិម្មិត នៅតាមសាលារៀនកម្ពុជា។",
		},
		body: {
			en: [
				"The Digital Education Program (DEP) builds digital and AI capability across Cambodian schools — equipping teachers, students and school leaders with the skills, devices and curricula they need for a digital economy.",
				"DEP operates through a portfolio of focused sub-projects, each with its own donors, target provinces and timelines.",
			],
			km: [
				"កម្មវិធីអប់រំឌីជីថល (DEP) កសាងសមត្ថភាពឌីជីថល និងបញ្ញាសិប្បនិម្មិតនៅតាមសាលារៀនកម្ពុជា — ដោយផ្តល់ជូនគ្រូបង្រៀន សិស្ស និងថ្នាក់ដឹកនាំសាលា នូវជំនាញ ឧបករណ៍ និងកម្មវិធីសិក្សាដែលពួកគេត្រូវការសម្រាប់សេដ្ឋកិច្ចឌីជីថល។",
				"DEP ដំណើរការតាមរយៈបណ្តុំអនុគម្រោងជាក់លាក់ ដែលនីមួយៗមានម្ចាស់ជំនួយ ខេត្តគោលដៅ និងកាលវិភាគរៀងៗខ្លួន។",
			],
		},
	},
	{
		code: "IEP",
		slug: "iep",
		status: "current",
		start: "2018-01-01",
		end: "2027-12-31",
		donors: ["UNICEF Cambodia", MOEYS],
		targetAreas: ["Kampong Cham"],
		location: {
			schoolName: "IEP resource schools",
			lat: "12.03",
			lng: "105.43",
		},
		name: { en: "Inclusive Education Program", km: "កម្មវិធីអប់រំបរិយាប័ន្ន" },
		summary: {
			en: "Inclusive Education Program (IEP) by KAPE — inclusive classrooms for children with disabilities and marginalised learners.",
			km: "កម្មវិធីអប់រំបរិយាប័ន្ន (IEP) របស់ខេប — ថ្នាក់រៀនបរិយាប័ន្នសម្រាប់កុមារពិការ និងសិស្សដែលរងការរើសអើង។",
		},
		body: {
			en: [
				"The Inclusive Education Program (IEP) ensures children with disabilities and other marginalised learners are welcomed and supported in mainstream classrooms.",
				"IEP works with teachers, school directors, families and provincial education offices to remove physical, attitudinal and pedagogical barriers to learning. It brings together several sub-projects, each with its own target areas and partners.",
			],
			km: [
				"កម្មវិធីអប់រំបរិយាប័ន្ន (IEP) ធានាថាកុមារពិការ និងសិស្សដែលរងការរើសអើងផ្សេងទៀត ត្រូវបានស្វាគមន៍ និងគាំទ្រនៅក្នុងថ្នាក់រៀនធម្មតា។",
				"IEP សហការជាមួយគ្រូបង្រៀន នាយកសាលា គ្រួសារ និងមន្ទីរអប់រំខេត្ត ដើម្បីលុបបំបាត់ឧបសគ្គផ្នែករូបវន្ត ផ្លូវចិត្ត និងគរុកោសល្យចំពោះការសិក្សា។ វារួមបញ្ចូលគ្នានូវអនុគម្រោងជាច្រើន ដែលនីមួយៗមានតំបន់គោលដៅ និងដៃគូរៀងៗខ្លួន។",
			],
		},
	},

	// --- DEP sub-projects ---
	{
		code: "AIR",
		slug: "air",
		parent: "DEP",
		status: "current",
		start: "2024-01-01",
		end: "2026-12-31",
		donors: ["Google.org"],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "Preah Sisowath High School",
			lat: "11.5764",
			lng: "104.9482",
		},
		name: { en: "AIR", km: "AIR" },
		summary: {
			en: "AIR (AI Readiness) prepares Cambodian schools, teachers and students for the responsible integration of artificial intelligence in learning.",
			km: "AIR (ការត្រៀមខ្លួនផ្នែកបញ្ញាសិប្បនិម្មិត) រៀបចំសាលារៀន គ្រូបង្រៀន និងសិស្សកម្ពុជា សម្រាប់ការបញ្ចូលបញ្ញាសិប្បនិម្មិតដោយទំនួលខុសត្រូវទៅក្នុងការសិក្សា។",
		},
	},
	{
		code: "IDEAL",
		slug: "ideal",
		parent: "DEP",
		status: "current",
		start: "2023-05-01",
		end: "2026-12-31",
		donors: ["Meta", "ASEAN Foundation"],
		targetAreas: ["Kandal"],
		location: {
			schoolName: "IDEAL partner schools",
			lat: "11.4569",
			lng: "105.0",
		},
		name: { en: "IDEAL", km: "IDEAL" },
		summary: {
			en: "IDEAL (Integrated Digital Education for Adolescent Learners) blends classroom and online learning for lower-secondary students.",
			km: "IDEAL (ការអប់រំឌីជីថលរួមបញ្ចូលគ្នាសម្រាប់សិស្សវ័យជំទង់) បញ្ចូលការរៀនក្នុងថ្នាក់ និងការរៀនតាមអនឡាញ សម្រាប់សិស្សអនុវិទ្យាល័យ។",
		},
	},
	{
		code: "MIDL",
		slug: "midl",
		parent: "DEP",
		status: "current",
		start: "2022-01-01",
		end: "2026-06-30",
		donors: ["Meta", "ASEAN Foundation"],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "MIDL partner schools",
			lat: "11.5964",
			lng: "104.9082",
		},
		name: { en: "MIDL", km: "MIDL" },
		summary: {
			en: "MIDL (Media and Information Digital Literacy) equips youth with critical thinking, online safety, and digital citizenship skills.",
			km: "MIDL (អក្ខរកម្មប្រព័ន្ធផ្សព្វផ្សាយ ព័ត៌មាន និងឌីជីថល) ផ្តល់ឱ្យយុវជននូវជំនាញគិតបែបរិះគន់ សុវត្ថិភាពអនឡាញ និងភាពជាពលរដ្ឋឌីជីថល។",
		},
	},
	{
		code: "CAMSCAM",
		slug: "camscam",
		parent: "DEP",
		status: "current",
		start: "2022-06-01",
		end: "2026-05-31",
		donors: ["Google.org"],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "Sisowath HS",
			lat: "11.5364",
			lng: "104.9582",
		},
		name: { en: "CamScam", km: "CamScam" },
		summary: {
			en: "CamScam supports STEM, computing and maker-space initiatives in Cambodian secondary schools.",
			km: "CamScam គាំទ្រគំនិតផ្តួចផ្តើមផ្នែក STEM កុំព្យូទ័រ និងលំហច្នៃប្រឌិត នៅតាមសាលាមធ្យមសិក្សានៅកម្ពុជា។",
		},
	},
	{
		code: "DVITSA",
		slug: "dvitsa",
		parent: "DEP",
		status: "current",
		start: "2023-01-01",
		end: "2027-12-31",
		donors: ["UNESCO"],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "DViTSA partner schools",
			lat: "11.6064",
			lng: "104.9682",
		},
		name: { en: "DViTSA", km: "DViTSA" },
		summary: {
			en: "Digital and Virtual Teaching for Sciences & Arts (DViTSA), a sub-project of KAPE's Digital Education Program.",
			km: "ការបង្រៀនឌីជីថល និងនិម្មិតសម្រាប់វិទ្យាសាស្ត្រ និងសិល្បៈ (DViTSA) ជាអនុគម្រោងនៃកម្មវិធីអប់រំឌីជីថលរបស់ខេប។",
		},
	},

	// --- IEP sub-projects ---
	{
		code: "DWD",
		slug: "dwd",
		parent: "IEP",
		status: "current",
		start: "2019-01-01",
		end: "2026-12-31",
		donors: ["Deaf Development Programme", MOEYS],
		targetAreas: ["Phnom Penh"],
		location: {
			schoolName: "DWD partner schools",
			lat: "11.5864",
			lng: "104.9582",
		},
		name: { en: "DWD", km: "DWD" },
		summary: {
			en: "DWD (Disability and Working Development) strengthens disability-inclusive education and supports children with disabilities to access and thrive in mainstream classrooms.",
			km: "DWD (ពិការភាព និងការអភិវឌ្ឍការងារ) ពង្រឹងការអប់រំបរិយាប័ន្នសម្រាប់ជនពិការ និងគាំទ្រកុមារពិការឱ្យទទួលបាន និងរីកចម្រើនក្នុងថ្នាក់រៀនធម្មតា។",
		},
	},
	{
		code: "LOTUS",
		slug: "lotus-outreach",
		parent: "IEP",
		status: "current",
		start: "2017-01-01",
		end: "2027-12-31",
		donors: ["Lotus Outreach International"],
		targetAreas: ["Battambang"],
		location: {
			schoolName: "Lotus Outreach schools",
			lat: "13.0957",
			lng: "103.2022",
		},
		name: { en: "Lotus Outreach", km: "Lotus Outreach" },
		summary: {
			en: "Lotus Outreach partners with KAPE to keep marginalised girls and at-risk children — particularly in rural communities — enrolled and learning.",
			km: "Lotus Outreach សហការជាមួយខេប ដើម្បីរក្សាក្មេងស្រីដែលរងការរើសអើង និងកុមារប្រឈមហានិភ័យ — ជាពិសេសនៅតាមសហគមន៍ជនបទ — ឱ្យបន្តចុះឈ្មោះរៀន និងសិក្សា។",
		},
	},
	{
		code: "CTSP",
		slug: "ctsp",
		parent: "IEP",
		status: "current",
		start: "2021-01-01",
		end: "2026-12-31",
		donors: ["Lotus Outreach"],
		targetAreas: ["Kampong Cham"],
		location: {
			schoolName: "CTSP schools",
			lat: "11.97",
			lng: "105.48",
		},
		name: { en: "CTSP", km: "CTSP" },
		summary: {
			en: "CTSP (Children Targeted Support Program) provides individualised support for children with disabilities, including assistive devices and specialist teachers.",
			km: "CTSP (កម្មវិធីគាំទ្រកុមារគោលដៅ) ផ្តល់ការគាំទ្រជាលក្ខណៈបុគ្គលដល់កុមារពិការ រួមទាំងឧបករណ៍ជំនួយ និងគ្រូបង្រៀនឯកទេស។",
		},
	},

	// --- Past ---
	{
		code: "IBEC",
		slug: "ibec",
		status: "past",
		start: "2011-01-01",
		end: "2016-12-31",
		donors: ["The Asia Foundation"],
		targetAreas: ["Prey Veng"],
		location: {
			schoolName: "IBEC schools",
			lat: "11.4867",
			lng: "105.325",
		},
		name: {
			en: "Inquiry-Based Education in Cambodia",
			km: "ការអប់រំផ្អែកលើការសាកសួរស្រាវជ្រាវនៅកម្ពុជា",
		},
		summary: {
			en: "Inquiry-Based Education in Cambodia past project by KAPE.",
			km: "ការអប់រំផ្អែកលើការសាកសួរស្រាវជ្រាវនៅកម្ពុជា ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "E2L",
		slug: "e2l",
		status: "past",
		start: "2013-01-01",
		end: "2018-12-31",
		donors: ["USAID"],
		targetAreas: ["Kampong Speu"],
		location: {
			schoolName: "E2L schools",
			lat: "11.4527",
			lng: "104.5209",
		},
		name: {
			en: "Education to Employment",
			km: "ការអប់រំឆ្ពោះទៅរកការងារ",
		},
		summary: {
			en: "Education to Employment past project by KAPE.",
			km: "ការអប់រំឆ្ពោះទៅរកការងារ ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "LSLAG",
		slug: "lslag",
		status: "past",
		start: "2014-01-01",
		end: "2019-12-31",
		donors: ["UNICEF Cambodia"],
		targetAreas: ["Pursat"],
		location: {
			schoolName: "LSLAG schools",
			lat: "12.5388",
			lng: "103.9192",
		},
		name: {
			en: "Life Skills Learning for Adolescent Girls",
			km: "ការសិក្សាជំនាញជីវិតសម្រាប់ក្មេងស្រីវ័យជំទង់",
		},
		summary: {
			en: "Life Skills Learning for Adolescent Girls past project by KAPE.",
			km: "ការសិក្សាជំនាញជីវិតសម្រាប់ក្មេងស្រីវ័យជំទង់ ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "SEEK",
		slug: "seek",
		status: "past",
		start: "2010-01-01",
		end: "2016-12-31",
		donors: ["WeWorld"],
		targetAreas: ["Stung Treng"],
		location: {
			schoolName: "SEEK schools",
			lat: "13.5259",
			lng: "105.9683",
		},
		name: {
			en: "Sustainability and Enhancement of Education in Kratie",
			km: "និរន្តរភាព និងការលើកកម្ពស់ការអប់រំនៅខេត្តក្រចេះ",
		},
		summary: {
			en: "Sustainability and Enhancement of Education in Kratie past project by KAPE.",
			km: "និរន្តរភាព និងការលើកកម្ពស់ការអប់រំនៅខេត្តក្រចេះ ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "KYLA",
		slug: "kyla",
		status: "past",
		start: "2015-01-01",
		end: "2019-12-31",
		donors: ["ASEAN Foundation"],
		targetAreas: ["Svay Rieng"],
		location: {
			schoolName: "KYLA youth centers",
			lat: "11.0878",
			lng: "105.7993",
		},
		name: {
			en: "Kape Youth Leadership Academy",
			km: "បណ្ឌិត្យសភាភាពជាអ្នកដឹកនាំយុវជនខេប",
		},
		summary: {
			en: "Kape Youth Leadership Academy past project by KAPE.",
			km: "បណ្ឌិត្យសភាភាពជាអ្នកដឹកនាំយុវជនខេប ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "SfE",
		slug: "sfe",
		status: "past",
		start: "2009-01-01",
		end: "2015-12-31",
		donors: ["Asian Development Bank (ADB)"],
		targetAreas: ["Kratie"],
		location: {
			schoolName: "SFE schools",
			lat: "12.4381",
			lng: "105.9689",
		},
		name: { en: "Schools for Excellence", km: "សាលារៀនសម្រាប់ឧត្តមភាព" },
		summary: {
			en: "Schools for Excellence past project by KAPE.",
			km: "សាលារៀនសម្រាប់ឧត្តមភាព ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "BfC",
		slug: "bfc",
		status: "past",
		start: "2012-01-01",
		end: "2018-12-31",
		donors: ["Room to Read", "Private donors"],
		targetAreas: ["Kampong Cham"],
		location: {
			schoolName: "Community libraries",
			lat: "11.95",
			lng: "105.41",
		},
		name: {
			en: "Better Futures for Children",
			km: "អនាគតកាន់តែប្រសើរសម្រាប់កុមារ",
		},
		summary: {
			en: "Better Futures for Children past project by KAPE.",
			km: "អនាគតកាន់តែប្រសើរសម្រាប់កុមារ ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "ESCUP",
		slug: "escup",
		status: "past",
		start: "2005-01-01",
		end: "2010-12-31",
		donors: ["USAID"],
		targetAreas: ["Ratanakiri"],
		location: {
			schoolName: "ESCUP target schools",
			lat: "13.7369",
			lng: "106.9873",
		},
		name: {
			en: "Education Support for Children in Underserved Provinces",
			km: "ការគាំទ្រការអប់រំដល់កុមារនៅខេត្តដាច់ស្រយាល",
		},
		summary: {
			en: "Education Support for Children in Underserved Provinces past project by KAPE.",
			km: "ការគាំទ្រការអប់រំដល់កុមារនៅខេត្តដាច់ស្រយាល ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
	{
		code: "BSI",
		slug: "bsi",
		status: "past",
		start: "2008-01-01",
		end: "2014-12-31",
		donors: ["World Bank"],
		targetAreas: ["Kampong Chhnang"],
		location: {
			schoolName: "BSI partner schools",
			lat: "12.25",
			lng: "104.6667",
		},
		name: { en: "Basic School Improvement", km: "ការកែលម្អសាលារៀនមូលដ្ឋាន" },
		summary: {
			en: "Basic School Improvement past project by KAPE.",
			km: "ការកែលម្អសាលារៀនមូលដ្ឋាន ជាគម្រោងពីមុនរបស់ខេប។",
		},
	},
];

function bodyOf(p: ProjectSeed) {
	return p.body ?? { en: [TAIL.en], km: [TAIL.km] };
}

function richText(paragraphs: string[]) {
	return JSON.stringify({
		type: "doc",
		content: paragraphs.map((text) => ({
			type: "paragraph",
			content: [{ type: "text", text }],
		})),
	});
}

export async function seedDonors() {
	const names = [...new Set(PROJECT_SEED.flatMap((p) => p.donors))];
	const donorIds: Record<string, number> = {};
	for (const [i, name] of names.entries()) {
		const [row] = await db
			.insert(donors)
			.values({ tenantId: TENANT, name, sort: i })
			.returning({ id: donors.id });
		donorIds[name] = row.id;
	}
	return donorIds;
}

/** Projects (the "programs"). Returns the project ids keyed by code. */
export async function seedProjects(donorIds: Record<string, number>) {
	const projectIds: Record<string, number> = {};
	for (const [i, p] of PROJECT_SEED.entries()) {
		const body = bodyOf(p);
		const [row] = await db
			.insert(projects)
			.values({
				tenantId: TENANT,
				code: p.code,
				slug: p.slug,
				parentId: p.parent ? projectIds[p.parent] : null,
				status: p.status,
				startDate: p.start,
				endDate: p.end,
				targetAreas: p.targetAreas,
				snapshots: [],
				sort: i,
			})
			.returning({ id: projects.id });
		projectIds[p.code] = row.id;
		await addTranslations("project", row.id, {
			name: p.name,
			summary: p.summary,
			body: { en: richText(body.en), km: richText(body.km) },
		});
		for (const d of p.donors) {
			if (donorIds[d])
				await db
					.insert(projectDonors)
					.values({ projectId: row.id, donorId: donorIds[d] });
		}
	}
	return projectIds;
}

/** Project map locations — one site per project, from the client's project data. */
export async function seedProjectLocations(projectIds: Record<string, number>) {
	await db.insert(projectLocations).values(
		PROJECT_SEED.map((p, i) => ({
			tenantId: TENANT,
			projectId: projectIds[p.code],
			schoolName: p.location.schoolName,
			lat: p.location.lat,
			lng: p.location.lng,
			sort: i,
		})),
	);
}

/** Schools KAPE supports (cover images reuse seeded media #1–#5). */
export async function seedSchools(projectIds: Record<string, number>) {
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
}
