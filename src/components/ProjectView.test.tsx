// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "#/lib/i18n";
import type { ResolvedProject } from "#/server/repo/projects";

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: { auth: { me: { query: () => Promise.resolve(null) } } },
}));

vi.mock("@/components/NavLink", () => ({
	NavLink: ({ href, children, ...rest }: Record<string, unknown>) => (
		<a href={String(href ?? "")} {...rest}>
			{children as ReactNode}
		</a>
	),
}));

import { ProjectView } from "./ProjectView";

afterEach(cleanup);

const project: ResolvedProject = {
	id: 1,
	code: "P1",
	slug: "p1",
	status: "current",
	name: "Reading clubs",
	summary: "",
	bodyHtml: "",
	startDate: "2025-01-15",
	endDate: "open",
	targetAreas: [],
	snapshots: [],
	donors: [],
	i18nFallback: [],
};

function renderProject(p: ResolvedProject) {
	render(
		<LanguageProvider
			lang="en"
			languages={[{ code: "en", name: "English", nativeName: "English" }]}
			strings={{}}
		>
			<ProjectView project={p} section="projects" />
		</LanguageProvider>,
	);
}

describe("ProjectView end date", () => {
	it("says open-ended instead of printing the stored sentinel", () => {
		renderProject(project);
		expect(screen.getByText("Open-ended")).toBeTruthy();
		expect(screen.queryByText("open")).toBeNull();
		expect(screen.getByText("15 January 2025")).toBeTruthy();
	});

	it("still formats a calendar end date", () => {
		renderProject({ ...project, endDate: "2026-12-31" });
		expect(screen.getByText("31 December 2026")).toBeTruthy();
	});
});
