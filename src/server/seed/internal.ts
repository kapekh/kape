import { db } from "../db";
import { people, posts } from "../schema";
import { addTranslations, doc, TENANT } from "./helpers";

export async function seedInternalNews() {
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
}

export async function seedEvents() {
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
}

export async function seedDocuments() {
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
}

/** Internal staff roster (unified `people` table; tier="staff", not public). */
export async function seedStaffRoster() {
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
}
