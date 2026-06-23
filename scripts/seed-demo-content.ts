/**
 * Seed a rich, media-grade test dataset: 6 entries per content type, each with
 * real article copy and images (cover + inline body images + galleries).
 *
 * Insert-only (skips slugs that already exist) so it's safe to re-run and won't
 * collide with the base seed. Khmer title/excerpt are provided for bilingual
 * listings; bodies are English and fall back to English on /km automatically.
 *
 * Run: bun scripts/seed-demo-content.ts
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { media, people, postMedia, posts, renderCache, translations } from "../src/server/schema";

const TENANT = 1;
const AUTHOR = "KAPE Cambodia";

/* ----------------------------- helpers ----------------------------- */

const pic = (seed: string, w = 1600, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

async function addMedia(seed: string, w = 1600, h = 1000, caption?: string): Promise<number> {
	const [row] = await db
		.insert(media)
		.values({ tenantId: TENANT, r2Key: `demo/${seed}.jpg`, url: pic(seed, w, h), contentType: "image/jpeg", width: w, height: h })
		.returning({ id: media.id });
	if (caption) await db.insert(translations).values({ tenantId: TENANT, entityType: "media", entityId: row.id, field: "caption", lang: "en", value: caption });
	return row.id;
}

async function slugExists(slug: string): Promise<boolean> {
	const [r] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.tenantId, TENANT), eq(posts.slug, slug))).limit(1);
	return Boolean(r);
}

// --- Tiptap block builders ---
type Node = Record<string, unknown>;
const para = (text: string): Node => ({ type: "paragraph", content: [{ type: "text", text }] });
const lead = (text: string): Node => ({ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "bold" }] }] });
const h2 = (text: string): Node => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const imageNode = (src: string, alt: string): Node => ({ type: "image", attrs: { src, alt } });
const quote = (text: string): Node => ({ type: "blockquote", content: [para(text)] });
const bullets = (items: string[]): Node => ({ type: "bulletList", content: items.map((t) => ({ type: "listItem", content: [para(t)] })) });
const richDoc = (blocks: Node[]) => JSON.stringify({ type: "doc", content: blocks });

type Tr = { en: string; km?: string };
async function addTr(entityId: number, fields: Record<string, Tr>) {
	const rows = [] as { tenantId: number; entityType: string; entityId: number; field: string; lang: string; value: string }[];
	for (const [field, v] of Object.entries(fields)) {
		rows.push({ tenantId: TENANT, entityType: "post", entityId, field, lang: "en", value: v.en });
		if (v.km) rows.push({ tenantId: TENANT, entityType: "post", entityId, field, lang: "km", value: v.km });
	}
	if (rows.length) await db.insert(translations).values(rows);
}

type PostSpec = {
	contentType: string;
	slug: string;
	publishedAt?: string | null;
	deadline?: string | null;
	meta?: Record<string, unknown>;
	coverSeed?: string;
	title: Tr;
	excerpt?: Tr;
	body?: Node[]; // English rich body
	gallery?: { seed: string; caption: string }[];
};

let created = 0;
let skipped = 0;
async function addPost(s: PostSpec): Promise<void> {
	if (await slugExists(s.slug)) {
		skipped++;
		return;
	}
	const coverMediaId = s.coverSeed ? await addMedia(s.coverSeed) : null;
	const [row] = await db
		.insert(posts)
		.values({
			tenantId: TENANT,
			contentType: s.contentType,
			slug: s.slug,
			status: "published",
			author: AUTHOR,
			publishedAt: s.publishedAt ?? null,
			deadline: s.deadline ?? null,
			coverMediaId,
			meta: s.meta ?? null,
		})
		.returning({ id: posts.id });
	await addTr(row.id, {
		title: s.title,
		...(s.excerpt ? { excerpt: s.excerpt } : {}),
		...(s.body ? { body: { en: richDoc(s.body) } } : {}),
	});
	if (s.gallery) {
		for (let i = 0; i < s.gallery.length; i++) {
			const mid = await addMedia(s.gallery[i].seed, 1200, 800, s.gallery[i].caption);
			await db.insert(postMedia).values({ postId: row.id, mediaId: mid, sort: i });
		}
	}
	created++;
}

/* ----------------------------- content ----------------------------- */

