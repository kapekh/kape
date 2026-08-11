import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { COLLECTIONS } from "#/lib/collections";
import { HEADER_DEFAULTS } from "#/lib/header-defaults";
import { sectionDef } from "#/lib/sections";
import { LANDINGS } from "./seed/landings";

// asserts shape: presence checks alone let a section type be renamed to garbage and every string be filed under the wrong language
const dir = mkdtempSync(join(tmpdir(), "install-test-"));
const dbPath = join(dir, "install.db");

const env = {
	...process.env,
	DATABASE_PATH: dbPath,
	SITE_NAME: "Test Org",
	ADMIN_EMAIL: "owner@test.example",
	ADMIN_PASSWORD: "test-install-password",
	SSG_CACHE: "off",
};

const stdout = execFileSync("bun", ["src/server/install.ts"], {
	env,
	encoding: "utf8",
});

const queryIn = (file: string, sql: string) =>
	JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`import {Database} from "bun:sqlite";
				 let d; try { d = new Database(process.argv[1], {readonly: true}); }
				 catch { console.log("[]"); process.exit(0); }
				 console.log(JSON.stringify(d.query(process.argv[2]).all()));`,
				file,
				sql,
			],
			{ encoding: "utf8" },
		),
	) as Record<string, string | number>[];

