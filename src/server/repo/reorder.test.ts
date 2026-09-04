import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// driven through the repo against a real installed database: what is under test is the transaction it writes
const dir = mkdtempSync(join(tmpdir(), "reorder-"));
const dbPath = join(dir, "reorder.db");
const root = process.cwd();

afterAll(() => rmSync(dir, { recursive: true, force: true }));

execFileSync("bun", ["src/server/install.ts"], {
	env: {
		...process.env,
		DATABASE_PATH: dbPath,
		SITE_NAME: "Test Org",
		ADMIN_EMAIL: "owner@test.example",
		ADMIN_PASSWORD: "test-install-password",
		SSG_CACHE: "off",
	},
	encoding: "utf8",
});

/** Run a script against the installed database; it prints one JSON object. */
function run(body: string): Record<string, unknown> {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 import * as reorder from "${root}/src/server/repo/reorder.ts";
			 const q = (s, ...a) => db.$client.query(s).all(...a);
			 const exec = (s, ...a) => db.$client.query(s).run(...a);
			 const refusal = async (fn) => { try { await fn(); return ""; } catch (e) { return e.message; } };
			 const out = {};
			 ${body}
			 console.log(JSON.stringify(out));
			 process.exit(0);`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	);
	return JSON.parse(out.trim().split("\n").pop() ?? "{}");
}

const fivePeople = `
	exec("delete from people");
	for (const i of [1, 2, 3, 4, 5])
		exec("insert into people (id, tenant_id, name_en, tier, sort) values (?, 1, 'P' || ?, 'staff', ?)", i, i, i - 1);
	const people = () => q("select id, sort from people order by id");
`;

describe("reordering a subset of a list", () => {
	const res = run(`${fivePeople}
		await reorder.reorderPeople(db, [4, 2]);
		out.after = people();
		await reorder.reorderPeople(db, [1, 99, 1]);
		out.unknown = people();
	`);

	it("puts the moved ids in the slots they occupied and leaves the rest alone", () => {
		// 2 and 4 held slots 1 and 3; the order given fills them as 4 then 2
		expect(res.after).toEqual([
			{ id: 1, sort: 0 },
			{ id: 2, sort: 3 },
			{ id: 3, sort: 2 },
			{ id: 4, sort: 1 },
			{ id: 5, sort: 4 },
		]);
	});

	it("ignores ids that are not in the scope", () => {
		expect(res.unknown).toEqual(res.after);
	});
});

describe("reordering a list the seeds left with duplicate sort values", () => {
	const res = run(`
		// a seed leaves every project on the same sort
		for (const i of [1, 2, 3, 4])
			exec("insert into projects (id, tenant_id, code, slug, sort) values (?, 1, 'P' || ?, 'p' || ?, 1)", i, i, i);
		out.before = q("select count(distinct sort) as c from projects")[0].c;
		out.ids = q("select id from projects order by id").map((r) => r.id);
		await reorder.reorderProjects(db, [3, 1]);
		out.after = q("select id, sort from projects order by sort");
	`);

	it("starts from rows that all share one sort", () => {
		expect(res.before).toBe(1);
		expect(res.ids).toEqual([1, 2, 3, 4]);
	});

	it("comes out numbered 0..n-1 with no duplicates", () => {
		const rows = res.after as { id: number; sort: number }[];
		expect(rows.map((r) => r.sort)).toEqual(rows.map((_, i) => i));
	});

	it("swaps the two ids given, tie-broken by id, and holds every other row", () => {
		const ids = res.ids as number[];
		const rows = res.after as { id: number; sort: number }[];
		const swapped = [...ids];
		swapped[0] = ids[2];
		swapped[2] = ids[0];
		expect(rows.map((r) => r.id)).toEqual(swapped);
	});
});

describe("reordering nav items across two levels", () => {
	const res = run(`
		exec("delete from nav_items");
		const add = (id, parent, sort) =>
			exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (?, 1, ?, ?, 'none', '')", id, parent, sort);
		add(1, null, 0);
		add(2, null, 1);
		add(3, null, 2);
		add(10, 1, 0);
		add(11, 1, 1);
		// 10 and 11 are children of 1, so a payload that names them alongside 3 must drop them
		await reorder.reorderNavItems(db, [3, 1, 10, 11]);
		out.top = q("select id, sort from nav_items where parent_id is null order by sort");
		out.kids = q("select id, sort from nav_items where parent_id = 1 order by sort");
	`);

	it("reorders only the level the first id belongs to", () => {
		expect(res.top).toEqual([
			{ id: 3, sort: 0 },
			{ id: 2, sort: 1 },
			{ id: 1, sort: 2 },
		]);
	});

	it("leaves the other level untouched", () => {
		expect(res.kids).toEqual([
			{ id: 10, sort: 0 },
			{ id: 11, sort: 1 },
		]);
	});
});

describe("reordering the sections of a page", () => {
	const res = run(`
		const node = (id, title) => ({
			id,
			type: "richtext",
			props: { title, body: id + " body", i18n: { km: { title: "ខ្មែរ " + id } } },
		});
		const pageId = await admin.createPage(db, {
			slug: "",
			segment: "reorder-sections",
			parentId: null,
			status: "published",
			coverMediaId: null,
			sections: [node("a", "First"), node("b", "Second"), node("c", "Third")],
			translations: [{ lang: "en", title: "Sections", excerpt: "", body: "" }],
		});
		const sections = () =>
			JSON.parse(q("select sections from pages where id = ?", pageId)[0].sections);
		const version = () => q("select updated_at as v from pages where id = ?", pageId)[0].v;

		const loaded = version();
		const first = await reorder.reorderSections(db, pageId, ["c", "a"], loaded);
		out.order = sections().map((s) => s.id);
		out.node = sections().find((s) => s.id === "c");
		out.stamped = first.updatedAt !== loaded;

		out.refusal = await refusal(() =>
			reorder.reorderSections(db, pageId, ["a", "b", "c"], loaded),
		);
		out.orderAfterRefusal = sections().map((s) => s.id);
		out.unchecked = (await reorder.reorderSections(db, pageId, ["b", "c", "a"])).updatedAt !== null;
		out.orderUnchecked = sections().map((s) => s.id);
	`);

	it("moves the named nodes into the slots they held", () => {
		expect(res.order).toEqual(["c", "b", "a"]);
		expect(res.stamped).toBe(true);
	});

	it("carries each node's props and language overlay with it", () => {
		expect(res.node).toEqual({
			id: "c",
			type: "richtext",
			props: {
				title: "Third",
				body: "c body",
				i18n: { km: { title: "ខ្មែរ c" } },
			},
		});
	});

	it("refuses a stale version and leaves the stored order as it was", () => {
		expect(res.refusal).toBe("CONFLICT");
		expect(res.orderAfterRefusal).toEqual(["c", "b", "a"]);
	});

	it("skips the check when no version is sent", () => {
		expect(res.unchecked).toBe(true);
		expect(res.orderUnchecked).toEqual(["b", "c", "a"]);
	});
});

describe("reordering a page whose sections share an id", () => {
	const res = run(`
		const node = (id) => ({ id, type: "richtext", props: { title: id } });
		const pageId = await admin.createPage(db, {
			slug: "",
			segment: "twin-sections",
			parentId: null,
			status: "published",
			coverMediaId: null,
			sections: [node("a"), node("a"), node("b")],
			translations: [{ lang: "en", title: "Twins", excerpt: "", body: "" }],
		});
		out.refusal = await refusal(() => reorder.reorderSections(db, pageId, ["b", "a"]));
		out.after = JSON.parse(
			q("select sections from pages where id = ?", pageId)[0].sections,
		).map((s) => s.id);
	`);

	it("refuses the move rather than reporting a success that dropped a node", () => {
		expect(res.refusal).toMatch(/two sections with the same id/);
		expect(res.after).toEqual(["a", "a", "b"]);
	});
});
