import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { defaultUiStrings } from "./ui-strings.default";

/**
 * The shipped source must not know which customer it is running for. Site
 * identity belongs in `site_settings`; example content belongs in the seed
 * fixture under src/server/seed/, which this check skips.
 *
 * A name is only half of it: a customer arrives in the source as their phone
 * number, their address or their name in their own script just as easily. Add
 * every such string here the moment one is onboarded, so the next person who
 * types it into a component finds out before it ships.
 */
const BRANDS = [
	/kape/i,
	/kapekh/i,
	/kampuchea/i,
	/042[-\s]?941[-\s]?\d{3}/,
	/អង្គការសកម្មភាពសម្រាប់ការអប់រំនៅកម្ពុជា/,
];

const ROOT = join(import.meta.dirname, "..");

// The loadable example-site fixture. Everything else is the product — including
// install.ts, which is the path every new customer's database is built by.
const FIXTURE = [
	join(ROOT, "server", "seed"),
	join(ROOT, "server", "migrate-tree.ts"),
	join(ROOT, "server", "page-tree.ts"),
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

// The fixture's seed command is named after the fixture, and the product is
// allowed to point at it. Blanked before matching rather than exempting the
// line, so a brand string sharing that line is still caught.
const withoutFixtureCommand = (line: string) =>
	line.replace(/seed:[a-z0-9-]+/g, "seed:fixture");

describe("shipped source carries no customer branding", () => {
	for (const brand of BRANDS) {
		it(`is free of ${brand}`, () => {
			const hits = sourceFiles(ROOT)
				.filter((f) => f !== import.meta.filename)
				.flatMap((f) =>
					readFileSync(f, "utf8")
						.split("\n")
						.map((line, i) => ({ f, n: i + 1, line }))
						.filter(({ line }) => brand.test(withoutFixtureCommand(line))),
				)
				.map(
					({ f, n, line }) =>
						`${f.slice(ROOT.length + 1)}:${n}: ${line.trim()}`,
				);
			expect(hits).toEqual([]);
		});
	}

	// The dictionary a blank install writes is where one customer's site leaks
	// into the next: a key no component reads is, by definition, a menu or a
	// headline that belonged to somebody's site rather than to the product.
	it("seeds no UI string the product does not render", () => {
		const dictionary = join(ROOT, "lib", "ui-strings.default.ts");
		const readers = sourceFiles(ROOT).filter((f) => f !== dictionary);
		const source = readers.map((f) => readFileSync(f, "utf8")).join("\n");
		const unused = Object.keys(defaultUiStrings).filter(
			(key) => !source.includes(`"${key}"`),
		);
		expect(unused).toEqual([]);
	});

	/**
	 * `public/logo.png` was the first customer's crest for a year, and no text
	 * search could see it: the words were in the pixels. These two catch what a
	 * check over source can, and the rest is on whoever swaps the file.
	 */
	describe("the shipped assets are the product's own", () => {
		const PUBLIC = join(ROOT, "..", "public");
		const FIXTURE_ASSETS = join(PUBLIC, "fixture");

		const assets = (dir: string): string[] =>
			readdirSync(dir).flatMap((name) => {
				const path = join(dir, name);
				if (path === FIXTURE_ASSETS) return [];
				return statSync(path).isDirectory() ? assets(path) : [path];
			});

		it("are not named after a customer", () => {
			const named = assets(PUBLIC).filter((f) =>
				BRANDS.some((b) => b.test(f.slice(PUBLIC.length))),
			);
			expect(named).toEqual([]);
		});

		it("are not a copy of an example site's", () => {
			const fixture = readdirSync(FIXTURE_ASSETS).map((n) =>
				readFileSync(join(FIXTURE_ASSETS, n)).toString("base64"),
			);
			const copies = assets(PUBLIC).filter((f) =>
				fixture.includes(readFileSync(f).toString("base64")),
			);
			expect(copies).toEqual([]);
		});
	});
});
