import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { sourceOf } from "#/lib/edit-source";
import { useLang } from "#/lib/i18n";
import {
	type EditTarget,
	rememberVersion,
	useInlineEdit,
	versionOf,
} from "#/lib/inline-edit";
import { saveErrorMessage } from "#/lib/save-error";

const MARKED = "[data-cms-target],[data-cms-ui-string]";

const HEADER_BAND = 96;
const BAR_BAND = 180;

type Open = {
	node: HTMLElement;
	target: EditTarget;
	/** What React rendered, put back before React is allowed to diff again. */
	html: string;
	/** What the node started at, so an untouched node saves nothing. */
	from: string;
};

/** Empty for text this language does not store, so a save cannot copy the
 *  default language's words into it. */
const startValue = (t: EditTarget): string =>
	t.kind === "uiString" ? (t.own ? t.shown : "") : t.fellBack ? "" : t.shown;

// firefox below 136 refuses plaintext-only outright, leaving the node uneditable
const plaintextOnly = (): "plaintext-only" | "true" => {
	if (typeof document === "undefined") return "true";
	const probe = document.createElement("div");
	probe.setAttribute("contenteditable", "plaintext-only");
	return probe.contentEditable === "plaintext-only" ? "plaintext-only" : "true";
};

const caretTo = (node: HTMLElement, at: { x: number; y: number } | null) => {
	const selection = window.getSelection();
	if (!selection) return;
	let range: Range | null = at
		? (document.caretRangeFromPoint?.(at.x, at.y) ?? null)
		: null;
	if (!range) {
		range = document.createRange();
		range.selectNodeContents(node);
		range.collapse(false);
	}
	selection.removeAllRanges();
	selection.addRange(range);
};

/**
 * Editing happens in the page: the marked node itself becomes the box. One
 * delegated listener drives every mark, whichever renderer emitted it, and a
 * renderer only says what its nodes address.
 */
