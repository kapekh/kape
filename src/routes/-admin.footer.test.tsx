// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = { key: string; value: string };

/** The settings store this page reads and writes. */
const server = { rows: [] as Row[], writes: [] as Row[] };

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children?: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
	useBlocker: () => {},
}));
vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminSettings: {
			list: { query: () => Promise.resolve(server.rows) },
			set: {
				mutate: (input: Row) => {
					server.writes.push(input);
					return Promise.resolve();
				},
			},
		},
		adminMedia: { byId: { query: () => Promise.resolve(null) } },
	},
}));

const COMPONENT_CHUNK = "./admin.footer?tsr-split=component";

async function mount() {
	const { component: Footer } = (await import(
		/* @vite-ignore */ COMPONENT_CHUNK
	)) as { component: () => React.ReactNode };
	await act(async () => {
		render(<Footer />);
	});
}

const click = async (name: RegExp | string) => {
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name }));
	});
};

const written = (key: string) =>
	server.writes.find((w) => w.key === key)?.value ?? "";

afterEach(cleanup);

beforeEach(() => {
	server.writes = [];
	server.rows = [
		{ key: "footer_links", value: "Annual Report|/annual, Research|/research" },
		{
			key: "footer_socials",
			value: JSON.stringify([
				{ name: "Facebook", url: "https://fb.example", logoUrl: "" },
				{ name: "Telegram", url: "https://t.example", logoUrl: "" },
			]),
		},
	];
});

// Each row holds its own React state, so the list must be keyed by the row and
// not by where it sits: removing the first link used to hand its state to the second.
describe("the footer editor's rows", () => {
	it("drops the row that was removed, and leaves the survivor's field alone", async () => {
		await mount();

		const surviving = screen.getByDisplayValue("Research");
		surviving.focus();
		await click("Remove Annual Report");

		// keyed by row, the field the visitor was in is the same element afterwards
		expect(screen.getByDisplayValue("Research")).toBe(surviving);
		expect(document.activeElement).toBe(surviving);

		await click("Save footer");
		expect(written("footer_links")).toBe("Research|/research");
	});

	it("keeps the row order the arrows put the socials in", async () => {
		await mount();

		const facebook = screen.getByDisplayValue("Facebook");
		await click(/Move Facebook down|Facebook down/);

		// the row travelled with its fields, rather than the fields being retyped
		// into whatever row now stands where it did
		expect(screen.getByDisplayValue("Facebook")).toBe(facebook);

		await click("Save footer");

		expect(
			JSON.parse(written("footer_socials")).map(
				(s: { name: string }) => s.name,
			),
		).toEqual(["Telegram", "Facebook"]);
	});

	// the key is the editor's own bookkeeping; saved settings must never see it
	it("saves no trace of the key React was given", async () => {
		await mount();

		// Save stays disabled until something is edited
		await act(async () => {
			fireEvent.change(screen.getByLabelText("Social link 1 name"), {
				target: { value: "Facebook Page" },
			});
		});
		await click("Save footer");

		expect(written("footer_links")).not.toContain("key");
		for (const social of JSON.parse(written("footer_socials")))
			expect(Object.keys(social)).toEqual(["name", "url", "logoUrl"]);
	});
});
