import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useId, useState } from "react";

import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

/**
 * The parts every admin list needs and each of the nine had its own version of,
 * or none at all. Deliberately not a whole `<ListPage>` component: folding the
 * nine lists into one is a separate job, and this round would have had to write
 * them twice.
 */

export type ListState = "pending" | "error" | "ready";

/**
 * A list query with the three states it actually has. Before this the lists
 * tracked a `loading` boolean and no `.catch`, so a rejected query left the
 * screen saying "Loading…" for as long as anyone cared to look at it.
 *
 * `load` must be stable — wrap it in `useCallback` at the call site.
 */
export function useListQuery<T>(load: () => Promise<T[]>) {
	const [rows, setRows] = useState<T[]>([]);
	const [state, setState] = useState<ListState>("pending");
	const [error, setError] = useState<unknown>(null);

	const reload = useCallback(() => {
		setState("pending");
		setError(null);
		return load()
			.then((r) => {
				setRows(r);
				setState("ready");
			})
			.catch((e: unknown) => {
				setError(e);
				setState("error");
			});
	}, [load]);

	useEffect(() => {
		reload();
	}, [reload]);

	return { rows, setRows, state, error, reload };
}

/** Pending and error for a list. Renders nothing once the rows are in. */
export function ListStatus({
	state,
	error,
	onRetry,
}: {
	state: ListState;
	error?: unknown;
	onRetry: () => void;
}) {
	if (state === "pending")
		return <p className="text-sm text-muted-foreground">Loading…</p>;
	if (state !== "error") return null;
	return (
		<div
			role="alert"
			className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center"
		>
			<p className="text-sm font-medium text-destructive">
				This list could not be loaded.
			</p>
			<p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
				{saveErrorMessage(error)}
			</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
			>
				Try again
			</button>
		</div>
	);
}

/**
 * What a list says when it holds nothing. Two cases, because they need
 * different answers: nothing exists yet (offer the create action), or nothing
 * matches what was typed (offer to clear it).
 */
export function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
			<p className="font-display text-base font-semibold text-primary">
				{title}
			</p>
			{description && (
				<p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
					{description}
				</p>
			)}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

/**
 * Horizontally scrollable table frame. The old wrapper was `overflow-hidden`,
 * so a table wider than the column clipped the rest with no way to reach it —
 * 70px of a 442px table at 375px wide. `tabIndex` is what lets a keyboard
 * scroll it; a scroll container that only a mouse can move is not reachable.
 * `ActionMenu` positions itself `fixed`, so it still escapes this.
 */
export function TableScroll({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<section
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container has to be focusable or the keyboard cannot reach the columns it hides
			tabIndex={0}
			aria-label={label}
			className="thin-scroll overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
		>
			{children}
		</section>
	);
}

/** Search box over rows already in the browser. No paging, so no server round trip. */
export function ListSearch({
	value,
	onChange,
	label,
	placeholder,
	status,
}: {
	value: string;
	onChange: (next: string) => void;
	label: string;
	placeholder: string;
	/** e.g. "3 of 39" — announced politely as the filter narrows. */
	status?: string;
}) {
	const id = useId();
	return (
		<div className="mb-4 flex flex-wrap items-center gap-3">
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<input
				id={id}
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
			/>
			<output className="text-xs text-muted-foreground">{status}</output>
		</div>
	);
}

/**
 * True when every whitespace-separated word in the query appears in one of the
 * fields. Words rather than the whole string, so "hun sen" finds a row that
 * writes the name the other way round.
 */
export function matchesQuery(
	query: string,
	...fields: (string | number | null | undefined)[]
): boolean {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return true;
	const hay = fields
		.filter((f) => f != null && f !== "")
		.join(" ")
		.toLowerCase();
	return words.every((w) => hay.includes(w));
}

/**
 * Drop the row, run the mutation, and put the list back exactly as it was if
 * the server refuses — with the reason on screen. A refused delete used to look
 * like a successful one until the next reload, which is the worst way to be
 * wrong about whether a record still exists.
 */
export async function removeWithRollback<T>(
	rows: T[],
	setRows: Dispatch<SetStateAction<T[]>>,
	doomed: (row: T) => boolean,
	run: () => Promise<unknown>,
): Promise<boolean> {
	const before = rows;
	setRows(rows.filter((r) => !doomed(r)));
	try {
		await run();
		return true;
	} catch (e) {
		setRows(before);
		toast(saveErrorMessage(e, "delete"), "error");
		return false;
	}
}
