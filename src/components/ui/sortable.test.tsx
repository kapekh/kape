// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DragHandle, SortableStatus, useSortable } from "./sortable.tsx";

// no setupFiles guarantee for this file's ordering, so unmount before the next test
afterEach(cleanup);

const NAMES = ["ann", "bo", "cy"];
const GRID = ["a", "b", "c", "d"];
const PAST_BURST = 600;
const FRAME = 16;

// jsdom lays nothing out, so the drag reads the rects this file makes up: a
// column of unequal heights, or a two-across grid
const HEIGHT: Record<string, number> = { ann: 20, bo: 100, cy: 20 };

type Box = { top: number; bottom: number; left: number; right: number };

const column = (i: number, names: string[]): Box => {
	let top = 0;
	for (let n = 0; n < i; n++) top += HEIGHT[names[n]] ?? 20;
	return { top, bottom: top + (HEIGHT[names[i]] ?? 20), left: 0, right: 200 };
};

// clear of the edge bands, so the grid drag is not also an autoscroll
const twoAcross = (i: number): Box => ({
	top: 200 + Math.floor(i / 2) * 100,
	bottom: 300 + Math.floor(i / 2) * 100,
	left: (i % 2) * 100,
	right: (i % 2) * 100 + 100,
});

let place: (i: number, names: string[]) => Box = column;

type HarnessProps = {
	save?: (ids: string[]) => void;
	refuse?: boolean;
	onError?: (err: unknown) => void;
	disabled?: boolean;
	names?: string[];
	axis?: "list" | "grid";
};

function Harness({
	save,
	refuse = false,
	onError,
	disabled,
	names = NAMES,
	axis,
}: HarnessProps) {
	const [ids, setIds] = useState(names);
	const sortable = useSortable({
		ids,
		axis,
		disabled,
		onError,
		describe: (id) => id,
		onReorder: async (next) => {
			save?.(next);
			if (refuse) throw new Error("refused");
			setIds(next);
		},
	});
	return (
		<>
			<ul>
				{sortable.order.map((id) => (
					<li key={id} {...sortable.itemProps(id)}>
						<span>{id}</span>
						<DragHandle {...sortable.handleProps(id)} />
					</li>
				))}
			</ul>
			<SortableStatus status={sortable.status} />
		</>
	);
}

const shown = () =>
	screen.getAllByRole("listitem").map((li) => li.textContent?.trim());

const grip = (name: string) =>
	screen.getByRole("button", { name: new RegExp(`^Reorder ${name},`) });

const said = () => screen.getByRole("status").textContent;

const tick = async (ms: number) => {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
};

const press = (name: string, x: number, y: number) =>
	fireEvent.pointerDown(grip(name), {
		button: 0,
		isPrimary: true,
		clientX: x,
		clientY: y,
	});

const moveTo = (x: number, y: number) =>
	fireEvent.pointerMove(window, { clientX: x, clientY: y });

const frames = (n = 3) => tick(n * FRAME);

const laidOut = HTMLLIElement.prototype.getBoundingClientRect;

beforeEach(() => {
	vi.useFakeTimers();
	place = column;
	HTMLLIElement.prototype.getBoundingClientRect = function (
		this: HTMLLIElement,
	) {
		const siblings = Array.from(this.parentElement?.children ?? []);
		const box = place(
			siblings.indexOf(this),
			siblings.map((li) => li.textContent?.trim() ?? ""),
		);
		return {
			...box,
			width: box.right - box.left,
			height: box.bottom - box.top,
			x: box.left,
			y: box.top,
			toJSON: () => box,
		} as DOMRect;
	};
});

afterEach(() => {
	HTMLLIElement.prototype.getBoundingClientRect = laidOut;
	vi.useRealTimers();
});

