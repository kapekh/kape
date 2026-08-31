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
			`import { db } from "${root}/src/server/db.ts";
			 import { getNavTree } from "${root}/src/server/repo/nav.ts";
			 const exec = (s) => db.$client.query(s).run();
			 const id = (s) => Number(db.$client.query(s).get().id);

			 exec("delete from nav_items");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (1,1,null,0,'page','what-we-do')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (2,1,1,0,'none','')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (3,1,2,0,'page','projects/iep')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (4,1,3,0,'page','projects/iep/dwd')");
			 exec("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref) values (5,1,1,1,'page','projects/ngs')");
			 for (const i of [1,2,3,4,5])
			   exec("insert into translations (entity_type, entity_id, lang, field, value) values ('nav_item'," + i + ",'en','label','item" + i + "')");

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
