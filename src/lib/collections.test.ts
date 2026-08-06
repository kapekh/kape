import { describe, expect, it } from "vitest";

import { COLLECTIONS, resolvesUnder } from "./collections";

describe("resolvesUnder", () => {
	it("serves a collection's own content type", () => {
		expect(resolvesUnder(COLLECTIONS.careers, "job")).toBe(true);
		expect(resolvesUnder(COLLECTIONS.news, "news")).toBe(true);
	});

	it("serves announcement details under /careers", () => {
		expect(resolvesUnder(COLLECTIONS.careers, "announcement")).toBe(true);
	});

	it("keeps announcements off every other prefix", () => {
		expect(resolvesUnder(COLLECTIONS.news, "announcement")).toBe(false);
		expect(resolvesUnder(COLLECTIONS.stories, "announcement")).toBe(false);
	});

	it("still blocks the internal-only types", () => {
		expect(resolvesUnder(COLLECTIONS.careers, "document")).toBe(false);
		expect(resolvesUnder(COLLECTIONS.events, "event")).toBe(false);
	});
});
