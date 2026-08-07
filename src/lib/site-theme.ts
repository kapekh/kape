/**
 * What the site looks like. The palette, the paper, the corner radius and the
 * typefaces all resolve through here, so an operator re-skins the whole site
 * from /admin/settings and no component is edited.
 *
 * The shape mirrors `site-identity.ts`: every key is optional, and an unset key
 * falls through to the product's own default in `styles.css`. Values are
 * emitted as CSS custom properties into a `<style>` in the document head during
 * SSR, so the first painted frame already carries the operator's brand.
 *
 * What is configurable, and what is not:
 *
 *   Configurable   the four brand colours, the paper tint, the corner radius
 *                  and the three font stacks. These are what an organisation
 *                  owns and what makes a site recognisably theirs.
 *
 *   Not            the neutral lightness ramp, the spacing rhythm and the type
 *                  scale. Those are the product's design. A CMS that lets an
 *                  operator break its own vertical rhythm produces worse sites,
 *                  not more personal ones.
 *
 * Each colour takes an optional dark-mode counterpart. Left unset, the dark
 * value is derived by lifting the light one toward white, which is right often
 * enough to make a one-field re-skin work and wrong often enough to be worth
 * overriding.
 */
import type { SiteSettings } from "./site-identity";

export type ThemeKind = "colour" | "number" | "length" | "fontStack" | "url";

export type ThemeField = {
	key: string;
	/** CSS custom property the value lands on, minus the leading dashes. */
	cssVar: string;
	label: string;
	hint: string;
	kind: ThemeKind;
};

export const THEME_FIELDS: ThemeField[] = [
	{
		key: "theme_primary",
		cssVar: "brand-primary",
		label: "Primary colour",
		kind: "colour",
		hint: "The brand colour. Headings, the header, the footer and the main buttons. oklch(), rgb(), hsl() or a hex, e.g. oklch(0.30 0.10 255) or #1f4e79.",
	},
	{
		key: "theme_primary_dark",
		cssVar: "brand-primary-dark",
		label: "Primary colour (dark mode)",
		kind: "colour",
		hint: "Left empty, the primary colour is lifted toward white until it reads on a dark page.",
	},
	{
		key: "theme_secondary",
		cssVar: "brand-secondary",
		label: "Secondary colour",
		kind: "colour",
		hint: "The supporting brand colour. Italic emphasis in headings, footer buttons, and the left edge of the call-to-action band.",
	},
	{
		key: "theme_secondary_dark",
		cssVar: "brand-secondary-dark",
		label: "Secondary colour (dark mode)",
		kind: "colour",
		hint: "Left empty, derived from the secondary colour.",
	},
	{
		key: "theme_accent",
		cssVar: "brand-accent",
		label: "Accent colour",
		kind: "colour",
		hint: "Links, eyebrows, the donate button and the right edge of the call-to-action band.",
	},
	{
		key: "theme_accent_dark",
		cssVar: "brand-accent-dark",
		label: "Accent colour (dark mode)",
		kind: "colour",
		hint: "Left empty, derived from the accent colour.",
	},
	{
		key: "theme_highlight",
		cssVar: "brand-highlight",
		label: "Highlight colour",
		kind: "colour",
		hint: "Small bright marks that sit on top of the brand colour: eyebrows over a hero photo, footer headings, badges.",
	},
	{
		key: "theme_highlight_dark",
		cssVar: "brand-highlight-dark",
		label: "Highlight colour (dark mode)",
		kind: "colour",
		hint: "Left empty, derived from the highlight colour.",
	},
	{
		key: "theme_paper_chroma",
		cssVar: "paper-chroma",
		label: "Paper warmth",
		kind: "number",
		hint: "How much colour the page background and its greys carry. 0 is a neutral grey, 1 is the full warm cream.",
	},
	{
		key: "theme_paper_hue",
		cssVar: "paper-hue",
		label: "Paper tint",
		kind: "number",
		hint: "Degrees to rotate that warmth. 0 keeps it warm, 180 cools it, 250 reads blue-grey.",
	},
	{
		key: "theme_radius",
		cssVar: "radius",
		label: "Corner radius",
		kind: "length",
		hint: "How round every card, button and panel is. 0rem is square, 0.5rem is the default, 1rem is soft.",
	},
	{
		key: "theme_font_url",
		cssVar: "",
		label: "Font stylesheet",
		kind: "url",
		hint: "An https:// stylesheet that loads your typefaces, e.g. a Google Fonts URL. Empty loads the product's own.",
	},
	{
		key: "theme_font_display",
		cssVar: "brand-font-display",
		label: "Display font",
		kind: "fontStack",
		hint: 'Headings. A CSS font stack, e.g. "Fraunces", Georgia, serif.',
	},
	{
		key: "theme_font_body",
		cssVar: "brand-font-body",
		label: "Body font",
		kind: "fontStack",
		hint: 'Running text and the interface, e.g. "Inter", system-ui, sans-serif.',
	},
	{
		key: "theme_font_script",
		cssVar: "brand-font-script",
		label: "Second-script font",
		kind: "fontStack",
		hint: "Used wherever the site renders a script the display font does not cover, e.g. Khmer.",
	},
];

