import type { SectionNode } from "#/lib/sections";
import { db } from "../db";
import { pages } from "../schema";
import { addTranslations, TENANT } from "./helpers";

const tenSubsectorsSections: SectionNode[] = [
	{
		id: "hero",
		type: "hero",
		layout: "banner",
		props: {
			eyebrow: "Framework",
			title: "Ten Subsectors",
			lead: "A comprehensive framework covering the ten key subsectors that drive education quality and access across Cambodia.",
			image: "https://picsum.photos/seed/kape-students/1600/1000",
			i18n: {
				km: {
					eyebrow: "ក្របខណ្ឌ",
					title: "អនុវិស័យទាំងដប់",
					lead: "ក្របខណ្ឌដ៏ទូលំទូលាយមួយដែលគ្របដណ្តប់លើអនុវិស័យសំខាន់ៗទាំងដប់ ដែលជំរុញគុណភាព និងលទ្ធភាពទទួលបានការអប់រំនៅទូទាំងប្រទេសកម្ពុជា។",
				},
			},
		},
	},
	{
		id: "subsectors",
		type: "cards",
		layout: "cols-2",
		props: {
			title: "The ten subsectors",
			items: [
				{
					title: "Early Childhood Education",
					body: "Expanding access to quality preschool and early learning opportunities for all children.",
				},
				{
					title: "Primary Education",
					body: "Strengthening foundational literacy, numeracy and life skills in the early grades.",
				},
				{
					title: "Secondary Education",
					body: "Improving lower- and upper-secondary schooling, transitions and retention.",
				},
				{
					title: "Inclusion & Special Education",
					body: "Ensuring learners with disabilities and marginalized groups are not left behind.",
				},
				{
					title: "Teacher Professional Development",
					body: "Building the capacity of teachers and school leaders through mentoring and coaching.",
				},
				{
					title: "School Leadership & Management",
					body: "Strengthening school governance, planning and community engagement.",
				},
				{
					title: "Curriculum & Assessment",
					body: "Aligning teaching materials and examinations with modern competency standards.",
				},
				{
					title: "ICT in Education",
					body: "Integrating digital tools, platforms and AI literacy into teaching and learning.",
				},
				{
					title: "Life Skills & Values Education",
					body: "Building health, financial literacy, citizenship and social-emotional skills.",
				},
				{
					title: "Higher Education & TVET",
					body: "Bridging pathways from school to tertiary education and technical-vocational training.",
				},
			],
			i18n: { km: { title: "អនុវិស័យទាំងដប់" } },
		},
	},
];

type SeedPage = {
	slug: string;
	title: { en: string; km: string };
	excerpt: { en: string; km: string };
	sections: SectionNode[];
};

const WHAT_WE_DO_PAGES: SeedPage[] = [
	{
		slug: "what-we-do/ten-subsectors",
		title: { en: "Ten Subsectors", km: "អនុវិស័យទាំងដប់" },
		excerpt: {
			en: "KAPE's ten education subsectors defining our holistic approach to improving learning outcomes in Cambodia.",
			km: "អនុវិស័យអប់រំទាំងដប់របស់ KAPE ដែលកំណត់វិធីសាស្ត្រគ្រប់ជ្រុងជ្រោយរបស់យើងក្នុងការកែលម្អលទ្ធផលសិក្សានៅកម្ពុជា។",
		},
		sections: tenSubsectorsSections,
	},
];

/** Khmer is machine-generated and listed in .work/km-review-j16.md for a native sweep. */
export async function seedWhatWeDoPages() {
	for (const pg of WHAT_WE_DO_PAGES) {
		const [row] = await db
			.insert(pages)
			.values({
				tenantId: TENANT,
				slug: pg.slug,
				status: "published",
				sections: pg.sections,
			})
			.returning({ id: pages.id });
		await addTranslations("page", row.id, {
			title: pg.title,
			excerpt: pg.excerpt,
		});
	}
}
