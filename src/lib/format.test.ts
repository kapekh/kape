import { describe, expect, it } from "vitest";

import { fmtDate, fmtMoney, localeFor } from "./format";

describe("localeFor", () => {
	it("maps the site's language codes to real locales", () => {
		expect(localeFor("en")).toBe("en-US");
		expect(localeFor("km")).toBe("km-KH");
	});

	it("passes an unknown code through and falls back for nothing", () => {
		expect(localeFor("fr")).toBe("fr");
		expect(localeFor("")).toBe("en-US");
		expect(localeFor(null)).toBe("en-US");
		expect(localeFor(undefined)).toBe("en-US");
	});
});

describe("fmtDate", () => {
	it("formats a calendar day", () => {
		expect(fmtDate("2026-08-10", "en")).toBe("Aug 10, 2026");
	});

	/**
	 * The mutation guard for the language argument: break `localeFor` and this is
	 * the test that goes red, because Khmer and English disagree on both the month
	 * name and the order.
	 */
	it("reads a date in the active language, not always English", () => {
		const en = fmtDate("2026-08-10", "en");
		const km = fmtDate("2026-08-10", "km");
		expect(en).toBe("Aug 10, 2026");
		expect(km).toBe("10 សីហា 2026");
		expect(km).not.toBe(en);
	});

	it("treats a bare day as local midnight, so the day does not slip", () => {
		// parsed as UTC this is the 1st in any zone west of Greenwich
		expect(fmtDate("2026-01-01", "en")).toBe("Jan 1, 2026");
	});

	it("reads a SQLite CURRENT_TIMESTAMP as UTC", () => {
		expect(fmtDate("2026-08-10 02:30:00", "en")).toBe(
			fmtDate("2026-08-10T02:30:00Z", "en"),
		);
	});

	it("accepts a Date and a millisecond number", () => {
		const d = new Date("2026-08-10T00:00:00");
		expect(fmtDate(d, "en")).toBe("Aug 10, 2026");
		expect(fmtDate(d.getTime(), "en")).toBe("Aug 10, 2026");
	});

	it("gives back nothing for nothing", () => {
		expect(fmtDate(null, "en")).toBe("");
		expect(fmtDate(undefined, "en")).toBe("");
		expect(fmtDate("", "en")).toBe("");
	});

	it("hands back an unparseable value rather than NaN", () => {
		expect(fmtDate("not a date", "en")).toBe("not a date");
		expect(fmtDate(new Date("nope"), "en")).toBe("Invalid Date");
	});
});

/** Intl separates a currency code from the number with U+00A0, not a space. */
const norm = (s: string) => s.replace(/ /g, " ");

describe("fmtMoney", () => {
	it("formats whole units, no cents", () => {
		expect(fmtMoney(12500, "USD", "en")).toBe("$12,500");
		expect(fmtMoney(12500.4, "USD", "en")).toBe("$12,500");
	});

	/** The other half of the mutation guard: riel is written differently. */
	it("writes money the way the active language writes it", () => {
		const en = fmtMoney(4200000, "KHR", "en");
		const km = fmtMoney(4200000, "KHR", "km");
		expect(norm(en)).toBe("KHR 4,200,000");
		expect(norm(km)).toBe("4,200,000៛");
		expect(km).not.toBe(en);
	});

	it("degrades instead of throwing on a currency code from the database", () => {
		expect(norm(fmtMoney(1500, "NOTACODE", "en"))).toBe("NOTACODE 1,500");
		expect(fmtMoney(1500, "", "en")).toBe("1,500");
	});

	it("gives back nothing for a number that is not one", () => {
		expect(fmtMoney(Number.NaN, "USD", "en")).toBe("");
		expect(fmtMoney(Number.POSITIVE_INFINITY, "USD", "en")).toBe("");
	});
});
