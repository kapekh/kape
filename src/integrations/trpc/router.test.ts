import { afterAll, describe, expect, it } from "vitest";

import { failed, planRunner, type Result, rowsOf } from "./test-run";

const { run, dispose } = planRunner();
afterAll(dispose);

type Usage = { kind: string; label: string; href: string | null };
function usageOf(r: Result): Usage[] {
	if (!("ok" in r) || !r.ok)
		throw new Error(`call failed: ${JSON.stringify(r)}`);
	return r.value as Usage[];
}

const IMAGE_DOC = (url: string) =>
	JSON.stringify({
		type: "doc",
		content: [{ type: "image", attrs: { src: url } }],
	});

const EMBEDDED = "/uploads/c10-embedded.png";

/** Three images: one embedded in content, one referenced by a key, one loose. */
const seedMedia = {
	sql: `INSERT INTO media (id, tenant_id, r2_key, url, content_type, size) VALUES
		(1, 1, 'uploads/c10-embedded.png', '${EMBEDDED}', 'image/png', 10),
		(2, 1, 'uploads/c10-unused.png',   '/uploads/c10-unused.png',   'image/png', 10),
		(3, 1, 'uploads/c10-cover.png',    '/uploads/c10-cover.png',    'image/png', 10)
		RETURNING id`,
};

const makePage = {
	call: "adminPages.create",
	input: {
		segment: "c10-page",
		parentId: null,
		status: "published",
		coverMediaId: null,
		sections: [
			{ id: "s1", type: "richtext", props: { body: IMAGE_DOC(EMBEDDED) } },
		],
		translations: [{ lang: "en", title: "C10 page", excerpt: "", body: "" }],
	},
};

const makePostWithBody = {
	call: "adminPosts.create",
	input: {
		contentType: "news",
		slug: "c10-post",
		status: "published",
		translations: [
			{ lang: "en", title: "C10 post", excerpt: "", body: IMAGE_DOC(EMBEDDED) },
		],
	},
};

const makePostWithCover = {
	call: "adminPosts.create",
	input: {
		contentType: "news",
		slug: "c10-cover-post",
		status: "published",
		coverMediaId: 3,
		translations: [
			{ lang: "en", title: "C10 cover post", excerpt: "", body: "" },
		],
	},
};

describe("adminSettings.set", () => {
	const out = run([
		{
			call: "adminSettings.set",
			input: { key: "theme_primary", value: "banana" },
		},
		{ sql: "SELECT key, value FROM site_settings WHERE key = 'theme_primary'" },
		{
			call: "adminSettings.set",
			input: { key: "theme_primary", value: "rebeccapurple" },
		},
		{ sql: "SELECT key, value FROM site_settings WHERE key = 'theme_primary'" },
	]);

	it("refuses a theme value CSS cannot parse, and stores nothing", () => {
		const refusal = failed(out[0]);
		expect(refusal?.error).toMatch(
			/"banana" is not one of the CSS colour names/,
		);
		expect(refusal?.code).toBe("BAD_REQUEST");
		expect(rowsOf(out[1])).toEqual([]);
	});

	it("stores a value CSS can parse, so the refusal is the check and not the path", () => {
		expect(failed(out[2])).toBeNull();
		expect(rowsOf(out[3])).toEqual([
			{ key: "theme_primary", value: "rebeccapurple" },
		]);
	});
});

describe("adminMedia.usage", () => {
	const out = run([
		seedMedia,
		makePage,
		makePostWithBody,
		makePostWithCover,
		{ call: "adminMedia.usage", input: { id: 1 } },
		{ call: "adminMedia.usage", input: { id: 2 } },
		{ call: "adminMedia.usage", input: { id: 3 } },
	]);

	it("reports an image embedded in a page section and in a post body", () => {
		expect(usageOf(out[4])).toEqual([
			{ kind: "Page content", label: "c10-page", href: "/admin/pages/1" },
			{ kind: "Post text", label: "c10-post", href: "/admin/posts/1" },
		]);
	});

	it("still reports a foreign-key reference, and still calls an unused image unused", () => {
		expect(usageOf(out[5])).toEqual([]);
		expect(usageOf(out[6])).toEqual([
			{ kind: "Post cover", label: "c10-cover-post", href: "/admin/posts/2" },
		]);
	});
});

