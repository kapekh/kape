// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startTourOnce, TourHost } from "./Tour";
import { TOURS, tourForPath } from "./tours";

vi.stubGlobal(
	"matchMedia",
	vi.fn((media: string) => ({
		matches: false,
		media,
		addEventListener: () => {},
		removeEventListener: () => {},
	})),
);
Element.prototype.scrollIntoView = () => {};
vi.stubGlobal(
	"ResizeObserver",
	class {
		observe() {}
		disconnect() {}
	},
);

beforeEach(() => {
	localStorage.clear();
});
afterEach(cleanup);

describe("admin tours", () => {
	it("points every step at a selector the browser will accept", () => {
		// A typo here fails silently in the app: the step loses its spotlight and
		// the card drifts to the middle of the screen still describing a control.
		for (const [id, tour] of Object.entries(TOURS))
			for (const step of tour.steps)
				if (step.target)
					expect(
						() => document.querySelector(step.target as string),
						`${id}: ${step.target}`,
					).not.toThrow();
	});

	it("names a tour for every screen it is asked about", () => {
		expect(tourForPath("/admin/media")).toBe("media");
		expect(tourForPath("/admin/settings")).toBe("settings");
		expect(tourForPath("/admin/modules")).toBe("modules");
		expect(tourForPath("/admin/pages")).toBe("shell");
		expect(tourForPath("/admin")).toBe("shell");
	});

	it("runs a tour once and never again", () => {
		render(<TourHost />);
		act(() => startTourOnce("shell"));
		expect(screen.getByRole("dialog")).toBeTruthy();

		// Done marks it seen
		act(() => screen.getByRole("button", { name: "End tour" }).click());
		expect(screen.queryByRole("dialog")).toBeNull();

		act(() => startTourOnce("shell"));
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("does not let a second screen talk over a tour already running", () => {
		render(<TourHost />);
		act(() => startTourOnce("shell"));
		act(() => startTourOnce("media"));
		expect(screen.getByRole("dialog").textContent).toContain(
			TOURS.shell.steps[0].title,
		);
	});
});
