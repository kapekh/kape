/**
 * Bring the client's own photography into the media library and into the slots
 * where the correspondence is documented rather than guessed.
 *
 * Two local-only inputs, neither in git:
 *   feedback/src/assets/**\/*.asset.json  the prototype's 59 asset stubs
 *   public/uploads/<uuid>.<ext>           the files themselves
 *
 * The stubs carry `original_filename` and `size`; the files on disk are named
 * with a random uuid and carry no identity at all. Byte size recovers the
 * pairing (57 of 59 uniquely; the two collisions are byte-identical copies of
 * the same logo, so either choice is the same image).
 *
 * Re-runnable. A media row's identity is a `translations` row keyed
 * `entity_type='media', field='original_filename'` — the same key J19 used, and
 * the `uq_translation` index makes a duplicate impossible in the database
 * rather than only in this script.
 *
 * Run: bun scripts/import-client-assets.ts [--dry]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { and, eq } from "drizzle-orm";

import { PLACEHOLDER_IMAGE } from "#/lib/placeholder";
import { db } from "#/server/db";
import { clearCache } from "#/server/render-cache";
import { heroSlides, media, pages, partners, posts, translations } from "#/server/schema";

const TENANT = 1;
const STUBS = "feedback/src/assets";
const UPLOADS = "public/uploads";
const DRY = process.argv.includes("--dry");

type Stub = { name: string; size: number; type: string };

function readStubs(dir: string, prefix = ""): Stub[] {
	const out: Stub[] = [];
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.isDirectory()) out.push(...readStubs(join(dir, e.name), `${prefix}${e.name}/`));
		else if (e.name.endsWith(".asset.json")) {
			const j = JSON.parse(readFileSync(join(dir, e.name), "utf8"));
			out.push({ name: prefix + j.original_filename, size: j.size, type: j.content_type });
		}
	}
	return out;
}

/**
 * Slots whose correspondence is documented, not invented:
 *   hero    — the three slide titles name their photograph
 *   story   — the story is about the person in the portrait
 *   video   — the prototype's three thumbnails, in order
 *   partner — the logo file is the organisation's own mark
 * Everything else stays on its placeholder: the prototype had no photograph for
 * it, and choosing one is the client's call, not this script's.
 */
const HERO = ["students.jpg", "computerlab.jpg", "conference.jpg"];
const STORY_COVERS: Record<string, string> = {
	"yary-happy-cambodian-children": "yary.jpg",
	"teacher-sum-bopha-digital-literacy": "bopha.jpg",
};
const VIDEO_COVERS: Record<string, string> = {
	"video-digital-literacy": "video1.jpg",
	"video-ict-lab": "video2.jpg",
	"video-ai-training": "video3.jpg",
};
const PARTNER_LOGOS: Record<string, string> = {
	MoEYS: "partners/moeys.png",
	UNICEF: "partners/unicef.png",
	"ASEAN Foundation": "partners/asean.png",
};
/**
 * Section images are stored as raw urls inside `pages.sections`, so relinking a
 * media row does not reach them. Keyed by picsum seed, the same slots as above
 * plus the ICT page J19 recorded.
 */
const SECTION_IMAGES: Record<string, string> = {
	"kape-hero-0": "students.jpg",
	"kape-hero-1": "computerlab.jpg",
	"kape-hero-2": "conference.jpg",
	"kape-students": "students.jpg",
	"kape-computerlab": "computerlab.jpg",
	"kape-conference": "conference.jpg",
};

const SEED_RE = /^https:\/\/picsum\.photos\/seed\/([^/]+)\//;

/** Rewrite every picsum url in a parsed section tree. Returns the swap count. */
function swapImages(node: unknown, urlFor: (seed: string) => string | null): number {
	let n = 0;
	if (Array.isArray(node)) {
		for (const v of node) n += swapImages(v, urlFor);
		return n;
	}
	if (node && typeof node === "object") {
		const obj = node as Record<string, unknown>;
		for (const [k, v] of Object.entries(obj)) {
			if (typeof v === "string") {
				const m = SEED_RE.exec(v);
				const next = m ? urlFor(m[1]) : null;
				if (next) {
					obj[k] = next;
					n++;
				}
			} else n += swapImages(v, urlFor);
		}
	}
	return n;
}

async function mediaIdFor(name: string): Promise<number | null> {
	const [row] = await db
		.select({ id: translations.entityId })
		.from(translations)
		.where(
			and(
				eq(translations.entityType, "media"),
				eq(translations.field, "original_filename"),
				eq(translations.value, name),
			),
		)
		.limit(1);
	return row?.id ?? null;
}

