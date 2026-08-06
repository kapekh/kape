import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
	checkThemeValue,
	colourToHex,
	contrastRatio,
	DARK_LIFT,
	DEFAULT_FONT_URL,
	DEFAULT_PRIMARY,
	FOREGROUND_CHROMA_TERM,
	FOREGROUND_CROSSOVER,
	THEME_FIELDS,
	themeColor,
	themeContrast,
	themeCss,
	themeFontUrl,
} from "./site-theme";

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

	// The other half. An unclosed bracket carries nothing dangerous, and the CSS
	// tokeniser still eats the closing brace and every declaration after it, so
	// one typo used to revert the entire theme to the product default.
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

	// The alpha used to be read as the lightness, so a half-transparent brand
	// colour came out near-black.
	it("ignores a percentage alpha", () => {
		expect(colourToHex("oklch(0.3 0.1 255 / 50%)")).toBe(
			colourToHex("oklch(0.3 0.1 255)"),
		);
	});

	it("reads the colour forms the field's own hint invites", () => {
		expect(colourToHex("#1f4e79")).toBe("#1f4e79");
		expect(colourToHex("#abc")).toBe("#aabbcc");
		expect(colourToHex("rgb(31 78 121)")).toBe("#1f4e79");
		expect(colourToHex("rgb(31, 78, 121)")).toBe("#1f4e79");
		expect(colourToHex("hsl(207 59% 30%)")).toBe("#1f517a");
	});

	it("says so rather than guessing at a name it cannot read", () => {
		expect(colourToHex("rebeccapurple")).toBeNull();
	});

	it("clips an out-of-gamut colour into sRGB", () => {
		expect(colourToHex("oklch(0.7 0.4 140)")).toMatch(/^#[0-9a-f]{6}$/);
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

	// oklch(1 0 0) used to give 1.05:1, because the foreground was the page
	// background whatever the primary was. What the derivation cannot fix is the
	// same white used as a heading on cream paper, so that has to be reported.
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
		expect(themeContrast({ theme_primary: "rebeccapurple" })).toEqual([]);
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
