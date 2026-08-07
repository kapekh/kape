import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Calls tRPC procedures for real. The browser is not a trust boundary, so a
 * check that only the page performs is no check at all — and until this existed
 * nothing could reach a procedure to find out.
 *
 * `bun:sqlite` cannot load inside a vitest worker, so the caller runs under Bun
 * in `test-caller.ts` and reports back as JSON. Same reason install.test.ts
 * shells out.
 */
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
