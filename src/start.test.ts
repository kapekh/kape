import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "./start";

describe("contentSecurityPolicy", () => {
	it("lets the PDF reader embed same-origin uploads", () => {
		expect(contentSecurityPolicy).toContain("object-src 'self'");
	});
});
