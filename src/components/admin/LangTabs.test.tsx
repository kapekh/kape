// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LangTabs } from "./LangTabs";

// no setupFiles in vitest.config.ts, so auto-cleanup is not registered
afterEach(cleanup);

const LANGS = [
	{ code: "en", name: "English" },
	{ code: "km", name: "Khmer" },
	{ code: "fr", name: "French" },
];

const renderTabs = () =>
	render(<LangTabs languages={LANGS}>{(l) => <p>panel {l.code}</p>}</LangTabs>);

const tabs = () => screen.getAllByRole("tab");
const selected = () =>
	tabs().find((t) => t.getAttribute("aria-selected") === "true");

describe("LangTabs", () => {
	it("points each tab at the panel it controls", () => {
		renderTabs();
		for (const tab of tabs()) {
			const panel = document.getElementById(
				tab.getAttribute("aria-controls") ?? "",
			);
			expect(panel).not.toBeNull();
			expect(panel?.getAttribute("role")).toBe("tabpanel");
			// and the panel names itself back, so the pairing is not one-way
			expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
		}
	});

	it("keeps exactly one tab in the tab order (roving tabindex)", () => {
		renderTabs();
		const stops = tabs().filter((t) => t.getAttribute("tabindex") === "0");
		expect(stops).toHaveLength(1);
		expect(stops[0]).toBe(selected());
	});

	it("moves with Left/Right and wraps at both ends", () => {
		renderTabs();
		const list = screen.getByRole("tablist");
		expect(selected()?.textContent).toContain("English");

		fireEvent.keyDown(list, { key: "ArrowRight" });
		expect(selected()?.textContent).toContain("Khmer");
		fireEvent.keyDown(list, { key: "ArrowRight" });
		expect(selected()?.textContent).toContain("French");
		fireEvent.keyDown(list, { key: "ArrowRight" }); // wraps
		expect(selected()?.textContent).toContain("English");
		fireEvent.keyDown(list, { key: "ArrowLeft" }); // wraps the other way
		expect(selected()?.textContent).toContain("French");
	});

	it("jumps to the ends with Home and End", () => {
		renderTabs();
		const list = screen.getByRole("tablist");
		fireEvent.keyDown(list, { key: "End" });
		expect(selected()?.textContent).toContain("French");
		fireEvent.keyDown(list, { key: "Home" });
		expect(selected()?.textContent).toContain("English");
	});

	it("shows only the selected panel but keeps them all mounted", () => {
		renderTabs();
		const panels = screen.getAllByRole("tabpanel", { hidden: true });
		expect(panels).toHaveLength(3);
		expect(panels.filter((p) => !p.hasAttribute("hidden"))).toHaveLength(1);
	});
	it("shows the language whose box the browser refused", () => {
		render(
			<form>
				<LangTabs languages={LANGS}>
					{(l) => (
						<input
							aria-label={`Name ${l.code}`}
							name={`name-${l.code}`}
							required={l.code === "en"}
						/>
					)}
				</LangTabs>
			</form>,
		);
		const panelFor = (code: string) =>
			screen.getByLabelText(`Name ${code}`).closest('[role="tabpanel"]');
		fireEvent.click(screen.getByRole("tab", { name: /Khmer/ }));
		expect(panelFor("en")?.hasAttribute("hidden")).toBe(true);

		// what a submit does: every invalid control gets an `invalid` event, and a
		// required box in a hidden panel would report its error where nobody looks
		const form = document.querySelector("form") as HTMLFormElement;
		act(() => {
			expect(form.checkValidity()).toBe(false);
		});

		expect(panelFor("en")?.hasAttribute("hidden")).toBe(false);
		expect(panelFor("km")?.hasAttribute("hidden")).toBe(true);
	});
});
