import { PLACEHOLDER_IMAGE } from "#/lib/placeholder";
import type { SectionNode } from "#/lib/sections";
import { db } from "../db";
import { pages } from "../schema";
import { addTranslations, doc, TENANT } from "./helpers";

type Inline = { type: "text"; text: string; marks?: { type: string }[] };

const text = (value: string): Inline => ({ type: "text", text: value });
const bold = (value: string): Inline => ({
	type: "text",
	text: value,
	marks: [{ type: "bold" }],
});
const italic = (value: string): Inline => ({
	type: "text",
	text: value,
	marks: [{ type: "italic" }],
});
const para = (...inline: Inline[]) => ({ type: "paragraph", content: inline });
const bullets = (...items: Inline[][]) => ({
	type: "bulletList",
	content: items.map((inline) => ({
		type: "listItem",
		content: [para(...inline)],
	})),
});
const table = (pairs: [string, string][]) => ({
	type: "table",
	content: pairs.map(([term, value]) => ({
		type: "tableRow",
		content: [
			{ type: "tableHeader", content: [para(text(term))] },
			{ type: "tableCell", content: [para(text(value))] },
		],
	})),
});
const richDoc = (...blocks: unknown[]) =>
	JSON.stringify({ type: "doc", content: blocks });

const HERO_CONFERENCE = PLACEHOLDER_IMAGE;
const HERO_STUDENTS = PLACEHOLDER_IMAGE;

const ACCREDITATIONS_LEAD =
	"Explore KAPE's official credentials, operational licenses, and letters of appreciation. These honors celebrate our track record of trust, accountability, and meaningful educational achievements recognized by donors, local authorities, and key stakeholders.";
const ACCREDITATIONS_LEAD_KM =
	"ស្វែងយល់អំពីលិខិតបញ្ជាក់ផ្លូវការ អាជ្ញាបណ្ណប្រតិបត្តិការ និងលិខិតកោតសរសើររបស់ KAPE។ កិត្តិយសទាំងនេះអបអរសាទរកំណត់ត្រានៃការទុកចិត្ត គណនេយ្យភាព និងសមិទ្ធផលអប់រំដ៏មានអត្ថន័យ ដែលត្រូវបានទទួលស្គាល់ដោយម្ចាស់ជំនួយ អាជ្ញាធរមូលដ្ឋាន និងភាគីពាក់ព័ន្ធសំខាន់ៗ។";

