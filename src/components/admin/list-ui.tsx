import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { inputClass } from "#/components/ui/input.tsx";
import { SkeletonRows } from "#/components/ui/skeleton.tsx";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

/**
 * The parts every admin list needs and each of the nine had its own version of,
 * or none at all. Deliberately not a whole `<ListPage>` component: folding the
 * nine lists into one is a separate job, and this round would have had to write
 * them twice.
 */

/** Lives in `ui/` now so the ten lists are not the only surfaces that can have
 *  one. Re-exported here because those ten import it from this file. */
export { EmptyState } from "#/components/ui/empty-state.tsx";

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
		return (
			<div
				aria-busy="true"
				className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel"
			>
				{/* the shapes are aria-hidden, so the word still has to be said once */}
				<span className="sr-only">Loading…</span>
				<SkeletonRows />
			</div>
		);
	if (state !== "error") return null;
	return (
		<div
			role="alert"
			className="rounded-xl border border-admin-danger/40 bg-admin-danger-soft p-6 text-center"
		>
			<p className="text-sm font-medium text-admin-danger">
				This list could not be loaded.
			</p>
			<p className="mx-auto mt-2 max-w-md text-[13px] text-admin-ink-muted">
				{saveErrorMessage(error)}
			</p>
			<Button
				type="button"
				variant="secondary"
				onClick={onRetry}
				className="mt-4"
			>
				Try again
			</Button>
		</div>
	);
}

/**
 * Horizontally scrollable table frame. The old wrapper was `overflow-hidden`,
 * so a table wider than the column clipped the rest with no way to reach it —
 * 70px of a 442px table at 375px wide. `tabIndex` is what lets a keyboard
 * scroll it; a scroll container that only a mouse can move is not reachable.
 * `ActionMenu` positions itself `fixed`, so it still escapes this.
 *
 * Below `md` a `Table` stacks into cards and there is nothing left to scroll,
 * so the frame drops its border there and lets the cards be the surface.
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
			className="thin-scroll overflow-x-auto rounded-xl border border-admin-border bg-admin-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 max-md:rounded-none max-md:border-0 max-md:bg-transparent"
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
				className={`${inputClass} max-w-xs`}
			/>
			<output className="text-[13px] text-admin-ink-muted">{status}</output>
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
