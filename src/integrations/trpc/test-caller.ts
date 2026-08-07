/**
 * An in-process tRPC caller, run under Bun because `bun:sqlite` cannot load in a
 * vitest worker. Reads a plan on stdin, executes it against a scratch database
 * built by the real migrations, and prints the results after RESULT_MARKER.
 *
 * The context comes from `createTRPCContext` with a cookie this script signs, so
 * a call goes through the same auth and permission checks a browser request does.
 */
import { createSession, sessionCookie } from "#/server/auth";
import { db } from "#/server/db";
import { createTRPCContext } from "./init";
import { trpcRouter } from "./router";

export const RESULT_MARKER = "__C10_RESULT__";

type Step = { call: string; input?: unknown } | { sql: string };
type Plan = { steps: Step[] };

type Result =
	| { ok: true; value: unknown }
	| { ok: false; error: string; code: string | null }
	| { rows: unknown[] };

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

function procedure(
	caller: unknown,
	path: string,
): (input?: unknown) => Promise<unknown> {
	let cur: unknown = caller;
	for (const key of path.split(".")) {
		// every level of a caller is a callable proxy, so `typeof` is "function"
		if (cur === null || (typeof cur !== "object" && typeof cur !== "function"))
			throw new Error(`no procedure at ${path}`);
		cur = (cur as Record<string, unknown>)[key];
	}
	if (typeof cur !== "function") throw new Error(`no procedure at ${path}`);
	return cur as (input?: unknown) => Promise<unknown>;
}

function errorOf(e: unknown): Result {
	const message = e instanceof Error ? e.message : String(e);
	const code = isRecord(e) && typeof e.code === "string" ? e.code : null;
	return { ok: false, error: message, code };
}

/** The least a migrated database needs before an admin procedure can write. */
async function seed(): Promise<string> {
	const raw = db.$client;
	raw.run(
		`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (1, 'c10', 'C10')`,
	);
	raw.run(
		`INSERT OR IGNORE INTO languages (code, name, native_name, enabled, sort) VALUES ('en', 'English', 'English', 1, 0)`,
	);
	raw.run(
		`INSERT OR IGNORE INTO content_types (key, name, sort) VALUES ('news', 'News', 0)`,
	);
	raw.run(
		`INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, name, role)
		 VALUES (1, 1, 'c10@test.example', 'x', 'C10', 'admin')`,
	);
	const { token } = await createSession(db, 1, "c10-test-caller");
	return sessionCookie(token).split(";")[0];
}

const plan = JSON.parse(await Bun.stdin.text()) as Plan;
const cookie = await seed();
const ctx = await createTRPCContext({
	req: new Request("http://localhost/api/trpc", { headers: { cookie } }),
});
if (!ctx.user) throw new Error("scratch session did not authenticate");

const caller = trpcRouter.createCaller(ctx);
const results: Result[] = [];

for (const step of plan.steps) {
	if ("sql" in step) {
		results.push({ rows: db.$client.query(step.sql).all() });
		continue;
	}
	try {
		results.push({
			ok: true,
			value: await procedure(caller, step.call)(step.input),
		});
	} catch (e) {
		results.push(errorOf(e));
	}
}

console.log(RESULT_MARKER + JSON.stringify(results));
