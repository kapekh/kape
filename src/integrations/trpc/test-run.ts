import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// the browser is not a trust boundary; bun:sqlite cannot load in a vitest worker, so the caller shells out
const MARKER = "__C10_RESULT__"; // must match test-caller.ts

export type Step =
	| { call: string; input?: unknown }
	| { sql: string }
	| { as: { role: string; permissions: string[] } };
export type Row = Record<string, unknown>;
export type Result =
	| { ok: true; value: unknown }
	| { ok: false; error: string; code: string | null }
	| { rows: Row[] };

/** Runs `steps` against a fresh migrated database, signed in as an administrator. */
export function planRunner() {
	const dir = mkdtempSync(join(tmpdir(), "c10-trpc-"));
	let scratch = 0;
	return {
		dispose: () => rmSync(dir, { recursive: true, force: true }),
		run(steps: Step[]): Result[] {
			const stdout = execFileSync(
				"bun",
				["src/integrations/trpc/test-caller.ts"],
				{
					input: JSON.stringify({ steps }),
					encoding: "utf8",
					env: {
						...process.env,
						DATABASE_PATH: join(dir, `scratch-${++scratch}.db`),
						SSG_CACHE: "off",
					},
				},
			);
			const at = stdout.indexOf(MARKER);
			if (at < 0) throw new Error(`caller printed no ${MARKER}:\n${stdout}`);
			return JSON.parse(stdout.slice(at + MARKER.length)) as Result[];
		},
	};
}

export const failed = (r: Result) => ("ok" in r && r.ok === false ? r : null);
export const rowsOf = (r: Result): Row[] => ("rows" in r ? r.rows : []);
