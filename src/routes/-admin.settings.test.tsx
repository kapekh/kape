// @vitest-environment jsdom
//
// The first test to mount a route file. `Route.options.component` is a lazy
// reference the Start plugin resolves through a chunk no test server serves, so
// the split chunk is imported by the plugin's own id instead - the component
// that actually ships, not a copy of it. If that id ever changes the import
// throws by name rather than quietly testing nothing.
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = { key: string; value: string };

/** The server this page talks to, rewritten per test. */
const server = {
	rows: [] as Row[],
	readFails: null as string | null,
	writeFails: null as string | null,
	reads: 0,
	writes: [] as Row[],
};

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminSettings: {
			list: {
				query: () => {
					server.reads++;
					return server.readFails
						? Promise.reject(new Error(server.readFails))
						: Promise.resolve(server.rows);
				},
			},
			set: {
				mutate: (input: Row) => {
					if (server.writeFails)
						return Promise.reject(new Error(server.writeFails));
					server.writes.push(input);
					server.rows = [
						...server.rows.filter((r) => r.key !== input.key),
						input,
					];
					return Promise.resolve();
				},
			},
			delete: { mutate: () => Promise.resolve() },
		},
	},
}));

const STORED: Row[] = [
	{ key: "site_name_en", value: "Riverbank Education Trust" },
	{ key: "theme_primary", value: "oklch(0.30 0.10 255)" },
	{ key: "theme_secondary", value: "oklch(0.72 0.17 55)" },
];

/** Kept out of the import literal so the type checker does not need an ambient
 *  declaration for a query string only the bundler understands. */
const COMPONENT_CHUNK = "./admin.settings?tsr-split=component";

async function mount() {
	const { component: Settings } = (await import(
		/* @vite-ignore */ COMPONENT_CHUNK
	)) as { component: () => React.ReactNode };
	await act(async () => {
		render(<Settings />);
	});
}

const input = (key: string) =>
	document.getElementById(`set-${key}`) as HTMLInputElement | null;

const click = async (name: RegExp | string) => {
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name }));
	});
};

const type = async (key: string, value: string) => {
	const el = input(key);
	if (!el) throw new Error(`no field for ${key}`);
	await act(async () => {
		fireEvent.change(el, { target: { value } });
	});
};

afterEach(cleanup);

beforeEach(() => {
	server.rows = STORED.map((r) => ({ ...r }));
	server.readFails = null;
	server.writeFails = null;
	server.reads = 0;
	server.writes = [];
});

describe("when the settings cannot be read at all", () => {
	it("says so, offers a retry, and does not sit there looking busy", async () => {
		server.readFails = "signal is aborted without reason";
		await mount();

		expect(
			screen.getByText(/could not be read, so nothing here can be changed yet/),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
		// The old failure was a form full of readOnly inputs behind a spinner that
		// never stopped. There is nothing to type into, so there is no form.
		expect(document.querySelectorAll("input")).toHaveLength(0);
		expect(screen.queryByText("Reading the stored values…")).toBeNull();
	});

	it("recovers when the retry works", async () => {
		server.readFails = "signal is aborted without reason";
		await mount();
		server.readFails = null;
		await click("Try again");

		expect(input("site_name_en")?.value).toBe("Riverbank Education Trust");
		// Neither shape of the message: the whole-page one, and the banner the
		// loaded page shows. Clearing only the first leaves the second overhead.
		expect(screen.queryByText(/could not be read/)).toBeNull();
		expect(screen.queryByText(/could not be re-read/)).toBeNull();
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
	});
});

describe("when adding a setting is refused", () => {
	it("says the setting was not added instead of failing silently", async () => {
		await mount();
		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText("contact_email"), {
				target: { value: "contact_email" },
			});
		});

		server.writeFails = "Failed to fetch";
		await click("Add");

		expect(screen.getByText(/This setting was not added/)).toBeTruthy();
		// The key is still in the field, so the operator is not retyping it.
		expect(
			(screen.getByPlaceholderText("contact_email") as HTMLInputElement).value,
		).toBe("contact_email");
		expect(server.reads).toBe(1);
	});
});

describe("when a re-read fails after the page has loaded", () => {
	it("keeps the unsaved edit visible and keeps the page a form", async () => {
		await mount();
		await type("theme_secondary", "oklch(0.50 0.20 130)");
		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText("contact_email"), {
				target: { value: "contact_email" },
			});
		});

		server.readFails = "Failed to fetch";
		await click("Add");

		expect(screen.getByText(/could not be re-read/)).toBeTruthy();
		expect(
			screen.getByText(/Nothing you have typed has been lost/),
		).toBeTruthy();
		// The whole page used to be replaced by that message, drafts and all.
		expect(input("theme_secondary")?.value).toBe("oklch(0.50 0.20 130)");
		expect(input("site_name_en")?.value).toBe("Riverbank Education Trust");
	});

	it("offers a way back in rather than a retry that can only fail again", async () => {
		await mount();
		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText("contact_email"), {
				target: { value: "contact_email" },
			});
		});

		// What a session that ended after the admin shell let the page through
		// actually puts on the wire: the bare tRPC code, as its own message.
		server.readFails = "UNAUTHORIZED";
		await click("Add");

		expect(screen.getByText(/Your session has ended/)).toBeTruthy();
		expect(screen.getByRole("link", { name: "Sign in again" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
	});
});

describe("when a colour the field rejects is saved", () => {
	it("marks the field and sends nothing", async () => {
		await mount();
		await type("theme_primary", "banana");

		expect(
			screen.getByText(/"banana" is not one of the CSS colour names/),
		).toBeTruthy();
		expect(input("theme_primary")?.getAttribute("aria-invalid")).toBe("true");

		await click(/Save brand/);

		expect(server.writes.map((w) => w.key)).not.toContain("theme_primary");
		expect(server.writes).toHaveLength(0);
		expect(
			screen.getByText(/1 not sent: fix what is marked above/),
		).toBeTruthy();
	});

	it("still saves the fields beside it", async () => {
		await mount();
		await type("theme_primary", "banana");
		await type("theme_accent", "rebeccapurple");
		await click(/Save brand/);

		expect(server.writes).toEqual([
			{ key: "theme_accent", value: "rebeccapurple" },
		]);
	});
});
