import type { ChainedCommands } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useEffect, useState } from "react";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { emptyDescriptionList } from "#/lib/richtext/description-list";
import { richTextExtensions } from "#/lib/richtext/extensions";
import { prompt } from "@/components/Dialogs";
import { MediaLibraryDialog } from "./MediaLibraryDialog";

function parseContent(value: string): object | string {
	if (!value) return "";
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

const TABLE_ACTIONS: [string, (c: ChainedCommands) => ChainedCommands][] = [
	["+ Row", (c) => c.addRowAfter()],
	["− Row", (c) => c.deleteRow()],
	["+ Col", (c) => c.addColumnAfter()],
	["− Col", (c) => c.deleteColumn()],
	["Header", (c) => c.toggleHeaderRow()],
	["✕ Table", (c) => c.deleteTable()],
];

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

	const inTable = useEditorState({
		editor,
		selector: ({ editor }) => editor?.isActive("table") ?? false,
	});

	const [imgOpen, setImgOpen] = useState(false);
	const [formMenu, setFormMenu] = useState(false);
	const [forms, setForms] = useState<{ slug: string; title: string }[]>([]);
	useEffect(() => {
		if (formMenu && forms.length === 0) {
			trpcClient.adminForms.list
				.query()
				.then((fs) =>
					setForms(fs.map((f) => ({ slug: f.slug, title: f.title }))),
				)
				.catch(() => {});
		}
	}, [formMenu, forms.length]);
	const btn =
		"px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40";

	return (
		<div className="rounded-lg border border-border bg-background transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/25">
			{editor && (
				<div className="flex flex-wrap gap-1 border-b border-border p-1.5">
					<button
						type="button"
						className={btn}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						B
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						<i>I</i>
					</button>
					<button
						type="button"
						className={btn}
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 2 }).run()
						}
					>
						H2
					</button>
					<button
						type="button"
						className={btn}
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 3 }).run()
						}
					>
						H3
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
					>
						• List
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
					>
						❝
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => {
							void prompt({
								title: "Add link",
								placeholder: "https://…",
								confirmLabel: "Apply",
							}).then((url) => {
								if (url) editor.chain().focus().setLink({ href: url }).run();
								else editor.chain().focus().unsetLink().run();
							});
						}}
					>
						Link
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => setImgOpen(true)}
					>
						🖼 Image
					</button>
					<button
						type="button"
						className={btn}
						onClick={() =>
							editor
								.chain()
								.focus()
								.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
								.run()
						}
					>
						▦ Table
					</button>
					<button
						type="button"
						className={btn}
						onClick={() =>
							editor.chain().focus().insertContent(emptyDescriptionList).run()
						}
					>
						⁝⁝ Terms
					</button>
					{inTable && (
						<span className="flex flex-wrap items-center gap-1 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-1">
							{TABLE_ACTIONS.map(([label, run]) => (
								<button
									key={label}
									type="button"
									className={btn}
									onClick={() => run(editor.chain().focus()).run()}
								>
									{label}
								</button>
							))}
						</span>
					)}
					<span className="relative">
						<button
							type="button"
							className={btn}
							onClick={() => setFormMenu((o) => !o)}
						>
							▤ Form
						</button>
						{formMenu && (
							<div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-lift)]">
								{forms.length === 0 ? (
									<div className="px-2 py-1.5 text-xs text-muted-foreground">
										No forms yet — create one in Forms.
									</div>
								) : (
									forms.map((f) => (
										<button
											key={f.slug}
											type="button"
											className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
											onClick={() => {
												editor
													.chain()
													.focus()
													.insertContent({
														type: "formEmbed",
														attrs: { slug: f.slug },
													})
													.run();
												setFormMenu(false);
											}}
										>
											{f.title}{" "}
											<span className="text-muted-foreground">/{f.slug}</span>
										</button>
									))
								)}
							</div>
						)}
					</span>
					<span className="flex-1" />
					<button
						type="button"
						className={btn}
						onClick={() => editor.chain().focus().undo().run()}
					>
						Undo
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => editor.chain().focus().redo().run()}
					>
						Redo
					</button>
				</div>
			)}

			<EditorContent
				editor={editor}
				className="prose-body px-3 py-2 text-sm [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none"
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
