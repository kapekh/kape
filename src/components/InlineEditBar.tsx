import { Pencil, X } from "lucide-react";
import { useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useLang } from "#/lib/i18n";
import { DEFAULT_LANG } from "#/lib/i18n-config";
import {
	type FieldEditTarget,
	targetKey,
	type UiStringTarget,
	useInlineEdit,
} from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

/** The only editor chrome on the public site: a switch, and a box for whatever is selected. */
export function InlineEditBar() {
	const { editor, editing, setEditing, target, setTarget } = useInlineEdit();
	if (!editor) return null;
	const close = () => setTarget(null);
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
			{editing &&
				target &&
				(target.kind === "uiString" ? (
					<StringEditor
						key={targetKey(target)}
						target={target}
						onClose={close}
					/>
				) : (
					<FieldEditor
						key={targetKey(target)}
						target={target}
						onClose={close}
					/>
				))}
		</div>
	);
}

function EditorHead({
	address,
	onClose,
}: {
	address: string;
	onClose: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<code className="truncate text-xs text-muted-foreground">{address}</code>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close editor"
				className="rounded-full p-1 text-muted-foreground hover:bg-muted"
			>
				<X className="size-4" aria-hidden />
			</button>
		</div>
	);
}

/** Says the box is empty on purpose, and what the page is showing instead. */
function FallbackNote({
	langName,
	shown,
}: {
	langName: string;
	shown: string;
}) {
	return (
		<p className="mt-2 rounded-lg bg-muted px-2 py-1.5 text-xs text-muted-foreground">
			No {langName} text stored, so the page is showing “{shown}”. What you save
			here becomes the {langName} version.
		</p>
	);
}

function useLangName(lang: string): string {
	const { languages } = useLang();
	return (
		languages.find((l) => l.code === lang)?.nativeName ?? lang.toUpperCase()
	);
}

function StringEditor({
	target,
	onClose,
}: {
	target: UiStringTarget;
	onClose: () => void;
}) {
	const { lang, strings, stringsFallback, setString } = useLang();
	const stored = strings[target.key];
	// a row in this very language, rather than the default one showing through or
	// the built-in default with no row at all
	const own = stored !== undefined && !stringsFallback.has(target.key);
	const shown = stored ?? target.shown;
	// the box starts empty otherwise, so a save cannot copy English into the Khmer row
	const [value, setValue] = useState(own ? stored : "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const langName = useLangName(lang);

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
			<EditorHead address={target.key} onClose={onClose} />
			{!own && <FallbackNote langName={langName} shown={shown} />}
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
					{value.trim()
						? "Saves for everyone."
						: "Empty resets to the default."}
				</p>
				<Button size="sm" onClick={save} disabled={saving}>
					{saving ? "Saving…" : "Save"}
				</Button>
			</div>
		</div>
	);
}

/**
 * The version each record was loaded at, so a second editor's save is refused
 * rather than silently overwriting the first. It comes off the payload the page
 * already has, so no record is read twice, and each save replaces it with the
 * version it wrote.
 */
const versions = new Map<string, string | null>();
const key = (entity: string, entityId: number) => `${entity}:${entityId}`;

/** What the page loaded this record at. */
export function rememberVersion(
	entity: string,
	entityId: number,
	updatedAt: string | null,
) {
	versions.set(key(entity, entityId), updatedAt);
}

const versionOf = (t: FieldEditTarget): string | null =>
	versions.get(key(t.entity, t.entityId)) ?? null;

function FieldEditor({
	target,
	onClose,
}: {
	target: FieldEditTarget;
	onClose: () => void;
}) {
	// the box opens empty on a fallen-back field, so saving cannot copy the
	// default language's text into this one
	const [value, setValue] = useState(target.fellBack ? "" : target.shown);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// read during render, before the box takes the focus away
	const [openedFrom] = useState(() =>
		typeof document === "undefined" ? null : document.activeElement,
	);
	const langName = useLangName(target.lang);
	const defaultName = useLangName(DEFAULT_LANG);

	function close() {
		onClose();
		if (openedFrom instanceof HTMLElement) openedFrom.focus();
	}

	async function save() {
		setSaving(true);
		setError(null);
		try {
			const result = await trpcClient.adminPages.updateField.mutate({
				entity: target.entity,
				entityId: target.entityId,
				lang: target.lang,
				target: target.target,
				value,
				expectedUpdatedAt: versionOf(target),
			});
			rememberVersion(target.entity, target.entityId, result.updatedAt);
			// the section text belongs to the route loader, not to this component
			window.location.reload();
		} catch (err) {
			setError(saveErrorMessage(err));
			setSaving(false);
		}
	}

	const Box = target.multiline ? Textarea : Input;
	const item = target.target.includes("[");
	return (
		<div className="mt-3 border-t border-border pt-3">
			<EditorHead address={target.target} onClose={close} />
			{target.fellBack && (
				<FallbackNote langName={langName} shown={target.shown} />
			)}
			<Box
				autoFocus
				value={value}
				disabled={saving}
				placeholder={target.fellBack ? `${langName}…` : undefined}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					// a textarea keeps Enter for newlines, so it saves on the modifier
					if (
						e.key === "Enter" &&
						(!target.multiline || e.metaKey || e.ctrlKey)
					)
						save();
					if (e.key === "Escape") close();
				}}
				className="mt-2"
				aria-label={`${target.label} (${langName})`}
			/>
			{error && <p className="mt-2 text-xs text-destructive">{error}</p>}
			<div className="mt-2 flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					{value.trim()
						? "Saves for everyone."
						: item
							? "Empty leaves this blank."
							: target.lang === DEFAULT_LANG
								? "Empty clears this text."
								: `Empty falls back to ${defaultName}.`}
				</p>
				<Button size="sm" onClick={save} disabled={saving}>
					{saving ? "Saving…" : "Save"}
				</Button>
			</div>
		</div>
	);
}