describe("adminMedia.delete", () => {
	const out = run([
		seedMedia,
		makePage,
		makePostWithCover,
		{ call: "adminMedia.delete", input: { id: 1 } },
		{ sql: "SELECT id FROM media WHERE id = 1" },
		{ sql: "SELECT sections FROM pages WHERE id = 1" },
		{ call: "adminMedia.delete", input: { id: 2 } },
		{ sql: "SELECT id FROM media WHERE id = 2" },
		{ call: "adminMedia.delete", input: { id: 3 } },
		{ sql: "SELECT id, cover_media_id FROM posts" },
	]);

	it("refuses to unlink bytes a page still points at, and names the page", () => {
		const refusal = failed(out[3]);
		expect(refusal?.error).toMatch(/still in the content of 1 place/);
		expect(refusal?.error).toMatch(/Page content: c10-page/);
		expect(refusal?.code).toBe("BAD_REQUEST");
		// the row survives the refusal, so the file behind it is still servable
		expect(rowsOf(out[4])).toHaveLength(1);
		// and the refusal did not quietly edit the page to make itself true
		expect(String(rowsOf(out[5])[0]?.sections)).toContain(EMBEDDED);
	});

	it("deletes an image nothing references", () => {
		expect(failed(out[6])).toBeNull();
		expect(rowsOf(out[7])).toEqual([]);
	});

	it("deletes an image held only by a foreign key, clearing the key", () => {
		expect(failed(out[8])).toBeNull();
		expect(rowsOf(out[9])).toEqual([{ id: 1, cover_media_id: null }]);
	});
});

describe("posts.publications", () => {
	const PROBE = 30;
	const out = run([
		{
			sql: `INSERT OR IGNORE INTO content_types (key, name, sort) VALUES ('publication', 'Publications', 1)`,
		},
		{
			sql: `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${PROBE})
				INSERT INTO posts (tenant_id, content_type, slug, status, published_at, meta)
				SELECT 1, 'publication', 'c10-pub-' || i, 'published',
					date('2024-01-01', '-' || i || ' days'),
					json_object('fileUrl', '/uploads/c10-' || i || '.pdf', 'year', '2024')
				FROM n RETURNING id`,
		},
		{ call: "posts.publications", input: { lang: "en", category: "" } },
	]);

	// the detail page reads one publication's file out of this list, so a row the
	// list drops is a document nobody can open
	it("returns every publication, not just a page of them", () => {
		expect(failed(out[2])).toBeNull();
		const value = ("ok" in out[2] && out[2].ok ? out[2].value : []) as {
			slug: string;
			fileUrl: string | null;
		}[];
		expect(value).toHaveLength(PROBE);
		expect(value.find((p) => p.slug === `c10-pub-${PROBE}`)?.fileUrl).toBe(
			`/uploads/c10-${PROBE}.pdf`,
		);
	});
});

