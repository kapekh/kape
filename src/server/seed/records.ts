import { db } from "../db";
import {
	media,
	partners,
	people,
	postMedia,
	posts,
	terms,
	translations,
} from "../schema";
import { addTranslations, doc, TENANT } from "./helpers";

/** Sample news posts. */
export async function seedNews() {
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
}

/** Impact / success stories (type=story). */
export async function seedStories() {
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
}

/** Managed reference data (taxonomies) for relation fields. */
export async function seedTerms() {
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
}

/** Public publications (type=publication; category/year/fileUrl in meta). */
export async function seedPublications() {
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
}

/** Photo albums (type=album) with media + captions (placeholder images). */
export async function seedAlbums() {
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
}

/** Job vacancies (type=job; location/deadline in meta). One is expired to prove auto-hide. */
export async function seedJobs() {
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
}

/** Videos (type=video; youtube_url in meta). */
export async function seedVideos() {
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
}

/** Leadership people (unified `people` table; public team/leadership). */
export async function seedLeadership() {
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
}

/** Partners (grouped by category term). */
export async function seedPartners() {
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
}

/**
 * Announcements are posts (contentType=announcement). meta.deadline drives the
 * floating homepage card; meta.link is an optional CTA. One active, one evergreen.
 */
export async function seedAnnouncements() {
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
}
