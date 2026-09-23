// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "#/lib/i18n";

vi.mock("@/components/NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { CampaignDetail } from "./CampaignDetail";

afterEach(cleanup);

const campaign = (status = "active") => ({
	id: 1,
	slug: "classrooms",
	status,
	title: "Classrooms for Kampong Cham",
	blurb: "Ten rooms, one province.",
	currency: "USD",
	goalAmount: 5000,
	coverUrl: null,
	coverWidth: null,
	presets: [25, 50],
	allowCustom: true,
	impactTiers: [],
	showSupporters: false,
	featured: false,
	raised: 0,
	supporters: 0,
	recentSupporters: [],
});

const mount = (paymentsConfigured: boolean, status = "active") =>
	render(
		<LanguageProvider
			lang="en"
			languages={[{ code: "en", name: "English", nativeName: "English" }]}
			strings={{}}
			stringsFallback={[]}
		>
			<CampaignDetail
				campaign={campaign(status)}
				paymentsConfigured={paymentsConfigured}
			/>
		</LanguageProvider>,
	);

const form = () => screen.queryByRole("button", { name: /Donate/ });
const unavailable = () =>
	screen.queryByRole("heading", { name: "Giving is unavailable right now" });

const invitation = () => screen.queryByText("Be the first to give");

describe("the campaign page when payments are not configured", () => {
	it("says giving is unavailable instead of offering the form", () => {
		mount(false);
		expect(unavailable()).not.toBeNull();
		expect(form()).toBeNull();
	});

	it("still shows the campaign itself, so the page stays worth reading", () => {
		mount(false);
		expect(
			screen.getByRole("heading", { name: "Classrooms for Kampong Cham" }),
		).not.toBeNull();
	});

	it("offers the form once the credentials are in place", () => {
		mount(true);
		expect(form()).not.toBeNull();
		expect(unavailable()).toBeNull();
	});

	// the closed campaign has its own, more specific answer
	it("keeps saying a closed campaign is closed", () => {
		mount(false, "ended");
		expect(
			screen.getByRole("heading", { name: "This campaign has ended" }),
		).not.toBeNull();
		expect(unavailable()).toBeNull();
	});

	// the notice is the honest version; an invitation beside it is not
	it("drops the invitation from the progress panel", () => {
		mount(false);
		expect(invitation()).toBeNull();
	});

	it("keeps the goal, which is a fact either way", () => {
		mount(false);
		expect(screen.getByText(/\$5,000 goal/)).not.toBeNull();
	});

	it("invites the first gift again once gifts can be taken", () => {
		mount(true);
		expect(invitation()).not.toBeNull();
	});
});