async function main() {
	const stubs = readStubs(STUBS);
	const disk = readdirSync(UPLOADS).map((f) => ({ f, size: statSync(join(UPLOADS, f)).size }));
	const bySize = new Map<number, string[]>();
	for (const d of disk) bySize.set(d.size, [...(bySize.get(d.size) ?? []), d.f]);

	let imported = 0;
	let skipped = 0;
	const unresolved: string[] = [];

	for (const s of stubs) {
		const hits = bySize.get(s.size) ?? [];
		if (!hits.length) {
			unresolved.push(s.name);
			continue;
		}
		if (await mediaIdFor(s.name)) {
			skipped++;
			continue;
		}
		const file = hits[0];
		if (DRY) {
			imported++;
			continue;
		}
		const [m] = await db
			.insert(media)
			.values({
				tenantId: TENANT,
				r2Key: `uploads/${file}`,
				url: `/uploads/${file}`,
				contentType: s.type,
				size: s.size,
			})
			.returning({ id: media.id });
		await db.insert(translations).values({
			tenantId: TENANT,
			entityType: "media",
			entityId: m.id,
			field: "original_filename",
			lang: "en",
			value: s.name,
		});
		imported++;
	}

	let relinked = 0;
	const missed: string[] = [];
	const relink = async (label: string, name: string, apply: (id: number) => Promise<void>) => {
		const id = await mediaIdFor(name);
		if (!id) {
			missed.push(`${label} → ${name}`);
			return;
		}
		if (!DRY) await apply(id);
		relinked++;
	};

	const slides = await db
		.select({ id: heroSlides.id, sort: heroSlides.sort })
		.from(heroSlides)
		.where(eq(heroSlides.tenantId, TENANT))
		.orderBy(heroSlides.sort);
	for (const [i, slide] of slides.entries()) {
		if (!HERO[i]) continue;
		await relink(`hero ${i}`, HERO[i], async (mid) => {
			await db.update(heroSlides).set({ mediaId: mid }).where(eq(heroSlides.id, slide.id));
		});
	}

	for (const [slug, name] of Object.entries({ ...STORY_COVERS, ...VIDEO_COVERS })) {
		const [p] = await db
			.select({ id: posts.id })
			.from(posts)
			.where(and(eq(posts.tenantId, TENANT), eq(posts.slug, slug)))
			.limit(1);
		if (!p) {
			missed.push(`post ${slug} (no such post)`);
			continue;
		}
		await relink(`post ${slug}`, name, async (mid) => {
			await db.update(posts).set({ coverMediaId: mid }).where(eq(posts.id, p.id));
		});
	}

	for (const [partnerName, name] of Object.entries(PARTNER_LOGOS)) {
		const [p] = await db
			.select({ id: partners.id })
			.from(partners)
			.where(and(eq(partners.tenantId, TENANT), eq(partners.name, partnerName)))
			.limit(1);
		if (!p) {
			missed.push(`partner ${partnerName} (no such partner)`);
			continue;
		}
		await relink(`partner ${partnerName}`, name, async (mid) => {
			await db.update(partners).set({ logoMediaId: mid }).where(eq(partners.id, p.id));
		});
	}

	const urlCache = new Map<string, string | null>();
	const urlForSeed = (seed: string): string | null => {
		if (!urlCache.has(seed)) return null;
		return urlCache.get(seed) ?? null;
	};
	for (const [seed, name] of Object.entries(SECTION_IMAGES)) {
		const id = await mediaIdFor(name);
		if (!id) {
			missed.push(`section ${seed} → ${name}`);
			urlCache.set(seed, null);
			continue;
		}
		const [row] = await db.select({ url: media.url }).from(media).where(eq(media.id, id)).limit(1);
		urlCache.set(seed, row?.url ?? null);
	}

	let sectionsSwapped = 0;
	const pageRows = await db
		.select({ id: pages.id, slug: pages.slug, sections: pages.sections })
		.from(pages)
		.where(eq(pages.tenantId, TENANT));
	for (const p of pageRows) {
		if (!p.sections) continue;
		const tree = JSON.parse(JSON.stringify(p.sections));
		const n = swapImages(tree, urlForSeed);
		if (!n) continue;
		sectionsSwapped += n;
		if (!DRY)
			await db
				.update(pages)
				.set({ sections: tree, updatedAt: new Date().toISOString() })
				.where(eq(pages.id, p.id));
	}

	// Whatever the client has no photograph for falls back to a placeholder that
	// looks like one, rather than a hotlinked stock photo that reads as a choice.
	let neutralised = 0;
	const stale = await db
		.select({ id: media.id, url: media.url })
		.from(media)
		.where(eq(media.tenantId, TENANT));
	for (const m of stale) {
		if (!m.url || !SEED_RE.test(m.url)) continue;
		neutralised++;
		if (!DRY)
			await db
				.update(media)
				.set({ url: PLACEHOLDER_IMAGE, contentType: "image/svg+xml" })
				.where(eq(media.id, m.id));
	}
	for (const p of pageRows) {
		if (!p.sections) continue;
		const tree = JSON.parse(JSON.stringify(p.sections));
		const n = swapImages(tree, (seed) => (SECTION_IMAGES[seed] ? null : PLACEHOLDER_IMAGE));
		if (!n) continue;
		neutralised += n;
		if (!DRY)
			await db
				.update(pages)
				.set({ sections: tree, updatedAt: new Date().toISOString() })
				.where(eq(pages.id, p.id));
	}

	// A relink that the render cache keeps serving from a 7-day TTL is not a relink.
	if (!DRY && (relinked || sectionsSwapped || neutralised)) await clearCache(db).catch(() => {});

	console.log(
		JSON.stringify(
			{
				dry: DRY,
				stubs: stubs.length,
				imported,
				skipped,
				relinked,
				sectionsSwapped,
				neutralised,
				unresolved,
				missed,
			},
			null,
			2,
		),
	);
}

await main();