const aboutSections: SectionNode[] = [
	{
		id: "hero",
		type: "hero",
		layout: "banner",
		props: {
			eyebrow: "Established 1999",
			title: "About KAPE",
			lead: "Kampuchea Action to Promote Education is Cambodia's largest and longest-serving local NGO dedicated to the education sector — partnering with MoEYS, international donors and communities since 1999.",
			image: HERO_CONFERENCE,
			i18n: {
				km: {
					eyebrow: "បង្កើតឡើងឆ្នាំ១៩៩៩",
					title: "អំពី KAPE",
					lead: "អង្គការសកម្មភាពកម្ពុជាដើម្បីលើកកម្ពស់ការអប់រំ គឺជាអង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេ និងបម្រើការយូរជាងគេរបស់កម្ពុជា ដែលឧទ្ទិសដល់វិស័យអប់រំ — សហការជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ម្ចាស់ជំនួយអន្តរជាតិ និងសហគមន៍ តាំងពីឆ្នាំ១៩៩៩។",
				},
			},
		},
	},
	{
		id: "story",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Our story",
			body: richDoc(
				para(
					text("KAPE's roots trace back to "),
					bold("1996"),
					text(
						", when the work began as a project called CAPE (Cambodian Assistance to Primary Education). By ",
					),
					bold("1999"),
					text(
						" the team localized into an independent Cambodian NGO — KAPE — committed to a sustainable, community-led approach to rebuilding the country's classrooms.",
					),
				),
				para(
					text("Three decades on, KAPE works across "),
					bold("15 provinces"),
					text(", reaching over "),
					bold("160,000 children"),
					text(" in "),
					bold("385+ schools"),
					text(
						" from preschool through tertiary and a Master's Degree in Educational Mentoring.",
					),
				),
			),
			i18n: {
				km: {
					title: "រឿងរ៉ាវរបស់យើង",
					body: richDoc(
						para(
							text("ឫសគល់របស់ KAPE ចាប់ផ្តើមតាំងពីឆ្នាំ"),
							bold("១៩៩៦"),
							text(
								" ពេលការងារនេះបានចាប់ផ្តើមជាគម្រោងមួយឈ្មោះ CAPE (ជំនួយកម្ពុជាដល់ការអប់រំបឋមសិក្សា)។ នៅឆ្នាំ",
							),
							bold("១៩៩៩"),
							text(
								" ក្រុមការងារបានក្លាយជាអង្គការក្រៅរដ្ឋាភិបាលកម្ពុជាឯករាជ្យ — KAPE — ដែលប្តេជ្ញាចិត្តចំពោះវិធីសាស្ត្រប្រកបដោយចីរភាព និងដឹកនាំដោយសហគមន៍ ក្នុងការកសាងឡើងវិញនូវថ្នាក់រៀនរបស់ប្រទេស។",
							),
						),
						para(
							text("បីទសវត្សរ៍ក្រោយមក KAPE ធ្វើការនៅ"),
							bold("១៥ខេត្ត"),
							text(" ឈានដល់កុមារជាង"),
							bold("១៦០,០០០នាក់"),
							text(" នៅ"),
							bold("សាលារៀនជាង៣៨៥"),
							text(
								" ចាប់ពីមត្តេយ្យសិក្សា រហូតដល់ឧត្តមសិក្សា និងបរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកការណែនាំអប់រំ។",
							),
						),
					),
				},
			},
		},
	},
	{
		id: "focus",
		type: "cards",
		layout: "cols-2",
		props: {
			title: "What we focus on",
			items: [
				{
					title: "Access & equity",
					body: "Reaching vulnerable, rural and marginalized children with safe, quality learning.",
				},
				{
					title: "Teacher empowerment",
					body: "Professional development, digital literacy and modern pedagogy for Cambodian educators.",
				},
				{
					title: "Digital & technical innovation",
					body: "STEM, ICT and AI integration to prepare youth for the 21st century.",
				},
				{
					title: "Systemic reform",
					body: "Designing programs that align with — and shape — MoEYS national policy.",
				},
			],
			i18n: { km: { title: "អ្វីដែលយើងផ្តោតលើ" } },
		},
	},
	{
		id: "where",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Where we work",
			body: doc(
				"KAPE implements projects across 15 provinces of Cambodia. The map below pins the locations where KAPE teams and partner schools operate — from the head office in Kampong Cham to field sites in Banteay Meanchey, Battambang, Siem Reap, Ratanakiri, Kratie, Stung Treng, Tboung Khmum, Prey Veng, Svay Rieng, Kampong Speu, Kampong Chhnang, Pursat, Kandal and Phnom Penh.",
			),
			i18n: {
				km: {
					title: "កន្លែងដែលយើងធ្វើការ",
					body: doc(
						"KAPE អនុវត្តគម្រោងនៅ១៥ខេត្តនៃប្រទេសកម្ពុជា។ ផែនទីខាងក្រោមបង្ហាញទីតាំងដែលក្រុមការងារ KAPE និងសាលារៀនដៃគូប្រតិបត្តិការ — ចាប់ពីការិយាល័យកណ្តាលនៅកំពង់ចាម រហូតដល់ទីតាំងការងារនៅបន្ទាយមានជ័យ បាត់ដំបង សៀមរាប រតនគិរី ក្រចេះ ស្ទឹងត្រែង ត្បូងឃ្មុំ ព្រៃវែង ស្វាយរៀង កំពង់ស្ពឺ កំពង់ឆ្នាំង ពោធិ៍សាត់ កណ្តាល និងភ្នំពេញ។",
					),
				},
			},
		},
	},
	{
		id: "map",
		type: "map",
		layout: "default",
		query: { source: "locations" },
		props: {},
	},
	{
		id: "map-note",
		type: "richtext",
		layout: "narrow",
		props: {
			body: richDoc(
				para(
					text("Each red "),
					bold("KAPE"),
					text(
						" pin marks a project location. Click a pin to see the project name, school and a photo, then follow through to the project page. Green tags are current projects; grey are past projects.",
					),
				),
			),
			i18n: {
				km: {
					body: richDoc(
						para(
							text("ម្ជុលពណ៌ក្រហម "),
							bold("KAPE"),
							text(
								" និមួយៗសម្គាល់ទីតាំងគម្រោង។ ចុចលើម្ជុលដើម្បីមើលឈ្មោះគម្រោង សាលារៀន និងរូបថត បន្ទាប់មកបន្តទៅកាន់ទំព័រគម្រោង។ ស្លាកពណ៌បៃតងគឺគម្រោងបច្ចុប្បន្ន ពណ៌ប្រផេះគឺគម្រោងកន្លងមក។",
							),
						),
					),
				},
			},
		},
	},
];

