import { db } from "../db";
import { heroSlides, media } from "../schema";
import { addTranslations, TENANT } from "./helpers";

/** Hero slides (placeholder images via media). */
export async function seedHeroSlides() {
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
}
