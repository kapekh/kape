import { describe, expect, it } from "vitest";

import { formatSize, isLowResolution, MIN_FULL_WIDTH } from "./media-size";

describe("isLowResolution", () => {
	it("flags an image the site has to upscale into a hero", () => {
		// the three homepage hero slides that started this
		expect(isLowResolution({ width: 267, height: 159 })).toBe(true);
		expect(isLowResolution({ width: 265, height: 149 })).toBe(true);
		expect(isLowResolution({ width: 416, height: 202 })).toBe(true);
	});

	it("passes an image wide enough on either edge", () => {
		expect(isLowResolution({ width: 1920, height: 1440 })).toBe(false);
		expect(isLowResolution({ width: 1619, height: 1920 })).toBe(false);
		expect(isLowResolution({ width: MIN_FULL_WIDTH, height: 100 })).toBe(false);
	});

	it("stays quiet when the size was never recorded", () => {
		expect(isLowResolution({})).toBe(false);
		expect(isLowResolution({ width: 800, height: null })).toBe(false);
	});
});

describe("formatSize", () => {
	it("prints both edges, or nothing at all", () => {
		expect(formatSize({ width: 1920, height: 1440 })).toBe("1920 × 1440");
		expect(formatSize({ width: null, height: null })).toBeNull();
	});
});