const visionMissionSections: SectionNode[] = [
	{
		id: "hero",
		type: "hero",
		layout: "banner",
		props: {
			eyebrow: "What guides us",
			title: "Vision, Mission & Core Values",
			image: HERO_STUDENTS,
			i18n: {
				km: {
					eyebrow: "អ្វីដែលដឹកនាំយើង",
					title: "ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល",
				},
			},
		},
	},
	{
		id: "vision",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Vision",
			body: richDoc(
				para(
					text("Our vision is for children and youth to be able to make the "),
					italic("best life choices possible"),
					text(" — choices that flow from a good education."),
				),
			),
			i18n: {
				km: {
					title: "ចក្ខុវិស័យ",
					body: richDoc(
						para(
							text("ចក្ខុវិស័យរបស់យើងគឺឱ្យកុមារ និងយុវជនអាចធ្វើ"),
							italic("ការសម្រេចចិត្តល្អបំផុតក្នុងជីវិត"),
							text(" — ជម្រើសដែលកើតចេញពីការអប់រំល្អ។"),
						),
					),
				},
			},
		},
	},
	{
		id: "mission",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Mission",
			body: richDoc(
				para(
					text("To work with government, community and other stakeholders to "),
					bold("empower vulnerable children and youth"),
					text(
						" to achieve their own right to a quality education through innovative approaches.",
					),
				),
			),
			i18n: {
				km: {
					title: "បេសកកម្ម",
					body: richDoc(
						para(
							text("ធ្វើការជាមួយរដ្ឋាភិបាល សហគមន៍ និងភាគីពាក់ព័ន្ធដទៃទៀត ដើម្បី"),
							bold("ផ្តល់អំណាចដល់កុមារ និងយុវជនងាយរងគ្រោះ"),
							text(
								" ឱ្យទទួលបានសិទ្ធិរបស់ខ្លួនក្នុងការទទួលការអប់រំប្រកបដោយគុណភាព តាមរយៈវិធីសាស្ត្រច្នៃប្រឌិត។",
							),
						),
					),
				},
			},
		},
	},
	{
		id: "values",
		type: "cards",
		layout: "cols-4",
		props: {
			title: "Core values",
			items: [
				{ title: "Empowerment" },
				{ title: "Solidarity" },
				{ title: "Compassion" },
				{ title: "Respect" },
				{ title: "Cooperation" },
				{ title: "Innovation" },
				{ title: "Transparency" },
				{ title: "Truth" },
			],
			i18n: { km: { title: "តម្លៃស្នូល" } },
		},
	},
];

