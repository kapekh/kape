import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Runs in a Bun subprocess: the seed module imports `../db`, and `bun:sqlite`
 * has no Node equivalent. Pointed at a throwaway file so importing it cannot
 * migrate the real database.
 */
const dir = mkdtempSync(join(tmpdir(), "project-body-test-"));

const probe = `
import { renderBody } from "#/server/richtext";
import { bodyOf, PROJECT_SEED } from "#/server/seed/projects";

const out = PROJECT_SEED.filter((p) => p.blocks).map((p) => {
	const html = renderBody(bodyOf(p).en);
	return {
		code: p.code,
		h2: (html.match(/<h2>/g) ?? []).length,
		h3: (html.match(/<h3>/g) ?? []).length,
		bullets: (html.match(/<ul>\\s*<li>/g) ?? []).length,
		tail: html.includes("downloadable resources"),
		snapshots: p.snapshots?.length ?? 0,
		km: bodyOf(p).km.includes("ព័ត៌មានលម្អិត"),
	};
});
console.log(JSON.stringify(out));
`;

const rendered: {
	code: string;
	h2: number;
	h3: number;
	bullets: number;
	tail: boolean;
	snapshots: number;
	km: boolean;
}[] = JSON.parse(
	execFileSync("bun", ["-e", probe], {
		encoding: "utf8",
		env: { ...process.env, DATABASE_PATH: join(dir, "probe.db") },
	})
		.trim()
		.split("\n")
		.at(-1) as string,
);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("project seed bodies", () => {
	it("carries the sectioned copy lifted off the prototype pages", () => {
		expect(rendered.map((r) => r.code)).toEqual([
			"AIR",
			"IDEAL",
			"MIDL",
			"DVITSA",
			"DWD",
			"LOTUS",
		]);
	});

	it("survives renderBody's allow-list as headings and bullets", () => {
		// heading and bulletList have to stay in richTextExtensions; drop either and
		// the renderer silently flattens the page into unstyled text.
		for (const r of rendered) {
			expect(r.h2, r.code).toBe(6);
			expect(r.h3, r.code).toBe(2);
			expect(r.bullets, r.code).toBe(3);
			expect(r.tail, r.code).toBe(false);
			expect(r.snapshots, r.code).toBe(4);
		}
	});

	it("leaves Khmer on the placeholder until KAPE translates", () => {
		for (const r of rendered) expect(r.km, r.code).toBe(true);
	});
});
