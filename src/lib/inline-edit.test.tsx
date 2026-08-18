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

import { InlineEditBar } from "#/components/InlineEditBar";
import { T } from "#/components/T";
import { ADMIN_HINT_COOKIE } from "./admin-hint";
import { LanguageProvider } from "./i18n";
import { InlineEditProvider } from "./inline-edit";

const state = vi.hoisted(() => ({
	me: null as { permissions: string[]; isSuperAdmin: boolean } | null,
	meCalls: 0,
	saved: [] as { key: string; lang: string; value: string }[],
	fail: null as string | null,
}));

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		auth: {
			me: {
				query: () => {
					state.meCalls++;
					return Promise.resolve(state.me);
				},
			},
		},
		adminSettings: {
			setUiString: {
				mutate: (input: { key: string; lang: string; value: string }) => {
					if (state.fail) return Promise.reject(new Error(state.fail));
					state.saved.push(input);
					return Promise.resolve({ reset: false });
				},
			},
		},
	},
}));

const KEY = "test.greeting";

function Page({ lang = "en" }: { lang?: string }): ReactNode {
	return (
		<LanguageProvider
			lang={lang}
			languages={[
				{ code: "en", name: "English", nativeName: "English" },
				{ code: "km", name: "Khmer", nativeName: "ខ្មែរ" },
			]}
			strings={{ [KEY]: "Hello" }}
			stringsFallback={lang === "km" ? [KEY] : []}
		>
			<InlineEditProvider>
				<h1>
					<T k={KEY} />
				</h1>
				<p>
					<T k="test.unstored" fallback="Built in" />
				</p>
				<InlineEditBar />
			</InlineEditProvider>
		</LanguageProvider>
	);
}

const setHint = (on: boolean) => {
	// biome-ignore lint/suspicious/noDocumentCookie: the hint cookie is the thing under test
	document.cookie = `${ADMIN_HINT_COOKIE}=${on ? "1" : ""}; Max-Age=${on ? 60 : 0}`;
};

afterEach(cleanup);

beforeEach(() => {
	state.me = null;
	state.meCalls = 0;
	state.saved = [];
	state.fail = null;
	localStorage.clear();
	setHint(false);
});

const signIn = () => {
	state.me = { permissions: ["settings"], isSuperAdmin: false };
	setHint(true);
};

describe("inline editing on the public site", () => {
	it("asks nobody who they are without the hint cookie", async () => {
		render(<Page />);
		await screen.findByText("Hello");
		expect(state.meCalls).toBe(0);
		expect(screen.queryByLabelText(/edit this page/i)).toBeNull();
		expect(screen.getByRole("heading").innerHTML).toBe("Hello");
	});

	it("leaves the page untouched for a visitor who forges the hint", async () => {
		setHint(true);
		render(<Page />);
		await waitFor(() => expect(state.meCalls).toBe(1));
		expect(screen.queryByLabelText(/edit this page/i)).toBeNull();
	});

	it("marks strings only once an admin turns edit mode on", async () => {
		signIn();
		render(<Page />);
		const toggle = await screen.findByLabelText(/edit this page/i);
		expect(screen.queryByRole("button", { name: "Hello" })).toBeNull();

		fireEvent.click(toggle);
		expect(screen.getByRole("button", { name: "Hello" })).toBeTruthy();
	});

	it("types over the string where it is printed, and saves the language in the URL", async () => {
		signIn();
		render(<Page />);
		fireEvent.click(await screen.findByLabelText(/edit this page/i));
		const node = screen.getByRole("button", { name: "Hello" });

		fireEvent.mouseDown(node);
		// the string itself is the box: no second copy of it anywhere
		expect(node.getAttribute("contenteditable")).toBeTruthy();
		expect(node.textContent).toBe("Hello");
		expect(screen.queryByRole("textbox")).toBeNull();

		node.textContent = "Hi there";
		fireEvent.keyDown(node, { key: "Enter" });

		await waitFor(() =>
			expect(state.saved).toEqual([
				{ key: KEY, lang: "en", value: "Hi there" },
			]),
		);
		expect(screen.getByRole("heading").textContent).toBe("Hi there");
		expect(node.getAttribute("contenteditable")).toBeNull();
	});

	it("empties the node for a key no language has a row for, and says what it was showing", async () => {
		signIn();
		render(<Page />);
		fireEvent.click(await screen.findByLabelText(/edit this page/i));
		const node = screen.getByRole("button", { name: "Built in" });

		fireEvent.mouseDown(node);
		expect(node.textContent).toBe("");
		expect(screen.getByText(/showing “Built in”/)).toBeTruthy();
	});

	it("starts empty on a page falling back to English, and writes the asked-for language", async () => {
		signIn();
		render(<Page lang="km" />);
		fireEvent.click(await screen.findByLabelText(/edit this page/i));
		const node = screen.getByRole("button", { name: "Hello" });

		fireEvent.mouseDown(node);
		expect(node.textContent).toBe("");
		expect(screen.getByText(/showing “Hello”/)).toBeTruthy();

		node.textContent = "សួស្តី";
		fireEvent.keyDown(node, { key: "Enter" });
		await waitFor(() =>
			expect(state.saved).toEqual([{ key: KEY, lang: "km", value: "សួស្តី" }]),
		);
	});

	it("puts the text back on Escape, and saves nothing", async () => {
		signIn();
		render(<Page />);
		fireEvent.click(await screen.findByLabelText(/edit this page/i));
		const node = screen.getByRole("button", { name: "Hello" });

		fireEvent.mouseDown(node);
		node.textContent = "half a thought";
		fireEvent.keyDown(node, { key: "Escape" });

		expect(node.textContent).toBe("Hello");
		expect(node.getAttribute("contenteditable")).toBeNull();
		expect(state.saved).toEqual([]);
		await waitFor(() =>
			expect(document.activeElement?.getAttribute("data-cms-ui-string")).toBe(
				KEY,
			),
		);
	});

	it("keeps what was typed when the save is refused", async () => {
		signIn();
		state.fail = "You cannot edit settings.";
		render(<Page />);
		fireEvent.click(await screen.findByLabelText(/edit this page/i));
		const node = screen.getByRole("button", { name: "Hello" });

		fireEvent.mouseDown(node);
		node.textContent = "Hi there";
		fireEvent.keyDown(node, { key: "Enter" });

		expect(await screen.findByText(/You cannot edit settings/)).toBeTruthy();
		expect(node.textContent).toBe("Hi there");
		expect(node.getAttribute("contenteditable")).toBeTruthy();
	});

	it("saves when the editor clicks away rather than losing the change", async () => {
		signIn();
		render(<Page />);
		fireEvent.click(await screen.findByLabelText(/edit this page/i));
		const node = screen.getByRole("button", { name: "Hello" });

		fireEvent.mouseDown(node);
		node.textContent = "Clicked away";
		fireEvent.focusOut(node);

		await waitFor(() =>
			expect(state.saved).toEqual([
				{ key: KEY, lang: "en", value: "Clicked away" },
			]),
		);
	});
});
