import { describe, expect, it } from "vitest";

import { youtubeId } from "./SectionRenderer";

describe("youtubeId", () => {
	it("reads the id from every shape YouTube hands out", () => {
		expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
		expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
		expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
		expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
		expect(youtubeId("https://www.youtube.com/watch?t=30&v=dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	// a bare `v=` also matches inside ?rev= and ?srv=, which yields a bogus id
	// and a broken i.ytimg.com thumbnail
	it("ignores a v that is the tail of another parameter", () => {
		expect(youtubeId("https://example.org/page?rev=abcdefgh")).toBeNull();
		expect(youtubeId("https://example.org/page?srv=abcdefgh")).toBeNull();
	});

	it("returns null for anything without an id", () => {
		expect(youtubeId("")).toBeNull();
		expect(youtubeId("https://vimeo.com/12345")).toBeNull();
	});
});