const query = (sql: string) => queryIn(dbPath, sql);
const count = (file: string, table: string) => {
	const rows = queryIn(file, `SELECT count(*) AS c FROM ${table}`);
	return rows.length ? Number(rows[0].c) : 0;
};

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("fresh install", () => {
	it("does not print the password the operator supplied", () => {
		expect(stdout).toContain("owner@test.example");
		expect(stdout).not.toContain("test-install-password");
	});

	it("establishes exactly one default language, the configured one", () => {
		const rows = query("SELECT code, is_default FROM languages");
		expect(rows).toEqual([{ code: "en", is_default: 1 }]);
	});

	it("gives the header, footer and meta tags a site name to render", () => {
		const rows = query(
			"SELECT value FROM site_settings WHERE key = 'site_name_en'",
		);
		expect(rows[0]?.value).toBe("Test Org");
	});

	it("writes every header default, with its default value", () => {
		const rows = query("SELECT key, value FROM site_settings");
		const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
		for (const [key, value] of Object.entries(HEADER_DEFAULTS))
			expect(`${key}=${stored[key]}`).toBe(`${key}=${value}`);
	});

	it("keeps its own bookkeeping out of the settings an operator edits", () => {
		// install_completed_at is how a later boot tells a finished install from an
		// abandoned one; it is not site identity and is not shipped to the browser.
		const rows = query(
			"SELECT value FROM site_settings WHERE key = 'install_completed_at'",
		);
		expect(rows).toHaveLength(1);
		expect(Number.isNaN(Date.parse(String(rows[0].value)))).toBe(false);
	});

	it("answers on / with a published home page", () => {
		const rows = query(
			"SELECT status, segment, sections FROM pages WHERE slug = 'home'",
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].status).toBe("published");
		// null segment means the page is not addressable in the tree
		expect(rows[0].segment).toBe("home");
		expect(JSON.parse(String(rows[0].sections))).not.toHaveLength(0);
	});

	it("gives every shipped collection a landing page to list it", () => {
		const slugs = query("SELECT slug FROM pages ORDER BY slug").map(
			(r) => r.slug,
		);
		for (const l of LANDINGS) expect(slugs).toContain(l.slug);
	});

	it("points each landing at its own collection", () => {
		// Every landing renders and validates the same whichever content type it is
		// bound to, so nothing but this catches /news listing the job vacancies.
		const bound = Object.fromEntries(
			query("SELECT slug, sections FROM pages").map((r) => [
				r.slug,
				(
					JSON.parse(String(r.sections ?? "[]")) as {
						query?: { source: string; contentType?: string };
					}[]
				)[0]?.query,
			]),
		);
		for (const l of LANDINGS) {
			const col = COLLECTIONS[l.slug];
			const q = bound[l.slug];
			expect(`${l.slug} source=${q?.source}`).toBe(
				`${l.slug} source=${l.section.query?.source}`,
			);
			// Only a posts-backed listing needs the discriminator; the rest bind by source.
			expect(`${l.slug} contentType=${q?.contentType}`).toBe(
				`${l.slug} contentType=${q?.source === "posts" ? col.contentType : undefined}`,
			);
		}
	});

	it("gives every page it writes a title and something to say", () => {
		// A page whose title or body resolves to nothing renders as an empty frame,
		// which reads as a broken install rather than an empty one.
		const titles = Object.fromEntries(
			query(
				`SELECT p.slug AS slug, t.value AS value FROM pages p
				 JOIN translations t ON t.entity_id = p.id
				 WHERE t.entity_type = 'page' AND t.field = 'title'`,
			).map((r) => [r.slug, String(r.value)]),
		);
		for (const l of LANDINGS)
			expect(`${l.slug}: ${titles[l.slug]}`).toBe(
				`${l.slug}: ${COLLECTIONS[l.slug].label}`,
			);
		for (const slug of Object.keys(titles))
			expect(`${slug} title`).not.toBe(`${slug} title=${titles[slug]?.trim()}`);

		const words = (node: unknown): string =>
			node && typeof node === "object"
				? "text" in node
					? String((node as { text: unknown }).text ?? "")
					: Object.values(node)
							.flatMap((v) => (Array.isArray(v) ? v : [v]))
							.map(words)
							.join("")
				: "";
		const [home] = query("SELECT sections FROM pages WHERE slug = 'home'");
		for (const s of JSON.parse(String(home.sections)) as {
			props?: { title?: string; body?: string };
		}[]) {
			expect(s.props?.title?.trim() ?? "").not.toBe("");
			expect(words(JSON.parse(s.props?.body ?? "{}")).trim()).not.toBe("");
		}
	});

	it("only ever writes sections the renderer knows how to draw", () => {
		// A typo here renders "Unknown section type:" where the page's content
		// should be, on a site that has just been installed and has nothing else.
		const rows = query("SELECT slug, sections FROM pages");
		let seen = 0;
		for (const r of rows) {
			for (const s of JSON.parse(String(r.sections ?? "[]")) as {
				type: string;
				layout?: string;
				query?: { source: string };
			}[]) {
				const def = sectionDef(s.type);
				expect(`${r.slug}: ${s.type}`).toBe(`${r.slug}: ${def?.type}`);
				if (!def) continue;
				seen++;
				expect(def.layouts.map((l) => l.value)).toContain(s.layout);
				if (s.query)
					expect(def.sources?.map((x) => x.value) ?? []).toContain(
						s.query.source,
					);
			}
		}
		expect(seen).toBeGreaterThan(LANDINGS.length);
	});

	it("leaves the page tree normalised", () => {
		// normalizeTree assigns each page its segment, parent and position; without
		// it every sibling shares sort_order 0 and the menu order is arbitrary.
		const rows = query(
			"SELECT slug, segment, parent_id, sort_order FROM pages ORDER BY sort_order",
		);
		expect(rows.length).toBeGreaterThan(1);
		expect(rows.map((r) => r.sort_order)).toEqual(rows.map((_, i) => i));
		for (const r of rows) {
			expect(r.segment).toBe(String(r.slug).split("/").pop());
			expect(r.parent_id).toBeNull();
		}
	});

	it("seeds the tables the admin cannot function without", () => {
		for (const table of ["tenants", "roles", "content_types", "ui_strings"])
			expect(`${table}=${count(dbPath, table)}`).not.toBe(`${table}=0`);
	});

	it("creates exactly one administrator, from configuration", () => {
		const rows = query("SELECT email, role FROM users");
		expect(rows).toEqual([{ email: "owner@test.example", role: "admin" }]);
	});

	it("writes no site content", () => {
		for (const table of ["posts", "projects", "nav_items", "media", "people"])
			expect(`${table}=${count(dbPath, table)}`).toBe(`${table}=0`);
	});

	it("is a no-op on a database that already has rows", () => {
		const again = execFileSync("bun", ["src/server/install.ts"], {
			env,
			encoding: "utf8",
		});
		expect(again).toContain("Already installed");
		expect(count(dbPath, "users")).toBe(1);
		const third = execFileSync("bun", ["src/server/install.ts"], {
			env,
			encoding: "utf8",
		});
		expect(third).toContain("Already installed");
		expect(count(dbPath, "users")).toBe(1);
	});
});

