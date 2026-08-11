import type { ChainedCommands } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
	Bold,
	FormInput,
	Heading2,
	Heading3,
	Image as ImageIcon,
	Italic,
	Link2,
	List,
	ListTree,
	Minus,
	Plus,
	Quote,
	Redo2,
	Table as TableIcon,
	Undo2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
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

/**
 * `label` is the accessible name this button already had when it was a
 * typographic glyph, and it is carried over verbatim: an icon is decoration and
 * a name that changes is a name a screen-reader user has to relearn.
 */
const TABLE_ACTIONS: [
	string,
	typeof Plus | null,
	string,
	(c: ChainedCommands) => ChainedCommands,
][] = [
	["+ Row", Plus, "Row", (c) => c.addRowAfter()],
	["− Row", Minus, "Row", (c) => c.deleteRow()],
	["+ Col", Plus, "Col", (c) => c.addColumnAfter()],
	["− Col", Minus, "Col", (c) => c.deleteColumn()],
	["Header", null, "Header", (c) => c.toggleHeaderRow()],
	["✕ Table", X, "Table", (c) => c.deleteTable()],
];

function ToolGroup({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<span className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
			{children}
		</span>
	);
}

function ToolDivider() {
	return (
		<span aria-hidden="true" className="mx-1 h-6 w-px bg-admin-border" />
	);
}

/**
 * Icon-only toolbar button. The icon is hidden from the accessibility tree and
 * `label` is the whole accessible name, so the glyph-to-icon swap is invisible
 * to anything that reads the page rather than looks at it.
 */
function ToolButton({
	label,
	icon: Icon,
	active,
	state = "pressed",
	onClick,
}: {
	label: string;
	icon: typeof Bold;
	active?: boolean;
	state?: "pressed" | "expanded";
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={label}
			{...(active === undefined
				? {}
				: state === "expanded"
					? { "aria-expanded": active }
					: { "aria-pressed": active })}
			onClick={onClick}
			className={
				active
					? "bg-admin-accent-soft text-admin-ink"
					: "text-admin-ink-muted"
			}
		>
			<Icon aria-hidden="true" />
		</Button>
	);
}

/**
 * Tiptap editor. Emits ProseMirror JSON (stringified) via onChange — the same
 * format the server renders with `renderBody`. `immediatelyRender: false` keeps
 * it SSR-safe.
 */
