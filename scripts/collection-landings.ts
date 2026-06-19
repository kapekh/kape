/**
 * Create the flat collection landing pages (/news, /stories, /videos, /galleries,
 * /team, /publications, /careers) as page-builder pages with one listing section
 * each. Idempotent: upserts by slug. Run: bun scripts/collection-landings.ts
 */
import { and, eq } from "drizzle-orm";

import type { SectionNode } from "../src/lib/sections";
import { db } from "../src/server/db";
import { pages, translations } from "../src/server/schema";

const TENANT = 1;

const LANDINGS: { slug: string; title: string; section: SectionNode }[] = [
	{ slug: "news", title: "News & Events", section: { id: "list", type: "postList", layout: "grid-3", query: { source: "posts", contentType: "news" }, props: { title: "News & Events" } } },
	{ slug: "stories", title: "Impact Stories", section: { id: "list", type: "postList", layout: "grid-3", query: { source: "posts", contentType: "story" }, props: { title: "Impact Stories" } } },
	{ slug: "videos", title: "Videos", section: { id: "list", type: "videoGrid", layout: "grid-3", query: { source: "videos" }, props: { title: "From the classroom" } } },
	{ slug: "galleries", title: "Photo Galleries", section: { id: "list", type: "albumGrid", layout: "grid-3", query: { source: "albums" }, props: { title: "Photo Galleries" } } },
	{ slug: "team", title: "Our Team", section: { id: "list", type: "people", layout: "grid", query: { source: "people" }, props: { title: "Our Team" } } },
	{ slug: "publications", title: "Publications", section: { id: "list", type: "publicationList", layout: "list", query: { source: "publications" }, props: { title: "Publications" } } },
	{ slug: "careers", title: "Careers", section: { id: "list", type: "postList", layout: "list", query: { source: "posts", contentType: "job" }, props: { title: "Join the team" } } },
];

async function main() {
	for (const l of LANDINGS) {
		const [existing] = await db.select().from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.slug, l.slug))).limit(1);
		let id: number;
		if (existing) {
			id = existing.id;
			await db.update(pages).set({ sections: [l.section], status: "published", segment: l.slug, parentId: null }).where(eq(pages.id, id));
		} else {
			const [r] = await db.insert(pages).values({ tenantId: TENANT, slug: l.slug, segment: l.slug, status: "published", sections: [l.section] }).returning({ id: pages.id });
			id = r.id;
		}
		await db.delete(translations).where(and(eq(translations.entityType, "page"), eq(translations.entityId, id), eq(translations.field, "title")));
		await db.insert(translations).values({ tenantId: TENANT, entityType: "page", entityId: id, field: "title", lang: "en", value: l.title });
		console.log(`  ${existing ? "updated" : "created"}  /${l.slug}  (id ${id})  ${l.section.type}`);
	}
	console.log(`\n${LANDINGS.length} landing pages ready.`);
}

main().then(() => process.exit(0));
