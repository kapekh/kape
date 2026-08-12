import { Pencil, X } from "lucide-react";
import { useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useLang } from "#/lib/i18n";
import { type EditTarget, useInlineEdit } from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

/** The only editor chrome on the public site: a switch, and a box for whatever is selected. */
export function InlineEditBar() {
	const { editor, editing, setEditing, target, setTarget } = useInlineEdit();
	if (!editor) return null;
	return (
		<div className="fixed bottom-4 left-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background/95 p-3 text-sm shadow-xl backdrop-blur print:hidden">
			<div className="flex items-center gap-2">
				<Pencil className="size-4 text-muted-foreground" aria-hidden />
				<label
					htmlFor="inline-edit-mode"
					className="flex-1 font-medium text-foreground"
				>
					Edit text on this page
				</label>
				<Switch
					id="inline-edit-mode"
					checked={editing}
					onCheckedChange={setEditing}
				/>
			</div>
			{editing && !target && (
				<p className="mt-2 text-xs text-muted-foreground">
					Click any outlined text to edit it.
				</p>
			)}
			{editing && target && (
				<StringEditor
					key={target.key}
					target={target}
					onClose={() => setTarget(null)}
				/>
			)}
		</div>
	);
}

function StringEditor({
	target,
	onClose,
}: {
	target: EditTarget;
	onClose: () => void;
}) {
	const { lang, languages, strings, stringsFallback, setString } = useLang();
	const stored = strings[target.key];
	// a row in this very language, rather than the default one showing through or
	// the built-in default with no row at all
	const own = stored !== undefined && !stringsFallback.has(target.key);
	const shown = stored ?? target.shown;
	// the box starts empty otherwise, so a save cannot copy English into the Khmer row
	const [value, setValue] = useState(own ? stored : "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const langName =
		languages.find((l) => l.code === lang)?.nativeName ?? lang.toUpperCase();

	async function save() {
		setSaving(true);
		setError(null);
		try {
			const result = await trpcClient.adminSettings.setUiString.mutate({
				key: target.key,
				lang,
				value,
			});
			// an empty value deletes the row, and the shipped default it falls back to
			// is not in the browser
			if (result.reset) {
				window.location.reload();
				return;
			}
			setString(target.key, value.trim());
			onClose();
		} catch (err) {
			setError(saveErrorMessage(err));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="mt-3 border-t border-border pt-3">
			<div className="flex items-center justify-between gap-2">
				<code className="truncate text-xs text-muted-foreground">
					{target.key}
				</code>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close editor"
					className="rounded-full p-1 text-muted-foreground hover:bg-muted"
				>
					<X className="size-4" aria-hidden />
				</button>
			</div>
			{!own && (
				<p className="mt-2 rounded-lg bg-muted px-2 py-1.5 text-xs text-muted-foreground">
					No {langName} text stored, so the page is showing “{shown}”. What you
					save here becomes the {langName} version.
				</p>
			)}
			<Input
				autoFocus
				value={value}
				disabled={saving}
				placeholder={own ? undefined : `${langName}…`}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") save();
					if (e.key === "Escape") onClose();
				}}
				className="mt-2"
				aria-label={`${target.key} (${langName})`}
			/>
			{error && <p className="mt-2 text-xs text-destructive">{error}</p>}
			<div className="mt-2 flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					{value.trim() ? "Saves for everyone." : "Empty resets to the default."}
				</p>
				<Button size="sm" onClick={save} disabled={saving}>
					{saving ? "Saving…" : "Save"}
				</Button>
			</div>
		</div>
	);
}
