// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SectionNode } from "#/lib/sections";

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {},
}));

vi.mock("@/lib/i18n", () => ({
	useLang: () => ({ lang: "en", t: (_k: string, f?: string) => f ?? "" }),
	useT: () => (_k: string, f?: string) => f ?? "",
}));

vi.mock("@tanstack/react-router", () => ({
	useLocation: () => ({ pathname: "/en/news" }),
	useLoaderData: () => ({}),
	Link: ({ to, children, ...rest }: Record<string, unknown>) => (
		<a href={to as string} {...rest}>
			{children as never}
		</a>
	),
}));

vi.mock("../ContactForm", () => ({
	ContactForm: () => <form aria-label="contact" />,
}));

vi.mock("../FormRenderer", () => ({
	FormRenderer: ({ slug }: { slug: string }) => <form aria-label={slug} />,
}));

import { SectionRenderer } from "./SectionRenderer";

const section = (layout: string, props: Record<string, unknown> = {}) =>
	[
		{
			id: "s1",
			type: "form",
			layout,
			props: { title: "Express interest", ...props },
		},
	] as SectionNode[];

describe("a form section", () => {
	// four published pages once rendered these fields with no handler behind them
	it("renders nothing when no form is behind it", () => {
		const { container } = render(
			<SectionRenderer sections={section("signup")} />,
		);

		expect(container.querySelector("form")).toBeNull();
		expect(screen.queryByText("Express interest")).toBeNull();
	});

	it("renders the contact form on the contact layout", () => {
		render(<SectionRenderer sections={section("contact")} />);

		expect(screen.getByRole("form", { name: "contact" })).toBeTruthy();
	});

	it("renders a built form whatever the layout says", () => {
		render(
			<SectionRenderer
				sections={section("signup", { formSlug: "volunteer" })}
			/>,
		);

		expect(screen.getByRole("form", { name: "volunteer" })).toBeTruthy();
	});
});

const splitWith = (props: Record<string, unknown>) =>
	[{ id: "s2", type: "split", layout: "media-right", props }] as SectionNode[];

describe("an image caption", () => {
	it("prints under the picture it belongs to", () => {
		render(
			<SectionRenderer
				sections={splitWith({
					image: "/uploads/lab.jpg",
					imageCaption: "Grade 9 ICT lab, Kampot",
				})}
			/>,
		);

		expect(screen.getByText("Grade 9 ICT lab, Kampot").tagName).toBe(
			"FIGCAPTION",
		);
	});

	it("leaves no empty line where a slot has none", () => {
		const { container } = render(
			<SectionRenderer sections={splitWith({ image: "/uploads/lab.jpg" })} />,
		);

		expect(container.querySelector("figcaption")).toBeNull();
	});
});

describe("a section's background", () => {
	const richtext = (props: Record<string, unknown>) =>
		[{ id: "s3", type: "richtext", props }] as SectionNode[];

	it("paints a brand band and turns the ink over inside it", () => {
		const { container } = render(
			<SectionRenderer sections={richtext({ tone: "primary" })} />,
		);

		const band = container.querySelector("section");
		expect(band?.className).toContain("section-band");
		expect(band?.className).toContain("section-band-primary");
	});

	it("leaves a section with no background alone", () => {
		const { container } = render(<SectionRenderer sections={richtext({})} />);

		expect(container.querySelector("section")?.className).not.toContain(
			"section-band",
		);
	});
});

describe("a paginated post list", () => {
	const listing = (page: number, totalPages: number) =>
		[
			{
				id: "list",
				type: "postList",
				layout: "grid-3",
				props: {
					title: "News",
					linkBase: "/news",
					data: [
						{ id: 1, slug: "one", title: "One", excerpt: "", image: null },
					],
					pageInfo: { page, perPage: 15, total: totalPages * 15, totalPages },
				},
			},
		] as SectionNode[];

	it("links every other page and marks the one being read", () => {
		const { container } = render(<SectionRenderer sections={listing(2, 3)} />);

		const pager = container.querySelector("nav[aria-label='Pagination']");
		if (!pager) throw new Error("no pager rendered");
		const hrefs = [...pager.querySelectorAll("a")].map((a) =>
			a.getAttribute("href"),
		);
		expect(hrefs).toEqual([
			"/en/news",
			"/en/news",
			"/en/news?page=3",
			"/en/news?page=3",
		]);
		expect(pager.querySelector('[aria-current="page"]')?.textContent).toBe("2");
	});

	it("draws no pager when everything fits on one page", () => {
		const { container } = render(<SectionRenderer sections={listing(1, 1)} />);

		expect(container.querySelector("nav[aria-label='Pagination']")).toBeNull();
	});
});

