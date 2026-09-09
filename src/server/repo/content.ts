import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { SectionNode } from "#/lib/sections";
import type { DB } from "../db";
import { renderBody } from "../richtext";
import {
	media,
	pages,
	postMedia,
	posts,
	slugRedirects,
	terms,
} from "../schema";
import {
	getDefaultLang,
	resolveOne,
	resolveOneWithFallback,
	resolveTranslations,
	resolveWithFallback,
} from "./i18n";
import { resolveSections } from "./sections";

const TENANT = 1;

/** A term with no label in any language still has to be pickable, so the key stands in. */
async function labelTerms<R extends { id: number; key: string }>(
	db: DB,
	rows: R[],
	lang: string | undefined,
): Promise<(Omit<R, "id"> & { label: string })[]> {
	const labels = await resolveTranslations(
		db,
		"term",
		rows.map((r) => r.id),
		lang ?? (await getDefaultLang(db)),
	);
	return rows.map(({ id, ...rest }) => ({
		...rest,
		label: labels.get(id)?.label || rest.key,
	}));
}

/** All managed reference terms (for admin form relation selects). */
export async function listAllTerms(db: DB, lang?: string) {
	const rows = await db
		.select({ id: terms.id, taxonomy: terms.taxonomy, key: terms.key })
		.from(terms)
		.where(eq(terms.tenantId, TENANT))
		.orderBy(asc(terms.taxonomy), asc(terms.sort));
	return labelTerms(db, rows, lang);
}

/** Terms for one taxonomy. */
export async function listTerms(db: DB, taxonomy: string, lang?: string) {
	const rows = await db
		.select({ id: terms.id, key: terms.key })
		.from(terms)
		.where(and(eq(terms.tenantId, TENANT), eq(terms.taxonomy, taxonomy)))
		.orderBy(asc(terms.sort));
	return labelTerms(db, rows, lang);
}

export type ChildLink = {
	slug: string;
	title: string;
	excerpt: string;
	coverUrl: string | null;
};

export type ResolvedPage = {
	id: number;
	slug: string;
	status: string;
	title: string;
	excerpt: string; // brief — used for the menu card + SEO meta description
	coverUrl: string | null; // hero/cover image — used for the card + og:image
	body: string | null; // ProseMirror JSON (string) or null
	bodyHtml: string; // server-rendered HTML
	sections: SectionNode[] | null; // page-builder sections (dynamic ones already resolved)
	parentTitle: string | null; // breadcrumb: the structural parent's own title
	parentSlug: string | null; // where that crumb links, null when the parent is unpublished
	// only when the page has no content of its own, so a hub renders a child index
	children?: ChildLink[];
	i18nFallback: string[]; // fields showing the default language, for the inline editor
	updatedAt: string; // the version an inline save is checked against
};

/** Published direct children of a page, for rendering a hub/index. */
async function getChildPages(
	db: DB,
	parentId: number,
	lang: string,
): Promise<ChildLink[]> {
	const rows = await db
		.select()
		.from(pages)
		.where(
			and(
				eq(pages.tenantId, TENANT),
				eq(pages.parentId, parentId),
				eq(pages.status, "published"),
			),
		)
		.orderBy(asc(pages.sortOrder));
	const out: ChildLink[] = [];
	for (const r of rows) {
		const f = await resolveOne(db, "page", r.id, lang);
		let coverUrl: string | null = null;
		if (r.heroMediaId != null) {
			const [m] = await db
				.select({ url: media.url })
				.from(media)
				.where(eq(media.id, r.heroMediaId))
				.limit(1);
			coverUrl = m?.url ?? null;
		}
		out.push({
			slug: r.slug,
			title: f.title ?? r.segment ?? r.slug,
			excerpt: f.excerpt ?? "",
			coverUrl,
		});
	}
	return out;
}

/** True when a page carries no renderable content of its own. */
const isEmptyPageBody = (bodyHtml: string, sections: SectionNode[] | null) =>
	!sections?.length && !bodyHtml.replace(/<[^>]*>/g, "").trim();

