import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useT } from "#/lib/i18n";
import { useModalPanel } from "#/lib/use-modal-panel";

/**
 * In-app replacements for the browser's native dialogs — we never use those.
 * Imperative API so it's a drop-in for the old style: `if (!(await confirm("…")))
 * return;`. Mount <DialogHost/> once (in the root) and call confirm()/prompt()/
 * toast() from anywhere.
 */

type ConfirmOpts = {
	title?: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
};
type PromptOpts = {
	title?: string;
	message?: string;
	placeholder?: string;
	defaultValue?: string;
	confirmLabel?: string;
	cancelLabel?: string;
};

type Req = { id: number; opener: HTMLElement | null } & (
	| { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
	| { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
);

let counter = 0;
let queue: Req[] = [];
const reqListeners = new Set<(r: Req[]) => void>();
const emit = () => {
	for (const l of reqListeners) l([...queue]);
};

// Read at call time, not at mount: a menu item that opens a dialog unmounts
// itself first, so by the time the modal renders `document.activeElement` is
// already BODY and there is nothing left to hand focus back to.
function openerNow(): HTMLElement | null {
	if (typeof document === "undefined") return null;
	const el = document.activeElement;
	return el instanceof HTMLElement && el !== document.body ? el : null;
}

/**
 * Put focus back where the dialog took it from.
 *
 * The opener is often gone by now — confirming a delete removes the row, and
 * the `⋯` button that opened the dialog with it. Falling back to `<main>`
 * rather than letting focus default to BODY is what keeps the next Tab inside
 * the table the row was in, instead of at the top of the document behind the
 * whole sidebar.
 */
function focusMain() {
	const main = document.querySelector("main");
	if (!main) return;
	// -1 so it can take focus programmatically without becoming a tab stop
	if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
	main.focus();
}

function restoreFocus(opener: HTMLElement | null) {
	if (opener?.isConnected) opener.focus();
	else focusMain();

	// The opener usually outlives the dialog by a frame or two and only then
	// goes: confirming a delete resolves as soon as the mutation returns, and the
	// row — with the `⋯` button we just handed focus back to — disappears when
	// the list refetches. The browser drops focus to BODY silently when that
	// happens, so check again once the list has settled. Only ever fires when
	// focus is genuinely nowhere, so it cannot steal it from the user.
	for (const ms of [250, 1000]) {
		setTimeout(() => {
			if (document.activeElement === document.body) focusMain();
		}, ms);
	}
}

export function confirm(opts: ConfirmOpts | string): Promise<boolean> {
	const o = typeof opts === "string" ? { message: opts } : opts;
	return new Promise((resolve) => {
		queue.push({
			kind: "confirm",
			id: ++counter,
			opts: o,
			resolve,
			opener: openerNow(),
		});
		emit();
	});
}

export function prompt(opts: PromptOpts | string): Promise<string | null> {
	const o = typeof opts === "string" ? { message: opts } : opts;
	return new Promise((resolve) => {
		queue.push({
			kind: "prompt",
			id: ++counter,
			opts: o,
			resolve,
			opener: openerNow(),
		});
		emit();
	});
}

/* ---- toasts (replace alert for fire-and-forget notices) ---- */
type ToastKind = "info" | "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };
let toasts: Toast[] = [];
const toastListeners = new Set<(t: Toast[]) => void>();
const emitToasts = () => {
	for (const l of toastListeners) l([...toasts]);
};

export function toast(message: string, kind: ToastKind = "info") {
	const id = ++counter;
	toasts = [...toasts, { id, message, kind }];
	emitToasts();
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
		emitToasts();
	}, 4500);
}

