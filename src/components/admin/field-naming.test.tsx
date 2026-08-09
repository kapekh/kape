// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("#/integrations/tanstack-query/root-provider", () => ({
	trpcClient: {
		adminMedia: { byId: { query: () => Promise.resolve(null) } },
		adminForms: { list: { query: () => Promise.resolve([]) } },
	},
}));

import { MediaPicker } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { SearchableSelect } from "./SearchableSelect";

describe("admin field naming", () => {
	it("points a caption's htmlFor at the control the picker actually renders", () => {
		render(
			<>
				<label htmlFor="province">Province</label>
				<SearchableSelect
					id="province"
					value=""
					onChange={() => {}}
					options={[]}
				/>
				<label htmlFor="cover">Cover</label>
				<MediaPicker id="cover" value="" onChange={() => {}} mode="url" />
			</>,
		);
		for (const caption of ["Province", "Cover"]) {
			const label = screen.getByText(caption) as HTMLLabelElement;
			const control = document.getElementById(label.htmlFor);
			expect(control, `${caption} names nothing`).not.toBeNull();
			expect(control?.tagName).toBe("BUTTON");
		}
	});

	it("names the rich text editor through aria, which is all a contenteditable answers to", () => {
		render(
			<>
				<span id="body-label">Body</span>
				<RichTextEditor
					ariaLabelledBy="body-label"
					value=""
					onChange={() => {}}
				/>
			</>,
		);
		const editor = document.querySelector('[contenteditable="true"]');
		expect(editor, "no editor mounted").not.toBeNull();
		expect(editor?.getAttribute("role")).toBe("textbox");
		expect(editor?.getAttribute("aria-labelledby")).toBe("body-label");
		expect(document.getElementById("body-label")?.textContent).toBe("Body");
	});
});