describe("a non-default SITE_DEFAULT_LANG", () => {
	const kmPath = join(dir, "km.db");
	const keys = (file: string, sql: string) =>
		queryIn(file, sql).map((r) => String(r.key));

	let failure = "";
	try {
		execFileSync("bun", ["src/server/install.ts"], {
			env: { ...env, DATABASE_PATH: kmPath, SITE_DEFAULT_LANG: "km" },
			encoding: "utf8",
			stdio: "pipe",
		});
	} catch (e) {
		failure = String((e as { stderr?: string }).stderr ?? e);
	}

	it("installs", () => {
		expect(failure).toBe("");
	});

	it("files the whole string dictionary under the language it configured", () => {
		const langs = queryIn(kmPath, "SELECT DISTINCT lang FROM ui_strings").map(
			(r) => r.lang,
		);
		expect(langs).toEqual(["km"]);
	});

	it("leaves no key the default-language install has and this one does not", () => {
		// Filing every row under "en" regardless of configuration leaves a km site
		// with no strings for its own language while every count still looks right.
		const km = keys(kmPath, "SELECT key FROM ui_strings ORDER BY key");
		const en = keys(dbPath, "SELECT key FROM ui_strings ORDER BY key");
		expect(km).toEqual(en);
		expect(km.length).toBeGreaterThan(0);
	});

	it("marks km, and only km, as the default language", () => {
		expect(queryIn(kmPath, "SELECT code, is_default FROM languages")).toEqual([
			{ code: "km", is_default: 1 },
		]);
	});
});

describe("an interrupted install", () => {
	const brokenPath = join(dir, "interrupted.db");
	const tables = [
		"tenants",
		"languages",
		"ui_strings",
		"content_types",
		"roles",
		"users",
		"site_settings",
		"pages",
		"translations",
	];

	// fails one write past languages, which the old guard keyed on, so the database reported itself healthy on every later boot
	const harness = join(dir, "interrupt.ts");
	writeFileSync(
		harness,
		`import { db } from "${process.cwd()}/src/server/db.ts";
		 import { install } from "${process.cwd()}/src/server/install.ts";
		 let n = 0;
		 for (const m of ["insert", "update", "delete"]) {
		 	const orig = db[m].bind(db);
		 	db[m] = (t) => { if (++n === 3) throw new Error("interrupted"); return orig(t); };
		 }
		 try {
		 	await install({ siteName: "Test Org", lang: "en", adminEmail: "owner@test.example", adminPassword: "pw", passwordSupplied: true });
		 	console.log("NOT INTERRUPTED");
		 } catch (e) { console.log("interrupted:", e.message); }
		 process.exit(0);`,
	);
	const interrupted = execFileSync("bun", [harness], {
		env: { ...env, DATABASE_PATH: brokenPath },
		encoding: "utf8",
	});

	it("actually got interrupted", () => {
		expect(interrupted).toContain("interrupted: interrupted");
	});

	it("leaves nothing behind", () => {
		for (const t of tables)
			expect(`${t}=${count(brokenPath, t)}`).toBe(`${t}=0`);
	});

	it("can be installed again, because there is nothing in the way", () => {
		const out = execFileSync("bun", ["src/server/install.ts"], {
			env: { ...env, DATABASE_PATH: brokenPath },
			encoding: "utf8",
		});
		expect(out).toContain("Installed");
		expect(count(brokenPath, "users")).toBe(1);
	});
});

