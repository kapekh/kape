import type { JSONContent } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer";
import {
	basicRichTextExtensions,
	richTextExtensions,
} from "#/lib/richtext/extensions";

const HEADING_MAX = 140;

const boldOnly = (node: JSONContent) =>
	node.type === "paragraph" &&
	Array.isArray(node.content) &&
	node.content.length > 0 &&
	node.content.every(
		(c) =>
			c.type === "text" &&
			c.marks?.some((m) => m.type === "bold") &&
			!c.marks.some((m) => m.type === "link"),
	) &&
	node.content.reduce((n, c) => n + (c.text?.length ?? 0), 0) <= HEADING_MAX;

/** A short line that is nothing but bold was typed as a heading; render it as one. */
export function headingsFromBoldLines(doc: JSONContent): JSONContent {
	if (!Array.isArray(doc.content)) return doc;
	return {
		...doc,
		content: doc.content.map((node) =>
			boldOnly(node)
				? {
						type: "heading",
						attrs: { level: 3 },
						content: node.content?.map((c) => ({
							...c,
							marks: c.marks?.filter((m) => m.type !== "bold"),
						})),
					}
				: node,
		),
	};
}

// safe because the extension allow-list constrains nodes and marks and links are protocol-restricted; add sanitize-html if authors are ever untrusted
export function renderBody(
	json: string | JSONContent | null | undefined,
): string {
	if (!json) return "";

	let doc: JSONContent;
	if (typeof json === "string") {
		try {
			doc = JSON.parse(json) as JSONContent;
		} catch {
			return "";
		}
	} else {
		doc = json;
	}
	if (!doc || typeof doc !== "object") return "";

	try {
		return renderToHTMLString({
			content: headingsFromBoldLines(doc),
			extensions: richTextExtensions,
		});
	} catch {
		return "";
	}
}

// untrusted input: text and links only, no images or form embeds
export function renderBasicRichText(
	json: string | JSONContent | null | undefined,
): string {
	if (!json) return "";
	let doc: JSONContent;
	if (typeof json === "string") {
		try {
			doc = JSON.parse(json) as JSONContent;
		} catch {
			return "";
		}
	} else {
		doc = json;
	}
	if (!doc || typeof doc !== "object") return "";
	try {
		return renderToHTMLString({
			content: doc,
			extensions: basicRichTextExtensions,
		});
	} catch {
		return "";
	}
}
