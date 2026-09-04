import { GripVertical } from "lucide-react";
import {
	type ComponentProps,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	applyOrder,
	moveItem,
	type SortableId,
	sameOrder,
} from "#/lib/reorder";
import { cn } from "#/lib/utils";

// every admin mutation clears the whole render cache, so a held arrow key has to
// land as one write
const BURST = 400;
const EDGE = 64;
const EDGE_STEP = 14;
const TRAVEL = 4;

type Box = Pick<DOMRect, "top" | "bottom" | "left" | "right">;

// the midpoint, not rect overlap: with unequal heights a swap can leave the
// pointer inside the neighbour's new rect, which overlap swaps straight back
function nextSlot({
	from,
	count,
	boxAt,
	x,
	y,
	axis,
}: {
	from: number;
	count: number;
	boxAt: (slot: number) => Box | null | undefined;
	x: number;
	y: number;
	axis: "list" | "grid";
}): number {
	const passed = (slot: number) => {
		const box = boxAt(slot);
		if (!box) return false;
		// a wrapping grid needs both axes: a neighbour beside it is passed across
		const beside = axis === "grid" && y >= box.top && y <= box.bottom;
		const point = beside ? x : y;
		const middle = beside
			? (box.left + box.right) / 2
			: (box.top + box.bottom) / 2;
		return slot > from ? point > middle : point < middle;
	};
	// the furthest one passed, so a fast drag lands in one move and says so once
	for (let slot = count - 1; slot > from; slot--) if (passed(slot)) return slot;
	for (let slot = 0; slot < from; slot++) if (passed(slot)) return slot;
	return from;
}

type Options<Id extends SortableId> = {
	/** The order as the owner has it. */
	ids: Id[];
	/** Persist the new order. Reject to have the visible order roll back. */
	onReorder: (ids: Id[]) => void | Promise<void>;
	/** How the items are laid out: a column, or a wrapping grid. */
	axis?: "list" | "grid";
	/** What to call an item in a label or an announcement. */
	describe: (id: Id) => string;
	/** Off while a filter narrows the list, or the editor may not save. */
	disabled?: boolean;
	/** ms a burst of arrow keys is gathered for. 0 writes each press, which is
	 *  what an array in form state wants: no round trip to wait on. */
	burst?: number;
	/** Reported when a save is refused; the announcement happens either way. */
	onError?: (err: unknown) => void;
};

