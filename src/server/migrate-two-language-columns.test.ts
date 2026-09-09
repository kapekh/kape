import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "migrate-2lang-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/**
 * Builds a database on the schema that still has the `_km` column pairs, gives
 * it the languages asked for, seeds one row per table, then runs the migrations
 * that fold those columns into `translations`.
 */
function migrateFrom(
	name: string,
	langs: { code: string; isDefault: boolean }[],
): {
	languages: { code: string; enabled: number }[];
	personName: { lang: string; value: string }[];
	bobName: { lang: string; value: string }[];
	campaignTitle: { lang: string; value: string }[];
	formTitle: { lang: string; value: string }[];
} {
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
const FOLD = (f) => f.startsWith("0023") || f.startsWith("0024") || f.startsWith("0025");
for (const f of files) if (!FOLD(f)) apply(f);
for (const l of ${JSON.stringify(langs)})
	db.query("insert into languages (code,name,native_name,is_default,enabled,rtl,sort) values (?,?,?,?,1,0,0)")
		.run(l.code, l.code, l.code, l.isDefault ? 1 : 0);
db.exec("PRAGMA foreign_keys = OFF;");
db.query("insert into people (tenant_id, slug, name_en, name_km) values (1,'heang','Heang Koy','ហេង គយ')").run();
db.query("insert into people (tenant_id, slug, name_en, name_km) values (1,'bob','Bob',null)").run();
db.query("insert into campaigns (tenant_id, slug, title, title_km, blurb, blurb_km) values (1,'c','Build a school','សាលា','Give today','ឥឡូវ')").run();
db.query("insert into forms (tenant_id, slug, title, title_km) values (1,'f','Contact us','ទំនាក់ទំនង')").run();
for (const f of files) if (FOLD(f)) apply(f);
const rows = (type, field, id = 1) =>
	db.query("select lang, value from translations where entity_type = ? and entity_id = ? and field = ? order by lang").all(type, id, field);
console.log(JSON.stringify({
	languages: db.query("select code, enabled from languages order by sort, code").all(),
	personName: rows("person", "name"),
	bobName: rows("person", "name", 2),
	campaignTitle: rows("campaign", "title"),
	formTitle: rows("form", "title"),
}));
`;
	return JSON.parse(
		execFileSync("bun", ["-e", script], { encoding: "utf8" }).trim(),
	);
}

const EN = { code: "en", isDefault: true };
const KM = { code: "km", isDefault: false };

describe("folding the _km column pairs into translations", () => {
	it("keeps both languages when English is the default", () => {
		const out = migrateFrom("en-default", [EN, KM]);
		expect(out.personName).toEqual([
			{ lang: "en", value: "Heang Koy" },
			{ lang: "km", value: "ហេង គយ" },
		]);
		expect(out.campaignTitle.map((r) => r.lang)).toEqual(["en", "km"]);
		expect(out.formTitle.map((r) => r.lang)).toEqual(["en", "km"]);
	});

	// the English column is not the default-language column: writing it to
	// whichever language is default collides with the _km row and is dropped
	it("keeps both languages when Khmer is the default", () => {
		const out = migrateFrom("km-default", [
			{ ...EN, isDefault: false },
			{ ...KM, isDefault: true },
		]);
		expect(out.personName).toEqual([
			{ lang: "en", value: "Heang Koy" },
			{ lang: "km", value: "ហេង គយ" },
		]);
		expect(out.campaignTitle).toEqual([
			{ lang: "en", value: "Build a school" },
			{ lang: "km", value: "សាលា" },
		]);
		expect(out.formTitle).toEqual([
			{ lang: "en", value: "Contact us" },
			{ lang: "km", value: "ទំនាក់ទំនង" },
		]);
	});

	it("falls back to the default language where the tenant has no English", () => {
		const out = migrateFrom("no-en", [{ ...KM, isDefault: true }]);
		expect(out.personName).toEqual([{ lang: "km", value: "ហេង គយ" }]);
	});

	// every record is named by its default-language row, so an English-only
	// person on a Khmer-default site keeps his English name under Khmer too,
	// where an editor sees it and can replace it, instead of vanishing
	it("names an English-only person in the default language as well", () => {
		const out = migrateFrom("km-default-en-only-person", [
			{ ...EN, isDefault: false },
			{ ...KM, isDefault: true },
		]);
		expect(out.bobName).toEqual([
			{ lang: "en", value: "Bob" },
			{ lang: "km", value: "Bob" },
		]);
	});

	// an installed site has one language row, but the old forms always showed a
	// Khmer box; that text must survive the column being dropped
	it("keeps Khmer text on a site that never listed Khmer, as a disabled language", () => {
		const out = migrateFrom("en-only", [EN]);
		expect(out.languages).toEqual([
			{ code: "en", enabled: 1 },
			{ code: "km", enabled: 0 },
		]);
		expect(out.personName).toEqual([
			{ lang: "en", value: "Heang Koy" },
			{ lang: "km", value: "ហេង គយ" },
		]);
		expect(out.campaignTitle.map((r) => r.lang)).toEqual(["en", "km"]);
		expect(out.formTitle.map((r) => r.lang)).toEqual(["en", "km"]);
	});
});
