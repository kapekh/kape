import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { defaultUiStrings } from "#/lib/ui-strings.default";

// each case runs in a Bun subprocess: bun:sqlite is a Bun builtin
const dir = mkdtempSync(join(tmpdir(), "ui-strings-"));
const dbPath = join(dir, "ui-strings.db");
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

/** Run one snippet against the installed database; `body` returns the JSON result. */
function run<T>(body: string): T {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as ui from "${root}/src/server/repo/ui-strings.ts";
			 const rows = (key) =>
				db.$client.query("select lang, value from ui_strings where key = ?").all(key);
			 const refusal = async (p) => {
				try { await p; return ""; } catch (e) { return e.message; }
			 };
			 const result = await (async () => { ${body} })();
			 console.log(JSON.stringify(result));
			 process.exit(0);`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	);
	return JSON.parse(out.trim().split("\n").at(-1) ?? "null") as T;
}

const KEY = "nav.home";
const DEFAULT_EN = defaultUiStrings[KEY].en;

describe("setUiString", () => {
	it("writes the value, and writing again replaces it rather than adding a row", () => {
		const seen = run<{ first: unknown[]; second: unknown[] }>(`
			await ui.setUiString(db, "${KEY}", "en", "  Casa  ");
			const first = rows("${KEY}");
			await ui.setUiString(db, "${KEY}", "en", "Casita");
			return { first, second: rows("${KEY}") };
		`);
		expect(seen.first).toEqual([{ lang: "en", value: "Casa" }]);
		expect(seen.second).toEqual([{ lang: "en", value: "Casita" }]);
	});

	it("refuses a key no component reads, and stores nothing for it", () => {
		const seen = run<{ refused: string; rows: unknown[] }>(`
			const refused = await refusal(ui.setUiString(db, "nav.invented", "en", "Nope"));
			return { refused, rows: rows("nav.invented") };
		`);
		expect(seen.refused).toContain("nav.invented");
		expect(seen.rows).toEqual([]);
	});

	it("takes a key the table already holds, though the shipped dictionary does not", () => {
		const seen = run<unknown[]>(`
			db.$client
				.query("insert into ui_strings (tenant_id, key, lang, value) values (1, ?, 'en', ?)")
				.run("custom.motto", "Old");
			await ui.setUiString(db, "custom.motto", "en", "New");
			return rows("custom.motto");
		`);
		expect(seen).toEqual([{ lang: "en", value: "New" }]);
	});

	it("treats an empty value as a reset, not as a blank string on screen", () => {
		const seen = run<{ before: unknown[]; after: unknown[] }>(`
			await ui.setUiString(db, "${KEY}", "en", "Casa");
			const before = rows("${KEY}");
			await ui.setUiString(db, "${KEY}", "en", "   ");
			return { before, after: rows("${KEY}") };
		`);
		expect(seen.before).toEqual([{ lang: "en", value: "Casa" }]);
		expect(seen.after).toEqual([]);
	});
});

describe("resetUiString", () => {
	it("deletes the row rather than storing the default in it", () => {
		const seen = run<{ before: unknown[]; after: unknown[] }>(`
			await ui.setUiString(db, "${KEY}", "en", "Casa");
			const before = rows("${KEY}");
			await ui.resetUiString(db, "${KEY}", "en");
			return { before, after: rows("${KEY}") };
		`);
		expect(seen.before).toEqual([{ lang: "en", value: "Casa" }]);
		expect(seen.after).toEqual([]);
		expect(seen.after).not.toEqual([{ lang: "en", value: DEFAULT_EN }]);
	});

	it("still reports the default the key falls back to once the row is gone", () => {
		const seen = run<{ defaults: Record<string, string>; values: unknown }>(`
			await ui.resetUiString(db, "${KEY}", "en");
			const list = await ui.listUiStrings(db);
			const row = list.rows.find((r) => r.key === "${KEY}");
			return { defaults: row.defaults, values: row.values };
		`);
		expect(seen.defaults.en).toBe(DEFAULT_EN);
		expect(seen.values).toEqual({});
	});
});
