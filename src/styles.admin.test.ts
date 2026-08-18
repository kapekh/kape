import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// every layer-1 and layer-2 public token is frozen character for character; a failure is a mistake or the client's decision, never a test to relax on the way past
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

/** `--name: value` pairs of a block, normalised to single spaces. */
function declarations(body: string) {
	const out = new Map<string, string>();
	for (const d of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([\s\S]*?);/g))
		out.set(d[1], d[2].replace(/\s+/g, " ").trim());
	return out;
}

function blockBody(selector: string) {
	const m = css.match(
		new RegExp(`(?:^|\\n)${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
	);
	return m?.[1] ?? null;
}

function rootDeclarations() {
	const out = new Map<string, string>();
	for (const block of css.matchAll(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/g))
		for (const [name, value] of declarations(block[1])) out.set(name, value);
	return out;
}

/** Every :root token as it stood before the admin layer was added. */
const PUBLIC_TOKENS: Record<string, string> = {
	"--accent":
		"light-dark( var(--brand-accent), var(--brand-accent-dark, oklch(from var(--brand-accent) clamp(0.55, calc(l + 0.05), 0.82) c h)) )",
	"--accent-foreground":
		"oklch(from var(--accent) clamp(0.16, (0.57 + c * 0.1 - l) * 1000, 0.985) calc(0.012 * var(--paper-chroma)) calc(80 + var(--paper-hue)))",
	"--accent-ink":
		"light-dark(oklch(from var(--accent) min(l, 0.53) c h), var(--accent))",
	"--secondary-ink":
		"light-dark(oklch(from var(--secondary) min(l, 0.54) c h), var(--secondary))",
	"--background":
		"light-dark( oklch(0.985 calc(0.012 * var(--paper-chroma)) calc(80 + var(--paper-hue))), oklch(0.19 calc(0.015 * var(--paper-chroma)) calc(60 + var(--paper-hue))) )",
	"--border":
		"light-dark( oklch(0.88 calc(0.02 * var(--paper-chroma)) calc(70 + var(--paper-hue))), oklch(0.34 calc(0.015 * var(--paper-chroma)) calc(60 + var(--paper-hue))) )",
	"--brand-accent": "oklch(0.55 0.13 250)",
	"--brand-font-body": '"Inter", "Battambang", system-ui, sans-serif',
	"--brand-font-display": '"Fraunces", "Battambang", Georgia, serif',
	"--brand-font-script": '"Battambang", "Noto Serif Khmer", serif',
	"--brand-highlight": "oklch(0.75 0.09 250)",
	"--brand-primary": "oklch(0.30 0.03 250)",
	"--brand-secondary": "oklch(0.66 0.06 250)",
	"--card":
		"light-dark( oklch(1 0 0), oklch(0.235 calc(0.018 * var(--paper-chroma)) calc(60 + var(--paper-hue))) )",
	"--card-foreground": "var(--foreground)",
	"--destructive": "light-dark(oklch(0.577 0.245 27.325), oklch(0.70 0.19 22))",
	"--destructive-foreground":
		"oklch(from var(--destructive) clamp(0.16, (0.57 + c * 0.1 - l) * 1000, 0.985) calc(0.012 * var(--paper-chroma)) calc(80 + var(--paper-hue)))",
	"--foreground":
		"light-dark( oklch(0.22 calc(0.04 * var(--paper-chroma)) calc(40 + var(--paper-hue))), oklch(0.95 calc(0.012 * var(--paper-chroma)) calc(85 + var(--paper-hue))) )",
	"--gold":
		"light-dark( var(--brand-highlight), var(--brand-highlight-dark, oklch(from var(--brand-highlight) clamp(0.6, calc(l + 0.04), 0.88) c h)) )",
	"--gradient-hero":
		"linear-gradient(135deg, var(--primary) 0%, oklch(from var(--primary) calc(l - 0.06) calc(c - 0.01) calc(h + 5)) 60%, oklch(from var(--primary) calc(l - 0.12) calc(c - 0.04) calc(h + 10)) 100%)",
	"--gradient-warm":
		"linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%)",
	"--input": "var(--border)",
	"--muted":
		"light-dark( oklch(0.94 calc(0.015 * var(--paper-chroma)) calc(75 + var(--paper-hue))), oklch(0.27 calc(0.015 * var(--paper-chroma)) calc(60 + var(--paper-hue))) )",
	"--muted-foreground":
		"light-dark( oklch(0.45 calc(0.03 * var(--paper-chroma)) calc(55 + var(--paper-hue))), oklch(0.72 calc(0.02 * var(--paper-chroma)) calc(75 + var(--paper-hue))) )",
	"--palm": "light-dark(oklch(0.55 0.10 165), oklch(0.62 0.12 165))",
	"--paper-chroma": "0.25",
	"--paper-hue": "170",
	"--popover": "var(--card)",
	"--popover-foreground": "var(--foreground)",
	"--primary":
		"light-dark( var(--brand-primary), var(--brand-primary-dark, oklch(from var(--brand-primary) clamp(0.55, calc(l + 0.32), 0.8) c h)) )",
	"--primary-foreground":
		"oklch(from var(--primary) clamp(0.16, (0.57 + c * 0.1 - l) * 1000, 0.985) calc(0.012 * var(--paper-chroma)) calc(80 + var(--paper-hue)))",
	"--radius": "0.5rem",
	"--ring": "var(--accent)",
	"--secondary":
		"light-dark( var(--brand-secondary), var(--brand-secondary-dark, oklch(from var(--brand-secondary) clamp(0.6, calc(l + 0.05), 0.85) c h)) )",
	"--secondary-foreground":
		"oklch(from var(--secondary) clamp(0.16, (0.57 + c * 0.1 - l) * 1000, 0.985) calc(0.012 * var(--paper-chroma)) calc(80 + var(--paper-hue)))",
	"--shadow-lift":
		"0 20px 40px -15px light-dark( oklch(from var(--primary) l c h / 0.35), oklch(from var(--primary) 0.12 c h / 0.65) )",
	"--shadow-soft":
		"0 30px 60px -20px light-dark( oklch(from var(--foreground) l c h / 0.25), oklch(from var(--background) 0.06 c h / 0.7) )",
	"--band-accent": "var(--accent)",
	"--band-accent-ink": "var(--accent-foreground)",
	"--band-dark":
		"light-dark( oklch(from var(--primary) 0.24 calc(c - 0.01) h), oklch(0.16 calc(0.015 * var(--paper-chroma)) calc(60 + var(--paper-hue))) )",
	"--band-dark-ink": "oklch(from var(--background) 0.97 c h)",
	"--band-primary": "var(--primary)",
	"--band-primary-ink": "var(--primary-foreground)",
	"--warm-foreground": "oklch(from var(--primary) 0.24 calc(c - 0.01) h)",
	"--warm-foreground-muted": "oklch(from var(--primary) 0.30 calc(c - 0.03) h)",
};

describe("the public site did not move", () => {
	const root = rootDeclarations();

	it("keeps every public token at the value the client signed off on", () => {
		const moved: string[] = [];
		for (const [name, was] of Object.entries(PUBLIC_TOKENS)) {
			const now = root.get(name);
			if (now === undefined) moved.push(`${name} is gone`);
			else if (now !== was) moved.push(`${name}\n  was ${was}\n  now ${now}`);
		}
		expect(moved).toEqual([]);
	});

	it("adds no public token either, so the admin cannot smuggle one in", () => {
		expect([...root.keys()].sort()).toEqual(Object.keys(PUBLIC_TOKENS).sort());
	});

	it("keeps the paper texture and the serif headings on the site", () => {
		expect(css).toMatch(/\n\s*body::before\s*\{/);
		expect(css).toMatch(
			/\n\s*h1, h2, h3, h4 \{\s*\n\s*font-family: var\(--font-display\)/,
		);
	});
});

describe("admin token layer", () => {
	const admin = blockBody("\\.admin");

	it("exists, scoped to the class the shell root sets", () => {
		expect(admin).not.toBeNull();
	});

	it("declares the names the spec names, and only those", () => {
		expect([...declarations(admin ?? "").keys()].sort()).toEqual(
			[
				"--admin-accent",
				"--admin-accent-ink",
				"--admin-accent-soft",
				"--admin-bg",
				"--admin-border",
				"--admin-border-strong",
				"--admin-danger",
				"--admin-danger-ink",
				"--admin-danger-soft",
				"--admin-draft",
				"--admin-draft-ink",
				"--admin-draft-soft",
				"--admin-focus",
				"--admin-ink",
				"--admin-ink-muted",
				"--admin-ink-subtle",
				"--admin-live",
				"--admin-live-ink",
				"--admin-live-soft",
				"--admin-neutral",
				"--admin-neutral-soft",
				"--admin-panel",
				"--admin-panel-raised",
				"--admin-warning",
				"--admin-warning-ink",
				"--admin-warning-soft",
			].sort(),
		);
	});

	it("gives every mode-varying admin token two different values", () => {
		// Same rule as the public layer, and the same bug it is there to stop: a
		// token written in light values and silently reused on a dark page.
		const namesALiteralColour = (v: string) =>
			/\b(?:oklch|oklab|lch|lab|rgba?|hsla?|hwb)\(\s*(?!from\b)/i.test(v);
		const wrong: string[] = [];
		for (const [name, value] of declarations(admin ?? "")) {
			if (!namesALiteralColour(value)) continue;
			const arms = value.match(
				/light-dark\(\s*([^,]+(?:\([^)]*\))?[^,]*),\s*([\s\S]+)\)\s*$/,
			);
			if (!arms) wrong.push(`${name} names a colour outside light-dark()`);
			else if (arms[1].trim() === arms[2].trim())
				wrong.push(`${name} is the same in both modes`);
		}
		expect(wrong).toEqual([]);
	});

	it("registers every admin token as a utility", () => {
		for (const name of declarations(admin ?? "").keys())
			expect(css).toContain(`--color-${name.slice(2)}: var(${name});`);
	});

	it("drops the paper texture and the serif headings under .admin", () => {
		expect(css).toMatch(
			/body:has\(\.admin\)::before\s*\{\s*\n?\s*display: none/,
		);
		expect(css).toMatch(
			/\.admin :is\(h1, h2, h3, h4\) \{\s*\n\s*font-family: var\(--font-sans\)/,
		);
	});
});
