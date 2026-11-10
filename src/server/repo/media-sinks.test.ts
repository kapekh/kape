import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { is } from "drizzle-orm";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import { afterAll, describe, expect, it } from "vitest";

import * as schema from "../schema";
import { MEDIA_TEXT_REFS } from "./media-refs";

/**
 * A media url can be written into any text column, so the schema cannot say
 * where they are — only the content can. This seeds the repo's own example site,
 * which exercises every writer the product has, writes a url into each sink the
 * code claims to know, then reads every text column back and fails on a url
 * nothing scans. A column shared by unrelated rows is checked a row at a time,
 * so forgetting one key of one setting fails as loudly as forgetting a table.
 *
 * What it cannot see is a sink no fixture ever fills; those are caught the first
 * time someone seeds content for the feature.
 */
const dir = mkdtempSync(join(tmpdir(), "media-sinks-"));
const dbPath = join(dir, "sinks.db");
const root = process.cwd();

afterAll(() => rmSync(dir, { recursive: true, force: true }));

execFileSync("bun", ["src/server/seed/kape.ts"], {
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

const nameOf = (ref: (typeof MEDIA_TEXT_REFS)[number]) =>
	`${getTableConfig(ref.table).name}.${ref.column.name}`;

function textColumns(): { table: string; column: string }[] {
	const out: { table: string; column: string }[] = [];
	for (const table of Object.values(schema)) {
		if (!is(table, SQLiteTable)) continue;
		const config = getTableConfig(table);
		for (const column of config.columns)
			if (column.getSQLType().toLowerCase().includes("text"))
				out.push({ table: config.name, column: column.name });
	}
	return out;
}

// media's own columns are the file, not a reference to it; render_cache is
// rebuilt from the content it copied, and every admin write already clears it
const notASink = new Set(["media.url", "media.r2_key", "render_cache.data"]);

/**
 * How to check each column: a ref with no `keys` covers the whole column, so
 * nothing there can be unregistered. A column whose refs all name their rows is
 * probed for the rows holding a url, and any row outside the union is a hole.
 */
const probes = textColumns()
	.filter(({ table, column }) => !notASink.has(`${table}.${column}`))
	.map(({ table, column }) => {
		const refs = MEDIA_TEXT_REFS.filter(
			(ref) => nameOf(ref) === `${table}.${column}`,
		);
		if (refs.some((ref) => !ref.keys)) return null;
		const keyed = refs.length > 0;
		return {
			table,
			column,
			// translations is read whole, so no field of it needs registering
			rowId: keyed ? refs[0].rowId.name : null,
			allowed: keyed ? refs.flatMap((ref) => ref.keys ?? []) : [],
		};
	})
	.filter(
		(p): p is NonNullable<typeof p> =>
			p !== null && `${p.table}.${p.column}` !== "translations.value",
	);

const out = execFileSync(
	"bun",
	[
		"-e",
		`import { db } from "${root}/src/server/db.ts"; import { raw } from "${root}/src/server/test-raw.ts";
		 import * as admin from "${root}/src/server/repo/admin.ts";
		 import { adminMediaUsage, MediaInUseError } from "${root}/src/server/repo/media-usage.ts";

		 const sql = (q, ...a) => raw.query(q).all(...a);
		 const out = {};
		 const probes = ${JSON.stringify(probes)};

		 const add = async (key) =>
			admin.createMediaRecord(db, {
				r2Key: "uploads/" + key + ".png", url: "/uploads/" + key + ".png",
				contentType: "image/png", size: 10,
			});
		 const url = (id) => sql("select url from media where id = ?", id)[0].url;

		 const attached = await add("attached");
		 const covering = await add("covering");
		 const orphan = await add("orphan");

		 const pub = sql("select id, meta from posts where content_type = 'publication' order by id limit 1")[0];
		 sql("update posts set meta = ? where id = ?",
			JSON.stringify({ ...JSON.parse(pub.meta ?? "{}"), fileUrl: url(attached) }), pub.id);
		 sql("update posts set cover_media_id = ? where id = ?", covering, pub.id);

		 // one real media url per claimed setting key, or a key dropped from the
		 // list would leave nothing behind for the scan to find
		 const branded = {};
		 for (const key of ["logo_url", "favicon_url", "og_image"]) {
			branded[key] = await add(key);
			await admin.upsertSetting(db, key, url(branded[key]));
		 }
		 branded.footer_socials = await add("social");
		 await admin.upsertSetting(db, "footer_socials", JSON.stringify(
			[{ name: "Facebook", url: "https://fb.example", logoUrl: url(branded.footer_socials) }]));

		 // every url the library could be asked to delete, not a guessed shape
		 const patterns = sql("select distinct url from media where url is not null and url <> ''")
			.map((r) => "%" + r.url.replace(/[\\\\%_]/g, "\\\\$&") + "%");
		 const holdsUrl = (column) =>
			patterns.map(() => '"' + column + '" like ? escape ' + "'\\\\'").join(" or ");

		 out.unregistered = [];
		 out.keyedRows = {};
		 for (const p of probes) {
			const where = holdsUrl(p.column);
			if (!p.rowId) {
				if (sql('select 1 from "' + p.table + '" where ' + where + " limit 1", ...patterns).length)
					out.unregistered.push(p.table + "." + p.column);
				continue;
			}
			out.keyedRows[p.table + "." + p.column] = sql(
				'select distinct "' + p.rowId + '" as k from "' + p.table + '" where ' + where,
				...patterns,
			).map((r) => String(r.k));
		 }

		 const blocking = async (id) =>
			(await adminMediaUsage(db, id)).map((u) => u.kind + ":" + u.blocking);
		 out.blockingAttached = await blocking(attached);
		 out.blockingBranded = await blocking(branded.logo_url);
		 out.blockingCover = await blocking(covering);

		 const refuse = async (id) => {
			try { await admin.deleteMedia(db, id); return "deleted"; }
			catch (e) { return e instanceof MediaInUseError ? "refused: " + e.message : "threw: " + e.message; }
		 };
		 out.deleteAttached = await refuse(attached);
		 out.deleteBranded = await refuse(branded.og_image);
		 out.deleteOrphan = await refuse(orphan);
		 out.orphanGone = sql("select 1 from media where id = ?", orphan).length === 0;

		 console.log(JSON.stringify(out));
		 process.exit(0);`,
	],
	{
		env: { ...process.env, DATABASE_PATH: dbPath, SSG_CACHE: "off" },
		encoding: "utf8",
	},
);

const r = JSON.parse(out.trim().split("\n").pop() ?? "{}") as {
	unregistered: string[];
	keyedRows: Record<string, string[]>;
	blockingAttached: string[];
	blockingBranded: string[];
	blockingCover: string[];
	deleteAttached: string;
	deleteBranded: string;
	deleteOrphan: string;
	orphanGone: boolean;
};

const allowedFor = (column: string) =>
	probes.find((p) => `${p.table}.${p.column}` === column)?.allowed ?? [];

describe("every column a media url reaches", () => {
	it("is one the code knows to look in", () => {
		expect(
			r.unregistered,
			"a media url is stored in a column nothing scans: register it in MEDIA_TEXT_REFS, or add it to notASink with the reason",
		).toEqual([]);
	});

	it("names every row of a shared column that holds one", () => {
		const holes = Object.entries(r.keyedRows).flatMap(([column, rows]) =>
			rows
				.filter((row) => !allowedFor(column).includes(row))
				.map((row) => `${column}[${row}]`),
		);
		expect(
			holes,
			"a media url is stored under a key no MEDIA_TEXT_REFS entry lists: add the key to that ref's `keys`",
		).toEqual([]);
	});

	it("looked at the settings rows at all, rather than finding nothing", () => {
		expect([...(r.keyedRows["site_settings.value"] ?? [])].sort()).toEqual([
			"favicon_url",
			"footer_socials",
			"logo_url",
			"og_image",
		]);
	});
});

// the library offers "delete anyway" on a usage it can clear and refuses to
// offer it on one it cannot, so the two have to be told apart before the confirm
describe("a usage says whether it blocks the delete", () => {
	it("blocks on a url inside someone's content", () => {
		expect(r.blockingAttached).toEqual(["Attached file:true"]);
		expect(r.blockingBranded).toEqual(["Site setting:true"]);
	});

	it("does not block on a foreign key, which a delete can clear", () => {
		expect(r.blockingCover).toEqual(["Post cover:false"]);
	});
});

describe("deleting a file something still uses", () => {
	it("is refused when a publication serves it as its PDF", () => {
		expect(r.deleteAttached).toMatch(/^refused:/);
		expect(r.deleteAttached).toContain("Attached file");
	});

	it("is refused when the site shares it as its social image", () => {
		expect(r.deleteBranded).toMatch(/^refused:/);
		expect(r.deleteBranded).toContain("Social share image");
	});

	it("goes ahead when nothing references it", () => {
		expect(r.deleteOrphan).toBe("deleted");
		expect(r.orphanGone).toBe(true);
	});
});
