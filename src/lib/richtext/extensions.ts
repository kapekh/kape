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

/**
 * The editor renders tables through prosemirror-tables' own node view, so the
 * scroll container below only exists in server-rendered output — which is the
 * only place a narrow viewport can overflow.
 */
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

/**
 * The authoritative rich-text extension list.
 *
 * Shared by BOTH the admin editor (Phase 6, `@tiptap/react`) and the server
 * renderer (`renderBody`), so stored ProseMirror JSON always renders the same
 * way it was authored. Changing this list changes how content renders — keep it
 * the single source of truth.
 *
 * StarterKit (v3) already includes Link; Image is added separately. Link is
 * restricted to safe protocols as a first line of XSS defense.
 */
export const richTextExtensions = [
	StarterKit.configure({
		link: {
			openOnClick: false,
			protocols: ["http", "https", "mailto"],
			HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
		},
	}),
	Image,
	FormEmbed,
	ResponsiveTable.configure({
		HTMLAttributes: { class: "w-full min-w-[32rem] border-collapse text-sm" },
	}),
	TableRow,
	TableHeader.configure({
		HTMLAttributes: {
			class:
				"border border-border bg-secondary/10 px-4 py-3 text-left align-top font-semibold text-secondary",
		},
	}),
	TableCell.configure({
		HTMLAttributes: { class: "border border-border px-4 py-3 align-top" },
	}),
	DescriptionList,
	DescriptionTerm,
	DescriptionDetails,
];

/**
 * Restricted extension set for **untrusted** input (public form `richtext`
 * answers). Text formatting + links only — no Image and no FormEmbed, so a
 * respondent can't embed images or other forms into a submission. Rendering
 * unknown nodes through this allow-list simply drops them.
 */
export const basicRichTextExtensions = [
	StarterKit.configure({
		link: {
			openOnClick: false,
			protocols: ["http", "https", "mailto"],
			HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
		},
	}),
];
