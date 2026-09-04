// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_HINT_COOKIE } from "#/lib/admin-hint";
import { LanguageProvider } from "#/lib/i18n";
import { InlineEditProvider } from "#/lib/inline-edit";
import type { SectionNode } from "#/lib/sections";

const state = vi.hoisted(() => ({
	me: null as { permissions: string[]; isSuperAdmin: boolean } | null,
	reordered: [] as number[][],
	refuse: false,
}));

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		auth: { me: { query: () => Promise.resolve(state.me) } },
		adminPeople: {
			reorder: {
				mutate: ({ ids }: { ids: number[] }) => {
					if (state.refuse) return Promise.reject(new Error("FORBIDDEN"));
					state.reordered.push(ids);
					return Promise.resolve();
				},
			},
		},
	},
}));

vi.mock("../NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { InlineEditBar } from "../InlineEditBar";
import { SectionRenderer } from "./SectionRenderer";

const PAGE_ID = 51;

const TEAM = [
	{ id: 7, slug: "ann", name: "Ann Chan", position: "Lead" },
	{ id: 8, slug: "bo", name: "Bo Sok", position: "Officer" },
	{ id: 9, slug: "cy", name: "Cy Meng", position: "Officer" },
];

const teamSection = (): SectionNode[] => [
	{
		id: "team",
		type: "people",
		props: {
			title: "Our team",
			data: TEAM.map((p) => ({ ...p, section: "team", photoUrl: null })),
		},
	},
];

function Probe({ sections }: { sections: SectionNode[] }) {
	return (
		<LanguageProvider
			lang="en"
			languages={[{ code: "en", name: "English", nativeName: "English" }]}
			strings={{}}
			stringsFallback={[]}
		>
			<InlineEditProvider>
				<SectionRenderer
					sections={sections}
					entity="page"
					entityId={PAGE_ID}
					lang="en"
				/>
				<InlineEditBar />
			</InlineEditProvider>
		</LanguageProvider>
	);
}

const setHint = (on: boolean) => {
	// biome-ignore lint/suspicious/noDocumentCookie: the hint cookie is what gates the editor
	document.cookie = `${ADMIN_HINT_COOKIE}=${on ? "1" : ""}; Max-Age=${on ? 60 : 0}`;
};

const signIn = (permissions: string[]) => {
	state.me = { permissions, isSuperAdmin: false };
	setHint(true);
};

/** Sign in, render, turn the switch on. */
async function editing(sections: SectionNode[]) {
	const view = render(<Probe sections={sections} />);
	fireEvent.click(await screen.findByLabelText(/edit this page/i));
	return view;
}

const grips = () => screen.queryAllByRole("button", { name: /^Reorder / });

const grip = (name: string) =>
	screen.getByRole("button", { name: new RegExp(`^Reorder ${name},`) });

const namesShown = (root: HTMLElement) =>
	[...root.querySelectorAll("[data-sortable-item]")].map((n) =>
		n.getAttribute("data-sortable-item"),
	);

afterEach(cleanup);

beforeEach(() => {
	state.me = null;
	state.reordered = [];
	state.refuse = false;
	localStorage.clear();
	setHint(false);
});

describe("ordering the team grid from the page", () => {
	it("offers no grip to a visitor, or to an admin without people", async () => {
		render(<Probe sections={teamSection()} />);
		expect(grips()).toEqual([]);
		expect(document.querySelectorAll("[data-sortable-item]")).toHaveLength(0);

		cleanup();
		signIn(["pages"]);
		await editing(teamSection());
		expect(grips()).toEqual([]);
	});

	it("moves a card on an arrow key and saves the new order once", async () => {
		signIn(["people"]);
		const { container } = await editing(teamSection());
		expect(grips()).toHaveLength(3);

		fireEvent.keyDown(grip("Ann Chan"), { key: "ArrowRight" });
		expect(namesShown(container)).toEqual(["8", "7", "9"]);

		await waitFor(() => expect(state.reordered).toEqual([[8, 7, 9]]), {
			timeout: 2000,
		});
	});

	it("puts the grid back when the save is refused, and says so", async () => {
		signIn(["people"]);
		state.refuse = true;
		const { container } = await editing(teamSection());

		fireEvent.keyDown(grip("Cy Meng"), { key: "Home" });
		expect(namesShown(container)).toEqual(["9", "7", "8"]);

		await waitFor(
			() => expect(namesShown(container)).toEqual(["7", "8", "9"]),
			{
				timeout: 2000,
			},
		);
		expect(state.reordered).toEqual([]);
		expect(
			await screen.findByText(/does not have permission/, undefined, {
				timeout: 2000,
			}),
		).toBeTruthy();
	});
});
