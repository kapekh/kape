import { PLACEHOLDER_IMAGE } from "#/lib/placeholder";
import { db } from "../db";
import { media, partners, people, postMedia, posts, terms } from "../schema";
import { addTranslations, doc, TENANT } from "./helpers";

type Bilingual = { en: string; km: string };

const para = (text: string) => ({
	type: "paragraph",
	content: [{ type: "text", text }],
});

/** Multi-paragraph rich-text body (helpers' `doc` only makes one paragraph). */
const docParas = (paras: string[]) =>
	JSON.stringify({ type: "doc", content: paras.map(para) });

/** Pull quote first, then the narrative — how the impact stories are written. */
const docQuoted = (quote: string, paras: string[]) =>
	JSON.stringify({
		type: "doc",
		content: [
			{ type: "blockquote", content: [para(quote)] },
			...paras.map(para),
		],
	});

/** News posts, transferred from the client's directory. */
export async function seedNews() {
	const newsPosts: {
		slug: string;
		publishedAt: string;
		title: Bilingual;
		excerpt: Bilingual;
		body: { en: string[]; km: string[] };
	}[] = [
		{
			slug: "chaktomuk-annual-student-exhibition",
			publishedAt: "2026-07-31",
			title: {
				en: "Annual Student Exhibition at Chaktomuk Secondary School: Cultivating Digital Skills and Creating Direct Impacts on Youth's Future through the IDEAL Project",
				km: "ពិព័រណ៍សិស្សប្រចាំឆ្នាំនៅវិទ្យាល័យចតុមុខ៖ ការបណ្តុះជំនាញឌីជីថល និងបង្កើតផលប៉ះពាល់ដោយផ្ទាល់ដល់អនាគតយុវជនតាមរយៈគម្រោង IDEAL",
			},
			excerpt: {
				en: 'Phnom Penh: On July 31, 2026, Chaktomuk Secondary School hosted a significant "Annual Student Exhibition" filled with a vibrant and celebratory atmosphere, supported by the IDEAL project and implemented by KAPE.',
				km: "ភ្នំពេញ៖ នៅថ្ងៃទី ៣១ ខែកក្កដា ឆ្នាំ ២០២៦ វិទ្យាល័យចតុមុខបានរៀបចំ «ពិព័រណ៍សិស្សប្រចាំឆ្នាំ» ដ៏សំខាន់មួយ ពោរពេញដោយបរិយាកាសរស់រវើក និងសប្បាយរីករាយ ដោយមានការគាំទ្រពីគម្រោង IDEAL និងអនុវត្តដោយ ខេប។",
			},
			body: {
				en: [
					'Phnom Penh: On July 31, 2026, Chaktomuk Secondary School hosted a significant "Annual Student Exhibition" filled with a vibrant and celebratory atmosphere. This program materialized under the full support of the Improving Digital Education for All Learners (IDEAL) project, funded by ChorogUsan for children and directly implemented by KAPE, with the aim of encouraging and motivating the school to increase its focus on developing 21st-century skills for the youth.',
					"This meaningful event attracted a total of approximately 350 participants, including the school management committee, teachers, students, parents, and local authorities. It was held under the high presidency of Mrs. Chet Sophoan, Deputy Director of the Secondary Education Office, the representative of Mr. Hem Sinath, Director of the Phnom Penh Municipal Office of Education, Youth and Sport; Mr. Um Sarith, Deputy Principal of Chaktomuk Secondary School; Mr. Hin Simhuon, Vice Executive Director of KAPE; and Mr. Sor Sophanak, Project Coordinator.",
					"To drive this vision of digital education into reality, the IDEAL project has encouraged and supported the establishment of 17 study clubs within the school, such as Khmer Language, Earth Science, Biology, Mathematics, Physics, Chemistry, and Geography clubs, etc. As a result of this endeavor, the exhibition was organized not only to showcase the students' personal achievements born out of their creativity and year-long research, but also to clearly demonstrate the positive impacts of digital education and study clubs on transforming students' attitudes and developing their competencies.",
					'Reflecting pride in this success, Mrs. Chet Sophoan, Deputy Head of the Secondary Education Office, expressed her delight and highly evaluated that "Our students possess not only knowledge but also practical know-how, skills, strong will, and creativity. This exhibition will help boost intellectual capacity and new skills to contribute to the further development and prosperity of the nation." Regarding the achievements the students have accomplished, Mr. Um Sarith, Deputy Principal of Chaktomuk Secondary School, further emphasized in the school\'s progress report that "The progress and success of the school stem from the close collaboration among the management committee, teachers, development partners, and especially the active participation and support from all parents and guardians." To broaden this vision even further, Mr. Hin Simhuon, Vice Executive Director of KAPE, highlighted the importance of education in this new era, stating that "Responding to the Royal Government\'s Pentagonal Strategy means equipping students with digital and STEAM skills from a young age. If our human resources lack technological knowledge, we will face high risks in this digital age."',
					"Overall, the annual student exhibition at Chaktomuk Secondary School concluded successfully, leaving behind smiles and strong hope. The knowledge, hands-on experiences, and creativity that students acquired from the study clubs and this event serve as the most valuable educational investment in shifting their mindsets, enhancing their digital skills, and unlocking doors to bright career opportunities for them in the future.",
				],
				km: [
					"ភ្នំពេញ៖ នៅថ្ងៃទី ៣១ ខែកក្កដា ឆ្នាំ ២០២៦ វិទ្យាល័យចតុមុខបានរៀបចំ «ពិព័រណ៍សិស្សប្រចាំឆ្នាំ» ដ៏សំខាន់មួយ ពោរពេញដោយបរិយាកាសរស់រវើក និងសប្បាយរីករាយ។ កម្មវិធីនេះបានកើតឡើងក្រោមការគាំទ្រពេញលេញពីគម្រោងលើកកម្ពស់ការអប់រំឌីជីថលសម្រាប់សិស្សគ្រប់រូប (IDEAL) ដែលឧបត្ថម្ភថវិកាដោយ ChorogUsan សម្រាប់កុមារ និងអនុវត្តដោយផ្ទាល់ដោយ ខេប ក្នុងគោលបំណងលើកទឹកចិត្ត និងជំរុញឱ្យសាលាបង្កើនការផ្តោតលើការអភិវឌ្ឍជំនាញសតវត្សរ៍ទី ២១ សម្រាប់យុវជន។",
					"កម្មវិធីដ៏មានអត្ថន័យនេះបានទាក់ទាញអ្នកចូលរួមសរុបប្រមាណ ៣៥០ នាក់ រួមមានគណៈកម្មការគ្រប់គ្រងសាលា គ្រូបង្រៀន សិស្ស មាតាបិតា និងអាជ្ញាធរមូលដ្ឋាន។ កម្មវិធីនេះបានប្រព្រឹត្តទៅក្រោមអធិបតីភាពដ៏ខ្ពង់ខ្ពស់របស់លោកស្រី ជេត សុភ័ណ អនុប្រធានការិយាល័យអប់រំមធ្យមសិក្សា តំណាងលោក ហែម ស៊ីណាត ប្រធានមន្ទីរអប់រំ យុវជន និងកីឡា រាជធានីភ្នំពេញ លោក អ៊ុំ សារិទ្ធ អនុប្រធានវិទ្យាល័យចតុមុខ លោក ហ៊ិន ស៊ីមហួន អនុនាយកប្រតិបត្តិ ខេប និងលោក សរ សុភ័ណក អ្នកសម្របសម្រួលគម្រោង។",
					"ដើម្បីជំរុញចក្ខុវិស័យនៃការអប់រំឌីជីថលនេះឱ្យក្លាយជាការពិត គម្រោង IDEAL បានលើកទឹកចិត្ត និងគាំទ្រការបង្កើតក្លឹបសិក្សាចំនួន ១៧ នៅក្នុងសាលា ដូចជាក្លឹបភាសាខ្មែរ ផែនដីវិទ្យា ជីវវិទ្យា គណិតវិទ្យា រូបវិទ្យា គីមីវិទ្យា និងភូមិវិទ្យា ជាដើម។ ជាលទ្ធផលនៃការខិតខំនេះ ពិព័រណ៍នេះត្រូវបានរៀបចំឡើងមិនត្រឹមតែដើម្បីបង្ហាញសមិទ្ធផលផ្ទាល់ខ្លួនរបស់សិស្ស ដែលកើតចេញពីការច្នៃប្រឌិត និងការស្រាវជ្រាវពេញមួយឆ្នាំប៉ុណ្ណោះទេ ប៉ុន្តែថែមទាំងដើម្បីបង្ហាញយ៉ាងច្បាស់នូវផលប៉ះពាល់វិជ្ជមាននៃការអប់រំឌីជីថល និងក្លឹបសិក្សា ក្នុងការផ្លាស់ប្តូរឥរិយាបថសិស្ស និងអភិវឌ្ឍសមត្ថភាពរបស់ពួកគេផងដែរ។",
					"ដោយឆ្លុះបញ្ចាំងពីមោទនភាពចំពោះជោគជ័យនេះ លោកស្រី ជេត សុភ័ណ អនុប្រធានការិយាល័យអប់រំមធ្យមសិក្សា បានសម្តែងនូវក្តីរីករាយ និងវាយតម្លៃខ្ពស់ថា «សិស្សរបស់យើងមិនត្រឹមតែមានចំណេះដឹងប៉ុណ្ណោះទេ ថែមទាំងមានចំណេះធ្វើ ជំនាញ ឆន្ទៈមោះមុត និងការច្នៃប្រឌិតផងដែរ។ ពិព័រណ៍នេះនឹងជួយលើកកម្ពស់សមត្ថភាពបញ្ញា និងជំនាញថ្មីៗ ដើម្បីរួមចំណែកក្នុងការអភិវឌ្ឍ និងវិបុលភាពរបស់ជាតិបន្ថែមទៀត»។ ចំពោះសមិទ្ធផលដែលសិស្សបានសម្រេច លោក អ៊ុំ សារិទ្ធ អនុប្រធានវិទ្យាល័យចតុមុខ បានបញ្ជាក់បន្ថែមក្នុងរបាយការណ៍វឌ្ឍនភាពរបស់សាលាថា «វឌ្ឍនភាព និងជោគជ័យរបស់សាលា កើតចេញពីកិច្ចសហការយ៉ាងជិតស្និទ្ធរវាងគណៈកម្មការគ្រប់គ្រង គ្រូបង្រៀន ដៃគូអភិវឌ្ឍន៍ និងជាពិសេសការចូលរួម និងការគាំទ្រយ៉ាងសកម្មពីមាតាបិតា និងអាណាព្យាបាលទាំងអស់»។ ដើម្បីពង្រីកចក្ខុវិស័យនេះឱ្យកាន់តែទូលំទូលាយ លោក ហ៊ិន ស៊ីមហួន អនុនាយកប្រតិបត្តិ ខេប បានគូសបញ្ជាក់ពីសារៈសំខាន់នៃការអប់រំក្នុងយុគសម័យថ្មីនេះថា «ការឆ្លើយតបទៅនឹងយុទ្ធសាស្ត្របញ្ចកោណរបស់រាជរដ្ឋាភិបាល មានន័យថាត្រូវបំពាក់ឱ្យសិស្សនូវជំនាញឌីជីថល និង STEAM តាំងពីតូច។ ប្រសិនបើធនធានមនុស្សរបស់យើងខ្វះចំណេះដឹងផ្នែកបច្ចេកវិទ្យា យើងនឹងប្រឈមហានិភ័យខ្ពស់ក្នុងយុគសម័យឌីជីថលនេះ»។",
					"សរុបមក ពិព័រណ៍សិស្សប្រចាំឆ្នាំនៅវិទ្យាល័យចតុមុខបានបញ្ចប់ដោយជោគជ័យ ទុកឱ្យនៅសល់នូវស្នាមញញឹម និងក្តីសង្ឃឹមដ៏មុតមាំ។ ចំណេះដឹង បទពិសោធន៍ជាក់ស្តែង និងការច្នៃប្រឌិតដែលសិស្សទទួលបានពីក្លឹបសិក្សា និងព្រឹត្តិការណ៍នេះ គឺជាការវិនិយោគអប់រំដ៏មានតម្លៃបំផុត ក្នុងការផ្លាស់ប្តូរផ្នត់គំនិត បង្កើនជំនាញឌីជីថល និងបើកទ្វារឆ្ពោះទៅរកឱកាសការងារភ្លឺស្វាងសម្រាប់ពួកគេនាពេលអនាគត។",
				],
			},
		},
		{
			slug: "ideal-annual-student-achievement-exhibition",
			publishedAt: "2026-07-23",
			title: {
				en: "Annual Student Achievement Exhibition at Neak Oknha Moha Pheakdey Hun Neang Bak Kheng Primary School: Showcasing Digital Education Achievements Supported by the IDEAL Project",
				km: "ពិព័រណ៍សមិទ្ធផលសិស្សប្រចាំឆ្នាំនៅសាលាបឋមសិក្សា នាក់ឧកញ៉ា មហាភក្តី ហ៊ុន នាង បាកខែង៖ បង្ហាញសមិទ្ធផលអប់រំឌីជីថលដែលគាំទ្រដោយគម្រោង IDEAL",
			},
			excerpt: {
				en: "Phnom Penh: On July 23, 2026, the campus of Neak Oknha Moha Pheakdey Hun Neang Bak Kheng Primary School was transformed into a vibrant and smile-filled educational forum during the grand Annual Student Achievement Exhibition.",
				km: "ភ្នំពេញ៖ នៅថ្ងៃទី ២៣ ខែកក្កដា ឆ្នាំ ២០២៦ បរិវេណសាលាបឋមសិក្សា នាក់ឧកញ៉ា មហាភក្តី ហ៊ុន នាង បាកខែង ត្រូវបានប្រែក្លាយជាវេទិកាអប់រំដ៏រស់រវើក និងពោរពេញដោយស្នាមញញឹម ក្នុងពិព័រណ៍សមិទ្ធផលសិស្សប្រចាំឆ្នាំដ៏អធិកអធម។",
			},
			body: {
				en: [
					"Phnom Penh: On July 23, 2026, the campus of Neak Oknha Moha Pheakdey Hun Neang Bak Kheng Primary School was transformed into a vibrant and smile-filled educational forum during the grand Annual Student Achievement Exhibition.",
					"The exhibition brought together students, teachers, school directors, parents and education officials to celebrate a full year of learning under the IDEAL project — an initiative that integrates digital tools, media literacy and project-based learning into everyday classroom practice.",
					"Dozens of booths lined the school grounds. Each one was designed, built and presented by the students themselves: coding and robotics demonstrations, digital storytelling, science experiments, recycled-material inventions, traditional cooking, and Khmer arts and dance performances.",
					"Officials from the Ministry of Education, Youth and Sport, the Phnom Penh Department of Education, and representatives of KAPE and the project's partners toured the exhibition, speaking directly with students about how they researched, produced and presented their work.",
					'"What we see here is not memorisation — it is children explaining their own thinking," one visiting official noted. "This is exactly the kind of learning the digital era demands."',
					"Teachers shared how the IDEAL project changed their classrooms: lesson plans now blend offline group work with tablets and shared digital resources, while students take greater responsibility for their own projects and presentations.",
					"The cultural programme closed the day, with students performing classical and folk dances on the main stage before parents and guests, a reminder that digital skills and Khmer identity grow side by side.",
					"KAPE and the IDEAL project team extend their sincere thanks to the school leadership, teachers, parents and partners whose support made the exhibition possible, and reaffirm their commitment to expanding digital education opportunities for every Cambodian child.",
				],
				km: [
					"ភ្នំពេញ៖ នៅថ្ងៃទី ២៣ ខែកក្កដា ឆ្នាំ ២០២៦ បរិវេណសាលាបឋមសិក្សា នាក់ឧកញ៉ា មហាភក្តី ហ៊ុន នាង បាកខែង ត្រូវបានប្រែក្លាយជាវេទិកាអប់រំដ៏រស់រវើក និងពោរពេញដោយស្នាមញញឹម ក្នុងពិព័រណ៍សមិទ្ធផលសិស្សប្រចាំឆ្នាំដ៏អធិកអធម។",
					"ពិព័រណ៍នេះបានប្រមូលផ្តុំសិស្ស គ្រូបង្រៀន នាយកសាលា មាតាបិតា និងមន្ត្រីអប់រំ ដើម្បីអបអរសាទរការសិក្សាពេញមួយឆ្នាំក្រោមគម្រោង IDEAL ដែលជាគំនិតផ្តួចផ្តើមមួយបញ្ចូលឧបករណ៍ឌីជីថល អក្ខរកម្មប្រព័ន្ធផ្សព្វផ្សាយ និងការសិក្សាតាមគម្រោង ទៅក្នុងការអនុវត្តថ្នាក់រៀនប្រចាំថ្ងៃ។",
					"តូបរាប់សិបបានតម្រៀបជួរនៅតាមបរិវេណសាលា។ តូបនីមួយៗត្រូវបានរចនា សាងសង់ និងបង្ហាញដោយសិស្សផ្ទាល់៖ ការបង្ហាញការសរសេរកូដ និងមនុស្សយន្ត ការនិទានរឿងឌីជីថល ការពិសោធន៍វិទ្យាសាស្ត្រ ការច្នៃប្រឌិតពីសម្ភារៈកែច្នៃ ការចម្អិនម្ហូបបុរាណ និងការសម្តែងសិល្បៈ និងរបាំខ្មែរ។",
					"មន្ត្រីមកពីក្រសួងអប់រំ យុវជន និងកីឡា មន្ទីរអប់រំរាជធានីភ្នំពេញ ព្រមទាំងតំណាង ខេប និងដៃគូគម្រោង បានទស្សនាពិព័រណ៍ ដោយសន្ទនាដោយផ្ទាល់ជាមួយសិស្ស អំពីរបៀបដែលពួកគេស្រាវជ្រាវ ផលិត និងបង្ហាញស្នាដៃរបស់ខ្លួន។",
					"«អ្វីដែលយើងឃើញនៅទីនេះ មិនមែនជាការទន្ទេញទេ គឺជាកុមារកំពុងពន្យល់ពីគំនិតរបស់ខ្លួនផ្ទាល់» មន្ត្រីម្នាក់ដែលបានមកទស្សនាបានកត់សម្គាល់។ «នេះជាការសិក្សាបែបដែលយុគសម័យឌីជីថលទាមទារយ៉ាងពិតប្រាកដ»។",
					"គ្រូបង្រៀនបានចែករំលែកពីរបៀបដែលគម្រោង IDEAL បានផ្លាស់ប្តូរថ្នាក់រៀនរបស់ពួកគេ៖ ផែនការបង្រៀនឥឡូវនេះបញ្ចូលការងារជាក្រុមក្រៅបណ្តាញ ជាមួយថេប្លេត និងធនធានឌីជីថលរួម ខណៈដែលសិស្សទទួលខុសត្រូវកាន់តែច្រើនលើគម្រោង និងការធ្វើបទបង្ហាញរបស់ខ្លួន។",
					"កម្មវិធីវប្បធម៌បានបិទបញ្ចប់ថ្ងៃនោះ ដោយសិស្សសម្តែងរបាំបុរាណ និងរបាំប្រជាប្រិយនៅលើឆាកធំ ចំពោះមុខមាតាបិតា និងភ្ញៀវកិត្តិយស ជាការរំលឹកថាជំនាញឌីជីថល និងអត្តសញ្ញាណខ្មែរ រីកចម្រើនទន្ទឹមគ្នា។",
					"ខេប និងក្រុមការងារគម្រោង IDEAL សូមថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅដល់ថ្នាក់ដឹកនាំសាលា គ្រូបង្រៀន មាតាបិតា និងដៃគូទាំងអស់ ដែលការគាំទ្ររបស់ពួកគាត់បានធ្វើឱ្យពិព័រណ៍នេះកើតឡើងបាន ហើយសូមបញ្ជាក់ឡើងវិញនូវការប្តេជ្ញាចិត្តក្នុងការពង្រីកឱកាសអប់រំឌីជីថលសម្រាប់កុមារកម្ពុជាគ្រប់រូប។",
				],
			},
		},
		{
			slug: "kang-meas-21st-century-library",
			publishedAt: "2026-05-25",
			title: {
				en: "Kang Meas District Receives 21st Century Library and Educational Material Support for Vulnerable Children",
				km: "ស្រុកកងមាសទទួលបានបណ្ណាល័យសតវត្សរ៍ទី ២១ និងជំនួយសម្ភារៈអប់រំសម្រាប់កុមារងាយរងគ្រោះ",
			},
			excerpt: {
				en: "On May 25, 2026, the BMZ-EYE project organized a handover ceremony for a 21st-century library room and the distribution of educational materials and food supplies at Preak Koy Primary School, Kang Meas District, Kampong Cham Province.",
				km: "នៅថ្ងៃទី ២៥ ខែឧសភា ឆ្នាំ ២០២៦ គម្រោង BMZ-EYE បានរៀបចំពិធីប្រគល់បន្ទប់បណ្ណាល័យសតវត្សរ៍ទី ២១ និងចែកចាយសម្ភារៈអប់រំ ព្រមទាំងស្បៀងអាហារ នៅសាលាបឋមសិក្សាព្រែកគយ ស្រុកកងមាស ខេត្តកំពង់ចាម។",
			},
			body: {
				en: [
					"On May 25, 2026, the BMZ-EYE project organized a handover ceremony for a 21st-century library room and the distribution of educational materials and food supplies at Preak Koy Primary School, Kang Meas District, Kampong Cham Province.",
					"The ceremony was attended by district education officials, school directors, teachers, parents and children from the surrounding communities. The new library provides a dedicated space for reading, project-based learning and after-school clubs.",
					"KAPE and BMZ-EYE are committed to expanding access to safe learning spaces and quality resources for vulnerable children across rural Cambodia.",
				],
				km: [
					"នៅថ្ងៃទី ២៥ ខែឧសភា ឆ្នាំ ២០២៦ គម្រោង BMZ-EYE បានរៀបចំពិធីប្រគល់បន្ទប់បណ្ណាល័យសតវត្សរ៍ទី ២១ និងចែកចាយសម្ភារៈអប់រំ ព្រមទាំងស្បៀងអាហារ នៅសាលាបឋមសិក្សាព្រែកគយ ស្រុកកងមាស ខេត្តកំពង់ចាម។",
					"ពិធីនេះមានការចូលរួមពីមន្ត្រីអប់រំស្រុក នាយកសាលា គ្រូបង្រៀន មាតាបិតា និងកុមារមកពីសហគមន៍ជុំវិញ។ បណ្ណាល័យថ្មីនេះផ្តល់នូវកន្លែងសម្រាប់ការអាន ការសិក្សាតាមគម្រោង និងក្លឹបក្រៅម៉ោងសិក្សា។",
					"ខេប និង BMZ-EYE ប្តេជ្ញាពង្រីកលទ្ធភាពទទួលបានកន្លែងសិក្សាដែលមានសុវត្ថិភាព និងធនធានប្រកបដោយគុណភាព សម្រាប់កុមារងាយរងគ្រោះនៅទូទាំងជនបទកម្ពុជា។",
				],
			},
		},
		{
			slug: "school-enrollment-campaign-2025-2026",
			publishedAt: "2026-05-12",
			title: {
				en: "The Provincially Launching Campaign to Boost School Enrollment for 2025-2026 Academic Year",
				km: "យុទ្ធនាការបើកបវេសនកាលថ្នាក់ខេត្ត ដើម្បីជំរុញការចុះឈ្មោះចូលរៀនសម្រាប់ឆ្នាំសិក្សា ២០២៥-២០២៦",
			},
			excerpt: {
				en: "A wave of educational outreach and celebratory announcements is sweeping across KAPE's partner provinces ahead of the new school year.",
				km: "រលកនៃការផ្សព្វផ្សាយអប់រំ និងសេចក្តីប្រកាសអបអរសាទរ កំពុងរីករាលដាលនៅទូទាំងខេត្តដៃគូរបស់ ខេប មុនឆ្នាំសិក្សាថ្មី។",
			},
			body: {
				en: [
					"A wave of educational outreach and celebratory announcements is sweeping across KAPE's partner provinces ahead of the 2025-2026 academic year.",
					"Provincial teams have organized parades, community meetings and door-to-door visits to encourage families to enroll their children — with a special focus on girls, out-of-school youth and children with disabilities.",
				],
				km: [
					"រលកនៃការផ្សព្វផ្សាយអប់រំ និងសេចក្តីប្រកាសអបអរសាទរ កំពុងរីករាលដាលនៅទូទាំងខេត្តដៃគូរបស់ ខេប មុនឆ្នាំសិក្សា ២០២៥-២០២៦។",
					"ក្រុមការងារថ្នាក់ខេត្តបានរៀបចំក្បួនដង្ហែ កិច្ចប្រជុំសហគមន៍ និងការចុះសួរសុខទុក្ខតាមផ្ទះ ដើម្បីលើកទឹកចិត្តគ្រួសារឱ្យចុះឈ្មោះកូនចូលរៀន ដោយផ្តោតជាពិសេសលើកុមារី យុវជនក្រៅសាលា និងកុមារពិការ។",
				],
			},
		},
		{
			slug: "ngs-new-ict-lab",
			publishedAt: "2026-05-02",
			title: {
				en: "New ICT Lab opens at New Generation School",
				km: "បន្ទប់ពិសោធន៍ ICT ថ្មីបើកដំណើរការនៅសាលាជំនាន់ថ្មី",
			},
			excerpt: {
				en: "Students gain a dedicated space for digital learning, coding clubs and AI literacy training as part of the NGS initiative.",
				km: "សិស្សទទួលបានកន្លែងជាក់លាក់សម្រាប់ការសិក្សាឌីជីថល ក្លឹបសរសេរកូដ និងការបណ្តុះបណ្តាលអក្ខរកម្មបញ្ញាសិប្បនិម្មិត ជាផ្នែកនៃគំនិតផ្តួចផ្តើម NGS។",
			},
			body: {
				en: [
					"Students at the New Generation School now have a dedicated ICT lab equipped with modern computers, high-speed internet and interactive displays.",
					"The lab will host coding clubs, AI literacy sessions and digital citizenship workshops for both students and teachers.",
				],
				km: [
					"សិស្សនៅសាលាជំនាន់ថ្មី ឥឡូវនេះមានបន្ទប់ពិសោធន៍ ICT ជាក់លាក់មួយ បំពាក់ដោយកុំព្យូទ័រទំនើប អ៊ីនធឺណិតល្បឿនលឿន និងអេក្រង់អន្តរកម្ម។",
					"បន្ទប់ពិសោធន៍នេះនឹងរៀបចំក្លឹបសរសេរកូដ វគ្គអក្ខរកម្មបញ្ញាសិប្បនិម្មិត និងសិក្ខាសាលាពលរដ្ឋឌីជីថល សម្រាប់ទាំងសិស្ស និងគ្រូបង្រៀន។",
				],
			},
		},
		{
			slug: "teacher-training-lslag",
			publishedAt: "2026-04-18",
			title: {
				en: "Teacher Training Workshop for Life Skills for Adolescent Girls",
				km: "សិក្ខាសាលាបណ្តុះបណ្តាលគ្រូស្តីពីជំនាញជីវិតសម្រាប់ក្មេងស្រីវ័យជំទង់",
			},
			excerpt: {
				en: "Over 80 teachers from Pursat and Battambang gathered for a three-day training on life skills pedagogy.",
				km: "គ្រូបង្រៀនជាង ៨០ នាក់មកពីខេត្តពោធិ៍សាត់ និងបាត់ដំបង បានប្រមូលផ្តុំគ្នាក្នុងវគ្គបណ្តុះបណ្តាលរយៈពេលបីថ្ងៃ ស្តីពីវិធីសាស្ត្របង្រៀនជំនាញជីវិត។",
			},
			body: {
				en: [
					"Over 80 teachers from Pursat and Battambang gathered for a three-day training on life skills pedagogy under the LSLAG project.",
					"Topics included sexual and reproductive health, financial literacy and gender equality in the classroom.",
				],
				km: [
					"គ្រូបង្រៀនជាង ៨០ នាក់មកពីខេត្តពោធិ៍សាត់ និងបាត់ដំបង បានប្រមូលផ្តុំគ្នាក្នុងវគ្គបណ្តុះបណ្តាលរយៈពេលបីថ្ងៃ ស្តីពីវិធីសាស្ត្របង្រៀនជំនាញជីវិត ក្រោមគម្រោង LSLAG។",
					"ប្រធានបទរួមមាន សុខភាពផ្លូវភេទ និងសុខភាពបន្តពូជ អក្ខរកម្មហិរញ្ញវត្ថុ និងសមភាពយេនឌ័រក្នុងថ្នាក់រៀន។",
				],
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
			body: { en: docParas(n.body.en), km: docParas(n.body.km) },
		});
	}
}

