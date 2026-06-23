/**
 * Build out the "Who We Are" pages to match the PowerPoint requirements:
 *   About KAPE, Fact Sheet, Vision/Mission & Core Values, Executive Director's
 *   Speech, Leadership Team & Org Chart (the /team page), and Our Partners.
 *
 * Replaces each page's `sections` with a rich, multi-section layout and enriches
 * the supporting data (partners by category, project-location map pins).
 * Idempotent-ish: partners/locations are insert-only; page sections are set
 * outright (re-running just rewrites them). Run: bun scripts/seed-who-we-are.ts
 */
import { and, eq } from "drizzle-orm";

import type { SectionNode } from "../src/lib/sections";
import { db } from "../src/server/db";
import { orgNodes, pages, partners, people, projectLocations, renderCache } from "../src/server/schema";

const TENANT = 1;
const pic = (seed: string, w = 1600, h = 900) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

/* ----- Tiptap rich-text body builders (-> JSON string for props.body) ----- */
type Node = Record<string, unknown>;
const para = (text: string): Node => ({ type: "paragraph", content: [{ type: "text", text }] });
const lead = (text: string): Node => ({ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "bold" }] }] });
const h2 = (text: string): Node => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const h3 = (text: string): Node => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] });
const bullets = (items: string[]): Node => ({ type: "bulletList", content: items.map((t) => ({ type: "listItem", content: [para(t)] })) });
const richDoc = (blocks: Node[]) => JSON.stringify({ type: "doc", content: blocks });

type Section = { id: string; type: string; layout?: string; props?: Record<string, unknown>; query?: Record<string, unknown> };

async function setSections(slug: string, sections: Section[]) {
	const res = await db.update(pages).set({ sections: sections as unknown as SectionNode[], updatedAt: new Date().toISOString() }).where(and(eq(pages.tenantId, TENANT), eq(pages.slug, slug)));
	console.log(`  set sections for /${slug} (${sections.length} sections)`);
	return res;
}

/* ----------------------------- supporting data ----------------------------- */

async function seedPartners() {
	const list: { name: string; category: string; url: string }[] = [
		{ name: "Ministry of Education, Youth and Sport (MoEYS)", category: "royal-government", url: "https://moeys.gov.kh" },
		{ name: "Ministry of Interior", category: "royal-government", url: "#" },
		{ name: "European Union", category: "international-organizations", url: "https://european-union.europa.eu" },
		{ name: "UNICEF Cambodia", category: "international-organizations", url: "https://unicef.org/cambodia" },
		{ name: "UNESCO", category: "international-organizations", url: "https://unesco.org" },
		{ name: "World Bank", category: "international-organizations", url: "https://worldbank.org" },
		{ name: "GIZ", category: "international-organizations", url: "https://giz.de" },
		{ name: "BMZ (German Federal Ministry)", category: "foundation", url: "https://bmz.de" },
		{ name: "The Asia Foundation", category: "foundation", url: "https://asiafoundation.org" },
		{ name: "Room to Read", category: "foundation", url: "https://roomtoread.org" },
		{ name: "Open Society Foundations", category: "foundation", url: "https://opensocietyfoundations.org" },
		{ name: "New Generation Pedagogical Research Center", category: "implemented-partners", url: "#" },
		{ name: "Provincial Offices of Education", category: "implemented-partners", url: "#" },
		{ name: "Teacher Education Colleges", category: "implemented-partners", url: "#" },
		{ name: "NGO Education Partnership (NEP)", category: "local-organizations", url: "#" },
		{ name: "Cambodian Children's Fund", category: "local-organizations", url: "https://cambodianchildrensfund.org" },
		{ name: "Kampuchean Action for Primary Education", category: "local-organizations", url: "#" },
		{ name: "Thun Thean Obrom (TTO Import Export Co., Ltd)", category: "private", url: "#" },
		{ name: "Smart Axiata", category: "private", url: "https://smart.com.kh" },
		{ name: "ABA Bank", category: "private", url: "https://ababank.com" },
	];
	let added = 0;
	for (let i = 0; i < list.length; i++) {
		const p = list[i];
		const [exists] = await db.select({ id: partners.id }).from(partners).where(and(eq(partners.tenantId, TENANT), eq(partners.name, p.name))).limit(1);
		if (exists) continue;
		await db.insert(partners).values({ tenantId: TENANT, name: p.name, category: p.category, url: p.url, sort: i });
		added++;
	}
	console.log(`  partners: ${added} added`);
}