/** A published page by slug, with title/excerpt/body resolved for `lang`. */
export async function getPageBySlug(
	db: DB,
	slug: string,
	lang: string,
	listPage = 1,
): Promise<ResolvedPage | null> {
	const [page] = await db
		.select()
		.from(pages)
		.where(
			and(
				eq(pages.tenantId, TENANT),
				eq(pages.slug, slug),
				eq(pages.status, "published"),
			),
		)
		.limit(1);
	if (!page) return null;

	const { fields, fallback } = await resolveOneWithFallback(
		db,
		"page",
		page.id,
		lang,
	);
	let coverUrl: string | null = null;
	if (page.heroMediaId != null) {
		const [m] = await db
			.select({ url: media.url })
			.from(media)
			.where(eq(media.id, page.heroMediaId))
			.limit(1);
		coverUrl = m?.url ?? null;
	}
	const sections =
		Array.isArray(page.sections) && page.sections.length
			? await resolveSections(db, page.sections, lang, { page: listPage })
			: null;
	const bodyHtml = renderBody(fields.body ?? null);
	// A parent page with no content of its own becomes a hub: surface its
	// published children so the URL renders a usable index, not a blank card.
	const children = isEmptyPageBody(bodyHtml, sections)
		? await getChildPages(db, page.id, lang)
		: undefined;
	let parentTitle: string | null = null;
	let parentSlug: string | null = null;
	if (page.parentId != null) {
		parentTitle =
			(await resolveOne(db, "page", page.parentId, lang)).title ?? null;
		const [parent] = await db
			.select({ slug: pages.slug, status: pages.status })
			.from(pages)
			.where(and(eq(pages.tenantId, TENANT), eq(pages.id, page.parentId)))
			.limit(1);
		// an unpublished parent is a 404, so that crumb stays plain text
		parentSlug = parent?.status === "published" ? parent.slug : null;
	}
	return {
		id: page.id,
		slug: page.slug,
		status: page.status,
		title: fields.title ?? "",
		excerpt: fields.excerpt ?? "",
		coverUrl,
		body: fields.body ?? null,
		bodyHtml,
		sections,
		parentTitle,
		parentSlug,
		children,
		i18nFallback: fallback,
		updatedAt: page.updatedAt,
	};
}

export type PostListItem = {
	id: number;
	slug: string;
	contentType: string;
	publishedAt: string | null;
	title: string;
	excerpt: string;
	image: string | null; // cover image URL (null → renderer supplies a fallback)
	i18nFallback: string[];
	/** What this row was loaded at, so an inline edit is checked against it. */
	updatedAt: string;
};

async function coverUrls(
	db: DB,
	rows: { coverMediaId: number | null }[],
): Promise<Map<number, string | null>> {
	const covers = new Map<number, string | null>();
	const ids = [
		...new Set(
			rows.map((r) => r.coverMediaId).filter((v): v is number => v != null),
		),
	];
	if (!ids.length) return covers;
	for (const m of await db
		.select({ id: media.id, url: media.url })
		.from(media)
		.where(inArray(media.id, ids)))
		covers.set(m.id, m.url);
	return covers;
}

/** Published posts of a given content type, newest first, with title/excerpt resolved. */
export async function listPosts(
	db: DB,
	contentType: string,
	lang: string,
	limit = 20,
): Promise<PostListItem[]> {
	const rows = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, contentType),
				eq(posts.status, "published"),
			),
		)
		.orderBy(desc(posts.publishedAt))
		.limit(limit);

	const { values: fields, fallback } = await resolveWithFallback(
		db,
		"post",
		rows.map((r) => r.id),
		lang,
	);
	const covers = await coverUrls(db, rows);

	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		contentType: r.contentType,
		publishedAt: r.publishedAt,
		title: fields.get(r.id)?.title ?? "",
		excerpt: fields.get(r.id)?.excerpt ?? "",
		image: r.coverMediaId != null ? (covers.get(r.coverMediaId) ?? null) : null,
		i18nFallback: fallback.get(r.id) ?? [],
		updatedAt: r.updatedAt,
	}));
}

// carries the file and counter too, so one list renders with or without a category filter
export type PublicationItem = PostListItem & {
	year: string;
	fileUrl: string | null;
	readCount: number;
	downloadCount: number;
};

/** Published publications (type=publication), newest year first, optionally one meta.category. */
export async function listPublications(
	db: DB,
	lang: string,
	category?: string,
	limit?: number,
): Promise<PublicationItem[]> {
	const rows = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, "publication"),
				eq(posts.status, "published"),
			),
		)
		.orderBy(desc(posts.publishedAt));
	const filtered = category
		? rows.filter(
				(r) =>
					String((r.meta as Record<string, unknown> | null)?.category ?? "") ===
					category,
			)
		: rows;
	// a section asks for the rows it will render; every other caller wants them all
	const picked = limit ? filtered.slice(0, limit) : filtered;
	const { values: f, fallback } = await resolveWithFallback(
		db,
		"post",
		picked.map((r) => r.id),
		lang,
	);
	const covers = await coverUrls(db, picked);
	return picked
		.map((r) => {
			const m = (r.meta ?? {}) as Record<string, unknown>;
			return {
				id: r.id,
				slug: r.slug,
				contentType: r.contentType,
				publishedAt: r.publishedAt,
				title: f.get(r.id)?.title ?? "",
				excerpt: f.get(r.id)?.excerpt ?? "",
				image:
					r.coverMediaId != null ? (covers.get(r.coverMediaId) ?? null) : null,
				i18nFallback: fallback.get(r.id) ?? [],
				updatedAt: r.updatedAt,
				year: String(m.year ?? ""),
				fileUrl: m.fileUrl ? String(m.fileUrl) : null,
				readCount: Number(m.readCount ?? 0),
				downloadCount: Number(m.downloadCount ?? 0),
			};
		})
		.sort((a, b) => b.year.localeCompare(a.year));
}

