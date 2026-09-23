// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const configured = vi.fn<() => Promise<boolean>>();

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminCampaigns: { paymentsConfigured: { query: () => configured() } },
	},
}));

import { PaymentsNotConfigured } from "./PaymentsNotConfigured";

afterEach(cleanup);

describe("the campaigns payment notice", () => {
	it("says a published campaign still cannot take a gift", async () => {
		configured.mockResolvedValue(false);
		render(<PaymentsNotConfigured />);
		const notice = await screen.findByRole("status");
		expect(notice.textContent).toContain("Payments are not configured");
		expect(notice.textContent).toContain("Donate button stays hidden");
		expect(notice.textContent).toContain("Baray credentials");
	});

	it("stays out of the way once the credentials are set", async () => {
		configured.mockResolvedValue(true);
		render(<PaymentsNotConfigured />);
		await vi.waitFor(() => expect(configured).toHaveBeenCalled());
		expect(screen.queryByRole("status")).toBeNull();
	});

	// an all-clear the check never earned is the one failure this screen cannot have
	it("logs the reason when it cannot load, and still renders nothing", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		const cause = new Error("offline");
		configured.mockRejectedValue(cause);
		render(<PaymentsNotConfigured />);
		await vi.waitFor(() => expect(logged).toHaveBeenCalled());
		expect(logged.mock.calls[0][0]).toContain("payment check failed");
		expect(logged.mock.calls[0][1]).toBe(cause);
		expect(screen.queryByRole("status")).toBeNull();
		logged.mockRestore();
	});
});