async function seedLocations() {
	const pins: { school: string; lat: number; lng: number }[] = [
		{ school: "NGS Hun Sen Kampong Cham High School", lat: 11.992, lng: 105.464 },
		{ school: "Preah Sihanouk Primary School, Battambang", lat: 13.095, lng: 103.203 },
		{ school: "NGS Angkor High School, Siem Reap", lat: 13.362, lng: 103.86 },
		{ school: "Rompok Primary School, Kratie", lat: 12.488, lng: 106.019 },
		{ school: "Peam Ro Community Library, Prey Veng", lat: 11.483, lng: 105.491 },
		{ school: "Daun Keo Primary School, Takeo", lat: 10.99, lng: 104.784 },
		{ school: "Pursat Provincial Teacher College", lat: 12.533, lng: 103.918 },
		{ school: "Sen Monorom Lower-Secondary, Mondulkiri", lat: 12.453, lng: 107.187 },
		{ school: "Stueng Primary School, Kampong Thom", lat: 12.711, lng: 104.889 },
		{ school: "KAPE Head Office, Phnom Penh", lat: 11.562, lng: 104.888 },
	];
	let added = 0;
	for (let i = 0; i < pins.length; i++) {
		const p = pins[i];
		const [exists] = await db.select({ id: projectLocations.id }).from(projectLocations).where(and(eq(projectLocations.tenantId, TENANT), eq(projectLocations.schoolName, p.school))).limit(1);
		if (exists) continue;
		await db.insert(projectLocations).values({ tenantId: TENANT, schoolName: p.school, lat: String(p.lat), lng: String(p.lng), sort: i });
		added++;
	}
	console.log(`  project locations: ${added} added`);
}

async function seedOrgChart() {
	const [exists] = await db.select({ id: orgNodes.id }).from(orgNodes).where(eq(orgNodes.tenantId, TENANT)).limit(1);
	if (exists) {
		console.log("  org chart: already populated, skipping");
		return;
	}
	const personId = async (slug: string): Promise<number | null> => {
		const [p] = await db.select({ id: people.id }).from(people).where(and(eq(people.tenantId, TENANT), eq(people.slug, slug))).limit(1);
		return p?.id ?? null;
	};
	const add = async (parentId: number | null, name: string, title: string, slug: string | null, sort: number): Promise<number> => {
		const pid = slug ? await personId(slug) : null;
		const [row] = await db.insert(orgNodes).values({ tenantId: TENANT, parentId, name, title, personId: pid, sort }).returning({ id: orgNodes.id });
		return row.id;
	};
	const chair = await add(null, "Mr. Heang Koy", "Chairman of the Board of Directors", "person-heang-koy", 0);
	const ed = await add(chair, "Executive Director", "Executive Director", "demo-person-chenda-director", 0);
	const programs = await add(ed, "Director of Programs", "Director of Programs", "demo-person-rith-programs", 0);
	await add(ed, "Director of Finance & Operations", "Director of Finance & Operations", "demo-person-maly-finance", 1);
	await add(programs, "ICT Innovation Manager", "ICT Innovation Manager", "demo-person-sovann-ict", 0);
	await add(programs, "Teacher Development Manager", "Teacher Development Manager", "demo-person-dara-teacher-dev", 1);
	await add(programs, "Inclusive Education Specialist", "Inclusive Education Specialist", "demo-person-srey-inclusive", 2);
	console.log("  org chart: seeded default hierarchy (7 nodes)");
}

/* --------------------------------- pages ---------------------------------- */

