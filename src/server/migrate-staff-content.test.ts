import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "migrate-staff-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const MIGRATION = "0030";

/** Every migration before 0030, then the named staff role, then 0030 twice. */
function migrate(name: string, permissions: string) {
	const script = `
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
const db = new Database(${JSON.stringify(join(dir, `${name}.db`))}, { create: true });
db.exec("PRAGMA foreign_keys = OFF;");
const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
const apply = (f) => {
	for (const s of readFileSync("drizzle/" + f, "utf8").split("--> statement-breakpoint")) {
		const t = s.trim();
		if (t) db.exec(t);
	}
};
for (const f of files) if (!f.startsWith(${JSON.stringify(MIGRATION)})) apply(f);
db.exec("PRAGMA foreign_keys = OFF;");
db.query("insert into roles (tenant_id, key, name, permissions, is_system) values (1,'staff','Staff',?,1)").run(${JSON.stringify(permissions)});
db.query("insert into roles (tenant_id, key, name, permissions, is_system) values (1,'editor','Editor','[\\"pages\\"]',0)").run();
const fix = files.find((f) => f.startsWith(${JSON.stringify(MIGRATION)}));
apply(fix);
apply(fix);
console.log(JSON.stringify(db.query("select key, permissions from roles order by key").all()));
`;
	const rows = JSON.parse(
		execFileSync("bun", ["-e", script], { encoding: "utf8" }).trim(),
	) as { key: string; permissions: string }[];
	return (key: string) =>
		JSON.parse(rows.find((r) => r.key === key)?.permissions ?? "null") as
			| string[]
			| null;
}

describe("migration 0030: staff can help with content", () => {
	it("gives the untouched staff role the portal and the editor's areas", () => {
		const perms = migrate("default", '["portal"]');
		expect(perms("staff")).toEqual([
			"portal",
			"pages",
			"posts",
			"projects",
			"media",
		]);
	});

	it("leaves a staff role an administrator has already edited alone", () => {
		const perms = migrate("edited", '["portal","messages"]');
		expect(perms("staff")).toEqual(["portal", "messages"]);
	});

	it("touches no other role", () => {
		const perms = migrate("others", '["portal"]');
		expect(perms("editor")).toEqual(["pages"]);
	});
});