async function seedNews() {
	const items: Omit<PostSpec, "contentType">[] = [
		{
			slug: "demo-new-library-prey-veng",
			coverSeed: "kape-news-library",
			publishedAt: "2026-06-18",
			title: { en: "A New Community Library Opens its Doors in Prey Veng", km: "បណ្ណាល័យសហគមន៍ថ្មីបើកនៅខេត្តព្រៃវែង" },
			excerpt: { en: "Over 1,200 children in Peam Ro district now have free access to books, quiet study space and weekend reading clubs.", km: "កុមារជាង ១,២០០ នាក់នៅស្រុកពាមរ មានឱកាសប្រើប្រាស់សៀវភៅដោយឥតគិតថ្លៃ។" },
			gallery: [
				{ seed: "kape-news-library-a", caption: "Students explore the new reading corner on opening day." },
				{ seed: "kape-news-library-b", caption: "Volunteers sort donated books by reading level." },
				{ seed: "kape-news-library-c", caption: "A weekend reading club in session." },
			],
			body: [
				lead("On Saturday morning, the sound of turning pages filled a freshly painted classroom in Peam Ro district as KAPE and the Provincial Office of Education opened the area's first dedicated community library."),
				para("The library — stocked with more than 4,000 Khmer and bilingual titles — is the result of an eighteen-month partnership between KAPE, local commune councils and a network of village reading volunteers. For many of the children who arrived for the opening, it was the first time they had ever borrowed a book to take home."),
				h2("Built around the way children actually read"),
				para("Rather than a silent reference room, the space was designed as a living, social place. Low shelves keep books within reach of the youngest readers, a carpeted corner hosts daily story circles, and a small maker table lets children illustrate their own short stories."),
				imageNode(pic("kape-news-library-inline", 1200, 700), "Children reading together in the new library"),
				para("\"A book in a warehouse helps no one,\" said the district education officer at the ribbon-cutting. \"A book in a child's hands, every single day, changes a future.\""),
				quote("When a child reads for pleasure, everything else in school becomes easier. That is the whole idea behind this library."),
				h2("What comes next"),
				para("Over the coming term, KAPE will train twelve community volunteers to run weekend reading clubs and a mobile book-box that rotates between three neighbouring villages without a library of their own. Reading assessments will track how borrowing habits affect literacy through the year."),
				bullets(["4,000+ titles in Khmer and English", "12 trained community reading volunteers", "A mobile book-box serving 3 outlying villages", "Weekend clubs for early-grade and upper-primary readers"]),
			],
		},
		{
			slug: "demo-stem-teacher-training-battambang",
			coverSeed: "kape-news-stem",
			publishedAt: "2026-06-11",
			title: { en: "120 Teachers Complete Hands-On STEM Training in Battambang", km: "គ្រូ ១២០ នាក់បញ្ចប់ការបណ្តុះបណ្តាល STEM នៅខេត្តបាត់ដំបង" },
			excerpt: { en: "A week-long institute showed teachers how to turn everyday materials into low-cost science and maths investigations.", km: "សិក្ខាសាលារយៈពេលមួយសប្តាហ៍បង្ហាញគ្រូពីរបៀបបង្កើតការពិសោធន៍វិទ្យាសាស្ត្រ។" },
			body: [
				lead("This week, 120 primary and lower-secondary teachers from across Battambang traded chalk-and-talk for hands-on experiments at KAPE's annual STEM teaching institute."),
				para("The five-day programme focused on a simple but powerful idea: that good science and maths teaching does not require an expensive laboratory. Working in small groups, teachers built circuits from batteries and foil, measured plant growth with paper rulers, and turned plastic bottles into water-filtration models."),
				imageNode(pic("kape-news-stem-inline", 1200, 700), "Teachers building a low-cost science experiment"),
				h2("From recipe to inquiry"),
				para("Facilitators encouraged teachers to move away from demonstrations where the outcome is already known, towards genuine investigations where students predict, test and explain. Each participant left with a printed kit of twenty classroom-ready activities mapped to the national curriculum."),
				quote("My students remember an experiment they did with their hands far longer than a definition I wrote on the board."),
				para("KAPE will follow up with three rounds of in-school coaching this term, pairing institute graduates with mentor teachers to keep the new methods alive long after the workshop ends."),
			],
		},
		{
			slug: "demo-scholarships-girls-mondulkiri",
			coverSeed: "kape-news-scholarship",
			publishedAt: "2026-06-04",
			title: { en: "150 Scholarships Help Girls Stay in School in Mondulkiri", km: "អាហារូបករណ៍ ១៥០ ជួយក្មេងស្រីបន្តការសិក្សានៅខេត្តមណ្ឌលគិរី" },
			excerpt: { en: "Targeted support — from bicycles to mentoring — is keeping girls enrolled through the critical lower-secondary years.", km: "ការគាំទ្រពិសេសកំពុងជួយឱ្យក្មេងស្រីបន្តចុះឈ្មោះរៀន។" },
			body: [
				lead("For families in remote Mondulkiri, the journey to secondary school can be the single biggest obstacle to a girl's education. A new KAPE scholarship programme is tackling that barrier head-on."),
				para("The 150 scholarships cover far more than tuition. Each package includes a bicycle, a year of school supplies, a small monthly stipend to offset lost household income, and — crucially — a trained female mentor who checks in with each girl every month."),
				h2("Why mentoring matters"),
				para("Evidence from earlier cohorts showed that financial support alone was not enough; girls were far more likely to stay enrolled when a trusted adult helped them navigate setbacks at home and at school. This year's programme makes mentoring a core component rather than an add-on."),
				imageNode(pic("kape-news-scholarship-inline", 1200, 700), "Scholarship recipients with their new bicycles"),
				quote("I wanted to drop out after grade seven to help at home. My mentor helped my family see another path."),
				para("Of last year's scholarship recipients, 94 percent progressed to the next grade — a figure that KAPE hopes to match or exceed as the programme expands to two neighbouring districts."),
			],
		},
		{
			slug: "demo-moeys-digital-curriculum-partnership",
			coverSeed: "kape-news-moeys",
			publishedAt: "2026-05-28",
			title: { en: "KAPE and MoEYS Pilot a Digital Citizenship Curriculum", km: "ខេប និងក្រសួងអប់រំសាកល្បងកម្មវិធីសិក្សាពលរដ្ឋឌីជីថល" },
			excerpt: { en: "Forty New Generation Schools will teach students how to stay safe, think critically and create responsibly online.", km: "សាលាជំនាន់ថ្មី ៤០ នឹងបង្រៀនសិស្សអំពីសុវត្ថិភាពលើអ៊ីនធឺណិត។" },
			body: [
				lead("As smartphones reach even the most remote classrooms, the Ministry of Education, Youth and Sport and KAPE have launched a pilot to teach students the skills to use them wisely."),
				para("The digital citizenship curriculum spans ten lessons covering online safety, recognising misinformation, protecting personal data, and creating original content responsibly. It will run in forty New Generation Schools before a planned national rollout."),
				h2("Skills for a connected generation"),
				para("Rather than banning devices, the curriculum treats digital literacy as a core competency — as fundamental as reading or arithmetic. Lessons are built around real scenarios students already face, from viral rumours to online harassment."),
				imageNode(pic("kape-news-moeys-inline", 1200, 700), "Students in a digital citizenship lesson"),
				para("Teacher guides, student workbooks and a facilitator training package have all been localised into Khmer. KAPE's technology team will gather feedback throughout the pilot to refine the materials before they reach schools nationwide."),
			],
		},
		{
			slug: "demo-early-childhood-centres-kratie",
			coverSeed: "kape-news-ecd",
			publishedAt: "2026-05-20",
			title: { en: "Ten Early Childhood Centres Open Across Kratie", km: "មជ្ឈមណ្ឌលកុមារតូចចំនួន ១០ បើកនៅខេត្តក្រចេះ" },
			excerpt: { en: "Play-based learning is giving the province's youngest children a strong start before primary school.", km: "ការសិក្សាតាមការលេងផ្តល់ការចាប់ផ្តើមដ៏រឹងមាំដល់កុមារតូច។" },
			body: [
				lead("Ten new community early-childhood centres have opened their doors across Kratie province, bringing structured, play-based learning to children aged three to five for the first time in many villages."),
				para("Research is clear that the years before primary school shape a child's lifelong learning. Yet access to early education remains low in rural Cambodia. The new centres, run by trained community facilitators, aim to close that gap."),
				imageNode(pic("kape-news-ecd-inline", 1200, 700), "Young children at a play-based learning centre"),
				h2("Learning through play"),
				para("Each centre is equipped with locally made learning materials, picture books and outdoor play equipment. Facilitators guide children through songs, storytelling, counting games and motor-skill activities designed to build the foundations of literacy and numeracy."),
				quote("Children who attend a good early-childhood programme arrive at primary school ready to learn — and they stay ahead."),
				para("Parents are partners in the model: monthly sessions show caregivers simple activities they can do at home with everyday objects, extending learning well beyond the centre walls."),
			],
		},
		{
			slug: "demo-clean-water-schools-takeo",
			coverSeed: "kape-news-water",
			publishedAt: "2026-05-12",
			title: { en: "Clean Water and New Toilets Reach 18 Schools in Takeo", km: "ទឹកស្អាត និងបង្គន់ថ្មីដល់សាលា ១៨ នៅខេត្តតាកែវ" },
			excerpt: { en: "Better water, sanitation and hygiene facilities are cutting absences and keeping students healthy.", km: "ហេដ្ឋារចនាសម្ព័ន្ធ​អនាម័យ​ប្រសើរ​កំពុង​កាត់​បន្ថយ​ការ​អវត្តមាន​សិស្ស។" },
			body: [
				lead("Eighteen schools in Takeo province now have clean drinking water, functioning toilets and handwashing stations, thanks to a water, sanitation and hygiene (WASH) programme completed this month."),
				para("Inadequate sanitation is a quiet but serious barrier to education. Children — especially girls — often miss school or drop out entirely when facilities are unsafe or simply absent. The new infrastructure directly addresses that risk."),
				h2("More than pipes and tanks"),
				para("Alongside the physical upgrades, KAPE worked with each school to set up student-led hygiene clubs, train staff on maintenance, and integrate handwashing into the daily routine. The goal is lasting behaviour change, not just new buildings."),
				imageNode(pic("kape-news-water-inline", 1200, 700), "Students at a new handwashing station"),
				bullets(["18 schools reached", "Safe drinking water for ~7,500 students", "Separate, lockable toilet blocks for girls and boys", "Student hygiene clubs at every school"]),
				para("Early monitoring already shows a measurable drop in illness-related absences across the participating schools."),
			],
		},
	];
	for (const it of items) await addPost({ contentType: "news", ...it });
}