async function buildAbout() {
	await setSections("who-we-are/about", [
		{ id: "hero", type: "hero", layout: "banner", props: { eyebrow: "Who We Are", title: "About *KAPE*", lead: "Cambodia's largest and longest-serving local education NGO — a laboratory of innovation for the national education system.", image: pic("kape-about-hero") } },
		{
			id: "history",
			type: "richtext",
			props: {
				body: richDoc([
					lead("Kampuchea Action to Promote Education (KAPE) is the largest local NGO in Cambodia's education sector, working across more than 15 provinces from preschools to a Master's programme in Mentoring."),
					h2("Our Journey: From Humble Beginnings to Lasting Impact"),
					para("Our roots trace back to 1996, when we first started as a project known as CAPE (Cambodian Assistance to Primary Education). Those early years were defined by a critical need to rebuild educational foundations. By 1999, recognising the need for a localised, sustainable approach to educational development, we officially localised to become KAPE — an independent Cambodian non-governmental organisation."),
					h2("2011 – 2019: Scaling up and Systemic Reform"),
					para("As KAPE built a reputation for transparency and rigorous research, its relationship with MoEYS deepened. Between 2011 and 2015, KAPE piloted the “Beacon Schools Initiative,” which eventually evolved into the national New Generation Schools (NGS) framework. This marked a massive shift in Cambodian educational history: for the first time, the Ministry of Education took the unprecedented step of providing state funding to a non-state actor to scale up an educational model nationwide."),
					para("To reflect its expanding footprint — which now stretched far beyond primary education into high schools, university scholarships, and teacher-training institutes — the organisation reached a milestone in 2019, when the Ministry of Interior approved an official name change to Kampuchea Action to Promote Education, retaining its widely trusted acronym, KAPE."),
					h2("KAPE Today"),
					para("Entering its third decade of operation, KAPE manages dozens of concurrent projects backed by international bilateral donors like the European Union, as well as private global foundations. Directly benefiting tens of thousands of students and thousands of educators across more than a dozen provinces, KAPE continues to serve as the blueprint for educational evolution in Cambodia."),
				]),
			},
		},
		{ id: "stats", type: "stats", layout: "band", props: { eyebrow: "Our reach", title: "Three decades.\n*Countless beginnings.*", image: pic("kape-about-stats", 1600, 1000), items: [{ value: "1999", label: "Founded" }, { value: "15+", label: "Provinces" }, { value: "385+", label: "Schools served" }, { value: "160K+", label: "Children reached" }, { value: "20+", label: "Active projects" }] } },
		{ id: "map", type: "map", layout: "default", query: { source: "locations" }, props: { eyebrow: "Where we work", title: "KAPE across *Cambodia*" } },
		{ id: "cta", type: "cta", props: { eyebrow: "Get involved", title: "Be part of the *next chapter*", body: "Partner with us, support a child's education, or join our team.", ctaHref: "/opportunities/partner", ctaLabel: "Partner with KAPE", cta2Href: "/contact", cta2Label: "Contact us" } },
	]);
}

