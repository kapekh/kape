// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "#/lib/i18n";

type LoaderData = {
	campaigns: unknown[];
	settings: Record<string, string>;
};
const loaded: LoaderData = { campaigns: [], settings: {} };

const campaign = {
	id: 1,
	slug: "classrooms",
	status: "active",
	title: "Classrooms for Kampong Cham",
	blurb: "Ten rooms, one province.",
	currency: "USD",
	goalAmount: 5000,
	coverUrl: null,
	presets: [],
	allowCustom: true,
	impactTiers: [],
	showSupporters: false,
	featured: true,
	raised: 0,
	supporters: 0,
};

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (config: Record<string, unknown>) => ({
		...config,
		useLoaderData: () => loaded,
	}),
	lazyRouteComponent: (load: unknown) => load,
	Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));

const COMPONENT_CHUNK = "./$lang.donate.index?tsr-split=component";

afterEach(cleanup);

const mount = async (
	settings: Record<string, string>,
	campaigns: unknown[] = [],
) => {
	loaded.settings = settings;
	loaded.campaigns = campaigns;
	const { component: Hub } = (await import(
		/* @vite-ignore */ COMPONENT_CHUNK
	)) as { component: () => ReactNode };
	return render(
		<LanguageProvider
			lang="en"
			languages={[{ code: "en", name: "English", nativeName: "English" }]}
			strings={{}}
			stringsFallback={[]}
		>
			<Hub />
		</LanguageProvider>,
	);
};

const unavailable = () =>
	screen.queryByRole("heading", { name: "Giving is unavailable right now" });

describe("the donate hub when payments are not configured", () => {
	it("says giving is unavailable", async () => {
		await act(async () => {
			await mount({ donate_payments: "" });
		});
		expect(unavailable()).not.toBeNull();
	});

	it("says nothing of the sort once the credentials are set", async () => {
		await act(async () => {
			await mount({ donate_payments: "1" });
		});
		expect(unavailable()).toBeNull();
	});

	// two panels both saying "check back soon" is one panel too many
	it("does not also say there are no campaigns", async () => {
		await act(async () => {
			await mount({ donate_payments: "" });
		});
		expect(
			screen.queryByRole("heading", { name: "No active campaigns right now" }),
		).toBeNull();
	});

	it("still says so when payments work and nothing is published", async () => {
		await act(async () => {
			await mount({ donate_payments: "1" });
		});
		expect(
			screen.getByRole("heading", { name: "No active campaigns right now" }),
		).not.toBeNull();
	});

	it("stays reachable either way, hero and all", async () => {
		await act(async () => {
			await mount({ donate_payments: "" });
		});
		expect(
			screen.getByRole("heading", { name: "Give to what moves you" }),
		).not.toBeNull();
	});
});

// the hero invites a choice the visitor cannot make, and counts what is not there
describe("the donate hub hero with nothing to choose from", () => {
	const intro = { donate_intro: "Choose a campaign below." };

	it("drops the invitation to choose", async () => {
		await act(async () => {
			await mount({ ...intro, donate_payments: "" });
		});
		expect(screen.queryByText("Choose a campaign below.")).toBeNull();
	});

	it("drops the campaign count rather than show a zero", async () => {
		await act(async () => {
			await mount({ ...intro, donate_payments: "" });
		});
		expect(screen.queryByText("0")).toBeNull();
		expect(screen.queryByText("campaigns")).toBeNull();
	});

	it("keeps the title, so the page still says what it is", async () => {
		await act(async () => {
			await mount({ ...intro, donate_payments: "" });
		});
		expect(
			screen.getByRole("heading", { name: "Give to what moves you" }),
		).not.toBeNull();
	});

	it("gives an operator their own words back as soon as a campaign exists", async () => {
		await act(async () => {
			await mount({ ...intro, donate_payments: "1" }, [campaign]);
		});
		expect(screen.getByText("Choose a campaign below.")).not.toBeNull();
		expect(screen.getByText("campaign")).not.toBeNull();
	});
});

// an invitation beside the notice is the same defect one level down
describe("a campaign card while giving is unavailable", () => {
	it("makes no call to give", async () => {
		await act(async () => {
			await mount({ donate_payments: "" }, [campaign]);
		});
		expect(screen.queryByText(/Donate to this campaign/)).toBeNull();
		expect(screen.queryByText("Be the first to give")).toBeNull();
	});

	it("still names the campaign and its goal", async () => {
		await act(async () => {
			await mount({ donate_payments: "" }, [campaign]);
		});
		expect(
			screen.getByRole("heading", { name: "Classrooms for Kampong Cham" }),
		).not.toBeNull();
		expect(screen.getByText(/\$5,000 goal/)).not.toBeNull();
	});

	it("makes the call again once gifts can be taken", async () => {
		await act(async () => {
			await mount({ donate_payments: "1" }, [campaign]);
		});
		expect(screen.getByText(/Donate to this campaign/)).not.toBeNull();
		expect(screen.getByText("Be the first to give")).not.toBeNull();
	});
});