async function seedStories() {
	const items: Omit<PostSpec, "contentType">[] = [
		{
			slug: "demo-story-sophea-first-in-family",
			coverSeed: "kape-story-sophea",
			publishedAt: "2026-06-15",
			title: { en: "Sophea: the first in her family to reach university", km: "សុភា៖ មនុស្សដំបូងក្នុងគ្រួសារដែលឈានដល់សាកលវិទ្យាល័យ" },
			excerpt: { en: "From a rice field in Kampong Thom to a scholarship in Phnom Penh — one student's determined journey.", km: "ពីវាលស្រែនៅកំពង់ធំ ដល់អាហារូបករណ៍នៅភ្នំពេញ។" },
			body: [
				lead("Sophea remembers studying by the light of a borrowed phone, long after her younger siblings had fallen asleep. This year, she became the first person in her family to enrol at university."),
				para("Growing up in a farming family in Kampong Thom, Sophea's path to higher education was never assumed. Money was tight, and the nearest upper-secondary school was an hour's ride away. When a KAPE scholarship arrived in grade nine, it changed what felt possible."),
				imageNode(pic("kape-story-sophea-inline", 1200, 700), "Sophea studying at her desk"),
				h2("A turning point"),
				para("The scholarship covered her supplies and a bicycle, but Sophea credits her mentor for the harder, quieter support — the encouragement to keep going when staying home would have been easier. \"She believed I could do it before I believed it myself,\" Sophea says."),
				quote("I want to come back as a teacher. I want to be for other children what my mentor was for me."),
				para("Now studying education at a university in Phnom Penh, Sophea plans to return to her home province to teach. Her younger sister, watching closely, has already declared she will be next."),
			],
		},
		{
			slug: "demo-story-teacher-dara-coding-club",
			coverSeed: "kape-story-dara",
			publishedAt: "2026-06-08",
			title: { en: "The teacher who started a coding club with no computers", km: "គ្រូដែលបង្កើតក្លឹបសរសេរកូដដោយគ្មានកុំព្យូទ័រ" },
			excerpt: { en: "Mr. Dara taught the logic of programming with paper, chalk and a lot of imagination — until the laptops arrived.", km: "លោកគ្រូ ដារ៉ា បង្រៀនតក្កវិជ្ជានៃកម្មវិធីដោយប្រើក្រដាស និងដី។" },
			body: [
				lead("Before his school had a single computer, Mr. Dara was already teaching his students to think like programmers."),
				para("Using cards laid out on the floor, paper grids and step-by-step instruction games, he taught the underlying logic of coding — sequences, loops and conditions — without any electronics at all. The club met every Friday afternoon, and it grew."),
				h2("When the laptops finally came"),
				para("When a set of refurbished laptops arrived through a KAPE technology grant, Dara's students were ready. They had spent months building the mental models; now they simply moved them onto a screen. Within weeks, the club was building small games and animations."),
				imageNode(pic("kape-story-dara-inline", 1200, 700), "Students working at laptops in a coding club"),
				quote("The computer is just a tool. The thinking has to come first — and you can teach thinking anywhere."),
				para("Dara's approach is now being shared with other schools in the network, proving that the biggest barrier to digital learning is not always hardware."),
			],
		},
		{
			slug: "demo-story-mother-literacy-class",
			coverSeed: "kape-story-mother",
			publishedAt: "2026-05-30",
			title: { en: "Learning to read at 42, so she could read to her grandchildren", km: "រៀនអានអក្សរនៅអាយុ ៤២ ឆ្នាំ" },
			excerpt: { en: "An adult literacy class in Pursat is opening new doors for parents — and for the children who learn beside them.", km: "ថ្នាក់អក្ខរកម្មមនុស្សពេញវ័យកំពុងបើកទ្វារថ្មីសម្រាប់ឪពុកម្តាយ។" },
			body: [
				lead("Sreypov never went to school as a child. At 42, sitting in a small evening class in Pursat, she wrote her own name for the first time."),
				para("KAPE's adult literacy programme reaches caregivers who missed their own education — often women who left school to work or marry young. The classes run in the evening, in the village, so that learning fits around farming and family."),
				imageNode(pic("kape-story-mother-inline", 1200, 700), "An adult literacy class in session"),
				h2("Two generations learning at once"),
				para("The impact reaches beyond the learners themselves. Parents who can read are more likely to keep their own children in school and to help with homework. Sreypov now reads simple storybooks aloud to her grandchildren each night."),
				quote("My grandchildren look at me differently now. And I look at myself differently too."),
				para("For Sreypov, the classes were never only about letters on a page. \"It is dignity,\" she says simply."),
			],
		},
		{
			slug: "demo-story-inclusive-classroom-makara",
			coverSeed: "kape-story-makara",
			publishedAt: "2026-05-22",
			title: { en: "An inclusive classroom where every child belongs", km: "ថ្នាក់រៀនរួមបញ្ចូលដែលកុមារគ្រប់រូបជាកម្មសិទ្ធិ" },
			excerpt: { en: "How one school in Siem Reap welcomed students with disabilities — and grew stronger for it.", km: "របៀបដែលសាលាមួយនៅសៀមរាបស្វាគមន៍សិស្សពិការ។" },
			body: [
				lead("When Makara, who is deaf, first arrived, his teacher did not know any sign language. Two years later, half his classmates do."),
				para("KAPE's inclusive education programme supports schools to welcome children with disabilities into mainstream classrooms — with the training, materials and adapted teaching they need to thrive rather than simply attend."),
				h2("Small changes, big difference"),
				para("Makara's teacher completed a course in basic Khmer sign language and inclusive teaching methods. The classroom layout changed, visual aids increased, and a peer-support system paired Makara with rotating classmates. The whole class, it turned out, learned better."),
				imageNode(pic("kape-story-makara-inline", 1200, 700), "An inclusive classroom with diverse learners"),
				quote("Inclusion is not charity. A classroom that works for the child who learns differently works better for everyone."),
				para("Makara is now near the top of his class in mathematics — and is teaching his teacher new signs every week."),
			],
		},
		{
			slug: "demo-story-school-garden-nutrition",
			coverSeed: "kape-story-garden",
			publishedAt: "2026-05-14",
			title: { en: "The school garden that became a science classroom", km: "សួនច្បារសាលាដែលក្លាយជាថ្នាក់រៀនវិទ្យាសាស្ត្រ" },
			excerpt: { en: "In Kampong Cham, a vegetable plot is teaching biology, nutrition and teamwork — and feeding the school lunch.", km: "នៅកំពង់ចាម ចម្ការបន្លែកំពុងបង្រៀនជីវវិទ្យា និងអាហារូបត្ថម្ភ។" },
			body: [
				lead("What started as a few rows of morning-glory behind the school has become the most popular classroom on campus."),
				para("The school garden, supported by KAPE, doubles as a living science laboratory. Students measure plant growth, study soil and insects, and learn about nutrition — then harvest the vegetables for the school's lunch programme."),
				imageNode(pic("kape-story-garden-inline", 1200, 700), "Students tending a school vegetable garden"),
				h2("Lessons you can taste"),
				para("Biology stops being abstract when you have grown the plant yourself. Teachers use the garden to anchor lessons across subjects, from the maths of plot area to the chemistry of composting. Older students mentor younger ones in planting and harvest."),
				quote("They argue about photosynthesis now — because they have watched it happen with their own hands."),
				para("The garden has also nudged eating habits at home, with several families starting their own plots using seeds and know-how the children brought back."),
			],
		},
		{
			slug: "demo-story-bridge-to-school-stung-treng",
			coverSeed: "kape-story-bridge",
			publishedAt: "2026-05-06",
			title: { en: "A safe crossing turns a two-hour walk into twenty minutes", km: "ស្ពានដ៏មានសុវត្ថិភាពកាត់បន្ថយដំណើរ" },
			excerpt: { en: "In Stung Treng, a simple footbridge dramatically changed who could reach school — and how often.", km: "នៅស្ទឹងត្រែង ស្ពានថ្មើរជើងបានផ្លាស់ប្តូរយ៉ាងខ្លាំង។" },
			body: [
				lead("Every rainy season, the stream between Pchek village and its school swelled too high to cross. For months, dozens of children simply could not get to class."),
				para("As part of a community infrastructure initiative, KAPE worked with villagers to build a sturdy footbridge over the crossing. The build was led by local people, with the school's older students helping to carry materials."),
				h2("Attendance that follows the seasons no more"),
				para("Before the bridge, attendance in the village would collapse each wet season and never fully recover. This year, for the first time, enrolment held steady through the rains. A two-hour detour became a twenty-minute walk."),
				imageNode(pic("kape-story-bridge-inline", 1200, 700), "Children crossing a new footbridge to school"),
				quote("We did not just build a bridge. We built a promise that school will always be reachable."),
				para("The community now maintains the bridge themselves — a small structure with an outsized effect on the village's children."),
			],
		},
	];
	for (const it of items) await addPost({ contentType: "story", ...it });
}