async function buildFactSheet() {
	await setSections("who-we-are/fact-sheet", [
		{ id: "hero", type: "hero", layout: "banner", props: { eyebrow: "Who We Are", title: "Fact *Sheet*", lead: "A snapshot of who KAPE is, what we do, and why we are a trusted partner in education reform.", image: pic("kape-fact-hero") } },
		{
			id: "overview",
			type: "richtext",
			props: {
				body: richDoc([
					para("Kampuchea Action to Promote Education (KAPE) is Cambodia's largest and longest-serving local non-governmental organisation specialising in the education sector. Established in 1999, KAPE works closely with the Ministry of Education, Youth and Sport (MoEYS), international donors, and local communities to drive systemic education reform and improve learning outcomes across the country."),
					h2("Organisational Overview"),
					bullets([
						"Founded: 1999",
						"Headquarters: Kampong Cham Town, Cambodia",
						"Primary focus: Access, quality, and equity in education",
						"Core approach: Systemic partnerships with MoEYS, innovation, and evidence-based interventions",
					]),
				]),
			},
		},
		{
			id: "expertise",
			type: "cards",
			layout: "cols-3",
			props: {
				eyebrow: "What we do",
				title: "Areas of Expertise & *Specialisation*",
				items: [
					{ title: "New Generation Schools & Charter Development", body: "Leading the implementation of Cambodia's premier public charter school model to modernise secondary education." },
					{ title: "Digital Education & Educational Technology", body: "Pioneer in introducing ICT tools, software, and AI educational integration to classrooms." },
					{ title: "Early Grade Reading", body: "Developing specialised curricula, teacher-training modules, and teaching-learning materials to solidify primary literacy." },
					{ title: "STEM Advancement", body: "Vocational scholarships, infrastructure support for science labs, and promoting science, technology, engineering and maths pathways." },
					{ title: "Inclusive Education & Community Engagement", body: "Ensuring marginalised children, low-income families and vulnerable youth have equitable access to safe learning spaces." },
				],
			},
		},
		{
			id: "strengths",
			type: "cards",
			layout: "cols-3",
			props: {
				eyebrow: "A trusted partner in education reform",
				title: "Key Success Factors & *Strengths*",
				tone: "muted",
				items: [
					{ title: "Sustained Government Collaboration", body: "Rather than working outside the public framework, KAPE designs programmes meant to explicitly align with and influence national education policy." },
					{ title: "Commitment to Accountability", body: "Strong institutional governance and transparency make KAPE a trusted partner for major international donor agencies." },
					{ title: "Empowerment of Local Leadership", body: "Deep focus on strengthening school-system governance, teacher capacity, and school-director leadership for long-term sustainability." },
				],
			},
		},
	]);
}

async function buildVisionMission() {
	await setSections("who-we-are/vision-mission", [
		{ id: "hero", type: "hero", layout: "banner", props: { eyebrow: "Who We Are", title: "Vision, Mission & *Core Values*", lead: "The beliefs that guide every project, classroom and partnership.", image: pic("kape-vision-hero") } },
		{ id: "vision", type: "split", layout: "media-right", props: { eyebrow: "Our Vision", title: "A *good education* for every child", image: pic("kape-vision-a", 1200, 900), body: richDoc([para("Our vision is for children and youth to be able to make the best life choices possible that match their potential as a result of a good education.")]) } },
		{ id: "mission", type: "split", layout: "media-left", props: { eyebrow: "Our Mission", title: "Empowering the *most vulnerable*", tone: "muted", image: pic("kape-vision-b", 1200, 900), body: richDoc([para("To work with government, community and other stakeholders, to empower vulnerable children and youth to achieve their own right to a quality education through innovative approaches.")]) } },
		{
			id: "values",
			type: "cards",
			layout: "cols-4",
			props: {
				eyebrow: "What we stand for",
				title: "Our *Core Values*",
				center: true,
				items: [
					{ title: "Empowerment", body: "Enabling people to take charge of their own learning and futures." },
					{ title: "Solidarity", body: "Standing together with communities and partners." },
					{ title: "Compassion", body: "Putting the well-being of children at the centre of our work." },
					{ title: "Respect", body: "Honouring the dignity, culture and voice of every person." },
					{ title: "Cooperation", body: "Achieving more by working hand-in-hand with others." },
					{ title: "Innovation", body: "Pioneering new models and technologies for learning." },
					{ title: "Transparency", body: "Operating openly and accountably at every level." },
					{ title: "Truth", body: "Letting evidence and integrity guide our decisions." },
				],
			},
		},
	]);
}

