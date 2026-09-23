import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database: a width that does not travel with its url
// leaves the reader offering derivative files nothing ever wrote
const dir = mkdtempSync(join(tmpdir(), "image-width-payloads-"));
const dbPath = join(dir, "widths.db");
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

const COVER = "/uploads/cover.jpg";
const COVER_WIDTH = 1600;
const CARD = "/uploads/card.png";
const CARD_WIDTH = 900;

type Seen = {
	pageCover: { url: string | null; width: number | null };
	childCover: { url: string | null; width: number | null };
	postCover: { url: string | null; width: number | null };
	video: { url: string | null; width: number | null };
	person: { url: string | null; width: number | null };
	profile: { url: string | null; width: number | null };
	colleague: { url: string | null; width: number | null };
	donor: { url: string | null; width: number | null };
	orgNode: { url: string | null; width: number | null };
	campaign: { url: string | null; width: number | null };
	sectionWidths: Record<string, number>;
	unmeasured: Record<string, number>;
};

const out = execFileSync(
	"bun",
	[
		"-e",
		`import { db } from "${root}/src/server/db.ts";
		 import * as admin from "${root}/src/server/repo/admin.ts";
		 import * as campaigns from "${root}/src/server/repo/campaigns.ts";
		 import * as content from "${root}/src/server/repo/content.ts";
		 import * as org from "${root}/src/server/repo/org.ts";
		 import * as people from "${root}/src/server/repo/people.ts";
		 import * as projects from "${root}/src/server/repo/projects.ts";
		 import { resolveSections } from "${root}/src/server/repo/sections.ts";

		 const cover = await admin.createMediaRecord(db, {
			r2Key: "uploads/cover.jpg", url: "${COVER}",
			contentType: "image/jpeg", size: 10, width: ${COVER_WIDTH}, height: 900,
		 });
		 const card = await admin.createMediaRecord(db, {
			r2Key: "uploads/card.png", url: "${CARD}",
			contentType: "image/png", size: 10, width: ${CARD_WIDTH}, height: 600,
		 });
		 const unmeasured = await admin.createMediaRecord(db, {
			r2Key: "uploads/scan.jpg", url: "/uploads/scan.jpg",
			contentType: "image/jpeg", size: 10,
		 });

		 const text = (title) => [{ lang: "en", title, excerpt: "", body: "" }];
		 const hub = await admin.createPage(db, {
			slug: "", segment: "about", parentId: null, status: "published",
			coverMediaId: cover, sections: [], translations: text("About"),
		 });
		 await admin.createPage(db, {
			slug: "", segment: "team", parentId: hub, status: "published",
			coverMediaId: cover, sections: [], translations: text("Team"),
		 });
		 const page = await content.getPageBySlug(db, "about", "en");

		 const postId = await admin.createPost(db, {
			contentType: "news", slug: "opening", status: "published",
			coverMediaId: cover,
			translations: [{ lang: "en", title: "Opening", excerpt: "", body: "" }],
		 });
		 const post = await content.getPostBySlug(db, "opening", "en");

		 await admin.createPost(db, {
			contentType: "video", slug: "clip", status: "published",
			coverMediaId: cover, meta: { youtube_url: "" },
			translations: [{ lang: "en", title: "Clip", excerpt: "", body: "" }],
		 });
		 const video = (await content.listVideos(db, "en"))[0];

		 const person = (name, slug) => people.createPerson(db, {
			tier: "smt", isPublic: true, slug, photoMediaId: cover, staffNo: null,
			sex: null, phone: null, email: null, program: null, sort: 0,
			translations: [{ lang: "en", name, position: "Lead", bio: "" }],
		 });
		 const personId = await person("Sok Dara", "sok-dara");
		 await person("Chan Sina", "chan-sina");
		 const listed = (await people.listPeople(db, "en")).find((p) => p.id === personId);
		 const profile = await people.getPersonBySlug(db, "sok-dara", "en");

		 const donorId = await admin.createDonor(db, {
			name: "A Funder", url: "", sort: 0, logoMediaId: cover,
		 });
		 await admin.createProject(db, {
			code: "IEP", slug: "iep", parentId: null, status: "current", sort: 0,
			startDate: "", endDate: "", targetAreas: [], snapshots: [],
			donorIds: [donorId], locations: [],
			translations: [{ lang: "en", name: "IEP", summary: "", body: "" }],
		 });
		 const project = await projects.getProjectBySlug(db, "iep", "en");

		 await org.createOrgNode(db, {
			parentId: null, personId,
			translations: [{ lang: "en", name: "Executive Director", title: "Director" }],
		 });
		 const node = (await org.getOrgTree(db, "en"))[0];

		 await campaigns.createCampaign(db, {
			slug: "classrooms", status: "active", currency: "USD", goalAmount: null,
			coverMediaId: cover, presets: [], allowCustom: true, impactTiers: [],
			showSupporters: true, featured: false, sort: 0,
			translations: [{ lang: "en", title: "Classrooms", blurb: "" }],
		 });
		 const [campaign] = await campaigns.listActiveCampaigns(db, "en");

		 const [section] = await resolveSections(db, [{
			id: "s1", type: "cards",
			props: { title: "Our work", items: [{ image: "${CARD}", title: "One" }] },
		 }], "en");
		 const [missing] = await resolveSections(db, [{
			id: "s2", type: "cards",
			props: { items: [{ image: "/uploads/scan.jpg" }, { image: "/uploads/gone.jpg" }] },
		 }], "en");

		 const pair = (url, width) => ({ url: url ?? null, width: width ?? null });
		 console.log(JSON.stringify({
			pageCover: pair(page.coverUrl, page.coverWidth),
			childCover: pair(page.children[0].coverUrl, page.children[0].coverWidth),
			postCover: pair(post.coverUrl, post.coverWidth),
			video: pair(video.image, video.imageWidth),
			person: pair(listed.photoUrl, listed.photoUrlWidth),
			profile: pair(profile.photoUrl, profile.photoUrlWidth),
			colleague: pair(profile.colleagues[0].photoUrl, profile.colleagues[0].photoUrlWidth),
			donor: pair(project.donors[0].logoUrl, project.donors[0].logoWidth),
			orgNode: pair(node.photoUrl, node.photoWidth),
			campaign: pair(campaign.coverUrl, campaign.coverWidth),
			sectionWidths: section.props.mediaWidths ?? {},
			unmeasured: missing.props.mediaWidths ?? {},
		 }));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const seen = JSON.parse(out.trim().split("\n").at(-1) as string) as Seen;
const cover = { url: COVER, width: COVER_WIDTH };

describe("the intrinsic width travels with the image url", () => {
	it("on a page's hero cover", () => {
		expect(seen.pageCover).toEqual(cover);
	});

	it("on a hub's child cards", () => {
		expect(seen.childCover).toEqual(cover);
	});

	it("on an article's hero cover", () => {
		expect(seen.postCover).toEqual(cover);
	});

	it("on a video's own cover, which is not a YouTube thumbnail", () => {
		expect(seen.video).toEqual(cover);
	});

	it("on a listed person's portrait", () => {
		expect(seen.person).toEqual(cover);
	});

	it("on a profile's portrait and on the colleagues beside it", () => {
		expect(seen.profile).toEqual(cover);
		expect(seen.colleague).toEqual(cover);
	});

	it("on a project donor's logo", () => {
		expect(seen.donor).toEqual(cover);
	});

	it("on an org-chart node's portrait", () => {
		expect(seen.orgNode).toEqual(cover);
	});

	it("on a donate hub campaign's cover", () => {
		expect(seen.campaign).toEqual(cover);
	});

	// an editor's section props hold a bare url, so the width is looked up and sent beside it
	it("on an image a section names in its own props", () => {
		expect(seen.sectionWidths).toEqual({ [CARD]: CARD_WIDTH });
	});

	it("and is simply absent for an upload nothing measured", () => {
		expect(seen.unmeasured).toEqual({});
	});
});
