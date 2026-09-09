import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: a person-backed split reads the person's
// own translation rows, so only the real repo proves the caption is per-language
const dir = mkdtempSync(join(tmpdir(), "section-person-"));
const dbPath = join(dir, "sections.db");
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
		 import { resolveSections } from "${root}/src/server/repo/sections.ts";

		 await createLanguage(db, {
		   code: "km", name: "Khmer", nativeName: "ខ្មែរ",
		   enabled: true, isDefault: false, rtl: false, sort: 1,
		 });
		 const [p] = await db.insert(people).values({
		   tenantId: 1, slug: "person-sambath", tier: "smt", isPublic: true, sort: 0,
		 }).returning({ id: people.id });
		 await db.insert(translations).values([
		   { tenantId: 1, entityType: "person", entityId: p.id, field: "name", lang: "en", value: "Mr. Sambath" },
		   { tenantId: 1, entityType: "person", entityId: p.id, field: "name", lang: "km", value: "លោក សម្បត្តិ" },
		   { tenantId: 1, entityType: "person", entityId: p.id, field: "position", lang: "en", value: "Executive Director" },
		   { tenantId: 1, entityType: "person", entityId: p.id, field: "position", lang: "km", value: "នាយកប្រតិបត្តិ" },
		 ]);

		 const split = (props) => [{ id: "s1", type: "split", layout: "media-right", props }];
		 const en = await resolveSections(db, split({ title: "Welcome", personId: String(p.id) }), "en");
		 const km = await resolveSections(db, split({ title: "Welcome", personId: "person-sambath" }), "km");
		 const plain = await resolveSections(db, split({ title: "Welcome", image: "/x.png" }), "en");
		 console.log(JSON.stringify({
		   en: en[0].props.person,
		   km: km[0].props.person,
		   plain: plain[0].props.person ?? null,
		   plainImage: plain[0].props.image,
		 }));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

type Caption = { name: string; position: string } | null;
const resolved = JSON.parse(out.trim().split("\n").at(-1) as string) as {
	en: Caption;
	km: Caption;
	plain: Caption;
	plainImage: string;
};

describe("person-backed split", () => {
	it("captions the portrait in the requested language", () => {
		expect(resolved.en).toMatchObject({
			name: "Mr. Sambath",
			position: "Executive Director",
		});
		expect(resolved.km).toMatchObject({
			name: "លោក សម្បត្តិ",
			position: "នាយកប្រតិបត្តិ",
		});
	});

	it("leaves a split with no person alone", () => {
		expect(resolved.plain).toBeNull();
		expect(resolved.plainImage).toBe("/x.png");
	});
});
