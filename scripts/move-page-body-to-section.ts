/**
 * Moves a section-less page's body into one rich text section the page builder can edit.
 *
 *   bun scripts/move-page-body-to-section.ts --db ./cms.db
 *   bun scripts/move-page-body-to-section.ts --db ./cms.db --apply
 *
 * Dry run without `--apply`. Re-runnable.
 */
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { richTextSection } from "#/lib/sections";
import { pages, renderCache, translations } from "#/server/schema";

const TENANT = 1;
const USAGE = "usage: bun scripts/move-page-body-to-section.ts --db <path> [--apply]";

function parseArgs(argv: string[]) {
	const at = argv.indexOf("--db");
	const path = at === -1 ? "" : argv[at + 1];
	if (!path || path.startsWith("--")) {
		console.error(`--db <path> is required.\n${USAGE}`);
		process.exit(2);
	}
	return { path, apply: argv.includes("--apply") };
}

const { path, apply } = parseArgs(process.argv.slice(2));
if (!existsSync(path)) {
	console.error(`No database at ${path}.`);
	process.exit(1);
}
// mistyped path must not create an empty db
const sqlite = new Database(path, { readwrite: true, create: false });
const db = drizzle(sqlite);

const noSections = or(
	isNull(pages.sections),
	sql`json_array_length(${pages.sections}) = 0`,
);

const bare = await db
	.select({ id: pages.id, slug: pages.slug })
	.from(pages)
	.where(and(eq(pages.tenantId, TENANT), noSections));
const bodies = bare.length
	? await db
			.select({
				id: translations.entityId,
				lang: translations.lang,
				value: translations.value,
			})
			.from(translations)
			.where(
				and(
					eq(translations.entityType, "page"),
					eq(translations.field, "body"),
					inArray(
						translations.entityId,
						bare.map((p) => p.id),
					),
				),
			)
	: [];

const planned = bare
	.map((p) => {
		const byLang: Record<string, string> = {};
		for (const b of bodies) if (b.id === p.id && b.value) byLang[b.lang] = b.value;
		return { ...p, byLang };
	})
	.filter((p) => Object.keys(p.byLang).length > 0);

if (planned.length === 0) {
	console.log("No page keeps its content in a body only — nothing to do.");
	process.exit(0);
}

console.log(`${planned.length} ${planned.length === 1 ? "page" : "pages"} to move:`);
for (const p of planned)
	console.log(`  /${p.slug}  (id ${p.id}, ${Object.keys(p.byLang).join(", ")})`);

if (!apply) {
	console.log("\nDry run. Re-run with --apply to move them.");
	process.exit(0);
}

// bun:sqlite transactions are sync, so reads happen above
const moved = db.transaction((tx) => {
	let n = 0;
	for (const p of planned) {
		// sections added since the read win
		const [updated] = tx
			.update(pages)
			.set({
				sections: [richTextSection(`body-${p.id}`, p.byLang)],
				updatedAt: new Date().toISOString(),
			})
			.where(and(eq(pages.id, p.id), noSections))
			.returning({ id: pages.id })
			.all();
		if (!updated) {
			console.log(`  /${p.slug}: has sections now, left alone`);
			continue;
		}
		tx.delete(translations)
			.where(
				and(
					eq(translations.entityType, "page"),
					eq(translations.entityId, p.id),
					eq(translations.field, "body"),
				),
			)
			.run();
		n++;
	}
	if (n) tx.delete(renderCache).run();
	return n;
});

console.log(`\nMoved ${moved}. Re-run to confirm nothing is left.`);
