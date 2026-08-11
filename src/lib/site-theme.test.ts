import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
	checkSettingValue,
	checkThemeValue,
	colourReach,
	colourToHex,
	contrastRatio,
	DARK_LIFT,
	DEFAULT_FONT_URL,
	DEFAULT_PRIMARY,
	darkModeAvailable,
	FOREGROUND_CHROMA_TERM,
	FOREGROUND_CROSSOVER,
	THEME_FIELDS,
	themeColor,
	themeContrast,
	themeCss,
	themeFontUrl,
} from "./site-theme";

// read out of the module, not exported for the test; the hexes were diffed against Chrome's parser
const NAMED_TABLE = (() => {
	const src = readFileSync(new URL("./site-theme.ts", import.meta.url), "utf8");
	const block = /const NAMED_COLOURS = new Map\(\n\t`([^`]+)`/.exec(src);
	if (!block) throw new Error("the named-colour table moved");
	return block[1].split("\n").map((l) => l.split(" ") as [string, string]);
})();

// read out of the seed, so a re-skin of the fixture cannot stop being covered
const FIXTURE: Record<string, string> = (() => {
	const src = readFileSync(
		new URL("../server/seed/site.ts", import.meta.url),
		"utf8",
	);
	const found = Object.fromEntries(
		[...src.matchAll(/\b(theme_[a-z_]+): "([^"]*)"/g)].map((m) => [m[1], m[2]]),
	);
	if (Object.keys(found).length < 10) throw new Error("the seed palette moved");
	return found;
})();

describe("the named-colour table", () => {
	it("holds 148 names, each once, in order, each with a six-digit hex", () => {
		const names = NAMED_TABLE.map(([n]) => n);
		expect(names.length).toBe(148);
		expect(new Set(names).size).toBe(148);
		expect([...names].sort()).toEqual(names);
		for (const [name, hex] of NAMED_TABLE) {
			expect(name, name).toMatch(/^[a-z]+$/);
			expect(hex, name).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	// every assertion here reads the same table, so a wrong hex is invisible; this pins it to the Chrome diff
	it("is the table that was checked against a browser", () => {
		const src = readFileSync(
			new URL("./site-theme.ts", import.meta.url),
			"utf8",
		);
		const block = /const NAMED_COLOURS = new Map\(\n\t`([^`]+)`/.exec(src);
		expect(
			createHash("sha256")
				.update(block?.[1] ?? "")
				.digest("hex"),
		).toBe("fbfdd5b4964ae55a220f5c26e63398e2be1ca968d83e620a045d1c35e246b66a");
	});

	it("carries the values a person would check by hand", () => {
		const table = new Map(NAMED_TABLE);
		expect(table.get("black")).toBe("#000000");
		expect(table.get("white")).toBe("#ffffff");
		expect(table.get("rebeccapurple")).toBe("#663399");
		expect(table.get("navy")).toBe("#000080");
	});
});

describe("themeCss", () => {
	it("emits nothing when nothing is configured", () => {
		expect(themeCss({})).toBe("");
	});

	it("emits only the keys an operator actually set", () => {
		const css = themeCss({ theme_primary: "oklch(0.35 0.06 155)" });
		expect(css).toBe(":root{--brand-primary:oklch(0.35 0.06 155)}");
	});

	it("carries a fixture's whole palette through unchanged", () => {
		const css = themeCss({
			theme_primary: "oklch(0.30 0.10 255)",
			theme_primary_dark: "oklch(0.62 0.13 250)",
			theme_paper_chroma: "1",
		});
		expect(css).toContain("--brand-primary:oklch(0.30 0.10 255)");
		expect(css).toContain("--brand-primary-dark:oklch(0.62 0.13 250)");
		expect(css).toContain("--paper-chroma:1");
	});

	// Settings are admin-writable and land inside a <style> in every page's head,
	// so a value that can close the element is stored XSS, not a typo.
	it("drops a value that could escape the style element", () => {
		for (const attack of [
			"red</style><script>alert(1)</script>",
			"red;}body{display:none",
			"red/*x*/",
			"@import url(//evil)",
		])
			expect(themeCss({ theme_primary: attack })).toBe("");
	});

	// an unclosed bracket makes the tokeniser eat the closing brace and every declaration after it
	it("drops one malformed value without taking the rest with it", () => {
		expect(
			themeCss({
				theme_primary: "oklch(0.5 0.1 250",
				theme_secondary: "oklch(0.6 0.2 40)",
				theme_radius: "0rem",
			}),
		).toBe(":root{--brand-secondary:oklch(0.6 0.2 40);--radius:0rem}");
	});

	it("drops a number that is not a number and a length that is not a length", () => {
		expect(themeCss({ theme_paper_hue: "80deg" })).toBe("");
		expect(themeCss({ theme_radius: "0.5" })).toBe("");
		expect(themeCss({ theme_radius: "0.5rem" })).toBe(":root{--radius:0.5rem}");
	});

	// The defect this file exists for: `banana` used to be written straight into
	// --brand-primary, and every token derived from it then computed to nothing.
	it("drops a word that is not a colour and keeps one that is", () => {
		expect(themeCss({ theme_primary: "banana" })).toBe("");
		expect(themeCss({ theme_primary: "var(--primary)" })).toBe("");
		expect(themeCss({ theme_primary: "unset" })).toBe("");
		expect(themeCss({ theme_primary: "rebeccapurple" })).toBe(
			":root{--brand-primary:rebeccapurple}",
		);
	});

	it("keeps a font stack, quotes and commas included", () => {
		expect(
			themeCss({ theme_font_display: '"Playfair Display", Georgia, serif' }),
		).toBe(':root{--brand-font-display:"Playfair Display", Georgia, serif}');
	});
});