async function seedVideos() {
	const vids = [
		{ slug: "demo-video-ngs-tour", yt: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: { en: "Inside a New Generation School: a student-led tour", km: "ខាងក្នុងសាលាជំនាន់ថ្មី៖ ដំណើរទស្សនកិច្ច" }, excerpt: { en: "Two grade-9 students show you their science lab, library and coding club.", km: "សិស្សថ្នាក់ទី៩ពីរនាក់បង្ហាញអ្នកពីបន្ទប់ពិសោធន៍។" } },
		{ slug: "demo-video-teacher-voices", yt: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: { en: "Teacher Voices: why I changed how I teach", km: "សំឡេងគ្រូ៖ ហេតុអ្វីខ្ញុំផ្លាស់ប្តូររបៀបបង្រៀន" }, excerpt: { en: "Three teachers reflect on moving from lecturing to active, hands-on learning.", km: "គ្រូបីនាក់ឆ្លុះបញ្ចាំងពីការផ្លាស់ប្តូរ។" } },
		{ slug: "demo-video-girls-stem", yt: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: { en: "Girls in STEM: building robots in Battambang", km: "ក្មេងស្រីក្នុង STEM៖ បង្កើតមនុស្សយន្តនៅបាត់ដំបង" }, excerpt: { en: "A robotics club is rewriting who gets to be an engineer.", km: "ក្លឹបមនុស្សយន្តកំពុងសរសេរឡើងវិញ។" } },
		{ slug: "demo-video-reading-revolution", yt: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: { en: "The Reading Revolution: early literacy in action", km: "បដិវត្តន៍ការអាន៖ អក្ខរកម្មដំបូង" }, excerpt: { en: "How structured, joyful reading instruction is transforming early grades.", km: "របៀបដែលការបង្រៀនអានកំពុងផ្លាស់ប្តូរថ្នាក់ដំបូង។" } },
		{ slug: "demo-video-community-built", yt: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: { en: "Built by the community: a school renovation story", km: "សាងសង់ដោយសហគមន៍៖ រឿងជួសជុលសាលា" }, excerpt: { en: "Villagers, students and KAPE rebuild a crumbling school together.", km: "អ្នកភូមិ សិស្ស និងខេបស្ថាបនាសាលាឡើងវិញ។" } },
		{ slug: "demo-video-graduation-2026", yt: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: { en: "Graduation 2026: where are they now?", km: "ពិធីបញ្ចប់ការសិក្សា ២០២៦៖ ពួកគេនៅឯណាឥឡូវនេះ?" }, excerpt: { en: "We follow up with five scholarship graduates a year after they finished.", km: "យើងតាមដានបណ្ឌិតអាហារូបករណ៍ប្រាំនាក់។" } },
	];
	for (let i = 0; i < vids.length; i++) {
		const v = vids[i];
		await addPost({ contentType: "video", slug: v.slug, coverSeed: `kape-video-${i + 1}`, publishedAt: "2026-06-01", meta: { youtube_url: v.yt }, title: v.title, excerpt: v.excerpt });
	}
}

