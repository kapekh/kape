import { mergeAttributes, Node } from "@tiptap/core";

/**
 * A rich-text node that embeds an admin-built form anywhere prose renders —
 * post bodies, page rich-text sections, etc. It is deliberately decoupled: it
 * serializes to a neutral marker `<div data-kape-form="slug">` (both in the
 * editor and the server renderer), and the public `<FormEmbeds/>` hydrator
 * mounts a live <FormRenderer/> into every marker. Nothing is tied to a host.
 */
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
				parseHTML: (el) => el.getAttribute("data-kape-form") || "",
				renderHTML: (attrs) => ({ "data-kape-form": attrs.slug }),
			},
		};
	},

	parseHTML() {
		return [{ tag: "div[data-kape-form]" }];
	},

	renderHTML({ node, HTMLAttributes }) {
		const slug = node.attrs.slug || "";
		// The text child is a placeholder shown in the editor and before hydration.
		return [
			"div",
			mergeAttributes(HTMLAttributes, { class: "kape-form-embed" }),
			`▤ Form: ${slug || "(none selected)"}`,
		];
	},
});
