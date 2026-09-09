// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { defaultLanguage, LangTabs, useLangText } from "./LangTabs";

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

describe("defaultLanguage", () => {
	it("is the flagged language, not whichever sorts first", () => {
		const langs = [
			{ code: "km", name: "Khmer", isDefault: false },
			{ code: "en", name: "English", isDefault: true },
		];
		expect(defaultLanguage(langs)?.code).toBe("en");
	});

	it("falls back to the first when nothing is flagged", () => {
		expect(defaultLanguage(LANGS)?.code).toBe("en");
		expect(defaultLanguage([])).toBeUndefined();
	});
});

describe("useLangText", () => {
	const FIELDS = ["name", "position"] as const;
	const seed = (
		initial?: Record<string, { name?: string; position?: string }>,
	) => renderHook(() => useLangText(LANGS, FIELDS, initial));

	it("starts a language with no stored row blank, not absent", () => {
		const { result } = seed({ en: { name: "Chenda" } });
		expect(result.current.text).toEqual({
			en: { name: "Chenda", position: "" },
			km: { name: "", position: "" },
			fr: { name: "", position: "" },
		});
	});

	it("sends every language, and a cleared field as an empty string", () => {
		const { result } = seed({ km: { name: "សុខ", position: "នាយក" } });
		act(() => result.current.setText("km", "position", ""));
		expect(result.current.toTranslations()).toEqual([
			{ lang: "en", name: "", position: "" },
			{ lang: "km", name: "សុខ", position: "" },
			{ lang: "fr", name: "", position: "" },
		]);
	});

	it("edits one language's field without touching the others", () => {
		const { result } = seed();
		act(() => result.current.setText("fr", "name", "Chenda"));
		expect(result.current.text.fr).toEqual({ name: "Chenda", position: "" });
		expect(result.current.text.en).toEqual({ name: "", position: "" });
	});
});

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