async function seedAlbums() {
	const albums = [
		{ slug: "demo-album-first-day-2026", title: { en: "First Day of the 2026 School Year", km: "ថ្ងៃដំបូងនៃឆ្នាំសិក្សា ២០២៦" } },
		{ slug: "demo-album-science-fair", title: { en: "Provincial Science Fair", km: "ពិព័រណ៍វិទ្យាសាស្ត្រខេត្ត" } },
		{ slug: "demo-album-teacher-training", title: { en: "Teacher Training Institute", km: "វិទ្យាស្ថានបណ្តុះបណ្តាលគ្រូ" } },
		{ slug: "demo-album-sports-day", title: { en: "Inter-School Sports Day", km: "ថ្ងៃកីឡាអន្តរសាលា" } },
		{ slug: "demo-album-library-launch", title: { en: "Community Library Launches", km: "ការបើកបណ្ណាល័យសហគមន៍" } },
		{ slug: "demo-album-graduation", title: { en: "Scholarship Graduation Ceremony", km: "ពិធីបញ្ចប់ការសិក្សាអាហារូបករណ៍" } },
	];
	const caps = ["A moment from the day.", "Students take part with enthusiasm.", "Teachers and families look on.", "Hands-on learning in action.", "Celebrating together.", "Proud smiles all around.", "Hard work pays off.", "Community spirit on display."];
	for (let a = 0; a < albums.length; a++) {
		const n = 6 + (a % 3); // 6–8 photos
		const gallery = Array.from({ length: n }, (_, i) => ({ seed: `kape-album-${a + 1}-${i + 1}`, caption: caps[i % caps.length] }));
		await addPost({ contentType: "album", slug: albums[a].slug, coverSeed: `kape-album-${a + 1}-1`, publishedAt: "2026-05-25", title: albums[a].title, gallery });
	}
}

async function personSlugExists(slug: string): Promise<boolean> {
	const [r] = await db.select({ id: people.id }).from(people).where(and(eq(people.tenantId, TENANT), eq(people.slug, slug))).limit(1);
	return Boolean(r);
}

