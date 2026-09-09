import type { JSONContent } from "@tiptap/core";

import { db } from "../db";
import {
	donors,
	type ProjectSnapshot,
	projectDonors,
	projectLocations,
	projects,
	schools,
} from "../schema";
import { addTranslations, TENANT } from "./helpers";

type Copy = { en: string; km: string };

/** One `<h2>` section of a project body, in the order the page renders it. */
type Block =
	| { heading: string; kind: "paragraphs" | "list"; items: string[] }
	| {
			heading: string;
			kind: "cards";
			items: { title: string; text: string }[];
	  };

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
	// the meta description and the first body paragraph are the same sentence, so it is seeded once
	body?: { en: string[]; km: string[] };
	// khmer keeps whatever body gives it, so the Khmer page holds today's content until KAPE translates
	blocks?: Block[];
	snapshots?: ProjectSnapshot[];
};

const TAIL: Copy = {
	en: "Full project details, target areas, partners, results and downloadable resources are published on this page and updated by the KAPE communications team.",
	km: "ព័ត៌មានលម្អិតពេញលេញអំពីគម្រោង តំបន់គោលដៅ ដៃគូ លទ្ធផល និងឯកសារសម្រាប់ទាញយក ត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះ និងធ្វើបច្ចុប្បន្នភាពដោយក្រុមទំនាក់ទំនងរបស់ខេប។",
};

const MOEYS = "Ministry of Education, Youth and Sport (MoEYS)";

