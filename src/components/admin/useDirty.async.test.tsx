// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useDirty } from "./useDirty";

/**
 * The /admin/footer shape, which is what M10 was filed against: state starts
 * EMPTY and is filled by a query after mount, so the snapshot the form reports
 * changes on its own. A baseline captured at mount describes a form the data
 * has not reached, and every field the query fills reads as an unsaved edit —
 * "Unsaved changes, leave and lose the edits?" on a page nobody had touched.
 *
 * Both directions are asserted here, because the cheap fix (never report dirty
 * until something forces it) passes the first test and loses people's work.
 */
function FakeFooterForm({ savedAt }: { savedAt?: string | null }) {
	const [vals, setVals] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	// the query landing, one tick after mount
	useEffect(() => {
		let alive = true;
		Promise.resolve().then(() => {
			if (!alive) return;
			setVals({ footer_links_title: "Explore", newsletter_title: "News" });
			setLoading(false);
		});
		return () => {
			alive = false;
		};
	}, []);

	const dirty = useDirty(JSON.stringify(vals), savedAt, !loading);
	return (
		<form>
			<input
				aria-label="Links title"
				value={vals.footer_links_title ?? ""}
				onChange={(e) =>
					setVals((v) => ({ ...v, footer_links_title: e.target.value }))
				}
			/>
			<button type="submit" disabled={!dirty}>
				Save footer
			</button>
		</form>
	);
}

const save = () => screen.getByRole("button") as HTMLButtonElement;
const field = () => screen.getByLabelText("Links title") as HTMLInputElement;

// no setupFiles in vitest.config.ts, so testing-library's auto-cleanup is not
// registered and a second render would stack on the first
afterEach(cleanup);

describe("useDirty when the form's data arrives after mount", () => {
	it("is CLEAN once the query has filled the form nobody touched", async () => {
		await act(async () => {
			render(<FakeFooterForm savedAt={null} />);
		});
		expect(field().value).toBe("Explore"); // the query really did land
		expect(save().disabled).toBe(true); // ...and Save stays disabled
	});

	it("still goes DIRTY on a real edit after the data has landed", async () => {
		await act(async () => {
			render(<FakeFooterForm savedAt={null} />);
		});
		expect(save().disabled).toBe(true);

		await act(async () => {
			fireEvent.change(field(), { target: { value: "Explore more" } });
		});
		expect(save().disabled).toBe(false);
	});

	it("goes clean again when the edit is reverted by hand", async () => {
		await act(async () => {
			render(<FakeFooterForm savedAt={null} />);
		});
		await act(async () => {
			fireEvent.change(field(), { target: { value: "Explore more" } });
		});
		expect(save().disabled).toBe(false);
		await act(async () => {
			fireEvent.change(field(), { target: { value: "Explore" } });
		});
		expect(save().disabled).toBe(true);
	});
});
