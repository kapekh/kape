import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "migrate-content-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const MIGRATION = "0028";

/**
 * Builds a database on every migration before 0028, plants the rows that
 * migration rewrites, runs it, and reports what it left behind.
 */
function migrate(name: string, langs: string[]) {
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
for (const code of ${JSON.stringify(langs)})
	db.query("insert into languages (code,name,native_name,is_default,enabled,rtl,sort) values (?,?,?,?,1,0,0)").run(code, code, code, code === "en" ? 1 : 0);
const text = db.query("insert into translations (tenant_id,entity_type,entity_id,field,lang,value) values (1,'person',?,'position',?,?)");
text.run(1, "en", "Member ");
text.run(2, "en", "Chairman");
text.run(2, "km", "already there");
text.run(3, "en", "Something nobody translated");
text.run(4, "en", "ទឹកប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់");
db.query("insert into people (id, slug, is_public) values (2, 'person-exec-director', 1)").run();
const sections = JSON.stringify([{ id: "a", type: "richtext", layout: "default", props: { eyebrow: "Welcome", body: "{\\"type\\":\\"doc\\"}", i18n: { km: { eyebrow: "សូមស្វាគមន៍" } } } }]);
db.query("insert into pages (slug, status, sections) values ('who-we-are/director-speech', 'published', ?)").run(sections);
db.query("insert into pages (slug, status, sections) values ('who-we-are/history', 'published', ?)").run(sections);
db.query("insert into render_cache (key, data) values ('v6::en::x', '{}')").run();
const fix = files.find((f) => f.startsWith(${JSON.stringify(MIGRATION)}));
apply(fix);
apply(fix);
console.log(JSON.stringify({
	positions: db.query("select entity_id as id, lang, value from translations where entity_type='person' and field='position' order by entity_id, lang").all(),
	director: JSON.parse(db.query("select sections from pages where slug='who-we-are/director-speech'").get().sections)[0],
	other: JSON.parse(db.query("select sections from pages where slug='who-we-are/history'").get().sections)[0],
	cached: db.query("select count(*) as n from render_cache").get().n,
}));
`;
	return JSON.parse(
		execFileSync("bun", ["-e", script], { encoding: "utf8" }).trim(),
	) as {
		positions: { id: number; lang: string; value: string }[];
		director: {
			type: string;
			layout: string;
			props: Record<string, unknown>;
		};
		other: { type: string };
		cached: number;
	};
}

describe("migration 0028: Khmer job titles and the director's portrait", () => {
	const out = migrate("two-languages", ["en", "km"]);

	it("gives every known English title its Khmer one, and leaves the rest alone", () => {
		const km = (id: number) =>
			out.positions.find((p) => p.id === id && p.lang === "km")?.value;
		expect(km(1)).toBe("សមាជិក");
		expect(km(2)).toBe("already there");
		expect(km(3)).toBeUndefined();
	});

	it("moves the Khmer typed into an English title over to Khmer, and running twice changes nothing", () => {
		const row = (id: number, lang: string) =>
			out.positions.find((p) => p.id === id && p.lang === lang)?.value;
		expect(row(4, "en")).toBe("Senior Technical Adviser");
		expect(row(4, "km")).toBe("ទីប្រឹក្សាបច្ចេកទេសជាន់ខ្ពស់");
		expect(out.positions).toHaveLength(7);
	});

	it("turns the director's text block into a portrait split and keeps its words", () => {
		expect(out.director.type).toBe("split");
		expect(out.director.layout).toBe("media-right");
		expect(out.director.props.personId).toBe("person-exec-director");
		expect(out.director.props.eyebrow).toBe("Welcome");
		expect(out.director.props.i18n).toEqual({ km: { eyebrow: "សូមស្វាគមន៍" } });
		expect(out.other.type).toBe("richtext");
		expect(out.cached).toBe(0);
	});

	it("writes no Khmer on a site that has no Khmer language", () => {
		const en = migrate("en-only", ["en"]);
		const km = en.positions.filter((p) => p.lang === "km").map((p) => p.id);
		expect(km).toEqual([2]);
	});
});
