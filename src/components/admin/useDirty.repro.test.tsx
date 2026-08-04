// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { useDirty } from "./useDirty";

// Mimics PageForm: state initialised from `initial`, a JSON snapshot of that
// state, and an unrelated async load (allPages) that re-renders the component.
function FakePageForm({
	initial,
	savedAt,
}: {
	initial: { sections: unknown[]; trans: Record<string, unknown> };
	savedAt?: string | null;
}) {
	const [sections] = useState(initial.sections);
	const [trans] = useState(initial.trans);
	const [segment] = useState("partners");
	// unrelated async state (like allPages) that triggers a re-render post-mount
	const [extra, setExtra] = useState<number[]>([]);
	useEffect(() => {
		setExtra([1, 2, 3]);
	}, []);
	const dirty = useDirty(JSON.stringify({ segment, sections, trans }), savedAt);
	return (
		<button type="button" disabled={!dirty} data-extra={extra.length}>
			Save page
		</button>
	);
}

describe("useDirty in a PageForm-like component", () => {
	it("Save is DISABLED on mount and stays disabled through an unrelated re-render", async () => {
		const initial = {
			sections: [
				{
					id: "hero",
					type: "hero",
					props: { title: "Our Partners", i18n: { km: { title: "ដៃគូ" } } },
				},
				{ id: "p", type: "partners", query: { source: "partners" }, props: {} },
			],
			trans: {
				en: { title: "Our Partners", excerpt: "", body: "" },
				km: { title: "", excerpt: "", body: "" },
			},
		};
		await act(async () => {
			render(<FakePageForm initial={initial} savedAt={null} />);
		});
		const btn = screen.getByRole("button") as HTMLButtonElement;
		expect(btn.getAttribute("data-extra")).toBe("3"); // the async re-render happened
		expect(btn.disabled).toBe(true); // ...and Save is still disabled (not dirty)
	});
});
