import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { defaultUiStrings } from "./ui-strings.default";

// a customer arrives as a phone number or an address as easily as a name; add each one on onboarding
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

// blanked, not exempted, so a brand string sharing the line is still caught
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

	// a key no component reads is somebody's headline, not the product's
	it("seeds no UI string the product does not render", () => {
		const dictionary = join(ROOT, "lib", "ui-strings.default.ts");
		const readers = sourceFiles(ROOT).filter((f) => f !== dictionary);
		const source = readers.map((f) => readFileSync(f, "utf8")).join("\n");
		const unused = Object.keys(defaultUiStrings).filter(
			(key) => !source.includes(`"${key}"`),
		);
		expect(unused).toEqual([]);
	});

	// a key a component renders but nobody seeded falls back to English, and nothing notices
	it("seeds every UI string the product renders", () => {
		const dictionary = join(ROOT, "lib", "ui-strings.default.ts");
		const readers = sourceFiles(ROOT).filter((f) => f !== dictionary);
		const source = readers.map((f) => readFileSync(f, "utf8")).join("\n");
		// Seeding this one would replace a default built from the site's own name
		// ("Search KAPE") with a bare word, so it stays unseeded on purpose.
		const COMPUTED_DEFAULT = ["search.placeholder"];
		const rendered = [...source.matchAll(/\bt\(\s*"([a-zA-Z0-9._]+)"/g)].map(
			(m) => m[1],
		);
		const unseeded = [...new Set(rendered)]
			.filter((key) => !(key in defaultUiStrings))
			.filter((key) => !COMPUTED_DEFAULT.includes(key))
			.sort();
		expect(unseeded).toEqual([]);
	});

	// logo.png was a customer's crest for a year: the words were in the pixels, invisible to a text search
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
