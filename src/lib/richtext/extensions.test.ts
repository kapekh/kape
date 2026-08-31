import { describe, expect, it } from "vitest";

import { renderBasicRichText, renderBody } from "#/server/richtext";

const TABLE_DOC = {
	type: "doc",
	content: [
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [{ type: "text", text: "Founded" }],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [{ type: "text", text: "1999" }],
								},
							],
						},
					],
				},
			],
		},
		{
			type: "descriptionList",
			content: [
				{ type: "descriptionTerm", content: [{ type: "text", text: "SMT" }] },
				{
					type: "descriptionDetails",
					content: [{ type: "text", text: "Senior Management Team" }],
				},
			],
		},
	],
};

describe("trusted rich text", () => {
	it("renders tables and definition lists server-side", () => {
		const html = renderBody(TABLE_DOC);
		expect(html).toContain("<table");
		expect(html).toContain("<th");
		expect(html).toContain("Founded");
		expect(html).toContain("<dt");
		expect(html).toContain("Senior Management Team");
	});

	it("wraps tables in a scroll container so narrow viewports never overflow", () => {
		expect(renderBody(TABLE_DOC)).toContain("overflow-x-auto");
	});
});

describe("image alignment", () => {
	const doc = (align: unknown) => ({
		type: "doc",
		content: [
			{ type: "image", attrs: { src: "/uploads/ed.jpg", align } },
			{
				type: "paragraph",
				content: [{ type: "text", text: "Warm greetings" }],
			},
		],
	});

	it("round-trips a float onto the stored image", () => {
		expect(renderBody(doc("right"))).toContain('data-align="right"');
	});

	it("drops an alignment it does not offer", () => {
		expect(renderBody(doc("centre"))).not.toContain("data-align");
		expect(renderBody(doc(null))).not.toContain("data-align");
	});
});

describe("untrusted rich text", () => {
	it("still renders plain prose", () => {
		expect(
			renderBasicRichText({
				type: "doc",
				content: [
					{ type: "paragraph", content: [{ type: "text", text: "hello" }] },
				],
			}),
		).toBe("<p>hello</p>");
	});

	it("emits no table or definition-list markup", () => {
		const html = renderBasicRichText(TABLE_DOC);
		expect(html).not.toContain("<table");
		expect(html).not.toContain("<dt");
	});
});
