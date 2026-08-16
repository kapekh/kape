// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { sourceOf } from "./edit-source";

const node = (html: string): HTMLElement => {
	const el = document.createElement("div");
	el.innerHTML = html;
	return el;
};

describe("the source behind a node edited in place", () => {
	it("puts the asterisks back around an accent span", () => {
		expect(
			sourceOf(
				node(
					'<span>Where every child </span><span data-cms-accent="">learns</span><span>, and </span><span data-cms-accent="">rises</span><span>.</span>',
				),
			),
		).toBe("Where every child *learns*, and *rises*.");
	});

	it("reads a line break back as a newline", () => {
		expect(sourceOf(node("First line<br>second line"))).toBe(
			"First line\nsecond line",
		);
	});

	it("drops the trailing break a contenteditable leaves behind", () => {
		expect(sourceOf(node("Typed<br>"))).toBe("Typed");
		expect(sourceOf(node("<br>"))).toBe("");
	});

	it("normalises the nbsp a contenteditable pads with", () => {
		expect(sourceOf(node("Two words"))).toBe("Two words");
	});

	it("separates the blocks a browser makes out of Enter", () => {
		expect(sourceOf(node("<div>One</div><div>Two</div>"))).toBe("One\nTwo");
	});

	it("keeps an emptied accent span out of the source rather than saving **", () => {
		expect(
			sourceOf(node('Plain <span data-cms-accent=""> </span>text')),
		).toBe("Plain text");
	});
});
