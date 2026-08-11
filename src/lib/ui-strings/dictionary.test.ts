import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	defaultUiStrings,
	duplicateUiStringKeys,
	uiStringModules,
} from "../ui-strings.default";

// no-brand proves "rendered" by finding the key quoted anywhere in src, which every module here satisfies by existing, so the rule is re-asserted with the dictionary excluded

const SRC = join(import.meta.dirname, "..", "..");
const DICTIONARY = [
	join(SRC, "lib", "ui-strings.default.ts"),
	import.meta.dirname,
];
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
