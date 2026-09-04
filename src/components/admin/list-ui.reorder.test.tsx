// @vitest-environment jsdom
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	sent: [] as number[][],
	refuse: false,
}));

const PEOPLE = vi.hoisted(() => [
	{ id: 1, tier: "board", nameEn: "Ana", sort: 0 },
	{ id: 2, tier: "board", nameEn: "Ben", sort: 1 },
	{ id: 3, tier: "board", nameEn: "Chan", sort: 2 },
	{ id: 4, tier: "smt", nameEn: "Dara", sort: 0 },
	{ id: 5, tier: "smt", nameEn: "Eng", sort: 1 },
]);

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminPeople: {
			list: { query: () => Promise.resolve(PEOPLE) },
			reorder: {
				mutate: ({ ids }: { ids: number[] }) => {
					state.sent.push(ids);
					return state.refuse
						? Promise.reject(new Error("FORBIDDEN"))
						: Promise.resolve();
				},
			},
			delete: { mutate: () => Promise.resolve() },
		},
	},
}));

vi.mock("@/components/Dialogs", () => ({
	confirm: () => Promise.resolve(true),
	toast: () => {},
}));

// the list is a file route, and a grip has to be reachable without a router
vi.mock("@tanstack/react-router", async (actual) => ({
	...(await actual<Record<string, unknown>>()),
	createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
	Link: ({
		children,
		to: _to,
		params: _params,
		...rest
	}: {
		children?: ReactNode;
		to?: unknown;
		params?: unknown;
	}) => (
		<a href="#one" {...rest}>
			{children}
		</a>
	),
}));

import { Route } from "#/routes/admin.people.index";

// route files are code-split, so the component is a lazy wrapper
const PeopleList = Route.options.component as (() => ReactNode) & {
	preload?: () => Promise<unknown>;
};

beforeAll(async () => {
	await PeopleList.preload?.();
});

const grips = () =>
	screen.getAllByRole("button", { name: /^Reorder / }) as HTMLButtonElement[];

/** The names beside the grips, top to bottom, across every tier. */
const order = () =>
	grips().map(
		(g) =>
			(g.getAttribute("aria-label") ?? "")
				.slice("Reorder ".length)
				.split(",")[0],
	);

const gripFor = (name: string) =>
	screen.getByRole("button", { name: new RegExp(`^Reorder ${name},`) });

async function shown() {
	render(<PeopleList />);
	await waitFor(() => expect(grips()).toHaveLength(PEOPLE.length));
	// the mount effects have to land before a key does, as they do behind a paint
	await act(async () => {});
}

beforeEach(() => {
	state.sent = [];
	state.refuse = false;
});

describe("dragging the People list", () => {
	it("sends the tier the row sits in and no other", async () => {
		await shown();
		expect(order()).toEqual(["Ana", "Ben", "Chan", "Dara", "Eng"]);

		gripFor("Ana").focus();
		fireEvent.keyDown(gripFor("Ana"), { key: "ArrowDown" });
		expect(order()).toEqual(["Ben", "Ana", "Chan", "Dara", "Eng"]);

		await waitFor(() => expect(state.sent).toHaveLength(1));
		expect(state.sent[0]).toEqual([2, 1, 3]);
	});

	it("puts the order back when the save is refused", async () => {
		state.refuse = true;
		await shown();

		fireEvent.keyDown(gripFor("Eng"), { key: "ArrowUp" });
		expect(order()).toEqual(["Ana", "Ben", "Chan", "Eng", "Dara"]);

		await waitFor(() => expect(state.sent).toEqual([[5, 4]]));
		await waitFor(() =>
			expect(order()).toEqual(["Ana", "Ben", "Chan", "Dara", "Eng"]),
		);
	});
});
