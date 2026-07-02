import { EditorContent, useEditor } from "@tiptap/react";

import { prompt } from "@/components/Dialogs";
import { basicRichTextExtensions } from "#/lib/richtext/extensions";

function parseContent(value: string): object | string {
	if (!value) return "";
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

/**
 * Lightweight Tiptap editor for **public** form answers — text formatting and
 * links only (no images, no media library, no form embeds). Emits stringified
 * ProseMirror JSON; the server renders it through the restricted allow-list
 * (`renderBasicRichText`), so untrusted input can't inject images/embeds.
 */
export function PublicRichText({ value, onChange, km }: { value: string; onChange: (json: string) => void; km?: boolean }) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: basicRichTextExtensions,
		content: parseContent(value),
		onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
	});

	const btn = "px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40";

	return (
		<div className="rounded-xl border border-border bg-background transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/25">
			{editor && (
				<div className="flex flex-wrap gap-1 border-b border-border p-1.5">
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</button>
					<button
						type="button"
						className={btn}
						onClick={() => {
							void prompt({ title: "Add link", placeholder: "https://…", confirmLabel: "Apply" }).then((url) => {
								if (url && url.trim()) editor.chain().focus().setLink({ href: url.trim() }).run();
								else editor.chain().focus().unsetLink().run();
							});
						}}
					>
						Link
					</button>
				</div>
			)}
			<EditorContent editor={editor} className={`prose-kape px-3 py-2 text-sm [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none ${km ? "font-khmer" : ""}`} />
		</div>
	);
}