async function seedPeople() {
	const roster = [
		{ slug: "demo-person-chenda-director", section: "board", position: "Executive Director", name: { en: "Chenda Sok", km: "សុខ ច័ន្ទដា" }, bio: "Chenda has led KAPE's strategy for over a decade, with a focus on education quality and systemic partnership with government." },
		{ slug: "demo-person-rith-programs", section: "smt", position: "Director of Programs", name: { en: "Rith Vannak", km: "វណ្ណៈ រិទ្ធ" }, bio: "Rith oversees KAPE's portfolio of education programmes across 15 provinces, from early childhood to teacher training." },
		{ slug: "demo-person-maly-finance", section: "smt", position: "Director of Finance & Operations", name: { en: "Maly Chhorn", km: "ឆ្នោ ម៉ាលី" }, bio: "Maly ensures KAPE's resources reach the field efficiently and transparently, leading finance, HR and operations." },
		{ slug: "demo-person-sovann-ict", section: "pm", position: "ICT Innovation Manager", name: { en: "Sovann Pich", km: "ពេជ្រ សុវណ្ណ" }, bio: "Sovann leads KAPE's digital learning work, bringing coding, robotics and AI literacy into rural classrooms." },
		{ slug: "demo-person-dara-teacher-dev", section: "pm", position: "Teacher Development Manager", name: { en: "Dara Heng", km: "ហេង ដារ៉ា" }, bio: "Dara designs and delivers KAPE's hands-on teacher training, with a passion for active, student-centred methods." },
		{ slug: "demo-person-srey-inclusive", section: "team", position: "Inclusive Education Specialist", name: { en: "Srey Leak", km: "លក្ខ ស្រី" }, bio: "Srey Leak supports schools to welcome children with disabilities, championing classrooms where every child belongs." },
	];
	for (let i = 0; i < roster.length; i++) {
		const p = roster[i];
		if (await personSlugExists(p.slug)) {
			skipped++;
			continue;
		}
		const photoMediaId = await addMedia(`kape-person-${i + 1}`, 600, 600);
		const bio = richDoc([para(p.bio), para("Outside their role at KAPE, they remain a committed advocate for equitable, transformative education for every child in Cambodia.")]);
		const [row] = await db
			.insert(people)
			.values({ tenantId: TENANT, nameEn: p.name.en, nameKm: p.name.km, position: p.position, tier: p.section, isPublic: true, slug: p.slug, photoMediaId, sort: i })
			.returning({ id: people.id });
		await db.insert(translations).values({ tenantId: TENANT, entityType: "person", entityId: row.id, field: "bio", lang: "en", value: bio });
		created++;
	}
}

async function seedPublications() {
	const pubs = [
		{ slug: "demo-pub-annual-report-2025", category: "annual-report", year: "2025", title: { en: "KAPE Annual Report 2025", km: "របាយការណ៍ប្រចាំឆ្នាំ ខេប ២០២៥" }, summary: "A full account of KAPE's reach, results and finances across 15 provinces in 2025." },
		{ slug: "demo-pub-literacy-study", category: "research", year: "2025", title: { en: "Early-Grade Literacy in Rural Cambodia: A Study", km: "ការសិក្សាអក្ខរកម្មថ្នាក់ដំបូងនៅជនបទកម្ពុជា" }, summary: "Findings from a two-year study on what drives reading outcomes in early primary grades." },
		{ slug: "demo-pub-ngs-brochure", category: "brochure", year: "2026", title: { en: "New Generation Schools: Programme Overview", km: "សាលាជំនាន់ថ្មី៖ ទិដ្ឋភាពកម្មវិធី" }, summary: "An introduction to the New Generation School model, its design principles and outcomes." },
		{ slug: "demo-pub-ict-toolkit", category: "brochure", year: "2026", title: { en: "Low-Cost ICT in the Classroom: A Toolkit", km: "ICT តម្លៃទាបក្នុងថ្នាក់រៀន៖ ឧបករណ៍" }, summary: "Practical guidance for teachers bringing digital learning to schools with limited resources." },
		{ slug: "demo-pub-inclusive-guide", category: "research", year: "2024", title: { en: "Inclusive Education: A Practitioner's Guide", km: "ការអប់រំរួមបញ្ចូល៖ មគ្គុទេសក៍" }, summary: "A field guide for teachers and school leaders building inclusive classrooms." },
		{ slug: "demo-pub-newsletter-q2", category: "annual-report", year: "2026", title: { en: "KAPE Newsletter — Q2 2026", km: "ព្រឹត្តិបត្រ ខេប — ត្រីមាសទី២ ២០២៦" }, summary: "Highlights, stories and upcoming events from across KAPE's programmes this quarter." },
	];
	for (let i = 0; i < pubs.length; i++) {
		const p = pubs[i];
		await addPost({
			contentType: "publication",
			slug: p.slug,
			coverSeed: `kape-pub-${i + 1}`,
			publishedAt: `${p.year}-12-15`,
			meta: { category: p.category, year: p.year, fileUrl: `https://www.kapekh.org/demo/${p.slug}.pdf`, downloadCount: 0 },
			title: p.title,
			excerpt: { en: p.summary },
			body: [para(p.summary), para("This publication is available to download as a PDF. For printed copies or further information, please contact the KAPE communications team.")],
		});
	}
}

async function seedJobs() {
	const jobs = [
		{ slug: "demo-job-education-officer", location: "Kampong Cham", title: { en: "Education Programme Officer", km: "មន្ត្រីកម្មវិធីអប់រំ" } },
		{ slug: "demo-job-ict-trainer", location: "Battambang", title: { en: "ICT Training Facilitator", km: "អ្នកសម្របសម្រួលបណ្តុះបណ្តាល ICT" } },
		{ slug: "demo-job-me-specialist", location: "Phnom Penh", title: { en: "Monitoring & Evaluation Specialist", km: "អ្នកជំនាញត្រួតពិនិត្យ និងវាយតម្លៃ" } },
		{ slug: "demo-job-field-coordinator", location: "Kratie", title: { en: "Field Coordinator", km: "អ្នកសម្របសម្រួលមូលដ្ឋាន" } },
		{ slug: "demo-job-comms-officer", location: "Phnom Penh", title: { en: "Communications Officer", km: "មន្ត្រីទំនាក់ទំនង" } },
		{ slug: "demo-job-finance-assistant", location: "Kampong Cham", title: { en: "Finance Assistant", km: "ជំនួយការហិរញ្ញវត្ថុ" } },
	];
	for (let i = 0; i < jobs.length; i++) {
		const j = jobs[i];
		await addPost({
			contentType: "job",
			slug: j.slug,
			coverSeed: `kape-job-${i + 1}`,
			deadline: "2026-12-31",
			meta: { location: j.location, deadline: "2026-12-31" },
			title: j.title,
			excerpt: { en: `Based in ${j.location}. Join KAPE to help deliver quality education across Cambodia.` },
			body: [
				lead(`KAPE is seeking a committed ${j.title.en} based in ${j.location} to join our team.`),
				h2("About the role"),
				para("You will work closely with schools, communities and government partners to deliver high-quality education programmes and ensure measurable impact for children and youth."),
				h2("Key responsibilities"),
				bullets(["Plan, coordinate and monitor programme activities in the field", "Build strong relationships with schools, teachers and local authorities", "Collect data and report on progress against agreed targets", "Support training, mentoring and community engagement"]),
				h2("Requirements"),
				bullets(["A bachelor's degree in a relevant field", "Two or more years of relevant experience", "Strong communication skills in Khmer and English", "Willingness to travel to programme sites"]),
				h2("How to apply"),
				para("Please send a CV and cover letter to jobs@kapekh.org with the position title in the subject line. Applications are reviewed on a rolling basis until the deadline."),
			],
		});
	}
}

