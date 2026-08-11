import { mergeAttributes, Node } from "@tiptap/core";

// serialises to a neutral marker so nothing is tied to a host; RichBody splits on it

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
