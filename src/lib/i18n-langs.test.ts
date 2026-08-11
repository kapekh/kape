import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LANG, LANGS, reportUnroutable } from "./i18n-config";

// nothing enforces that LANGS and the languages table agree, so this warning is all that stands between them
describe("routable languages", () => {
	afterEach(() => vi.restoreAllMocks());

	const spyOnWarn = () =>
		vi.spyOn(console, "warn").mockImplementation(() => {});

	it("says nothing when every enabled language has a route prefix", () => {
		const warn = spyOnWarn();
		reportUnroutable([...LANGS], "test");
		expect(warn).not.toHaveBeenCalled();
	});

	it("names only the languages the router cannot serve", () => {
		const warn = spyOnWarn();
		reportUnroutable([DEFAULT_LANG, "fr", "th"], "sitemap");
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain("[sitemap]");
		expect(message).toContain("fr, th");
	});

	it("keeps the default language routable", () => {
		expect(LANGS).toContain(DEFAULT_LANG);
	});
});