describe("posts.trackDocument", () => {
	const out = run([
		{
			sql: `INSERT OR IGNORE INTO content_types (key, name, sort) VALUES ('publication', 'Publications', 1)`,
		},
		{
			sql: `INSERT INTO posts (id, tenant_id, content_type, slug, status, published_at, meta) VALUES
				(901, 1, 'publication', 'c10-track', 'published', '2024-01-01',
					json_object('fileUrl', '/uploads/c10-track.pdf'))
				RETURNING id`,
		},
		{ call: "posts.trackDocument", input: { id: 901, kind: "read" } },
		{ call: "posts.trackDocument", input: { id: 901, kind: "read" } },
		{ call: "posts.trackDocument", input: { id: 901, kind: "download" } },
		{
			sql: `SELECT json_extract(meta, '$.readCount') AS reads,
				json_extract(meta, '$.downloadCount') AS downloads
				FROM posts WHERE id = 901`,
		},
		{ call: "posts.publications", input: { lang: "en", category: "" } },
	]);

	it("moves only the counter the visitor used", () => {
		expect(failed(out[2])).toBeNull();
		expect(rowsOf(out[5])).toEqual([{ reads: 2, downloads: 1 }]);
	});

	it("hands both counters to the listing", () => {
		const value = ("ok" in out[6] && out[6].ok ? out[6].value : []) as {
			slug: string;
			readCount: number;
			downloadCount: number;
		}[];
		expect(value.find((p) => p.slug === "c10-track")).toMatchObject({
			readCount: 2,
			downloadCount: 1,
		});
	});
});

describe("a publication and a video resolve with what they are for", () => {
	const out = run([
		{
			sql: `INSERT OR IGNORE INTO content_types (key, name, sort) VALUES
				('publication', 'Publications', 1), ('video', 'Videos', 2) RETURNING key`,
		},
		{
			sql: `INSERT INTO posts (tenant_id, content_type, slug, status, published_at, meta) VALUES
				(1, 'publication', 'c10-doc', 'published', '2024-01-01',
					json_object('fileUrl', '/uploads/c10-doc.pdf')),
				(1, 'video', 'c10-clip', 'published', '2024-01-01',
					json_object('youtube_url', 'https://youtu.be/c10clip')),
				(1, 'news', 'c10-plain', 'published', '2024-01-01', json_object())
				RETURNING id`,
		},
		{
			call: "routes.resolve",
			input: { path: "publications/c10-doc", lang: "en" },
		},
		{ call: "routes.resolve", input: { path: "videos/c10-clip", lang: "en" } },
		{ call: "routes.resolve", input: { path: "news/c10-plain", lang: "en" } },
	]);

	// the detail page used to fetch the whole collection listing to find one
	// record's own file, so the record has to carry it
	const post = (r: Result) => {
		if (!("ok" in r) || !r.ok)
			throw new Error(`call failed: ${JSON.stringify(r)}`);
		return (
			r.value as {
				post?: { fileUrl: string | null; youtubeUrl: string | null };
			}
		).post;
	};

	it("hands the publication its file", () => {
		expect(post(out[2])).toMatchObject({
			fileUrl: "/uploads/c10-doc.pdf",
			youtubeUrl: null,
		});
	});

	it("hands the video its url", () => {
		expect(post(out[3])).toMatchObject({
			fileUrl: null,
			youtubeUrl: "https://youtu.be/c10clip",
		});
	});

	it("leaves both null on a post that is neither", () => {
		expect(post(out[4])).toMatchObject({ fileUrl: null, youtubeUrl: null });
	});
});

describe("unpublished content stays off the public API", () => {
	const draftPage = {
		call: "adminPages.create",
		input: {
			segment: "c10-draft",
			parentId: null,
			status: "draft",
			coverMediaId: null,
			sections: [],
			translations: [{ lang: "en", title: "C10 draft", excerpt: "", body: "" }],
		},
	};
	const draftPost = {
		call: "adminPosts.create",
		input: {
			contentType: "news",
			slug: "c10-draft-post",
			status: "draft",
			translations: [
				{ lang: "en", title: "C10 draft post", excerpt: "", body: "" },
			],
		},
	};
	const out = run([
		draftPage,
		makePage,
		draftPost,
		makePostWithBody,
		{ call: "pages.bySlug", input: { slug: "c10-draft", lang: "en" } },
		{ call: "pages.bySlug", input: { slug: "c10-page", lang: "en" } },
		{
			call: "routes.resolve",
			input: { path: "news/c10-draft-post", lang: "en" },
		},
		{ call: "routes.resolve", input: { path: "news/c10-post", lang: "en" } },
	]);

	const value = (r: Result) => ("ok" in r && r.ok ? r.value : null);

	it("hides a draft page from pages.bySlug but still serves a published one", () => {
		expect(value(out[4])).toBeNull();
		expect((value(out[5]) as { slug?: string } | null)?.slug).toBe("c10-page");
	});

	it("resolves a draft post's url to notfound but a published one to an article", () => {
		expect((value(out[6]) as { kind?: string } | null)?.kind).toBe("notfound");
		expect((value(out[7]) as { kind?: string } | null)?.kind).toBe("article");
	});
});

