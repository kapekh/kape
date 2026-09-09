import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
	/** A row in this very language, rather than the default showing through. */
	own: boolean;
	label: string;
	multiline: boolean;
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
	/** Anything an editor has to know before typing, e.g. that a field is shared. */
	note?: string;
};

/** What the bar is editing. */
export type EditTarget = UiStringTarget | FieldEditTarget;

/** The permission area that governs a record's entity. */
export const ENTITY_AREA: Record<string, string> = {
	page: "pages",
	post: "posts",
	project: "projects",
	person: "people",
};

// what the studio's own form calls each field
const LABELS: Record<string, Record<string, string>> = {
	page: { title: "Title", excerpt: "Brief", body: "Body" },
	post: { title: "Title", excerpt: "Excerpt", body: "Body" },
	project: { name: "Name", summary: "Summary", body: "Body" },
	person: { name: "Name", position: "Position" },
};

// Enter saves these; the rest keep it for newlines and save on the modifier
const ONE_LINE = new Set(["title", "name", "position"]);

// one column for every language, so an editor is told before they retype it
const SHARED_ACROSS_LANGUAGES: Record<string, readonly string[]> = {};

export const fieldLabel = (entity: string, field: string): string =>
	LABELS[entity]?.[field] ?? field;

export const isMultiline = (field: string, shown: string): boolean =>
	!ONE_LINE.has(field) || shown.includes("\n");

export const sharedNote = (
	entity: string,
	field: string,
): string | undefined =>
	SHARED_ACROSS_LANGUAGES[entity]?.includes(field)
		? "One value for every language: what you type here is what every reader sees."
		: undefined;

/** Identifies the box, so selecting another field remounts it with its own value. */
export const targetKey = (t: EditTarget): string =>
	t.kind === "uiString"
		? `uiString:${t.key}`
		: `${t.entity}:${t.entityId}:${t.lang}:${t.target}`;

/** Turns a marked node into what the surface needs to edit it, or null when the
 *  node belongs to another record, another renderer, or a field nobody may save. */
export type EditResolver = (node: Element) => EditTarget | null;

/** What the bar reports while an admin types into the page itself. */
export type EditStatus =
	| { kind: "idle" }
	| { kind: "editing"; label: string; multiline: boolean; hint?: string }
	| { kind: "saving"; label: string }
	// note: it saved, but the page could not repaint itself
	| { kind: "saved"; label: string; note?: string }
	| { kind: "error"; label: string; message: string };

type Ctx = {
	editor: Editor | null;
	editing: boolean;
	setEditing: (on: boolean) => void;
	may: (area: string) => boolean;
	/** A renderer lends the surface its own addressing for as long as it is mounted. */
	register: (resolve: EditResolver) => () => void;
	resolve: EditResolver;
	/** How many renderers have lent theirs: none means nothing here is editable. */
	editable: number;
	status: EditStatus;
	setStatus: (status: EditStatus) => void;
	/**
	 * Bumped whenever an edit ends. Typing in a node replaces the very DOM nodes
	 * React holds a reference to, so the next render would patch text that is no
	 * longer in the document: a renderer keys its output on this and remounts
	 * instead.
	 */
	revision: number;
	bumpRevision: () => void;
	/** Where the whole record is edited, for everything inline editing will not take. */
	studio: StudioLink | null;
	setStudio: (link: StudioLink | null) => void;
};

export type StudioLink = { href: string; noun: string };

const STUDIO_PATH: Record<string, string> = {
	page: "pages",
	post: "posts",
	project: "projects",
	person: "people",
};

/** Publishes where this record is edited in full, for as long as it is on screen. */
export function useStudioLink(
	entity: string | null | undefined,
	entityId: number | null | undefined,
	on: boolean,
) {
	const { setStudio } = useInlineEdit();
	const path = entity ? STUDIO_PATH[entity] : undefined;
	useEffect(() => {
		if (!on || !path || entityId == null) return;
		const link = { href: `/admin/${path}/${entityId}`, noun: entity as string };
		setStudio(link);
		return () => setStudio(null);
	}, [on, path, entityId, entity, setStudio]);
}

const IDLE: EditStatus = { kind: "idle" };

const OFF: Ctx = {
	editor: null,
	editing: false,
	setEditing: () => {},
	may: () => false,
	register: () => () => {},
	resolve: () => null,
	editable: 0,
	status: IDLE,
	setStatus: () => {},
	revision: 0,
	bumpRevision: () => {},
	studio: null,
	setStudio: () => {},
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
	const [status, setStatus] = useState<EditStatus>(IDLE);
	const [revision, setRevision] = useState(0);
	const [studio, setStudio] = useState<StudioLink | null>(null);
	const [editable, setEditable] = useState(0);
	const resolvers = useRef<Set<EditResolver>>(new Set());

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
		if (!on) setStatus(IDLE);
		try {
			localStorage.setItem(MODE_KEY, on ? "on" : "off");
		} catch {}
	}, []);

	const bumpRevision = useCallback(() => setRevision((n) => n + 1), []);

	const register = useCallback((resolve: EditResolver) => {
		resolvers.current.add(resolve);
		setEditable((n) => n + 1);
		return () => {
			resolvers.current.delete(resolve);
			setEditable((n) => n - 1);
		};
	}, []);

	const resolve = useCallback<EditResolver>((node) => {
		for (const fn of resolvers.current) {
			const target = fn(node);
			if (target) return target;
		}
		return null;
	}, []);

	const value = useMemo<Ctx>(
		() => ({
			editor,
			editing: editing && editor !== null,
			setEditing,
			may: (area) =>
				editor !== null &&
				(editor.isSuperAdmin || editor.permissions.includes(area)),
			register,
			resolve,
			editable,
			status,
			setStatus,
			revision,
			bumpRevision,
			studio,
			setStudio,
		}),
		[
			editor,
			editing,
			setEditing,
			register,
			resolve,
			editable,
			status,
			revision,
			bumpRevision,
			studio,
		],
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

/**
 * The version each record was loaded at, so a second editor's save is refused
 * rather than silently overwriting the first. It comes off the payload the page
 * already has, so no record is read twice, and each save replaces it with the
 * version it wrote.
 */
const versions = new Map<string, string | null>();
const versionKey = (entity: string, entityId: number) =>
	`${entity}:${entityId}`;

/** What the page loaded this record at. */
export function rememberVersion(
	entity: string,
	entityId: number,
	updatedAt: string | null,
) {
	versions.set(versionKey(entity, entityId), updatedAt);
}

/** What the page loaded this record at, for anything that saves without a text box. */
export const versionFor = (entity: string, entityId: number): string | null =>
	versions.get(versionKey(entity, entityId)) ?? null;

export const versionOf = (t: FieldEditTarget): string | null =>
	versionFor(t.entity, t.entityId);
