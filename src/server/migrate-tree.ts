import { and, eq } from "drizzle-orm";

import { PLACEHOLDER_IMAGE } from "#/lib/placeholder";

import type { SectionNode } from "#/lib/sections";
import group1 from "../../scripts/fixture/static-pages/group1.json";
import group2 from "../../scripts/fixture/static-pages/group2.json";
import group3 from "../../scripts/fixture/static-pages/group3.json";
import type { DB } from "./db";
import { flattenNav, normalizeTree, upsertPage } from "./page-tree";
import { clearCache } from "./render-cache";
import { listHeroSlides, listStats } from "./repo/site";
import { translations } from "./schema";

const tiptap = (paras: string[]) =>
	JSON.stringify({
		type: "doc",
		content: paras.map((t) => ({
			type: "paragraph",
			content: [{ type: "text", text: t }],
		})),
	});
const doc = (text: string) => tiptap([text]);

/* ---------------- Collection landing pages ---------------- */
const LANDINGS: { slug: string; title: string; section: SectionNode }[] = [
	{
		slug: "news",
		title: "News & Events",
		section: {
			id: "list",
			type: "postList",
			layout: "grid-3",
			query: { source: "posts", contentType: "news" },
			props: { title: "News & Events" },
		},
	},
	{
		slug: "stories",
		title: "Impact Stories",
		section: {
			id: "list",
			type: "postList",
			layout: "grid-3",
			query: { source: "posts", contentType: "story" },
			props: { title: "Impact Stories" },
		},
	},
	{
		slug: "videos",
		title: "Videos",
		section: {
			id: "list",
			type: "videoGrid",
			layout: "grid-3",
			query: { source: "videos" },
			props: { title: "From the classroom" },
		},
	},
	{
		slug: "galleries",
		title: "Photo Galleries",
		section: {
			id: "list",
			type: "albumGrid",
			layout: "grid-3",
			query: { source: "albums" },
			props: { title: "Photo Galleries" },
		},
	},
	{
		slug: "team",
		title: "Our Team",
		section: {
			id: "list",
			type: "people",
			layout: "grid",
			query: { source: "people" },
			props: { title: "Our Team" },
		},
	},
	{
		slug: "publications",
		title: "Publications",
		section: {
			id: "list",
			type: "publicationList",
			layout: "list",
			query: { source: "publications" },
			props: { title: "Publications" },
		},
	},
	{
		slug: "careers",
		title: "Careers",
		section: {
			id: "list",
			type: "postList",
			layout: "list",
			query: { source: "posts", contentType: "job" },
			props: { title: "Join the team" },
		},
	},
];
async function createLandings(db: DB) {
	for (const l of LANDINGS) await upsertPage(db, l.slug, l.title, [l.section]);
}

/* ---------------- Static content pages (from extracted specs) ---------------- */
type BlockItem = {
	kind?: string;
	title?: string;
	body?: string;
	meta?: string;
	href?: string;
};
type Block = {
	type?: string;
	title?: string;
	cols?: number;
	category?: string;
	kind?: string;
	paragraphs?: string[];
	items?: BlockItem[];
};
type PageSpec = {
	slug: string;
	title: string;
	breadcrumb: string;
	lead: string;
	badge?: string;
	heroImage: string | null;
	blocks: Block[];
};

function blockToSection(b: Block, i: number): SectionNode {
	const id = `b${i}`;
	switch (b.type) {
		case "cards":
			return {
				id,
				type: "cards",
				layout: `cols-${b.cols ?? 3}`,
				props: { title: b.title ?? "", items: b.items ?? [] },
			};
		case "resources":
			return {
				id,
				type: "resources",
				layout: (b.items?.length ?? 0) > 3 ? "cols-2" : "cols-1",
				props: {
					title: b.title ?? "",
					items: (b.items ?? []).map((it) => ({
						kind: it.kind ?? "pdf",
						title: it.title ?? "",
						meta: it.meta ?? "",
						href: it.href ?? "#",
					})),
				},
			};
		case "publications":
			return {
				id,
				type: "publicationList",
				layout: "list",
				query: { source: "publications", category: b.category },
				props: { title: b.title ?? "", category: b.category },
			};
		case "partners":
			return {
				id,
				type: "partners",
				layout: "groups",
				query: { source: "partners" },
				props: { title: b.title ?? "" },
			};
		case "jobs":
			return {
				id,
				type: "postList",
				layout: "list",
				query: { source: "posts", contentType: "job" },
				props: { title: b.title ?? "" },
			};
		case "form":
			return {
				id,
				type: "form",
				layout: b.kind ?? "contact",
				props: { title: b.title ?? "" },
			};
		default:
			return {
				id,
				type: "richtext",
				layout: "default",
				props: { title: b.title ?? "", body: tiptap(b.paragraphs ?? []) },
			};
	}
}
/** Every static page the fixture installs, with the sections it installs. */
export function staticPages(): {
	slug: string;
	title: string;
	sections: SectionNode[];
}[] {
	const specs = [...group1, ...group2, ...group3] as PageSpec[];
	return specs.map((s) => ({
		slug: s.slug,
		title: s.title,
		sections: [
			{
				id: "hero",
				type: "hero",
				layout: "banner",
				props: {
					eyebrow: s.breadcrumb,
					title: s.title,
					lead: s.lead,
					image: s.heroImage ?? "",
				},
			},
			...s.blocks.map(blockToSection),
		],
	}));
}

