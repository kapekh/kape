import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: the default language is memoised, so only
// the real language writers prove the memo is dropped when the flag moves
const dir = mkdtempSync(join(tmpdir(), "default-lang-"));
const dbPath = join(dir, "default-lang.db");
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

const out = execFileSync(
	"bun",
	[
		"-e",
		`import { db } from "${root}/src/server/db.ts";
		 import { createLanguage, deleteLanguage, updateLanguage } from "${root}/src/server/repo/admin.ts";
		 import { getDefaultLang } from "${root}/src/server/repo/i18n.ts";

		 const installed = await getDefaultLang(db);
		 await createLanguage(db, {
		   code: "km", name: "Khmer", nativeName: "ខ្មែរ",
		   enabled: true, isDefault: true, rtl: false, sort: 1,
		 });
		 const created = await getDefaultLang(db);
		 await updateLanguage(db, "en", {
		   name: "English", nativeName: "English",
		   enabled: true, isDefault: true, rtl: false, sort: 0,
		 });
		 const updated = await getDefaultLang(db);
		 await updateLanguage(db, "km", {
		   name: "Khmer", nativeName: "ខ្មែរ",
		   enabled: true, isDefault: true, rtl: false, sort: 1,
		 });
		 const moved = await getDefaultLang(db);
		 const refused = await deleteLanguage(db, "km").then(() => "", (e) => e.message);
		 const unflagged = await updateLanguage(db, "km", {
		   name: "Khmer", nativeName: "ខ្មែរ",
		   enabled: true, isDefault: false, rtl: false, sort: 1,
		 }).then(() => "", (e) => e.message);
		 const stillDefault = await getDefaultLang(db);
		 await updateLanguage(db, "en", {
		   name: "English", nativeName: "English",
		   enabled: true, isDefault: true, rtl: false, sort: 0,
		 });
		 await deleteLanguage(db, "km");
		 const deleted = await getDefaultLang(db);
		 console.log(JSON.stringify({ installed, created, updated, moved, refused, unflagged, stillDefault, deleted }));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const seen = JSON.parse(out.trim().split("\n").at(-1) as string) as {
	installed: string;
	created: string;
	updated: string;
	moved: string;
	refused: string;
	unflagged: string;
	stillDefault: string;
	deleted: string;
};

describe("the memoised default language", () => {
	it("starts as the language the site was installed in", () => {
		expect(seen.installed).toBe("en");
	});

	it("follows a new language that claims the default", () => {
		expect(seen.created).toBe("km");
	});

	it("follows the flag moving back to an existing language", () => {
		expect(seen.updated).toBe("en");
	});

	it("follows the flag moving away again", () => {
		expect(seen.moved).toBe("km");
	});

	// every record is named by its default-language row, so the flag is handed on, never dropped
	it("refuses to delete or un-default the default language", () => {
		expect(seen.refused).toMatch(/default language/);
		expect(seen.unflagged).toMatch(/default language/);
		expect(seen.stillDefault).toBe("km");
	});

	it("lets the old default go once another language holds the flag", () => {
		expect(seen.deleted).toBe("en");
	});
});
