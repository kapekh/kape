/**
 * Coverage fixture for the NOANY typing job. The seeded KAPE database renders 16
 * of the 21 section templates; this adds a page per template and per layout the
 * fixture never reaches (pills, siteMap, projectList, directory, orgChart and the
 * unused layout variants), plus the org and staff rows those sources read.
 *
 * Throwaway database only. Run once, before the before/after HTML capture.
 */
import { eq, sql } from "drizzle-orm";

import type { SectionNode } from "#/lib/sections";
import { db } from "#/server/db";
import { normalizeTree, upsertPage } from "#/server/page-tree";
import { orgNodes, people, staff } from "#/server/schema";

const TENANT = 1;

async function seedOrg() {
	const [{ n }] = await db
		.select({ n: sql<number>`count(*)` })
		.from(orgNodes)
		.where(eq(orgNodes.tenantId, TENANT));
	if (n > 0) return;
	const persons = await db.select().from(people).limit(5);
	const [root] = await db
		.insert(orgNodes)
		.values({
			tenantId: TENANT,
			name: "Executive Director",
			title: "Executive Director",
			personId: persons[0]?.id ?? null,
			sort: 0,
		})
		.returning({ id: orgNodes.id });
	for (const [i, p] of persons.slice(1, 4).entries()) {
		await db.insert(orgNodes).values({
			tenantId: TENANT,
			parentId: root.id,
			name: `Deputy ${i + 1}`,
			title: "Deputy Director",
			personId: p.id,
			sort: i,
		});
	}
}

async function seedStaff() {
	const [{ n }] = await db
		.select({ n: sql<number>`count(*)` })
		.from(staff)
		.where(eq(staff.tenantId, TENANT));
	if (n > 0) return;
	const rows = [
		{ staffNo: "K-001", nameEn: "Sok Dara", program: "NGS" },
		{ staffNo: "K-002", nameEn: "Chan Mony", program: "HCC" },
		{ staffNo: "K-003", nameEn: "Prum Vichea", program: "ESCUP" },
	];
	for (const [i, r] of rows.entries())
		await db.insert(staff).values({ tenantId: TENANT, sort: i, ...r });
}

const head = (title: string): SectionNode => ({
	id: "hero",
	type: "hero",
	layout: "banner",
	props: { eyebrow: "Coverage", title, image: "" },
});

