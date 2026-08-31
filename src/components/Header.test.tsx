// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "#/lib/i18n";
import type { NavNode } from "#/server/repo/nav";

vi.mock("@tanstack/react-router", () => ({
	useRouterState: () => "/en",
}));

vi.stubGlobal("matchMedia", () => ({
	matches: false,
	addEventListener: () => {},
	removeEventListener: () => {},
}));

vi.mock("./NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { Header } from "./Header";

afterEach(cleanup);

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

const mount = () =>
	render(
		<LanguageProvider
			lang="en"
			languages={[{ code: "en", name: "English", nativeName: "English" }]}
			strings={{}}
			stringsFallback={[]}
		>
			<Header nav={nav} settings={{}} />
		</LanguageProvider>,
	);

const openMegaMenu = () => {
	mount();
	fireEvent.click(screen.getByRole("button", { name: "What We Do" }));
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
});
