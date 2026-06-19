import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";

import { richTextExtensions } from "#/lib/richtext/extensions";
import { MediaLibraryDialog } from "./MediaLibraryDialog";

function parseContent(value: string): object | string {
	if (!value) return "";
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

/**
 * Tiptap editor. Emits ProseMirror JSON (stringified) via onChange — the same
 * format the server renders with `renderBody`. `immediatelyRender: false` keeps
 * it SSR-safe.
 */
export function RichTextEditor({
	value,
	onChange,
}: {
	value: string;
	onChange: (json: string) => void;
}) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: richTextExtensions,
		content: parseContent(value),
		onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
	});

	const [imgOpen, setImgOpen] = useState(false);
	const btn = "px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40";

	return (
		<div className="rounded-lg border border-border bg-background transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/25">
			{editor && (
				<div className="flex flex-wrap gap-1 border-b border-border p-1.5">
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</button>
					<button
						type="button"
						className={btn}
						onClick={() => {
							const url = window.prompt("Link URL");
							if (url) editor.chain().focus().setLink({ href: url }).run();
							else editor.chain().focus().unsetLink().run();
						}}
					>
						Link
					</button>
					<button type="button" className={btn} onClick={() => setImgOpen(true)}>🖼 Image</button>
					<span className="flex-1" />
					<button type="button" className={btn} onClick={() => editor.chain().focus().undo().run()}>Undo</button>
					<button type="button" className={btn} onClick={() => editor.chain().focus().redo().run()}>Redo</button>
				</div>
			)}

			<EditorContent
				editor={editor}
				className="prose-kape px-3 py-2 text-sm [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none"
			/>

			<MediaLibraryDialog
				open={imgOpen}
				onClose={() => setImgOpen(false)}
				kind="image"
				accept="image/*"
				onSelect={(m) => {
					if (m.url) editor?.chain().focus().setImage({ src: m.url }).run();
					setImgOpen(false);
				}}
			/>
		</div>
	);
}
