import { describe, expect, it } from "vitest";

import { clearSessionCookie, sessionCookie } from "./auth";

const req = (url: string, headers: Record<string, string> = {}) =>
	new Request(url, { headers });

describe("session cookie Secure flag", () => {
	it("omits Secure over plain http so a LAN deployment can sign in", () => {
		const cookie = sessionCookie(
			"t",
			req("http://192.168.1.17:3020/api/auth/login"),
		);
		expect(cookie).not.toContain("Secure");
		expect(cookie).toContain("HttpOnly");
	});

	it("sets Secure over https", () => {
		expect(
			sessionCookie("t", req("https://example.org/api/auth/login")),
		).toContain("; Secure");
	});

	it("honours x-forwarded-proto when TLS ends at a proxy", () => {
		expect(
			sessionCookie(
				"t",
				req("http://internal:3000/api/auth/login", {
					"x-forwarded-proto": "https, http",
				}),
			),
		).toContain("; Secure");
	});

	it("clears the cookie with the same flag the request implies", () => {
		expect(clearSessionCookie(req("http://192.168.1.17:3020/x"))).not.toContain(
			"Secure",
		);
		expect(clearSessionCookie(req("https://example.org/x"))).toContain(
			"; Secure",
		);
	});
});
