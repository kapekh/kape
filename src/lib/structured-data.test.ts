import { describe, expect, it } from "vitest";

import { articleLd, organizationLd } from "./structured-data";

// a malformed field is worse than a missing one, so assert the emitted shape
const SETTINGS = {
	site_name_en: "Trust for the Advancement of Learning",
	contact_email: "hello@example.org",
	contact_phone: "012-345-678 / 012-345-679",
	address: "1 Riverside Road, Example Town",
	address_region: "Example Province",
	address_country: "KH",
	area_served: "Example Country",
};

// schema.org/telephone is one number. Anything a dialler could not take is wrong.
const ONE_NUMBER = /^\+?[\d][\d\s().-]*$/;

describe("organizationLd", () => {
	it("emits a single dialable telephone from a setting holding several", () => {
		const ld = organizationLd(SETTINGS);
		expect(ld.telephone).toBe("012-345-678");
		expect(String(ld.telephone)).toMatch(ONE_NUMBER);
	});

	it("skips a separator rather than emitting an empty telephone", () => {
		expect(
			organizationLd({ ...SETTINGS, contact_phone: "/ 012-345-678" }).telephone,
		).toBe("012-345-678");
		for (const contact_phone of [",", "/", " ", "tel"]) {
			const ld = organizationLd({ ...SETTINGS, contact_phone });
			expect(Object.hasOwn(ld, "telephone")).toBe(false);
		}
	});

	it("carries the postal address the operator filled in", () => {
		expect(organizationLd(SETTINGS).address).toEqual({
			"@type": "PostalAddress",
			streetAddress: "1 Riverside Road, Example Town",
			addressRegion: "Example Province",
			addressCountry: "KH",
		});
	});

	it("says the region once, in the field that is for it", () => {
		// The one address setting is what the footer prints, so it ends with the
		// province; the street line here must not repeat it.
		const ld = organizationLd({
			...SETTINGS,
			address: "1 Riverside Road, Example Town, Example Province",
		});
		expect((ld.address as Record<string, string>).streetAddress).toBe(
			"1 Riverside Road, Example Town",
		);
	});

	it("keeps a locality that only looks like the region", () => {
		const ld = organizationLd({
			...SETTINGS,
			address_region: "Example",
			address: "1 Riverside Road, Example Town, Example Province",
		});
		expect((ld.address as Record<string, string>).streetAddress).toBe(
			"1 Riverside Road, Example Town",
		);
	});

	it("names the area served as a place, not as a string", () => {
		expect(organizationLd(SETTINGS).areaServed).toEqual({
			"@type": "Country",
			name: "Example Country",
		});
	});

	it("omits what is not configured rather than guessing it", () => {
		const ld = organizationLd({ site_name_en: "Acme Foundation" });
		expect(Object.keys(ld)).toEqual(["@context", "@type", "name"]);
	});

	it("claims an alternate name only when the operator gave one", () => {
		// "TAL" is good enough to put in a title bar and not evidence that anyone
		// calls them that.
		expect(Object.hasOwn(organizationLd(SETTINGS), "alternateName")).toBe(
			false,
		);
		expect(
			organizationLd({ ...SETTINGS, site_name_short: "TAL" }).alternateName,
		).toBe("TAL");
	});
});

describe("articleLd", () => {
	it("publishes under a name the operator gave, not one we derived", () => {
		const bare = articleLd({ title: "A headline" }, SETTINGS);
		expect((bare.publisher as Record<string, unknown>).name).toBe(
			SETTINGS.site_name_en,
		);
		expect((bare.author as Record<string, unknown>).name).toBe(
			SETTINGS.site_name_en,
		);

		const named = articleLd(
			{ title: "A headline" },
			{ ...SETTINGS, site_name_short: "TAL", og_site_name: "TAL Global" },
		);
		expect((named.publisher as Record<string, unknown>).name).toBe("TAL");
		// the byline the page itself shows next to the date
		expect((named.author as Record<string, unknown>).name).toBe("TAL Global");
	});
});
