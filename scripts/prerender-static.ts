/**
 * Static HTML prerender. Serves the production build (`vite preview`) on a real
 * port — so server-side tRPC calls hit the same server and SSR fully renders —
 * then crawls every path in prerender-paths.json and writes the rendered HTML to
 * dist/static/<path>/index.html. Serve dist/static via a CDN/static host with an
 * SSR fallback for dynamic paths (e.g. ?lang=km, admin).
 *
 *   bun run build && bun scripts/prerender-static.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const PORT = Number(process.env.PRERENDER_PORT ?? 4180);
const BASE = `http://localhost:${PORT}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
	if (!existsSync("dist/server")) throw new Error("dist/ missing — run `bun run build` first.");
	// Incremental mode: `bun scripts/prerender-static.ts /news/foo /about` regenerates
	// just those paths; with no args, regenerate everything in prerender-paths.json.
	const argPaths = process.argv.slice(2).filter((a) => a.startsWith("/"));
	if (!argPaths.length && !existsSync("prerender-paths.json")) throw new Error("prerender-paths.json missing — run `bun run build` first.");
	const paths: string[] = argPaths.length ? argPaths : JSON.parse(readFileSync("prerender-paths.json", "utf8"));

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

		let ok = 0;
		const failures: string[] = [];
		for (const p of paths) {
			const res = await fetch(`${BASE}${p}`);
			if (!res.ok) { failures.push(`${p} → ${res.status}`); continue; }
			const html = await res.text();
			const out = join("dist/static", p === "/" ? "index.html" : `${p.replace(/^\/+/, "")}/index.html`);
			await mkdir(dirname(out), { recursive: true });
			await writeFile(out, html);
			ok++;
		}
		console.log(`\nPrerendered ${ok}/${paths.length} pages → dist/static/`);
		if (failures.length) console.log(`Failures (${failures.length}):`, failures.slice(0, 15));
	} finally {
		server.kill();
	}
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
