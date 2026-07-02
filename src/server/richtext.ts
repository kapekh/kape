import { renderToHTMLString } from "@tiptap/static-renderer";

import { basicRichTextExtensions, richTextExtensions } from "#/lib/richtext/extensions";

import type { JSONContent } from "@tiptap/core";

/**
 * Render stored Tiptap/ProseMirror JSON to an HTML string (server-side, no DOM).
 *
 * Accepts the JSON as a string (how it's stored in `translations.value`) or an
 * object. Returns "" for empty/invalid input. Safe because the extension
 * allow-list constrains nodes/marks and links are protocol-restricted; values
 * are HTML-escaped by the renderer. (Add `sanitize-html` here if we ever allow
 * untrusted authors.)
 */
export function renderBody(json: string | JSONContent | null | undefined): string {
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

/**
 * Render UNTRUSTED rich text (public form `richtext` answers) to HTML using the
 * restricted allow-list — text + links only, no images or form embeds. Accepts
 * stringified ProseMirror JSON; returns "" for empty/invalid input.
 */
export function renderBasicRichText(json: string | JSONContent | null | undefined): string {
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
		return renderToHTMLString({ content: doc, extensions: basicRichTextExtensions });
	} catch {
		return "";
	}
}
