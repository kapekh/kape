// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: () => null,
	useLoaderData: () => ({}),
	useBlocker: () => undefined,
}));

import { ProjectForm, type ProjectFormValue } from "./ProjectForm";

afterEach(cleanup);

function renderForm(endDate: string) {
	const submitted: ProjectFormValue[] = [];
	render(
		<ProjectForm
			initial={{
				code: "P1",
				slug: "p1",
				parentId: null,
				status: "current",
				sort: 0,
				startDate: "",
				endDate,
				targetAreas: [],
				snapshots: [],
				translations: {},
				donorIds: [],
				locations: [],
			}}
			languages={[
				{ code: "en", name: "English", nativeName: "English", isDefault: true },
			]}
			donors={[]}
			parents={[]}
			onSubmit={(v) => submitted.push(v)}
			title="Project"
		/>,
	);
	const date = screen.getByLabelText("End date") as HTMLInputElement;
	const open = screen.getByLabelText("Open-ended") as HTMLInputElement;
	const save = () => {
		fireEvent.submit(date.form as HTMLFormElement);
		return submitted.at(-1);
	};
	return { date, open, save };
}

describe("ProjectForm open-ended end date", () => {
	it("ticking it saves the sentinel and empties the disabled date", () => {
		const { date, open, save } = renderForm("2026-12-31");
		fireEvent.click(open);
		expect(date.disabled).toBe(true);
		expect(date.value).toBe("");
		expect(save()).toMatchObject({ endDate: "open" });
	});

	it("loads an open-ended project ticked, and unticking clears it", () => {
		const { date, open, save } = renderForm("open");
		expect(open.checked).toBe(true);
		fireEvent.click(open);
		expect(date.disabled).toBe(false);
		expect(save()).toMatchObject({ endDate: "" });
	});
});
