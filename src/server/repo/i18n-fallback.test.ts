import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import type { SectionNode } from "#/lib/sections";
import type { DB } from "../db";
import { resolveSections } from "./sections";

// what an inline editor must not confuse: text shown in Khmer with text shown in English
// because Khmer was never written

const hero = (props: Record<string, unknown>): SectionNode => ({
	id: "s1",
	type: "hero",
	props,
});

// a static section runs no query, so the renderer never reaches the database
const noDb = {} as DB;

describe("section overlay fallback", () => {
	it("names the text fields the requested language does not cover", async () => {
		const [s] = await resolveSections(
			noDb,
			[
				hero({
					eyebrow: "About",
					title: "Our work",
					lead: "What we do",
					image: "/x.png",
					i18n: { km: { title: "ការងាររបស់យើង" } },
				}),
			],
			"km",
		);
		expect(s.props?.title).toBe("ការងាររបស់យើង");
		expect(s.props?.i18nFallback).toEqual(["eyebrow", "lead"]);
	});

	it("says nothing about a section rendered in the default language", async () => {
		const [s] = await resolveSections(
			noDb,
			[hero({ eyebrow: "About", title: "Our work" })],
			"en",
		);
		expect(s.props?.i18nFallback).toBeUndefined();
	});

	it("skips fields the section is not showing", async () => {
		const [s] = await resolveSections(
			noDb,
			[hero({ title: "Our work" })],
			"km",
		);
		expect(s.props?.i18nFallback).toEqual(["title"]);
	});

	it("says nothing where the section offers no text to translate", async () => {
		const [s] = await resolveSections(
			noDb,
			[
				{
					id: "s2",
					type: "form",
					props: { formSlug: "contact", title: "Reach us" },
				},
			],
			"km",
		);
		expect(s.props?.i18nFallback).toBeUndefined();
	});
});

const dir = mkdtempSync(join(tmpdir(), "i18n-fallback-"));
const dbPath = join(dir, "fallback.db");
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

const page = JSON.stringify({
	slug: "",
	segment: "about",
	parentId: null,
	status: "published",
	coverMediaId: null,
	sections: [],
	translations: [
		{ lang: "en", title: "About us", excerpt: "Who we are", body: "" },
		{ lang: "km", title: "អំពីយើង", excerpt: "", body: "" },
	],
});

const out = execFileSync(
	"bun",
	[
		"-e",
		`import { db } from "${root}/src/server/db.ts";
		 import * as admin from "${root}/src/server/repo/admin.ts";
		 import { getPageBySlug } from "${root}/src/server/repo/content.ts";
		 await admin.createLanguage(db, {
		   code: "km", name: "Khmer", nativeName: "ខ្មែរ",
		   enabled: true, isDefault: false, rtl: false, sort: 1,
		 });
		 await admin.createPage(db, ${page});
		 const km = await getPageBySlug(db, "about", "km");
		 const en = await getPageBySlug(db, "about", "en");
		 console.log(JSON.stringify({ km: km.i18nFallback, en: en.i18nFallback, kmTitle: km.title }));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);
const resolved = JSON.parse(out.trim().split("\n").pop() ?? "{}");

describe("page translation fallback", () => {
	it("names the untranslated field and not the translated one", () => {
		expect(resolved.kmTitle).toBe("អំពីយើង");
		expect(resolved.km).toEqual(["excerpt"]);
	});

	it("is empty in the default language", () => {
		expect(resolved.en).toEqual([]);
	});
});
