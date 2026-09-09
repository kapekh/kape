// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ROWS = [
	{
		id: 25,
		title: "Bidding closes Friday",
		message: "",
		linkUrl: "/careers/public-bidding-invitation-2026",
		deadline: "2099-01-01",
		hasDeadline: true,
	},
	{
		id: 26,
		title: "M&E Officer wanted",
		message: "",
		linkUrl: "/careers/job-me-officer",
		deadline: "2099-02-01",
		hasDeadline: true,
	},
];

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		site: {
			announcement: {
				query: () =>
					Promise.resolve([
						{
							id: 25,
							title: "Bidding closes Friday",
							message: "",
							linkUrl: "/careers/public-bidding-invitation-2026",
							deadline: "2099-01-01",
							hasDeadline: true,
						},
						{
							id: 26,
							title: "M&E Officer wanted",
							message: "",
							linkUrl: "/careers/job-me-officer",
							deadline: "2099-02-01",
							hasDeadline: true,
						},
					]),
			},
		},
	},
}));

vi.mock("@/lib/i18n", () => ({
	useLang: () => ({
		lang: "en",
		// mirrors the real `t`: a counter that renders its own `{n}` is the bug
		// this file exists to catch, so the stub has to fill slots too
		t: (
			_key: string,
			fallback?: string,
			params?: Record<string, string | number>,
		) =>
			(fallback ?? _key).replace(/\{(\w+)\}/g, (slot, name) =>
				params && Object.hasOwn(params, name) ? String(params[name]) : slot,
			),
	}),
}));

const inline = vi.hoisted(() => ({ editing: false }));
vi.mock("@/lib/inline-edit", () => ({
	useInlineEdit: () => ({ editing: inline.editing }),
}));

const { AnnouncementPopup } = await import("./AnnouncementPopup");

const KEY = "announcements-dismissed";
const dismissed = () => JSON.parse(localStorage.getItem(KEY) ?? "[]");

async function mount() {
	let view!: ReturnType<typeof render>;
	await act(async () => {
		view = render(<AnnouncementPopup />);
	});
	return async () => {
		await act(async () => {
			view.rerender(<AnnouncementPopup />);
		});
	};
}

// jsdom ships no dialog behaviour at all: https://github.com/jsdom/jsdom/issues/3294
HTMLDialogElement.prototype.showModal = function showModal() {
	this.open = true;
};
HTMLDialogElement.prototype.close = function close() {
	this.open = false;
	this.dispatchEvent(new Event("close"));
};

describe("announcement dismissal", () => {
	beforeEach(() => {
		localStorage.clear();
		document.body.innerHTML = "";
		inline.editing = false;
	});

	it("dismisses only the notice the visitor actually saw", async () => {
		await mount();
		expect(screen.getByText("1 of 2")).toBeTruthy();

		await act(async () => {
			screen.getByText("Close").click();
		});

		expect(dismissed()).toEqual([ROWS[0].id]);
	});

	it("dismisses every notice the visitor paged through", async () => {
		await mount();
		await act(async () => {
			screen.getByText(/Next/).click();
		});
		expect(screen.getByText("2 of 2")).toBeTruthy();

		await act(async () => {
			screen.getByText("Close").click();
		});

		expect(dismissed().sort()).toEqual([ROWS[0].id, ROWS[1].id]);
	});

	it("points read-more at the notice's own detail page", async () => {
		await mount();
		const link = screen.getByText(/Read more/).closest("a");
		expect(link?.getAttribute("href")).toBe(
			"/en/careers/public-bidding-invitation-2026",
		);
	});

	it("keeps the notices when edit mode hides the dialog", async () => {
		const rerender = await mount();
		const dialog = () => document.querySelector("dialog");
		expect(dialog()?.open).toBe(true);

		inline.editing = true;
		await rerender();
		expect(dialog()?.open).toBe(false);
		expect(dismissed()).toEqual([]);

		inline.editing = false;
		await rerender();
		expect(dialog()?.open).toBe(true);
	});

	it("shows nothing once every notice is dismissed", async () => {
		localStorage.setItem(KEY, JSON.stringify([ROWS[0].id, ROWS[1].id]));
		await mount();
		expect(screen.queryByText(/\d of \d/)).toBeNull();
	});
});
