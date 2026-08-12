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

/** What the bar is editing. Only UI strings so far; section and page fields follow. */
export type EditTarget = {
	kind: "uiString";
	key: string;
	/** What the page is showing, which for a key with no row at all is the only copy of it. */
	shown: string;
};

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