describe("useSortable", () => {
	it("moves an item on ArrowDown and says where it landed", async () => {
		const save = vi.fn();
		render(<Harness save={save} />);

		fireEvent.keyDown(grip("ann"), { key: "ArrowDown" });
		expect(shown()).toEqual(["bo", "ann", "cy"]);
		expect(said()).toBe("ann moved to 2 of 3.");
		expect(save).not.toHaveBeenCalled();

		await tick(PAST_BURST);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(["bo", "ann", "cy"]);
		expect(shown()).toEqual(["bo", "ann", "cy"]);
		expect(grip("ann").getAttribute("aria-label")).toContain("2 of 3");
	});

	it("writes a burst of presses once, at the order it ended on", async () => {
		const save = vi.fn();
		render(<Harness save={save} />);

		fireEvent.keyDown(grip("ann"), { key: "ArrowDown" });
		fireEvent.keyDown(grip("ann"), { key: "ArrowDown" });
		await tick(PAST_BURST);

		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(["bo", "cy", "ann"]);
	});

	it("takes Home and End to the ends", async () => {
		const save = vi.fn();
		render(<Harness save={save} />);

		fireEvent.keyDown(grip("cy"), { key: "Home" });
		expect(shown()).toEqual(["cy", "ann", "bo"]);
		await tick(PAST_BURST);
		expect(save).toHaveBeenCalledWith(["cy", "ann", "bo"]);
	});

	it("puts the order back and reports it when the save is refused", async () => {
		const save = vi.fn();
		const onError = vi.fn();
		render(<Harness save={save} refuse onError={onError} />);

		fireEvent.keyDown(grip("ann"), { key: "ArrowDown" });
		expect(shown()).toEqual(["bo", "ann", "cy"]);

		await tick(PAST_BURST);
		expect(save).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(shown()).toEqual(NAMES);
		expect(said()).toContain("not saved");
	});

	it("rolls a whole burst back to where it began", async () => {
		const onError = vi.fn();
		render(<Harness refuse onError={onError} />);

		fireEvent.keyDown(grip("ann"), { key: "ArrowDown" });
		fireEvent.keyDown(grip("ann"), { key: "ArrowDown" });
		await tick(PAST_BURST);

		expect(shown()).toEqual(NAMES);
	});

	it("leaves the grip inert while it is disabled", async () => {
		const save = vi.fn();
		render(<Harness save={save} disabled />);

		const handle = grip("ann");
		expect((handle as HTMLButtonElement).disabled).toBe(true);
		fireEvent.keyDown(handle, { key: "ArrowDown" });
		fireEvent.pointerDown(handle, { button: 0, isPrimary: true });

		expect(shown()).toEqual(NAMES);
		await tick(PAST_BURST);
		expect(save).not.toHaveBeenCalled();
		expect(said()).toBe("");
	});

	it("says nothing about dragging until something is dragged", () => {
		render(<Harness />);
		for (const name of NAMES)
			expect(grip(name).hasAttribute("data-dragging")).toBe(false);
	});

	it("focuses the grip it was pressed on, so the arrow keys work after a click", async () => {
		render(<Harness />);

		const handle = grip("ann");
		expect(document.activeElement).not.toBe(handle);
		press("ann", 5, 10);
		expect(document.activeElement).toBe(handle);

		fireEvent.pointerUp(window);
		await frames(1);
	});

	it("does not scroll the page until the pointer has moved", async () => {
		const scroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
		render(<Harness />);

		// pressed inside the top edge band, where a still finger used to scroll
		press("ann", 5, 10);
		await frames(6);
		expect(scroll).not.toHaveBeenCalled();

		moveTo(5, 2);
		await frames(2);
		expect(scroll).toHaveBeenCalledWith(0, -14);

		fireEvent.pointerUp(window);
		await frames(1);
		scroll.mockRestore();
	});

	it("swaps as the pointer passes the neighbour's middle, and stays put after", async () => {
		const scroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
		const save = vi.fn();
		render(<Harness save={save} />);

		// ann is 20 tall, bo is 100: overlap alone would swap the moment the
		// pointer entered bo, then swap back once bo took ann's slot
		press("ann", 5, 10);
		await frames();
		expect(shown()).toEqual(NAMES);

		moveTo(5, 60);
		await frames();
		expect(shown()).toEqual(NAMES);

		moveTo(5, 75);
		await frames();
		expect(shown()).toEqual(["bo", "ann", "cy"]);
		expect(said()).toBe("ann moved to 2 of 3.");

		await frames(12);
		expect(shown()).toEqual(["bo", "ann", "cy"]);

		fireEvent.pointerUp(window);
		await frames(1);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(["bo", "ann", "cy"]);
		scroll.mockRestore();
	});

	it("carries the row as far as the pointer went, in one move", async () => {
		const save = vi.fn();
		render(<Harness save={save} />);

		press("ann", 5, 10);
		// past cy's middle, two slots down, inside a single frame
		moveTo(5, 135);
		await frames(1);
		expect(shown()).toEqual(["bo", "cy", "ann"]);
		expect(said()).toBe("ann moved to 3 of 3.");

		fireEvent.pointerUp(window);
		await frames(1);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(["bo", "cy", "ann"]);
	});

	it("passes the middle across the row in a grid", async () => {
		place = twoAcross;
		const save = vi.fn();
		render(<Harness save={save} names={GRID} axis="grid" />);

		press("a", 50, 250);
		moveTo(120, 250);
		await frames();
		expect(shown()).toEqual(GRID);

		moveTo(160, 250);
		await frames();
		expect(shown()).toEqual(["b", "a", "c", "d"]);

		await frames(12);
		expect(shown()).toEqual(["b", "a", "c", "d"]);

		fireEvent.pointerUp(window);
		await frames(1);
		expect(save).toHaveBeenCalledWith(["b", "a", "c", "d"]);
	});

	it("keeps the grip's colour transition when motion is reduced", () => {
		vi.stubGlobal("matchMedia", () => ({
			matches: true,
			media: "(prefers-reduced-motion: reduce)",
			addEventListener: () => {},
			removeEventListener: () => {},
		}));
		render(<Harness />);

		// reduced motion is not a reason to drop a colour fade
		expect(grip("ann").className).toContain("transition-colors");
		vi.unstubAllGlobals();
	});
});