async function seedEvents() {
	const events = [
		{ slug: "demo-event-education-forum", program: "Policy", start: "2026-07-15", end: "2026-07-16", title: { en: "National Education Innovation Forum", km: "វេទិកាជាតិស្តីពីការច្នៃប្រឌិតការអប់រំ" } },
		{ slug: "demo-event-stem-festival", program: "STEM", start: "2026-08-09", end: "2026-08-09", title: { en: "Provincial STEM Festival", km: "មហោស្រព STEM ខេត្ត" } },
		{ slug: "demo-event-teacher-conference", program: "Teaching", start: "2026-09-05", end: "2026-09-06", title: { en: "Annual Teacher Conference", km: "សន្និសីទគ្រូប្រចាំឆ្នាំ" } },
		{ slug: "demo-event-reading-week", program: "Literacy", start: "2026-10-01", end: "2026-10-07", title: { en: "National Reading Week", km: "សប្តាហ៍អានជាតិ" } },
		{ slug: "demo-event-girls-summit", program: "Equity", start: "2026-11-12", end: "2026-11-12", title: { en: "Girls in Education Summit", km: "កិច្ចប្រជុំកំពូលក្មេងស្រីក្នុងការអប់រំ" } },
		{ slug: "demo-event-donor-roundtable", program: "Partnership", start: "2026-12-03", end: "2026-12-03", title: { en: "Education Partners Roundtable", km: "តុមូលដៃគូអប់រំ" } },
	];
	for (let i = 0; i < events.length; i++) {
		const e = events[i];
		await addPost({
			contentType: "event",
			slug: e.slug,
			coverSeed: `kape-event-${i + 1}`,
			publishedAt: e.start,
			meta: { program: e.program, start: e.start, end: e.end },
			title: e.title,
			excerpt: { en: `${e.start} · ${e.program} programme. Join educators, partners and students from across Cambodia.` },
			body: [
				lead("Bringing together educators, partners, students and government to share ideas and shape the future of education in Cambodia."),
				para("The event features keynote talks, hands-on workshops and exhibitions showcasing work from across KAPE's programmes. Participation is open to partner organisations, schools and members of the public."),
				h2("Details"),
				bullets([`Dates: ${e.start}${e.end !== e.start ? ` – ${e.end}` : ""}`, `Programme area: ${e.program}`, "Registration is free but places are limited"]),
				para("To register or request more information, contact the KAPE events team at events@kapekh.org."),
			],
		});
	}
}

async function seedAnnouncements() {
	const anns = [
		{ slug: "demo-ann-scholarship-applications", deadline: "2026-08-31", link: "/careers", title: { en: "2026 Scholarship Applications Now Open", km: "ការដាក់ពាក្យអាហារូបករណ៍ ២០២៦ បើកហើយ" }, excerpt: { en: "Lower-secondary students in target provinces can now apply for a full KAPE scholarship.", km: "សិស្សមធ្យមសិក្សាបឋមភូមិអាចដាក់ពាក្យបាន។" } },
		{ slug: "demo-ann-teacher-institute-registration", deadline: "2026-07-20", link: "/events", title: { en: "Register for the August Teacher Institute", km: "ចុះឈ្មោះសម្រាប់វិទ្យាស្ថានគ្រូខែសីហា" }, excerpt: { en: "Limited places remain for the hands-on STEM teaching institute in Battambang.", km: "កន្លែងនៅសល់មានកំណត់សម្រាប់វិទ្យាស្ថាន STEM។" } },
		{ slug: "demo-ann-library-volunteers", deadline: "2026-09-15", link: "/contact", title: { en: "Call for Community Library Volunteers", km: "ការអំពាវនាវរកអ្នកស្ម័គ្រចិត្តបណ្ណាល័យ" }, excerpt: { en: "Help run weekend reading clubs in your community.", km: "ជួយដំណើរការក្លឹបអានចុងសប្តាហ៍។" } },
		{ slug: "demo-ann-procurement-notice", deadline: "2026-07-10", link: "/contact", title: { en: "Procurement Notice: School Furniture Supply", km: "សេចក្តីជូនដំណឹងលទ្ធកម្ម៖ ការផ្គត់ផ្គង់គ្រឿងសង្ហារិម" }, excerpt: { en: "Qualified suppliers are invited to submit bids for school furniture.", km: "អ្នកផ្គត់ផ្គង់មានលក្ខណៈសម្បត្តិត្រូវបានអញ្ជើញដាក់ពាក្យ។" } },
		{ slug: "demo-ann-newsletter-signup", deadline: null, link: "/contact", title: { en: "Subscribe to the KAPE Newsletter", km: "ជាវព្រឹត្តិបត្រ ខេប" }, excerpt: { en: "Get stories, results and opportunities delivered to your inbox each quarter.", km: "ទទួលរឿងរ៉ាវ និងឱកាសរៀងរាល់ត្រីមាស។" } },
		{ slug: "demo-ann-office-relocation", deadline: null, link: "/contact", title: { en: "Notice: Provincial Office Relocation", km: "សេចក្តីជូនដំណឹង៖ ការផ្លាស់ប្តូរការិយាល័យខេត្ត" }, excerpt: { en: "Our Kampong Cham office has moved to a new address on National Road 7.", km: "ការិយាល័យកំពង់ចាមបានផ្លាស់ទៅអាសយដ្ឋានថ្មី។" } },
	];
	for (let i = 0; i < anns.length; i++) {
		const a = anns[i];
		await addPost({
			contentType: "announcement",
			slug: a.slug,
			coverSeed: `kape-ann-${i + 1}`,
			publishedAt: "2026-06-20",
			deadline: a.deadline,
			meta: { deadline: a.deadline, link: a.link },
			title: a.title,
			excerpt: a.excerpt,
			body: [para(a.excerpt.en), para("For full details and to take the next step, please use the link provided or contact the KAPE team directly.")],
		});
	}
}

