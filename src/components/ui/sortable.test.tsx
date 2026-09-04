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
const PAST_BURST = 600;

type HarnessProps = {
	save?: (ids: string[]) => void;
	refuse?: boolean;
	onError?: (err: unknown) => void;
	disabled?: boolean;
};

function Harness({ save, refuse = false, onError, disabled }: HarnessProps) {
	const [ids, setIds] = useState(NAMES);
	const sortable = useSortable({
		ids,
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

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

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
});
