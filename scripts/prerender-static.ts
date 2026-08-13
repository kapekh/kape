/**
 * Static HTML prerender. Serves the production build (`vite preview`) on a real
 * port — so server-side tRPC calls hit the same server and SSR fully renders —
 * then crawls every path in prerender-paths.json and writes the rendered HTML to
 * dist/static/<path>/index.html. Serve dist/static via a CDN/static host with an
 * SSR fallback for dynamic paths (e.g. ?lang=km, admin).
 *
 *   bun run build && bun scripts/prerender-static.ts
 *
 * After an edit, regenerate only what the edit changed:
 *
 *   bun scripts/gen-prerender-paths.ts && bun scripts/prerender-static.ts --stale
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { and, eq } from "drizzle-orm";

import { COLLECTIONS, resolvesUnder } from "../src/lib/collections";
import {
	languages,
	navItems,
	pages,
	posts,
	projects,
	translations,
	uiStrings,
} from "../src/server/schema";

const PORT = Number(process.env.PRERENDER_PORT ?? 4180);
const BASE = `http://localhost:${PORT}`;
const TENANT = 1;
const STATE_FILE = "dist/static/.prerender-state.json";
const BUILD_FILE = "dist/server/server.js";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fingerprints of the inputs to a path that carry no version column. */
type Marks = Record<string, string>;

type PrerenderState = {
	version: 1;
	paths: Record<string, { at: number; marks: Marks }>;
};

export type PathFacts = {
	/** mtime of the written file, null when there is none. */
	renderedAt: number | null;
	/** Newest `updated_at` reaching this path, null when nothing versioned does. */
	contentAt: number | null;
	marks: Marks;
	/** mtime of the build the file has to have been rendered from. */
	builtAt: number | null;
	/** What the last run recorded for this path, null when it never ran. */
	recorded: Marks | null;
	/** False when prerender-paths.json names a path the database no longer serves. */
	hasRow: boolean;
};

const stamp = (ms: number) => new Date(ms).toISOString();

/** `updated_at` is `datetime('now')` from sqlite and an ISO string from the app. */
export function dbTime(value: string | null | undefined): number | null {
	if (!value) return null;
	const iso = /^\d{4}-\d{2}-\d{2} /.test(value)
		? `${value.replace(" ", "T")}Z`
		: value;
	const ms = Date.parse(iso);
	return Number.isNaN(ms) ? null : ms;
}

export function staleReason(f: PathFacts): string | null {
	if (f.renderedAt === null) return "no file";
	if (!f.recorded) return "not in the prerender state file";
	for (const [name, value] of Object.entries(f.marks)) {
		if (f.recorded[name] !== value) return `${name} changed`;
	}
	if (f.contentAt !== null && f.contentAt > f.renderedAt)
		return `content ${stamp(f.contentAt)} > rendered ${stamp(f.renderedAt)}`;
	// html from an older build names asset files the new build has renamed
	if (f.builtAt !== null && f.builtAt > f.renderedAt)
		return `build ${stamp(f.builtAt)} > rendered ${stamp(f.renderedAt)}`;
	return null;
}

const fingerprint = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

function readState(): PrerenderState {
	if (!existsSync(STATE_FILE)) return { version: 1, paths: {} };
	try {
		const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8")) as PrerenderState;
		if (parsed?.version === 1 && parsed.paths) return parsed;
	} catch {
		/* a corrupt state file means every path is stale, which is the safe way round */
	}
	return { version: 1, paths: {} };
}

function fileOf(path: string) {
	return join(
		"dist/static",
		path === "/" ? "index.html" : `${path.replace(/^\/+/, "")}/index.html`,
	);
}

/**
 * What the database says about every path: the newest timestamp that reaches it,
 * and a fingerprint of the inputs that have no timestamp at all (`ui_strings` has
 * no version column, `projects` has none either).
 */
