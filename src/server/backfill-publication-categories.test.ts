import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// a Bun subprocess: the script opens the named file with bun:sqlite, which has no Node equivalent
const dir = mkdtempSync(join(tmpdir(), "publication-categories-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const DB = join(dir, "site.db");

const publicationList = (category: string) =>
	JSON.stringify([
		{
			id: "list",
			type: "publicationList",
			layout: "list",
			query: { source: "publications", contentType: "publication", category },
			props: { title: "" },
		},
	]);

function bun(source: string) {
	return execFileSync("bun", ["-e", source], { encoding: "utf8" }).trim();
}

/** An empty database on every migration, which is what an operator's file is. */
function migrate(path: string, rows = "") {
	bun(`
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
const db = new Database(${JSON.stringify(path)}, { create: true });
db.exec("PRAGMA foreign_keys = OFF;");
for (const f of readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort())
	for (const s of readFileSync("drizzle/" + f, "utf8").split("--> statement-breakpoint"))
		if (s.trim()) db.exec(s.trim());
db.exec("PRAGMA foreign_keys = OFF;");
${rows}
`);
}

function install(path = DB) {
	migrate(
		path,
		`
db.query("insert into tenants (id, slug, name) values (1,'site','Site')").run();
db.query("insert into languages (code,name,native_name,is_default,enabled,rtl,sort) values ('en','English','English',1,1,0,0)").run();
const page = db.query("insert into pages (tenant_id, slug, status, sections) values (1,?,'published',?)");
page.run("media/annual-report", ${JSON.stringify(publicationList("annual-report"))});
page.run("media/ai-digital", ${JSON.stringify(publicationList("ai-digital"))});
page.run("media/escup-sources", ${JSON.stringify(publicationList("escup-sources"))});
page.run("who-we-are/about", null);
db.query("insert into nav_items (id, tenant_id, parent_id, sort, target_kind, target_ref, visible) values (7,1,null,0,'page','media/ai-digital',1)").run();
db.query("insert into translations (tenant_id,entity_type,entity_id,field,lang,value) values (1,'nav_item',7,'label','en','AI and Digital Education')").run();
db.query("insert into terms (tenant_id,taxonomy,key,sort) values (1,'publication_category','annual-report',0)").run();
db.query("insert into translations (tenant_id,entity_type,entity_id,field,lang,value) values (1,'term',1,'label','en','Annual Report')").run();
`,
	);
}

const TRIGGER =
	"create trigger refuse_term_label before insert on translations " +
	"when new.entity_type='term' begin select raise(abort, 'refused'); end;";

function refuseTermLabels(path: string) {
	bun(`
import { Database } from "bun:sqlite";
new Database(${JSON.stringify(path)}).exec(${JSON.stringify(TRIGGER)});
`);
}

function runAgainst(path: string, ...args: string[]) {
	return execFileSync(
		"bun",
		["scripts/backfill-publication-categories.ts", "--db", path, ...args],
		{ encoding: "utf8", stdio: "pipe" },
	);
}
const run = (...args: string[]) => runAgainst(DB, ...args);

function categories(path = DB) {
	return JSON.parse(
		bun(`
import { Database } from "bun:sqlite";
const db = new Database(${JSON.stringify(path)});
console.log(JSON.stringify(db.query(\`
  select t.key, t.sort, x.value as label
  from terms t left join translations x
    on x.entity_type='term' and x.entity_id=t.id and x.field='label' and x.lang='en'
  where t.taxonomy='publication_category' order by t.sort
\`).all()));
`),
	) as { key: string; sort: number; label: string | null }[];
}

describe("backfill-publication-categories", () => {
	install();

	it("refuses to run without a database to run against", () => {
		expect(() =>
			execFileSync("bun", ["scripts/backfill-publication-categories.ts"], {
				encoding: "utf8",
				stdio: "pipe",
			}),
		).toThrow(/--db/);
	});

	// `create: false`, so the run says so instead of leaving an empty file behind
	it("names a path that has no database, and creates nothing there", () => {
		const absent = join(dir, "typo.db");
		expect(() => runAgainst(absent)).toThrow(/No database at/);
		expect(existsSync(absent)).toBe(false);
	});

	it("refuses a database that was never installed", () => {
		const bare = join(dir, "bare.db");
		migrate(bare);
		expect(() => runAgainst(bare, "--apply")).toThrow(/no languages/);
	});

	it("names what is missing and writes nothing until --apply", () => {
		const out = run();
		expect(out).toContain("ai-digital");
		expect(out).toContain("escup-sources");
		expect(out).not.toContain("annual-report");
		expect(out).toMatch(/--apply/);
		expect(categories().map((t) => t.key)).toEqual(["annual-report"]);
	});

	it("takes the label from the page's menu item, and title-cases the rest", () => {
		run("--apply");
		const rows = categories();
		expect(rows).toEqual([
			{ key: "annual-report", sort: 0, label: "Annual Report" },
			{ key: "ai-digital", sort: 1, label: "AI and Digital Education" },
			{ key: "escup-sources", sort: 2, label: "Escup Sources" },
		]);
	});

	it("has nothing to do on the second run, and changes nothing", () => {
		const before = categories();
		const out = run("--apply");
		expect(out).toContain("nothing to do");
		expect(categories()).toEqual(before);
	});

	// an unlabelled term reads as done to the next run and shows staff the raw key
	it("adds no term at all when a label cannot be written", () => {
		const broken = join(dir, "label-refused.db");
		install(broken);
		refuseTermLabels(broken);
		expect(() => runAgainst(broken, "--apply")).toThrow(/refused/);
		expect(categories(broken).map((t) => t.key)).toEqual(["annual-report"]);
	});
});