// pointer events, not html5 dnd: one path for mouse, touch and pen, and ios
// safari has no html5 dragging
export function useSortable<Id extends SortableId>({
	ids,
	onReorder,
	axis = "list",
	describe,
	disabled = false,
	burst = BURST,
	onError,
}: Options<Id>) {
	const [order, setOrder] = useState<Id[]>(ids);
	const [dragging, setDragging] = useState<Id | null>(null);
	const [status, setStatus] = useState("");
	const [writing, setWriting] = useState(0);
	const [waiting, setWaiting] = useState(false);

	// the listeners mount once; this keeps them reading the current props
	const now = useRef({ axis, burst, describe, disabled, onReorder, onError });
	now.current = { axis, burst, describe, disabled, onReorder, onError };

	const nodes = useRef(new Map<Id, HTMLElement>());
	const live = useRef(order);
	const held = useRef<Id | null>(null);
	const at = useRef({ x: 0, y: 0 });
	const press = useRef({ x: 0, y: 0 });
	const moved = useRef(false);
	const frame = useRef<number | null>(null);
	const grip = useRef<{ el: Element; pointerId: number } | null>(null);
	const started = useRef<Id[] | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const queued = useRef<{ next: Id[]; back: Id[] } | null>(null);

	const show = useCallback((next: Id[]) => {
		live.current = next;
		setOrder(next);
	}, []);

	const announce = useCallback((id: Id, list: Id[]) => {
		setStatus(
			`${now.current.describe(id)} moved to ${list.indexOf(id) + 1} of ${list.length}.`,
		);
	}, []);

	const commit = useCallback(
		async (next: Id[], back: Id[]) => {
			setWriting((n) => n + 1);
			try {
				await now.current.onReorder(next);
			} catch (err) {
				show(back);
				setStatus("That order was not saved, so the list is back as it was.");
				now.current.onError?.(err);
			} finally {
				setWriting((n) => n - 1);
			}
		},
		[show],
	);

	const flush = useCallback(() => {
		if (timer.current !== null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		const job = queued.current;
		queued.current = null;
		setWaiting(false);
		if (job) void commit(job.next, job.back);
	}, [commit]);

	// going away must not swallow the keypress the debounce is still holding
	useEffect(() => () => flush(), [flush]);

	useEffect(() => {
		// a move landed after this render, so its effect knows a stale order
		if (live.current !== order) return;
		// an owner that has not caught up yet would revert an optimistic order
		if (dragging !== null || writing > 0 || waiting) return;
		if (!sameOrder(ids, live.current)) show(ids);
	}, [dragging, ids, order, show, waiting, writing]);

	const onKeyDown = useCallback(
		(id: Id, e: ReactKeyboardEvent<HTMLElement>) => {
			if (now.current.disabled || held.current !== null) return;
			const list = live.current;
			const i = list.indexOf(id);
			if (i < 0 || list.length < 2) return;
			let to = i;
			switch (e.key) {
				case "ArrowUp":
				case "ArrowLeft":
					to = i - 1;
					break;
				case "ArrowDown":
				case "ArrowRight":
					to = i + 1;
					break;
				case "Home":
					to = 0;
					break;
				case "End":
					to = list.length - 1;
					break;
				default:
					return;
			}
			e.preventDefault();
			const next = moveItem(list, i, to);
			if (next === list) return;
			show(next);
			announce(id, next);
			// a burst of presses is one write, rolling back to where the burst began
			const back = queued.current?.back ?? list;
			if (timer.current !== null) clearTimeout(timer.current);
			if (now.current.burst <= 0) {
				queued.current = null;
				setWaiting(false);
				void commit(next, back);
				return;
			}
			queued.current = { next, back };
			setWaiting(true);
			timer.current = setTimeout(flush, now.current.burst);
		},
		[announce, commit, flush, show],
	);

	const onPointerDown = useCallback(
		(id: Id, e: ReactPointerEvent<HTMLElement>) => {
			if (now.current.disabled || live.current.length < 2) return;
			// a second pointer must not take the drag off the first, which still holds
			// the capture nobody would then release
			if (held.current !== null) return;
			if (e.button !== 0 || !e.isPrimary) return;
			// preventDefault stops the text selection, and would stop the focus with it
			e.preventDefault();
			e.currentTarget.focus();
			// the drag supersedes a keyboard burst nobody has written yet, and takes over
			// the order that burst began at so a refusal still rolls all the way back
			const pending = queued.current;
			if (timer.current !== null) {
				clearTimeout(timer.current);
				timer.current = null;
			}
			queued.current = null;
			setWaiting(false);
			started.current = pending?.back ?? live.current;
			at.current = { x: e.clientX, y: e.clientY };
			press.current = { x: e.clientX, y: e.clientY };
			moved.current = false;
			const el = e.currentTarget;
			el.setPointerCapture?.(e.pointerId);
			grip.current = { el, pointerId: e.pointerId };
			held.current = id;
			setDragging(id);
		},
		[],
	);

	useEffect(() => {
		if (dragging === null) return;

		const move = (e: PointerEvent) => {
			at.current = { x: e.clientX, y: e.clientY };
			if (
				Math.abs(e.clientX - press.current.x) > TRAVEL ||
				Math.abs(e.clientY - press.current.y) > TRAVEL
			)
				moved.current = true;
		};

		const step = () => {
			frame.current = requestAnimationFrame(step);
			const { x, y } = at.current;
			// a long list has to be draggable past its own fold, but a still finger
			// must not scroll the page out from under the press
			if (moved.current) {
				if (y < EDGE) window.scrollBy(0, -EDGE_STEP);
				else if (y > window.innerHeight - EDGE) window.scrollBy(0, EDGE_STEP);
			}
			const list = live.current;
			const i = list.indexOf(dragging);
			if (i < 0) return;
			const to = nextSlot({
				from: i,
				count: list.length,
				boxAt: (slot) => nodes.current.get(list[slot])?.getBoundingClientRect(),
				x,
				y,
				axis: now.current.axis,
			});
			const next = moveItem(list, i, to);
			if (next === list) return;
			show(next);
			announce(dragging, next);
		};

		const stop = (save: boolean) => {
			const before = started.current;
			started.current = null;
			held.current = null;
			setDragging(null);
			if (!save) {
				if (before) show(before);
				return;
			}
			if (before && !sameOrder(before, live.current))
				void commit(live.current, before);
		};

		const up = () => stop(true);
		const cancelled = () => stop(false);
		const key = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			e.preventDefault();
			stop(false);
		};

		frame.current = requestAnimationFrame(step);
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", cancelled);
		window.addEventListener("keydown", key);
		document.body.style.userSelect = "none";

		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", cancelled);
			window.removeEventListener("keydown", key);
			if (frame.current !== null) {
				cancelAnimationFrame(frame.current);
				frame.current = null;
			}
			const grabbed = grip.current;
			grip.current = null;
			if (grabbed?.el.hasPointerCapture?.(grabbed.pointerId))
				grabbed.el.releasePointerCapture(grabbed.pointerId);
			held.current = null;
			document.body.style.userSelect = "";
		};
	}, [announce, commit, dragging, show]);

	const itemProps = useCallback(
		(id: Id) => ({
			// measured by rect, never looked up by selector
			ref: (el: HTMLElement | null) => {
				if (el) nodes.current.set(id, el);
				else nodes.current.delete(id);
			},
			"data-sortable-item": String(id),
			"data-dragging": dragging === id ? "" : undefined,
		}),
		[dragging],
	);

	const handleProps = useCallback(
		(id: Id) => ({
			"aria-label": `Reorder ${describe(id)}, ${order.indexOf(id) + 1} of ${order.length}. Drag, or use the arrow keys.`,
			"data-dragging": dragging === id ? "" : undefined,
			disabled: disabled || order.length < 2,
			onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => onKeyDown(id, e),
			onPointerDown: (e: ReactPointerEvent<HTMLElement>) =>
				onPointerDown(id, e),
			// the rest of the page still scrolls under a finger
			style: { touchAction: "none" as const },
		}),
		[describe, disabled, dragging, onKeyDown, onPointerDown, order],
	);

	return { order, dragging, itemProps, handleProps, status };
}

