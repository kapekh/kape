import { describe, expect, it } from "vitest";

import { isFunctional, localizedHref, stripLang } from "./i18n-config";

describe("localizedHref", () => {
	it("prefixes public pages that have their own route file", () => {
		expect(localizedHref("/contact", "km")).toBe("/km/contact");
		expect(localizedHref("/donate", "km")).toBe("/km/donate");
	});

	it("prefixes CMS content paths", () => {
		expect(localizedHref("/who-we-are/about", "km")).toBe(
			"/km/who-we-are/about",
		);
		expect(localizedHref("/", "en")).toBe("/en");
	});

	it("leaves the staff app, the API and static files unprefixed", () => {
		for (const href of [
			"/admin",
			"/login",
			"/api/forms/contact",
			"/uploads/x.jpg",
			"/internalsources",
			"/sitemap.xml",
		])
			expect(localizedHref(href, "km")).toBe(href);
	});

	it("leaves externals and anchors alone", () => {
		expect(localizedHref("https://example.org", "km")).toBe(
			"https://example.org",
		);
		expect(localizedHref("#donate", "km")).toBe("#donate");
	});
});

describe("isFunctional", () => {
	it("does not claim contact or donate", () => {
		expect(isFunctional("/contact")).toBe(false);
		expect(isFunctional("/donate/success")).toBe(false);
	});
});

describe("stripLang", () => {
	it("round-trips a prefixed functional-looking page", () => {
		expect(stripLang("/km/donate/success")).toEqual({
			lang: "km",
			path: "/donate/success",
			prefixed: true,
		});
	});
});

// /report.pdf → /en/report.pdf → /report.pdf loops forever unless the unprefixed
// path is recognised as functional before a language prefix is added to it
describe("a file path never enters the language redirect", () => {
	for (const file of [
		"/annual-report-2025.pdf",
		"/sitemap.xml",
		"/robots.txt",
	]) {
		it(`treats ${file} the same with and without a prefix`, () => {
			expect(isFunctional(file)).toBe(true);
			expect(isFunctional(stripLang(`/en${file}`).path)).toBe(true);
		});
	}

	it("still routes a page whose slug has a dot in a segment", () => {
		expect(isFunctional("/who-we-are/strategy-2.0")).toBe(false);
	});
});