/**
 * The typefaces a fresh install loads. Kept here rather than as an `@import` in
 * styles.css so that setting `theme_font_url` actually replaces it instead of
 * downloading both.
 */
export const DEFAULT_FONT_URL =
	"https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@300;400;500;600;700&family=Noto+Serif+Khmer:wght@500;700&display=swap";

/**
 * The product's own brand colour. Must stay the `--brand-primary` that
 * styles.css declares: `theme-color` and the manifest are read by browser
 * chrome before any stylesheet, so this is the one value that has to be
 * restated outside CSS. site-theme.test.ts reads styles.css and fails on drift.
 */
export const DEFAULT_PRIMARY = "oklch(0.30 0.03 250)";

/* ---------------------------------------------------------------- */
/* Validation                                                        */
/* ---------------------------------------------------------------- */

/**
 * A settings value can only ever become a CSS *value*, never a new declaration
 * or a new element. Settings are admin-writable, so a stray `</style>` here
 * would be stored XSS rather than a typo.
 */
const BANNED = /[<>{};@\\]/;

/**
 * The half that is not about attack. `oklch(0.5 0.1 250` carries nothing
 * dangerous, but an unclosed bracket makes the CSS tokeniser eat the closing
 * brace and every rule after it, so one typo silently reverts the whole theme.
 * Anything that cannot end where the declaration ends is rejected.
 */
function unbalanced(v: string) {
	let depth = 0;
	let quote = "";
	for (const ch of v) {
		if (quote) {
			if (ch === quote) quote = "";
			continue;
		}
		if (ch === '"' || ch === "'") quote = ch;
		else if (ch === "(") depth++;
		else if (ch === ")" && --depth < 0)
			return "closes a bracket it never opened";
	}
	if (depth > 0) return "leaves a bracket open";
	if (quote) return "leaves a quote open";
	return null;
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)%?`;
/** A hue, where `deg` is the one unit `colourToHex` below can also read. */
const HUE = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:deg)?`;
const ARGS = (a: string, b: string, c: string) =>
	`\\(\\s*${a}(?:\\s*,\\s*|\\s+)${b}(?:\\s*,\\s*|\\s+)${c}`;