describe("a half-installed database", () => {
	const wedgedPath = join(dir, "wedged.db");

	const run = () => {
		try {
			execFileSync("bun", ["src/server/install.ts"], {
				env: { ...env, DATABASE_PATH: wedgedPath },
				encoding: "utf8",
				stdio: "pipe",
			});
			return { code: 0, err: "" };
		} catch (e) {
			const x = e as { status: number; stderr: string };
			return { code: x.status, err: x.stderr };
		}
	};

	// A database rewound to the point the old installer could abandon it: the
	// languages row is written, nothing after it is.
	execFileSync(
		"bun",
		[
			"-e",
			`import {Database} from "bun:sqlite";
			 new Database(process.argv[1], {readonly: true}).exec("VACUUM INTO '" + process.argv[2] + "'");
			 const d = new Database(process.argv[2]);
			 d.exec("PRAGMA foreign_keys = OFF");
			 for (const t of ["ui_strings","content_types","roles","users","site_settings","pages","translations"]) d.exec("DELETE FROM " + t);`,
			dbPath,
			wedgedPath,
		],
		{ encoding: "utf8" },
	);

	it("is refused, loudly, instead of reported healthy", () => {
		const { code, err } = run();
		expect(code).toBe(1);
		expect(err).toContain("missing rows this site cannot run without");
		expect(err).toContain(
			"Missing: UI strings, content types, roles, administrator",
		);
		expect(err).toContain("Present: tenant, default language");
		expect(err).toContain(wedgedPath);
	});

	it("is not written to by the run that refused it", () => {
		expect(count(wedgedPath, "users")).toBe(0);
		expect(count(wedgedPath, "languages")).toBe(1);
	});

	it("stays refused on every later boot", () => {
		expect(run().code).toBe(1);
		expect(run().code).toBe(1);
	});
});

describe("a database an operator has edited", () => {
	// refusing to boot over any of this would take a working site down over something its owner did on purpose
	const edited = join(dir, "edited.db");

	// spawnSync, not execFileSync: the warnings go to stderr on a run that succeeds,
	// which execFileSync throws away.
	const boot = () => {
		const r = spawnSync("bun", ["src/server/install.ts"], {
			env: { ...env, DATABASE_PATH: edited },
			encoding: "utf8",
		});
		return { code: r.status, out: r.stdout, err: r.stderr };
	};

	execFileSync(
		"bun",
		[
			"-e",
			`import {Database} from "bun:sqlite";
			 new Database(process.argv[1], {readonly: true}).exec("VACUUM INTO '" + process.argv[2] + "'");
			 const d = new Database(process.argv[2]);
			 d.exec("DELETE FROM site_settings WHERE key = 'install_completed_at'");
			 d.exec("DELETE FROM site_settings WHERE key = 'site_name_en'");
			 const id = d.query("select id from pages where slug = 'home'").get().id;
			 d.exec("DELETE FROM translations WHERE entity_type = 'page' AND entity_id = " + id);
			 d.exec("DELETE FROM pages WHERE slug = 'home'");`,
			dbPath,
			edited,
		],
		{ encoding: "utf8" },
	);

	it("boots, because an administrator can put all of it back", () => {
		const { code, out } = boot();
		expect(code).toBe(0);
		expect(out).toContain("Already installed");
	});

	it("says what is wrong instead of staying silent", () => {
		const { err } = boot();
		expect(err).toContain('no page answers at the slug "home"');
		expect(err).toContain("no site name is set");
	});

	it("keeps its content", () => {
		expect(count(edited, "users")).toBe(1);
		expect(count(edited, "pages")).toBe(LANDINGS.length);
	});
});

