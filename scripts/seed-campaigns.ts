/**
 * Seed a set of sample fundraising campaigns. Idempotent — upserts by slug, so
 * re-running won't duplicate. Run with: bun scripts/seed-campaigns.ts
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { campaigns } from "../src/server/schema";

const TENANT = 1;

type Seed = {
	slug: string;
	title: string;
	titleKm: string;
	blurb: string;
	blurbKm: string;
	goalAmount: string;
	presets: number[];
	impactTiers: { amount: number; label: string }[];
	featured?: boolean;
	sort: number;
};

const SEEDS: Seed[] = [
	{
		slug: "every-child-learns",
		title: "Where every child learns",
		titleKm: "កន្លែងដែលកុមារគ្រប់រូបបានរៀន",
		blurb: "Your gift becomes a textbook, a teacher’s training, a girl’s scholarship, a community’s library. Give where it’s needed most.",
		blurbKm: "អំណោយរបស់អ្នកក្លាយជាសៀវភៅសិក្សា ការបណ្តុះបណ្តាលគ្រូ អាហារូបករណ៍ និងបណ្ណាល័យសហគមន៍។",
		goalAmount: "50000",
		presets: [25, 50, 100, 250],
		impactTiers: [
			{ amount: 25, label: "Textbooks for a classroom" },
			{ amount: 50, label: "A month of after-school tutoring" },
			{ amount: 100, label: "Teacher training for one educator" },
			{ amount: 250, label: "A girls’ scholarship" },
		],
		featured: true,
		sort: 0,
	},
	{
		slug: "girls-scholarships",
		title: "Scholarships for girls",
		titleKm: "អាហារូបករណ៍សម្រាប់ក្មេងស្រី",
		blurb: "Keep girls in school through the critical secondary years — covering fees, supplies, and mentoring.",
		blurbKm: "ជួយឱ្យក្មេងស្រីបន្តការសិក្សានៅកម្រិតមធ្យមសិក្សា។",
		goalAmount: "30000",
		presets: [40, 80, 160, 320],
		impactTiers: [
			{ amount: 40, label: "School supplies for a term" },
			{ amount: 160, label: "A semester of fees" },
			{ amount: 320, label: "A full year of secondary school" },
		],
		sort: 1,
	},
	{
		slug: "classroom-libraries",
		title: "Classroom libraries",
		titleKm: "បណ្ណាល័យក្នុងថ្នាក់រៀន",
		blurb: "Stock classrooms with Khmer-language story books so reading becomes a joy, not a chore.",
		blurbKm: "ផ្គត់ផ្គង់សៀវភៅរឿងជាភាសាខ្មែរដល់ថ្នាក់រៀន។",
		goalAmount: "15000",
		presets: [20, 50, 100, 200],
		impactTiers: [
			{ amount: 20, label: "A shelf of story books" },
			{ amount: 100, label: "A starter library for one class" },
			{ amount: 200, label: "Libraries for two classrooms" },
		],
		sort: 2,
	},
	{
		slug: "teacher-training",
		title: "Train a generation of teachers",
		titleKm: "បណ្តុះបណ្តាលគ្រូជំនាន់ថ្មី",
		blurb: "Equip teachers with modern, child-centred methods — the highest-leverage gift in education.",
		blurbKm: "បំពាក់គ្រូបង្រៀនជាមួយវិធីសាស្ត្រទំនើបផ្តោតលើកុមារ។",
		goalAmount: "40000",
		presets: [50, 100, 250, 500],
		impactTiers: [
			{ amount: 100, label: "One teacher trained" },
			{ amount: 500, label: "A whole school’s staff trained" },
		],
		sort: 3,
	},
	{
		slug: "digital-classrooms",
		title: "Digital classrooms",
		titleKm: "ថ្នាក់រៀនឌីជីថល",
		blurb: "Bring tablets, ICT labs, and learning apps to schools so every student is ready for a digital future.",
		blurbKm: "នាំយកថេប្លេត និងបន្ទប់ពិសោធន៍ ICT ដល់សាលារៀន។",
		goalAmount: "25000",
		presets: [30, 75, 150, 300],
		impactTiers: [
			{ amount: 75, label: "A tablet loaded with learning apps" },
			{ amount: 300, label: "An ICT corner for a classroom" },
		],
		sort: 4,
	},
];

async function main() {
	for (const s of SEEDS) {
		const [existing] = await db
			.select({ id: campaigns.id })
			.from(campaigns)
			.where(and(eq(campaigns.tenantId, TENANT), eq(campaigns.slug, s.slug)))
			.limit(1);
		const values = {
			tenantId: TENANT,
			slug: s.slug,
			status: "active" as const,
			title: s.title,
			titleKm: s.titleKm,
			blurb: s.blurb,
			blurbKm: s.blurbKm,
			currency: "USD" as const,
			goalAmount: s.goalAmount,
			presets: s.presets,
			allowCustom: true,
			impactTiers: s.impactTiers,
			showSupporters: true,
			featured: s.featured ?? false,
			sort: s.sort,
		};
		if (existing) {
			await db.update(campaigns).set(values).where(eq(campaigns.id, existing.id));
			console.log(`updated ${s.slug}`);
		} else {
			await db.insert(campaigns).values(values);
			console.log(`inserted ${s.slug}`);
		}
	}
	console.log("done.");
}

main();