const CHANNELS = new RegExp(
	`^(?:(?:hsl|hsla|hwb)${ARGS(HUE, NUM, NUM)}` +
		`|(?:lch|oklch)${ARGS(NUM, NUM, HUE)}` +
		`|(?:oklab|lab|rgb|rgba)${ARGS(NUM, NUM, NUM)}` +
		`)(?:\\s*[,/]\\s*${NUM})?\\s*\\)$`,
	"i",
);
const FONT_STACK = /^[\w\s,."'-]+$/;
const HTTPS_URL = /^https:\/\/[^\s"'<>]+$/;

/**
 * The 148 CSS colour names and the sRGB hex each one resolves to. A closed list,
 * because the pattern it replaces was `[a-z]{3,20}` and so accepted `banana`: a
 * custom property holding a word CSS does not know is guaranteed-invalid, every
 * token derived from it then computes to nothing, and the header, the buttons
 * and the stats band paint blank with no error anywhere on the form.
 *
 * The hexes are here and not only the names so a colour typed by name still
 * reaches `theme-color` and the legibility panel. Every name and every hex was
 * diffed against Chrome's own parser; site-theme.test.ts guards the shape.
 */
const NAMED_COLOURS = new Map(
	`aliceblue #f0f8ff
antiquewhite #faebd7
aqua #00ffff
aquamarine #7fffd4
azure #f0ffff
beige #f5f5dc
bisque #ffe4c4
black #000000
blanchedalmond #ffebcd
blue #0000ff
blueviolet #8a2be2
brown #a52a2a
burlywood #deb887
cadetblue #5f9ea0
chartreuse #7fff00
chocolate #d2691e
coral #ff7f50
cornflowerblue #6495ed
cornsilk #fff8dc
crimson #dc143c
cyan #00ffff
darkblue #00008b
darkcyan #008b8b
darkgoldenrod #b8860b
darkgray #a9a9a9
darkgreen #006400
darkgrey #a9a9a9
darkkhaki #bdb76b
darkmagenta #8b008b
darkolivegreen #556b2f
darkorange #ff8c00
darkorchid #9932cc
darkred #8b0000
darksalmon #e9967a
darkseagreen #8fbc8f
darkslateblue #483d8b
darkslategray #2f4f4f
darkslategrey #2f4f4f
darkturquoise #00ced1
darkviolet #9400d3
deeppink #ff1493
deepskyblue #00bfff
dimgray #696969
dimgrey #696969
dodgerblue #1e90ff
firebrick #b22222
floralwhite #fffaf0
forestgreen #228b22
fuchsia #ff00ff
gainsboro #dcdcdc
ghostwhite #f8f8ff
gold #ffd700
goldenrod #daa520
gray #808080
green #008000
greenyellow #adff2f
grey #808080
honeydew #f0fff0
hotpink #ff69b4
indianred #cd5c5c
indigo #4b0082
ivory #fffff0
khaki #f0e68c
lavender #e6e6fa
lavenderblush #fff0f5
lawngreen #7cfc00
lemonchiffon #fffacd
lightblue #add8e6
lightcoral #f08080
lightcyan #e0ffff
lightgoldenrodyellow #fafad2
lightgray #d3d3d3
lightgreen #90ee90
lightgrey #d3d3d3
lightpink #ffb6c1
lightsalmon #ffa07a
lightseagreen #20b2aa
lightskyblue #87cefa
lightslategray #778899
lightslategrey #778899
lightsteelblue #b0c4de
lightyellow #ffffe0
lime #00ff00
limegreen #32cd32
linen #faf0e6
magenta #ff00ff
maroon #800000
mediumaquamarine #66cdaa
mediumblue #0000cd
mediumorchid #ba55d3
mediumpurple #9370db
mediumseagreen #3cb371
mediumslateblue #7b68ee
mediumspringgreen #00fa9a
mediumturquoise #48d1cc
mediumvioletred #c71585
midnightblue #191970
mintcream #f5fffa
mistyrose #ffe4e1
moccasin #ffe4b5
navajowhite #ffdead
navy #000080
oldlace #fdf5e6
olive #808000
olivedrab #6b8e23
orange #ffa500
orangered #ff4500
orchid #da70d6
palegoldenrod #eee8aa
palegreen #98fb98
paleturquoise #afeeee
palevioletred #db7093
papayawhip #ffefd5
peachpuff #ffdab9
peru #cd853f
pink #ffc0cb
plum #dda0dd
powderblue #b0e0e6
purple #800080
rebeccapurple #663399
red #ff0000
rosybrown #bc8f8f
royalblue #4169e1
saddlebrown #8b4513
salmon #fa8072
sandybrown #f4a460
seagreen #2e8b57
seashell #fff5ee
sienna #a0522d
silver #c0c0c0
skyblue #87ceeb
slateblue #6a5acd
slategray #708090
slategrey #708090
snow #fffafa
springgreen #00ff7f
steelblue #4682b4
tan #d2b48c
teal #008080
thistle #d8bfd8
tomato #ff6347
turquoise #40e0d0
violet #ee82ee
wheat #f5deb3
white #ffffff
whitesmoke #f5f5f5
yellow #ffff00
yellowgreen #9acd32`
		.split("\n")
		.map((line) => line.split(" ") as [string, string]),
);

/** Colours with no fixed sRGB value: valid to write, nothing to convert. */
const COLOUR_KEYWORDS = new Set(["transparent", "currentcolor"]);

/**
 * Refused deliberately. On a custom property these do not mean "the product's
 * default": `--brand-primary: initial` makes the property guaranteed-invalid,
 * which is the same blank page a typo gives. Clearing the field is how an
 * operator asks for the default, and that already works.
 */
const CSS_WIDE = new Set([
	"inherit",
	"initial",
	"unset",
	"revert",
	"revert-layer",
]);

const COLOUR_EXAMPLES =
	"Try oklch(0.30 0.10 255), #1f4e79, rgb(31 78 121) or hsl(207 59% 30%).";
const NOT_A_COLOUR = `Not a colour. ${COLOUR_EXAMPLES}`;

/**
 * The colour spaces, closed for the same reason the names are. An open
 * `[a-z0-9-]+` accepts `color-mix(in banana, red, blue)`, which is invalid and
 * so paints nothing, and `color(--myprofile 1 0 0)` names an `@color-profile`
 * no browser implements. Only the polar spaces take a hue interpolation method.
 */
const RECTANGULAR =
	"srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|oklab|xyz|xyz-d50|xyz-d65";
const POLAR = "hsl|hwb|lch|oklch";
const MIX_SPACE = new RegExp(
	`^in\\s+(?:(?:${RECTANGULAR})|(?:${POLAR})(?:\\s+(?:shorter|longer|increasing|decreasing)\\s+hue)?)$`,
	"i",
);
const MIX_PERCENT = new RegExp(`(?:^${NUM}\\s+|\\s+${NUM}$)`);
const COLOR_BODY = new RegExp(
	`^(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)(?:\\s+${NUM}){3}(?:\\s*/\\s*${NUM})?$`,
	"i",
);

/** The top-level arguments of a function body, nesting and quotes respected. */
function commaArgs(inner: string) {
	const out: string[] = [];
	let depth = 0;
	let quote = "";
	let cur = "";
	for (const ch of inner) {
		if (quote) {
			if (ch === quote) quote = "";
		} else if (ch === '"' || ch === "'") quote = ch;
		else if (ch === "(") depth++;
		else if (ch === ")") depth--;
		else if (ch === "," && depth === 0) {
			out.push(cur.trim());
			cur = "";
			continue;
		}
		cur += ch;
	}
	out.push(cur.trim());
	return out;
}

/**
 * Why this is not a colour, or `null` when it is. Recursive, because
 * `light-dark()` and `color-mix()` take colours, and a composite whose arguments
 * nobody checked is the same hole one level further down.
 */
function colourProblem(v: string): string | null {
	if (HEX.test(v) || CHANNELS.test(v)) return null;
	if (/^[a-z]+$/i.test(v)) {
		const name = v.toLowerCase();
		if (NAMED_COLOURS.has(name) || COLOUR_KEYWORDS.has(name)) return null;
		if (CSS_WIDE.has(name))
			return `"${v}" is a CSS keyword, not a colour, and would leave this token with no value at all. Clear the field to fall back to the product's default.`;
		return `"${v}" is not one of the CSS colour names. ${COLOUR_EXAMPLES}`;
	}
	const fn = /^([a-z][a-z-]*)\(/i.exec(v)?.[1].toLowerCase();
	if (!fn) return NOT_A_COLOUR;
	if (fn === "var")
		return "var() is not accepted here. Every other token is derived from this one, so it has to be a colour rather than a reference to one, and a reference to itself would paint nothing.";
	const inner = /^[a-z][a-z-]*\(([\s\S]*)\)$/i.exec(v)?.[1];
	if (inner === undefined)
		return `Nothing may follow the closing bracket of ${fn}(). ${COLOUR_EXAMPLES}`;
	if (fn === "light-dark") {
		const parts = commaArgs(inner);
		if (parts.length !== 2)
			return "light-dark() takes exactly two colours, the light one first.";
		for (const p of parts) {
			const why = colourProblem(p);
			if (why) return `Inside light-dark(): ${why}`;
		}
		return null;
	}
	if (fn === "color-mix") {
		const parts = commaArgs(inner);
		if (parts.length !== 3)
			return "color-mix() takes a colour space and two colours, e.g. color-mix(in oklab, red 40%, blue).";
		if (!MIX_SPACE.test(parts[0]))
			return `"${parts[0]}" is not a colour space, e.g. in oklab.`;
		for (const p of parts.slice(1)) {
			const why = colourProblem(p.replace(MIX_PERCENT, ""));
			if (why) return `Inside color-mix(): ${why}`;
		}
		return null;
	}
	if (fn === "color")
		return COLOR_BODY.test(inner)
			? null
			: "color() takes a colour space and three numbers, e.g. color(display-p3 0.1 0.2 0.3).";
	return NOT_A_COLOUR;
}

/** Why this value cannot be used, in words an operator can act on. `null` when it can. */
export function checkThemeValue(kind: ThemeKind, raw: string): string | null {
	const v = raw.trim();
	if (!v) return null;
	if (v.length > 200) return "Longer than 200 characters.";
	if (BANNED.test(v) || v.includes("/*"))
		return "Contains one of < > { } ; @ \\ or /*, which could end the style rule.";
	const bracket = unbalanced(v);
	if (bracket) return `This ${bracket}.`;
	if (kind === "number")
		return /^-?\d+(\.\d+)?$/.test(v)
			? null
			: "Not a plain number, e.g. 0.25 or 170.";
	if (kind === "length")
		return /^\d+(\.\d+)?(rem|px|em)$/.test(v)
			? null
			: "Not a length, e.g. 0.5rem.";
	if (kind === "colour") return colourProblem(v);
	if (kind === "fontStack")
		return FONT_STACK.test(v)
			? null
			: 'Not a font stack, e.g. "Fraunces", Georgia, serif.';
	return HTTPS_URL.test(v) ? null : "Must be an https:// stylesheet address.";
}

const safeCssValue = (raw: string, kind: ThemeKind) =>
	checkThemeValue(kind, raw) ? "" : raw.trim();

/** The font stylesheet to load. Only https, so a setting cannot point at a script. */
export function themeFontUrl(s: SiteSettings) {
	const v = (s.theme_font_url ?? "").trim();
	if (!v) return DEFAULT_FONT_URL;
	return HTTPS_URL.test(v) ? v : DEFAULT_FONT_URL;
}

/**
 * The `:root` overrides for this site, or "" when nothing is configured.
 * Only keys the operator actually set are emitted, so every other token keeps
 * falling through to the product default and to the derived dark counterpart.
 * A value that fails `checkThemeValue` is dropped on its own and takes no other
 * declaration with it.
 */
export function themeCss(s: SiteSettings) {
	const decls: string[] = [];
	for (const f of THEME_FIELDS) {
		if (!f.cssVar) continue;
		const v = safeCssValue(s[f.key] ?? "", f.kind);
		if (v) decls.push(`--${f.cssVar}:${v}`);
	}
	return decls.length ? `:root{${decls.join(";")}}` : "";
}

/* ---------------------------------------------------------------- */
/* Colour maths                                                      */
/* ---------------------------------------------------------------- */

const clamp01 = (c: number) => Math.min(1, Math.max(0, c));
const toLinear = (v: number) =>
	v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const toGamma = (c: number) =>
	c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

type Lab = { L: number; a: number; b: number };

const rgbToHex = ([r, g, b]: readonly number[]) =>
	`#${[r, g, b]
		.map((c) =>
			Math.round(clamp01(c) * 255)
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;

const hexToRgb = (hex: string) =>
	[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Out-of-gamut colours clip per channel, which is what a browser would do. */
function labToHex({ L, a, b }: Lab) {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return rgbToHex([
		toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	]);
}

function hexToLab(hex: string): Lab {
	const [r, g, b] = hexToRgb(hex).map(toLinear);
	const l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3);
	const m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3);
	const s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3);
	return {
		L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	};
}

/** The three channels of `fn(a b c)` or `fn(a, b, c)`, alpha dropped. */
function channels(colour: string) {
	const parts = colour
		.slice(colour.indexOf("(") + 1, colour.lastIndexOf(")"))
		.split("/")[0]
		.trim()
		.split(/[\s,]+/)
		.filter(Boolean);
	return parts.length === 3 ? parts : null;
}

/** A channel token, honouring its own `%` rather than the whole string's. */
const scaled = (t: string, full: number) =>
	t.endsWith("%") ? (Number(t.slice(0, -1)) / 100) * full : Number(t);

/** A hue in degrees, written with or without the unit the validator allows. */
const angle = (t: string) => Number(t.replace(/deg$/i, ""));

function hslToRgb(h: number, s: number, l: number) {
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return [f(0), f(8), f(4)];
}

/**
 * A CSS colour to an sRGB hex. `<meta name="theme-color">` and a web manifest
 * are read by browser chrome and by installers whose colour parsers are older
 * than the page engine's, so this is the one place the brand has to leave the
 * token system. `null` for a colour with no fixed sRGB value - `transparent`,
 * `currentColor` - which the settings form reports rather than silently
 * replacing.
 */
export function colourToHex(raw: string): string | null {
	const colour = raw.trim().toLowerCase();
	const named = NAMED_COLOURS.get(colour);
	if (named) return named;
	if (HEX.test(colour)) {
		if (colour.length >= 7) return colour.slice(0, 7);
		const [, r, g, b] = colour;
		return `#${r}${r}${g}${g}${b}${b}`;
	}
	const fn = /^([a-z]+)\(/.exec(colour)?.[1];
	const ch = fn && channels(colour);
	if (!fn || !ch) return null;
	if (fn === "oklch" || fn === "oklab") {
		const [c, h] = [Number(ch[1]), (angle(ch[2]) * Math.PI) / 180];
		return labToHex({
			L: scaled(ch[0], 1),
			a: fn === "oklab" ? Number(ch[1]) : c * Math.cos(h),
			b: fn === "oklab" ? Number(ch[2]) : c * Math.sin(h),
		});
	}
	if (fn === "rgb" || fn === "rgba")
		return rgbToHex(ch.map((t) => scaled(t, 255) / 255));
	if (fn === "hsl" || fn === "hsla")
		return rgbToHex(hslToRgb(angle(ch[0]), scaled(ch[1], 1), scaled(ch[2], 1)));
	return null;
}

/** The browser-chrome colour, derived from the brand rather than kept in step by hand. */
export const themeColor = (s: SiteSettings) =>
	colourToHex(safeCssValue(s.theme_primary ?? "", "colour")) ??
	(colourToHex(DEFAULT_PRIMARY) as string);

/* ---------------------------------------------------------------- */
/* Contrast                                                          */
/* ---------------------------------------------------------------- */

/**
 * Where the site stops writing paper on a brand colour and starts writing ink.
 * A saturated colour carries less luminance than its lightness suggests, so
 * chroma pushes the crossover up. styles.css runs the same two numbers inside
 * `clamp(0.16, (0.57 + c * 0.1 - l) * 1000, 0.985)`, and site-theme.test.ts
 * reads the stylesheet, so the two cannot drift apart.
 */
export const FOREGROUND_CROSSOVER = 0.57;
export const FOREGROUND_CHROMA_TERM = 0.1;
const INK = 0.16;
const PAPER = 0.985;

const writesInk = ({ L, a, b }: Lab) =>
	L > FOREGROUND_CROSSOVER + Math.hypot(a, b) * FOREGROUND_CHROMA_TERM;

/** How styles.css lifts a light colour when no dark counterpart is set: floor, lift, ceiling. */
export const DARK_LIFT: Record<string, [number, number, number]> = {
	theme_primary: [0.55, 0.32, 0.8],
	theme_secondary: [0.6, 0.05, 0.85],
	theme_accent: [0.55, 0.05, 0.82],
	theme_highlight: [0.6, 0.04, 0.88],
};

/** WCAG 2.1 contrast ratio between two hex colours. */
export function contrastRatio(one: string, two: string) {
	const luminance = (hex: string) => {
		const [r, g, b] = hexToRgb(hex).map(toLinear);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [hi, lo] = [luminance(one), luminance(two)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

export type ThemeContrast = {
	key: string;
	label: string;
	mode: "light" | "dark";
	/** The pairing being measured, as an operator would describe it. */
	what: string;
	ratio: number;
};

/** What the colour resolves to in each mode, the dark one derived when unset. */
function bothModes(values: SiteSettings, key: string) {
	const lift = DARK_LIFT[key];
	const light = (values[key] ?? "").trim();
	if (!lift || !light || checkThemeValue("colour", light)) return null;
	const hex = colourToHex(light);
	if (!hex) return null;
	const typedDark = (values[`${key}_dark`] ?? "").trim();
	const lab = hexToLab(hex);
	return {
		light: hex,
		dark:
			(!checkThemeValue("colour", typedDark) && colourToHex(typedDark)) ||
			labToHex({
				...lab,
				L: Math.min(lift[2], Math.max(lift[0], lab.L + lift[1])),
			}),
	};
}

/**
 * How legible each brand colour will be, in each of the ways the site uses it.
 *
 * The foreground written *on* a colour follows that colour's lightness, so the
 * derivation can always find a readable one. Everything else is a pairing of two
 * colours the operator chose, which no derivation can rescue without changing
 * the brand: a pale primary makes every heading and link disappear, and only a
 * warning can say so.
 *
 * The dark counterpart is derived when the operator left it empty, so this
 * measures what will ship rather than restating what was typed.
 */
export function themeContrast(values: SiteSettings): ThemeContrast[] {
	const out: ThemeContrast[] = [];
	const primary = bothModes(values, "theme_primary");
	for (const f of THEME_FIELDS) {
		const colour = bothModes(values, f.key);
		if (!colour) continue;
		const label = f.label.replace(" colour", "");
		for (const mode of ["light", "dark"] as const) {
			const on = colour[mode];
			const say = (what: string, against: string) =>
				out.push({
					key: f.key,
					label,
					mode,
					what,
					ratio: contrastRatio(on, against),
				});
			if (f.key === "theme_highlight") {
				if (primary) say("a mark on the primary colour", primary[mode]);
				continue;
			}
			say(
				"a label on it",
				labToHex({ L: writesInk(hexToLab(on)) ? INK : PAPER, a: 0, b: 0 }),
			);
			say(
				"a heading or link in it",
				labToHex({ L: mode === "light" ? PAPER : 0.19, a: 0, b: 0 }),
			);
		}
	}
	return out;
}
