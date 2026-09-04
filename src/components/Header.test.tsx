// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "#/lib/i18n";
import type { NavNode } from "#/server/repo/nav";

const router = vi.hoisted(() => ({ pathname: "/en" }));
const pointer = vi.hoisted(() => ({ fine: false }));

vi.mock("@tanstack/react-router", () => ({
	useRouterState: () => router.pathname,
}));

vi.stubGlobal("matchMedia", (query: string) => ({
	matches: pointer.fine && query.includes("hover"),
	addEventListener: () => {},
	removeEventListener: () => {},
}));

// jsdom reports offsetParent as null for everything, and the focus trap skips
// anything it thinks is hidden
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
	configurable: true,
	get() {
		return this.parentNode;
	},
});

vi.mock("./NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { Header } from "./Header";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	router.pathname = "/en";
	pointer.fine = false;
});

const node = (
	id: number,
	label: string,
	href: string | null,
	children: NavNode[] = [],
): NavNode => ({
	id,
	label,
	description: null,
	imageUrl: null,
	targetKind: "page",
	targetRef: "",
	href,
	children,
});

// What We Do › Current Projects › IEP › DWD — the shape a sub-project makes.
const nav: NavNode[] = [
	node("what-we-do".length, "What We Do", null, [
		node(11, "Current Projects", null, [
			node(16, "IEP", "/projects/iep", [node(60, "DWD", "/projects/iep/dwd")]),
			node(17, "DEP", "/projects/dep"),
		]),
	]),
];

// the same shape, but every parent keeps a page of its own
const withPages: NavNode[] = [
	node(20, "What We Do", "/what-we-do", [
		node(21, "Current Projects", "/projects", [
			node(22, "IEP", "/projects/iep"),
		]),
	]),
];

const mount = (tree: NavNode[] = nav) =>
	render(
		<LanguageProvider
			lang="en"
			languages={[{ code: "en", name: "English", nativeName: "English" }]}
			strings={{}}
			stringsFallback={[]}
		>
			<Header nav={tree} settings={{}} />
		</LanguageProvider>,
	);

const trigger = () => screen.getByRole("button", { name: "What We Do" });
const expanded = () => trigger().getAttribute("aria-expanded");

const openMegaMenu = () => {
	mount();
	fireEvent.click(trigger());
};

describe("mega menu", () => {
	it("links a project that has sub-projects under it", () => {
		openMegaMenu();
		expect(
			screen.getByRole("link", { name: /^IEP/ }).getAttribute("href"),
		).toBe("/en/projects/iep");
	});

	it("renders the sub-projects hanging off it", () => {
		openMegaMenu();
		expect(
			screen.getByRole("link", { name: /^DWD/ }).getAttribute("href"),
		).toBe("/en/projects/iep/dwd");
	});

	it("still shows the siblings beside it", () => {
		openMegaMenu();
		expect(
			screen.getByRole("link", { name: /^DEP/ }).getAttribute("href"),
		).toBe("/en/projects/dep");
	});

	it("gives a group whose parent has a page a floor of its own", () => {
		mount(withPages);
		fireEvent.click(trigger());
		expect(
			screen
				.getByRole("link", { name: "See all Current Projects" })
				.getAttribute("href"),
		).toBe("/en/projects");
	});

	it("points the trigger at the panel it opens", () => {
		openMegaMenu();
		const panel = document.getElementById(
			trigger().getAttribute("aria-controls") ?? "",
		);
		expect(panel).not.toBeNull();
		expect(panel?.contains(screen.getByRole("link", { name: /^IEP/ }))).toBe(
			true,
		);
	});
});