async function seedDocuments() {
	const docs = [
		{ slug: "demo-doc-child-protection-policy", category: "policy", title: { en: "Child Protection Policy", km: "គោលនយោបាយការពារកុមារ" } },
		{ slug: "demo-doc-code-of-conduct", category: "policy", title: { en: "Staff Code of Conduct", km: "ក្រមសីលធម៌បុគ្គលិក" } },
		{ slug: "demo-doc-procurement-guidelines", category: "guideline", title: { en: "Procurement Guidelines", km: "គោលការណ៍ណែនាំលទ្ធកម្ម" } },
		{ slug: "demo-doc-field-safety", category: "guideline", title: { en: "Field Safety & Travel Guidelines", km: "គោលការណ៍សុវត្ថិភាព និងការធ្វើដំណើរ" } },
		{ slug: "demo-doc-monitoring-framework", category: "guideline", title: { en: "Monitoring & Evaluation Framework", km: "ក្របខ័ណ្ឌត្រួតពិនិត្យ និងវាយតម្លៃ" } },
		{ slug: "demo-doc-grievance-procedure", category: "policy", title: { en: "Grievance & Feedback Procedure", km: "នីតិវិធីបណ្តឹង និងមតិយោបល់" } },
	];
	for (let i = 0; i < docs.length; i++) {
		const d = docs[i];
		await addPost({
			contentType: "document",
			slug: d.slug,
			coverSeed: `kape-doc-${i + 1}`,
			publishedAt: "2026-01-15",
			meta: { category: d.category, fileUrl: `https://www.kapekh.org/demo/${d.slug}.pdf` },
			title: d.title,
			excerpt: { en: `Official KAPE ${d.category} document. Available to download as a PDF.` },
			body: [para("This document sets out KAPE's official position and procedures. Staff and partners are expected to read and comply with it. The current version is available to download as a PDF.")],
		});
	}
}

async function seedInternalNews() {
	const items = [
		{ slug: "demo-internal-all-staff-retreat", title: { en: "Save the Date: All-Staff Annual Retreat", km: "កក់ថ្ងៃ៖ ការជួបជុំបុគ្គលិកប្រចាំឆ្នាំ" }, excerpt: { en: "This year's retreat will be held in Sihanoukville in December.", km: "ការជួបជុំឆ្នាំនេះនឹងធ្វើនៅក្រុងព្រះសីហនុ។" } },
		{ slug: "demo-internal-hr-policy-update", title: { en: "HR Policy Update: New Leave Procedures", km: "បច្ចុប្បន្នភាពគោលនយោបាយ HR" }, excerpt: { en: "Please review the updated leave request process effective next month.", km: "សូមពិនិត្យដំណើរការសុំច្បាប់ថ្មី។" } },
		{ slug: "demo-internal-it-systems-maintenance", title: { en: "IT Notice: Systems Maintenance This Weekend", km: "សេចក្តីជូនដំណឹង IT៖ ការថែទាំប្រព័ន្ធ" }, excerpt: { en: "Email and shared drives will be briefly unavailable on Saturday night.", km: "អ៊ីមែល និងថាសរួមនឹងមិនអាចប្រើបានបណ្តោះអាសន្ន។" } },
		{ slug: "demo-internal-welcome-new-staff", title: { en: "Welcome to Our Newest Team Members", km: "ស្វាគមន៍សមាជិកក្រុមថ្មី" }, excerpt: { en: "Say hello to the eight colleagues who joined KAPE this quarter.", km: "ស្វាគមន៍មិត្តរួមការងារថ្មីៗ។" } },
		{ slug: "demo-internal-q2-results", title: { en: "Q2 Programme Results at a Glance", km: "លទ្ធផលកម្មវិធីត្រីមាសទី២" }, excerpt: { en: "A quick internal summary of what we achieved together this quarter.", km: "សេចក្តីសង្ខេបនៃអ្វីដែលយើងសម្រេចបាន។" } },
		{ slug: "demo-internal-vehicle-booking", title: { en: "Reminder: New Vehicle Booking System", km: "រំលឹក៖ ប្រព័ន្ធកក់យានយន្តថ្មី" }, excerpt: { en: "All field travel must now be booked through the online calendar.", km: "ការធ្វើដំណើរទាំងអស់ត្រូវកក់តាមប្រតិទិនអនឡាញ។" } },
	];
	for (let i = 0; i < items.length; i++) {
		const n = items[i];
		await addPost({
			contentType: "internal_news",
			slug: n.slug,
			coverSeed: `kape-internal-${i + 1}`,
			publishedAt: "2026-06-10",
			title: n.title,
			excerpt: n.excerpt,
			body: [para(n.excerpt.en), para("Please direct any questions to your line manager or the relevant department. Thank you for your continued dedication to KAPE's mission.")],
		});
	}
}

async function main() {
	await seedNews();
	await seedStories();
	await seedVideos();
	await seedAlbums();
	await seedPeople();
	await seedPublications();
	await seedJobs();
	await seedEvents();
	await seedAnnouncements();
	await seedDocuments();
	await seedInternalNews();

	// New content must invalidate any cached resolved routes.
	await db.delete(renderCache);

	console.log(`\nDemo content seeded: ${created} created, ${skipped} skipped (already existed). Render cache cleared.`);
}

main().then(() => process.exit(0));
