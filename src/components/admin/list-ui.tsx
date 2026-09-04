import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { inputClass } from "#/components/ui/input.tsx";
import { SkeletonRows } from "#/components/ui/skeleton.tsx";
import {
	DragHandle,
	SortableStatus,
	useSortable,
} from "#/components/ui/sortable.tsx";
import { TD, TH } from "#/components/ui/table.tsx";
import { applyOrder, type SortableId } from "#/lib/reorder";
import { saveErrorMessage } from "#/lib/save-error";
import { toast } from "@/components/Dialogs";

/** Lives in `ui/` now so the ten lists are not the only surfaces that can have
 *  one. Re-exported here because those ten import it from this file. */
export { EmptyState } from "#/components/ui/empty-state.tsx";
export { SortableStatus };

export type ListState = "pending" | "error" | "ready";

// load must be stable; three states, not a loading boolean, or a rejected query sits on "Loading…" forever
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
			<p className="text-sm font-medium text-admin-danger-ink">
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

// tabIndex is what lets a keyboard scroll it; ActionMenu is fixed, so it still escapes
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
			className="overflow-x-auto rounded-xl border border-admin-border bg-admin-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus/50 max-md:rounded-none max-md:border-0 max-md:bg-transparent"
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
		// sized, not w-full: w-full left the count no room and it wrapped
		<div className="flex min-w-0 flex-wrap items-center gap-3">
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<input
				id={id}
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={`${inputClass} w-full sm:w-72`}
			/>
			<output className="text-[13px] text-admin-ink-muted">{status}</output>
		</div>
	);
}

// per word, so "hun sen" finds a row that writes the name the other way round
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

// restores the row when the server refuses; a refused delete used to look like a successful one
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

type Grip = ReturnType<
	ReturnType<typeof useSortable<SortableId>>["handleProps"]
>;

/** Drag-to-reorder over a list `useListQuery` holds: the rows come back in the
 *  order being dragged, and a refused save rolls it back and says why. */
export function useListReorder<T, Id extends SortableId>({
	rows,
	id,
	describe,
	disabled = false,
	save,
}: {
	rows: T[];
	/** The key the reorder mutation takes. */
	id: (row: T) => Id;
	describe: (row: T) => string;
	/** Off while a search narrows the list, or a drop would land somewhere else. */
	disabled?: boolean;
	save: (ids: Id[]) => Promise<unknown>;
}) {
	// rows keep arriving in the order they were read in
	const [taken, setTaken] = useState<Id[] | null>(null);
	const here = rows.map(id);
	const byId = new Map(here.map((key, i) => [key, rows[i]]));
	// same slot-keeping rule the server renumbers by
	const ids = taken ? applyOrder(here, taken) : here;

	const { order, itemProps, handleProps, status } = useSortable<Id>({
		ids,
		disabled,
		describe: (key) => {
			const row = byId.get(key);
			return row ? describe(row) : String(key);
		},
		onReorder: async (next) => {
			await save(next);
			setTaken(next);
		},
		onError: (e) => toast(saveErrorMessage(e), "error"),
	});

	const placed = new Set(order);
	const many = order.length > 1;
	return {
		// a row the order has not caught up with still renders
		rows: [
			...order
				.map((key) => byId.get(key))
				.filter((r): r is T => r !== undefined),
			...rows.filter((row) => !placed.has(id(row))),
		],
		status,
		itemProps: (row: T) => itemProps(id(row)),
		/** Null when there is nothing to reorder, which renders no grip. */
		grip: (row: T) => (many ? handleProps(id(row)) : null),
	};
}

/** Header cell for the grip column, so the columns line up. */
export function ReorderHead() {
	return (
		<TH width={44}>
			<span className="sr-only">Reorder</span>
		</TH>
	);
}

/** Added to the class of the row that moves. */
export const dragRow =
	"relative data-[dragging]:bg-admin-accent-soft data-[dragging]:shadow-[var(--shadow-soft)]";

// DragHandle defaults to the public site's tokens
const gripTone =
	"text-admin-ink-muted hover:bg-admin-accent-soft hover:text-admin-ink focus-visible:ring-admin-focus/50";

/** The grip cell: `grip={reorder.grip(row)}`. */
export function ReorderCell({ grip }: { grip: Grip | null }) {
	return (
		<TD className="px-2 max-md:justify-start max-md:px-0">
			{grip ? <DragHandle {...grip} className={gripTone} /> : null}
		</TD>
	);
}

/** Why the grips are off: a drop into a filtered view says nothing about where
 *  the row lands. */
export function ReorderOff({
	what,
	clear = "the search",
}: {
	what: string;
	clear?: string;
}) {
	return (
		<p className="mb-3 text-[13px] text-admin-ink-muted">
			Clear {clear} to drag {what} into a new order.
		</p>
	);
}
