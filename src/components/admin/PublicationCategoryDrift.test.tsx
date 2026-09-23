// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CategoryFilter } from "#/lib/term-drift";

const drift = vi.fn<() => Promise<CategoryFilter[]>>();

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminTerms: { publicationCategoryDrift: { query: () => drift() } },
	},
}));

import { PublicationCategoryDrift } from "./PublicationCategoryDrift";

afterEach(cleanup);

describe("the publication category drift notice", () => {
	it("names the page, the key and what it costs", async () => {
		drift.mockResolvedValue([
			{ path: "/media/ai-digital", key: "ai-digital" },
			{ path: "/media/life-skills", key: "life-skills" },
		]);
		render(<PublicationCategoryDrift />);
		const notice = await screen.findByRole("status");
		expect(notice.textContent).toContain("/media/ai-digital");
		expect(notice.textContent).toContain("ai-digital");
		expect(notice.textContent).toContain(
			"Publications cannot be filed into it",
		);
		expect(screen.getAllByRole("status")[0].children).toHaveLength(2);
	});

	it("stays out of the way when every category has its term", async () => {
		drift.mockResolvedValue([]);
		render(<PublicationCategoryDrift />);
		await vi.waitFor(() => expect(drift).toHaveBeenCalled());
		expect(screen.queryByRole("status")).toBeNull();
	});

	// an all-clear the check never earned is the one failure this screen cannot have
	it("logs the reason when it cannot load, and still renders nothing", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		const cause = new Error("offline");
		drift.mockRejectedValue(cause);
		render(<PublicationCategoryDrift />);
		await vi.waitFor(() => expect(logged).toHaveBeenCalled());
		expect(logged.mock.calls[0][0]).toContain("drift check failed");
		expect(logged.mock.calls[0][1]).toBe(cause);
		expect(screen.queryByRole("status")).toBeNull();
		logged.mockRestore();
	});
});
