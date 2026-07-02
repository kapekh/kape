import { Image } from "@tiptap/extension-image";
import { StarterKit } from "@tiptap/starter-kit";

import { FormEmbed } from "./form-node";

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