// the excerpt is the only short bilingual field a post has, so the name and role go there
export async function seedStories() {
	const stories: {
		slug: string;
		title: Bilingual;
		excerpt: Bilingual;
		quote: Bilingual;
		body: { en: string[]; km: string[] };
	}[] = [
		{
			slug: "yary-life-transformation",
			title: {
				en: "A life rewritten by the Happy Cambodian Children project",
				km: "ជីវិតមួយដែលបានសរសេរឡើងវិញដោយគម្រោងកុមារកម្ពុជាសប្បាយរីករាយ",
			},
			excerpt: {
				en: "Yary, age 11 · Grade 6 · Rompok Primary School, Kratie",
				km: "យ៉ារី អាយុ ១១ ឆ្នាំ · ថ្នាក់ទី ៦ · សាលាបឋមសិក្សារំពក់ ខេត្តក្រចេះ",
			},
			quote: {
				en: "We will always encounter both good and bad things in life, but as long as we have breath, we must use our precious time to overcome every obstacle — for the future of our family and our society.",
				km: "យើងតែងតែជួបប្រទះទាំងរឿងល្អ និងរឿងអាក្រក់ក្នុងជីវិត ប៉ុន្តែដរាបណាយើងនៅមានដង្ហើម យើងត្រូវប្រើពេលវេលាដ៏មានតម្លៃរបស់យើង ដើម្បីយកឈ្នះរាល់ឧបសគ្គ សម្រាប់អនាគតគ្រួសារ និងសង្គមរបស់យើង។",
			},
			body: {
				en: [
					"Yary is a bright 11-year-old girl in Grade 6 at Rompok Primary School in Snuol District, Kratie Province. Life at home was difficult — her family relied on daily-wage farm work, and Yary often thought about dropping out to help her mother.",
					"Through the Happy Cambodian Children (HCC) project, Yary joined a child club, received school materials, hygiene items and monthly nutrition support. Volunteer mentors visited her home to encourage her parents to keep her in school.",
					"Today Yary is one of the top students in her class. She dreams of becoming a nurse so she can care for children in her village — and she leads a small reading circle for younger pupils at Rompok School.",
				],
				km: [
					"យ៉ារី ជាក្មេងស្រីវ័យ ១១ ឆ្នាំដ៏ឆ្លាតវៃ រៀននៅថ្នាក់ទី ៦ សាលាបឋមសិក្សារំពក់ ស្រុកស្នួល ខេត្តក្រចេះ។ ជីវភាពនៅផ្ទះមានការលំបាក ដោយគ្រួសាររបស់នាងពឹងផ្អែកលើការងារកសិកម្មឈ្នួលប្រចាំថ្ងៃ ហើយយ៉ារីតែងតែគិតចង់ឈប់រៀន ដើម្បីជួយម្តាយ។",
					"តាមរយៈគម្រោងកុមារកម្ពុជាសប្បាយរីករាយ (HCC) យ៉ារីបានចូលរួមក្លឹបកុមារ ទទួលបានសម្ភារៈសិក្សា សម្ភារៈអនាម័យ និងជំនួយអាហារូបត្ថម្ភប្រចាំខែ។ អ្នកណែនាំស្ម័គ្រចិត្តបានចុះទៅផ្ទះរបស់នាង ដើម្បីលើកទឹកចិត្តមាតាបិតាឱ្យបន្តឱ្យនាងរៀន។",
					"សព្វថ្ងៃនេះ យ៉ារីជាសិស្សពូកែម្នាក់ក្នុងថ្នាក់។ នាងសុបិនចង់ក្លាយជាគិលានុបដ្ឋាយិកា ដើម្បីថែទាំកុមារនៅភូមិរបស់នាង ហើយនាងក៏ដឹកនាំក្រុមអានសៀវភៅតូចមួយសម្រាប់សិស្សតូចៗនៅសាលារំពក់ផងដែរ។",
				],
			},
		},
		{
			slug: "sum-bopha-digital-literacy",
			title: {
				en: "Bridging the urban–rural classroom with digital literacy",
				km: "តភ្ជាប់ថ្នាក់រៀនទីក្រុង និងជនបទដោយអក្ខរកម្មឌីជីថល",
			},
			excerpt: {
				en: "Ms. Sum Bopha · Physics Teacher · Arrany Rangsey LSS, Siem Reap",
				km: "លោកស្រី ស៊ុម បុប្ផា · គ្រូរូបវិទ្យា · អនុវិទ្យាល័យអារញ្ញរង្សី ខេត្តសៀមរាប",
			},
			quote: {
				en: "Technology and modern teaching aids are powerful tools, but the true heart of educational transformation lies in the lifelong learning will of both teachers and students.",
				km: "បច្ចេកវិទ្យា និងឧបករណ៍បង្រៀនទំនើប គឺជាឧបករណ៍ដ៏មានឥទ្ធិពល ប៉ុន្តែបេះដូងពិតនៃការផ្លាស់ប្តូរវិស័យអប់រំ ស្ថិតនៅលើឆន្ទៈសិក្សាពេញមួយជីវិតរបស់ទាំងគ្រូ និងសិស្ស។",
			},
			body: {
				en: [
					"Sum Bopha is a 24-year-old Physics teacher at Arrany Rangsey Lower Secondary School in Siem Reap. With three years of experience, she has become a champion of digital pedagogy in her rural district.",
					"Through KAPE's teacher-development programme she completed training on interactive whiteboards, simulation software and low-cost science experiments — then began sharing those tools with peers at neighbouring schools.",
					"Her Grade 8 students now build their own simple circuits, run water-quality simulations and record short science videos. Enrolment in her physics elective has more than doubled in two years.",
				],
				km: [
					"ស៊ុម បុប្ផា ជាគ្រូរូបវិទ្យាវ័យ ២៤ ឆ្នាំ នៅអនុវិទ្យាល័យអារញ្ញរង្សី ខេត្តសៀមរាប។ ដោយមានបទពិសោធន៍បីឆ្នាំ លោកស្រីបានក្លាយជាអ្នកតស៊ូមតិសំខាន់សម្រាប់វិធីសាស្ត្របង្រៀនឌីជីថលនៅស្រុកជនបទរបស់លោកស្រី។",
					"តាមរយៈកម្មវិធីអភិវឌ្ឍគ្រូបង្រៀនរបស់ ខេប លោកស្រីបានបញ្ចប់វគ្គបណ្តុះបណ្តាលស្តីពីក្តារខៀនអន្តរកម្ម កម្មវិធីក្លែងធ្វើ និងការពិសោធន៍វិទ្យាសាស្ត្រតម្លៃទាប រួចបានចាប់ផ្តើមចែករំលែកឧបករណ៍ទាំងនោះជាមួយមិត្តរួមវិជ្ជាជីវៈនៅសាលាជិតខាង។",
					"សិស្សថ្នាក់ទី ៨ របស់លោកស្រី ឥឡូវនេះអាចតបណ្តាញអគ្គិសនីសាមញ្ញដោយខ្លួនឯង ធ្វើការក្លែងធ្វើគុណភាពទឹក និងថតវីដេអូវិទ្យាសាស្ត្រខ្លីៗ។ ចំនួនសិស្សចុះឈ្មោះរៀនមុខវិជ្ជារូបវិទ្យាជម្រើសរបស់លោកស្រី បានកើនឡើងជាងទ្វេដងក្នុងរយៈពេលពីរឆ្នាំ។",
				],
			},
		},
		{
			slug: "chhim-phallak-reading-culture",
			title: {
				en: "Growing a reading culture, one child at a time",
				km: "ការបណ្តុះវប្បធម៌អាន ម្តងមួយកុមារ",
			},
			excerpt: {
				en: "Ms. Chhim Phallak · Librarian · Sophorn Kiri Primary School",
				km: "លោកស្រី ឈឹម ផល្លក · បណ្ណារក្ស · សាលាបឋមសិក្សាសុភណ្ឌគិរី",
			},
			quote: {
				en: "I do this work with heart and love — for a librarian is not merely a book guard, but a cultivator of reading culture who guides students toward the path of wisdom.",
				km: "ខ្ញុំធ្វើការងារនេះដោយបេះដូង និងក្តីស្រឡាញ់ ព្រោះបណ្ណារក្សមិនមែនគ្រាន់តែជាអ្នកយាមសៀវភៅនោះទេ ប៉ុន្តែជាអ្នកបណ្តុះវប្បធម៌អាន ដែលនាំសិស្សឆ្ពោះទៅរកផ្លូវនៃប្រាជ្ញា។",
			},
			body: {
				en: [
					"Since 2016, Chhim Phallak has been the librarian at Sophorn Kiri Primary School. When she started, the library was a locked storeroom of dusty books; today it is the busiest room in the school.",
					"With KAPE's Library Fellows programme, Phallak rebuilt the collection, ran read-aloud sessions for younger grades and introduced a home-borrowing scheme so children could share stories with their parents.",
					"Reading fluency scores at Sophorn Kiri have risen for three consecutive years, and Phallak now mentors librarians at four neighbouring schools.",
				],
				km: [
					"ចាប់តាំងពីឆ្នាំ ២០១៦ មក ឈឹម ផល្លក បានធ្វើជាបណ្ណារក្សនៅសាលាបឋមសិក្សាសុភណ្ឌគិរី។ ពេលលោកស្រីចាប់ផ្តើម បណ្ណាល័យគ្រាន់តែជាបន្ទប់ស្តុកដែលចាក់សោ ពោរពេញដោយសៀវភៅប្រឡាក់ធូលី ប៉ុន្តែសព្វថ្ងៃនេះ វាជាបន្ទប់ដែលមមាញឹកជាងគេក្នុងសាលា។",
					"ជាមួយកម្មវិធីមិត្តបណ្ណាល័យរបស់ ខេប លោកស្រី ផល្លក បានស្តារបណ្តុំសៀវភៅឡើងវិញ រៀបចំវគ្គអានឮៗសម្រាប់សិស្សថ្នាក់តូច និងបានដាក់ឱ្យដំណើរការគម្រោងខ្ចីសៀវភៅយកទៅផ្ទះ ដើម្បីឱ្យកុមារអាចចែករំលែករឿងជាមួយមាតាបិតា។",
					"ពិន្ទុជំនាញអានស្ទាត់នៅសុភណ្ឌគិរីបានកើនឡើងបីឆ្នាំជាប់ៗគ្នា ហើយឥឡូវនេះ លោកស្រី ផល្លក កំពុងណែនាំបណ្ណារក្សនៅសាលាជិតខាងចំនួនបួនទៀត។",
				],
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
			body: {
				en: docQuoted(s.quote.en, s.body.en),
				km: docQuoted(s.quote.km, s.body.km),
			},
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
		// Keys, not labels, are what the public partners band prints as its group
		// heading, so they stay short; the label is what an admin picks from.
		partner_category: [
			["government", "Royal Government of Cambodia"],
			["strategic", "Strategic Partnership (Thun Thean Obrum / TTO)"],
			["private", "Private"],
			["foundation", "Foundation"],
			["international", "International Organizations"],
			["local", "Local Organizations"],
			["implementing", "Implemented Partners"],
			["technical", "Technical Supportive Partner"],
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
					url: PLACEHOLDER_IMAGE,
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

const POSITION_KM: Record<string, string> = {
	"Chairman, Board of Directors": "ប្រធានក្រុមប្រឹក្សាភិបាល",
	"Board Member": "សមាជិកក្រុមប្រឹក្សាភិបាល",
	"Board of Directors": "ក្រុមប្រឹក្សាភិបាល",
	"Executive Director": "នាយកប្រតិបត្តិ",
	"Vice Director": "អនុនាយក",
	"Finance Director": "នាយកហិរញ្ញវត្ថុ",
	"Senior Management Team": "ក្រុមគ្រប់គ្រងជាន់ខ្ពស់",
	"NGSI Program Manager": "អ្នកគ្រប់គ្រងកម្មវិធី NGSI",
	"Program Manager": "អ្នកគ្រប់គ្រងកម្មវិធី",
	Coordinator: "អ្នកសម្របសម្រួល",
	Manager: "អ្នកគ្រប់គ្រង",
};

export async function seedLeadership() {
	const bioSoon = {
		en: ["Biography coming soon."],
		km: ["ជីវប្រវត្តិនឹងបង្ហាញឆាប់ៗនេះ។"],
	};
	const leadership: {
		slug: string;
		tier: string;
		position: string;
		email?: string;
		name: Bilingual;
		bio: { en: string[]; km: string[] };
	}[] = [
		{
			slug: "person-heang-koy",
			tier: "board",
			position: "Chairman, Board of Directors",
			name: { en: "Mr. Heang Koy", km: "លោក ហេង គយ" },
			bio: {
				en: [
					"Mr. Heang Koy chairs KAPE's Board of Directors and has served the education sector in Cambodia for more than three decades.",
					"He guides the organisation's strategic direction, ensuring KAPE remains accountable to communities, government partners and donors as it scales its impact across 15 provinces.",
				],
				km: [
					"លោក ហេង គយ ជាប្រធានក្រុមប្រឹក្សាភិបាលរបស់ ខេប ហើយបានបម្រើវិស័យអប់រំនៅកម្ពុជាអស់រយៈពេលជាងបីទសវត្សរ៍មកហើយ។",
					"លោកដឹកនាំទិសដៅយុទ្ធសាស្ត្ររបស់អង្គការ ដោយធានាថា ខេប នៅតែមានគណនេយ្យភាពចំពោះសហគមន៍ ដៃគូរដ្ឋាភិបាល និងម្ចាស់ជំនួយ ខណៈពេលដែលពង្រីកផលប៉ះពាល់របស់ខ្លួននៅទូទាំង ១៥ ខេត្ត។",
				],
			},
		},
		{
			slug: "person-hin-simhuon",
			tier: "board",
			position: "Board Member",
			name: { en: "Mr. Hin Simhuon", km: "លោក ហ៊ិន ស៊ីមហួន" },
			bio: {
				en: [
					"Mr. Hin Simhuon is a senior member of KAPE's Board of Directors, bringing decades of experience in Cambodian public education and community development.",
					"He provides governance oversight and advises on partnerships with the Ministry of Education, Youth and Sport and provincial authorities.",
				],
				km: [
					"លោក ហ៊ិន ស៊ីមហួន ជាសមាជិកជាន់ខ្ពស់នៃក្រុមប្រឹក្សាភិបាលរបស់ ខេប ដែលនាំមកនូវបទពិសោធន៍ជាច្រើនទសវត្សរ៍ក្នុងវិស័យអប់រំសាធារណៈ និងការអភិវឌ្ឍសហគមន៍នៅកម្ពុជា។",
					"លោកផ្តល់ការត្រួតពិនិត្យអភិបាលកិច្ច និងផ្តល់យោបល់អំពីភាពជាដៃគូជាមួយក្រសួងអប់រំ យុវជន និងកីឡា និងអាជ្ញាធរខេត្ត។",
				],
			},
		},
		{
			slug: "person-chhay-typa",
			tier: "board",
			position: "Board Member",
			name: { en: "Mr. Chhay Typa", km: "លោក ឆាយ ទីប៉ា" },
			bio: {
				en: [
					"Mr. Chhay Typa serves on KAPE's Board of Directors and contributes long experience in school-level programming and teacher development.",
					"He supports the board's review of programme quality and community engagement across KAPE's project provinces.",
				],
				km: [
					"លោក ឆាយ ទីប៉ា បម្រើការក្នុងក្រុមប្រឹក្សាភិបាលរបស់ ខេប និងចូលរួមចំណែកដោយបទពិសោធន៍យូរអង្វែងក្នុងការរៀបចំកម្មវិធីថ្នាក់សាលា និងការអភិវឌ្ឍគ្រូបង្រៀន។",
					"លោកគាំទ្រការពិនិត្យឡើងវិញរបស់ក្រុមប្រឹក្សាភិបាល លើគុណភាពកម្មវិធី និងការចូលរួមរបស់សហគមន៍នៅទូទាំងខេត្តគម្រោងរបស់ ខេប។",
				],
			},
		},
		{
			slug: "person-board-4",
			tier: "board",
			position: "Board of Directors",
			name: { en: "Board Member", km: "សមាជិកក្រុមប្រឹក្សាភិបាល" },
			bio: bioSoon,
		},
		{
			slug: "person-board-5",
			tier: "board",
			position: "Board of Directors",
			name: { en: "Board Member", km: "សមាជិកក្រុមប្រឹក្សាភិបាល" },
			bio: bioSoon,
		},
		{
			slug: "person-board-6",
			tier: "board",
			position: "Board of Directors",
			name: { en: "Board Member", km: "សមាជិកក្រុមប្រឹក្សាភិបាល" },
			bio: bioSoon,
		},
		{
			slug: "person-sambath",
			tier: "smt",
			position: "Executive Director",
			email: "sambath@kapekh.org",
			name: { en: "Mr. Sambath", km: "លោក សម្បត្តិ" },
			bio: {
				en: [
					"Mr. Sambath leads KAPE as Executive Director, overseeing programmes reaching more than 160,000 children across Cambodia.",
					"He works closely with the Ministry of Education, Youth and Sport, international donors and civil-society partners to align KAPE's work with national education priorities.",
					"Under his leadership KAPE has expanded into new areas such as AI literacy, STEM innovation and inclusive education for the most vulnerable learners.",
				],
				km: [
					"លោក សម្បត្តិ ដឹកនាំ ខេប ក្នុងតួនាទីជានាយកប្រតិបត្តិ ដោយត្រួតពិនិត្យកម្មវិធីដែលឈានដល់កុមារជាង ១៦០.០០០ នាក់នៅទូទាំងប្រទេសកម្ពុជា។",
					"លោកធ្វើការយ៉ាងជិតស្និទ្ធជាមួយក្រសួងអប់រំ យុវជន និងកីឡា ម្ចាស់ជំនួយអន្តរជាតិ និងដៃគូសង្គមស៊ីវិល ដើម្បីតម្រឹមការងាររបស់ ខេប ទៅនឹងអាទិភាពអប់រំជាតិ។",
					"ក្រោមការដឹកនាំរបស់លោក ខេប បានពង្រីកទៅវិស័យថ្មីៗ ដូចជាអក្ខរកម្មបញ្ញាសិប្បនិម្មិត នវានុវត្តន៍ STEM និងការអប់រំបរិយាបន្នសម្រាប់សិស្សដែលងាយរងគ្រោះបំផុត។",
				],
			},
		},
		{
			slug: "person-set-soleakna",
			tier: "smt",
			position: "Vice Director",
			name: { en: "Ms. Set Soleakna", km: "លោកស្រី សេត សុលក្ខិណា" },
			bio: {
				en: [
					"Ms. Set Soleakna serves as Vice Director, supporting KAPE's Executive Director on programme strategy, human resources and cross-project coordination.",
					"She has been instrumental in strengthening KAPE's internal systems and mentoring the next generation of Cambodian education leaders.",
				],
				km: [
					"លោកស្រី សេត សុលក្ខិណា បម្រើការជាអនុនាយក ដោយគាំទ្រនាយកប្រតិបត្តិរបស់ ខេប លើយុទ្ធសាស្ត្រកម្មវិធី ធនធានមនុស្ស និងការសម្របសម្រួលឆ្លងគម្រោង។",
					"លោកស្រីបានដើរតួយ៉ាងសំខាន់ក្នុងការពង្រឹងប្រព័ន្ធផ្ទៃក្នុងរបស់ ខេប និងបណ្តុះបណ្តាលអ្នកដឹកនាំអប់រំកម្ពុជាជំនាន់ក្រោយ។",
				],
			},
		},
		{
			slug: "person-kimheang",
			tier: "smt",
			position: "Finance Director",
			name: { en: "Ms. Kimheang", km: "លោកស្រី គីមហៀង" },
			bio: {
				en: [
					"Ms. Kimheang leads KAPE's Finance Directorate, ensuring transparent stewardship of donor funds and compliance with Cambodian law and international standards.",
					"She oversees financial planning, audit, and grant management for all KAPE projects.",
				],
				km: [
					"លោកស្រី គីមហៀង ដឹកនាំនាយកដ្ឋានហិរញ្ញវត្ថុរបស់ ខេប ដោយធានានូវការគ្រប់គ្រងថវិកាម្ចាស់ជំនួយប្រកបដោយតម្លាភាព និងអនុលោមតាមច្បាប់កម្ពុជា និងស្តង់ដារអន្តរជាតិ។",
					"លោកស្រីត្រួតពិនិត្យការរៀបចំផែនការហិរញ្ញវត្ថុ សវនកម្ម និងការគ្រប់គ្រងជំនួយសម្រាប់គម្រោងទាំងអស់របស់ ខេប។",
				],
			},
		},
		{
			slug: "person-senior-technical-adviser",
			tier: "smt",
			position: "Senior Management Team",
			name: {
				en: "Senior Technical Adviser",
				km: "ទីប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់",
			},
			bio: bioSoon,
		},
		{
			slug: "person-senior-national-adviser",
			tier: "smt",
			position: "Senior Management Team",
			name: { en: "Senior National Adviser", km: "ទីប្រឹក្សាជាតិជាន់ខ្ពស់" },
			bio: bioSoon,
		},
		{
			slug: "person-hr-admin-manager",
			tier: "smt",
			position: "Senior Management Team",
			name: {
				en: "HR & Admin Manager",
				km: "អ្នកគ្រប់គ្រងធនធានមនុស្ស និងរដ្ឋបាល",
			},
			bio: bioSoon,
		},
		{
			slug: "person-phal-sovanthy",
			tier: "pm",
			position: "NGSI Program Manager",
			name: { en: "Mr. Phal Sovanthy", km: "លោក ផល សុវណ្ណថី" },
			bio: {
				en: [
					"Mr. Phal Sovanthy manages KAPE's New Generation Schools Initiative (NGSI), a flagship reform programme piloting high-quality secondary education across Cambodia.",
					"He works with school directors, teachers and MoEYS partners to implement rigorous standards, ICT-rich classrooms and student-centred learning.",
				],
				km: [
					"លោក ផល សុវណ្ណថី គ្រប់គ្រងគំនិតផ្តួចផ្តើមសាលាជំនាន់ថ្មី (NGSI) របស់ ខេប ដែលជាកម្មវិធីកែទម្រង់ឈានមុខគេ សាកល្បងការអប់រំមធ្យមសិក្សាគុណភាពខ្ពស់នៅទូទាំងប្រទេសកម្ពុជា។",
					"លោកធ្វើការជាមួយនាយកសាលា គ្រូបង្រៀន និងដៃគូក្រសួងអប់រំ ដើម្បីអនុវត្តស្តង់ដារតឹងរឹង ថ្នាក់រៀនសម្បូរបច្ចេកវិទ្យា និងការសិក្សាដែលផ្តោតលើសិស្ស។",
				],
			},
		},
		{
			slug: "person-ngprc-manager",
			tier: "pm",
			position: "Program Manager",
			name: { en: "NGPRC Center Manager", km: "អ្នកគ្រប់គ្រងមជ្ឈមណ្ឌល NGPRC" },
			bio: bioSoon,
		},
		{
			slug: "person-hcc-manager",
			tier: "pm",
			position: "Program Manager",
			name: { en: "HCC Program Manager", km: "អ្នកគ្រប់គ្រងកម្មវិធី HCC" },
			bio: bioSoon,
		},
		{
			slug: "person-class-manager",
			tier: "pm",
			position: "Program Manager",
			name: { en: "CLASS Program Manager", km: "អ្នកគ្រប់គ្រងកម្មវិធី CLASS" },
			bio: bioSoon,
		},
		{
			slug: "person-iep-coordinator",
			tier: "pm",
			position: "Coordinator",
			name: { en: "IEP Coordinator", km: "អ្នកសម្របសម្រួល IEP" },
			bio: bioSoon,
		},
		{
			slug: "person-dep-coordinator",
			tier: "pm",
			position: "Coordinator",
			name: { en: "DEP Project Coordinator", km: "អ្នកសម្របសម្រួលគម្រោង DEP" },
			bio: bioSoon,
		},
		{
			slug: "person-equal-i3l-manager",
			tier: "pm",
			position: "Program Manager",
			name: {
				en: "EQUAL-i3L Program Manager",
				km: "អ្នកគ្រប់គ្រងកម្មវិធី EQUAL-i3L",
			},
			bio: bioSoon,
		},
		{
			slug: "person-llse-manager",
			tier: "pm",
			position: "Program Manager",
			name: { en: "LLSE Project Manager", km: "អ្នកគ្រប់គ្រងគម្រោង LLSE" },
			bio: bioSoon,
		},
		{
			slug: "person-foster-manager",
			tier: "pm",
			position: "Program Manager",
			name: { en: "FOSTER Program Manager", km: "អ្នកគ្រប់គ្រងកម្មវិធី FOSTER" },
			bio: bioSoon,
		},
		{
			slug: "person-mldp-manager",
			tier: "pm",
			position: "Program Manager",
			name: { en: "MLDP Program Manager", km: "អ្នកគ្រប់គ្រងកម្មវិធី MLDP" },
			bio: bioSoon,
		},
		{
			slug: "person-mc-manager",
			tier: "pm",
			position: "Manager",
			name: { en: "M&C Manager", km: "អ្នកគ្រប់គ្រង M&C" },
			bio: bioSoon,
		},
		{
			slug: "person-me-manager",
			tier: "pm",
			position: "Manager",
			name: { en: "M&E Manager", km: "អ្នកគ្រប់គ្រង M&E" },
			bio: bioSoon,
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
				tier: pn.tier,
				email: pn.email ?? null,
				isPublic: true,
				slug: pn.slug,
				sort: i,
			})
			.returning({ id: people.id });
		await addTranslations("person", row.id, {
			position: { en: pn.position, km: POSITION_KM[pn.position] },
			bio: { en: docParas(pn.bio.en), km: docParas(pn.bio.km) },
		});
	}
}

// partners.name has no Khmer column, so these are English-only by schema
export async function seedPartners() {
	const roster: [string, string, string | null][] = [
		["MoEYS", "government", "https://www.moeys.gov.kh/"],
		["Thun Thean Obrum (TTO)", "strategic", null],
		["Meta", "private", "https://about.meta.com/"],
		["Happy Cambodian Children (HCC)", "foundation", null],
		["Google.org", "foundation", "https://www.google.org/"],
		["ASEAN Foundation", "foundation", "https://www.aseanfoundation.org/"],
		["The Asia Foundation", "foundation", "https://asiafoundation.org/"],
		["Kinchan Foundation", "foundation", null],
		["Phoenix Foundation", "foundation", null],
		["Franks Family Foundation", "foundation", null],
		[
			"Asian Development Bank",
			"international",
			"https://www.adb.org/countries/cambodia/main",
		],
		["WeWorld", "international", "https://www.weworld.it/en"],
		[
			"UNESCO",
			"international",
			"https://www.unesco.org/en/fieldoffice/phnompenh",
		],
		["ChildFund Korea", "international", "https://www.childfund.or.kr/"],
		["ChorogUsan", "international", null],
		["Plan International", "international", "https://plan-international.org/"],
		["UNICEF", "international", "https://www.unicef.org/cambodia/"],
		["BMZ", "international", "https://www.bmz.de/en"],
		["EBC", "local", null],
		["NEP", "local", "https://www.nepcambodia.org/"],
		["Krousar Yoeung", "implementing", null],
		["BSDA", "implementing", "https://bsda-cambodia.org/"],
		["Bandos Komar", "implementing", null],
		["YCC", "implementing", null],
		["Lycado", "implementing", null],
		["Koompi", "technical", "https://koompi.com/"],
	];
	await db.insert(partners).values(
		roster.map(([name, category, url], sort) => ({
			tenantId: TENANT,
			name,
			category,
			url,
			sort,
		})),
	);
}

// meta.deadline drives the homepage card and hides it once past
export async function seedAnnouncements() {
	const announcementPosts: {
		slug: string;
		deadline: string | null;
		title: { en: string; km: string };
		excerpt: { en: string; km: string };
		body: { en: string[]; km: string[] };
	}[] = [
		{
			slug: "public-bidding-invitation-2026",
			deadline: "2026-12-15",
			title: {
				en: "Public Bidding Invitation now open",
				km: "ការអញ្ជើញដេញថ្លៃជាសាធារណៈបើកហើយ",
			},
			excerpt: {
				en: "Deadline: 15 December 2026 · Click to read the full notice.",
				km: "ផុតកំណត់៖ ១៥ ធ្នូ ២០២៦ · ចុចដើម្បីអានសេចក្តីជូនដំណឹងពេញលេញ។",
			},
			body: {
				en: [
					"KAPE invites qualified suppliers to bid for the supply and delivery of school furniture, library materials and ICT equipment to partner schools in Kampong Cham, Kratie and Siem Reap.",
					"Bid documents may be collected at the KAPE head office, National Road 7, Kampong Cham Town, during working hours. Sealed bids must reach the office no later than 15 December 2026.",
					"Enquiries: 042-941-481 / 042-941-918 or kape@kapekh.org.",
				],
				km: [
					"ខេប សូមអញ្ជើញអ្នកផ្គត់ផ្គង់ដែលមានលក្ខណៈសម្បត្តិគ្រប់គ្រាន់ ដេញថ្លៃផ្គត់ផ្គង់គ្រឿងសង្ហារឹមសាលារៀន សម្ភារៈបណ្ណាល័យ និងបរិក្ខារ ICT ជូនសាលាដៃគូនៅកំពង់ចាម ក្រចេះ និងសៀមរាប។",
					"ឯកសារដេញថ្លៃអាចទទួលយកបាននៅការិយាល័យកណ្តាល ខេប ផ្លូវជាតិលេខ ៧ ក្រុងកំពង់ចាម ក្នុងម៉ោងធ្វើការ។ ការដេញថ្លៃបិទជិតត្រូវដល់ការិយាល័យមិនលើសពីថ្ងៃទី ១៥ ខែធ្នូ ឆ្នាំ ២០២៦។",
					"ព័ត៌មានបន្ថែម៖ ០៤២-៩៤១-៤៨១ / ០៤២-៩៤១-៩១៨ ឬ kape@kapekh.org។",
				],
			},
		},
		{
			slug: "where-every-cambodian-child-learns",
			deadline: null,
			title: {
				en: "Where every Cambodian child learns",
				km: "កន្លែងដែលកុមារកម្ពុជាគ្រប់រូបរៀន",
			},
			excerpt: {
				en: "For more than thirty years, KAPE has walked alongside Cambodia's children.",
				km: "ជាង៣០ឆ្នាំមកហើយ ខេបបានដើររួមជាមួយកុមារកម្ពុជា។",
			},
			body: {
				en: [
					"KAPE works at every level of formal education across 15 provinces of Cambodia — from preschools and primary classrooms to secondary schools, tertiary programs and a Master's Degree in Mentoring.",
					"Direct beneficiaries number well over 160,000 children at more than 385 schools, supported by 1,300 teachers and principals.",
				],
				km: [
					"ខេប ធ្វើការនៅគ្រប់កម្រិតនៃការអប់រំផ្លូវការ នៅទូទាំង ១៥ ខេត្តនៃប្រទេសកម្ពុជា ចាប់ពីសាលាមត្តេយ្យ និងថ្នាក់បឋមសិក្សា រហូតដល់មធ្យមសិក្សា កម្មវិធីឧត្តមសិក្សា និងបរិញ្ញាបត្រជាន់ខ្ពស់ផ្នែកការណែនាំ។",
					"អ្នកទទួលផលផ្ទាល់មានជាង ១៦០,០០០ នាក់ នៅសាលាជាង ៣៨៥ កន្លែង ដោយមានការគាំទ្រពីគ្រូបង្រៀន និងនាយកសាលាចំនួន ១,៣០០ នាក់។",
				],
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
				meta: { deadline: a.deadline },
			})
			.returning({ id: posts.id });
		await addTranslations("post", row.id, {
			title: a.title,
			excerpt: a.excerpt,
			body: { en: docParas(a.body.en), km: docParas(a.body.km) },
		});
	}
}
