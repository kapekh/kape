import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { renderBody } from "./richtext";

const bold = (text: string): JSONContent => ({
	type: "text",
	marks: [{ type: "bold" }],
	text,
});
const plain = (text: string): JSONContent => ({ type: "text", text });
const para = (...content: JSONContent[]): JSONContent => ({
	type: "paragraph",
	content,
});
const doc = (...content: JSONContent[]): JSONContent => ({
	type: "doc",
	content,
});

describe("renderBody", () => {
	it("renders a line that is nothing but bold as a heading", () => {
		const html = renderBody(
			doc(para(bold("Our Journey")), para(plain("Where it all began."))),
		);
		expect(html).toContain("<h3>Our Journey</h3>");
		expect(html).toContain("<p>Where it all began.</p>");
	});

	it("leaves a paragraph that merely contains bold as a paragraph", () => {
		const html = renderBody(
			doc(para(plain("Our roots trace back to "), bold("1996"), plain("."))),
		);
		expect(html).not.toContain("<h3");
		expect(html).toContain("<strong>1996</strong>");
	});

	it("keeps a bold link, and a whole bold paragraph, as they were written", () => {
		const link = {
			type: "text",
			marks: [{ type: "bold" }, { type: "link", attrs: { href: "/about" } }],
			text: "About us",
		};
		expect(renderBody(doc(para(link)))).not.toContain("<h3");
		const long = "A".repeat(200);
		expect(renderBody(doc(para(bold(long))))).toContain(
			`<p><strong>${long}</strong></p>`,
		);
	});
});
