import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: who counts as a colleague is SQL
const dir = mkdtempSync(join(tmpdir(), "person-profile-"));
const dbPath = join(dir, "people.db");
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
		 import { people, translations } from "${root}/src/server/schema.ts";
		 import { createLanguage } from "${root}/src/server/repo/admin.ts";
		 import { getPersonBySlug } from "${root}/src/server/repo/people.ts";

		 await createLanguage(db, {
		   code: "fr", name: "French", nativeName: "Français",
		   enabled: true, isDefault: false, rtl: false, sort: 1,
		 });

		 const add = async (name, tier, isPublic, extra = {}, other = {}) => {
			const [row] = await db.insert(people).values({
				tenantId: 1,
				slug: name.toLowerCase().replaceAll(" ", "-"),
				tier,
				isPublic,
				sort: 0,
				...extra,
			}).returning({ id: people.id });
			await db.insert(translations).values(
				Object.entries({ en: name, ...other }).map(([lang, value]) => ({
					tenantId: 1, entityType: "person", entityId: row.id,
					field: "name", lang, value,
				})),
			);
		 };

		 await add("Subject", "pm", true, { program: "NGS" });
		 await add("Peer One", "pm", true);
		 await add("Peer Two", "pm", true);
		 await add("Hidden Peer", "pm", false);
		 await add("Other Tier", "board", true);
		 for (let i = 0; i < 8; i++) await add("Crowd " + i, "team", true);
		 await add("Crowded Subject", "team", true);
		 await add("Third Language", "board", true, {}, { fr: "Troisième Langue" });

		 const subject = await getPersonBySlug(db, "subject", "en");
		 const crowded = await getPersonBySlug(db, "crowded-subject", "en");
		 const french = await getPersonBySlug(db, "third-language", "fr");
		 const englishOfFrench = await getPersonBySlug(db, "third-language", "en");
		 console.log(JSON.stringify({
			keys: Object.keys(subject).sort(),
			tier: subject.tier,
			program: subject.program,
			colleagues: subject.colleagues.map((c) => c.name).sort(),
			crowdedCount: crowded.colleagues.length,
			crowdedSelf: crowded.colleagues.some((c) => c.slug === "crowded-subject"),
			frenchName: french.name,
			frenchFallback: french.i18nFallback,
			englishName: englishOfFrench.name,
		 }));`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const result = JSON.parse(out.trim().split("\n").at(-1) as string) as {
	keys: string[];
	tier: string;
	program: string;
	colleagues: string[];
	crowdedCount: number;
	crowdedSelf: boolean;
	frenchName: string;
	frenchFallback: string[];
	englishName: string;
};

describe("person profile", () => {
	it("carries the group and program the sidebar shows", () => {
		expect(result.tier).toBe("pm");
		expect(result.program).toBe("NGS");
	});

	it("lists only public people of the same tier, never the subject", () => {
		expect(result.colleagues).toEqual(["Peer One", "Peer Two"]);
		expect(result.crowdedSelf).toBe(false);
	});

	// this payload is cached whole; a new key needs FORMAT bumped in render-cache.ts
	it("keeps the shape the render cache format was last bumped for", () => {
		expect(result.keys).toEqual([
			"bodyHtml",
			"colleagues",
			"i18nFallback",
			"id",
			"name",
			"photoUrl",
			"position",
			"program",
			"slug",
			"tier",
		]);
	});

	it("caps a large tier so the profile does not turn into a directory", () => {
		expect(result.crowdedCount).toBe(6);
	});

	it("names a person in a language that is neither the default nor Khmer", () => {
		expect(result.frenchName).toBe("Troisième Langue");
		expect(result.frenchFallback).not.toContain("name");
		expect(result.englishName).toBe("Third Language");
	});
});
