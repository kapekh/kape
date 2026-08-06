import { describe, expect, it } from "vitest";

import {
	metaDescription,
	pageTitle,
	siteLogo,
	siteShortName,
	siteTitle,
	socialImage,
	socialSiteName,
} from "./site-identity";

describe("short name", () => {
	it("is whatever the operator set", () => {
		expect(
			siteShortName({
				site_name_en: "Anything At All",
				site_name_short: "AAA",
			}),
		).toBe("AAA");
	});

	it("is the organisation's own name while that still fits a title bar", () => {
		expect(siteShortName({ site_name_en: "Riverside Community Trust" })).toBe(
			"Riverside Community Trust",
		);
		expect(pageTitle("News", { site_name_en: "Acme Foundation" })).toBe(
			"News — Acme Foundation",
		);
	});

	it("shortens a long legal name to its initials rather than repeating it", () => {
		const s = { site_name_en: "Trust for the Advancement of Learning" };
		expect(siteShortName(s)).toBe("TAL");
		expect(siteTitle(s)).toBe("TAL — Trust for the Advancement of Learning");
	});

	it("never pastes a legal name into a title, however many words it has", () => {
		const s = {
			site_name_en:
				"Association for the Support of Rural Education and Community Health Development",
		};
		expect(siteShortName(s)).toBe("Association");
		expect(siteShortName(s).length).toBeLessThan(29);
	});

	it("keeps a long name it can neither shorten nor cut sensibly", () => {
		const s = { site_name_en: "អង្គការមិនរកប្រាក់ចំណេញក្នុងស្រុកសម្រាប់កុមារ" };
		expect(siteShortName(s)).toBe(s.site_name_en);
	});
});

describe("meta description", () => {
	it("prefers the operator's own line", () => {
		expect(metaDescription({ site_description: "We plant trees." })).toBe(
			"We plant trees.",
		);
	});

	it("still says something on a site nobody has described yet", () => {
		expect(metaDescription({ site_name_en: "Acme Foundation" })).toBe(
			"The website of Acme Foundation.",
		);
	});
});

describe("logo and social card", () => {
	it("falls back to the product's own mark, never to a customer's", () => {
		expect(siteLogo({})).toBe("/logo.png");
		expect(siteLogo({ logo_url: "/uploads/acme.png" })).toBe(
			"/uploads/acme.png",
		);
	});

	it("shares the operator's logo when they have not chosen a share image", () => {
		expect(socialImage({ logo_url: "/uploads/acme.png" })).toBe(
			"/uploads/acme.png",
		);
		expect(socialImage({ og_image: "/uploads/cover.jpg" })).toBe(
			"/uploads/cover.jpg",
		);
	});

	it("tells a social card only a name the operator gave", () => {
		const long = {
			site_name_en: "Trust for the Advancement of Learning",
		};
		expect(socialSiteName(long)).toBe("Trust for the Advancement of Learning");
		expect(socialSiteName({ ...long, site_name_short: "TAL" })).toBe("TAL");
		expect(socialSiteName({ ...long, og_site_name: "TAL Global" })).toBe(
			"TAL Global",
		);
	});
});
