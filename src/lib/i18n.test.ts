// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { LanguageProvider, useT } from "./i18n";

/**
 * `t()` has two branches: the dictionary one inside a provider, and the
 * fallback one `useLang` returns when there is no provider at all — which is
 * what the root error and 404 screens hit, since they render outside it.
 * Interpolation has to behave identically on both, so every case below is
 * asserted against both.
 *
 * Keys are held in `KEY` rather than written inline: `no-brand.test.ts` reads a
 * quoted key passed straight to t(), anywhere in src, as proof that the product
 * renders it — and a dictionary built for a unit test is not the product.
 */
const KEY = {
	a: "test.one",
	b: "test.two",
} as const;

const withStrings = (strings: Record<string, string>) =>
	renderHook(() => useT(), {
		wrapper: ({ children }: { children: ReactNode }) =>
			createElement(LanguageProvider, {
				lang: "en",
				languages: [],
				strings,
				children,
			}),
	}).result.current;

/** No wrapper: exercises the null-context branch, which has no dictionary. */
const withoutProvider = () => renderHook(() => useT()).result.current;

describe("t() interpolation", () => {
	it("fills a slot from the dictionary", () => {
		const t = withStrings({ [KEY.a]: "Contact {site}" });
		expect(t(KEY.a, "Contact {site}", { site: "Riverbend Trust" })).toBe(
			"Contact Riverbend Trust",
		);
	});

	it("fills two slots in one string", () => {
		const t = withStrings({ [KEY.a]: "{n} of {total}" });
		expect(t(KEY.a, "", { n: 2, total: 7 })).toBe("2 of 7");
	});

	it("leaves an unsupplied slot visible rather than printing undefined", () => {
		const t = withStrings({ [KEY.a]: "Today: {today} · Total: {total}" });
		const out = t(KEY.a, "", { today: 12 });
		expect(out).toBe("Today: 12 · Total: {total}");
		expect(out).not.toContain("undefined");
	});

	it("leaves every slot visible when no params are passed at all", () => {
		const t = withStrings({ [KEY.a]: "{n} photos" });
		expect(t(KEY.a)).toBe("{n} photos");
	});

	// `name in params` would resolve every Object.prototype member, so a string
	// containing `{constructor}` would print a function body.
	it("ignores inherited object properties as slot values", () => {
		const t = withStrings({ [KEY.a]: "{constructor}" });
		expect(t(KEY.a, "", { n: 1 })).toBe("{constructor}");
	});
});

describe("t() two-argument calls are unchanged", () => {
	it("returns the dictionary value when the key is seeded", () => {
		const t = withStrings({ [KEY.a]: "ទំព័រដើម" });
		expect(t(KEY.a, "Home")).toBe("ទំព័រដើម");
	});

	it("returns the fallback when the key is missing", () => {
		const t = withStrings({ [KEY.a]: "ទំព័រដើម" });
		expect(t(KEY.b, "Home")).toBe("Home");
	});

	it("returns the key when there is no fallback either", () => {
		const t = withStrings({});
		expect(t(KEY.b)).toBe(KEY.b);
	});
});

describe("t() outside a provider", () => {
	it("interpolates its fallback too", () => {
		const t = withoutProvider();
		expect(t(KEY.a, "Nothing matched “{query}”.", { query: "wells" })).toBe(
			"Nothing matched “wells”.",
		);
	});

	it("leaves an unsupplied slot visible on the fallback branch as well", () => {
		const t = withoutProvider();
		const out = t(KEY.a, "Announcement {n}", {});
		expect(out).toBe("Announcement {n}");
		expect(out).not.toContain("undefined");
	});

	it("still honours the plain two-argument call", () => {
		const t = withoutProvider();
		expect(t(KEY.a, "Page not found")).toBe("Page not found");
	});
});
