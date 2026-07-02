/**
 * Post-seed transforms that turn the base content into the page-tree + flat-collection
 * model: collection landing pages, migrated static section pages, the section-built
 * home page, the parent/segment tree, and flattened nav targets. Run by `db:seed`
 * (so a fresh DB matches production) and by `scripts/apply-tree.ts` (to re-run on an
 * existing DB). Every step is idempotent (upsert by slug).
 */
import { and, eq } from "drizzle-orm";

import { legacyRedirect } from "#/lib/collections";
import type { SectionNode } from "#/lib/sections";
import group1 from "../../scripts/static-pages/group1.json";
import group2 from "../../scripts/static-pages/group2.json";
import group3 from "../../scripts/static-pages/group3.json";
import type { DB } from "./db";
import { clearCache } from "./render-cache";
import { listHeroSlides, listStats } from "./repo/site";
import { navItems, pages, translations } from "./schema";

const TENANT = 1;
const humanize = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const tiptap = (paras: string[]) => JSON.stringify({ type: "doc", content: paras.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) });
const doc = (text: string) => tiptap([text]);

async function setTitle(db: DB, id: number, title: string) {
	await db.delete(translations).where(and(eq(translations.entityType, "page"), eq(translations.entityId, id), eq(translations.field, "title")));
	await db.insert(translations).values({ tenantId: TENANT, entityType: "page", entityId: id, field: "title", lang: "en", value: title });
}

/** Upsert a page row by slug, setting its sections + title (segment/parent set later). */
async function upsertPage(db: DB, slug: string, title: string, sections: SectionNode[]) {
	const [existing] = await db.select({ id: pages.id }).from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.slug, slug))).limit(1);
	let id: number;
	if (existing) {
		id = existing.id;
		await db.update(pages).set({ sections, status: "published" }).where(eq(pages.id, id));
	} else {
		const [r] = await db.insert(pages).values({ tenantId: TENANT, slug, segment: slug.split("/").pop(), status: "published", sections }).returning({ id: pages.id });
		id = r.id;
	}
	await setTitle(db, id, title);
	return id;
}

/* ---------------- Collection landing pages ---------------- */
const LANDINGS: { slug: string; title: string; section: SectionNode }[] = [
	{ slug: "news", title: "News & Events", section: { id: "list", type: "postList", layout: "grid-3", query: { source: "posts", contentType: "news" }, props: { title: "News & Events" } } },
	{ slug: "stories", title: "Impact Stories", section: { id: "list", type: "postList", layout: "grid-3", query: { source: "posts", contentType: "story" }, props: { title: "Impact Stories" } } },
	{ slug: "videos", title: "Videos", section: { id: "list", type: "videoGrid", layout: "grid-3", query: { source: "videos" }, props: { title: "From the classroom" } } },
	{ slug: "galleries", title: "Photo Galleries", section: { id: "list", type: "albumGrid", layout: "grid-3", query: { source: "albums" }, props: { title: "Photo Galleries" } } },
	{ slug: "team", title: "Our Team", section: { id: "list", type: "people", layout: "grid", query: { source: "people" }, props: { title: "Our Team" } } },
	{ slug: "publications", title: "Publications", section: { id: "list", type: "publicationList", layout: "list", query: { source: "publications" }, props: { title: "Publications" } } },
	{ slug: "careers", title: "Careers", section: { id: "list", type: "postList", layout: "list", query: { source: "posts", contentType: "job" }, props: { title: "Join the team" } } },
];
async function createLandings(db: DB) {
	for (const l of LANDINGS) await upsertPage(db, l.slug, l.title, [l.section]);
}

/* ---------------- Static content pages (from extracted specs) ---------------- */
type Block = Record<string, any>;
type PageSpec = { slug: string; title: string; breadcrumb: string; lead: string; badge?: string; heroImage: string | null; blocks: Block[] };

function blockToSection(b: Block, i: number): SectionNode {
	const id = `b${i}`;
	switch (b.type) {
		case "cards":
			return { id, type: "cards", layout: `cols-${b.cols ?? 3}`, props: { title: b.title ?? "", items: b.items ?? [] } };
		case "resources":
			return { id, type: "resources", layout: (b.items?.length ?? 0) > 3 ? "cols-2" : "cols-1", props: { title: b.title ?? "", items: (b.items ?? []).map((it: Block) => ({ kind: it.kind ?? "pdf", title: it.title ?? "", meta: it.meta ?? "", href: it.href ?? "#" })) } };
		case "publications":
			return { id, type: "publicationList", layout: "list", query: { source: "publications", category: b.category }, props: { title: b.title ?? "", category: b.category } };
		case "partners":
			return { id, type: "partners", layout: "groups", query: { source: "partners" }, props: { title: b.title ?? "" } };
		case "jobs":
			return { id, type: "postList", layout: "list", query: { source: "posts", contentType: "job" }, props: { title: b.title ?? "" } };
		case "form":
			return { id, type: "form", layout: b.kind ?? "contact", props: { title: b.title ?? "" } };
		default:
			return { id, type: "richtext", layout: "default", props: { title: b.title ?? "", body: tiptap(b.paragraphs ?? []) } };
	}
}
async function migrateStaticPages(db: DB) {
	const specs = [...group1, ...group2, ...group3] as PageSpec[];
	for (const s of specs) {
		const hero: SectionNode = { id: "hero", type: "hero", layout: "banner", props: { eyebrow: s.breadcrumb, title: s.title, lead: s.lead, image: s.heroImage ?? "" } };
		await upsertPage(db, s.slug, s.title, [hero, ...s.blocks.map(blockToSection)]);
	}
}