export type DocumentUse = "read" | "download";

/** Increment a post's read or download counter (meta.readCount, meta.downloadCount). */
export async function trackDocument(
	db: DB,
	id: number,
	kind: DocumentUse,
): Promise<void> {
	const [p] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.id, id)))
		.limit(1);
	if (!p) return;
	const m = (p.meta ?? {}) as Record<string, unknown>;
	const key = kind === "read" ? "readCount" : "downloadCount";
	m[key] = Number(m[key] ?? 0) + 1;
	await db.update(posts).set({ meta: m }).where(eq(posts.id, id));
}

export type JobItem = {
	id: number;
	slug: string;
	title: string;
	location: string;
	employmentType: string;
	deadline: string;
	i18nFallback: string[];
	updatedAt: string;
};

/** Active job vacancies (type=job): published and not past their deadline. */
export async function listJobs(db: DB, lang: string): Promise<JobItem[]> {
	const rows = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, "job"),
				eq(posts.status, "published"),
			),
		);
	const today = new Date().toISOString().slice(0, 10);
	const active = rows.filter((r) => {
		const dl = (r.meta as Record<string, unknown> | null)?.deadline;
		return !dl || String(dl) >= today; // hide past-deadline jobs
	});
	const { values: f, fallback } = await resolveWithFallback(
		db,
		"post",
		active.map((r) => r.id),
		lang,
	);
	return active.map((r) => {
		const m = (r.meta ?? {}) as Record<string, unknown>;
		return {
			id: r.id,
			slug: r.slug,
			title: f.get(r.id)?.title ?? "",
			location: String(m.location ?? ""),
			employmentType: String(m.employmentType ?? ""),
			deadline: String(m.deadline ?? ""),
			i18nFallback: fallback.get(r.id) ?? [],
			updatedAt: r.updatedAt,
		};
	});
}

export type VideoItem = {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	youtubeUrl: string;
	image: string | null; // cover image URL (null → renderer supplies a fallback)
	i18nFallback: string[];
	updatedAt: string;
};

/** Published videos (type=video) with their YouTube URL from meta. */
export async function listVideos(db: DB, lang: string): Promise<VideoItem[]> {
	const rows = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, "video"),
				eq(posts.status, "published"),
			),
		)
		// sqlite puts NULL last under DESC, so undated videos sink
		.orderBy(desc(posts.publishedAt), desc(posts.id));
	const { values: f, fallback } = await resolveWithFallback(
		db,
		"post",
		rows.map((r) => r.id),
		lang,
	);
	const covers = await coverUrls(db, rows);
	return rows.map((r) => {
		const m = (r.meta ?? {}) as Record<string, unknown>;
		return {
			id: r.id,
			slug: r.slug,
			title: f.get(r.id)?.title ?? "",
			excerpt: f.get(r.id)?.excerpt ?? "",
			youtubeUrl: String(m.youtube_url ?? ""),
			image:
				r.coverMediaId != null ? (covers.get(r.coverMediaId) ?? null) : null,
			i18nFallback: fallback.get(r.id) ?? [],
			updatedAt: r.updatedAt,
		};
	});
}

export type AlbumItem = {
	id: number;
	slug: string;
	title: string;
	cover: string | null;
	count: number;
	i18nFallback: string[];
	updatedAt: string;
};

/** Photo albums (type=album) with a cover and photo count. */
export async function listAlbums(db: DB, lang: string): Promise<AlbumItem[]> {
	const albums = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.contentType, "album"),
				eq(posts.status, "published"),
			),
		)
		.orderBy(desc(posts.id));
	const { values: f, fallback } = await resolveWithFallback(
		db,
		"post",
		albums.map((a) => a.id),
		lang,
	);
	const out: AlbumItem[] = [];
	for (const a of albums) {
		const pm = await db
			.select({ url: media.url })
			.from(postMedia)
			.innerJoin(media, eq(postMedia.mediaId, media.id))
			.where(eq(postMedia.postId, a.id))
			.orderBy(asc(postMedia.sort));
		out.push({
			id: a.id,
			slug: a.slug,
			title: f.get(a.id)?.title ?? "",
			cover: pm[0]?.url ?? null,
			count: pm.length,
			i18nFallback: fallback.get(a.id) ?? [],
			updatedAt: a.updatedAt,
		});
	}
	return out;
}

export type AlbumPhoto = {
	id: number;
	url: string;
	caption: string;
	captionFallback?: boolean;
};
export type ResolvedAlbum = {
	id: number;
	slug: string;
	title: string;
	photos: AlbumPhoto[];
	i18nFallback: string[];
};

