import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	defaultUiStrings,
	duplicateUiStringKeys,
	uiStringModules,
} from "../ui-strings.default";

/**
 * Two rules the split has to keep, both of which used to be free when the
 * dictionary was one object literal:
 *
 * 1. No key is defined by two modules. A spread merge lets the last one win, so
 *    a component would render another slice's words with nothing to show for it.
 * 2. No key is seeded that no component renders. `no-brand.test.ts` owns this
 *    rule, but it proves "rendered" by finding the quoted key anywhere in src
 *    outside `ui-strings.default.ts` — and every key now sits quoted in a module
 *    under this directory, which satisfies that search by existing. So the rule
 *    is re-asserted here with the whole dictionary excluded from the search,
 *    which is what it meant all along.
 */

const SRC = join(import.meta.dirname, "..", "..");
const DICTIONARY = [join(SRC, "lib", "ui-strings.default.ts"), import.meta.dirname];
// The loadable example-site fixture, exempt for the same reason no-brand exempts it.
const FIXTURE = [
	join(SRC, "server", "seed"),
	join(SRC, "server", "migrate-tree.ts"),
	join(SRC, "server", "page-tree.ts"),
];

const under = (roots: string[], path: string) =>
	roots.some((r) => path === r || path.startsWith(`${r}/`));

function readerFiles(dir: string): string[] {
	if (under(FIXTURE, dir) || under(DICTIONARY, dir)) return [];
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return readerFiles(path);
		if (under(FIXTURE, path) || under(DICTIONARY, path)) return [];
		return /\.(ts|tsx|css|json)$/.test(name) ? [path] : [];
	});
}

describe("the split dictionary", () => {
	it("defines no key in two modules at once", () => {
		expect(duplicateUiStringKeys()).toEqual({});
	});

	it("merges every module's keys into defaultUiStrings", () => {
		const fromModules = Object.values(uiStringModules).flatMap((m) =>
			Object.keys(m),
		);
		expect(Object.keys(defaultUiStrings).sort()).toEqual(
			[...new Set(fromModules)].sort(),
		);
	});

	it("seeds no UI string the product does not render", () => {
		const source = readerFiles(SRC)
			.map((f) => readFileSync(f, "utf8"))
			.join("\n");
		const unused = Object.keys(defaultUiStrings).filter(
			(key) => !source.includes(`"${key}"`),
		);
		expect(unused).toEqual([]);
	});
});
