import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import type { NavNode } from "./nav";

const dir = mkdtempSync(join(tmpdir(), "nav-tree-"));
const dbPath = join(dir, "nav.db");
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

const tree: NavNode[] = JSON.parse(
	execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
			 import { getNavTree } from "${root}/src/server/repo/nav.ts";
			 const exec = (s) => raw.query(s).run();
			 const id = (s) => Number(raw.query(s).get().id);

			 exec("delete from nav_items");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (1,1,null,0,'page','what-we-do')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (2,1,1,0,'none','')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (3,1,2,0,'page','projects/iep')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (4,1,3,0,'page','projects/iep/dwd')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (5,1,1,1,'page','projects/ngs')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (6,1,1,2,'project_list','current')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (7,1,1,3,'project_list','past')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (8,1,6,0,'url','https://example.org')");
			 for (const i of [1,2,3,4,5,6,7,8])
			   exec("insert into translations (entity_type, entity_id, lang, field, value) values ('nav_item'," + i + ",'en','label','item" + i + "')");
			 exec("delete from projects");
			 exec("insert into projects (id, tenant_id, code, slug, status, sort) values (1,1,'NGS','ngs','current',1)");
			 exec("insert into projects (id, tenant_id, code, slug, status, sort) values (2,1,'IEP','iep','current',0)");
			 exec("insert into projects (id, tenant_id, code, slug, status, sort, parent_id) values (3,1,'DWD','dwd','current',0,2)");
			 exec("insert into projects (id, tenant_id, code, slug, status, sort) values (4,1,'IBEC','ibec','past',0)");
			 exec("insert into translations (entity_type, entity_id, lang, field, value) values ('project',2,'en','summary','Inclusive Education Project')");

			 console.log(JSON.stringify(await getNavTree(db, "en")));`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	).trim(),
);

const find = (nodes: NavNode[], id: number): NavNode | undefined => {
	for (const n of nodes) {
		if (n.id === id) return n;
		const hit = find(n.children, id);
		if (hit) return hit;
	}
	return undefined;
};

describe("nav tree hrefs", () => {
	it("makes a top-level item with children a dropdown trigger, not a link", () => {
		expect(find(tree, 1)?.href).toBeNull();
	});

	it("keeps the link on a menu item that gained children of its own", () => {
		expect(find(tree, 3)?.href).toBe("/projects/iep");
	});

	it("still renders those children under it", () => {
		expect(find(tree, 3)?.children.map((c) => c.href)).toEqual([
			"/projects/iep/dwd",
		]);
	});

	it("leaves a childless leaf alone", () => {
		expect(find(tree, 5)?.href).toBe("/projects/ngs");
	});
});

// the menu lists the projects table, so a project added in the admin needs no nav edit
describe("project groups", () => {
	const current = find(tree, 6);
	const past = find(tree, 7);

	it("lists the top-level projects of its status, in sort order, by code", () => {
		expect(current?.children.map((c) => c.label)).toEqual([
			"IEP",
			"NGS",
			"item8",
		]);
		expect(past?.children.map((c) => c.label)).toEqual(["IBEC"]);
	});

	it("links each project where the site serves it", () => {
		expect(current?.children.map((c) => c.href)).toEqual([
			"/projects/iep",
			"/projects/ngs",
			"https://example.org",
		]);
	});

	it("nests a sub-project under its parent", () => {
		expect(find(tree, -2)?.children.map((c) => c.href)).toEqual([
			"/projects/iep/dwd",
		]);
	});

	it("describes a project with its summary", () => {
		expect(find(tree, -2)?.description).toBe("Inclusive Education Project");
	});

	it("keeps the group itself a heading, not a link", () => {
		expect(current?.href).toBeNull();
	});
});