describe("orientation", () => {
	it("marks the top-level item whose subtree holds the current page", () => {
		router.pathname = "/en/projects/iep/dwd";
		mount();
		expect(trigger().getAttribute("aria-current")).toBe("true");
	});

	it("leaves the top-level item unmarked elsewhere", () => {
		router.pathname = "/en/about";
		mount();
		expect(trigger().getAttribute("aria-current")).toBeNull();
	});

	it("marks the current page itself inside the panel", () => {
		router.pathname = "/en/projects/iep";
		openMegaMenu();
		expect(
			screen.getByRole("link", { name: /^IEP/ }).getAttribute("aria-current"),
		).toBe("page");
		expect(
			screen.getByRole("link", { name: /^DEP/ }).getAttribute("aria-current"),
		).toBeNull();
	});

	it("marks the current page in the mobile drawer", () => {
		router.pathname = "/en/projects/dep";
		mount();
		fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
		const drawer = screen.getByRole("dialog");
		const dep = [...drawer.querySelectorAll("a")].find(
			(a) => a.getAttribute("href") === "/en/projects/dep",
		);
		expect(dep?.getAttribute("aria-current")).toBe("page");
	});
});

describe("keyboard", () => {
	it("moves focus to the panel's first link on ArrowDown", () => {
		mount();
		trigger().focus();
		fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		expect(expanded()).toBe("true");
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: /^IEP/ }),
		);
	});

	it("closes on Escape and gives the trigger its focus back", () => {
		mount();
		trigger().focus();
		fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		fireEvent.keyDown(document, { key: "Escape" });
		expect(expanded()).toBe("false");
		expect(document.activeElement).toBe(trigger());
	});

	it("closes when focus leaves the panel instead of trapping it", () => {
		mount();
		trigger().focus();
		fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		const inside = document.activeElement as HTMLElement;
		fireEvent.focusOut(inside, {
			relatedTarget: screen.getByRole("button", { name: "Open menu" }),
		});
		expect(expanded()).toBe("false");
	});

	it("keeps the panel open while focus moves within it", () => {
		mount();
		trigger().focus();
		fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		const inside = document.activeElement as HTMLElement;
		fireEvent.focusOut(inside, {
			relatedTarget: screen.getByRole("link", { name: /^DEP/ }),
		});
		expect(expanded()).toBe("true");
	});
});

describe("hover intent", () => {
	it("opens after the intent delay on a fine pointer", () => {
		pointer.fine = true;
		vi.useFakeTimers();
		mount();
		fireEvent.mouseOver(trigger());
		expect(expanded()).toBe("false");
		act(() => vi.advanceTimersByTime(250));
		expect(expanded()).toBe("true");
	});

	it("stays shut on a coarse pointer, where a tap synthesises the hover", () => {
		vi.useFakeTimers();
		mount();
		fireEvent.mouseOver(trigger());
		act(() => vi.advanceTimersByTime(600));
		expect(expanded()).toBe("false");
	});

	it("still opens on a tap, through the click path", () => {
		mount();
		fireEvent.click(trigger());
		expect(expanded()).toBe("true");
	});
});

describe("mobile drawer", () => {
	const open = () => {
		mount();
		const hamburger = screen.getByRole("button", { name: "Open menu" });
		hamburger.focus();
		fireEvent.click(hamburger);
		return hamburger;
	};
	const focusables = () => [
		...screen
			.getByRole("dialog")
			.querySelectorAll<HTMLElement>("a[href],button"),
	];

	it("takes the focus as a modal dialog", () => {
		open();
		const drawer = screen.getByRole("dialog");
		expect(drawer.getAttribute("aria-modal")).toBe("true");
		const name = document.getElementById(
			drawer.getAttribute("aria-labelledby") ?? "",
		);
		expect(name?.textContent).toBe("Menu");
		expect(document.activeElement).toBe(drawer);
	});

	it("wraps Tab from its last control back to its first", () => {
		open();
		const items = focusables();
		items[items.length - 1].focus();
		fireEvent.keyDown(document, { key: "Tab" });
		expect(document.activeElement).toBe(items[0]);
	});

	it("gives the focus back to the trigger when it closes", () => {
		const hamburger = open();
		fireEvent.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Close menu",
			}),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(hamburger);
	});
});
