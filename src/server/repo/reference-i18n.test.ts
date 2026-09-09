import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: only the real repo functions prove that the
// reference tables read back per language instead of sharing one column
const dir = mkdtempSync(join(tmpdir(), "reference-i18n-"));
const dbPath = join(dir, "reference.db");
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

function run<T>(body: string): T {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 import * as campaigns from "${root}/src/server/repo/campaigns.ts";
			 import * as content from "${root}/src/server/repo/content.ts";
			 import * as donations from "${root}/src/server/repo/donations.ts";
			 import * as forms from "${root}/src/server/repo/forms.ts";
			 import * as org from "${root}/src/server/repo/org.ts";
			 import * as site from "${root}/src/server/repo/site.ts";
			 db.$client
				.query("insert or ignore into languages (code, name, native_name, is_default, enabled, rtl, sort) values ('km','Khmer','ខ្មែរ',0,1,0,1)")
				.run();
			 const out = {};
			 ${body}
			 console.log(JSON.stringify(out));
			 process.exit(0);`,
		],
		{
			env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
			encoding: "utf8",
		},
	);
	return JSON.parse(out.trim().split("\n").at(-1) as string) as T;
}

describe("a term's label", () => {
	const r = run<{ en: string; km: string; untranslated: string }>(`
		const id = await admin.createTerm(db, {
			taxonomy: "location", key: "kampong-cham", sort: 0,
			labels: { en: "Kampong Cham", km: "កំពង់ចាម" },
		});
		await admin.createTerm(db, {
			taxonomy: "location", key: "kandal", sort: 1, labels: { en: "Kandal" },
		});
		const pick = (rows, key) => rows.find((t) => t.key === key).label;
		const en = await content.listTerms(db, "location", "en");
		const km = await content.listTerms(db, "location", "km");
		out.en = pick(en, "kampong-cham");
		out.km = pick(km, "kampong-cham");
		out.untranslated = pick(km, "kandal");
	`);

	it("reads back in the language asked for", () => {
		expect(r.en).toBe("Kampong Cham");
		expect(r.km).toBe("កំពង់ចាម");
	});

	it("falls back to the default language when that one has no label", () => {
		expect(r.untranslated).toBe("Kandal");
	});
});

describe("an org-chart node's name and title", () => {
	const r = run<{
		en: { name: string; title: string };
		km: { name: string; title: string };
	}>(`
		await org.createOrgNode(db, {
			parentId: null, personId: null,
			translations: [
				{ lang: "en", name: "Executive Director", title: "Leads the organisation" },
				{ lang: "km", name: "នាយកប្រតិបត្តិ", title: "ដឹកនាំអង្គការ" },
			],
		});
		const pick = (roots) => ({ name: roots[0].name, title: roots[0].title });
		out.en = pick(await org.getOrgTree(db, "en"));
		out.km = pick(await org.getOrgTree(db, "km"));
	`);

	it("read back in the language asked for", () => {
		expect(r.en).toEqual({
			name: "Executive Director",
			title: "Leads the organisation",
		});
		expect(r.km).toEqual({ name: "នាយកប្រតិបត្តិ", title: "ដឹកនាំអង្គការ" });
	});
});

describe("an office's name and address", () => {
	const r = run<{
		en: { name: string; address: string };
		km: { name: string; address: string };
	}>(`
		const id = await admin.createOffice(db, {
			province: "", phone: "", email: "", lat: "", lng: "", isHq: true, sort: 0,
			translations: [
				{ lang: "en", name: "Head Office (PTTC)", address: "National Road 7, Kampong Cham" },
				{ lang: "km", name: "ការិយាល័យកណ្ដាល", address: "ផ្លូវជាតិលេខ ៧ កំពង់ចាម" },
			],
		});
		const pick = (rows) => {
			const o = rows.find((x) => x.id === id);
			return { name: o.name, address: o.address };
		};
		out.en = pick(await site.listOffices(db, "en"));
		out.km = pick(await site.listOffices(db, "km"));
	`);

	it("read back in the language asked for", () => {
		expect(r.en).toEqual({
			name: "Head Office (PTTC)",
			address: "National Road 7, Kampong Cham",
		});
		expect(r.km).toEqual({
			name: "ការិយាល័យកណ្ដាល",
			address: "ផ្លូវជាតិលេខ ៧ កំពង់ចាម",
		});
	});
});

describe("a school's name and address", () => {
	const r = run<{
		en: { name: string; address: string };
		km: { name: string; address: string };
		listed: string;
	}>(`
		const id = await admin.createSchool(db, {
			code: "NGS-001", level: "high", province: "", projectId: null,
			coverMediaId: null, lat: "", lng: "", sort: 0,
			translations: [
				{ lang: "en", name: "Rompok Primary School", address: "Rompok, Kratie" },
				{ lang: "km", name: "សាលាបឋមសិក្សារំពក", address: "រំពក ក្រចេះ" },
			],
		});
		const row = (await admin.getSchool(db, id)).translations;
		out.en = { name: row.en.name, address: row.en.address };
		out.km = { name: row.km.name, address: row.km.address };
		out.listed = (await admin.adminListSchools(db)).find((s) => s.id === id).name;
	`);

	it("keeps a language of its own", () => {
		expect(r.en).toEqual({
			name: "Rompok Primary School",
			address: "Rompok, Kratie",
		});
		expect(r.km).toEqual({
			name: "សាលាបឋមសិក្សារំពក",
			address: "រំពក ក្រចេះ",
		});
	});

	it("names the row in the default language for the admin list", () => {
		expect(r.listed).toBe("Rompok Primary School");
	});
});

describe("a campaign's title and blurb", () => {
	const r = run<{
		en: { title: string; blurb: string };
		km: { title: string; blurb: string };
		listed: string;
	}>(`
		const id = await campaigns.createCampaign(db, {
			slug: "every-child-learns", status: "active", currency: "USD",
			goalAmount: null, coverMediaId: null, presets: [], allowCustom: true,
			impactTiers: [], showSupporters: true, featured: false, sort: 0,
			translations: [
				{ lang: "en", title: "Where every child learns", blurb: "Books and desks for one classroom." },
				{ lang: "km", title: "កន្លែងដែលកុមារគ្រប់រូបរៀន", blurb: "សៀវភៅ និងតុសម្រាប់ថ្នាក់រៀនមួយ។" },
			],
		});
		const pick = (rows) => {
			const c = rows.find((x) => x.id === id);
			return { title: c.title, blurb: c.blurb };
		};
		out.en = pick(await campaigns.listActiveCampaigns(db, "en"));
		out.km = pick(await campaigns.listActiveCampaigns(db, "km"));
		out.listed = (await campaigns.adminListCampaigns(db)).find((c) => c.id === id).title;
	`);

	it("reads back on the donate page in the language asked for", () => {
		expect(r.en).toEqual({
			title: "Where every child learns",
			blurb: "Books and desks for one classroom.",
		});
		expect(r.km).toEqual({
			title: "កន្លែងដែលកុមារគ្រប់រូបរៀន",
			blurb: "សៀវភៅ និងតុសម្រាប់ថ្នាក់រៀនមួយ។",
		});
	});

	it("names the row in the default language for the admin list", () => {
		expect(r.listed).toBe("Where every child learns");
	});
});

describe("a form's title, submit label and success message", () => {
	type Shape = {
		title: string;
		submitLabel: string;
		successMessage: string;
	};
	const r = run<{ en: Shape; km: Shape; listed: string }>(`
		const id = await forms.createForm(db, {
			slug: "alumni", status: "active", fields: [], deadline: null, notifyEmail: null,
			translations: [
				{ lang: "en", title: "Alumni registration", intro: "Tell us where you are now.",
				  submitLabel: "Send it", successMessage: "Thank you, we have your answer." },
				{ lang: "km", title: "ការចុះឈ្មោះសិស្សចាស់", intro: "ប្រាប់យើងថាឥឡូវអ្នកនៅឯណា។",
				  submitLabel: "ផ្ញើ", successMessage: "អរគុណ យើងបានទទួលចម្លើយរបស់អ្នក។" },
			],
		});
		const pick = (f) => ({ title: f.title, submitLabel: f.submitLabel, successMessage: f.successMessage });
		out.en = pick(await forms.getPublicFormBySlug(db, "alumni", "en"));
		out.km = pick(await forms.getPublicFormBySlug(db, "alumni", "km"));
		out.listed = (await forms.adminListForms(db)).find((f) => f.id === id).title;
	`);

	it("reads back on the public form in the language asked for", () => {
		expect(r.en).toEqual({
			title: "Alumni registration",
			submitLabel: "Send it",
			successMessage: "Thank you, we have your answer.",
		});
		expect(r.km).toEqual({
			title: "ការចុះឈ្មោះសិស្សចាស់",
			submitLabel: "ផ្ញើ",
			successMessage: "អរគុណ យើងបានទទួលចម្លើយរបស់អ្នក។",
		});
	});

	it("names the row in the default language for the admin list", () => {
		expect(r.listed).toBe("Alumni registration");
	});
});

describe("a label wanted where no language was asked for", () => {
	const r = run<{ donationLabel: string; mediaLabel: string }>(`
		const cid = await campaigns.createCampaign(db, {
			slug: "label-proof", status: "active", currency: "USD", goalAmount: null,
			coverMediaId: null, presets: [], allowCustom: true, impactTiers: [],
			showSupporters: true, featured: false, sort: 0,
			translations: [
				{ lang: "en", title: "Label proof campaign", blurb: "" },
				{ lang: "km", title: "យុទ្ធនាការសាកល្បង", blurb: "" },
			],
		});
		await donations.createDonation(db, { campaignId: cid, orderId: "label-proof-1", amount: "25", currency: "USD" });
		out.donationLabel = (await donations.adminListDonations(db))
			.find((d) => d.orderId === "label-proof-1").campaignTitle;

		const url = "/uploads/label-proof.jpg";
		const [m] = await db.$client
			.query("insert into media (tenant_id, url, r2_key, content_type) values (1, ?, 'label-proof.jpg', 'image/jpeg') returning id")
			.all(url);
		await forms.createForm(db, {
			slug: "label-proof-form", status: "active", deadline: null, notifyEmail: null,
			fields: [{ key: "c0", label: "Content", type: "content", content: '<img src="' + url + '">' }],
			translations: [
				{ lang: "en", title: "Label proof form", intro: "", submitLabel: "", successMessage: "" },
				{ lang: "km", title: "ទម្រង់សាកល្បង", intro: "", submitLabel: "", successMessage: "" },
			],
		});
		out.mediaLabel = (await admin.adminMediaUsage(db, m.id))
			.find((u) => u.kind === "Form content").label;
	`);

	// the correlated subquery has to name the outer table: a bare column binds to
	// translations.id inside it and every label silently comes back null
	it("names the row from the default language, not from nothing", () => {
		expect(r.donationLabel).toBe("Label proof campaign");
		expect(r.mediaLabel).toBe("Label proof form");
	});
});

describe("a campaign with no title in the default language", () => {
	const r = run<{ refused: string; listed: number }>(`
		try {
			await campaigns.createCampaign(db, {
				slug: "no-default-title", status: "active", currency: "USD",
				goalAmount: null, coverMediaId: null, presets: [], allowCustom: true,
				impactTiers: [], showSupporters: true, featured: false, sort: 0,
				translations: [{ lang: "km", title: "គ្មានចំណងជើងអង់គ្លេស", blurb: "" }],
			});
			out.refused = "";
		} catch (e) {
			out.refused = String(e.message ?? e);
		}
		out.listed = (await campaigns.adminListCampaigns(db))
			.filter((c) => c.slug === "no-default-title").length;
	`);

	// no screen can name, list or link a row the default language has no title for
	it("is refused rather than stored unnameable", () => {
		expect(r.refused).toContain("needs a title in the default language");
		expect(r.listed).toBe(0);
	});
});
