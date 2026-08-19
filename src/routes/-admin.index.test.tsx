// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const readership = {
	pages: [{ path: "/news", count: 9, lastViewedAt: "2026-08-19" }],
	documents: [
		{
			id: 7,
			slug: "annual-report-2024",
			contentType: "publication",
			title: "Annual Report 2024",
			reads: 12,
			downloads: 3,
		},
	],
	totalViews: 9,
	totalReads: 12,
	totalDownloads: 3,
};

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children?: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
	useLoaderData: () => ({ settings: {} }),
}));
vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		admin: {
			overview: { query: () => Promise.resolve(null) },
			readership: { query: () => Promise.resolve(readership) },
		},
		adminPosts: { list: { query: () => Promise.resolve([]) } },
	},
}));

const COMPONENT_CHUNK = "./admin.index?tsr-split=component";

afterEach(cleanup);

// one number for two acts told the reader nothing: a document kept is not a document read
describe("the dashboard's document card", () => {
	it("reports reads and downloads apart", async () => {
		const { component: Dashboard } = (await import(
			/* @vite-ignore */ COMPONENT_CHUNK
		)) as { component: () => React.ReactNode };
		await act(async () => {
			render(<Dashboard />);
		});

		expect(screen.getByText(/12 read on the page, 3 downloaded/)).toBeTruthy();
		expect(screen.getByText("12 read · 3 downloaded")).toBeTruthy();
	});
});
