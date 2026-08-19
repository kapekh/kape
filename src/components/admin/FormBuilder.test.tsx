// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children?: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
	useBlocker: () => {},
}));
vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminForms: { slugAvailable: { query: () => Promise.resolve(true) } },
		adminMedia: { byId: { query: () => Promise.resolve(null) } },
	},
}));

import { FormBuilder } from "./FormBuilder";

const initial = {
	slug: "alumni",
	status: "active",
	title: "Alumni",
	titleKm: null,
	intro: null,
	introKm: null,
	fields: [
		{ key: "full_name", label: "Full name", type: "text" as const },
		{ key: "year", label: "Year", type: "text" as const },
	],
	deadline: null,
	submitLabel: null,
	successMessage: null,
	notifyEmail: null,
};

describe("FormBuilder", () => {
	// the row identity React needs is the builder's own; a form saved with it
	// would carry a per-session id into every submission's column list
	it("keeps the editor's row identity out of the saved form", async () => {
		const onSubmit = vi.fn();
		render(
			<FormBuilder title="Edit form" initial={initial} onSubmit={onSubmit} />,
		);

		// Save stays disabled until the form is dirty
		fireEvent.change(screen.getByDisplayValue("Alumni"), {
			target: { value: "Alumni 2026" },
		});
		fireEvent.click(screen.getByRole("button", { name: /save form/i }));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		for (const field of onSubmit.mock.calls[0][0].fields)
			expect(Object.keys(field)).not.toContain("rid");

		// the builder checks its slug on a 350ms timer, which outlives a fast test
		await act(() => new Promise((r) => setTimeout(r, 400)));
	});
});
