import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// the browser is not a trust boundary; bun:sqlite cannot load in a vitest worker, so the caller shells out
const MARKER = "__C10_RESULT__"; // must match test-caller.ts

type Step = { call: string; input?: unknown } | { sql: string };
type Row = Record<string, unknown>;
type Result =
	| { ok: true; value: unknown }
	| { ok: false; error: string; code: string | null }
	| { rows: Row[] };

const dir = mkdtempSync(join(tmpdir(), "c10-trpc-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let scratch = 0;

function run(steps: Step[]): Result[] {
	const stdout = execFileSync("bun", ["src/integrations/trpc/test-caller.ts"], {
		input: JSON.stringify({ steps }),
		encoding: "utf8",
		env: {
			...process.env,
			DATABASE_PATH: join(dir, `scratch-${++scratch}.db`),
			SSG_CACHE: "off",
		},
	});
	const at = stdout.indexOf(MARKER);
	if (at < 0) throw new Error(`caller printed no ${MARKER}:\n${stdout}`);
	return JSON.parse(stdout.slice(at + MARKER.length)) as Result[];
}

const failed = (r: Result) => ("ok" in r && r.ok === false ? r : null);
const rowsOf = (r: Result): Row[] => ("rows" in r ? r.rows : []);

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
