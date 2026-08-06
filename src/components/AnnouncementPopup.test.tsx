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
		t: (_key: string, fallback?: string) => fallback ?? _key,
	}),
}));

const { AnnouncementPopup } = await import("./AnnouncementPopup");

const KEY = "announcements-dismissed";
const dismissed = () => JSON.parse(localStorage.getItem(KEY) ?? "[]");

async function mount() {
	await act(async () => {
		render(<AnnouncementPopup />);
	});
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
	});

	it("dismisses only the notice the visitor actually saw", async () => {
		await mount();
		expect(screen.getByText("1 / 2")).toBeTruthy();

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
		expect(screen.getByText("2 / 2")).toBeTruthy();

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

	it("shows nothing once every notice is dismissed", async () => {
		localStorage.setItem(KEY, JSON.stringify([ROWS[0].id, ROWS[1].id]));
		await mount();
		expect(screen.queryByText(/\d \/ \d/)).toBeNull();
	});
});
