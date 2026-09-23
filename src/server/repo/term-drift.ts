import { and, asc, eq } from "drizzle-orm";

import {
	type CategoryFilter,
	missingCategoryTerms,
	publicationCategoryFilters,
} from "#/lib/term-drift";
import type { DB } from "../db";
import { pages, terms } from "../schema";

const TENANT = 1;

/** Publication categories a page filters by that no term carries. */
export async function publicationCategoryDrift(
	db: DB,
): Promise<CategoryFilter[]> {
	const pageRows = await db
		.select({ slug: pages.slug, sections: pages.sections })
		.from(pages)
		.where(eq(pages.tenantId, TENANT))
		.orderBy(asc(pages.slug));
	const have = await db
		.select({ key: terms.key })
		.from(terms)
		.where(
			and(
				eq(terms.tenantId, TENANT),
				eq(terms.taxonomy, "publication_category"),
			),
		);
	return missingCategoryTerms(
		publicationCategoryFilters(pageRows),
		have.map((t) => t.key),
	);
}
