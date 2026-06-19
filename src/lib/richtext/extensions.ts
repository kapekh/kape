import { Image } from "@tiptap/extension-image";
import { StarterKit } from "@tiptap/starter-kit";

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
];
