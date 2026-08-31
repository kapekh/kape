import { mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import {
	Table,
	TableCell,
	TableHeader,
	TableRow,
} from "@tiptap/extension-table";
import { StarterKit } from "@tiptap/starter-kit";

import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "./description-list";
import { FormEmbed } from "./form-node";

// the editor uses prosemirror-tables' own node view, so this scroll container only exists server-side
const ResponsiveTable = Table.extend({
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			{ class: "my-6 overflow-x-auto rounded-xl border border-border" },
			[
				"table",
				mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
				["tbody", 0],
			],
		];
	},
});

export const IMAGE_ALIGNS = ["left", "right"] as const;
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];

// data attribute, not a utility class: the stored HTML is styled by .prose-body, which the reader and the editor share
const AlignedImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			align: {
				default: null,
				parseHTML: (el: HTMLElement) => el.getAttribute("data-align"),
				renderHTML: (attrs: Record<string, unknown>) =>
					IMAGE_ALIGNS.includes(attrs.align as ImageAlign)
						? { "data-align": attrs.align as string }
						: {},
			},
		};
	},
});

// one list for the editor and the server renderer, or stored JSON stops rendering the way it was authored; link protocols are restricted as XSS defence
export const richTextExtensions = [
	StarterKit.configure({
		link: {
			openOnClick: false,
			protocols: ["http", "https", "mailto"],
			HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
		},
	}),
	AlignedImage,
	FormEmbed,
	ResponsiveTable.configure({
		HTMLAttributes: { class: "w-full min-w-[32rem] border-collapse text-sm" },
	}),
	TableRow,
	TableHeader.configure({
		HTMLAttributes: {
			class:
				"border border-border bg-secondary/10 px-4 py-3 text-left align-top font-semibold text-secondary-ink",
		},
	}),
	TableCell.configure({
		HTMLAttributes: { class: "border border-border px-4 py-3 align-top" },
	}),
	DescriptionList,
	DescriptionTerm,
	DescriptionDetails,
];

// untrusted input: no Image and no FormEmbed, and unknown nodes are dropped
export const basicRichTextExtensions = [
	StarterKit.configure({
		link: {
			openOnClick: false,
			protocols: ["http", "https", "mailto"],
			HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
		},
	}),
];