export const PROJECT_SEED: ProjectSeed[] = [
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
		snapshots: [
			{ value: "48", label: "Schools engaged" },
			{ value: "320", label: "Teachers trained" },
			{ value: "9,400", label: "Students reached" },
			{ value: "26", label: "AI clubs" },
		],
		blocks: [
			{
				heading: "Project goal",
				kind: "paragraphs",
				items: [
					"Prepare Cambodian schools, teachers and learners to use artificial intelligence safely, ethically and productively, so that AI strengthens rather than replaces good teaching.",
				],
			},
			{
				heading: "Project update",
				kind: "paragraphs",
				items: [
					"AI literacy modules are being piloted with teachers and students in partner schools, alongside a growing library of Khmer-language resources.",
					"Teacher coaching sessions on responsible use of AI tools run every month in target provinces.",
				],
			},
			{
				heading: "Key activities",
				kind: "list",
				items: [
					"Develop an AI-readiness curriculum and Khmer-language teaching resources for lower and upper secondary schools",
					"Train teachers and school leaders on AI literacy, prompt design and academic-integrity policy",
					"Establish student AI clubs that build small, locally-relevant AI projects",
					"Run community awareness sessions on responsible AI use, privacy and misinformation",
					"Produce an AI readiness assessment used to guide school improvement planning",
				],
			},
			{
				heading: "Target group",
				kind: "list",
				items: [
					"Secondary school students",
					"Teachers and ICT focal points",
					"School directors and provincial education officers",
				],
			},
			{
				heading: "Impact",
				kind: "list",
				items: [
					"Students able to use AI tools critically, safely and productively",
					"Teachers integrating AI-supported activities into lesson plans",
					"A growing base of Khmer-language AI learning materials",
				],
			},
			{
				heading: "Case studies",
				kind: "cards",
				items: [
					{
						title: "An AI club that answers local questions",
						text: "Grade 11 students trained a simple classifier to sort community questions to the right commune office, presenting their model at the district science fair.",
					},
					{
						title: "Teachers redesign assessment",
						text: "After AI-literacy training, a school team replaced take-home essays with in-class oral defences, keeping assessment fair in the age of generative tools.",
					},
				],
			},
		],
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
		snapshots: [
			{ value: "36", label: "Schools" },
			{ value: "210", label: "Study clubs" },
			{ value: "640", label: "Teachers trained" },
			{ value: "18,700", label: "Students" },
		],
		blocks: [
			{
				heading: "Project goal",
				kind: "paragraphs",
				items: [
					"Improve digital education for all learners by embedding digital tools, media literacy and project-based learning in everyday classroom practice.",
				],
			},
			{
				heading: "Project update",
				kind: "paragraphs",
				items: [
					"Digital learning labs are active in partner schools, with student exhibitions held annually to showcase learning outcomes.",
					"Recent exhibitions at Chaktomuk Secondary School and Hun Neang Bak Kheng Primary School demonstrated student projects to parents and officials.",
				],
			},
			{
				heading: "Key activities",
				kind: "list",
				items: [
					"Establish and mentor school study clubs across core subjects",
					"Equip schools with digital corners, tablets and shared learning resources",
					"Coach teachers on project-based learning and digital lesson design",
					"Organise annual student achievement exhibitions to showcase learning",
					"Support school management committees to plan and sustain digital education",
				],
			},
			{
				heading: "Target group",
				kind: "list",
				items: [
					"Primary and secondary students in target schools",
					"Teachers delivering ICT and digital learning",
					"School management and parent communities",
				],
			},
			{
				heading: "Impact",
				kind: "list",
				items: [
					"Thousands of students gaining hands-on digital skills each year",
					"Teachers confidently running digital and blended lessons",
					"Schools with sustainable ICT labs and maintenance plans",
				],
			},
			{
				heading: "Case studies",
				kind: "cards",
				items: [
					{
						title: "Bak Kheng Primary School",
						text: "Students designed and presented their own booths on coding, science and Khmer arts at the annual exhibition, explaining their own thinking rather than reciting lessons.",
					},
					{
						title: "Chaktomuk Secondary School",
						text: "Seventeen study clubs, from Earth Science to Mathematics, turned a year of research into a school-wide exhibition attended by around 350 people.",
					},
				],
			},
		],
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
		snapshots: [
			{ value: "42", label: "Schools" },
			{ value: "12,000", label: "Youth trained" },
			{ value: "260", label: "Peer educators" },
			{ value: "18", label: "Campaigns" },
		],
		blocks: [
			{
				heading: "Project goal",
				kind: "paragraphs",
				items: [
					"Build media and information digital literacy so young Cambodians can evaluate online information, protect themselves online and participate as responsible digital citizens.",
				],
			},
			{
				heading: "Project update",
				kind: "paragraphs",
				items: [
					"Media and information literacy curricula are being rolled out in partner schools and youth clubs.",
					"Youth-led campaigns against misinformation are running on social media with KAPE mentoring.",
				],
			},
			{
				heading: "Key activities",
				kind: "list",
				items: [
					"Deliver MIDL curriculum sessions in secondary schools and youth centres",
					"Train teacher-facilitators and youth peer educators",
					"Run campus and online campaigns against misinformation and online harm",
					"Produce Khmer-language media-literacy videos and printed toolkits",
					"Support youth-led community research on local information needs",
				],
			},
			{
				heading: "Target group",
				kind: "list",
				items: [
					"Secondary students and youth club members",
					"Teachers and youth facilitators",
					"Parents and wider community audiences",
				],
			},
			{
				heading: "Impact",
				kind: "list",
				items: [
					"Young people better able to identify misinformation online",
					"Active youth clubs producing their own digital content",
					"Teachers equipped with ready-to-use MIL lesson plans",
				],
			},
			{
				heading: "Case studies",
				kind: "cards",
				items: [
					{
						title: "Fact-checking the feed",
						text: "A youth team traced a viral health rumour to its source and produced a Khmer explainer video that reached tens of thousands of local viewers.",
					},
					{
						title: "Safer classrooms online",
						text: "Peer educators supported classmates facing online harassment and helped their school adopt a clear reporting procedure.",
					},
				],
			},
		],
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
		snapshots: [
			{ value: "3,100", label: "Learners" },
			{ value: "140", label: "Instructors" },
			{ value: "38", label: "Partner employers" },
			{ value: "12", label: "Centres" },
		],
		blocks: [
			{
				heading: "Project goal",
				kind: "paragraphs",
				items: [
					"Strengthen digital and vocational skills for in-school and out-of-school adolescents, opening pathways to further study and decent work.",
				],
			},
			{
				heading: "Project update",
				kind: "paragraphs",
				items: [
					"Digital vocational and technical skills training cohorts are running with partner institutions.",
					"Employer linkages and internship placements are being expanded for graduating trainees.",
				],
			},
			{
				heading: "Key activities",
				kind: "list",
				items: [
					"Deliver digital and vocational skills modules in partner schools and centres",
					"Link learners with local employers for internships and job shadowing",
					"Train instructors on competency-based, hands-on teaching",
					"Provide career guidance and portfolio-building support",
					"Support small start-up grants for youth enterprise ideas",
				],
			},
			{
				heading: "Target group",
				kind: "list",
				items: [
					"Out-of-school youth and TVET students",
					"Young women seeking digital career pathways",
					"Training institutions and employers",
				],
			},
			{
				heading: "Impact",
				kind: "list",
				items: [
					"Trainees placed in digital and technology-related jobs",
					"Stronger institutional capacity to deliver digital skills courses",
					"Increased participation of young women in technology careers",
				],
			},
			{
				heading: "Case studies",
				kind: "cards",
				items: [
					{
						title: "From club to contract",
						text: "Two graduates of the digital design module now work part-time for a local printing business while continuing their studies.",
					},
					{
						title: "Second chance learners",
						text: "Out-of-school youth completed a basic ICT and life-skills course and re-entered formal education through the equivalency programme.",
					},
				],
			},
		],
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
		snapshots: [
			{ value: "1,450", label: "Children supported" },
			{ value: "310", label: "Teachers trained" },
			{ value: "64", label: "Schools" },
			{ value: "820", label: "Assistive devices" },
		],
		blocks: [
			{
				heading: "Project goal",
				kind: "paragraphs",
				items: [
					"Ensure children who are deaf or hard of hearing, and children with other disabilities, can access, participate in and complete quality education alongside their peers.",
				],
			},
			{
				heading: "Project update",
				kind: "paragraphs",
				items: [
					"Sign-language coaching cycles are running in all partner schools this school year, with monthly follow-up visits from KAPE inclusive-education officers.",
					"Screening camps completed in the latest quarter referred a new cohort of children for hearing and vision services, with assistive devices distributed at school level.",
				],
			},
			{
				heading: "Key activities",
				kind: "list",
				items: [
					"Train teachers in Cambodian Sign Language and inclusive classroom practice",
					"Provide assistive devices, learning aids and accessible materials",
					"Support screening, referral and follow-up with health services",
					"Work with families and communities to reduce stigma and increase enrolment",
					"Adapt school infrastructure for physical accessibility",
				],
			},
			{
				heading: "Target group",
				kind: "list",
				items: [
					"Children who are deaf or hard of hearing in mainstream primary and secondary schools",
					"Children with physical, visual and intellectual disabilities",
					"Teachers, school directors and school support committees",
					"Parents and caregivers of children with disabilities",
				],
			},
			{
				heading: "Impact",
				kind: "list",
				items: [
					"More children with disabilities enrolled and retained in mainstream classrooms",
					"Teachers confident using sign language and adapted materials in daily lessons",
					"Reduced stigma reported by families and community members",
					"Accessible school facilities that keep children in school year after year",
				],
			},
			{
				heading: "Case studies",
				kind: "cards",
				items: [
					{
						title: "A signing classroom",
						text: "A rural primary school introduced daily sign-language practice for all pupils, so deaf classmates are included in play as well as lessons.",
					},
					{
						title: "Back to school",
						text: "A boy with a mobility impairment returned to Grade 4 after a ramp and accessible latrine were built with community contributions.",
					},
				],
			},
		],
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
		snapshots: [
			{ value: "980", label: "Girls supported" },
			{ value: "420", label: "Bicycles provided" },
			{ value: "260", label: "Counselling cases" },
			{ value: "27", label: "Schools" },
		],
		blocks: [
			{
				heading: "Project goal",
				kind: "paragraphs",
				items: [
					"Reduce dropout and trafficking risk for the most vulnerable girls by combining scholarships, safe transport, counselling and community engagement.",
				],
			},
			{
				heading: "Project update",
				kind: "paragraphs",
				items: [
					"Scholarship disbursements and mentoring visits are on schedule for the current academic year.",
					"Life-skills and safeguarding sessions have been delivered to all scholarship recipients and their families.",
				],
			},
			{
				heading: "Key activities",
				kind: "list",
				items: [
					"Provide scholarships, bicycles and school materials to at-risk girls",
					"Deliver counselling and protection case management",
					"Run community awareness on child protection and safe migration",
					"Support school-based girls' clubs and peer networks",
					"Coordinate referrals with local authorities and social services",
				],
			},
			{
				heading: "Target group",
				kind: "list",
				items: [
					"Girls at high risk of dropping out, trafficking or early marriage",
					"Poor rural families with school-aged daughters",
					"Lower- and upper-secondary students needing financial support",
				],
			},
			{
				heading: "Impact",
				kind: "list",
				items: [
					"Scholarship girls progressing to upper secondary and higher education",
					"Families better informed on safe migration and child protection",
					"Reduced dropout among the most vulnerable girls in target schools",
				],
			},
			{
				heading: "Case studies",
				kind: "cards",
				items: [
					{
						title: "A bicycle changes attendance",
						text: "Girls living more than five kilometres from school raised their attendance sharply after receiving bicycles and a safe-route plan.",
					},
					{
						title: "Girls' club leadership",
						text: "A school girls' club led a campaign on reporting harassment, supported by trained teacher counsellors.",
					},
				],
			},
		],
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

function richText(paragraphs: string[]) {
	return JSON.stringify({ type: "doc", content: paragraphs.map(para) });
}

const para = (text: string): JSONContent => ({
	type: "paragraph",
	content: [{ type: "text", text }],
});

const head = (level: number, text: string): JSONContent => ({
	type: "heading",
	attrs: { level },
	content: [{ type: "text", text }],
});

function blockNodes(b: Block): JSONContent[] {
	if (b.kind === "cards")
		return b.items.flatMap((c) => [head(3, c.title), para(c.text)]);
	if (b.kind === "list")
		return [
			{
				type: "bulletList",
				content: b.items.map((t) => ({
					type: "listItem",
					content: [para(t)],
				})),
			},
		];
	return b.items.map(para);
}

function richBlocks(blocks: Block[]) {
	const content = blocks.flatMap((b) => [head(2, b.heading), ...blockNodes(b)]);
	return JSON.stringify({ type: "doc", content });
}

export function bodyOf(p: ProjectSeed): Copy {
	return {
		en: p.blocks ? richBlocks(p.blocks) : richText(p.body?.en ?? [TAIL.en]),
		km: richText(p.body?.km ?? [TAIL.km]),
	};
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
				snapshots: p.snapshots ?? [],
				sort: i,
			})
			.returning({ id: projects.id });
		projectIds[p.code] = row.id;
		await addTranslations("project", row.id, {
			name: p.name,
			summary: p.summary,
			body: bodyOf(p),
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
	// the school register ships English only; a Khmer name or address is the editor's to write
	const seed: {
		name: string;
		address: string;
		cols: Omit<typeof schools.$inferInsert, "tenantId">;
	}[] = [
		{
			name: "Hun Sen Rolea B'ier High School",
			address: "Rolea B'ier, Kampong Chhnang",
			cols: {
				code: "NGS-001",
				level: "high",
				province: "Kampong Cham",
				projectId: projectIds.NGS,
				coverMediaId: 1,
				lat: "12.245",
				lng: "104.668",
				sort: 0,
			},
		},
		{
			name: "Preah Sisowath High School",
			address: "Phnom Penh",
			cols: {
				code: "NGS-002",
				level: "high",
				province: "Phnom Penh",
				projectId: projectIds.NGS,
				coverMediaId: 2,
				lat: "11.563",
				lng: "104.928",
				sort: 1,
			},
		},
		{
			name: "Rompok Primary School",
			address: "Rompok, Kratie",
			cols: {
				code: "HCC-014",
				level: "primary",
				province: "Kratie",
				projectId: projectIds.HCC,
				coverMediaId: 3,
				lat: "12.488",
				lng: "106.019",
				sort: 2,
			},
		},
		{
			name: "Hun Sen Kampong Cham Preschool",
			address: "Kampong Cham Town",
			cols: {
				code: "HCC-021",
				level: "preschool",
				province: "Kampong Cham",
				projectId: projectIds.HCC,
				coverMediaId: 4,
				lat: "11.992",
				lng: "105.463",
				sort: 3,
			},
		},
		{
			name: "Battambang Regional Teacher Training Center",
			address: "Battambang",
			cols: {
				code: "EYE-003",
				level: "higher",
				province: "Battambang",
				projectId: projectIds.EYE ?? null,
				coverMediaId: 5,
				lat: "13.095",
				lng: "103.203",
				sort: 4,
			},
		},
	];
	for (const school of seed) {
		const [row] = await db
			.insert(schools)
			.values({ tenantId: TENANT, ...school.cols })
			.returning({ id: schools.id });
		await addTranslations("school", row.id, {
			name: { en: school.name },
			address: { en: school.address },
		});
	}
}
