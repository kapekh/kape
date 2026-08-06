import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLimiter } from "./ratelimit-core";

/**
 * These reach the real login handler, not the arithmetic underneath it.
 *
 * The guarantee being protected is "the per-account dimension delays but never
 * refuses". That property lives in the handler: swapping the backoff for a
 * `rateLimit(...)` + 429 there would leave every test of `backoffDelayMs`
 * passing, so the test has to call the handler to be worth anything.
 */

const CORRECT = "correct-horse-battery";
const USER = {
	id: 1,
	email: "admin@example.org",
	name: "Admin",
	role: "admin",
};

vi.mock("#/server/db", () => ({ db: {} }));

vi.mock("#/server/auth", () => ({
	SESSION_COOKIE: "cms_session",
	authenticate: vi.fn(async (_db: unknown, email: string, password: string) =>
		password === CORRECT ? { ...USER, email } : null,
	),
	createSession: vi.fn(async () => ({ id: "sid", token: "tok" })),
	sessionCookie: () => "cms_session=tok; Path=/",
	clearSessionCookie: () => "cms_session=; Path=/; Max-Age=0",
	revokeSession: vi.fn(async () => {}),
	validateToken: vi.fn(async () => null),
	parseCookies: () => ({}),
}));

const { handler } = await import("../routes/api.auth.$");

const login = (email: string, password: string) =>
	handler({
		request: new Request("http://localhost/api/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password }),
		}),
	});

let realSetTimeout: typeof globalThis.setTimeout;

beforeEach(() => {
	resetLimiter();
	// Run the backoff's timers instantly. The property under test is whether the
	// handler ever refuses, not how long it waits.
	realSetTimeout = globalThis.setTimeout;
	globalThis.setTimeout = ((fn: () => void) => {
		fn();
		return 0 as unknown as ReturnType<typeof setTimeout>;
	}) as unknown as typeof globalThis.setTimeout;
});

afterEach(() => {
	globalThis.setTimeout = realSetTimeout;
	resetLimiter();
});

describe("login handler throttling", () => {
	it("still signs a user in after a flood of failures against their account", async () => {
		const email = "victim@example.org";
		for (let i = 0; i < 17; i++) {
			const res = await login(email, `wrong-${i}`);
			expect(res.status).toBe(401);
		}
		// 17 failures is well past the 10-attempt account threshold and still under
		// the 20-per-address limit, so this isolates the account dimension.
		const res = await login(email, CORRECT);
		expect(res.status).toBe(200);
	});

	it("refuses on the address limit, so a 429 here is observable", async () => {
		// Guards the test above against being vacuous: the handler demonstrably can
		// return 429, so the 200 it returns for a flooded account is a real result.
		let sawTooMany = false;
		for (let i = 0; i < 25; i++) {
			const res = await login(`user-${i}@example.org`, `wrong-${i}`);
			if (res.status === 429) sawTooMany = true;
		}
		expect(sawTooMany).toBe(true);
	});

	it("keeps the account dimension free of refusals across many identities", async () => {
		// Each address-limit window is shared here (no peer address under test), so
		// reset between accounts and check none of them can be locked out.
		for (const email of ["a@example.org", "b@example.org", "c@example.org"]) {
			resetLimiter();
			for (let i = 0; i < 15; i++) await login(email, `wrong-${i}`);
			const res = await login(email, CORRECT);
			expect(res.status).toBe(200);
		}
	});
});