async function buildDirectorSpeech() {
	await setSections("who-we-are/director-speech", [
		{ id: "hero", type: "hero", layout: "banner", props: { eyebrow: "Who We Are", title: "Welcome Message from the *Executive Director*", image: pic("kape-director-hero") } },
		{
			id: "speech",
			type: "richtext",
			props: {
				body: richDoc([
					lead("Warm Greetings to Our Partners, Educators, and Visitors,"),
					para("Welcome to the official digital home of Kampuchea Action to Promote Education (KAPE). Whether you are a long-time partner, a teacher on the ground, a donor, or a visitor curious about our mission, we are thrilled to connect with you through this platform. This website is more than just a digital portal; it is a reflection of our journey, our transparency, and our enduring commitment to the children and youth of Cambodia."),
					h2("Our Journey: From Humble Beginnings to Lasting Impact"),
					para("To truly understand KAPE's mission today, we must look back to where it all began. Our roots trace back to 1996, when we first started as a project known as CAPE (Cambodian Assistance to Primary Education). By 1999, recognising the need for a localised, sustainable approach to educational development, we officially localised to become KAPE, an independent Cambodian non-governmental organisation."),
					para("From those foundational years up to the present day, Cambodia's educational landscape has transformed tremendously — and KAPE has been there every step of the way. What began as a localised effort in a few primary schools has evolved into the largest local NGO in Cambodia's education sector."),
					h2("Partnering with MoEYS for National Progress"),
					para("KAPE's success has never been achieved in isolation. Our core strategy has always been to work hand-in-hand with the Ministry of Education, Youth and Sport (MoEYS). Over the decades, KAPE has designed, piloted, and implemented a vast array of innovative educational projects specifically structured to help MoEYS develop and modernise the national education system. From pioneering Child-Friendly School models to creating cutting-edge New Generation Schools, our projects have consistently served as incubators for educational innovation."),
					para("We have worked tirelessly to:"),
					bullets([
						"Enhance Access & Equity: ensuring that children from vulnerable, rural and marginalised backgrounds have the right to a quality education.",
						"Empower Teachers: providing rigorous professional development, digital-literacy coaching, and modern pedagogical tools to Cambodian educators.",
						"Drive Digital & Technical Innovation: integrating STEM, ICT and modern technologies into classrooms to prepare Cambodian youth for the challenges of the 21st century.",
					]),
					para("By aligning our projects directly with MoEYS's strategic plans, we ensure that our interventions are not just temporary fixes, but sustainable methodologies that can be integrated into national policy. Thank you for being part of this journey."),
				]),
			},
		},
	]);
}

async function buildLeadership() {
	await setSections("team", [
		{ id: "orgchart", type: "orgChart", query: { source: "orgchart" }, props: { eyebrow: "Our structure", title: "Organisational *Chart*" } },
	]);
}

async function buildPartners() {
	await setSections("who-we-are/partners", [
		{ id: "hero", type: "hero", layout: "banner", props: { eyebrow: "Who We Are", title: "Our *Partners*", lead: "KAPE collaborates with governments, foundations and grassroots organisations to deliver lasting impact.", image: pic("kape-partners-hero") } },
		{
			id: "intro",
			type: "richtext",
			props: {
				body: richDoc([
					h2("A Partnership for Educational Excellence: MoEYS and KAPE"),
					para("The partnership between the Ministry of Education, Youth and Sport (MoEYS) and KAPE represents one of the most dynamic and impactful collaborations in Cambodia's education sector. As the largest local education NGO in the country, KAPE works hand-in-hand with MoEYS to design, implement and scale innovative educational reforms aimed at modernising schools and improving learning outcomes — built on a shared vision of equitable, high-quality education that prepares Cambodian youth for the demands of the 21st century."),
					h3("Strategic Partnership with Thun Thean Obrom (TTO)"),
					para("TTO functions as the dedicated publishing, staffing and educational-materials arm of KAPE. While KAPE operates at a high strategic level — securing funding, managing large-scale projects, and collaborating with MoEYS — TTO serves as the logistical and creative engine that produces the physical and digital tools that make those projects successful. In short, KAPE designs the educational frameworks and manages the schools, while TTO designs and delivers the resources."),
				]),
			},
		},
		{ id: "logos", type: "partners", layout: "groups", query: { source: "partners" }, props: { eyebrow: "Our Partners & Donors", title: "Working *together* for education" } },
	]);
}

async function main() {
	console.log("Enriching supporting data…");
	await seedPartners();
	await seedLocations();
	await seedOrgChart();
	console.log("Building Who We Are pages…");
	await buildAbout();
	await buildFactSheet();
	await buildVisionMission();
	await buildDirectorSpeech();
	await buildLeadership();
	await buildPartners();
	await db.delete(renderCache);
	console.log("\nDone. Who We Are pages rebuilt and render cache cleared.");
}

main().then(() => process.exit(0));