describe("the completion marker", () => {
	const markerOnly = join(dir, "marker-only.db");

	execFileSync(
		"bun",
		[
			"-e",
			`import {Database} from "bun:sqlite";
			 new Database(process.argv[1], {readonly: true}).exec("VACUUM INTO '" + process.argv[2] + "'");
			 const d = new Database(process.argv[2]);
			 d.exec("PRAGMA foreign_keys = OFF");
			 for (const t of ["tenants","languages","ui_strings","content_types","roles","users","pages","translations","site_settings"]) d.exec("DELETE FROM " + t);
			 d.exec("INSERT INTO site_settings (tenant_id, key, value) VALUES (1, 'install_completed_at', '2020-01-01T00:00:00.000Z')");`,
			dbPath,
			markerOnly,
		],
		{ encoding: "utf8" },
	);

	it("is a diagnostic, not the verdict", () => {
		// Trusting it outright re-keys the original wedge on a different row: a
		// database holding nothing else would report itself installed for ever.
		const out = execFileSync("bun", ["src/server/install.ts"], {
			env: { ...env, DATABASE_PATH: markerOnly },
			encoding: "utf8",
		});
		expect(out).toContain("Installed");
		expect(count(markerOnly, "users")).toBe(1);
	});
});

describe("a partial database that holds content", () => {
	const withWork = join(dir, "with-work.db");

	execFileSync(
		"bun",
		[
			"-e",
			`import {Database} from "bun:sqlite";
			 new Database(process.argv[1], {readonly: true}).exec("VACUUM INTO '" + process.argv[2] + "'");
			 const d = new Database(process.argv[2]);
			 d.exec("PRAGMA foreign_keys = OFF");
			 d.exec("DELETE FROM users");`,
			dbPath,
			withWork,
		],
		{ encoding: "utf8" },
	);

	it("is never told to delete the file", () => {
		let err = "";
		let code = 0;
		try {
			execFileSync("bun", ["src/server/install.ts"], {
				env: { ...env, DATABASE_PATH: withWork },
				encoding: "utf8",
				stdio: "pipe",
			});
		} catch (e) {
			const x = e as { status: number; stderr: string };
			code = x.status;
			err = x.stderr;
		}
		expect(code).toBe(1);
		expect(err).toContain("Missing: administrator");
		expect(err).toContain(`${LANDINGS.length + 1} pages`);
		expect(err).toContain(`Do NOT delete ${withWork}`);
		expect(err).not.toContain("-wal and -shm");
	});
});

describe("an install over an administrator that already exists", () => {
	const takenPath = join(dir, "taken.db");

	execFileSync(
		"bun",
		[
			"-e",
			`import {Database} from "bun:sqlite";
			 new Database(process.argv[1], {readonly: true}).exec("VACUUM INTO '" + process.argv[2] + "'");
			 const d = new Database(process.argv[2]);
			 d.exec("PRAGMA foreign_keys = OFF");
			 for (const t of ["tenants","languages","ui_strings","content_types","roles","site_settings","pages","translations"]) d.exec("DELETE FROM " + t);`,
			dbPath,
			takenPath,
		],
		{ encoding: "utf8" },
	);

	it("says whose address is in the way, and changes nothing", () => {
		let err = "";
		let code = 0;
		try {
			execFileSync("bun", ["src/server/install.ts"], {
				env: { ...env, DATABASE_PATH: takenPath },
				encoding: "utf8",
				stdio: "pipe",
			});
		} catch (e) {
			const x = e as { status: number; stderr: string };
			code = x.status;
			err = x.stderr;
		}
		expect(code).toBe(1);
		expect(err).toContain("ADMIN_EMAIL=owner@test.example");
		expect(err).toContain("already has an account");
		expect(count(takenPath, "users")).toBe(1);
		expect(count(takenPath, "tenants")).toBe(0);
		expect(count(takenPath, "languages")).toBe(0);
	});
});