describe("a listing section split across numbered pages", () => {
	const listing = {
		call: "adminPages.create",
		input: {
			segment: "c10-paged",
			parentId: null,
			status: "published",
			coverMediaId: null,
			sections: [
				{
					id: "list",
					type: "postList",
					layout: "grid-3",
					query: { source: "posts", contentType: "news" },
					props: { title: "News", perPage: "2" },
				},
			],
			translations: [{ lang: "en", title: "C10 paged", excerpt: "", body: "" }],
		},
	};
	const out = run([
		listing,
		{
			sql: `INSERT INTO posts (tenant_id, content_type, slug, status, published_at, meta) VALUES
				(1, 'news', 'c10-p1', 'published', '2024-01-01', json_object()),
				(1, 'news', 'c10-p2', 'published', '2024-01-02', json_object()),
				(1, 'news', 'c10-p3', 'published', '2024-01-03', json_object()),
				(1, 'news', 'c10-p4', 'published', '2024-01-04', json_object()),
				(1, 'news', 'c10-p5', 'published', '2024-01-05', json_object())
				RETURNING id`,
		},
		{ call: "routes.resolve", input: { path: "c10-paged", lang: "en" } },
		{
			call: "routes.resolve",
			input: { path: "c10-paged", lang: "en", page: 2 },
		},
		{
			call: "routes.resolve",
			input: { path: "c10-paged", lang: "en", page: 9 },
		},
	]);

	type Listed = {
		data: { slug: string }[];
		pageInfo: {
			page: number;
			perPage: number;
			total: number;
			totalPages: number;
		};
	};
	const list = (r: Result): Listed => {
		if (!("ok" in r) || !r.ok)
			throw new Error(`call failed: ${JSON.stringify(r)}`);
		return (r.value as { page: { sections: { props: Listed }[] } }).page
			.sections[0].props;
	};

	it("serves the first page, newest first, and counts the whole list", () => {
		expect(list(out[2]).data.map((p) => p.slug)).toEqual(["c10-p5", "c10-p4"]);
		expect(list(out[2]).pageInfo).toEqual({
			page: 1,
			perPage: 2,
			total: 5,
			totalPages: 3,
		});
	});

	it("serves the next slice at ?page=2", () => {
		expect(list(out[3]).data.map((p) => p.slug)).toEqual(["c10-p3", "c10-p2"]);
		expect(list(out[3]).pageInfo.page).toBe(2);
	});

	it("clamps a page past the end to the last one rather than serving nothing", () => {
		expect(list(out[4]).data.map((p) => p.slug)).toEqual(["c10-p1"]);
		expect(list(out[4]).pageInfo.page).toBe(3);
	});
});