/* ---------------- Section-built home page ---------------- */
async function buildHomePage(db: DB) {
	const hero = await listHeroSlides(db, "en");
	const stats = await listStats(db, "en");
	const sections: SectionNode[] = [
		{ id: "hero", type: "hero", layout: "showcase", props: { eyebrow: "Three decades of impact · 1994 — 2026", title: "Where every Cambodian child *learns*, dreams, and *rises*.", lead: "For more than thirty years, KAPE has walked alongside teachers, children and communities across 15 provinces of Cambodia — turning classrooms into places of hope, equity and transformation.", ctaLabel: "Explore impact stories", ctaHref: "/stories", cta2Label: "Who we are", cta2Href: "/who-we-are", image: hero[0]?.url ?? "", slides: hero.map((h) => ({ image: h.url, title: h.title || "", caption: h.caption || "", kicker: h.kicker || "" })), stats: [{ value: "385+", label: "Schools served" }, { value: "15", label: "Provinces" }, { value: "160K+", label: "Children" }] } },
		{ id: "news", type: "postList", layout: "featured", query: { source: "posts", contentType: "news", limit: 3 }, props: { eyebrow: "Stories from the field", title: "Latest news *& events*", moreHref: "/news", tone: "card" } },
		{ id: "stories", type: "postList", layout: "grid-3", query: { source: "posts", contentType: "story", limit: 3 }, props: { eyebrow: "Lives transformed", title: "Impact *stories*", moreHref: "/stories" } },
		{ id: "videos", type: "videoGrid", layout: "grid-3", query: { source: "videos" }, props: { eyebrow: "Watch", title: "From the classroom", moreHref: "/videos", tone: "muted" } },
		{ id: "stats", type: "stats", layout: "band", props: { eyebrow: "Our reach", title: "Three decades.\n*Countless beginnings.*", image: hero[2]?.url ?? hero[0]?.url ?? "", items: stats.map((s) => ({ value: s.value.toLocaleString(), label: s.label })) } },
		{ id: "about", type: "split", layout: "media-left", props: { eyebrow: "About KAPE", title: "A local NGO with a *national* heartbeat for education.", body: doc("KAPE is a local non-profit working primarily in the formal education sector across 15 provinces in Cambodia — from preschools and primary classrooms to secondary schools, tertiary programs and a Master's Degree in Mentoring. Direct beneficiaries number well over 160,000 children at more than 385 schools."), image: hero[1]?.url ?? "https://picsum.photos/seed/kape-conference/1600/1000", statValue: "15", statLabel: "Provinces of Cambodia" } },
		{ id: "donate", type: "cta", layout: "band", props: { eyebrow: "Stand with us", title: "Be part of the *next chapter.*", body: "Your gift becomes a textbook, a teacher's training, a girl's scholarship, a community's library. Every contribution writes a future.", ctaLabel: "♡ Donate now", ctaHref: "/donate", cta2Label: "Partner with KAPE", cta2Href: "/opportunities/partner" } },
		{ id: "partners", type: "partners", layout: "groups", query: { source: "partners" }, props: { eyebrow: "Working together", title: "Partners for *change*" } },
	];
	await upsertPage(db, "home", "KAPE — Kampuchea Action to Promote Education", sections);
}

/* ---------------- Build the parent/segment tree over all pages ---------------- */
async function normalizeTree(db: DB) {
	const rows = await db.select({ id: pages.id, slug: pages.slug }).from(pages).where(eq(pages.tenantId, TENANT));
	const bySlug = new Map(rows.map((r) => [r.slug, r.id]));

	// Create any missing ancestor pages (e.g. "what-we-do", "media", "opportunities").
	const needed = new Set<string>();
	for (const r of rows) {
		const parts = r.slug.split("/");
		for (let i = 1; i < parts.length; i++) needed.add(parts.slice(0, i).join("/"));
	}
	for (const path of [...needed].filter((p) => !bySlug.has(p)).sort((a, b) => a.split("/").length - b.split("/").length)) {
		const segment = path.split("/").pop()!;
		const [r] = await db.insert(pages).values({ tenantId: TENANT, slug: path, segment, status: "published" }).returning({ id: pages.id });
		bySlug.set(path, r.id);
		await setTitle(db, r.id, humanize(segment));
	}

	// Set segment + parentId + sortOrder for every page.
	const counter = new Map<string, number>();
	for (const slug of [...bySlug.keys()].sort()) {
		const parts = slug.split("/");
		const segment = parts.pop()!;
		const parentSlug = parts.join("/");
		const parentId = parentSlug ? bySlug.get(parentSlug) ?? null : null;
		const order = counter.get(parentSlug) ?? 0;
		counter.set(parentSlug, order + 1);
		await db.update(pages).set({ segment, parentId, sortOrder: order }).where(eq(pages.id, bySlug.get(slug)!));
	}
}

/* ---------------- Flatten nav targets to the canonical flat paths ---------------- */
async function flattenNav(db: DB) {
	const items = await db.select({ id: navItems.id, targetRef: navItems.targetRef }).from(navItems).where(eq(navItems.tenantId, TENANT));
	for (const it of items) {
		const flat = legacyRedirect(it.targetRef);
		if (flat && flat !== it.targetRef) await db.update(navItems).set({ targetRef: flat }).where(eq(navItems.id, it.id));
	}
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