const factSheetSections: SectionNode[] = [
	{
		id: "hero",
		type: "hero",
		layout: "banner",
		props: {
			eyebrow: "Snapshot",
			title: "Fact Sheet",
			lead: "Cambodia's largest and longest-serving local NGO specializing in the education sector — established 1999.",
			image: HERO_STUDENTS,
			i18n: {
				km: {
					eyebrow: "ទិដ្ឋភាពសង្ខេប",
					title: "ឯកសារពិត",
					lead: "អង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេ និងបម្រើការយូរជាងគេរបស់កម្ពុជា ឯកទេសខាងវិស័យអប់រំ — បង្កើតឡើងក្នុងឆ្នាំ១៩៩៩។",
				},
			},
		},
	},
	{
		id: "profile",
		type: "richtext",
		layout: "default",
		props: {
			title: "Organizational overview",
			body: richDoc(
				table([
					["Founded", "1999"],
					["Headquarter", "Kampong Cham Town, Cambodia"],
					["Primary Focus", "Access, quality, and equity in education"],
					[
						"Core Approach",
						"Systemic partnerships with MoEYS, innovation & evidence-based interventions",
					],
					["Reach", "15 provinces · 385+ schools · 160,000+ children"],
				]),
			),
			i18n: {
				km: {
					title: "ទិដ្ឋភាពទូទៅរបស់អង្គការ",
					body: richDoc(
						table([
							["បង្កើតឡើង", "១៩៩៩"],
							["ទីស្នាក់ការកណ្តាល", "ក្រុងកំពង់ចាម ប្រទេសកម្ពុជា"],
							["ការផ្តោតសំខាន់", "លទ្ធភាព គុណភាព និងសមធម៌ក្នុងការអប់រំ"],
							[
								"វិធីសាស្ត្រស្នូល",
								"ភាពជាដៃគូជាប្រព័ន្ធជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ការច្នៃប្រឌិត និងអន្តរាគមន៍ផ្អែកលើភស្តុតាង",
							],
							["វិសាលភាព", "១៥ខេត្ត · សាលារៀនជាង៣៨៥ · កុមារជាង១៦០,០០០នាក់"],
						]),
					),
				},
			},
		},
	},
	{
		id: "expertise",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Areas of expertise & specialization",
			body: doc(
				'KAPE acts as a "laboratory of innovation" for the Cambodian education system, developing models that can be scaled nationwide.',
			),
			i18n: {
				km: {
					title: "វិស័យជំនាញ និងឯកទេស",
					body: doc(
						'KAPE ដើរតួជា "មន្ទីរពិសោធន៍នៃការច្នៃប្រឌិត" សម្រាប់ប្រព័ន្ធអប់រំកម្ពុជា ដោយអភិវឌ្ឍគំរូដែលអាចពង្រីកទៅទូទាំងប្រទេស។',
					),
				},
			},
		},
	},
	{
		id: "expertise-cards",
		type: "cards",
		layout: "cols-2",
		props: {
			items: [
				{
					title: "New Generation Schools (NGS)",
					body: "Leading Cambodia's premier public charter-school model to modernize secondary education.",
				},
				{
					title: "Digital education & EdTech",
					body: "Pioneer in introducing ICT tools, software and AI integration to classrooms.",
				},
				{
					title: "Early grade reading",
					body: "Specialized curricula, teacher training and teaching-learning materials for primary literacy.",
				},
				{
					title: "STEM advancement",
					body: "Vocational scholarships, science lab infrastructure and pathways into STEM.",
				},
				{
					title: "Inclusive education",
					body: "Equitable access to life skills and safe learning spaces for marginalized youth.",
				},
				{
					title: "Community engagement",
					body: "Mobilizing parents, councils and partners around every school.",
				},
			],
		},
	},
	{
		id: "strengths",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Key strengths",
			body: richDoc(
				bullets(
					[
						bold("Trusted reform partner"),
						text(
							" — recognized for local expertise bridging policy and school practice.",
						),
					],
					[
						bold("Sustained government collaboration"),
						text(
							" — programs explicitly aligned with national education policy.",
						),
					],
					[
						bold("Accountability"),
						text(
							" — strong governance and transparency for international donors.",
						),
					],
					[
						bold("Local leadership empowerment"),
						text(
							" — investing in school directors and teachers for long-term sustainability.",
						),
					],
				),
			),
			i18n: {
				km: {
					title: "ចំណុចខ្លាំងសំខាន់ៗ",
					body: richDoc(
						bullets(
							[
								bold("ដៃគូកំណែទម្រង់ដែលគួរឱ្យទុកចិត្ត"),
								text(
									" — ត្រូវបានទទួលស្គាល់សម្រាប់ជំនាញក្នុងស្រុកដែលភ្ជាប់គោលនយោបាយទៅនឹងការអនុវត្តនៅសាលារៀន។",
								),
							],
							[
								bold("កិច្ចសហការជាមួយរដ្ឋាភិបាលប្រកបដោយចីរភាព"),
								text(" — កម្មវិធីត្រូវបានតម្រឹមយ៉ាងច្បាស់ជាមួយគោលនយោបាយអប់រំជាតិ។"),
							],
							[
								bold("គណនេយ្យភាព"),
								text(" — អភិបាលកិច្ចរឹងមាំ និងតម្លាភាពសម្រាប់ម្ចាស់ជំនួយអន្តរជាតិ។"),
							],
							[
								bold("ការផ្តល់អំណាចដល់ភាពជាអ្នកដឹកនាំក្នុងស្រុក"),
								text(" — វិនិយោគលើនាយកសាលា និងគ្រូបង្រៀន ដើម្បីចីរភាពរយៈពេលវែង។"),
							],
						),
					),
				},
			},
		},
	},
];