async function survey(paths: string[]) {
	const { db } = await import("../src/server/db");

	const langs = await db
		.select({ code: languages.code, isDefault: languages.isDefault })
		.from(languages);
	const defaultLang = langs.find((l) => l.isDefault)?.code ?? "en";

	const uiRows = await db
		.select({ key: uiStrings.key, lang: uiStrings.lang, value: uiStrings.value })
		.from(uiStrings)
		.where(eq(uiStrings.tenantId, TENANT));
	// chrome resolves the path's own language over the default one, so both feed the hash
	const chrome = new Map<string, string>();
	for (const { code } of langs) {
		const rows = uiRows
			.filter((r) => r.lang === code || r.lang === defaultLang)
			.map((r) => [r.lang, r.key, r.value])
			.sort();
		chrome.set(code, fingerprint(rows));
	}

	// the nav renders in the header of every page
	const nav = await db
		.select({ updatedAt: navItems.updatedAt })
		.from(navItems)
		.where(eq(navItems.tenantId, TENANT));
	let navAt: number | null = null;
	for (const n of nav) {
		const at = dbTime(n.updatedAt);
		if (at !== null && (navAt === null || at > navAt)) navAt = at;
	}

	// content path ("" = home) -> its own version, plus a fingerprint when it has none
	const entities = new Map<string, { at: number | null; mark?: string }>();
	const add = (key: string, at: number | null, mark?: string) => {
		const cur = entities.get(key);
		if (!cur) return void entities.set(key, { at, mark });
		// two rows can serve one path; the newest of them decides
		entities.set(key, {
			at: cur.at !== null && at !== null ? Math.max(cur.at, at) : (cur.at ?? at),
			mark: cur.mark ?? mark,
		});
	};

	for (const p of await db
		.select({ slug: pages.slug, updatedAt: pages.updatedAt })
		.from(pages)
		.where(and(eq(pages.tenantId, TENANT), eq(pages.status, "published")))) {
		add(p.slug === "home" ? "" : p.slug, dbTime(p.updatedAt));
	}

	const projectTr = await db
		.select({
			entityId: translations.entityId,
			field: translations.field,
			lang: translations.lang,
			value: translations.value,
		})
		.from(translations)
		.where(eq(translations.entityType, "project"));

	const published = await db
		.select({
			slug: posts.slug,
			contentType: posts.contentType,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(and(eq(posts.tenantId, TENANT), eq(posts.status, "published")));

	for (const def of Object.values(COLLECTIONS)) {
		if (def.kind === "project") {
			for (const r of await db.select().from(projects)) {
				// projects carry no updated_at, so the row and its text are hashed instead
				const text = projectTr
					.filter((t) => t.entityId === r.id)
					.map((t) => [t.lang, t.field, t.value])
					.sort();
				add(`${def.prefix}/${r.slug}`, null, fingerprint([r, text]));
			}
		} else {
			for (const r of published) {
				if (resolvesUnder(def, r.contentType))
					add(`${def.prefix}/${r.slug}`, dbTime(r.updatedAt));
			}
		}
	}

	const state = readState();
	const builtAt = existsSync(BUILD_FILE) ? statSync(BUILD_FILE).mtimeMs : null;
	return new Map(
		paths.map((path) => {
			const segments = path.split("/").filter(Boolean);
			const entity = entities.get(segments.slice(1).join("/"));
			const marks: Marks = { chrome: chrome.get(segments[0]) ?? "unknown-language" };
			if (entity?.mark) marks.entity = entity.mark;
			const file = fileOf(path);
			const recorded = state.paths[path];
			const mtime = existsSync(file) ? statSync(file).mtimeMs : null;
			const at = entity?.at ?? null;
			return [
				path,
				{
					// the run's own start time, so an edit landing mid-run is not buried by a later mtime
					renderedAt:
						mtime !== null && recorded ? Math.min(mtime, recorded.at) : mtime,
					contentAt:
						at !== null && navAt !== null ? Math.max(at, navAt) : (at ?? navAt),
					builtAt,
					marks,
					recorded: recorded?.marks ?? null,
					hasRow: Boolean(entity),
				} satisfies PathFacts,
			];
		}),
	);
}

async function main() {
	if (!existsSync("dist/server")) throw new Error("dist/ missing — run `bun run build` first.");
	// Incremental mode: `bun scripts/prerender-static.ts /news/foo /about` regenerates
	// just those paths; with no args, regenerate everything in prerender-paths.json.
	// `--stale` keeps only the paths whose file is older than what it renders.
	const args = process.argv.slice(2);
	const staleOnly = args.includes("--stale");
	const argPaths = args.filter((a) => a.startsWith("/"));
	if (!argPaths.length && !existsSync("prerender-paths.json")) throw new Error("prerender-paths.json missing — run `bun run build` first.");
	let paths: string[] = argPaths.length ? argPaths : JSON.parse(readFileSync("prerender-paths.json", "utf8"));

	const facts = await survey(paths);
	if (staleOnly) {
		const reasons = new Map(
			paths.map((p) => [p, staleReason(facts.get(p) as PathFacts)]),
		);
		const stale = paths.filter((p) => reasons.get(p));
		const fresh = paths.filter((p) => !reasons.get(p));
		console.log(`Stale: ${stale.length} of ${paths.length} paths.`);
		for (const p of stale) console.log(`  regenerate  ${p}  (${reasons.get(p)})`);
		if (fresh.length) {
			console.log(`\nSkipped, up to date (${fresh.length}):`);
			for (const p of fresh) console.log(`  ${p}`);
		}
		const orphans = paths.filter((p) => !facts.get(p)?.hasRow);
		if (orphans.length)
			console.log(
				`\nNo database row serves these — rerun gen-prerender-paths.ts (${orphans.length}):\n${orphans.map((p) => `  ${p}`).join("\n")}`,
			);
		if (!stale.length) {
			console.log("\nNothing stale — no file written.");
			return;
		}
		paths = stale;
	}

	// Boot the built server on a real port (PORT must match so SSR tRPC self-calls resolve).
	const server = Bun.spawn(["bun", "--bun", "vite", "preview", "--port", String(PORT)], {
		env: { ...process.env, PORT: String(PORT) },
		stdout: "ignore",
		stderr: "ignore",
	});

	try {
		let ready = false;
		for (let i = 0; i < 80; i++) {
			try { const r = await fetch(`${BASE}/`); if (r.status > 0) { ready = true; break; } } catch { /* not up yet */ }
			await sleep(500);
		}
		if (!ready) throw new Error("preview server did not come up");

		const startedAt = Date.now();
		const state = readState();
		let ok = 0;
		const failures: string[] = [];
		for (const p of paths) {
			const res = await fetch(`${BASE}${p}`);
			if (!res.ok) { failures.push(`${p} → ${res.status}`); continue; }
			const html = await res.text();
			const out = fileOf(p);
			await mkdir(dirname(out), { recursive: true });
			await writeFile(out, html);
			state.paths[p] = { at: startedAt, marks: facts.get(p)?.marks ?? {} };
			ok++;
		}
		if (ok) await writeFile(STATE_FILE, JSON.stringify(state));
		console.log(`\nPrerendered ${ok}/${paths.length} pages → dist/static/`);
		if (failures.length) console.log(`Failures (${failures.length}):`, failures.slice(0, 15));
	} finally {
		server.kill();
	}
}

if (import.meta.main) main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
