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
