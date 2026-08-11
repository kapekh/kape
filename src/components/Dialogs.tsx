import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useT } from "#/lib/i18n";
import { useModalPanel } from "#/lib/use-modal-panel";

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

// read at call time: the opener menu unmounts first, so activeElement is already BODY
function openerNow(): HTMLElement | null {
	if (typeof document === "undefined") return null;
	const el = document.activeElement;
	return el instanceof HTMLElement && el !== document.body ? el : null;
}

// fall back to <main>, not BODY: keeps the next Tab inside the table the row was in
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

	// the opener can vanish when the list refetches, so recheck; only fires when focus is nowhere
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
			{top && <Modal key={top.id} req={top} onFinish={finish} toasts={ts} />}
			{/* <output> mounted from first paint: a region born in the same frame as its message goes unread */}
			<output
				className="pointer-events-none fixed bottom-4 right-4 z-[300] flex w-[min(92vw,22rem)] flex-col gap-2"
				// aria-modal hides this copy; the in-dialog mirror announces, or the toast reads twice
				aria-hidden={top ? true : undefined}
			>
				{ts.map((t) => (
					<div
						key={t.id}
						className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-[var(--shadow-soft)] animate-[mega-content-in_0.2s_ease-out] ${
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

// aria-modal takes the visible toast host out of the a11y tree, so announce from inside
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

	// microtask: useModalPanel restores focus synchronously in its own cleanup first
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
				className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] animate-[mega-content-in_0.18s_ease-out] focus:outline-none"
			>
				<ToastMirror toasts={toasts} />
				{o.title && (
					<h2
						id={headingId}
						className="text-base font-semibold text-foreground"
					>
						{o.title}
					</h2>
				)}
				{o.message && (
					<p
						id={o.title ? undefined : headingId}
						className={`whitespace-pre-line text-sm text-muted-foreground ${o.title ? "mt-2" : ""}`}
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
						className="mt-4 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm transition-colors duration-150 ease-out focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
					/>
				)}
				<div className="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onClick={cancel}
						className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
					>
						{o.cancelLabel ?? t("dialog.cancel", "Cancel")}
					</button>
					<button
						type="button"
						onClick={accept}
						className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors duration-150 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
					>
						{o.confirmLabel ??
							(isPrompt
								? t("dialog.ok", "OK")
								: t("dialog.confirm", "Confirm"))}
					</button>
				</div>
			</div>
		</div>
	);
}