describe("the crumb back to a page's parent", () => {
	const parent = (segment: string, status: string) => ({
		call: "adminPages.create",
		input: {
			segment,
			parentId: null,
			status,
			coverMediaId: null,
			sections: [],
			translations: [{ lang: "en", title: segment, excerpt: "", body: "" }],
		},
	});
	const child = (segment: string, parentId: number) => ({
		call: "adminPages.create",
		input: {
			segment,
			parentId,
			status: "published",
			coverMediaId: null,
			sections: [],
			translations: [{ lang: "en", title: segment, excerpt: "", body: "" }],
		},
	});
	const out = run([
		parent("c10-live-parent", "published"),
		child("c10-live-kid", 1),
		parent("c10-draft-parent", "draft"),
		child("c10-draft-kid", 3),
		{
			call: "routes.resolve",
			input: { path: "c10-live-parent/c10-live-kid", lang: "en" },
		},
		{
			call: "routes.resolve",
			input: { path: "c10-draft-parent/c10-draft-kid", lang: "en" },
		},
	]);

	const crumb = (r: Result) => {
		if (!("ok" in r) || !r.ok)
			throw new Error(`call failed: ${JSON.stringify(r)}`);
		const { page } = r.value as {
			page: { parentTitle: string | null; parentSlug: string | null };
		};
		return page;
	};

	it("names the parent and where it lives", () => {
		expect(crumb(out[4])).toMatchObject({
			parentTitle: "c10-live-parent",
			parentSlug: "c10-live-parent",
		});
	});

	it("leaves an unpublished parent unlinked, since that crumb would 404", () => {
		expect(crumb(out[5])).toMatchObject({
			parentTitle: "c10-draft-parent",
			parentSlug: null,
		});
	});
});

describe("what the public reads", () => {
	const out = run([
		{ call: "site.view", input: { path: "/en/news" } },
		{ call: "site.view", input: { path: "/km/news" } },
		{ call: "site.view", input: { path: "/en/who-we-are" } },
		{ call: "site.view", input: { path: "/en/admin" } },
		{ sql: "SELECT path, count FROM page_views ORDER BY count DESC" },
		{
			sql: `INSERT OR IGNORE INTO content_types (key, name, sort)
				VALUES ('publication', 'Publication', 5) RETURNING key`,
		},
		{
			sql: `INSERT INTO posts (tenant_id, content_type, slug, status, published_at, meta) VALUES
				(1, 'publication', 'c10-read-a', 'published', '2024-01-01',
					json_object('readCount', 7, 'downloadCount', 1)),
				(1, 'publication', 'c10-read-b', 'published', '2024-01-02',
					json_object('readCount', 2, 'downloadCount', 4)),
				(1, 'publication', 'c10-read-c', 'published', '2024-01-03',
					json_object('downloadCount', 3)),
				(1, 'publication', 'c10-read-d', 'published', '2024-01-04', json_object())
				RETURNING id`,
		},
		{ call: "admin.readership", input: { lang: "en" } },
	]);

	type Report = {
		pages: { path: string; count: number }[];
		documents: { slug: string; reads: number; downloads: number }[];
		totalViews: number;
		totalReads: number;
		totalDownloads: number;
	};
	const report = (r: Result): Report => {
		if (!("ok" in r) || !r.ok)
			throw new Error(`call failed: ${JSON.stringify(r)}`);
		return r.value as Report;
	};

	it("files both languages of a page under one path and skips the admin", () => {
		expect(rowsOf(out[4])).toEqual([
			{ path: "/news", count: 2 },
			{ path: "/who-we-are", count: 1 },
		]);
	});

	it("ranks pages by views and reports the total", () => {
		expect(report(out[7]).pages).toEqual([
			{ path: "/news", count: 2, lastViewedAt: expect.any(String) },
			{ path: "/who-we-are", count: 1, lastViewedAt: expect.any(String) },
		]);
		expect(report(out[7]).totalViews).toBe(3);
	});

	it("ranks documents by opens and leaves out the ones nobody opened", () => {
		expect(
			report(out[7]).documents.map((d) => [d.slug, d.reads, d.downloads]),
		).toEqual([
			["c10-read-a", 7, 1],
			["c10-read-b", 2, 4],
			["c10-read-c", 0, 3],
		]);
		expect(report(out[7]).totalReads).toBe(9);
		expect(report(out[7]).totalDownloads).toBe(8);
	});
});