describe("checkThemeValue", () => {
	it("accepts the colour forms an operator would type", () => {
		for (const ok of [
			"oklch(0.30 0.10 255)",
			"oklch(0.3 0.1 255 / 50%)",
			"#1f4e79",
			"#abc",
			"rgb(31 78 121)",
			"rgb(31, 78, 121)",
			"hsl(207 59% 30%)",
			"rebeccapurple",
			"color-mix(in oklab, red 40%, blue)",
		])
			expect(checkThemeValue("colour", ok)).toBeNull();
	});

	it("says which bracket is wrong rather than just refusing", () => {
		expect(checkThemeValue("colour", "oklch(0.5 0.1 250")).toMatch(/open/);
		expect(checkThemeValue("colour", "oklch(0.5 0.1 250))")).toMatch(
			/never opened/,
		);
		expect(checkThemeValue("fontStack", '"Fraunces, Georgia')).toMatch(/quote/);
	});

	it("refuses a colour that is not one", () => {
		for (const bad of ["oklch(0.5 0.1)", "notacolour()", "12345"])
			expect(checkThemeValue("colour", bad)).toMatch(/Not a colour/);
	});

	// [a-z]{3,20} accepted banana, which painted every derived token rgba(0,0,0,0) with no error on the field
	it("refuses a word that is not a colour name, and says which word", () => {
		const cases: [string, RegExp][] = [
			["banana", /"banana" is not one of the CSS colour names/],
			["notacolour", /"notacolour" is not one of the CSS colour names/],
			["lorem", /"lorem" is not one of the CSS colour names/],
			["none", /"none" is not one of the CSS colour names/],
			["chartreusy", /"chartreusy" is not one of the CSS colour names/],
			["unset", /"unset" is a CSS keyword/],
			["initial", /"initial" is a CSS keyword/],
			["inherit", /"inherit" is a CSS keyword/],
			["revert", /"revert" is a CSS keyword/],
		];
		for (const [bad, says] of cases)
			expect(checkThemeValue("colour", bad), bad).toMatch(says);
	});

	// COMPOSITE was prefix-anchored and var() passed: --brand-primary: var(--primary) is a cycle
	it("refuses var(), and refuses anything trailing a composite colour", () => {
		const cases: [string, RegExp][] = [
			["var(--brand-primary)", /var\(\) is not accepted here/],
			["var(--primary)", /var\(\) is not accepted here/],
			["var(--x) !important", /var\(\) is not accepted here/],
			["var(--primary, banana)", /var\(\) is not accepted here/],
			[
				"color-mix(in oklab, red, blue) 0 0 0 red",
				/Nothing may follow the closing bracket of color-mix\(\)/,
			],
			[
				"light-dark(red, blue) trailing",
				/Nothing may follow the closing bracket of light-dark\(\)/,
			],
		];
		for (const [bad, says] of cases)
			expect(checkThemeValue("colour", bad), bad).toMatch(says);
	});

	// A prefix check never looks inside the brackets, so the same typo one level
	// down was still a blank theme.
	it("refuses junk nested inside a composite colour", () => {
		const cases: [string, RegExp][] = [
			["light-dark(banana, red)", /Inside light-dark\(\).*"banana"/],
			["color-mix(in oklab, banana, red)", /Inside color-mix\(\).*"banana"/],
			["light-dark(red)", /light-dark\(\) takes exactly two colours/],
			["color-mix(oklab, red, blue)", /is not a colour space/],
			["color(nonsense 1 0 0)", /color\(\) takes a colour space/],
		];
		for (const [bad, says] of cases)
			expect(checkThemeValue("colour", bad), bad).toMatch(says);
	});

	// the colour-space list beside it was still open, so the same typo moved one word left
	it("refuses a colour space that is not one", () => {
		const cases: [string, RegExp][] = [
			["color-mix(in banana, red, blue)", /"in banana" is not a colour space/],
			["color-mix(in notaspace, red, blue)", /is not a colour space/],
			["color(--myprofile 1 0 0)", /color\(\) takes a colour space/],
			// A hue is only interpolated in a polar space.
			["color-mix(in srgb shorter hue, red, blue)", /is not a colour space/],
		];
		for (const [bad, says] of cases)
			expect(checkThemeValue("colour", bad), bad).toMatch(says);
		for (const ok of [
			"color-mix(in srgb, red, blue)",
			"color-mix(in oklch longer hue, red, blue)",
			"color(display-p3 1 0 0)",
		])
			expect(checkThemeValue("colour", ok), ok).toBeNull();
	});

	// Rejected while Chrome painted it and colourToHex already read it, which is
	// the validator disagreeing with the converter in the direction nobody looked.
	it("accepts a hue written with deg, and converts it the same way", () => {
		for (const [withUnit, plain] of [
			["hsl(207deg 59% 30%)", "hsl(207 59% 30%)"],
			["oklch(0.30 0.10 255deg)", "oklch(0.30 0.10 255)"],
			["lch(50% 40 200deg)", "lch(50% 40 200)"],
			["hwb(200deg 20% 30%)", "hwb(200 20% 30%)"],
		]) {
			expect(checkThemeValue("colour", withUnit), withUnit).toBeNull();
			expect(colourToHex(withUnit), withUnit).toBe(colourToHex(plain));
		}
		// The unit belongs to the hue channel alone.
		expect(checkThemeValue("colour", "rgb(31deg 78 121)")).toMatch(
			/Not a colour/,
		);
		expect(checkThemeValue("colour", "hsl(207% 59% 30%)")).toMatch(
			/Not a colour/,
		);
	});

	// The mirror failure, and the worse one: a closed list that refuses a colour
	// a real operator would type. All 148 names, in the casings a form receives.
	it("accepts every CSS colour name, whatever the casing", () => {
		expect(NAMED_TABLE.length).toBe(148);
		for (const [name, hex] of NAMED_TABLE) {
			for (const typed of [
				name,
				name.toUpperCase(),
				`${name[0].toUpperCase()}${name.slice(1)}`,
				`  ${name}  `,
			])
				expect(checkThemeValue("colour", typed), typed).toBeNull();
			expect(colourToHex(name), name).toBe(hex);
		}
	});

	it("accepts transparent and currentColor, which have no hex", () => {
		for (const v of ["transparent", "currentColor", "currentcolor"]) {
			expect(checkThemeValue("colour", v), v).toBeNull();
			expect(colourToHex(v), v).toBeNull();
		}
	});

	it("accepts the composite colours that are actually well formed", () => {
		for (const ok of [
			"color-mix(in oklab, red 40%, blue)",
			"color-mix(in srgb, rebeccapurple, white)",
			"color-mix(in hsl longer hue, red, blue)",
			"light-dark(red, blue)",
			"light-dark(color-mix(in oklab, red, blue), #abc)",
			"color(display-p3 1 0 0)",
			"color(srgb 0.1 0.2 0.3 / 0.5)",
		])
			expect(checkThemeValue("colour", ok), ok).toBeNull();
	});

	it("passes an empty value, which means unset", () => {
		for (const f of THEME_FIELDS)
			expect(checkThemeValue(f.kind, "  ")).toBeNull();
	});
});

