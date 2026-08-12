/**
 * One-off: turn the homepage into a page-builder page. Creates a `pages` row with
 * slug "home" whose sections reproduce the homepage (hero carousel from the hero
 * slides, stats band from impact stats, news/stories/videos/partners as dynamic
 * sections, plus an about + donate band). The index route renders these sections.
 *
 * Run: bun scripts/home-page-sections.ts
 */
import { and, eq } from "drizzle-orm";

import type { SectionNode } from "../../src/lib/sections";
import { db } from "../../src/server/db";
import { listHeroSlides, listStats } from "../../src/server/repo/site";
import { pages, translations } from "../../src/server/schema";

const TENANT = 1;
const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

async function main() {
	const hero = await listHeroSlides(db, "en");
	const stats = await listStats(db, "en");

	const sections: SectionNode[] = [
		{
			id: "hero",
			type: "hero",
			layout: "carousel",
			props: {
				eyebrow: "Three decades of impact · 1994 — 2026",
				title: "Where every Cambodian child learns, dreams, and rises.",
				lead: "For more than thirty years, KAPE has walked alongside teachers, children and communities across 15 provinces of Cambodia — turning classrooms into places of hope, equity and transformation.",
				ctaLabel: "Donate",
				ctaHref: "#donate",
				image: hero[0]?.url ?? "",
				slides: hero.map((h) => ({ image: h.url, title: h.title || h.kicker || "", caption: h.caption || "" })),
			},
		},
		{ id: "news", type: "postList", layout: "featured", query: { source: "posts", contentType: "news", limit: 3 }, props: { title: "Latest news & events", moreHref: "/who-we-are/news" } },
		{ id: "stats", type: "stats", layout: "band", props: { title: "Our reach", items: stats.map((s) => ({ value: s.value.toLocaleString(), label: s.label })) } },
		{ id: "stories", type: "postList", layout: "grid-3", query: { source: "posts", contentType: "story", limit: 3 }, props: { title: "Impact stories" } },
		{ id: "videos", type: "videoGrid", layout: "grid-3", query: { source: "videos" }, props: { title: "From the classroom" } },
		{
			id: "about",
			type: "split",
			layout: "media-right",
			props: {
				title: "A local NGO with a national heartbeat for education.",
				body: doc("KAPE is a local non-profit working primarily in the formal education sector across 15 provinces in Cambodia — from preschools and primary classrooms to secondary schools, tertiary programs and a Master's Degree in Mentoring."),
				image: "https://picsum.photos/seed/kape-conference/1600/1000",
			},
		},
		{ id: "donate", type: "cta", layout: "band", props: { title: "Be part of the next chapter.", body: "Your gift becomes a textbook, a teacher's training, a girl's scholarship, a community's library. Every contribution writes a future.", ctaLabel: "Donate now", ctaHref: "#donate", cta2Label: "Partner with KAPE", cta2Href: "/opportunities/partner" } },
		{ id: "partners", type: "partners", layout: "groups", query: { source: "partners" }, props: { title: "Partners for change" } },
	];

	const [existing] = await db.select().from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.slug, "home"))).limit(1);
	let id: number;
	if (existing) {
		id = existing.id;
		await db.update(pages).set({ sections, status: "published" }).where(eq(pages.id, id));
	} else {
		const [r] = await db.insert(pages).values({ tenantId: TENANT, slug: "home", status: "published", sections }).returning({ id: pages.id });
		id = r.id;
	}
	await db.delete(translations).where(and(eq(translations.entityType, "page"), eq(translations.entityId, id), eq(translations.field, "title")));
	await db.insert(translations).values({ tenantId: TENANT, entityType: "page", entityId: id, field: "title", lang: "en", value: "KAPE — Kampuchea Action to Promote Education" });

	console.log(`Home page ready (id ${id}) with ${sections.length} sections; hero has ${hero.length} slides, ${stats.length} stats.`);
}

main().then(() => process.exit(0));
