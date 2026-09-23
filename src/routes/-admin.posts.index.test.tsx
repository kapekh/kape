// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let search: { type?: string } = {};

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (config: Record<string, unknown>) => ({
		...config,
		useSearch: () => search,
	}),
	lazyRouteComponent: (load: unknown) => load,
	Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminPosts: { list: { query: () => Promise.resolve([]) } },
	},
}));

const COMPONENT_CHUNK = "./admin.posts.index?tsr-split=component";

afterEach(cleanup);

const mount = async (type?: string) => {
	search = type ? { type } : {};
	const { component: PostsList } = (await import(
		/* @vite-ignore */ COMPONENT_CHUNK
	)) as { component: () => ReactNode };
	return render(<PostsList />);
};

// a rule that strips a trailing "s" cannot singularise "News" or "Internal news" (not
// plural to begin with) or "Stories"/"Galleries" (not "s"-plural) without mangling them
describe("the New-post button reads correctly for every type", () => {
	const cases: [string, string][] = [
		["news", "New news"],
		["story", "New story"],
		["video", "New video"],
		["album", "New gallery"],
		["publication", "New publication"],
		["job", "New job vacancy"],
		["event", "New event"],
		["document", "New document"],
		["announcement", "New announcement"],
		["internal_news", "New internal news"],
	];

	for (const [type, label] of cases) {
		it(`reads "${label}" for ${type}`, async () => {
			await act(async () => {
				await mount(type);
			});
			expect(
				screen.getAllByRole("link", { name: label }).length,
			).toBeGreaterThan(0);
		});
	}
});

// `in` walks the prototype chain, so ?type=constructor reads as a member of
// TYPE_LABELS and crashes on Object.constructor.singular being undefined
describe("a type from the prototype chain, not a real one", () => {
	it("falls back to the untyped list instead of throwing", async () => {
		await act(async () => {
			await mount("constructor");
		});
		expect(
			screen.getAllByRole("link", { name: "New post" }).length,
		).toBeGreaterThan(0);
	});
});