const PAGES: { slug: string; title: string; sections: SectionNode[] }[] = [
	{
		slug: "zz-cover/pills",
		title: "Pills",
		sections: [
			head("Pills"),
			{
				id: "s",
				type: "pills",
				layout: "groups",
				props: {
					eyebrow: "Links",
					title: "Pill *groups*",
					tone: "muted",
					groups: [
						{
							heading: "Government",
							links: "MoEYS|https://moeys.gov.kh, Provincial office|/who-we-are",
						},
						{ heading: "No heading links", links: "Bare|#" },
						{ heading: "Empty group", links: "" },
					],
				},
			},
		],
	},
	{
		slug: "zz-cover/sitemap-columns",
		title: "Site map columns",
		sections: [
			head("Site map"),
			{
				id: "s",
				type: "siteMap",
				layout: "columns",
				props: { eyebrow: "Index", title: "Everything", center: "center" },
			},
		],
	},
	{
		slug: "zz-cover/sitemap-list",
		title: "Site map list",
		sections: [
			{
				id: "s",
				type: "siteMap",
				layout: "list",
				props: { title: "Indented", tone: "card" },
			},
		],
	},
	{
		slug: "zz-cover/projects-grid3",
		title: "Projects grid 3",
		sections: [
			head("Projects"),
			{
				id: "s",
				type: "projectList",
				layout: "grid-3",
				query: { source: "projects" },
				props: { eyebrow: "Programs", title: "All *projects*", moreHref: "/" },
			},
		],
	},
	{
		slug: "zz-cover/projects-grid2",
		title: "Projects grid 2",
		sections: [
			{
				id: "s",
				type: "projectList",
				layout: "grid-2",
				query: { source: "projects", category: "current" },
				props: { title: "Current", tone: "muted" },
			},
		],
	},
	{
		slug: "zz-cover/projects-list",
		title: "Projects list",
		sections: [
			{
				id: "s",
				type: "projectList",
				layout: "list",
				query: { source: "projects", category: "past" },
				props: { title: "Past" },
			},
		],
	},
	{
		slug: "zz-cover/projects-empty",
		title: "Projects empty",
		sections: [
			{
				id: "s",
				type: "projectList",
				layout: "grid-3",
				query: { source: "projects", category: "nonexistent" },
				props: { title: "None" },
			},
		],
	},
	{
		slug: "zz-cover/directory-staff",
		title: "Directory staff",
		sections: [
			head("Staff"),
			{
				id: "s",
				type: "directory",
				layout: "table",
				query: { source: "staff" },
				props: { eyebrow: "Internal", title: "Staff", tone: "card" },
			},
		],
	},
	{
		slug: "zz-cover/directory-events",
		title: "Directory events",
		sections: [
			{
				id: "s",
				type: "directory",
				layout: "table",
				query: { source: "events" },
				props: { title: "Events" },
			},
		],
	},
	{
		slug: "zz-cover/directory-documents",
		title: "Directory documents",
		sections: [
			{
				id: "s",
				type: "directory",
				layout: "table",
				query: { source: "documents" },
				props: { title: "Documents" },
			},
		],
	},
	{
		slug: "zz-cover/orgchart",
		title: "Org chart",
		sections: [
			head("Org chart"),
			{
				id: "s",
				type: "orgChart",
				layout: "default",
				query: { source: "orgchart" },
				props: { eyebrow: "Management", title: "Who reports to whom" },
			},
		],
	},
	{
		slug: "zz-cover/jobs-table",
		title: "Jobs table",
		sections: [
			head("Jobs"),
			{
				id: "s",
				type: "postList",
				layout: "table",
				query: { source: "posts", contentType: "job" },
				props: { eyebrow: "Careers", title: "Open *roles*", tone: "muted" },
			},
		],
	},
	{
		slug: "zz-cover/posts-grid2",
		title: "Posts grid 2",
		sections: [
			{
				id: "s",
				type: "postList",
				layout: "grid-2",
				query: { source: "posts", contentType: "news", limit: 2 },
				props: { title: "Two up", moreHref: "/news" },
			},
		],
	},
	{
		slug: "zz-cover/posts-empty",
		title: "Posts empty",
		sections: [
			{
				id: "s",
				type: "postList",
				layout: "grid-3",
				query: { source: "posts", contentType: "nothing-here" },
				props: { title: "Empty" },
			},
		],
	},
	{
		slug: "zz-cover/hero-split",
		title: "Hero split",
		sections: [
			{
				id: "s",
				type: "hero",
				layout: "split",
				props: {
					eyebrow: "Split",
					title: "A *split* hero",
					lead: "Text beside an image.",
					image: "/uploads/placeholder.jpg",
					ctaLabel: "Primary",
					ctaHref: "/news",
					cta2Label: "Secondary",
					cta2Href: "https://example.org",
				},
			},
		],
	},
	{
		slug: "zz-cover/hero-carousel",
		title: "Hero carousel",
		sections: [
			{
				id: "s",
				type: "hero",
				layout: "carousel",
				props: {
					eyebrow: "Carousel",
					title: "Slides *rotate*",
					lead: "With inline stats.",
					ctaLabel: "Go",
					ctaHref: "/news",
					slides: [
						{
							image: "/uploads/placeholder.jpg",
							kicker: "One",
							title: "First",
							caption: "Caption one",
						},
						{ image: "", kicker: "", title: "Second", caption: "" },
					],
					stats: [
						{ value: "12", label: "Provinces" },
						{ value: "3", label: "Programs" },
					],
				},
			},
		],
	},
	{
		slug: "zz-cover/stats-plain",
		title: "Stats plain",
		sections: [
			{
				id: "s",
				type: "stats",
				layout: "plain",
				props: {
					eyebrow: "Reach",
					title: "By the numbers",
					valueSize: "sm",
					labelSize: "md",
					items: [
						{ value: "1,200", label: "Teachers", icon: "" },
						{ value: "Nine", label: "Districts" },
					],
				},
			},
		],
	},
	{
		slug: "zz-cover/publications-grid2",
		title: "Publications grid 2",
		sections: [
			{
				id: "s",
				type: "publicationList",
				layout: "grid-2",
				query: { source: "publications" },
				props: { eyebrow: "Library", title: "Downloads", tone: "card" },
			},
		],
	},
	{
		slug: "zz-cover/map-offices",
		title: "Map offices",
		sections: [
			head("Offices"),
			{
				id: "s",
				type: "map",
				layout: "default",
				query: { source: "offices" },
				props: { eyebrow: "Find us", title: "Our *offices*", tone: "muted" },
			},
		],
	},
	{
		slug: "zz-cover/people-empty",
		title: "People empty",
		sections: [
			{
				id: "s",
				type: "people",
				layout: "grid",
				query: { source: "people", category: "no-such-tier" },
				props: { title: "Nobody" },
			},
		],
	},
	{
		slug: "zz-cover/cards-bg",
		title: "Cards background",
		sections: [
			{
				id: "s",
				type: "cards",
				layout: "cols-2",
				props: {
					eyebrow: "Cards",
					title: "Mixed *cards*",
					center: "center",
					tone: "card",
					items: [
						{
							image: "/uploads/placeholder.jpg",
							imageAsBg: true,
							title: "Overlaid",
							body: "White text over the image.",
							buttons: [
								{ label: "One", href: "/news" },
								{ label: "", href: "" },
							],
						},
						{ title: "Legacy href", body: "Folded button", href: "/stories" },
						{ title: "No buttons", body: "Nothing to click" },
					],
				},
			},
		],
	},
	{
		slug: "zz-cover/certificates-4",
		title: "Certificates 4",
		sections: [
			{
				id: "s",
				type: "certificates",
				layout: "cols-4",
				props: {
					title: "Accreditations",
					center: "center",
					items: [
						{
							image: "/uploads/placeholder.jpg",
							title: "With file",
							issuer: "MoEYS",
							year: "2024",
							fileUrl: "/uploads/x.pdf",
						},
						{ title: "No image, no file" },
					],
				},
			},
		],
	},
	{
		slug: "zz-cover/split-right",
		title: "Split media right",
		sections: [
			{
				id: "s",
				type: "split",
				layout: "media-right",
				props: {
					eyebrow: "Story",
					title: "Media on the *right*",
					body: "Some body text.",
					image: "/uploads/placeholder.jpg",
					statValue: "385+",
					statLabel: "Schools",
					tone: "muted",
				},
			},
		],
	},
	{
		slug: "zz-cover/resources-empty",
		title: "Resources empty",
		sections: [
			{
				id: "s",
				type: "resources",
				layout: "cols-2",
				props: { title: "No files", items: [] },
			},
		],
	},
	{
		slug: "zz-cover/unknown",
		title: "Unknown section",
		sections: [
			{ id: "s", type: "notARealSection", layout: "x", props: { title: "?" } },
		],
	},
];

async function main() {
	await seedOrg();
	await seedStaff();
	for (const p of PAGES) await upsertPage(db, p.slug, p.title, p.sections);
	await normalizeTree(db);
	console.log(`coverage: ${PAGES.length} pages`);
	console.log(PAGES.map((p) => `/en/${p.slug}`).join("\n"));
}

await main();
