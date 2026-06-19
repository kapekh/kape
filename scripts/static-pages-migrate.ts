/**
 * Migrate the static content routes into CMS tree pages, building section trees
 * from the normalized specs in scripts/static-pages/*.json. Creates any missing
 * parent pages (what-we-do, media, opportunities) and links the tree. Idempotent
 * (upsert by slug). Run: bun scripts/static-pages-migrate.ts
 */
import { and, eq } from "drizzle-orm";

import group1 from "./static-pages/group1.json";
import group2 from "./static-pages/group2.json";
import group3 from "./static-pages/group3.json";
import type { SectionNode } from "../src/lib/sections";
import { db } from "../src/server/db";
import { pages, translations } from "../src/server/schema";

const TENANT = 1;

type Block = Record<string, any>;
type PageSpec = {
	slug: string;
	title: string;
	breadcrumb: string;
	lead: string;
	badge?: string;
	heroImage: string | null;
	blocks: Block[];
};

const specs = [...group1, ...group2, ...group3] as PageSpec[];

const humanize = (seg: string) => seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const tiptap = (paras: string[]) =>
	JSON.stringify({ type: "doc", content: paras.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) });

/** Normalized content block -> SectionNode. */
function blockToSection(b: Block, i: number): SectionNode {
	const id = `b${i}`;
	switch (b.type) {
		case "cards":
			return { id, type: "cards", layout: `cols-${b.cols ?? 3}`, props: { title: b.title ?? "", items: b.items ?? [] } };
		case "resources":
			return {
				id,
				type: "resources",
				layout: (b.items?.length ?? 0) > 3 ? "cols-2" : "cols-1",
				props: { title: b.title ?? "", items: (b.items ?? []).map((it: Block) => ({ kind: it.kind ?? "pdf", title: it.title ?? "", meta: it.meta ?? "", href: it.href ?? "#" })) },
			};
		case "publications":
			return { id, type: "publicationList", layout: "list", query: { source: "publications", category: b.category }, props: { title: b.title ?? "", category: b.category } };
		case "partners":
			return { id, type: "partners", layout: "groups", query: { source: "partners" }, props: { title: b.title ?? "" } };
		case "jobs":
			return { id, type: "postList", layout: "list", query: { source: "posts", contentType: "job" }, props: { title: b.title ?? "" } };
		case "form":
			return { id, type: "form", layout: b.kind ?? "contact", props: { title: b.title ?? "" } };
		case "richtext":
			return { id, type: "richtext", layout: "default", props: { title: b.title ?? "", body: tiptap(b.paragraphs ?? []) } };
		default:
			return { id, type: "richtext", layout: "default", props: { body: tiptap([]) } };
	}
}

function buildSections(spec: PageSpec): SectionNode[] {
	const hero: SectionNode = {
		id: "hero",
		type: "hero",
		layout: "banner",
		props: { eyebrow: spec.breadcrumb, title: spec.title, lead: spec.lead, image: spec.heroImage ?? "" },
	};
	return [hero, ...spec.blocks.map(blockToSection)];
}

async function setTitle(id: number, title: string) {
	await db.delete(translations).where(and(eq(translations.entityType, "page"), eq(translations.entityId, id), eq(translations.field, "title")));
	await db.insert(translations).values({ tenantId: TENANT, entityType: "page", entityId: id, field: "title", lang: "en", value: title });
}

const idBySlug = new Map<string, number>();

/** Ensure a page row exists for `slug`, recursively ensuring its parent chain. */
async function ensurePage(slug: string, opts: { title?: string; sections?: SectionNode[] } = {}): Promise<number> {
	if (idBySlug.has(slug)) {
		const id = idBySlug.get(slug)!;
		if (opts.sections || opts.title) {
			await db.update(pages).set({ ...(opts.sections ? { sections: opts.sections, status: "published" } : {}) }).where(eq(pages.id, id));
			if (opts.title) await setTitle(id, opts.title);
		}
		return id;
	}
	const parts = slug.split("/");
	const segment = parts.pop()!;
	const parentSlug = parts.join("/");
	const parentId = parentSlug ? await ensurePage(parentSlug) : null;

	const [existing] = await db.select({ id: pages.id }).from(pages).where(and(eq(pages.tenantId, TENANT), eq(pages.slug, slug))).limit(1);
	let id: number;
	if (existing) {
		id = existing.id;
		await db.update(pages).set({ parentId, segment, status: "published", ...(opts.sections ? { sections: opts.sections } : {}) }).where(eq(pages.id, id));
	} else {
		const [r] = await db.insert(pages).values({ tenantId: TENANT, slug, segment, parentId, status: "published", sections: opts.sections ?? null }).returning({ id: pages.id });
		id = r.id;
	}
	idBySlug.set(slug, id);
	await setTitle(id, opts.title ?? humanize(segment));
	return id;
}

async function main() {
	// Parent pages get a friendly title; leaves get their spec content.
	const PARENT_TITLES: Record<string, string> = { "what-we-do": "What We Do", media: "Media & Publications", opportunities: "Opportunities", "who-we-are": "Who We Are" };
	for (const [slug, title] of Object.entries(PARENT_TITLES)) await ensurePage(slug, { title });

	for (const spec of specs) {
		const id = await ensurePage(spec.slug, { title: spec.title, sections: buildSections(spec) });
		console.log(`  ${spec.slug.padEnd(34)} id=${String(id).padEnd(4)} ${buildSections(spec).map((s) => s.type).join("+")}`);
	}
	console.log(`\n${specs.length} static pages migrated.`);
}

main().then(() => process.exit(0));
