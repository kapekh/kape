import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { hasAdminHint } from "./admin-hint";

const MODE_KEY = "cms_inline_edit";

type Editor = { permissions: string[]; isSuperAdmin: boolean };

export type UiStringTarget = {
	kind: "uiString";
	key: string;
	/** What the page is showing, which for a key with no row at all is the only copy of it. */
	shown: string;
};

/** The entity types `updateField` accepts, which are `translations.entity_type` values. */
const EDITABLE_ENTITIES = ["page", "post", "person", "project"] as const;
export type EditableEntity = (typeof EDITABLE_ENTITIES)[number];

export const isEditableEntity = (v: string): v is EditableEntity =>
	(EDITABLE_ENTITIES as readonly string[]).includes(v);

/**
 * One text field of one record, addressed exactly as `adminPages.updateField`
 * reads it. J04's markers carry the first four attributes; whoever emits the
 * target adds what the page is showing and where that text came from.
 */
export type FieldEditTarget = {
	kind: "field";
	/** So an album, whose rows say `post`, is a `post`. */
	entity: EditableEntity;
	entityId: number;
	/** The language in the URL, which is the one being written. */
	lang: string;
	/** `field:<name>`, `section:<id>:props.<field>` or `section:<id>:props.<items>[<n>].<field>`. */
	target: string;
	/** The source text on the page: a title keeps its `*accent*` asterisks. */
	shown: string;
	/** `shown` is the default language's text because this one stores none. */
	fellBack: boolean;
	/** A textarea rather than a one-line box. A richtext field edits its source. */
	multiline: boolean;
	/** Human name for the field, e.g. "Lead". */
	label: string;
};

/** What the bar is editing. */
export type EditTarget = UiStringTarget | FieldEditTarget;

/** Identifies the box, so selecting another field remounts it with its own value. */
export const targetKey = (t: EditTarget): string =>
	t.kind === "uiString"
		? `uiString:${t.key}`
		: `${t.entity}:${t.entityId}:${t.lang}:${t.target}`;

type Ctx = {
	editor: Editor | null;
	editing: boolean;
	setEditing: (on: boolean) => void;
	may: (area: string) => boolean;
	target: EditTarget | null;
	setTarget: (target: EditTarget | null) => void;
};

const OFF: Ctx = {
	editor: null,
	editing: false,
	setEditing: () => {},
	may: () => false,
	target: null,
	setTarget: () => {},
};

const InlineEditContext = createContext<Ctx | null>(null);

const stored = (key: string): string | null => {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};

export function InlineEditProvider({ children }: { children: ReactNode }) {
	const [editor, setEditor] = useState<Editor | null>(null);
	const [editing, setEditingState] = useState(false);
	const [target, setTarget] = useState<EditTarget | null>(null);

	// after hydration only: every SSR response for a path is cached and prerendered
	// byte-identically, so who is asking cannot reach the server-rendered html
	useEffect(() => {
		if (!hasAdminHint()) return;
		let live = true;
		trpcClient.auth.me
			.query()
			.then((me) => {
				if (!live || !me) return;
				setEditor({
					permissions: me.permissions,
					isSuperAdmin: me.isSuperAdmin,
				});
				setEditingState(stored(MODE_KEY) === "on");
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	}, []);

	const setEditing = useCallback((on: boolean) => {
		setEditingState(on);
		if (!on) setTarget(null);
		try {
			localStorage.setItem(MODE_KEY, on ? "on" : "off");
		} catch {}
	}, []);

	const value = useMemo<Ctx>(
		() => ({
			editor,
			editing: editing && editor !== null,
			setEditing,
			may: (area) =>
				editor !== null &&
				(editor.isSuperAdmin || editor.permissions.includes(area)),
			target,
			setTarget,
		}),
		[editor, editing, setEditing, target],
	);

	return (
		<InlineEditContext.Provider value={value}>
			{children}
		</InlineEditContext.Provider>
	);
}

export function useInlineEdit(): Ctx {
	return useContext(InlineEditContext) ?? OFF;
}