const photo = (
	p: { mediaId: number; url: string | null },
	caps: Awaited<ReturnType<typeof resolveWithFallback>>,
): AlbumPhoto => ({
	id: p.mediaId,
	url: p.url ?? "",
	caption: caps.values.get(p.mediaId)?.caption ?? "",
	...(caps.fallback.get(p.mediaId)?.includes("caption")
		? { captionFallback: true }
		: {}),
});

/** A single album with its ordered photos and (translated) captions. */
export async function getAlbum(
	db: DB,
	slug: string,
	lang: string,
): Promise<ResolvedAlbum | null> {
	const [a] = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.slug, slug),
				eq(posts.contentType, "album"),
				eq(posts.status, "published"),
			),
		)
		.limit(1);
	if (!a) return null;
	const { fields: f, fallback } = await resolveOneWithFallback(
		db,
		"post",
		a.id,
		lang,
	);
	const pm = await db
		.select({ mediaId: media.id, url: media.url })
		.from(postMedia)
		.innerJoin(media, eq(postMedia.mediaId, media.id))
		.where(eq(postMedia.postId, a.id))
		.orderBy(asc(postMedia.sort));
	const caps = await resolveWithFallback(
		db,
		"media",
		pm.map((p) => p.mediaId),
		lang,
	);
	return {
		id: a.id,
		slug: a.slug,
		title: f.title ?? "",
		photos: pm.map((p) => photo(p, caps)),
		i18nFallback: fallback,
	};
}

export type ResolvedPost = {
	id: number;
	slug: string;
	contentType: string;
	status: string;
	author: string | null;
	publishedAt: string | null;
	title: string;
	excerpt: string;
	bodyHtml: string;
	coverUrl: string | null;
	gallery: AlbumPhoto[];
	// what a publication or a video is FOR: without them the detail page had to
	// fetch the whole collection listing to find one record's own file
	fileUrl: string | null;
	youtubeUrl: string | null;
	i18nFallback: string[];
	updatedAt: string; // the version an inline save is checked against
};

/** If `slug` was an old page slug, return the page's current slug (for a 301). */
export async function findPageRedirect(
	db: DB,
	slug: string,
): Promise<string | null> {
	const [r] = await db
		.select()
		.from(slugRedirects)
		.where(
			and(
				eq(slugRedirects.tenantId, TENANT),
				eq(slugRedirects.entityType, "page"),
				eq(slugRedirects.fromSlug, slug),
			),
		)
		.limit(1);
	if (!r) return null;
	const [p] = await db
		.select({ slug: pages.slug })
		.from(pages)
		.where(eq(pages.id, r.toEntityId))
		.limit(1);
	return p?.slug ?? null;
}

// (People moved out of `posts` into the dedicated `people` table — see repo/people.ts.)

/** A single post by slug, with title/excerpt resolved and body rendered to HTML. */
export async function getPostBySlug(
	db: DB,
	slug: string,
	lang: string,
): Promise<ResolvedPost | null> {
	const [post] = await db
		.select()
		.from(posts)
		.where(
			and(
				eq(posts.tenantId, TENANT),
				eq(posts.slug, slug),
				eq(posts.status, "published"),
			),
		)
		.limit(1);
	if (!post) return null;

	const { fields: f, fallback } = await resolveOneWithFallback(
		db,
		"post",
		post.id,
		lang,
	);

	let coverUrl: string | null = null;
	if (post.coverMediaId) {
		const [c] = await db
			.select({ url: media.url })
			.from(media)
			.where(eq(media.id, post.coverMediaId))
			.limit(1);
		coverUrl = c?.url ?? null;
	}

	const pm = await db
		.select({ mediaId: media.id, url: media.url })
		.from(postMedia)
		.innerJoin(media, eq(postMedia.mediaId, media.id))
		.where(eq(postMedia.postId, post.id))
		.orderBy(asc(postMedia.sort));
	const caps = await resolveWithFallback(
		db,
		"media",
		pm.map((p) => p.mediaId),
		lang,
	);

	const meta = (post.meta ?? {}) as Record<string, unknown>;
	return {
		id: post.id,
		slug: post.slug,
		contentType: post.contentType,
		status: post.status,
		author: post.author,
		publishedAt: post.publishedAt,
		title: f.title ?? "",
		excerpt: f.excerpt ?? "",
		bodyHtml: renderBody(f.body ?? null),
		coverUrl,
		gallery: pm.map((p) => photo(p, caps)),
		fileUrl: meta.fileUrl ? String(meta.fileUrl) : null,
		youtubeUrl: meta.youtube_url ? String(meta.youtube_url) : null,
		i18nFallback: fallback,
		updatedAt: post.updatedAt,
	};
}