async function migrateStaticPages(db: DB) {
	for (const p of staticPages())
		await upsertPage(db, p.slug, p.title, p.sections);
}

/* ---------------- Section-built home page ---------------- */
async function buildHomePage(db: DB) {
	const hero = await listHeroSlides(db, "en");
	const stats = await listStats(db, "en");
	const sections: SectionNode[] = [
		{
			id: "hero",
			type: "hero",
			layout: "showcase",
			props: {
				eyebrow: "Three decades of impact · 1994 — 2026",
				title: "Where every Cambodian child *learns*, dreams, and *rises*.",
				lead: "For more than thirty years, KAPE has walked alongside teachers, children and communities across 15 provinces of Cambodia — turning classrooms into places of hope, equity and transformation.",
				ctaLabel: "Explore impact stories",
				ctaHref: "/stories",
				cta2Label: "Who we are",
				cta2Href: "/who-we-are",
				image: hero[0]?.url ?? "",
				slides: hero.map((h) => ({
					image: h.url,
					title: h.title || "",
					caption: h.caption || "",
					kicker: h.kicker || "",
				})),
				stats: [
					{ value: "385+", label: "Schools served" },
					{ value: "15", label: "Provinces" },
					{ value: "160K+", label: "Children" },
				],
			},
		},
		{
			id: "news",
			type: "postList",
			layout: "featured",
			query: { source: "posts", contentType: "news", limit: 3 },
			props: {
				eyebrow: "Stories from the field",
				title: "Latest news *& events*",
				moreHref: "/news",
				tone: "card",
			},
		},
		{
			id: "stories",
			type: "postList",
			layout: "grid-3",
			query: { source: "posts", contentType: "story", limit: 3 },
			props: {
				eyebrow: "Lives transformed",
				title: "Impact *stories*",
				moreHref: "/stories",
			},
		},
		{
			id: "videos",
			type: "videoGrid",
			layout: "grid-3",
			query: { source: "videos", limit: 6 },
			props: {
				eyebrow: "Watch",
				title: "From the classroom",
				moreHref: "/videos",
				tone: "muted",
			},
		},
		{
			id: "stats",
			type: "stats",
			layout: "band",
			props: {
				eyebrow: "Our reach",
				title: "Three decades.\n*Countless beginnings.*",
				image: hero[2]?.url ?? hero[0]?.url ?? "",
				items: stats.map((s) => ({
					value: s.value.toLocaleString(),
					label: s.label,
				})),
			},
		},
		{
			id: "about",
			type: "split",
			layout: "media-left",
			props: {
				eyebrow: "About KAPE",
				title: "A local NGO with a *national* heartbeat for education.",
				body: doc(
					"KAPE is a local non-profit working primarily in the formal education sector across 15 provinces in Cambodia — from preschools and primary classrooms to secondary schools, tertiary programs and a Master's Degree in Mentoring. Direct beneficiaries number well over 160,000 children at more than 385 schools.",
				),
				image: hero[1]?.url ?? PLACEHOLDER_IMAGE,
				statValue: "15",
				statLabel: "Provinces of Cambodia",
			},
		},
		{
			id: "donate",
			type: "cta",
			layout: "band",
			props: {
				eyebrow: "Stand with us",
				title: "Be part of the *next chapter.*",
				body: "Your gift becomes a textbook, a teacher's training, a girl's scholarship, a community's library. Every contribution writes a future.",
				ctaLabel: "♡ Donate now",
				ctaHref: "/donate",
				cta2Label: "Partner with KAPE",
				cta2Href: "/opportunities/partner",
			},
		},
		{
			id: "partners",
			type: "partners",
			// one partner per category, so grouped rows come out mostly empty
			layout: "marquee",
			query: { source: "partners" },
			props: { eyebrow: "Working together", title: "Partners for *change*" },
		},
	];
	const id = await upsertPage(
		db,
		"home",
		"KAPE — Kampuchea Action to Promote Education",
		sections,
	);
	// The home page's own line, which the product used to hardcode beside the
	// generic one. Without it the front page shares every other page's description.
	await db
		.delete(translations)
		.where(
			and(
				eq(translations.entityType, "page"),
				eq(translations.entityId, id),
				eq(translations.field, "excerpt"),
			),
		);
	await db.insert(translations).values({
		tenantId: 1,
		entityType: "page",
		entityId: id,
		field: "excerpt",
		lang: "en",
		value:
			"For more than three decades, KAPE has championed equitable, transformative education for Cambodian children — across 385+ schools, 15 provinces, and over 160,000 lives.",
	});
}

/** Run all transforms in dependency order. Idempotent. */
export async function applyTreeMigrations(db: DB) {
	await createLandings(db);
	await migrateStaticPages(db);
	await buildHomePage(db);
	await normalizeTree(db);
	await flattenNav(db);
	await clearCache(db); // these rewrite page rows outside the tRPC mutation path
}
