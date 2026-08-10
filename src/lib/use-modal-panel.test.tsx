// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useModalPanel } from "./use-modal-panel";

// jsdom reports offsetParent as null for everything, and the trap skips
// anything it thinks is hidden
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
	configurable: true,
	get() {
		return this.parentNode;
	},
});

function Harness({ empty = false }: { empty?: boolean }) {
	const [open, setOpen] = useState(false);
	const panel = useModalPanel(() => setOpen(false), open);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open
			</button>
			{open && (
				<div ref={panel} role="dialog" aria-modal="true" tabIndex={-1}>
					{!empty && (
						<>
							<button type="button">First</button>
							<button type="button">Last</button>
						</>
					)}
				</div>
			)}
		</>
	);
}

const open = () =>
	fireEvent.click(screen.getByRole("button", { name: "Open" }));
const tab = (shiftKey = false) =>
	fireEvent.keyDown(document, { key: "Tab", shiftKey });

afterEach(cleanup);

describe("useModalPanel", () => {
	it("moves focus into the panel when it opens", () => {
		render(<Harness />);
		open();
		expect(document.activeElement).toBe(screen.getByRole("dialog"));
	});

	it("wraps Tab from the last control back to the first", () => {
		render(<Harness />);
		open();
		screen.getByRole("button", { name: "Last" }).focus();
		tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "First" }),
		);
	});

	it("wraps Shift+Tab from the panel to the last control", () => {
		render(<Harness />);
		open();
		tab(true);
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Last" }),
		);
	});

	it("pulls focus back when it has escaped the panel", () => {
		render(<Harness />);
		open();
		screen.getByRole("button", { name: "Open" }).focus();
		tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "First" }),
		);
	});

	it("keeps the focus on a panel with nothing to tab to", () => {
		render(<Harness empty />);
		open();
		tab();
		expect(document.activeElement).toBe(screen.getByRole("dialog"));
	});

	it("closes on Escape and gives the trigger its focus back", () => {
		render(<Harness />);
		const trigger = screen.getByRole("button", { name: "Open" });
		trigger.focus();
		open();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});
});
