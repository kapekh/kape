import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "migrate-director-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Runs every migration before 0029, plants the director page as 0028 left it, then runs 0029 twice. */
function migrate(name: string, title: string) {
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
for (const f of files) if (!f.startsWith("0029")) apply(f);
db.exec("PRAGMA foreign_keys = OFF;");
for (const code of ["en", "km"])
	db.query("insert into languages (code,name,native_name,is_default,enabled,rtl,sort) values (?,?,?,?,1,0,0)").run(code, code, code, code === "en" ? 1 : 0);
const sections = JSON.stringify([{ id: "a", type: "split", layout: "media-right", props: { eyebrow: "Welcome Message from the Executive Director", personId: "person-exec-director", body: "{}", i18n: { km: { eyebrow: "សារស្វាគមន៍ពីនាយកប្រតិបត្តិ", body: "{}" } } } }]);
db.query("insert into pages (id, slug, status, sections) values (4, 'who-we-are/director-speech', 'published', ?)").run(sections);
const text = db.query("insert into translations (tenant_id,entity_type,entity_id,field,lang,value) values (1,'page',4,?,?,?)");
text.run("title", "en", ${JSON.stringify(title)});
text.run("title", "km", "សុន្ទរកថានាយកប្រតិបត្តិ");
const fix = files.find((f) => f.startsWith("0029"));
apply(fix);
apply(fix);
console.log(JSON.stringify({
	text: db.query("select field, lang, value from translations where entity_type='page' and entity_id=4 order by field, lang").all(),
	props: JSON.parse(db.query("select sections from pages where id=4").get().sections)[0].props,
}));
`;
	return JSON.parse(
		execFileSync("bun", ["-e", script], { encoding: "utf8" }).trim(),
	) as {
		text: { field: string; lang: string; value: string }[];
		props: Record<string, unknown>;
	};
}

describe("migration 0029: the director's page reads as a welcome message", () => {
	it("renames the page, gives the hero its lead, and drops the eyebrow the hero now says", () => {
		const out = migrate("seeded", "Executive Director's Speech");
		const value = (field: string, lang: string) =>
			out.text.find((t) => t.field === field && t.lang === lang)?.value;
		expect(value("title", "en")).toBe(
			"Welcome Message from the Executive Director",
		);
		expect(value("title", "km")).toBe("សារស្វាគមន៍ពីនាយកប្រតិបត្តិ");
		expect(value("excerpt", "en")).toMatch(
			/^Welcome message from Mr\. Sao Vanna/,
		);
		expect(value("excerpt", "km")).toMatch(/សៅ វណ្ណា/);
		expect(out.props.eyebrow).toBeUndefined();
		expect(out.props.i18n).toEqual({ km: { body: "{}" } });
		expect(out.props.personId).toBe("person-exec-director");
	});

	it("leaves a title an editor already changed alone", () => {
		const out = migrate("edited", "A word from our director");
		expect(
			out.text.find((t) => t.field === "title" && t.lang === "en")?.value,
		).toBe("A word from our director");
	});
});
