import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The shipped source must not know which customer it is running for. Site
 * identity belongs in `site_settings`; example content belongs in the seed
 * fixture under src/server/seed/, which this check skips.
 *
 * Add a customer name here the moment one is onboarded, so the next person who
 * types it into a component finds out before it ships.
 */
const BRANDS = [/kape/i, /kapekh/i];

const ROOT = join(import.meta.dirname, "..");

// The loadable example-site fixture. Everything else is the product.
const FIXTURE = [
	join(ROOT, "server", "seed"),
	join(ROOT, "server", "migrate-tree.ts"),
	join(ROOT, "server", "page-tree.ts"),
	join(ROOT, "server", "install.ts"),
];

const exempt = (path: string) =>
	FIXTURE.some((f) => path === f || path.startsWith(`${f}/`));

function sourceFiles(dir: string): string[] {
	if (exempt(dir)) return [];
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		if (exempt(path)) return [];
		return /\.(ts|tsx|css|json)$/.test(name) ? [path] : [];
	});
}

describe("shipped source carries no customer branding", () => {
	for (const brand of BRANDS) {
		it(`is free of ${brand}`, () => {
			const hits = sourceFiles(ROOT)
				.filter((f) => f !== import.meta.filename)
				.flatMap((f) =>
					readFileSync(f, "utf8")
						.split("\n")
						.map((line, i) => ({ f, n: i + 1, line }))
						.filter(({ line }) => brand.test(line)),
				)
				.map(
					({ f, n, line }) =>
						`${f.slice(ROOT.length + 1)}:${n}: ${line.trim()}`,
				);
			expect(hits).toEqual([]);
		});
	}
});
