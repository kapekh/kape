import { Check, Pencil, SquarePen } from "lucide-react";

import { useInlineEdit } from "#/lib/inline-edit";
import { InlineEditSurface } from "./InlineEditSurface";
import { Switch } from "./ui/switch";

const modifier = () =>
	typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform)
		? "⌘"
		: "Ctrl";

/** The only editor chrome on the public site: a switch, and what the page is doing. */
export function InlineEditBar() {
	const { editor, editing, setEditing, status, studio, editable } =
		useInlineEdit();
	if (!editor) return null;
	return (
		<div className="fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background/95 p-3 text-sm shadow-xl backdrop-blur print:hidden">
			<div className="flex items-center gap-2">
				<Pencil className="size-4 text-muted-foreground" aria-hidden />
				<label
					htmlFor="inline-edit-mode"
					className="flex-1 font-medium text-foreground"
				>
					Edit this page
				</label>
				<Switch
					id="inline-edit-mode"
					checked={editing}
					onCheckedChange={setEditing}
				/>
			</div>
			{editing && (
				<div className="mt-2 text-xs" aria-live="polite">
					{status.kind === "idle" && (
						<p className="text-muted-foreground">
							{editable
								? "Click any outlined text and type. Enter saves, Esc undoes. The chip at the top of a section changes its background."
								: "Nothing on this page is yours to edit."}
						</p>
					)}
					{status.kind === "editing" && (
						<>
							<p className="font-medium text-foreground">{status.label}</p>
							{status.hint && (
								<p className="mt-1 text-muted-foreground">{status.hint}</p>
							)}
							<p className="mt-1 text-muted-foreground">
								{status.multiline
									? `${modifier()}+Enter saves, Esc undoes.`
									: "Enter saves, Esc undoes. Click away also saves."}
							</p>
						</>
					)}
					{status.kind === "saving" && (
						<p className="text-muted-foreground">Saving {status.label}…</p>
					)}
					{status.kind === "saved" && (
						<p className="flex items-center gap-1.5 font-medium text-foreground">
							<Check className="size-3.5 text-[var(--primary)]" aria-hidden />
							{status.label} saved for everyone.
						</p>
					)}
					{status.kind === "error" && (
						<p className="text-destructive" role="alert">
							{status.message}
						</p>
					)}
				</div>
			)}
			{editing && studio && (
				<a
					href={studio.href}
					className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
				>
					<SquarePen className="size-3.5" aria-hidden />
					Everything else about this {studio.noun}
				</a>
			)}
			<InlineEditSurface />
		</div>
	);
}
