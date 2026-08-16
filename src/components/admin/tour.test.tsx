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
				for (const target of [step.target ?? []].flat())
					expect(
						() => document.querySelector(target),
						`${id}: ${target}`,
					).not.toThrow();
	});

	it("names a tour for every screen it is asked about", () => {
		expect(tourForPath("/admin/media")).toBe("media");
		expect(tourForPath("/admin/settings")).toBe("settings");
		expect(tourForPath("/admin/modules")).toBe("modules");
		expect(tourForPath("/admin")).toBe("dashboard");
		// a list and its editor are different screens
		expect(tourForPath("/admin/pages")).toBe("pages");
		expect(tourForPath("/admin/pages/12")).toBe("pageBuilder");
		expect(tourForPath("/admin/posts")).toBe("posts");
		expect(tourForPath("/admin/posts/new")).toBe("editor");
		expect(tourForPath("/admin/forms")).toBe("forms");
		expect(tourForPath("/admin/forms/3")).toBe("formBuilder");
		expect(tourForPath("/admin/forms/3/submissions")).toBe("formResponses");
		expect(tourForPath("/admin/roles")).toBe("roles");
		expect(tourForPath("/admin/roles/2")).toBe("roleEditor");
		expect(tourForPath("/admin/campaigns")).toBe("campaigns");
		expect(tourForPath("/admin/campaigns/4")).toBe("editor");
		expect(tourForPath("/admin/campaigns/4/donations")).toBe(
			"campaignDonations",
		);
		// the four term lists are one screen wearing four titles
		expect(tourForPath("/admin/locations")).toBe("terms");
		expect(tourForPath("/admin/partner-categories")).toBe("terms");
		// partner-categories must not be read as the partners list
		expect(tourForPath("/admin/partners")).toBe("partners");
		expect(tourForPath("/admin/unknown-screen")).toBe("shell");
	});

	it("gives every admin screen in the sidebar a tour of its own", () => {
		// the sidebar's own list, so a screen added there without a tour fails here
		const screens = [
			"/admin",
			"/admin/messages",
			"/admin/forms",
			"/admin/pages",
			"/admin/projects",
			"/admin/media",
			"/admin/posts",
			"/admin/campaigns",
			"/admin/donations",
			"/admin/schools",
			"/admin/people",
			"/admin/partners",
			"/admin/donors",
			"/admin/offices",
			"/admin/nav",
			"/admin/footer",
			"/admin/org-chart",
			"/admin/languages",
			"/admin/ui-strings",
			"/admin/users",
			"/admin/roles",
			"/admin/settings",
			"/admin/modules",
			"/admin/locations",
			"/admin/publication-categories",
			"/admin/doc-categories",
			"/admin/partner-categories",
			"/admin/account",
		];
		for (const path of screens)
			expect(tourForPath(path), path).not.toBe("shell");
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

	it("walks the steps with N and P", () => {
		render(<TourHost />);
		act(() => startTourOnce("shell"));
		const steps = TOURS.shell.steps;
		const shown = () => screen.getByRole("dialog").textContent ?? "";
		const press = (key: string) =>
			act(() => {
				document.dispatchEvent(new KeyboardEvent("keydown", { key }));
			});

		expect(shown()).toContain(steps[0].title);
		press("n");
		expect(shown()).toContain(steps[1].title);
		press("P");
		expect(shown()).toContain(steps[0].title);
		// nothing before the first step
		press("p");
		expect(shown()).toContain(steps[0].title);

		for (let i = 1; i < steps.length; i++) press("n");
		expect(shown()).toContain(steps[steps.length - 1].title);
		// N on the last step ends the tour rather than sticking
		press("n");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("moves past a collapsed target to the next selector the step offers", () => {
		const rect = (el: HTMLElement, box: [number, number, number, number]) => {
			const [top, left, width, height] = box;
			el.getBoundingClientRect = () =>
				({
					top,
					left,
					width,
					height,
					right: left + width,
					bottom: top + height,
					x: left,
					y: top,
				}) as DOMRect;
		};
		const collapsed = document.createElement("div");
		collapsed.id = "page-segment";
		rect(collapsed, [0, 0, 0, 0]);
		const shown = document.createElement("div");
		shown.setAttribute("data-tour", "page-settings");
		rect(shown, [120, 40, 300, 56]);
		document.body.append(collapsed, shown);

		render(<TourHost />);
		act(() => startTourOnce("pageBuilder"));
		act(() => {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
		});

		// the ring is the target's box grown by PAD on every side
		const ring = document.querySelector<HTMLElement>(".ring-admin-accent");
		expect(ring, "the step spotlights nothing").toBeTruthy();
		expect(ring?.style.top).toBe("114px");
		expect(ring?.style.height).toBe("68px");

		act(() => screen.getByRole("button", { name: "End tour" }).click());
		collapsed.remove();
		shown.remove();
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