const directorSpeechSections: SectionNode[] = [
	{
		id: "hero",
		type: "hero",
		layout: "banner",
		props: {
			eyebrow: "A note from the ED",
			title: "Executive Director's Speech",
			lead: "Welcome message from the Executive Director",
			image: HERO_CONFERENCE,
			i18n: {
				km: {
					eyebrow: "សារពីនាយកប្រតិបត្តិ",
					title: "សុន្ទរកថានាយកប្រតិបត្តិ",
					lead: "សារស្វាគមន៍ពីនាយកប្រតិបត្តិ",
				},
			},
		},
	},
	{
		id: "beginning",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Where it all began",
			body: richDoc(
				para(
					text(
						"To truly understand KAPE's mission today, we must look back to where it all began. Our roots trace back to ",
					),
					bold("1996"),
					text(
						", when we first started as a project known as CAPE (Cambodian Assistance to Primary Education). Those early years were defined by a critical need to rebuild educational foundations. By ",
					),
					bold("1999"),
					text(
						", recognizing the need for a localized, sustainable approach to educational development, we officially localized to become",
					),
					bold(" KAPE"),
					text(", an independent Cambodian non-governmental organization."),
				),
				para(
					text(
						"From those foundational years between 1996 and 1999 up to the present day, Cambodia's educational landscape has transformed tremendously — and KAPE has been there every step of the way. What began as a localized effort in a few primary schools has evolved into the largest local NGO in Cambodia's education sector.",
					),
				),
			),
			i18n: {
				km: {
					title: "កន្លែងដែលអ្វីៗបានចាប់ផ្តើម",
					body: richDoc(
						para(
							text(
								"ដើម្បីយល់ច្បាស់អំពីបេសកកម្មរបស់ KAPE សព្វថ្ងៃ យើងត្រូវក្រឡេកមើលទៅកន្លែងដែលអ្វីៗបានចាប់ផ្តើម។ ឫសគល់របស់យើងចាប់ផ្តើមតាំងពីឆ្នាំ",
							),
							bold("១៩៩៦"),
							text(
								" ពេលយើងបានចាប់ផ្តើមដំបូងជាគម្រោងមួយស្គាល់ថា CAPE (ជំនួយកម្ពុជាដល់ការអប់រំបឋមសិក្សា)។ ឆ្នាំដំបូងទាំងនោះត្រូវបានកំណត់ដោយតម្រូវការចាំបាច់ក្នុងការកសាងឡើងវិញនូវមូលដ្ឋានគ្រឹះនៃការអប់រំ។ នៅឆ្នាំ",
							),
							bold("១៩៩៩"),
							text(
								" ដោយទទួលស្គាល់តម្រូវការវិធីសាស្ត្រក្នុងស្រុកប្រកបដោយចីរភាពសម្រាប់ការអភិវឌ្ឍការអប់រំ យើងបានប្រែក្លាយជាអង្គការក្នុងស្រុកជាផ្លូវការក្លាយជា",
							),
							bold(" KAPE"),
							text(" ដែលជាអង្គការក្រៅរដ្ឋាភិបាលកម្ពុជាឯករាជ្យ។"),
						),
						para(
							text(
								"ចាប់ពីឆ្នាំមូលដ្ឋានទាំងនោះរវាងឆ្នាំ១៩៩៦ និង១៩៩៩ រហូតដល់សព្វថ្ងៃនេះ ទេសភាពអប់រំរបស់កម្ពុជាបានផ្លាស់ប្តូរយ៉ាងខ្លាំង — ហើយ KAPE បានឋិតនៅជាមួយគ្រប់ជំហាន។ អ្វីដែលបានចាប់ផ្តើមជាកិច្ចខិតខំក្នុងស្រុកនៅសាលាបឋមសិក្សាមួយចំនួន បានវិវត្តទៅជាអង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេក្នុងវិស័យអប់រំរបស់កម្ពុជា។",
							),
						),
					),
				},
			},
		},
	},
	{
		id: "moeys",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "Partnering with MoEYS for national progress",
			body: richDoc(
				para(
					text(
						"KAPE's success has never been achieved in isolation. Our core strategy has always been to work hand-in-hand with the ",
					),
					bold("Ministry of Education, Youth and Sport (MoEYS)"),
					text(
						". Over the decades, KAPE has designed, piloted and implemented a vast array of innovative educational projects specifically structured to help MoEYS develop and modernize the national education system.",
					),
				),
				para(
					text(
						"From pioneering Child-Friendly School models to creating cutting-edge New Generation Schools (NGS), our projects have consistently served as incubators for educational innovation. We have worked tirelessly to:",
					),
				),
				bullets(
					[
						bold("Enhance access & equity"),
						text(
							" — ensuring that children from vulnerable, rural and marginalized backgrounds have the right to a quality education.",
						),
					],
					[
						bold("Empower teachers"),
						text(
							" — providing rigorous professional development, digital literacy coaching and modern pedagogical tools.",
						),
					],
					[
						bold("Drive digital & technical innovation"),
						text(
							" — integrating STEM, ICT and modern technologies into classrooms to prepare Cambodian youth for the 21st century.",
						),
					],
				),
				para(
					text(
						"By aligning our projects directly with MoEYS's strategic plans, we ensure that our interventions are not just temporary fixes, but sustainable methodologies that can be integrated into national policy.",
					),
				),
			),
			i18n: {
				km: {
					title: "ភាពជាដៃគូជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ដើម្បីវឌ្ឍនភាពជាតិ",
					body: richDoc(
						para(
							text(
								"ជោគជ័យរបស់ KAPE មិនដែលសម្រេចបានដោយឯកឯងឡើយ។ យុទ្ធសាស្ត្រស្នូលរបស់យើងគឺតែងតែធ្វើការដៃគូជាមួយ",
							),
							bold("ក្រសួងអប់រំ យុវជន និងកីឡា"),
							text(
								"។ ក្នុងរយៈពេលជាច្រើនទសវត្សរ៍ KAPE បានរៀបចំ សាកល្បង និងអនុវត្តគម្រោងអប់រំច្នៃប្រឌិតជាច្រើន ដែលរៀបចំឡើងជាពិសេសដើម្បីជួយក្រសួងអប់រំ យុវជន និងកីឡា អភិវឌ្ឍ និងធ្វើទំនើបកម្មប្រព័ន្ធអប់រំជាតិ។",
							),
						),
						para(
							text(
								"ចាប់ពីការត្រួសត្រាយគំរូសាលារៀនមិត្តកុមារ រហូតដល់ការបង្កើតសាលារៀនជំនាន់ថ្មី (NGS) គម្រោងរបស់យើងបានដើរតួជាកន្លែងបណ្តុះការច្នៃប្រឌិតក្នុងវិស័យអប់រំជាប់ជានិច្ច។ យើងបានខិតខំធ្វើការដើម្បី៖",
							),
						),
						bullets(
							[
								bold("បង្កើនលទ្ធភាព និងសមធម៌"),
								text(
									" — ធានាថាកុមារមកពីគ្រួសារងាយរងគ្រោះ ជនបទ និងជនដាច់ស្រយាល មានសិទ្ធិទទួលការអប់រំប្រកបដោយគុណភាព។",
								),
							],
							[
								bold("ផ្តល់អំណាចដល់គ្រូបង្រៀន"),
								text(
									" — ផ្តល់ការអភិវឌ្ឍវិជ្ជាជីវៈយ៉ាងម៉ត់ចត់ ការណែនាំអក្ខរកម្មឌីជីថល និងឧបករណ៍គរុកោសល្យទំនើប។",
								),
							],
							[
								bold("ជំរុញការច្នៃប្រឌិតឌីជីថល និងបច្ចេកទេស"),
								text(
									" — បញ្ចូល STEM បច្ចេកវិទ្យាព័ត៌មាន និងបច្ចេកវិទ្យាទំនើបទៅក្នុងថ្នាក់រៀន ដើម្បីរៀបចំយុវជនកម្ពុជាសម្រាប់សតវត្សរ៍ទី២១។",
								),
							],
						),
						para(
							text(
								"ដោយតម្រឹមគម្រោងរបស់យើងដោយផ្ទាល់ជាមួយផែនការយុទ្ធសាស្ត្ររបស់ក្រសួងអប់រំ យុវជន និងកីឡា យើងធានាថាអន្តរាគមន៍របស់យើងមិនត្រឹមតែជាដំណោះស្រាយបណ្តោះអាសន្នទេ ប៉ុន្តែជាវិធីសាស្ត្រប្រកបដោយចីរភាព ដែលអាចបញ្ចូលទៅក្នុងគោលនយោបាយជាតិបាន។",
							),
						),
					),
				},
			},
		},
	},
];