export function RichTextEditor({
	ariaLabelledBy,
	value,
	onChange,
}: {
	/**
	 * Id of the caption naming this editor. A contenteditable is not a labelable
	 * element, so `<label for>` resolves to it and still names nothing.
	 */
	ariaLabelledBy?: string;
	value: string;
	onChange: (json: string) => void;
}) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: richTextExtensions,
		content: parseContent(value),
		editorProps: {
			attributes: {
				role: "textbox",
				"aria-multiline": "true",
				...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
			},
		},
		onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
	});

	const marks = useEditorState({
		editor,
		selector: ({ editor }) => ({
			bold: editor?.isActive("bold") ?? false,
			italic: editor?.isActive("italic") ?? false,
			h2: editor?.isActive("heading", { level: 2 }) ?? false,
			h3: editor?.isActive("heading", { level: 3 }) ?? false,
			bulletList: editor?.isActive("bulletList") ?? false,
			blockquote: editor?.isActive("blockquote") ?? false,
			link: editor?.isActive("link") ?? false,
			table: editor?.isActive("table") ?? false,
		}),
	});
	const inTable = marks?.table ?? false;

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

	return (
		<div className="rounded-xl border border-admin-border bg-admin-panel transition-colors duration-150 ease-out focus-within:border-admin-accent focus-within:ring-2 focus-within:ring-admin-focus/40">
			{editor ? (
				<div className="flex flex-wrap items-center gap-1 border-b border-admin-border p-2">
					<ToolGroup>
						<ToolButton
							label="B"
							icon={Bold}
							active={marks?.bold}
							onClick={() => editor.chain().focus().toggleBold().run()}
						/>
						<ToolButton
							label="I"
							icon={Italic}
							active={marks?.italic}
							onClick={() => editor.chain().focus().toggleItalic().run()}
						/>
					</ToolGroup>
					<ToolDivider />
					<ToolGroup>
						<ToolButton
							label="H2"
							icon={Heading2}
							active={marks?.h2}
							onClick={() =>
								editor.chain().focus().toggleHeading({ level: 2 }).run()
							}
						/>
						<ToolButton
							label="H3"
							icon={Heading3}
							active={marks?.h3}
							onClick={() =>
								editor.chain().focus().toggleHeading({ level: 3 }).run()
							}
						/>
						<ToolButton
							label="• List"
							icon={List}
							active={marks?.bulletList}
							onClick={() => editor.chain().focus().toggleBulletList().run()}
						/>
						<ToolButton
							label="❝"
							icon={Quote}
							active={marks?.blockquote}
							onClick={() => editor.chain().focus().toggleBlockquote().run()}
						/>
					</ToolGroup>
					<ToolDivider />
					<ToolGroup>
						<ToolButton
							label="Link"
							icon={Link2}
							active={marks?.link}
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
						/>
						<ToolButton
							label="🖼 Image"
							icon={ImageIcon}
							onClick={() => setImgOpen(true)}
						/>
						<ToolButton
							label="▦ Table"
							icon={TableIcon}
							onClick={() =>
								editor
									.chain()
									.focus()
									.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
									.run()
							}
						/>
						<ToolButton
							label="⁝⁝ Terms"
							icon={ListTree}
							onClick={() =>
								editor.chain().focus().insertContent(emptyDescriptionList).run()
							}
						/>
						{inTable && (
							<span className="flex flex-wrap items-center gap-1 rounded-lg border border-admin-accent/40 bg-admin-accent-soft px-1 py-1">
								{TABLE_ACTIONS.map(([label, Icon, text, run]) => (
									<Button
										key={label}
										type="button"
										variant="ghost"
										size="sm"
										aria-label={label}
										className="text-admin-ink-muted"
										onClick={() => run(editor.chain().focus()).run()}
									>
										{Icon ? <Icon aria-hidden="true" /> : null}
										{text}
									</Button>
								))}
							</span>
						)}
						<span className="relative">
							<ToolButton
								label="▤ Form"
								icon={FormInput}
								active={formMenu}
								state="expanded"
								onClick={() => setFormMenu((o) => !o)}
							/>
							{formMenu && (
								<div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-xl border border-admin-border bg-admin-panel-raised p-1 shadow-[var(--shadow-lift)]">
									{forms.length === 0 ? (
										<p className="px-3 py-2 text-[13px] text-admin-ink-muted">
											No forms yet. Create one under Forms, then embed it here.
										</p>
									) : (
										forms.map((f) => (
											<button
												key={f.slug}
												type="button"
												className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-admin-ink transition-colors duration-150 ease-out hover:bg-admin-accent-soft"
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
												<span className="text-admin-ink-muted">/{f.slug}</span>
											</button>
										))
									)}
								</div>
							)}
						</span>
					</ToolGroup>
					{/* ml-auto not flex-1: a spacer eats a whole row once the bar wraps */}
					<ToolGroup className="ml-auto">
						<ToolButton
							label="Undo"
							icon={Undo2}
							onClick={() => editor.chain().focus().undo().run()}
						/>
						<ToolButton
							label="Redo"
							icon={Redo2}
							onClick={() => editor.chain().focus().redo().run()}
						/>
					</ToolGroup>
				</div>
			) : (
				<div className="flex items-center gap-1 border-b border-admin-border p-2">
					<span className="sr-only">Loading the editor…</span>
					<Skeleton className="size-9" />
					<Skeleton className="size-9" />
					<ToolDivider />
					<Skeleton className="size-9" />
					<Skeleton className="size-9" />
					<Skeleton className="size-9" />
				</div>
			)}

			<EditorContent
				editor={editor}
				className="prose-body px-4 py-3 text-sm [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none"
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