/* ---- host (render once) ---- */
export function DialogHost() {
	const [reqs, setReqs] = useState<Req[]>([]);
	const [ts, setTs] = useState<Toast[]>([]);
	useEffect(() => {
		const rl = (r: Req[]) => setReqs(r);
		const tl = (t: Toast[]) => setTs(t);
		reqListeners.add(rl);
		toastListeners.add(tl);
		return () => {
			reqListeners.delete(rl);
			toastListeners.delete(tl);
		};
	}, []);

	const top = reqs[0];
	function finish(req: Req, value: boolean | string | null) {
		queue = queue.filter((r) => r.id !== req.id);
		emit();
		if (req.kind === "confirm") req.resolve(value as boolean);
		else req.resolve(value as string | null);
	}

	return (
		<>
			{top && (
				<Modal key={top.id} req={top} onFinish={finish} toasts={ts} />
			)}
			{/*
			  The `<output>` itself is the live region (implicit role=status,
			  aria-live=polite) and is mounted from first paint, empty or not. A
			  region that appears in the same frame as its first message is one the
			  screen reader was not watching yet and the message goes unread; the
			  announcement has to land as a text change inside a region already
			  there. Each toast is a plain div inside it, not its own region.

			  z-300 clears the modal's z-150 so a toast raised while a confirm is
			  open is on top of it, not behind.
			*/}
			<output
				className="pointer-events-none fixed bottom-4 right-4 z-[300] flex w-[min(92vw,22rem)] flex-col gap-2"
				// while a dialog is open its `aria-modal` hides everything outside it,
				// so the in-dialog mirror below does the announcing and this copy
				// stays visual-only — otherwise the toast is read twice
				aria-hidden={top ? true : undefined}
			>
				{ts.map((t) => (
					<div
						key={t.id}
						className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-[var(--shadow-lift)] animate-[mega-content-in_0.2s_ease-out] ${
							t.kind === "error"
								? "border-destructive/40 bg-destructive/10 text-destructive"
								: t.kind === "success"
									? "border-[var(--palm)]/40 bg-[var(--palm)]/10 text-[var(--palm)]"
									: "border-border bg-card text-foreground"
						}`}
					>
						{t.message}
					</div>
				))}
			</output>
		</>
	);
}

/**
 * The announcing half of a toast while a dialog is open. Rendered inside the
 * dialog panel, because `aria-modal="true"` takes everything outside it out of
 * the accessibility tree — including the visible toast host. Text only: the
 * visible toast is still the one on screen.
 */
function ToastMirror({ toasts }: { toasts: Toast[] }) {
	return (
		<output className="sr-only">
			{toasts.map((t) => (
				<span key={t.id}>{t.message}</span>
			))}
		</output>
	);
}

function Modal({
	req,
	onFinish,
	toasts,
}: {
	req: Req;
	onFinish: (req: Req, value: boolean | string | null) => void;
	toasts: Toast[];
}) {
	const t = useT();
	const isPrompt = req.kind === "prompt";
	const [value, setValue] = useState(
		isPrompt ? ((req.opts as PromptOpts).defaultValue ?? "") : "",
	);
	const inputRef = useRef<HTMLInputElement>(null);
	const cancel = useCallback(
		() => onFinish(req, isPrompt ? null : false),
		[onFinish, req, isPrompt],
	);
	const accept = useCallback(
		() => onFinish(req, isPrompt ? value : true),
		[onFinish, req, isPrompt, value],
	);

	const panelRef = useModalPanel(cancel);
	const headingId = useId();

	// Covers all four exits at once — Escape, Cancel, Confirm and a backdrop
	// click all reach here by unmounting. Deferred a microtask because
	// `useModalPanel` restores focus in its own cleanup to whatever was active
	// when the panel mounted (BODY, when a menu item opened us), and that runs
	// synchronously during this unmount; the microtask lands after it.
	const opener = req.opener;
	useEffect(
		() => () => {
			queueMicrotask(() => {
				// a queued dialog took over — leave the focus it just placed alone
				if (queue.length === 0) restoreFocus(opener);
			});
		},
		[opener],
	);

	useEffect(() => {
		if (isPrompt) inputRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (
				e.key === "Enter" &&
				(isPrompt || (e.target as HTMLElement)?.tagName !== "TEXTAREA")
			)
				accept();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isPrompt, accept]);

	const o = req.opts as ConfirmOpts & PromptOpts;
	const danger = req.kind === "confirm" && (req.opts as ConfirmOpts).danger;

	return (
		<div className="fixed inset-0 z-[150] grid place-items-center p-4">
			<button
				type="button"
				aria-label={t("dialog.dismiss", "Cancel")}
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={cancel}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				tabIndex={-1}
				aria-labelledby={o.title || o.message ? headingId : undefined}
				className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-[mega-content-in_0.18s_ease-out] focus:outline-none"
			>
				<ToastMirror toasts={toasts} />
				{o.title && (
					<h2
						id={headingId}
						className="font-display text-lg font-semibold text-primary"
					>
						{o.title}
					</h2>
				)}
				{o.message && (
					<p
						id={o.title ? undefined : headingId}
						className={`whitespace-pre-line text-sm text-foreground/85 ${o.title ? "mt-2" : ""}`}
					>
						{o.message}
					</p>
				)}
				{isPrompt && (
					<input
						ref={inputRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder={(req.opts as PromptOpts).placeholder}
						className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
					/>
				)}
				<div className="mt-6 flex justify-end gap-2">
					<button
						type="button"
						onClick={cancel}
						className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/70 hover:bg-muted transition"
					>
						{o.cancelLabel ?? t("dialog.cancel", "Cancel")}
					</button>
					<button
						type="button"
						onClick={accept}
						className={`rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 ${danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
					>
						{o.confirmLabel ??
							(isPrompt ? t("dialog.ok", "OK") : t("dialog.confirm", "Confirm"))}
					</button>
				</div>
			</div>
		</div>
	);
}