const accreditationsSections: SectionNode[] = [
	{
		id: "hero",
		type: "hero",
		layout: "banner",
		props: {
			eyebrow: "Credentials & recognition",
			title: "Accreditations & Honors",
			lead: ACCREDITATIONS_LEAD,
			image: HERO_CONFERENCE,
			i18n: {
				km: {
					eyebrow: "លិខិតបញ្ជាក់ និងការទទួលស្គាល់",
					title: "ការទទួលស្គាល់ និងកិត្តិយស",
					lead: ACCREDITATIONS_LEAD_KM,
				},
			},
		},
	},
	{
		id: "honors-intro",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "1. Honors and Awards",
			body: doc(
				"Letters of appreciation, awards and recognitions received from ministries, donors and local authorities. Click any certificate to view it full screen.",
			),
			i18n: {
				km: {
					title: "១. កិត្តិយស និងពានរង្វាន់",
					body: doc(
						"លិខិតកោតសរសើរ ពានរង្វាន់ និងការទទួលស្គាល់ដែលទទួលបានពីក្រសួង ម្ចាស់ជំនួយ និងអាជ្ញាធរមូលដ្ឋាន។ ចុចលើវិញ្ញាបនបត្រណាមួយដើម្បីមើលពេញអេក្រង់។",
					),
				},
			},
		},
	},
	{
		id: "honors",
		type: "certificates",
		layout: "cols-3",
		props: { items: [] },
	},
	{
		id: "accreditations-intro",
		type: "richtext",
		layout: "narrow",
		props: {
			title: "2. Accreditations & Certifications",
			body: doc(
				"Operational licenses, registrations and quality certifications held by KAPE. Click any certificate to view it full screen.",
			),
			i18n: {
				km: {
					title: "២. ការទទួលស្គាល់ និងវិញ្ញាបនបត្រ",
					body: doc(
						"អាជ្ញាបណ្ណប្រតិបត្តិការ ការចុះបញ្ជី និងវិញ្ញាបនបត្រគុណភាពដែល KAPE កាន់កាប់។ ចុចលើវិញ្ញាបនបត្រណាមួយដើម្បីមើលពេញអេក្រង់។",
					),
				},
			},
		},
	},
	{
		id: "accreditations-grid",
		type: "certificates",
		layout: "cols-3",
		props: { items: [] },
	},
];