export function InlineEditSurface() {
	const { editing, resolve, setStatus, register, bumpRevision, may } =
		useInlineEdit();
	const { lang, languages, strings, stringsFallback, setString } = useLang();
	const router = useRouter({ warn: false });
	const open = useRef<Open | null>(null);
	const editable = useMemo(plaintextOnly, []);
	// the listeners mount once; this keeps them calling the current save
	const now = useRef({ resolve, setStatus, lang, setString, router });
	now.current = { resolve, setStatus, lang, setString, router };

	const uiStringTarget = useCallback(
		(node: Element): EditTarget | null => {
			const key = node.getAttribute("data-cms-ui-string");
			if (!key) return null;
			// unfilled, so the editor sees the {slots} a translation has to keep
			const shown = node.getAttribute("data-cms-source") ?? "";
			return {
				kind: "uiString",
				key,
				shown,
				own: strings[key] !== undefined && !stringsFallback.has(key),
				label: key,
				multiline: shown.includes("\n"),
			};
		},
		[strings, stringsFallback],
	);
	const mayStrings = may("settings");
	useEffect(() => {
		if (!mayStrings) return;
		return register(uiStringTarget);
	}, [mayStrings, register, uiStringTarget]);

	const end = useCallback(
		(state: Open, restore: boolean) => {
			state.node.removeAttribute("contenteditable");
			state.node.removeAttribute("data-cms-editing");
			state.node.removeAttribute("data-cms-placeholder");
			if (restore) state.node.innerHTML = state.html;
			open.current = null;
			bumpRevision();
		},
		[bumpRevision],
	);

	const begin = useRef<
		(
			node: HTMLElement,
			target: EditTarget,
			at: { x: number; y: number } | null,
			seed?: string,
		) => void
	>(() => {});

	const save = useCallback(async (state: Open, value: string) => {
		const { target } = state;
		const { label } = target;
		const { setStatus, lang, setString, router } = now.current;
		setStatus({ kind: "saving", label });
		state.node.setAttribute("data-cms-saving", "");
		try {
			if (target.kind === "uiString") {
				const result = await trpcClient.adminSettings.setUiString.mutate({
					key: target.key,
					lang,
					value,
				});
				// an empty value deletes the row, and the shipped default it falls back
				// to is not in the browser
				if (result.reset) {
					window.location.reload();
					return;
				}
				setString(target.key, value.trim());
			} else {
				const result = await trpcClient.adminPages.updateField.mutate({
					entity: target.entity,
					entityId: target.entityId,
					lang: target.lang,
					target: target.target,
					value,
					expectedUpdatedAt: versionOf(target),
				});
				rememberVersion(target.entity, target.entityId, result.updatedAt);
				// the text belongs to the route loader: re-running it re-renders this
				// node from what was saved, where a reload would throw away the scroll
				// position and every other edit's place on the page.
				// dropped, not invalidated: the loader reads through ensureQueryData,
				// which hands back whatever is cached however stale, and awaiting a
				// refetch of every cached query is a hang waiting to happen
				router?.options.context.queryClient.removeQueries();
				await router?.invalidate();
			}
			state.node.removeAttribute("data-cms-saving");
			setStatus({ kind: "saved", label });
		} catch (err) {
			state.node.removeAttribute("data-cms-saving");
			// nothing typed is thrown away: the node reopens holding it, and the
			// reason replaces the keyboard hint that reopening puts up
			begin.current(state.node, target, null, value);
			setStatus({ kind: "error", label, message: saveErrorMessage(err) });
		}
	}, []);

	const commit = useCallback(
		(state: Open) => {
			const value = sourceOf(state.node);
			end(state, true);
			if (value === state.from) {
				now.current.setStatus({ kind: "idle" });
				return;
			}
			void save(state, value);
		},
		[end, save],
	);

	const cancel = useCallback(
		(state: Open) => {
			const address = state.node.getAttribute("data-cms-target");
			const key = state.node.getAttribute("data-cms-ui-string");
			end(state, true);
			// the remount replaces the node, so the focus goes to whatever took its place
			const back = () => {
				const selector = address
					? `[data-cms-target="${address}"]`
					: key
						? `[data-cms-ui-string="${key}"]`
						: null;
				const node = selector
					? document.querySelector<HTMLElement>(selector)
					: null;
				(node ?? state.node).focus?.();
			};
			if (typeof requestAnimationFrame === "function")
				requestAnimationFrame(back);
			else back();
			now.current.setStatus({ kind: "idle" });
		},
		[end],
	);

	begin.current = (node, target, at, seed) => {
		const current = open.current;
		if (current) {
			if (current.node === node) return;
			commit(current);
		}
		const from = seed ?? startValue(target);
		const state: Open = { node, target, html: node.innerHTML, from };
		open.current = state;
		node.setAttribute("data-cms-editing", "");
		if (seed !== undefined) node.textContent = seed;
		else if (from === "") node.textContent = "";
		if (from === "")
			node.setAttribute("data-cms-placeholder", `${target.label}…`);
		node.setAttribute("contenteditable", editable);
		node.focus();
		caretTo(node, at);
		// the sticky header and the bar each cover a band of the viewport, and text
		// under either cannot be read while it is typed into
		const box = node.getBoundingClientRect();
		if (box.top < HEADER_BAND || box.bottom > window.innerHeight - BAR_BAND)
			node.scrollIntoView?.({ block: "center", behavior: "smooth" });
		const stored = target.kind === "uiString" ? target.own : !target.fellBack;
		const named = target.kind === "uiString" ? lang : target.lang;
		const langName =
			languages.find((l) => l.code === named)?.nativeName ??
			named.toUpperCase();
		now.current.setStatus({
			kind: "editing",
			label: target.label,
			multiline: target.multiline,
			hint: stored
				? target.kind === "field"
					? target.note
					: undefined
				: `No ${langName} text stored, so the page is showing “${target.shown}”. What you type becomes the ${langName} version.`,
		});
	};

	useEffect(() => {
		if (!editing) return;
		const markOf = (e: Event): HTMLElement | null => {
			const node = (e.target as Element | null)?.closest?.(MARKED);
			return node instanceof HTMLElement ? node : null;
		};

		const onMouseDown = (e: MouseEvent) => {
			if (e.button !== 0) return;
			const node = markOf(e);
			if (!node) {
				if (open.current) commit(open.current);
				return;
			}
			if (open.current?.node === node) return;
			const target = now.current.resolve(node);
			if (!target) return;
			// the marked text often sits inside a link, where a click must edit it
			// rather than navigate away from it
			e.preventDefault();
			e.stopPropagation();
			begin.current(node, target, { x: e.clientX, y: e.clientY });
		};

		// mousedown already opened the node; the click behind it must not reach the link
		const onClick = (e: MouseEvent) => {
			const node = markOf(e);
			if (!node || open.current?.node !== node) return;
			e.preventDefault();
			e.stopPropagation();
		};

		const onKeyDown = (e: KeyboardEvent) => {
			const state = open.current;
			if (state) {
				if (e.key === "Escape") {
					e.preventDefault();
					e.stopPropagation();
					cancel(state);
					return;
				}
				if (e.key !== "Enter") return;
				// a multi-line field keeps Enter for newlines, so it saves on the modifier
				if (state.target.multiline && !(e.metaKey || e.ctrlKey)) return;
				e.preventDefault();
				e.stopPropagation();
				commit(state);
				return;
			}
			if (e.key !== "Enter" && e.key !== " ") return;
			const node = markOf(e);
			if (!node || node !== document.activeElement) return;
			const target = now.current.resolve(node);
			if (!target) return;
			e.preventDefault();
			e.stopPropagation();
			begin.current(node, target, null);
		};

		const onFocusOut = (e: FocusEvent) => {
			const state = open.current;
			if (state && e.target === state.node) commit(state);
		};

		// plaintext-only already strips markup; this covers the browsers that fall
		// back to a rich contenteditable
		const onPaste = (e: ClipboardEvent) => {
			if (!open.current || e.target !== open.current.node) return;
			const text = e.clipboardData?.getData("text/plain") ?? "";
			e.preventDefault();
			document.execCommand("insertText", false, text);
		};

		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			const state = open.current;
			if (!state || sourceOf(state.node) === state.from) return;
			e.preventDefault();
		};

		document.addEventListener("mousedown", onMouseDown, true);
		document.addEventListener("click", onClick, true);
		document.addEventListener("keydown", onKeyDown, true);
		document.addEventListener("focusout", onFocusOut, true);
		document.addEventListener("paste", onPaste, true);
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => {
			document.removeEventListener("mousedown", onMouseDown, true);
			document.removeEventListener("click", onClick, true);
			document.removeEventListener("keydown", onKeyDown, true);
			document.removeEventListener("focusout", onFocusOut, true);
			document.removeEventListener("paste", onPaste, true);
			window.removeEventListener("beforeunload", onBeforeUnload);
			if (open.current) end(open.current, true);
		};
	}, [editing, cancel, commit, end]);

	if (!editing) return null;
	return (
		<style>{`[data-cms-editing]{outline:2px solid var(--primary)!important;outline-offset:3px;border-radius:2px;background:color-mix(in oklab, var(--primary) 10%, transparent);cursor:text}[data-cms-editing]:empty::before{content:attr(data-cms-placeholder);opacity:.45}[data-cms-saving]{opacity:.55;transition:opacity .15s}`}</style>
	);
}
