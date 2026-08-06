import { mergeAttributes, Node } from "@tiptap/core";

/**
 * A rich-text node that embeds an admin-built form anywhere prose renders —
 * post bodies, page rich-text sections, etc. It is deliberately decoupled: it
 * serializes to a neutral marker `<div data-form-embed="slug">` (both in the
 * editor and the server renderer), and `RichBody` splits authored HTML at those
 * markers to mount a live <FormRenderer/>. Nothing is tied to a host.
 */

export const FORM_ATTR = "data-form-embed";

export const FormEmbed = Node.create({
	name: "formEmbed",
	group: "block",
	atom: true,
	selectable: true,
	draggable: true,

	addAttributes() {
		return {
			slug: {
				default: "",
				parseHTML: (el) => el.getAttribute(FORM_ATTR) || "",
				renderHTML: (attrs) => ({ [FORM_ATTR]: attrs.slug }),
			},
		};
	},

	parseHTML() {
		return [{ tag: `div[${FORM_ATTR}]` }];
	},

	renderHTML({ node, HTMLAttributes }) {
		const slug = node.attrs.slug || "";
		// The text child is a placeholder shown in the editor and before hydration.
		return [
			"div",
			mergeAttributes(HTMLAttributes, { class: "form-embed" }),
			`▤ Form: ${slug || "(none selected)"}`,
		];
	},
});
