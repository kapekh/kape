import type { JSONContent } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer";
import {
	basicRichTextExtensions,
	richTextExtensions,
} from "#/lib/richtext/extensions";

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
		return renderToHTMLString({ content: doc, extensions: richTextExtensions });
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