describe("themeFontUrl", () => {
	it("falls back to the product's own typefaces", () => {
		expect(themeFontUrl({})).toBe(DEFAULT_FONT_URL);
		expect(themeFontUrl({ theme_font_url: "  " })).toBe(DEFAULT_FONT_URL);
	});

	it("takes an https stylesheet", () => {
		const u = "https://fonts.googleapis.com/css2?family=Inter&display=swap";
		expect(themeFontUrl({ theme_font_url: u })).toBe(u);
	});

	it("refuses anything that is not https", () => {
		for (const bad of [
			"http://fonts.example/x.css",
			"javascript:alert(1)",
			'https://x/" onload="alert(1)',
		])
			expect(themeFontUrl({ theme_font_url: bad })).toBe(DEFAULT_FONT_URL);
	});
});

describe("colourToHex", () => {
	it("converts the primaries", () => {
		expect(colourToHex("oklch(1 0 0)")).toBe("#ffffff");
		expect(colourToHex("oklch(0 0 0)")).toBe("#000000");
	});

	// Checked against the CSS Color 4 sample conversions.
	it("converts a mid-chroma brand colour", () => {
		const hex = colourToHex("oklch(0.30 0.10 255)");
		expect(hex).toBe("#002c5e");
	});

	it("accepts a percentage lightness", () => {
		expect(colourToHex("oklch(100% 0 0)")).toBe("#ffffff");
	});

	// alpha used to be read as lightness; a translucent brand has no one hex to report
	it("refuses to reduce a translucent colour to one hex", () => {
		expect(colourToHex("oklch(0.3 0.1 255 / 50%)")).toBeNull();
		expect(colourToHex("rgba(31, 78, 121, 0.5)")).toBeNull();
		expect(colourToHex("rgb(31 78 121 / 50%)")).toBeNull();
		expect(colourToHex("oklch(0.3 0.1 255 / 100%)")).toBe(
			colourToHex("oklch(0.3 0.1 255)"),
		);
	});

	// the four corners of a 28-form sweep diffed against Chrome through a canvas pixel
	it("reads the spaces the validator accepts but the panel used to skip", () => {
		expect(colourToHex("lab(50% 20 -30)")).toBe("#856caa");
		expect(colourToHex("lab(62% -35 45)")).toBe("#66a53f");
		expect(colourToHex("lch(50% 40 30)")).toBe("#b25d57");
		expect(colourToHex("lch(70% 50 200deg)")).toBe("#00c2c9");
		expect(colourToHex("hwb(207 12% 40%)")).toBe("#1f6299");
		expect(colourToHex("hwb(0deg 0% 0%)")).toBe("#ff0000");
	});

	// White and black wherever the two edges add up, rather than a hue.
	it("reads an hwb whose white and black leave no room for the hue", () => {
		expect(colourToHex("hwb(30 60% 60%)")).toBe("#808080");
		expect(colourToHex("hwb(120 100% 0%)")).toBe("#ffffff");
	});

	// A chroma or an a/b written as a percentage used to produce "#NaNNaNNaN",
	// which then went into <meta name="theme-color"> verbatim.
	it("reads a chroma written as a percentage of its own scale", () => {
		expect(colourToHex("oklch(0.5 50% 120)")).toBe(
			colourToHex("oklch(0.5 0.2 120)"),
		);
		expect(colourToHex("oklab(0.5 25% -25%)")).toBe(
			colourToHex("oklab(0.5 0.1 -0.1)"),
		);
		expect(colourToHex("lch(50% 26.6% 30)")).toBe("#b25d57");
		expect(colourToHex("lab(50% 16% 24%)")).toBe(colourToHex("lab(50 20 30)"));
		for (const v of [
			"oklch(0.5 50% 120)",
			"oklab(0.5 25% -25%)",
			"lab(50% 16% 24%)",
		])
			expect(colourToHex(v), v).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("reads the colour forms the field's own hint invites", () => {
		expect(colourToHex("#1f4e79")).toBe("#1f4e79");
		expect(colourToHex("#abc")).toBe("#aabbcc");
		expect(colourToHex("rgb(31 78 121)")).toBe("#1f4e79");
		expect(colourToHex("rgb(31, 78, 121)")).toBe("#1f4e79");
		expect(colourToHex("hsl(207 59% 30%)")).toBe("#1f517a");
	});

	// a name the validator accepts has to be a name this can read, or the panel says nothing about a colour the page paints
	it("reads a colour typed by name", () => {
		expect(colourToHex("rebeccapurple")).toBe("#663399");
		expect(colourToHex("RebeccaPurple")).toBe("#663399");
		expect(colourToHex(" navy ")).toBe("#000080");
	});

	it("says so rather than guessing at a colour with no fixed hex", () => {
		expect(colourToHex("transparent")).toBeNull();
		expect(colourToHex("currentColor")).toBeNull();
	});

	it("clips an out-of-gamut colour into sRGB", () => {
		expect(colourToHex("oklch(0.7 0.4 140)")).toMatch(/^#[0-9a-f]{6}$/);
	});
});

describe("colourReach", () => {
	it("separates a colour that paints nothing from one that paints", () => {
		expect(colourReach("transparent")).toBe("invisible");
		expect(colourReach("TRANSPARENT")).toBe("invisible");
		expect(colourReach("currentColor")).toBe("inherited");
		expect(colourReach("currentcolor")).toBe("inherited");
	});

	it("marks a colour that paints but has no one sRGB value", () => {
		for (const v of [
			"color-mix(in oklab, red, blue)",
			"light-dark(red, blue)",
			"color(display-p3 1 0 0)",
			"rgba(31, 78, 121, 0.5)",
		])
			expect(colourReach(v), v).toBe("unconvertible");
	});

	it("says nothing about a colour that needs no caveat", () => {
		for (const v of [
			"#1f4e79",
			"navy",
			"oklch(0.30 0.10 255)",
			"lab(50% 20 -30)",
			"lch(50% 40 30)",
			"hwb(207 12% 40%)",
			"hsl(207deg 59% 30%)",
		])
			expect(colourReach(v), v).toBeNull();
	});

	it("says nothing about a value the field has already rejected", () => {
		expect(colourReach("banana")).toBeNull();
		expect(colourReach("unset")).toBeNull();
		expect(colourReach("  ")).toBeNull();
	});
});

describe("checkSettingValue", () => {
	it("refuses over the wire what the form refuses in the browser", () => {
		expect(checkSettingValue("theme_primary", "banana")).toMatch(
			/not one of the CSS colour names/,
		);
		expect(checkSettingValue("theme_paper_hue", "blue")).toMatch(
			/Not a plain number/,
		);
		expect(checkSettingValue("theme_radius", "12")).toMatch(/Not a length/);
		expect(checkSettingValue("theme_font_url", "http://x.test/f.css")).toMatch(
			/https/,
		);
	});

	it("passes every theme value the seed fixture stores", () => {
		for (const [key, value] of Object.entries(FIXTURE))
			expect(checkSettingValue(key, value), key).toBeNull();
	});

	// a settings grid is open-ended: contact_email has no kind, and refusing it would break the page that creates it
	it("leaves a key with no theme kind alone", () => {
		expect(checkSettingValue("contact_email", "hello@example.org")).toBeNull();
		expect(checkSettingValue("site_name_en", "<script>")).toBeNull();
	});
});

describe("themeColor", () => {
	it("derives from the primary rather than a separate literal", () => {
		expect(themeColor({ theme_primary: "oklch(0.35 0.06 155)" })).toBe(
			"#1d442c",
		);
	});

	// An unconfigured install used to paint #222f3c and tell the browser
	// #002c5e, which was the previous product's navy.
	it("matches what an unbranded install actually paints", () => {
		const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
		const declared = /--brand-primary:\s*([^;]+);/.exec(css)?.[1].trim();
		expect(declared).toBe(DEFAULT_PRIMARY);
		expect(themeColor({})).toBe(colourToHex(DEFAULT_PRIMARY));
	});

	it("ignores a primary it would have refused to write into the page", () => {
		expect(themeColor({ theme_primary: "red;}body{}" })).toBe(themeColor({}));
	});
});

describe("themeContrast", () => {
	it("measures what the site will write on each brand colour", () => {
		const fixture = themeContrast({
			theme_primary: "oklch(0.30 0.10 255)",
			theme_primary_dark: "oklch(0.62 0.13 250)",
		});
		expect(fixture.map((c) => `${c.mode} ${c.what}`)).toEqual([
			"light a label on it",
			"light a heading or link in it",
			"dark a label on it",
			"dark a heading or link in it",
		]);
		for (const c of fixture) expect(c.ratio).toBeGreaterThan(4.5);
	});

	// the foreground used to be the page background whatever the primary was; white on cream still has to be reported
	it("stays legible on a white primary, and says where it will not be", () => {
		const [onIt, inIt] = themeContrast({ theme_primary: "oklch(1 0 0)" });
		expect(onIt.ratio).toBeGreaterThan(15);
		expect(inIt.ratio).toBeLessThan(1.2);
	});

	// A colour sitting on the crossover is as bad as it gets: neither paper nor
	// ink reads well on it, and only a warning can say so.
	it("reports a palette that will not reach AA even so", () => {
		const [light] = themeContrast({ theme_primary: "oklch(0.57 0.13 250)" });
		expect(light.ratio).toBeLessThan(4.5);
	});

	// The highlight is only ever a mark on the brand colour, so measuring it
	// against the page would report a number nothing on the site depends on.
	it("measures the highlight against the primary it sits on", () => {
		const rows = themeContrast({
			theme_primary: "oklch(0.30 0.10 255)",
			theme_highlight: "oklch(0.78 0.14 80)",
		}).filter((c) => c.key === "theme_highlight");
		expect(rows.map((c) => c.what)).toEqual([
			"a mark on the primary colour",
			"a mark on the primary colour",
		]);
		expect(rows[0].ratio).toBeGreaterThan(4.5);
		expect(rows[1].ratio).toBeLessThan(3);
	});

	it("skips a colour it was not given or cannot read", () => {
		expect(themeContrast({})).toEqual([]);
		expect(themeContrast({ theme_primary: "currentColor" })).toEqual([]);
		expect(themeContrast({ theme_primary: "banana" })).toEqual([]);
	});

	it("says nothing about dark mode on a site that never paints dark", () => {
		const rows = themeContrast({
			theme_primary: "oklch(0.30 0.10 255)",
			theme_dark_mode: "off",
		});
		expect(rows.map((c) => `${c.mode} ${c.what}`)).toEqual([
			"light a label on it",
			"light a heading or link in it",
		]);
	});

	// It used to report nothing for any named colour, so an operator who typed
	// one got a Legibility panel that said nothing about the colour in use.
	it("measures a colour typed by name", () => {
		const rows = themeContrast({ theme_primary: "rebeccapurple" });
		expect(rows.map((c) => `${c.mode} ${c.what}`)).toEqual([
			"light a label on it",
			"light a heading or link in it",
			"dark a label on it",
			"dark a heading or link in it",
		]);
		expect(rows[0].ratio).toBeGreaterThan(4.5);
	});
});

describe("darkModeAvailable", () => {
	it("is available unless an operator turned it off", () => {
		expect(darkModeAvailable({})).toBe(true);
		expect(darkModeAvailable({ theme_dark_mode: "on" })).toBe(true);
		expect(darkModeAvailable({ theme_dark_mode: "" })).toBe(true);
		expect(darkModeAvailable({ theme_dark_mode: "off" })).toBe(false);
		expect(darkModeAvailable({ theme_dark_mode: " off " })).toBe(false);
	});

	// The switch is a setting like any other, so a value that is neither has to be
	// refused rather than silently reading as "off" and blanking the toggle.
	it("only accepts on or off", () => {
		expect(checkThemeValue("toggle", "on")).toBeNull();
		expect(checkThemeValue("toggle", "off")).toBeNull();
		expect(checkThemeValue("toggle", "")).toBeNull();
		expect(checkThemeValue("toggle", "true")).toMatch(/on or off/);
	});
});

describe("THEME_FIELDS", () => {
	it("names every key theme_* so the settings grid groups them", () => {
		for (const f of THEME_FIELDS) expect(f.key).toMatch(/^theme_/);
	});

	it("maps each field to a distinct css variable", () => {
		const vars = THEME_FIELDS.map((f) => f.cssVar).filter(Boolean);
		expect(new Set(vars).size).toBe(vars.length);
	});

	// The warning and the stylesheet have to agree about where paper stops and
	// ink starts, and about how far a missing dark colour is lifted.
	it("runs the same numbers the stylesheet does", () => {
		const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
		expect(css).toContain(
			`(${FOREGROUND_CROSSOVER} + c * ${FOREGROUND_CHROMA_TERM} - l) * 1000`,
		);
		for (const [key, [floor, lift, ceiling]] of Object.entries(DARK_LIFT)) {
			const cssVar = THEME_FIELDS.find((f) => f.key === key)?.cssVar;
			expect(css).toContain(
				`oklch(from var(--${cssVar}) clamp(${floor}, calc(l + ${lift}), ${ceiling}) c h)`,
			);
		}
	});
});

describe("contrastRatio", () => {
	it("agrees with the WCAG endpoints", () => {
		expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
		expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
	});
});
