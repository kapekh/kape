import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { THEME_FIELDS } from "./lib/site-theme";

// a mode-varying token must be light-dark() with the halves different; a name check passes on a light navy copied verbatim into a dark block, so this reads values; the operator-input exemption is a closed set
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

/** Declared once, by the operator, and the same whichever mode is showing. */
const INPUTS = [
	"--brand-accent",
	"--brand-font-body",
	"--brand-font-display",
	"--brand-font-script",
	"--brand-highlight",
	"--brand-primary",
	"--brand-secondary",
	"--paper-chroma",
	"--paper-hue",
	"--radius",
];

/** The `--name: value` pairs of every top-level `:root` block. */
function rootDeclarations() {
	const out = new Map<string, string>();
	for (const block of css.matchAll(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/g))
		for (const d of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([\s\S]*?);/g))
			out.set(d[1], d[2].replace(/\s+/g, " ").trim());
	return out;
}

/** The two halves of a `light-dark(a, b)`, splitting on the top-level comma. */
function lightDarkArms(value: string) {
	const open = value.indexOf("light-dark(");
	if (open < 0) return null;
	let depth = 0;
	let split = -1;
	let i = open + "light-dark(".length;
	for (; i < value.length; i++) {
		const ch = value[i];
		if (ch === "(") depth++;
		else if (ch === ")") {
			if (depth === 0) break;
			depth--;
		} else if (ch === "," && depth === 0) split = i;
	}
	if (split < 0) return null;
	return [
		value.slice(open + "light-dark(".length, split).trim(),
		value.slice(split + 1, i).trim(),
	];
}

/** A colour written out rather than taken from another token. */
const namesALiteralColour = (value: string) =>
	/#[0-9a-f]{3,8}\b/i.test(value) ||
	/\b(?:oklch|oklab|lch|lab|rgba?|hsla?|hwb)\(\s*(?!from\b)/i.test(value);

describe("design tokens", () => {
	const root = rootDeclarations();

	it("finds the token block", () => {
		expect(root.size).toBeGreaterThan(25);
	});

	it("exempts exactly the fields the settings form offers", () => {
		// the exemption is a list of names, not a prefix
		const offered = THEME_FIELDS.map((f) => `--${f.cssVar}`)
			.filter((v) => v !== "--" && !v.endsWith("-dark"))
			.sort();
		expect(INPUTS).toEqual(offered);
		for (const name of INPUTS) expect(root.has(name)).toBe(true);
	});

	it("gives every mode-varying token two different values", () => {
		const wrong: string[] = [];
		for (const [name, value] of root) {
			if (INPUTS.includes(name)) continue;
			if (!namesALiteralColour(value)) continue;
			const arms = lightDarkArms(value);
			if (!arms) wrong.push(`${name} names a colour outside light-dark()`);
			else if (arms[0] === arms[1])
				wrong.push(`${name} is the same in both modes`);
		}
		expect(wrong).toEqual([]);
	});

	it("declares each token once, so there is no second block to keep in step", () => {
		const seen = new Set<string>();
		const twice: string[] = [];
		for (const d of css.matchAll(/(?:^|\n|\{)\s*(--[a-z0-9-]+)\s*:/g)) {
			if (d[1].startsWith("--color-") || d[1].startsWith("--radius-")) continue;
			if (seen.has(d[1])) twice.push(d[1]);
			seen.add(d[1]);
		}
		expect(twice).toEqual([]);
	});

	it("keeps no token with zero consumers", () => {
		// --ink was defined for two years and read by nothing; --sidebar-* and
		// --chart-* were a shadcn default that contradicted the palette.
		for (const dead of ["--ink", "--sidebar", "--chart-1"])
			expect(root.has(dead)).toBe(false);
	});

	it("routes the fonts through the brand inputs", () => {
		for (const v of [
			"--brand-font-display",
			"--brand-font-body",
			"--brand-font-script",
		])
			expect(root.has(v)).toBe(true);
		// a literal @import would load the default typefaces even once an operator
		// has configured their own; site-theme.ts owns the stylesheet link instead
		expect(css).not.toMatch(/@import\s+url\(/);
	});

	it("tells the browser which way its own controls go", () => {
		expect(css).toMatch(/:root\s*\{\s*color-scheme:\s*light/);
		expect(css).toMatch(/:root\.dark\s*\{\s*color-scheme:\s*dark/);
		// with JavaScript off no class is ever set, so the system preference is
		// the only signal there is
		expect(css).toMatch(
			/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{\s*color-scheme:\s*dark/,
		);
	});

	it("writes a readable foreground on every brand colour", () => {
		// var(--background) ignores the primary's lightness: a white primary then
		// paints white on white and the header, footer and buttons vanish.
		for (const token of [
			"--primary-foreground",
			"--secondary-foreground",
			"--accent-foreground",
			"--destructive-foreground",
		])
			expect(root.get(token)).toMatch(
				/clamp\(0\.16, \(0\.57 \+ c \* 0\.1 - l\) \* 1000/,
			);
	});
});
