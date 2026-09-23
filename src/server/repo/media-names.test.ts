import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// against a real installed database and the real upload route: the name is
// stored by that handler and the label is derived in SQL, so a stub tests neither
const dir = mkdtempSync(join(tmpdir(), "media-names-"));
const dbPath = join(dir, "media.db");
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
		`import { rm } from "node:fs/promises";
		 import { db } from "${root}/src/server/db.ts";
		 import * as admin from "${root}/src/server/repo/admin.ts";
		 import { mediaUsedBy } from "${root}/src/server/repo/media-usage.ts";
		 import { authenticate, createSession, SESSION_COOKIE } from "${root}/src/server/auth.ts";
		 import { Route } from "${root}/src/routes/api.media.$.tsx";

		 const sql = (q, ...a) => db.$client.query(q).all(...a);
		 const out = {};

		 const user = await authenticate(db, "owner@test.example", "test-install-password");
		 const { token } = await createSession(db, user.id);
		 const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46]);
		 const form = new FormData();
		 form.append("file", new File([pdf], "../../etc/Annual Report 2024.pdf", { type: "application/pdf" }));
		 const res = await Route.options.server.handlers.POST({
			request: new Request("http://localhost/api/media/upload", {
				method: "POST",
				body: form,
				headers: { cookie: SESSION_COOKIE + "=" + token },
			}),
		 });
		 out.uploadStatus = res.status;
		 const uploaded = await res.json();
		 out.uploadedName = uploaded.originalName;
		 const [stored] = sql("select original_name, r2_key from media where id = ?", uploaded.id);
		 out.storedName = stored.original_name;
		 await rm("public/" + stored.r2_key, { force: true });

		 const add = (key) =>
			admin.createMediaRecord(db, {
				r2Key: "seed/" + key, url: "/uploads/" + key + ".jpg",
				contentType: "image/jpeg", size: 10,
			});
		 const cover = await add("cover");
		 const portrait = await add("portrait");
		 const gallery = await add("gallery");
		 const attached = await add("attached");
		 const inSection = await add("in-section");
		 const inBody = await add("in-body");
		 const orphan = await add("orphan");
		 const twice = await add("twice");
		 const url = (id) => sql("select url from media where id = ?", id)[0].url;

		 sql("insert into posts (tenant_id, content_type, slug, status, cover_media_id) values (1,'news','annual-report-2024','published',?)", cover);
		 sql("insert into people (tenant_id, tier, is_public, photo_media_id, sort) values (1,'staff',1,?,0)", portrait);
		 const personId = sql("select id from people where photo_media_id = ?", portrait)[0].id;
		 sql("insert into translations (tenant_id, entity_type, entity_id, field, lang, value) values (1,'person',?,'name','en','Sao Vanna')", personId);

		 sql("insert into posts (tenant_id, content_type, slug, status) values (1,'album','school-visit-album','published')");
		 const albumId = sql("select id from posts where slug = 'school-visit-album'")[0].id;
		 sql("insert into post_media (post_id, media_id, sort) values (?,?,0)", albumId, gallery);

		 sql("insert into posts (tenant_id, content_type, slug, status, meta) values (1,'publication','program-report','published',?)",
			JSON.stringify({ fileUrl: url(attached), year: "2024" }));

		 sql("insert into pages (tenant_id, slug, segment, status, sections) values (1,'who-we-are','who-we-are','published',?)",
			JSON.stringify([{ type: "hero", props: { image: url(inSection) } }]));

		 sql("insert into posts (tenant_id, content_type, slug, status) values (1,'story','a-story','published')");
		 const storyId = sql("select id from posts where slug = 'a-story'")[0].id;
		 sql("insert into translations (tenant_id, entity_type, entity_id, field, lang, value) values (1,'post',?,'body','en',?)",
			storyId, '<p><img src="' + url(inBody) + '"></p>');

		 sql("insert into posts (tenant_id, content_type, slug, status, cover_media_id) values (1,'news','twice-over','published',?)", twice);
		 sql("insert into pages (tenant_id, slug, segment, status, hero_media_id) values (1,'contact','contact','published',?)", twice);

		 const ids = [cover, portrait, gallery, attached, inSection, inBody, orphan, twice];
		 const rows = ids.map((id) => ({ id, url: url(id) }));
		 const labels = await mediaUsedBy(db, rows);
		 out.labels = Object.fromEntries(
			ids.map((id, i) => [["cover","portrait","gallery","attached","inSection","inBody","orphan","twice"][i], labels.get(id) ?? null]),
		 );
		 out.twiceCount = [...labels.keys()].filter((k) => k === twice).length;

		 const page = await admin.adminListMediaPage(db, { limit: 100, offset: 0, type: "all" });
		 out.pageUsedBy = page.find((r) => r.id === attached).usedBy;
		 out.pageOrphan = page.find((r) => r.id === orphan).usedBy;
		 out.pageNamed = page.find((r) => r.id === uploaded.id).originalName;

		 const byName = await admin.adminListMediaPage(db, { limit: 100, offset: 0, type: "all", query: "Annual Report" });
		 out.searchHits = byName.map((r) => r.originalName);
		 const wildcard = await admin.adminListMediaPage(db, { limit: 100, offset: 0, type: "all", query: "%" });
		 out.wildcardHits = wildcard.length;

		 console.log(JSON.stringify(out));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const r = JSON.parse(out.trim().split("\n").pop() ?? "{}") as {
	uploadStatus: number;
	uploadedName: string;
	storedName: string;
	labels: Record<string, string | null>;
	twiceCount: number;
	pageUsedBy: string | null;
	pageOrphan: string | null;
	pageNamed: string | null;
	searchHits: string[];
	wildcardHits: number;
};

describe("an upload", () => {
	it("stores the name the operator recognises, sanitised", () => {
		expect(r.uploadStatus).toBe(200);
		expect(r.storedName).toBe("Annual Report 2024.pdf");
		expect(r.uploadedName).toBe("Annual Report 2024.pdf");
	});

	it("shows that name in the library", () => {
		expect(r.pageNamed).toBe("Annual Report 2024.pdf");
	});
});

describe("the library's search box", () => {
	it("finds a file by the name it was uploaded under", () => {
		expect(r.searchHits).toEqual(["Annual Report 2024.pdf"]);
	});

	it("treats a typed wildcard as a character, not as every row", () => {
		expect(r.wildcardHits).toBe(0);
	});
});

describe("an unnamed file's label", () => {
	it("names the post whose cover it is", () => {
		expect(r.labels.cover).toBe("annual-report-2024");
	});

	it("names the person whose photo it is, in their own language", () => {
		expect(r.labels.portrait).toBe("Sao Vanna");
	});

	it("names the album it is a gallery image of", () => {
		expect(r.labels.gallery).toBe("school-visit-album");
	});

	it("names the publication it is attached to as a PDF", () => {
		expect(r.labels.attached).toBe("program-report");
	});

	it("names the page whose section draws it", () => {
		expect(r.labels.inSection).toBe("who-we-are");
	});

	it("names the post whose body embeds it", () => {
		expect(r.labels.inBody).toBe("a-story");
	});

	it("gives a file nothing references no label at all", () => {
		expect(r.labels.orphan).toBeNull();
		expect(r.pageOrphan).toBeNull();
	});

	it("gives a file two records reference exactly one label", () => {
		expect(r.twiceCount).toBe(1);
		expect(r.labels.twice).toBe("twice-over");
	});

	it("rides along on the library page, not a second request", () => {
		expect(r.pageUsedBy).toBe("program-report");
	});
});