type SeedPage = {
	slug: string;
	title: { en: string; km: string };
	excerpt?: { en: string; km: string };
	body?: { en: string; km: string };
	sections?: SectionNode[];
};

const WHO_WE_ARE_PAGES: SeedPage[] = [
	{
		slug: "who-we-are/about",
		title: { en: "About KAPE", km: "អំពី KAPE" },
		excerpt: {
			en: "Cambodia's largest local NGO specializing in education — founded 1999, working in 15 provinces.",
			km: "អង្គការក្រៅរដ្ឋាភិបាលក្នុងស្រុកធំជាងគេរបស់កម្ពុជាឯកទេសខាងការអប់រំ — បង្កើតឡើងក្នុងឆ្នាំ១៩៩៩ ធ្វើការនៅ១៥ខេត្ត។",
		},
		sections: aboutSections,
	},
	{
		slug: "who-we-are/fact-sheet",
		title: { en: "Fact Sheet", km: "ឯកសារពិត" },
		excerpt: {
			en: "Quick facts about KAPE: organizational profile, expertise and strengths.",
			km: "ព័ត៌មានសង្ខេបអំពី KAPE៖ ប្រវត្តិរូបអង្គការ ជំនាញ និងចំណុចខ្លាំង។",
		},
		sections: factSheetSections,
	},
	{
		slug: "who-we-are/vision-mission",
		title: {
			en: "Vision, Mission & Core Values",
			km: "ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃស្នូល",
		},
		excerpt: {
			en: "KAPE's vision, mission and the values that guide every project.",
			km: "ចក្ខុវិស័យ បេសកកម្ម និងតម្លៃរបស់ KAPE ដែលដឹកនាំគ្រប់គម្រោង។",
		},
		sections: visionMissionSections,
	},
	{
		slug: "who-we-are/director-speech",
		title: { en: "Executive Director's Speech", km: "សុន្ទរកថានាយកប្រតិបត្តិ" },
		excerpt: {
			en: "Welcome message from KAPE's Executive Director.",
			km: "សារស្វាគមន៍ពីនាយកប្រតិបត្តិរបស់ KAPE។",
		},
		sections: directorSpeechSections,
	},
	{
		slug: "who-we-are/accreditations",
		title: { en: "Accreditations & Honors", km: "ការទទួលស្គាល់ និងកិត្តិយស" },
		excerpt: { en: ACCREDITATIONS_LEAD, km: ACCREDITATIONS_LEAD_KM },
		sections: accreditationsSections,
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

/** Khmer is machine-generated and listed in .work/km-review-j16.md for a native sweep. */
export async function seedWhoWeArePages() {
	for (const pg of WHO_WE_ARE_PAGES) {
		const [row] = await db
			.insert(pages)
			.values({
				tenantId: TENANT,
				slug: pg.slug,
				status: "published",
				sections: pg.sections,
			})
			.returning({ id: pages.id });
		const fields: Record<string, { en: string; km?: string }> = {
			title: pg.title,
		};
		if (pg.excerpt) fields.excerpt = pg.excerpt;
		if (pg.body) fields.body = pg.body;
		await addTranslations("page", row.id, fields);
	}
}
