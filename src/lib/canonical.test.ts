import { describe, expect, it } from "vitest";

import { localeLinks } from "./canonical";

const hrefs = (splat: string, origin?: string | null) =>
	localeLinks(splat, origin).links.map(
		(l) => `${l.rel}${l.hrefLang ? `:${l.hrefLang}` : ""} ${l.href}`,
	);

describe("localeLinks", () => {
	it("canonicalises a page to its own language-prefixed path", () => {
		expect(localeLinks("en/who-we-are/about").canonical).toBe(
			"/en/who-we-are/about",
		);
		expect(localeLinks("km/who-we-are/about").canonical).toBe(
			"/km/who-we-are/about",
		);
	});

	it("keeps the language prefix on the home page", () => {
		expect(localeLinks("en").canonical).toBe("/en");
		expect(localeLinks("km").canonical).toBe("/km");
	});

	// a canonical still resolves relative, so it ships without an origin
	it("emits canonical alone when no origin is configured", () => {
		expect(hrefs("en/publications")).toEqual(["canonical /en/publications"]);
	});

	it("pairs every language once an origin is configured", () => {
		expect(hrefs("km/publications", "https://example.org")).toEqual([
			"canonical https://example.org/km/publications",
			"alternate:en https://example.org/en/publications",
			"alternate:km https://example.org/km/publications",
			"alternate:x-default https://example.org/en/publications",
		]);
	});

	it("tolerates a trailing slash on the origin", () => {
		expect(localeLinks("en", "https://example.org/").canonical).toBe(
			"https://example.org/en",
		);
	});

	it("reports an absolute url only when it has one", () => {
		expect(localeLinks("en/contact").absolute).toBeNull();
		expect(localeLinks("en/contact", "https://example.org").absolute).toBe(
			"https://example.org/en/contact",
		);
	});
});
