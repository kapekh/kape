import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// driven through the repo against a real installed database: what is tested is the transaction the driver runs
const dir = mkdtempSync(join(tmpdir(), "delete-integrity-"));
const dbPath = join(dir, "integrity.db");
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

/** Run a script against the installed database; it prints one JSON object. */
function run(body: string): Record<string, unknown> {
	const out = execFileSync(
		"bun",
		[
			"-e",
			`import { db } from "${root}/src/server/db.ts";
			 import * as admin from "${root}/src/server/repo/admin.ts";
			 import * as usersRepo from "${root}/src/server/repo/users.ts";
			 import { createSession } from "${root}/src/server/auth.ts";
			 const q = (s, ...a) => db.$client.query(s).all(...a);
			 const exec = (s, ...a) => db.$client.query(s).run(...a);
			 const n = (s, ...a) => Number(q(s, ...a)[0].c);
			 const refusal = async (fn) => { try { await fn(); return ""; } catch (e) { return e.message; } };
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
	return JSON.parse(out.trim().split("\n").pop() ?? "{}");
}

const projectInput = JSON.stringify({
	code: "TST",
	slug: "test-project",
	status: "active",
	sort: 0,
	startDate: "",
	endDate: "",
	targetAreas: [],
	snapshots: [],
	translations: [
		{ lang: "en", name: "Test Project", summary: "S", body: "B" },
		{ lang: "km", name: "គម្រោង", summary: "ស", body: "ខ" },
	],
	donorIds: [],
	locations: [{ schoolName: "Pin", lat: "11.5", lng: "104.9" }],
});

describe("deleting a project a school still points at", () => {
	const r = run(`
		await admin.createLanguage(db, {
			code: "km", name: "Khmer", nativeName: "ខ្មែរ",
			enabled: true, isDefault: false, rtl: false, sort: 1,
		});
		const donorId = await admin.createDonor(db, { name: "Test Donor", url: "", sort: 0 });
		const projectId = await admin.createProject(db, { ...${projectInput}, donorIds: [donorId] });
		await admin.createSchool(db, {
			translations: [{ lang: "en", name: "Attached School", address: "" }],
			code: "", level: "primary", province: "",
			projectId, coverMediaId: null, lat: "", lng: "", sort: 0,
		});
		const counts = () => ({
			translations: n("select count(*) c from translations where entity_type='project' and entity_id=?", projectId),
			donors: n("select count(*) c from project_donors where project_id=?", projectId),
			locations: n("select count(*) c from project_locations where project_id=?", projectId),
			project: n("select count(*) c from projects where id=?", projectId),
		});
		out.before = counts();
		out.refusal = await refusal(() => admin.deleteProject(db, projectId));
		out.after = counts();
		exec("update schools set project_id = null where project_id = ?", projectId);
		out.detachedRefusal = await refusal(() => admin.deleteProject(db, projectId));
		out.afterDetached = counts();
	`);

	it("is refused", () => {
		expect(r.refusal).toMatch(/FOREIGN KEY/i);
	});

	it("leaves every related row where it was", () => {
		expect(r.before).toEqual({
			translations: 6,
			donors: 1,
			locations: 1,
			project: 1,
		});
		expect(r.after).toEqual(r.before);
	});

	it("goes through once nothing points at it", () => {
		expect(r.detachedRefusal).toBe("");
		expect(r.afterDetached).toEqual({
			translations: 0,
			donors: 0,
			locations: 0,
			project: 0,
		});
	});
});

describe("deleting a page that has children", () => {
	const page = (segment: string, parentId: number | null, title: string) =>
		JSON.stringify({
			slug: segment,
			segment,
			parentId,
			status: "published",
			coverMediaId: null,
			sections: [],
			translations: [{ lang: "en", title, excerpt: "", body: "" }],
		});

	const r = run(`
		const parent = await admin.createPage(db, ${page("parent", null, "Parent")});
		const middle = await admin.createPage(db, { ...${page("middle", null, "Middle")}, parentId: parent });
		const leaf = await admin.createPage(db, { ...${page("leaf", null, "Leaf")}, parentId: middle });
		const slug = (id) => q("select slug from pages where id=?", id)[0]?.slug ?? null;
		const parentOf = (id) => q("select parent_id p from pages where id=?", id)[0]?.p ?? null;
		const redirects = () => q("select from_slug f from slug_redirects where entity_type='page'").map((x) => x.f);

		out.before = { middle: slug(middle), leaf: slug(leaf), leafParent: parentOf(leaf) };

		// a delete that fails on its last statement must leave the reparenting behind it undone
		exec("create trigger t_no_page_delete before delete on pages begin select raise(abort, 'boom'); end");
		out.abortMessage = await refusal(() => admin.deletePage(db, middle));
		out.afterAbort = {
			middle: slug(middle),
			leaf: slug(leaf),
			leafParent: parentOf(leaf),
			redirects: redirects(),
			middleTranslations: n("select count(*) c from translations where entity_type='page' and entity_id=?", middle),
		};
		exec("drop trigger t_no_page_delete");

		out.refusal = await refusal(() => admin.deletePage(db, middle));
		out.after = {
			middle: slug(middle),
			leaf: slug(leaf),
			leafParent: parentOf(leaf),
			leafIsUnderParent: parentOf(leaf) === parent,
			redirects: redirects(),
			middleTranslations: n("select count(*) c from translations where entity_type='page' and entity_id=?", middle),
		};
	`);

	it("starts with the leaf two levels down", () => {
		expect(r.before).toMatchObject({
			middle: "parent/middle",
			leaf: "parent/middle/leaf",
		});
	});

	it("rolls the reparenting back when the delete itself fails", () => {
		expect(r.abortMessage).toMatch(/boom/i);
		expect(r.afterAbort).toMatchObject({
			middle: "parent/middle",
			leaf: "parent/middle/leaf",
			redirects: [],
			middleTranslations: 1,
		});
		expect((r.afterAbort as { leafParent: number }).leafParent).toBe(
			(r.before as { leafParent: number }).leafParent,
		);
	});

	it("lifts the leaf up to the grandparent and leaves a 301 behind it", () => {
		expect(r.refusal).toBe("");
		expect(r.after).toMatchObject({
			middle: null,
			leaf: "parent/leaf",
			leafIsUnderParent: true,
			redirects: ["parent/middle/leaf"],
			middleTranslations: 0,
		});
	});
});

describe("deleting a user", () => {
	const r = run(`
		const owner = q("select id from users where email = 'owner@test.example'")[0].id;
		const signedIn = await usersRepo.createUser(db, {
			email: "signedin@test.example", name: "Signed In", role: "staff", password: "pw-long-enough",
		});
		await createSession(db, signedIn);
		out.sessionsBefore = n("select count(*) c from sessions where user_id=?", signedIn);
		out.signedInRefusal = await refusal(() => usersRepo.deleteUser(db, signedIn, owner));
		out.signedInLeft = n("select count(*) c from users where id=?", signedIn);
		out.sessionsAfter = n("select count(*) c from sessions where user_id=?", signedIn);

		const never = await usersRepo.createUser(db, {
			email: "never@test.example", name: "Never", role: "staff", password: "pw-long-enough",
		});
		out.neverRefusal = await refusal(() => usersRepo.deleteUser(db, never, owner));
		out.neverLeft = n("select count(*) c from users where id=?", never);
	`);

	it("works for a user who has signed in, and takes their sessions with it", () => {
		expect(r.sessionsBefore).toBe(1);
		expect(r.signedInRefusal).toBe("");
		expect(r.signedInLeft).toBe(0);
		expect(r.sessionsAfter).toBe(0);
	});

	it("works for a user who never signed in", () => {
		expect(r.neverRefusal).toBe("");
		expect(r.neverLeft).toBe(0);
	});
});

describe("deleting a taxonomy term something still points at", () => {
	const r = run(`
		const termId = await admin.createTerm(db, {
			taxonomy: "location", key: "kampong-cham", labels: { en: "Kampong Cham" }, sort: 0,
		});
		const spareId = await admin.createTerm(db, {
			taxonomy: "location", key: "kandal", labels: { en: "Kandal" }, sort: 1,
		});
		const officeId = await admin.createOffice(db, {
			province: "kampong-cham", phone: "", email: "", lat: "", lng: "",
			isHq: true, sort: 0,
			translations: [{ lang: "en", name: "Head Office", address: "" }],
		});
		const left = () => n("select count(*) c from terms where id=?", termId);

		out.refusal = await refusal(() => admin.deleteTerm(db, termId));
		out.afterRefusal = left();
		out.officeProvince = q("select province p from offices where id=?", officeId)[0].p;

		out.spareRefusal = await refusal(() => admin.deleteTerm(db, spareId));
		out.spareLeft = n("select count(*) c from terms where id=?", spareId);

		exec("update offices set province = null where id = ?", officeId);
		out.detachedRefusal = await refusal(() => admin.deleteTerm(db, termId));
		out.afterDetached = left();
	`);

	it("is refused, and names what holds it", () => {
		expect(r.refusal).toContain("Kampong Cham");
		expect(r.refusal).toContain("1 office");
	});

	it("leaves the term and the row pointing at it alone", () => {
		expect(r.afterRefusal).toBe(1);
		expect(r.officeProvince).toBe("kampong-cham");
	});

	it("does not refuse a term nothing points at", () => {
		expect(r.spareRefusal).toBe("");
		expect(r.spareLeft).toBe(0);
	});

	it("goes through once nothing points at it", () => {
		expect(r.detachedRefusal).toBe("");
		expect(r.afterDetached).toBe(0);
	});
});
