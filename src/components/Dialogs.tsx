import { useCallback, useEffect, useId, useRef, useState } from "react";

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
};

type Req =
	| {
			kind: "confirm";
			id: number;
			opts: ConfirmOpts;
			resolve: (v: boolean) => void;
	  }
	| {
			kind: "prompt";
			id: number;
			opts: PromptOpts;
			resolve: (v: string | null) => void;
	  };

let counter = 0;
let queue: Req[] = [];
const reqListeners = new Set<(r: Req[]) => void>();
const emit = () => {
	for (const l of reqListeners) l([...queue]);
};

export function confirm(opts: ConfirmOpts | string): Promise<boolean> {
	const o = typeof opts === "string" ? { message: opts } : opts;
	return new Promise((resolve) => {
		queue.push({ kind: "confirm", id: ++counter, opts: o, resolve });
		emit();
	});
}

export function prompt(opts: PromptOpts | string): Promise<string | null> {
	const o = typeof opts === "string" ? { message: opts } : opts;
	return new Promise((resolve) => {
		queue.push({ kind: "prompt", id: ++counter, opts: o, resolve });
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
			{top && <Modal key={top.id} req={top} onFinish={finish} />}
			{ts.length > 0 && (
				<div className="fixed bottom-4 right-4 z-[200] flex w-[min(92vw,22rem)] flex-col gap-2">
					{ts.map((t) => (
						<output
							key={t.id}
							className={`rounded-xl border px-4 py-3 text-sm shadow-[var(--shadow-lift)] animate-[mega-content-in_0.2s_ease-out] ${
								t.kind === "error"
									? "border-destructive/40 bg-destructive/10 text-destructive"
									: t.kind === "success"
										? "border-[var(--palm)]/40 bg-[var(--palm)]/10 text-[var(--palm)]"
										: "border-border bg-card text-foreground"
							}`}
						>
							{t.message}
						</output>
					))}
				</div>
			)}
		</>
	);
}

function Modal({
	req,
	onFinish,
}: {
	req: Req;
	onFinish: (req: Req, value: boolean | string | null) => void;
}) {
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
				aria-label="Cancel"
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
						{o.cancelLabel ?? "Cancel"}
					</button>
					<button
						type="button"
						onClick={accept}
						className={`rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 ${danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
					>
						{o.confirmLabel ?? (isPrompt ? "OK" : "Confirm")}
					</button>
				</div>
			</div>
		</div>
	);
}
