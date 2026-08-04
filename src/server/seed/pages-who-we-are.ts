import { db } from "../db";
import { pages } from "../schema";
import { addTranslations, doc, TENANT } from "./helpers";

/** Rich-text pages (rendered by the generic /$ page route). */
export async function seedWhoWeArePages() {
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
}