describe("a rich text section with a portrait", () => {
	const speech = (person: Record<string, unknown> | null): SectionNode[] =>
		[
			{
				id: "s1",
				type: "richtext",
				layout: "default",
				props: {
					bodyHtml: "<p>Warm greetings.</p>",
					person,
				},
			},
		] as SectionNode[];

	const vanna = {
		id: 2,
		slug: "sao-vanna",
		name: "Mr. Sao Vanna",
		position: "Executive Director",
		photoUrl: "/uploads/ed.jpg",
		i18nFallback: [] as string[],
	};

	it("captions the portrait with the name and job title beside the prose", () => {
		const { container } = render(<SectionRenderer sections={speech(vanna)} />);

		const figure = container.querySelector("figure");
		if (!figure) throw new Error("no portrait rendered");
		expect(figure.querySelector("img")?.getAttribute("src")).toBe(
			"/uploads/ed.jpg",
		);
		expect(figure.textContent).toContain("Mr. Sao Vanna");
		expect(figure.textContent).toContain("Executive Director");
	});

	// the float only works if the headings in the prose stop clearing it
	it("marks the wrapper so the prose headings do not clear the float", () => {
		const { container } = render(<SectionRenderer sections={speech(vanna)} />);

		const wrap = container.querySelector(".has-portrait");
		expect(wrap?.querySelector("figure")).toBeTruthy();
		expect(wrap?.querySelector(".prose-body")).toBeTruthy();
	});

	it("stays a plain column when no one is picked", () => {
		const { container } = render(<SectionRenderer sections={speech(null)} />);

		expect(container.querySelector("figure")).toBeNull();
		expect(container.querySelector(".has-portrait")).toBeNull();
		expect(container.querySelector(".prose-body")).toBeTruthy();
	});
});

describe("a list's “See all” link", () => {
	const list = (props: Record<string, unknown>) =>
		[
			{
				id: "more",
				type: "postList",
				layout: "grid-3",
				props: {
					title: "Impact stories",
					moreHref: "/impact-stories",
					data: [],
					...props,
				},
			},
		] as SectionNode[];

	it("names this list only, when the section carries its own label", () => {
		const { container } = render(
			<SectionRenderer
				sections={list({ moreLabel: "See all impact stories →" })}
			/>,
		);

		expect(
			container.querySelector("a[href='/en/impact-stories']")?.textContent,
		).toBe("See all impact stories →");
	});

	it("falls back to the site-wide wording when it carries none", () => {
		const { container } = render(<SectionRenderer sections={list({})} />);

		expect(
			container.querySelector("a[href='/en/impact-stories']")?.textContent,
		).toBe("See all →");
	});
});

describe("the careers table", () => {
	const vacancies = [
		{
			id: 1,
			slug: "open-role",
			title: "Open role",
			location: "Phnom Penh",
			deadline: "2099-01-01",
			closed: false,
			i18nFallback: [],
			updatedAt: "",
		},
		{
			id: 2,
			slug: "past-role",
			title: "Past role",
			location: "Kampong Cham",
			deadline: "2020-01-01",
			closed: true,
			i18nFallback: [],
			updatedAt: "",
		},
	];

	const careers = (layout: string) =>
		[
			{
				id: "jobs",
				type: "postList",
				layout,
				props: {
					title: "Current openings",
					linkBase: "/careers",
					data: vacancies,
				},
			},
		] as SectionNode[];

	it("keeps a closed vacancy listed, says so, and stops inviting an application", () => {
		const { container } = render(
			<SectionRenderer sections={careers("table")} />,
		);

		const rows = [...container.querySelectorAll("tbody tr")];
		expect(rows.map((r) => r.querySelector("td")?.textContent)).toEqual([
			"Open role",
			"Past role",
		]);
		expect(rows[0].textContent).not.toContain("Closed");
		expect(rows[0].querySelector("a")?.textContent).toContain("Apply");
		expect(rows[1].textContent).toContain("Closed");
		expect(rows[1].querySelector("a")?.textContent).toContain("View");
		expect(rows[1].querySelector("a")?.getAttribute("href")).toBe(
			"/en/careers/past-role",
		);
	});

	it("says which one is closed on the simple list layout too", () => {
		const { container } = render(
			<SectionRenderer sections={careers("list")} />,
		);

		const items = [...container.querySelectorAll("li")];
		expect(items).toHaveLength(2);
		expect(items[0].textContent).not.toContain("Closed");
		expect(items[1].textContent).toContain("Past role");
		expect(items[1].textContent).toContain("Closed");
	});
});
