// runs under Bun because bun:sqlite cannot load in a vitest worker; the cookie it signs goes through the real auth
import { createSession, sessionCookie } from "#/server/auth";
import { db } from "#/server/db";
import { createTRPCContext } from "./init";
import { trpcRouter } from "./router";

export const RESULT_MARKER = "__C10_RESULT__";

// `as` signs in a fresh account holding exactly these areas; the steps after it run as them
type Step =
	| { call: string; input?: unknown }
	| { sql: string }
	| { as: { role: string; permissions: string[] } };
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

async function callerFor(cookie: string) {
	const ctx = await createTRPCContext({
		req: new Request("http://localhost/api/trpc", { headers: { cookie } }),
	});
	if (!ctx.user) throw new Error("scratch session did not authenticate");
	return trpcRouter.createCaller(ctx);
}

let signedIn = 0;
async function signInAs(role: string, permissions: string[]): Promise<string> {
	const raw = db.$client;
	raw.run(
		`INSERT OR IGNORE INTO roles (tenant_id, key, name, permissions, is_system) VALUES (1, ?, ?, ?, 0)`,
		[role, role, JSON.stringify(permissions)],
	);
	const id = 1000 + ++signedIn;
	raw.run(
		`INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?, 1, ?, 'x', ?, ?)`,
		[id, `${role}-${id}@test.example`, role, role],
	);
	const { token } = await createSession(db, id, "c10-test-caller");
	return sessionCookie(token).split(";")[0];
}

const plan = JSON.parse(await Bun.stdin.text()) as Plan;
let caller = await callerFor(await seed());
const results: Result[] = [];

for (const step of plan.steps) {
	if ("sql" in step) {
		results.push({ rows: db.$client.query(step.sql).all() });
		continue;
	}
	if ("as" in step) {
		caller = await callerFor(await signInAs(step.as.role, step.as.permissions));
		results.push({ ok: true, value: step.as.role });
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