/**
 * The same drag over an array the surrounding form holds: `onReorder` is handed
 * the array in its new order and the form saves it as it saves everything else.
 * Render `items` — during a drag they are in the order being dragged.
 */
export function useSortableArray<T, Id extends SortableId>({
	items,
	id,
	describe,
	onReorder,
	axis,
	disabled,
}: {
	items: T[];
	/** Stable across an edit: an index would follow the slot, not the item. */
	id: (item: T) => Id;
	describe: (item: T) => string;
	onReorder: (items: T[]) => void;
	axis?: "list" | "grid";
	disabled?: boolean;
}) {
	const ids = items.map(id);
	const byId = new Map(ids.map((key, i) => [key, items[i]]));
	const { order, itemProps, handleProps, status } = useSortable<Id>({
		ids,
		axis,
		disabled,
		burst: 0,
		describe: (key) => {
			const item = byId.get(key);
			return item ? describe(item) : String(key);
		},
		onReorder: (next) =>
			onReorder(
				applyOrder(ids, next)
					.map((key) => byId.get(key))
					.filter((item): item is T => item !== undefined),
			),
	});
	const placed = new Set(order);
	const many = order.length > 1;
	return {
		items: [
			...order
				.map((key) => byId.get(key))
				.filter((item): item is T => item !== undefined),
			// an item added this render, before the order has caught up with it
			...items.filter((item) => !placed.has(id(item))),
		],
		status,
		itemProps: (item: T) => itemProps(id(item)),
		/** Null when there is nothing to reorder, which renders no grip. */
		grip: (item: T) => (many ? handleProps(id(item)) : null),
	};
}

/** The grip: spread `handleProps(id)` onto it. Only the grip drags, so a card
 *  inside a link still navigates. */
export function DragHandle({
	className,
	title = "Drag to reorder, or use the arrow keys",
	...props
}: ComponentProps<"button">) {
	return (
		<button
			type="button"
			title={title}
			{...props}
			className={cn(
				"inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[dragging]:cursor-grabbing",
				className,
			)}
		>
			<GripVertical className="size-4" aria-hidden="true" />
		</button>
	);
}

/** The live region `status` is read out through; render one beside the list. */
export function SortableStatus({ status }: { status: string }) {
	return (
		<output className="sr-only" aria-live="polite">
			{status}
		</output>
	);
}
