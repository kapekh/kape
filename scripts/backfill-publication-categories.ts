/**
 * Gives every publication category a page filters by the term it is missing, so
 * the category can be picked when a publication is uploaded.
 *
 *   bun scripts/backfill-publication-categories.ts --db ./cms.db
 *   bun scripts/backfill-publication-categories.ts --db ./cms.db --apply
 *
 * Reads the pages of the named database, never the app's own. Dry run without
 * `--apply`. Only ever inserts: an existing term is left exactly as it is.
 */
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { and, asc, eq, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import {
	missingCategoryTerms,
	publicationCategoryFilters,
} from "#/lib/term-drift";
import { humanize } from "#/server/page-tree";
import {
	languages,
	navItems,
	pages,
	terms,
	translations,
} from "#/server/schema";

const TENANT = 1;
const TAXONOMY = "publication_category";
const USAGE =
	"usage: bun scripts/backfill-publication-categories.ts --db <path> [--apply]";

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
// `create: false`: a mistyped path must not leave an empty database behind
const sqlite = new Database(path, { readwrite: true, create: false });
const db = drizzle(sqlite);

const defaultLang =
	(
		await db
			.select({ code: languages.code })
			.from(languages)
			.where(eq(languages.isDefault, true))
			.limit(1)
	)[0]?.code ??
	(await db.select({ code: languages.code }).from(languages).limit(1))[0]?.code;
if (!defaultLang) {
	console.error(`${path} has no languages: it is not an installed site.`);
	process.exit(1);
}

/** The menu label for each page, which is what staff call the category. */
async function navLabels() {
	const rows = await db
		.select({ slug: navItems.targetRef, label: translations.value })
		.from(navItems)
		.innerJoin(
			translations,
			and(
				eq(translations.entityType, "nav_item"),
				eq(translations.entityId, navItems.id),
				eq(translations.field, "label"),
				eq(translations.lang, defaultLang),
			),
		)
		.where(
			and(eq(navItems.tenantId, TENANT), eq(navItems.targetKind, "page")),
		);
	return new Map(rows.map((r) => [`/${r.slug}`, r.label]));
}

const pageRows = await db
	.select({ slug: pages.slug, sections: pages.sections })
	.from(pages)
	.where(eq(pages.tenantId, TENANT))
	.orderBy(asc(pages.slug));
const have = await db
	.select({ key: terms.key })
	.from(terms)
	.where(and(eq(terms.tenantId, TENANT), eq(terms.taxonomy, TAXONOMY)));

const missing = missingCategoryTerms(
	publicationCategoryFilters(pageRows),
	have.map((t) => t.key),
);

if (missing.length === 0) {
	console.log(
		`${have.length} publication categories, every filtered page covered — nothing to do.`,
	);
	process.exit(0);
}

const labels = await navLabels();
const planned = missing.map((m) => ({
	...m,
	label: labels.get(m.path) ?? humanize(m.key),
}));

console.log(
	`${planned.length} category ${planned.length === 1 ? "term" : "terms"} to add:`,
);
for (const p of planned) console.log(`  ${p.key} → "${p.label}"  (${p.path})`);

if (!apply) {
	console.log("\nDry run. Re-run with --apply to write them.");
	process.exit(0);
}

const [sorted] = await db
	.select({ top: max(terms.sort) })
	.from(terms)
	.where(and(eq(terms.tenantId, TENANT), eq(terms.taxonomy, TAXONOMY)));
const nextSort = (sorted?.top ?? -1) + 1;

// bun:sqlite wants a synchronous callback, so every read is already done above.
// A term without its label reads as done to the next run and shows staff the raw key.
const added = db.transaction((tx) => {
	let n = 0;
	for (const [i, p] of planned.entries()) {
		// the unique key is the backstop: a term added since the read stays untouched
		const [row] = tx
			.insert(terms)
			.values({
				tenantId: TENANT,
				taxonomy: TAXONOMY,
				key: p.key,
				sort: nextSort + i,
			})
			.onConflictDoNothing()
			.returning({ id: terms.id })
			.all();
		if (!row) {
			console.log(`  ${p.key}: already there, left alone`);
			continue;
		}
		tx.insert(translations)
			.values({
				tenantId: TENANT,
				entityType: "term",
				entityId: row.id,
				field: "label",
				lang: defaultLang,
				value: p.label,
			})
			.run();
		n++;
	}
	return n;
});

console.log(`\nAdded ${added}. Re-run to confirm nothing is left.`);
