import type { SectionNode } from "./sections";

/** A publication category a page's section filters by. */
export type CategoryFilter = {
	/** The page's path, as `/media/ai-digital`. */
	path: string;
	/** The `publication_category` key the section filters on. */
	key: string;
};

export type PageSections = { slug: string; sections: SectionNode[] | null };

// `publicationList` is the section kind, but `query.source` is what the resolver
// reads when it filters by a publication category
const filtersPublications = (n: SectionNode) =>
	n.query?.source === "publications" && Boolean(n.query.category);

/** Every publication category a page filters by, once per key; the first page wins. */
export function publicationCategoryFilters(
	pages: PageSections[],
): CategoryFilter[] {
	const found = new Map<string, CategoryFilter>();
	for (const page of pages)
		for (const section of page.sections ?? []) {
			if (!filtersPublications(section)) continue;
			const key = section.query?.category;
			if (!key || found.has(key)) continue;
			found.set(key, { path: `/${page.slug}`, key });
		}
	return [...found.values()];
}

/** The filters whose key no term carries: a page nothing can ever be filed into. */
export function missingCategoryTerms(
	filters: CategoryFilter[],
	termKeys: Iterable<string>,
): CategoryFilter[] {
	const have = new Set(termKeys);
	return filters.filter((f) => !have.has(f.key));
}
