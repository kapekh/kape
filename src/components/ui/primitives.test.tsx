// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Badge, type BadgeTone } from "./badge.tsx";
import { Button } from "./button.tsx";
import { Card, type CardTone } from "./card.tsx";
import { EmptyState } from "./empty-state.tsx";
import { Skeleton, SkeletonRows } from "./skeleton.tsx";
import { Table, TBody, TD, TH, THead, TR } from "./table.tsx";

// no setupFiles in vitest.config.ts, so auto-cleanup is not registered
afterEach(cleanup);

const VARIANTS = ["primary", "secondary", "ghost", "danger"] as const;
const SIZES = ["sm", "md", "icon"] as const;
const TONES: BadgeTone[] = [
	"live",
	"draft",
	"warning",
	"danger",
	"neutral",
	"accent",
];

describe("Button", () => {
	it("renders every variant at every size", () => {
		render(
			<div>
				{VARIANTS.map((variant) =>
					SIZES.map((size) => (
						<Button key={`${variant}-${size}`} variant={variant} size={size}>
							{variant} {size}
						</Button>
					)),
				)}
			</div>,
		);
		expect(screen.getAllByRole("button")).toHaveLength(
			VARIANTS.length * SIZES.length,
		);
		for (const variant of VARIANTS)
			for (const size of SIZES) {
				const b = screen.getByRole("button", { name: `${variant} ${size}` });
				expect(b.dataset.variant).toBe(variant);
				expect(b.dataset.size).toBe(size);
			}
	});

	it("keeps its shape when disabled and says why", () => {
		// the bug: a disabled Save was a flat grey slab that read as a failed
		// render, and nothing on screen said it was waiting for an edit
		render(
			<Button disabled disabledReason="No changes to save.">
				Save page
			</Button>,
		);
		const b = screen.getByRole("button", { name: "Save page" });
		expect((b as HTMLButtonElement).disabled).toBe(true);
		expect(b.getAttribute("title")).toBe("No changes to save.");
		const described = b.getAttribute("aria-describedby");
		expect(described).toBeTruthy();
		expect(document.getElementById(described ?? "")?.textContent).toBe(
			"No changes to save.",
		);
		// a tooltip on an element the pointer cannot reach never opens
		expect(b.className).not.toContain("disabled:pointer-events-none");
	});

	it("says nothing about a reason when it is not disabled", () => {
		render(<Button disabledReason="No changes to save.">Save page</Button>);
		const b = screen.getByRole("button", { name: "Save page" });
		expect(b.hasAttribute("title")).toBe(false);
		expect(b.hasAttribute("aria-describedby")).toBe(false);
	});

	it("hands its props to the child element when asChild", () => {
		render(
			<Button asChild>
				<a href="/admin/pages">Back to pages</a>
			</Button>,
		);
		expect(
			screen.getByRole("link", { name: "Back to pages" }).dataset.slot,
		).toBe("button");
	});
});

describe("Badge", () => {
	it("renders every tone with the word, not the colour alone", () => {
		render(
			<div>
				{TONES.map((tone) => (
					<Badge key={tone} tone={tone}>
						{tone}
					</Badge>
				))}
			</div>,
		);
		for (const tone of TONES) {
			const el = screen.getByText(tone);
			expect(el.dataset.tone).toBe(tone);
			// the dot is decorative; the label is what carries the state
			expect(el.querySelector("[aria-hidden='true']")).not.toBeNull();
		}
	});
});

describe("Card", () => {
	it("renders every padding and every tone", () => {
		const paddings = ["none", "sm", "md", "lg"] as const;
		const tones: CardTone[] = [
			"neutral",
			"accent",
			"live",
			"draft",
			"warning",
			"danger",
		];
		render(
			<>
				{paddings.map((padding) => (
					<Card key={padding} padding={padding}>
						padding {padding}
					</Card>
				))}
				{tones.map((tone) => (
					<Card key={tone} tone={tone}>
						tone {tone}
					</Card>
				))}
			</>,
		);
		for (const padding of paddings)
			expect(screen.getByText(`padding ${padding}`)).toBeTruthy();
		for (const tone of tones)
			expect(screen.getByText(`tone ${tone}`).dataset.tone).toBe(tone);
	});
});

describe("Table", () => {
	const markup = (
		<Table>
			<THead>
				<TR>
					<TH>Title</TH>
					<TH align="right" width={120}>
						Updated
					</TH>
				</TR>
			</THead>
			<TBody>
				<TR>
					<TD label="Title">About us</TD>
					<TD label="Updated" align="right">
						2 days ago
					</TD>
				</TR>
			</TBody>
		</Table>
	);

	it("keeps its table semantics written out, so stacking cannot take them", () => {
		// `display: block` is what stacks the rows into cards below md, and it
		// strips the implicit roles on the way. Spelled out, they survive.
		render(markup);
		const table = screen.getByRole("table");
		expect(within(table).getAllByRole("rowgroup")).toHaveLength(2);
		expect(within(table).getAllByRole("row")).toHaveLength(2);
		expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
		expect(within(table).getAllByRole("cell")).toHaveLength(2);
	});

	it("carries each column name onto its cell for the stacked layout", () => {
		render(markup);
		expect(screen.getByText("About us").dataset.label).toBe("Title");
		expect(screen.getByText("2 days ago").dataset.label).toBe("Updated");
	});

	it("takes width as a style rather than a deprecated attribute", () => {
		render(markup);
		const updated = screen.getByRole("columnheader", { name: "Updated" });
		expect(updated.style.width).toBe("120px");
		expect(updated.getAttribute("scope")).toBe("col");
	});
});

describe("Skeleton", () => {
	it("says nothing, because whoever renders it owns the announcement", () => {
		const { container } = render(<Skeleton className="h-4 w-32" />);
		expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("stands in for rows at the height they will be", () => {
		const { container } = render(<SkeletonRows rows={3} />);
		expect(container.querySelectorAll(".h-14")).toHaveLength(3);
	});
});

describe("EmptyState", () => {
	it("names the thing, says why, and offers the one action", () => {
		render(
			<EmptyState
				title="No campaigns yet"
				description="A campaign groups donations behind one goal."
				icon={<svg role="presentation" />}
				action={<Button>New campaign</Button>}
			/>,
		);
		expect(screen.getByText("No campaigns yet")).toBeTruthy();
		expect(
			screen.getByText("A campaign groups donations behind one goal."),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "New campaign" })).toBeTruthy();
	});
});
